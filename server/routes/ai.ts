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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: message }
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });

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
