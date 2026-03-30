import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  const mod = await import("pdf-parse");
  const fn = (mod.default ?? mod) as (buf: Buffer) => Promise<{ text: string }>;
  return fn(buffer);
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

// ── PayPal helpers ───────────────────────────────────────────────
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET    = process.env.PAYPAL_SECRET!;
const PAYPAL_BASE_URL  = "https://api-m.sandbox.paypal.com"; // switch to api-m.paypal.com for production

async function getPaypalAccessToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const r = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await r.json() as { access_token: string };
  return data.access_token;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  timeout: 50_000,
  maxRetries: 1,
});

const activeAiRequests = new Map<string, number>();
const MAX_CONCURRENT_PER_USER = 3;

function acquireAiSlot(uid: string): boolean {
  const n = activeAiRequests.get(uid) ?? 0;
  if (n >= MAX_CONCURRENT_PER_USER) return false;
  activeAiRequests.set(uid, n + 1);
  return true;
}

function releaseAiSlot(uid: string): void {
  const n = activeAiRequests.get(uid) ?? 1;
  if (n <= 1) activeAiRequests.delete(uid);
  else activeAiRequests.set(uid, n - 1);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const calcUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const anyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 200 },
});

function userId(req: any): string {
  return (req.session as any).userId;
}

async function seedDatabase() {
  try {
  const courses = await storage.getCourses();
  if (courses.length === 0) {
    await storage.createCourse({ name: "Computer Science 101", modules: ["Introduction to Programming", "Data Structures", "Algorithms"] });
    await storage.createCourse({ name: "Calculus I", modules: ["Limits", "Derivatives", "Integrals"] });
    await storage.createCourse({ name: "Physics 101", modules: ["Mechanics", "Thermodynamics", "Waves"] });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/api/courses", isAuthenticated);
  app.use("/api/quizzes", isAuthenticated);
  app.use("/api/assignments", isAuthenticated);
  app.use("/api/calculator", isAuthenticated);
  app.use("/api/exams", isAuthenticated);
  app.use("/api/uploads", isAuthenticated);
  app.use("/api/presentation", isAuthenticated);
  app.use("/api/voice", isAuthenticated);
  app.use("/api/payments", isAuthenticated);
  app.use("/api/study-buddy", isAuthenticated);
  app.use("/api/extract-text", isAuthenticated);

  // ── Health check ─────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString(), uptime: Math.floor(process.uptime()) });
  });

  // ── Per-user concurrent AI request guard ─────────────────────────
  const AI_POST_PATHS = new Set([
    "/api/quizzes/generate",
    "/api/calculator/solve",
    "/api/calculator/solve-file",
    "/api/exams/predict",
    "/api/exams/generate",
    "/api/presentation/analyze",
    "/api/voice/explain",
    "/api/study-buddy/chat",
    "/api/uploads/generate-qp",
    "/api/uploads/summarize",
    "/api/research/search",
    "/api/extract-text",
  ]);
  const AI_PATH_RE = /^\/api\/assignments\/\d+\/feedback$/;

  app.use((req: any, res, next) => {
    if (req.method !== "POST") return next();
    if (!AI_POST_PATHS.has(req.path) && !AI_PATH_RE.test(req.path)) return next();
    const uid: string = userId(req) ?? (req.ip as string) ?? "anon";
    if (!acquireAiSlot(uid)) {
      return res.status(429).json({
        message: "You already have 3 active AI requests running. Please wait for one to finish before starting another.",
      });
    }
    let released = false;
    const release = () => { if (!released) { released = true; releaseAiSlot(uid); } };
    res.on("finish", release);
    res.on("close", release);
    next();
  });

  // ── Multi-file text extraction (any file type, up to 200 files) ──
  app.post("/api/extract-text", anyUpload.array("files", 200), async (req: any, res) => {
    try {
      const files: Express.Multer.File[] = req.files ?? [];
      if (files.length === 0) return res.status(400).json({ message: "No files provided" });

      const parts: string[] = [];

      for (const file of files) {
        const name = file.originalname;
        let text = "";

        const isPdf = file.mimetype === "application/pdf" || name.toLowerCase().endsWith(".pdf");
        const isImage = file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(name);
        const isDocx = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          || name.toLowerCase().endsWith(".docx");
        const isDoc = file.mimetype === "application/msword" || name.toLowerCase().endsWith(".doc");

        if (isPdf) {
          try {
            const parsed = await parsePdf(file.buffer);
            text = parsed.text?.trim() ?? "";
          } catch {
            text = "";
          }
        } else if (isImage) {
          try {
            const b64 = file.buffer.toString("base64");
            const mimeType = file.mimetype || "image/jpeg";
            const visionResp = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: "Extract and transcribe all text visible in this image. If it's a handwritten note or diagram, describe and transcribe it fully. Return plain text only." },
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}`, detail: "high" } },
                ],
              }],
              max_tokens: 2000,
            });
            text = visionResp.choices[0].message.content?.trim() ?? "";
          } catch {
            text = `[Image: ${name} — could not extract text]`;
          }
        } else if (isDocx) {
          try {
            text = await parseDocx(file.buffer);
          } catch {
            text = "";
          }
        } else if (isDoc) {
          text = "[Legacy .doc format not supported — please save as .docx or PDF and re-upload]";
        } else {
          try {
            text = file.buffer.toString("utf-8").trim();
          } catch {
            text = "";
          }
        }

        if (text) {
          parts.push(`=== ${name} ===\n${text}`);
        }
      }

      const combined = parts.join("\n\n");
      if (!combined.trim()) {
        return res.status(400).json({ message: "Could not extract readable text from the uploaded files. Try PDF or plain text files." });
      }

      res.json({
        text: combined,
        count: files.length,
        totalChars: combined.length,
      });
    } catch (e) {
      console.error("[extract-text]", e);
      res.status(500).json({ message: "Text extraction failed" });
    }
  });

  // ── Courses ──────────────────────────────────────────────────────
  app.get(api.courses.list.path, async (_req, res) => {
    res.json(await storage.getCourses());
  });

  app.post(api.courses.create.path, async (req, res) => {
    try {
      const input = api.courses.create.input.parse(req.body);
      res.status(201).json(await storage.createCourse(input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Quizzes ───────────────────────────────────────────────────────
  app.get(api.quizzes.list.path, async (req, res) => {
    res.json(await storage.getQuizzes(userId(req)));
  });

  app.get(api.quizzes.get.path, async (req, res) => {
    const quiz = await storage.getQuiz(Number(req.params.id));
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  });

  app.post(api.quizzes.generate.path, async (req, res) => {
    try {
      const input = api.quizzes.generate.input.parse(req.body);
      const course = await storage.getCourse(input.courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });

      const uploads = await storage.getUploadsForModule(userId(req), course.name);
      const uploadContext = uploads.length > 0
        ? `\n\nUse the following student study material to make questions more specific and relevant:\n${uploads.map(u => `[${u.filename}]: ${u.fileContent.slice(0, 800)}`).join("\n\n")}`
        : "";

      const selectedTypes = input.questionTypes;
      const n = input.questionCount;
      const modeLabel = input.isTest ? (n > 15 ? "exam paper" : "timed test") : "quiz";

      // Build per-type counts by distributing n questions across selected types
      const perType = Math.floor(n / selectedTypes.length);
      const remainder = n % selectedTypes.length;
      const typeCounts: Record<string, number> = {};
      selectedTypes.forEach((t, i) => {
        typeCounts[t] = perType + (i < remainder ? 1 : 0);
      });

      const typeDescriptions: Record<string, (count: number) => string> = {
        mcq:         (c) => `${c} Multiple Choice Questions (MCQ): Each must have exactly 4 plausible options where only ONE is correct. Make distractors realistic and tricky.`,
        truefalse:   (c) => `${c} True or False Questions: options must be exactly ["True", "False"]. Use nuanced statements about "${input.topic}" content that test deep understanding, not obvious surface facts.`,
        define:      (c) => `${c} Define Concept Questions: Each asks the student to precisely define a key term or concept FROM "${input.topic}" AND provide a real-world application or example relevant to "${course.name}". No options. correctAnswer MUST directly define the exact term asked in the question, explain it in context of "${input.topic}", and give a concrete real-world example. Do not write a generic definition — it must match and answer this specific question.`,
        scenario:    (c) => `${c} Long Scenario-Based Questions: Each MUST open with a detailed 3-5 sentence realistic scenario set in a South African or NMU context related to "${input.topic}", then ask a multi-part question requiring the student to apply theory from "${course.name}". No options. correctAnswer MUST directly solve every part of the question by applying the relevant theory to the exact scenario described — include calculations or structured sub-answers (a, b, c) where the question requires them. The answer must be specific to this scenario, not a generic template.`,
      };

      // Build a prompt for a specific batch of questions
      const buildBatchPrompt = (batchCount: number, batchTypeCounts: Record<string, number>, alreadyDone: string[]) => {
        const batchDist = selectedTypes
          .filter(t => batchTypeCounts[t] > 0)
          .map(t => `- ${typeDescriptions[t](batchTypeCounts[t])}`)
          .join("\n");
        const avoidBlock = alreadyDone.length > 0
          ? `\n\nDo NOT repeat any of these already-generated questions:\n${alreadyDone.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
          : "";
        return `You are an expert university lecturer at Nelson Mandela University (NMU) in Port Elizabeth, South Africa. Generate a challenging, university-level ${modeLabel} batch of EXACTLY ${batchCount} questions for the course "${course.name}" on the topic: "${input.topic}".

DIFFICULTY: Hard and realistic. Reflect actual NMU exam standards. Students must have studied thoroughly to answer correctly.

QUESTION STRUCTURE — use EXACTLY these counts:
${batchDist}${uploadContext}${avoidBlock}

Return a JSON object with key "questions". Each question object MUST contain:
- "type": one of ${selectedTypes.map(t => `"${t}"`).join(" | ")}
- "question": string — for scenario type, embed the scenario paragraph before the question
- "options": array of strings — ONLY for "mcq" (4 options) and "truefalse" (exactly ["True", "False"]). OMIT for all other types.
- "correctAnswer": string — for mcq/truefalse: must exactly match one option. For open-ended (define/scenario): write the ACTUAL FULL ANSWER to the question — NOT a description of what the answer covers, NOT an outline, NOT "this answer examines...". Write it exactly as a top student would write it in an exam, directly addressing every part of the question asked (200-350 words).
- "marks": number — 1 for mcq/truefalse, 5 for define, 10 for scenario
- "explanation": string — for mcq/truefalse: explain in 2-3 sentences WHY the correct answer is right and why the others are wrong. For open-ended types (define/scenario): this field must be the SAME substantive answer as correctAnswer but with added context — write it as a detailed explanation of the answer, NOT as "this question tests..." or "this answer examines..." or any meta-commentary about the question. Write actual subject content.

CRITICAL: NEVER write "This answer examines...", "This question tests...", "The answer covers...", or any similar meta-description. Always write the actual answer content.

Return EXACTLY ${batchCount} question objects. No more, no less.`;
      };

      // Split into batches of max 25 to stay within token limits
      const BATCH_SIZE = 25;
      const batches: { count: number; typeCounts: Record<string, number> }[] = [];
      let remaining = { ...typeCounts };
      let remainingTotal = n;

      while (remainingTotal > 0) {
        const batchTotal = Math.min(remainingTotal, BATCH_SIZE);
        const batchTypes: Record<string, number> = {};
        let batchFilled = 0;
        for (const t of selectedTypes) {
          if (remaining[t] > 0 && batchFilled < batchTotal) {
            const take = Math.min(remaining[t], batchTotal - batchFilled);
            batchTypes[t] = take;
            remaining[t] -= take;
            batchFilled += take;
          }
        }
        batches.push({ count: batchTotal, typeCounts: batchTypes });
        remainingTotal -= batchTotal;
      }

      // Generate all batches in parallel
      let questions: any[] = [];
      const batchPromises = batches.map((batch) => {
        const alreadyDone: string[] = []; // will be empty for parallel; dedup by question text after merge
        const batchPrompt = buildBatchPrompt(batch.count, batch.typeCounts, alreadyDone);
        return openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: batchPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
        }).then(r => {
          const c = JSON.parse(r.choices[0].message.content || '{"questions":[]}');
          return (c.questions || []) as any[];
        }).catch(() => [] as any[]);
      });

      const batchResults = await Promise.all(batchPromises);
      questions = batchResults.flat();

      // Deduplicate by question text (case-insensitive)
      const seen = new Set<string>();
      questions = questions.filter((q: any) => {
        const key = (q.question || "").toLowerCase().slice(0, 80);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If we still have fewer questions than needed after batching, do a single top-up call
      if (questions.length < n) {
        const missing = n - questions.length;
        const alreadyTitles = questions.map((q: any) => q.question || "");
        // Distribute missing across types proportionally
        const topupTypeCounts: Record<string, number> = {};
        const perT = Math.floor(missing / selectedTypes.length);
        const remT = missing % selectedTypes.length;
        selectedTypes.forEach((t, i) => { topupTypeCounts[t] = perT + (i < remT ? 1 : 0); });
        const topupPrompt = buildBatchPrompt(missing, topupTypeCounts, alreadyTitles);
        try {
          const topupResp = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: topupPrompt }],
            response_format: { type: "json_object" },
            max_tokens: 4096,
          });
          const topupContent = JSON.parse(topupResp.choices[0].message.content || '{"questions":[]}');
          questions = [...questions, ...(topupContent.questions || [])];
        } catch { /* use what we have */ }
      }

      // Trim to exactly n
      questions = questions.slice(0, n);

      // Filter out any blank or malformed questions (empty question text)
      questions = questions.filter((q: any) => q && typeof q.question === "string" && q.question.trim().length > 10);

      for (const u of uploads) storage.incrementUploadQuizCount(u.id).catch(() => {});

      const shortLabel: Record<string, string> = {
        mcq: "MCQ", truefalse: "T/F", define: "Define", scenario: "Scenario",
      };
      const typesLabel = selectedTypes.length === 4
        ? "Mixed"
        : selectedTypes.map(t => shortLabel[t]).join("+");

      // Timer: 50 questions = 1 hour (3600s), scales linearly
      const timerSeconds = input.enableTimer ? Math.round((n / 50) * 3600) : null;

      const quiz = await storage.createQuiz({
        userId: userId(req),
        courseId: course.id,
        title: `${course.name} – ${input.topic} [${typesLabel}] ${input.isTest ? "Test" : "Quiz"}`,
        isTest: input.isTest,
        questions,
        timerSeconds,
      });

      res.status(201).json(quiz);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Assignments ───────────────────────────────────────────────────
  app.get(api.assignments.list.path, async (req, res) => {
    res.json(await storage.getAssignments(userId(req)));
  });

  app.get(api.assignments.get.path, async (req, res) => {
    const a = await storage.getAssignment(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Assignment not found" });
    res.json(a);
  });

  app.post(api.assignments.create.path, async (req, res) => {
    try {
      const input = api.assignments.create.input.parse(req.body);
      res.status(201).json(await storage.createAssignment({ userId: userId(req), title: input.title, content: input.content }));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.assignments.generateFeedback.path, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(Number(req.params.id));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });

      const prompt = `Analyze this assignment draft for structure, grammar, referencing, and potential plagiarism. Provide constructive feedback.
Return a JSON object with keys: "structure", "grammar", "referencing", "plagiarism", "overall" (all strings).
Assignment text:\n${assignment.content}`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const feedback = JSON.parse(aiResp.choices[0].message.content || "{}");
      res.json(await storage.updateAssignmentFeedback(assignment.id, feedback));
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Calculator ────────────────────────────────────────────────────
  app.get(api.calculator.history.path, async (req, res) => {
    res.json(await storage.getCalculatorLogs(userId(req)));
  });

  app.post(api.calculator.solve.path, async (req, res) => {
    try {
      const input = api.calculator.solve.input.parse(req.body);
      const prompt = `Solve the following math or physics equation step-by-step with a detailed explanation for each step.
Return JSON with:
- "finalAnswer": string
- "steps": array of strings (each string = one step)
Equation: ${input.equation}`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const solution = JSON.parse(aiResp.choices[0].message.content || "{}");
      res.json(await storage.createCalculatorLog({ userId: userId(req), equation: input.equation, solution }));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/calculator/solve-file", calcUpload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const userInstruction = (req.body.prompt || "").trim();

      if ((!files || files.length === 0) && !userInstruction) {
        return res.status(400).json({ message: "Please upload at least one file or enter a problem." });
      }

      const systemPrompt = `You are an expert university-level mathematics, physics, statistics, and engineering tutor — equivalent to the best AI tutors available anywhere.

Your job: analyse the uploaded content and the user's instruction, then produce a thorough, fully-worked solution.

Rules:
- Identify EXACTLY which problem/question the user is asking about (guided by their instruction)
- Show ALL working — every formula used, every substitution, every algebraic step
- Each step must be self-contained: state what you are doing, write the formula, substitute values, simplify to result
- Use clear notation (e.g. "v² = u² + 2as", "∫x² dx = x³/3 + C")
- The finalAnswer must be precise with correct units where applicable
- If multiple sub-questions exist (a, b, c), solve ALL of them in sequence within the steps array
- Never skip steps — show even obvious arithmetic

Return a JSON object with EXACTLY these fields:
{
  "problem": "The problem statement as identified from the content",
  "steps": ["Step 1: ...", "Step 2: ...", ...],
  "finalAnswer": "The complete final answer with units",
  "topic": "The mathematical/scientific topic (e.g. Kinematics, Integration, Statistics)"
}`;

      const userMessage = userInstruction
        ? `User instruction: "${userInstruction}"\n\nPlease solve exactly what the user has specified above.`
        : "Please identify and solve the mathematical or physics problem shown in the uploaded content. Show complete step-by-step working.";

      const contentParts: any[] = [{ type: "text", text: `${systemPrompt}\n\n${userMessage}` }];
      let docText = "";

      if (files && files.length > 0) {
        for (const file of files) {
          const isImage = /^image\//i.test(file.mimetype) || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.originalname);
          if (isImage) {
            const base64 = file.buffer.toString("base64");
            const mimeType = file.mimetype.startsWith("image/") ? file.mimetype : "image/jpeg";
            contentParts.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } });
          } else if (file.mimetype === "application/pdf") {
            try {
              const { default: pdfParse } = await import("pdf-parse");
              const parsed = await pdfParse(file.buffer);
              docText += `\n\n[File: ${file.originalname}]\n${parsed.text}`;
            } catch { docText += `\n\n[File: ${file.originalname} — could not extract text]`; }
          } else {
            docText += `\n\n[File: ${file.originalname}]\n${file.buffer.toString("utf-8")}`;
          }
        }
      }

      if (docText) {
        contentParts.push({ type: "text", text: `\n\nDocument content:${docText}` });
      }

      if (!files || files.length === 0) {
        contentParts.length = 0;
        contentParts.push({ type: "text", text: `${systemPrompt}\n\n${userMessage}` });
      }

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: contentParts }],
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });

      const solution = JSON.parse(aiResp.choices[0].message.content || "{}");
      const equation = userInstruction || solution.problem || (files?.[0]?.originalname ?? "Uploaded problem");
      res.json(await storage.createCalculatorLog({ userId: userId(req), equation, solution }));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e?.message || "Failed to process file" });
    }
  });

  // ── Exams ─────────────────────────────────────────────────────────
  app.get("/api/exams", async (req, res) => {
    res.json(await storage.getExams(userId(req)));
  });

  app.get("/api/exams/:id", async (req, res) => {
    const exam = await storage.getExam(Number(req.params.id));
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  });

  app.post("/api/exams/predict", async (req, res) => {
    try {
      const { module, topics, pastQuestions } = z.object({
        module: z.string().min(2),
        topics: z.string().min(5),
        pastQuestions: z.string().optional(),
      }).parse(req.body);

      // Include any student uploads
      const uploads = await storage.getUploadsForModule(userId(req), module);
      const uploadContext = uploads.length > 0
        ? `\n\nStudent's own study notes:\n${uploads.map(u => `[${u.filename}]: ${u.fileContent.slice(0, 600)}`).join("\n\n")}`
        : "";

      const prompt = `You are an expert NMU (Nelson Mandela University) academic advisor. Analyze the following study material and predict likely exam topics.

Module: ${module}
Topics/Study Material: ${topics}
${pastQuestions ? `Past Exam Questions:\n${pastQuestions}` : ""}${uploadContext}

Return a JSON object with:
- "likelyTopics": array of strings (top 6 most likely exam topics)
- "keyConcepts": array of strings (5-8 key concepts students must master)
- "studyPriorities": array of objects with "topic", "importance" ("High"|"Medium"|"Low") and "reason"
- "questionPatterns": array of strings (4-6 predicted question types or patterns)
- "summary": string (brief overall strategy for this exam)`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const predictionResult = JSON.parse(aiResp.choices[0].message.content || "{}");
      const exam = await storage.createExam({
        userId: userId(req), module,
        title: `${module} – Exam Prediction`,
        type: "prediction", predictionResult, questions: [],
      });

      res.status(201).json(exam);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Failed to generate prediction" });
    }
  });

  app.post("/api/exams/generate", async (req, res) => {
    try {
      const { module, topic } = z.object({
        module: z.string().min(2),
        topic: z.string().min(2),
      }).parse(req.body);

      // Include student uploads for this module
      const uploads = await storage.getUploadsForModule(userId(req), module);
      const uploadContext = uploads.length > 0
        ? `\n\nBase questions on the student's own study notes:\n${uploads.map(u => `[${u.filename}]: ${u.fileContent.slice(0, 600)}`).join("\n\n")}`
        : "";

      const prompt = `Generate a realistic university-level mock exam for NMU students.
Module: ${module}
Topic: ${topic}${uploadContext}

Create exactly 20 questions with a mix of types. Return a JSON object with key "questions". Each question:
- "id": number (1-20)
- "type": "mcq" | "short" | "problem"
- "question": string (full question text)
- "marks": number (1 for mcq, 2-5 for short/problem)
- "options": array of 4 strings (ONLY for mcq)
- "correctAnswer": string
- "explanation": string (full step-by-step solution)
- "topic": string (sub-topic)

Distribution: 10 MCQ, 6 short answer, 4 problem solving.`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(aiResp.choices[0].message.content || '{"questions":[]}');
      const questions = content.questions || [];
      const totalMarks = questions.reduce((s: number, q: any) => s + (q.marks || 1), 0);

      // Track which uploads contributed
      for (const u of uploads) storage.incrementUploadQuizCount(u.id).catch(() => {});

      const exam = await storage.createExam({
        userId: userId(req), module,
        title: `${module} – ${topic} Mock Exam`,
        type: "mock", questions,
        timerSeconds: 50 * 60,
      });

      res.status(201).json({ ...exam, totalMarks });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Failed to generate exam" });
    }
  });

  app.post("/api/exams/:id/submit", async (req, res) => {
    try {
      const examId = Number(req.params.id);
      const exam = await storage.getExam(examId);
      if (!exam) return res.status(404).json({ message: "Exam not found" });

      const { userAnswers } = z.object({ userAnswers: z.record(z.string()) }).parse(req.body);
      const questions: any[] = exam.questions || [];
      const mcqQuestions = questions.filter(q => q.type === "mcq");
      let correct = 0;
      const wrongTopics: string[] = [];

      mcqQuestions.forEach((q) => {
        if (userAnswers[q.id] === q.correctAnswer) {
          correct++;
        } else {
          if (q.topic && !wrongTopics.includes(q.topic)) wrongTopics.push(q.topic);
        }
      });

      const score = Math.round((correct / (mcqQuestions.length || 1)) * 100);
      res.json(await storage.updateExamResult(examId, {
        userAnswers: userAnswers as Record<number, string>,
        score, weakTopics: wrongTopics, completedAt: new Date(),
      }));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // ── Student Uploads ────────────────────────────────────────────────
  app.get("/api/uploads", async (req, res) => {
    res.json(await storage.getUploads(userId(req)));
  });

  app.post("/api/uploads", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file provided" });

      const { module, topic } = z.object({
        module: z.string().min(2),
        topic: z.string().optional(),
      }).parse(req.body);

      let fileContent = "";
      const isPdf = req.file.mimetype === "application/pdf";

      if (isPdf) {
        try {
          const pdfData = await parsePdf(req.file.buffer);
          fileContent = pdfData.text;
        } catch (err) {
          return res.status(400).json({ message: "Could not read PDF. Try a text-based PDF or use a .txt file." });
        }
      } else {
        fileContent = req.file.buffer.toString("utf-8");
      }

      if (!fileContent || fileContent.trim().length < 20) {
        return res.status(400).json({ message: "File appears to be empty or unreadable. Please try a different file." });
      }

      const savedUpload = await storage.createUpload({
        userId: userId(req),
        module,
        topic: topic || null,
        filename: req.file.originalname,
        fileContent: fileContent,
        fileSize: req.file.size,
      });

      // Return without fileContent in response to keep it light
      const { fileContent: _, ...safeUpload } = savedUpload;
      res.status(201).json({ ...safeUpload, charCount: fileContent.length });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.delete("/api/uploads/:id", async (req, res) => {
    try {
      const upload = await storage.getUpload(Number(req.params.id));
      if (!upload || upload.userId !== userId(req)) return res.status(404).json({ message: "Upload not found" });
      await storage.deleteUpload(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (e) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  // ── Presentation Analyzer ─────────────────────────────────────────
  app.post("/api/presentation/analyze", async (req, res) => {
    try {
      const { title, content } = z.object({
        title: z.string().optional(),
        content: z.string().min(30),
      }).parse(req.body);

      const prompt = `You are an expert academic presentation coach. Analyze the following presentation content and provide detailed, actionable feedback.

Presentation title: "${title || "Untitled"}"
Content:
${content}

Return a JSON object with:
- "overallScore": number 0-100
- "summary": string (2-3 sentence overall assessment)
- "structure": string (feedback on logical flow and organization)
- "clarity": string (feedback on how clear and understandable the content is)
- "engagement": string (feedback on how engaging and compelling the presentation is)
- "strengths": array of 3-4 strings (specific strong points)
- "improvements": array of 3-5 strings (specific, actionable improvements)
- "talkingPoints": array of 4-6 strings (suggested key talking points the presenter should emphasize)
- "slideAnalysis": array of objects (one per detected slide/section) each with:
  - "slideNumber": number
  - "title": string (slide/section title)
  - "feedback": string (specific feedback for that slide)
  - "score": number 0-100`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(aiResp.choices[0].message.content || "{}");
      res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Failed to analyze presentation" });
    }
  });

  // ── Voice Explainer ───────────────────────────────────────────────
  app.post("/api/voice/explain", async (req, res) => {
    try {
      const { content, language } = z.object({
        content: z.string().min(20),
        language: z.string().default("English"),
      }).parse(req.body);

      const isEnglish = language === "English";
      const langInstruction = isEnglish
        ? "Write everything in clear, simple English."
        : `IMPORTANT: Write ALL output — the explanation, key points, examples, and audio script — entirely in ${language}. If the source content is in a different language, translate and explain it in ${language}. Do not mix languages.`;

      const textPrompt = `You are a student-friendly tutor at Nelson Mandela University. ${langInstruction}

Explain the following content in simple, clear language that any student can understand. Then provide practical real-world examples.

Content to explain:
${content}

Return a JSON object with:
- "explanation": string (clear, simple explanation in 150-250 words — written as if speaking to the student directly, in ${language})
- "keyPoints": array of 5-7 strings (the most important things to remember, in ${language})
- "examples": array of 4-5 objects each with "title" (short label) and "description" (1-2 sentence practical real-world example) — all in ${language}
- "audioScript": string (a natural, conversational version of the explanation suitable for audio narration — about 200 words, in ${language})
- "language": "${language}"`;

      const textResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: textPrompt }],
        response_format: { type: "json_object" },
      });

      const textResult = JSON.parse(textResp.choices[0].message.content || "{}");

      res.json({
        explanation: textResult.explanation,
        audioScript: textResult.audioScript,
        keyPoints: textResult.keyPoints || [],
        examples: textResult.examples || [],
        language: textResult.language || language,
      });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Failed to generate explanation" });
    }
  });

  // ── PayPal Payments ──────────────────────────────────────────────
  // PayPal does not support ZAR — amounts are in USD (R29 ≈ $1.60, R150 ≈ $8.30)
  const PLANS: Record<string, { amount: string; durationDays: number; name: string; displayPrice: string }> = {
    monthly:  { amount: "1.60",  durationDays: 30,  name: "Hulinks NMU Premium - Monthly",  displayPrice: "$1.60" },
    semester: { amount: "8.30",  durationDays: 180, name: "Hulinks NMU Premium - Semester", displayPrice: "$8.30" },
  };

  // Expose PayPal client ID to the frontend (non-secret)
  app.get("/api/payments/config", (_req, res) => {
    res.json({ clientId: PAYPAL_CLIENT_ID });
  });

  // Create a PayPal order — called when user clicks Pay
  app.post("/api/payments/create-order", async (req, res) => {
    try {
      const { plan } = z.object({ plan: z.enum(["monthly", "semester"]) }).parse(req.body);
      const planInfo = PLANS[plan];
      const token = await getPaypalAccessToken();

      const r = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: planInfo.amount },
            description: planInfo.name,
            custom_id: `${(req.session as any).userId}|${plan}`,
          }],
        }),
      });

      const order = await r.json() as { id?: string; name?: string; message?: string };

      if (!order.id) {
        console.error("PayPal order creation failed:", JSON.stringify(order));
        return res.status(500).json({ message: order.message || "Failed to create PayPal order" });
      }

      res.json({ orderId: order.id });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error("PayPal create-order error:", e);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Capture a PayPal order after user approves — upgrades user to premium
  app.post("/api/payments/capture-order", async (req, res) => {
    try {
      const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
      const token = await getPaypalAccessToken();

      const r = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const capture = await r.json() as {
        status: string;
        purchase_units?: Array<{ payments?: { captures?: Array<{ custom_id?: string }> } }>;
      };

      if (capture.status !== "COMPLETED") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Extract user + plan from custom_id stored on the order
      const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ?? "";
      const [capturedUserId, plan] = customId.split("|");
      const sessionUserId = (req.session as any).userId as string;
      const userId = capturedUserId || sessionUserId;

      if (!userId || !plan) return res.status(400).json({ message: "Missing user data" });

      const durationDays = PLANS[plan]?.durationDays ?? 30;
      const subscriptionEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      await storage.updateUserPayment(userId, {
        isPremium: true,
        tier: "premium",
        paymentStatus: "paid",
        stripeSessionId: orderId,
        subscriptionEnd,
      });

      console.log(`[PayPal] Upgraded user ${userId} to premium (${plan})`);
      res.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error("PayPal capture-order error:", e);
      res.status(500).json({ message: "Failed to capture payment" });
    }
  });

  // ── Study Buddy ───────────────────────────────────────────────────
  app.post("/api/study-buddy/chat", async (req, res) => {
    try {
      const { history, module: mod } = z.object({
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
        module: z.string().optional(),
      }).parse(req.body);

      const systemPrompt = `You are an expert academic tutor at Nelson Mandela University (NMU) in Port Elizabeth, South Africa. A student needs your help with their studies.

Your approach:
- Listen carefully to what the student is struggling with and address it directly
- Give a clear, structured, easy-to-understand explanation broken into digestible parts
- Use practical real-world examples and analogies to make concepts click
- Highlight the most common mistakes students make with this topic so they avoid them
- At the end of EVERY response, always ask ONE of: "Is this making more sense? Which part would you like me to clarify further?" or "Would you like me to create a few practice questions on this?" or "What part of this is still unclear?"
- Be warm, patient, encouraging and specific — never give vague answers
- If the student describes something vague, ask a clarifying question first
- Keep responses focused and not too long — clear > comprehensive${mod ? `\n\nModule context: ${mod}` : ""}`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history,
      ];

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 800,
      });

      res.json({ message: aiResp.choices[0].message.content || "" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e?.message || "Failed to get response" });
    }
  });

  // ── QP Generator ──────────────────────────────────────────────────
  app.post("/api/uploads/summarize", async (req, res) => {
    try {
      const { text, summaryType, customType } = z.object({
        text: z.string().min(20),
        summaryType: z.enum(["topics", "chapters", "other"]),
        customType: z.string().optional(),
      }).parse(req.body);

      const typeInstructions: Record<string, string> = {
        topics: `Organise the content into clear TOPICS. For each topic:
- Use "## Topic: [Name]" as the heading
- List 4–7 bullet points covering key concepts, definitions, and important facts
- Bold (**term**) key terms when first mentioned`,
        chapters: `Organise the content into CHAPTERS or logical chapter-like sections. For each chapter:
- Use "## Chapter [N]: [Title]" as the heading
- Write a 2–3 sentence overview of the chapter
- List 4–8 key takeaways as bullet points
- Bold (**term**) important terms`,
        other: `Summarise the content as: ${customType || "a concise structured summary"}.
- Use ## headings to organise sections
- Use bullet points for key information
- Bold (**term**) important terms and definitions
- Be thorough but concise`,
      };

      const prompt = `You are an expert academic summariser helping Nelson Mandela University students study effectively. Analyse the following study material and produce a comprehensive, well-structured summary.

FORMAT INSTRUCTIONS:
${typeInstructions[summaryType]}

RULES:
- Cover ALL major content from the source material
- Do not add information not present in the source
- Use clear, student-friendly academic language
- Start directly with the first heading — no preamble or meta-commentary

STUDY MATERIAL:
${text}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
      });

      res.json({ summary: response.choices[0].message.content || "" });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error("[summarize]", e);
      res.status(500).json({ message: "Summarisation failed. Please try again." });
    }
  });

  app.post("/api/uploads/save-text", async (req: any, res) => {
    try {
      const { text, module, topic, filename } = z.object({
        text: z.string().min(20),
        module: z.string().min(2),
        topic: z.string().optional(),
        filename: z.string().default("Uploaded Content"),
      }).parse(req.body);

      const savedUpload = await storage.createUpload({
        userId: userId(req),
        module,
        topic: topic || null,
        filename,
        fileContent: text,
        fileSize: Buffer.byteLength(text, "utf8"),
      });

      const { fileContent: _, ...safeUpload } = savedUpload;
      res.status(201).json({ ...safeUpload, charCount: text.length });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error("[save-text]", e);
      res.status(500).json({ message: "Failed to save notes." });
    }
  });

  app.post("/api/uploads/generate-qp", calcUpload.single("file"), async (req, res) => {
    try {
      const { module: mod, examType, duration, questionCount, format } = z.object({
        module: z.string().min(2),
        examType: z.string(),
        duration: z.string(),
        questionCount: z.coerce.number().min(5).max(200).default(30),
        format: z.string(),
      }).parse(req.body);

      let outcomesText = "";
      if (req.file) {
        if (req.file.mimetype === "application/pdf") {
          const { default: pdfParse } = await import("pdf-parse");
          const parsed = await pdfParse(req.file.buffer);
          outcomesText = parsed.text;
        } else if (req.file.mimetype.startsWith("image/")) {
          const base64 = req.file.buffer.toString("base64");
          const mimeType = req.file.mimetype;
          const ocrResp = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: [
              { type: "text", text: "Extract all text content from this image of learning outcomes/syllabus:" },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
            ]}],
            max_tokens: 2000,
          });
          outcomesText = ocrResp.choices[0].message.content || "";
        } else {
          outcomesText = req.file.buffer.toString("utf-8");
        }
      }

      const formatGuide: Record<string, string> = {
        essay: "All questions must be essay/long-answer questions requiring detailed responses (5-20 marks each)",
        mcq: "All questions must be Multiple Choice Questions with 4 options each (2-4 marks each)",
        short: "All questions must be short-answer questions (2-5 marks each, 2-4 sentences expected)",
        mixed: "Mix question types: include MCQ (Section A), short answer (Section B), and essay/long (Section C)",
      };

      const prompt = `You are an expert NMU (Nelson Mandela University) academic paper setter with 20 years of experience creating formal examination papers.

Generate a COMPLETE, FORMAL university Question Paper AND a detailed Marking Memo for:
- Module: ${mod}
- Exam Type: ${examType}
- Duration: ${duration}
- Total Questions: ${questionCount}
- Format: ${formatGuide[format] || formatGuide.mixed}

${outcomesText ? `Learning Outcomes / Syllabus content to base questions on:\n${outcomesText}` : "Generate questions appropriate for a university-level module on this topic."}

IMPORTANT RULES:
- Generate EXACTLY ${questionCount} questions total across all sections
- Assign appropriate marks per question (MCQ: 2 marks, short answer: 4–5 marks, essay: 10–20 marks)
- Questions must DIRECTLY test the learning outcomes provided
- For essay questions, include mark allocation guides in the memo (e.g., "2 marks for definition, 3 marks for explanation")
- Questions should span different cognitive levels (remember, understand, apply, analyse)
- Use formal academic language throughout
- Include proper exam paper header and instructions

Return a JSON object:
{
  "title": "${mod} — ${examType}",
  "duration": "${duration}",
  "totalMarks": "calculated total",
  "instructions": "string (formal exam instructions to students)",
  "sections": [
    {
      "label": "SECTION A",
      "title": "Multiple Choice / Short Answer / etc.",
      "marks": 40,
      "questions": [
        {
          "number": 1,
          "marks": 4,
          "question": "Full question text here",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "memo": "ALWAYS a plain string — write the complete marking guide as a single string, never an object or array"
        }
      ]
    }
  ]
}`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const qp = JSON.parse(aiResp.choices[0].message.content || "{}");
      res.json(qp);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e?.message || "Failed to generate question paper" });
    }
  });

  // ── Research Engine ───────────────────────────────────────────────
  app.post("/api/research/search", async (req, res) => {
    try {
      const { topic, field, resultCount } = z.object({
        topic: z.string().min(3).max(300),
        field: z.string().optional(),
        resultCount: z.coerce.number().min(3).max(15).default(8),
      }).parse(req.body);

      // Build a smart query — include field context if provided
      const queryString = field && field !== "all" ? `${topic} ${field}` : topic;

      // Helper: reconstruct abstract from OpenAlex inverted index
      function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
        if (!invertedIndex) return "";
        const words: string[] = [];
        for (const [word, positions] of Object.entries(invertedIndex)) {
          for (const pos of positions) { words[pos] = word; }
        }
        return words.join(" ").trim();
      }

      // 1. Fetch real papers from OpenAlex (free, 240M+ works, no API key needed)
      const oaUrl = `https://api.openalex.org/works?search=${encodeURIComponent(queryString)}&per-page=${resultCount}&select=id,title,authorships,publication_year,doi,cited_by_count,primary_location,type,abstract_inverted_index&mailto=research@hulinks.co.za`;
      const oaResp = await fetch(oaUrl, {
        headers: { "Accept": "application/json", "User-Agent": "HUlinks-NMU-Research/1.0" },
      });

      let rawPapers: any[] = [];
      if (oaResp.ok) {
        const oaData = await oaResp.json();
        rawPapers = (oaData.results || []).filter((p: any) => p.title && p.publication_year);
      }

      // Normalize OpenAlex papers to a common format
      const semanticPapers = rawPapers.map((p: any) => ({
        paperId: p.id,
        title: p.title,
        authors: (p.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        year: p.publication_year,
        journal: p.primary_location?.source?.display_name || null,
        abstract: reconstructAbstract(p.abstract_inverted_index),
        doi: p.doi ? p.doi.replace("https://doi.org/", "") : null,
        url: p.doi || null,
        citationCount: p.cited_by_count || 0,
        publicationTypes: p.type ? [p.type] : [],
      }));

      // 2. Use OpenAI to generate a research overview + proper APA/Harvard citations
      const papersForAI = semanticPapers.slice(0, resultCount).map((p: any) => ({
        title: p.title,
        authors: p.authors,
        year: p.year,
        journal: p.journal,
        abstract: p.abstract ? p.abstract.slice(0, 400) : null,
        doi: p.doi || null,
        url: p.url || null,
        citationCount: p.citationCount || 0,
      }));

      const aiPrompt = `You are an expert academic research librarian helping a Nelson Mandela University (NMU) student find sources for their assignment.

TOPIC: "${topic}"${field && field !== "all" ? `\nFIELD: ${field}` : ""}

REAL PAPERS FOUND (from Semantic Scholar academic database):
${JSON.stringify(papersForAI, null, 2)}

Your tasks:
1. Write a concise "Research Overview" (3-4 sentences) explaining the main themes, debates, and key concepts in this topic area based on these papers. This should help the student understand what their literature review should cover.

2. For each paper, write:
   - "relevance": 1-2 sentences explaining WHY this paper is relevant to the topic and what insight it provides
   - "apa": Full APA 7th edition citation. Format: Author, A. B., & Author, C. D. (Year). Title of article. Journal Name, Volume(Issue), pages. https://doi.org/xxxxx
   - "harvard": Full Harvard citation. Format: Author, A.B. and Author, C.D. (Year) 'Title of article', Journal Name, Volume(Issue), pp. pages. doi: xxxxx
   - "keyPoints": Array of 2-3 key points from this paper the student should know

3. Also suggest 3-5 additional SEARCH TERMS the student could use to find more sources on this topic.

Return a JSON object:
{
  "overview": "string — research landscape overview",
  "searchTerms": ["term1", "term2", "term3"],
  "papers": [
    {
      "title": "same title",
      "relevance": "string",
      "apa": "full APA citation",
      "harvard": "full Harvard citation", 
      "keyPoints": ["point1", "point2"]
    }
  ]
}

IMPORTANT: Generate citations ONLY for the real papers listed above. Do NOT invent papers.`;

      // Run research enrichment + video recommendations in parallel
      const videoPrompt = `You are an expert study coach helping a Nelson Mandela University (NMU) student find YouTube videos to study this topic.

TOPIC: "${topic}"${field && field !== "all" ? `\nFIELD: ${field}` : ""}

Recommend 6 YouTube resources that will genuinely help a university student studying this topic. Include a mix of:
- Specific well-known YouTube channels that cover this subject area (e.g. Khan Academy, Crash Course, TED-Ed, Professor Leonard, etc.)
- Targeted YouTube search queries the student should run to find lectures, tutorials, or explanations
- Any specific well-known video series or playlists if you know them

For each resource, provide:
- "title": A clear, specific title describing what this resource covers (e.g. "Khan Academy: Supply and Demand explained")
- "channel": The YouTube channel or creator name (e.g. "Khan Academy")
- "url": A working YouTube URL. Use these formats ONLY:
  * For known channels: https://www.youtube.com/@channelhandle (e.g. https://www.youtube.com/@khanacademy)  
  * For targeted searches: https://www.youtube.com/results?search_query=your+search+terms+here
- "type": one of "channel", "search"
- "description": 1 sentence explaining what the student will find there and why it's useful
- "level": one of "beginner", "intermediate", "advanced"

Return JSON:
{
  "videos": [
    {
      "title": "string",
      "channel": "string",
      "url": "string — valid YouTube URL",
      "type": "channel" | "search",
      "description": "string",
      "level": "beginner" | "intermediate" | "advanced"
    }
  ]
}

IMPORTANT: Only provide URLs in the exact formats above. Use real YouTube channel handles you are confident exist.`;

      const [aiResp, videoResp] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: aiPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 3000,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: videoPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 1000,
        }),
      ]);

      const aiData = JSON.parse(aiResp.choices[0].message.content || "{}");
      const videoData = JSON.parse(videoResp.choices[0].message.content || "{}");

      // 3. Merge AI enrichment with real paper data
      const enrichedPapers = semanticPapers.slice(0, resultCount).map((p: any, i: number) => {
        const ai = aiData.papers?.[i] || {};
        return {
          id: p.paperId,
          title: p.title,
          authors: p.authors || [],
          year: p.year,
          journal: p.journal || null,
          abstract: p.abstract ? p.abstract.slice(0, 500) : null,
          doi: p.doi || null,
          url: p.url || (p.doi ? `https://doi.org/${p.doi}` : null),
          citationCount: p.citationCount || 0,
          publicationTypes: p.publicationTypes || [],
          relevance: ai.relevance || null,
          apa: ai.apa || null,
          harvard: ai.harvard || null,
          keyPoints: ai.keyPoints || [],
        };
      });

      // Clean + validate video URLs
      const videos = (videoData.videos || []).map((v: any) => ({
        title: v.title || "",
        channel: v.channel || "",
        url: v.url || "",
        type: v.type || "search",
        description: v.description || "",
        level: v.level || "intermediate",
      })).filter((v: any) => v.url.startsWith("https://www.youtube.com/"));

      res.json({
        topic,
        overview: aiData.overview || null,
        searchTerms: aiData.searchTerms || [],
        papers: enrichedPapers,
        totalFound: enrichedPapers.length,
        videos,
      });
    } catch (e: any) {
      console.error("[Research] Error:", e?.message || e);
      res.status(500).json({ message: e?.message || "Research search failed" });
    }
  });

  }
} catch (e) {
  console.log("Seeding skipped (DB not ready)");
}
