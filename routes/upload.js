import express from "express";
import multer from "multer";
import { extractText } from "../tasks/extractor.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
});

router.post(
  "/upload",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jobDescription", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const resumeFile = req.files?.resume?.[0];
      const jdFile = req.files?.jobDescription?.[0];

      if (!resumeFile || !jdFile) {
        return res.status(400).json({
          error: "Both resume and jobDescription files are required",
        });
      }

      const [resumeText, jdText] = await Promise.all([
        extractText(resumeFile.buffer, resumeFile.mimetype),
        extractText(jdFile.buffer, jdFile.mimetype),
      ]);

      const clean = (text) => text.replace(/\s+/g, " ").trim();

      return res.json({
        success: true,
        resume: {
          filename: resumeFile.originalname,
          text: clean(resumeText),
          charCount: resumeText.length,
        },
        jobDescription: {
          filename: jdFile.originalname,
          text: clean(jdText),
          charCount: jdText.length,
        },
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;