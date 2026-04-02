import express from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/ai/study-buddy
router.post("/study-buddy", async (req, res) => {
  try {
    console.log("🔥 Study buddy hit");

    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a study assistant.

When generating quizzes:
- ALWAYS return JSON
- Format:
{
  "quiz": "...",
  "memo": "..."
}

Do NOT return explanations outside JSON.
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const raw = response.choices[0].message.content;

    try {
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch {
      res.json({ reply: raw });
    }

  } catch (e) {
    console.error("❌ AI ERROR:", e);
    res.status(500).json({ message: "Study buddy failed" });
  }
});

export const ai = router;