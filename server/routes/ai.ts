import express from "express";
import OpenAI from "openai";

const router = express.Router();

// ✅ OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Route
router.post("/study-buddy", async (req, res) => {
  try {
    console.log("🔥 Study buddy hit");

    const { message } = req.body;

    // basic validation
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

console.log("🚀 NEW CODE DEPLOYED");

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});

const raw = response.choices[0].message.content;

let parsed;

try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error("❌ JSON PARSE ERROR:", raw);
  return res.status(500).json({
    message: "AI did not return valid JSON",
    raw,
  });
}

res.json(parsed);
  } catch (error) {
    console.error("❌ AI ERROR:", error);

    res.status(500).json({
      message: "Study buddy failed",
      error: error.message
    });
  }
});

// ✅ IMPORTANT EXPORT
export const ai = router;

router.post("/generate-quiz", async (req, res) => {
  try {
    console.log("🔥 Quiz generator hit");

    const { topic, module, level, questions } = req.body;

    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }
    
  const prompt = `
You are a university tutor.

Create a ${level || "medium"} quiz for "${module || "General"}" on "${topic}".

IMPORTANT:
- You MUST return ONLY valid JSON
- DO NOT include explanations, titles, or formatting text
- DO NOT include "QUIZ" or "MEMO"
- ONLY return JSON

Format EXACTLY like this:

{
  "quiz": [
    {
      "question": "Question text",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct option"
    },
    {
      "question": "Question text",
      "type": "short",
      "answer": "Answer"
    }
  ]
}

Rules:
- ${questions || 5} questions
- Mix MCQ and short answer
- Answers must be correct
`;
