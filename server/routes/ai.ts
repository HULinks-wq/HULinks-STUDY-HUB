import { Router } from "express";
import OpenAI from "openai";

const router = Router();

// ⚠️ make sure you have your API key in Railway env vars
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// (optional) if you already created aiLimiter keep it, otherwise comment it out
// import aiLimiter from "../middleware/aiLimiter";

router.post("/study-buddy", async (req, res) => {
  try {
    console.log("🔥 Study buddy hit");

    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // safer + cheaper
      messages: [{ role: "user", content: message }],
    });

    res.json({
      reply: response.choices[0].message.content,
    });

  } catch (e) {
    console.error("❌ AI ERROR:", e);
    res.status(500).json({ message: "Study buddy failed" });
  }
});

// ✅ THIS LINE WAS MISSING (THIS CAUSED YOUR CRASH)
export { router as ai };
