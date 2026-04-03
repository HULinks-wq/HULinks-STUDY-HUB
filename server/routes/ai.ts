import { Router } from "express";

const router = Router();

router.get("/api/ai", (req, res) => {
  res.json({
    quiz: [
      {
        question: "What is working capital?",
        options: [
          "A company's profit",
          "Current assets minus current liabilities",
          "Total revenue",
          "Long-term debt",
        ],
        answer: "B",
      },
      {
        question: "Which is a current asset?",
        options: [
          "Buildings",
          "Machinery",
          "Inventory",
          "Land",
        ],
        answer: "C",
      },
    ],
    memo: "Working capital = Current Assets - Current Liabilities.",
  });
});

export default router;