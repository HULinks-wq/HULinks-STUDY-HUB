import { Router } from "express";
import multer from "multer";
import { parsePdf, parseDocx } from "../services/pdf";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file" });

    let text = "";

    if (file.mimetype === "application/pdf") {
      text = await parsePdf(file.buffer);
    } else if (file.originalname.endsWith(".docx")) {
      text = await parseDocx(file.buffer);
    } else {
      text = file.buffer.toString("utf-8");
    }

    res.json({ text });
  } catch (e) {
    res.status(500).json({ message: "Upload failed" });
  }
});

export default router;
