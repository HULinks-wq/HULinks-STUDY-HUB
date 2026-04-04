import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/api/ai", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
Generate 3 multiple choice quiz questions about business studies.

Return ONLY JSON in this format:
{
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ],
  "memo": "short explanation"
}
          `,
        },
      ],
    });

    const text = completion.choices[0].message.content;

    // convert string → JSON
    const data = JSON.parse(text || "{}");

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI failed" });
  }
});

export default router;