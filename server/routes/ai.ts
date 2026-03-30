import { Router } from "express";
import { openai } from "../services/openai";
import { aiLimiter } from "../middleware/aiLimiter";

const router = Router();

// 🔹 Smart Study Chat (your Study Buddy core)
router.post("/study-buddy", aiLimiter, async (req, res) => {
  try {
    const { message, module } = req.body;

    const systemPrompt = `
You are an elite university tutor at Nelson Mandela University.

Rules:
- Explain clearly like you're teaching a struggling student
- Break things into simple steps
- Use real-world examples
- Highlight common mistakes
- Keep it structured but not too long
- End by asking ONE follow-up question

${module ? `Module context: ${module}` : ""}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (e) {
    res.status(500).json({ message: "Study buddy failed" });
  }
});

// 🔹 Text Summariser (VERY important feature)
router.post("/summarize", aiLimiter, async (req, res) => {
  try {
    const { text } = req.body;

    const prompt = `
Summarise this into structured study notes:
- Use headings
- Use bullet points
- Bold key terms

Content:
${text}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({
      summary: response.choices[0].message.content,
    });
  } catch (e) {
    res.status(500).json({ message: "Summarisation failed" });
  }
});

export default router;
