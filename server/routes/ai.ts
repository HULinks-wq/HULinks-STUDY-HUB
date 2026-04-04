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

STRICT RULES:
- Each question must have EXACTLY 4 options
- Do NOT include "A:", "B:", etc in the options
- Options must be plain text only
- The answer must be ONLY one letter: A, B, C, or D

Return ONLY valid JSON in this exact format:

{
  "quiz": [
    {
      "question": "What is ...?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "A"
    }
  ],
  "memo": "short explanation"
}
          `,
        },
      ],
    });

    let text = completion.choices[0].message.content || "";

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const data = JSON.parse(text);

    res.json(data);

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI failed" });
  }
});

export default router;