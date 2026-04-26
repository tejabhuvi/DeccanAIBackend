import express from "express";
import multer from "multer";
import { extractText } from "../tasks/extractor.js";
import { model } from "../AI/geminiApi.js";

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
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only PDF and DOCX files are allowed"));
  },
});

router.post(
  "/process",
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

      // Step 1 — extract text from both files in parallel
      const [resumeText, jdText] = await Promise.all([
        extractText(resumeFile.buffer, resumeFile.mimetype),
        extractText(jdFile.buffer, jdFile.mimetype),
      ]);

      const clean = (text) => text.replace(/\s+/g, " ").trim();
      const cleanedResume = clean(resumeText);
      const cleanedJD = clean(jdText);

      // Step 2 — analyze with Gemini
      const prompt = `
You are an AI skill assessment agent preparing to interview a candidate.

Analyse the Job Description and Resume below. Your output will be used to:
1. Drive a conversational skill assessment interview
2. Decide which skills to probe, how deep, and at what difficulty
3. Identify gaps to later build a learning plan

JOB DESCRIPTION:
${cleanedJD}

RESUME:
${cleanedResume}

Return ONLY a raw JSON object with this exact structure:
{
  "jobTitle": "string — inferred from JD",
  "experienceLevel": "one of: Junior, Mid, Senior, Lead",
  "skills": [
    {
      "skill": "string — concise skill name",
      "category": "one of: Technical, Tool, Soft Skill, Domain Knowledge",
      "importance": "one of: Critical, Important, Bonus",
      "resumeEvidence": "one of: Strong, Weak, None",
      "resumeNote": "one short sentence on what resume says, or null",
      "estimatedLevel": "one of: None, Beginner, Intermediate, Advanced, Expert",
      "assessmentPriority": "one of: High, Medium, Low",
      "suggestedDepth": "one of: Surface, Moderate, Deep",
      "questionFocus": "one short sentence on WHAT to probe in interview"
    }
  ],
  "candidateProfile": {
    "totalYearsExperience": "number or null",
    "strongAreas": ["list of skills candidate looks genuinely strong in"],
    "weakAreas": ["list of skills that look absent or weak vs JD needs"],
    "redFlags": ["anything suspicious — claimed skill with zero project evidence"],
    "initialMatchScore": "number 0-100"
  },
  "interviewStrategy": {
    "totalSkillsToAssess": "number",
    "recommendedQuestionCount": "number between 8-15",
    "openWith": "which skill to open the interview with and why",
    "watchOutFor": "one sentence on what to be skeptical about"
  }
}

Rules:
- assessmentPriority = High for Critical skills regardless of evidence
- assessmentPriority = Low only for Bonus skills with Strong evidence
- suggestedDepth = Deep for High priority, Moderate for Medium, Surface for Low
- Be skeptical — if a skill is just listed with no project proof, resumeEvidence = Weak
`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(cleaned);

      return res.json({
        success: true,
        resumeText: cleanedResume,
        jdText: cleanedJD,
        analysis,
      });

    } catch (err) {
      console.error("Process error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;