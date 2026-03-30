import { Router } from "express";
import { openai } from "../services/openai";
import { aiLimiter } from "../middleware/aiLimiter";

const router = Router();

router.post("/chat", aiLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: message }],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (e) {
    res.status(500).json({ message: "AI error" });
  }
});

export default router;
