router.post("/study-buddy", aiLimiter, async (req, res) => {
  try {
    console.log("🔥 Study buddy hit");

    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
