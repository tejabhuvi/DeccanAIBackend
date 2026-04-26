import express from "express";
import { model } from "../AI/geminiApi.js";

const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { resumeText, jdText } = req.body;

  if (!resumeText || !jdText) {
    return res.status(400).json({ error: "resumeText and jdText are required" });
  }

  const prompt = `
You are an AI skill assessment agent preparing to interview a candidate.

Analyse the Job Description and Resume below. Your output will be used to:
1. Drive a conversational skill assessment interview
2. Decide which skills to probe, how deep, and at what difficulty
3. Identify gaps to later build a learning plan

JOB DESCRIPTION:
${jdText}

RESUME:
${resumeText}

Return ONLY a raw JSON object with this exact structure:

{
  "jobTitle": "string — inferred from JD",
  "experienceLevel": "one of: Junior, Mid, Senior, Lead",

  "skills": [
    {
      "skill": "string — concise skill name e.g. React, System Design, Leadership",
      "category": "one of: Technical, Tool, Soft Skill, Domain Knowledge",
      "importance": "one of: Critical, Important, Bonus",
      "resumeEvidence": "one of: Strong, Weak, None",
      "resumeNote": "one short sentence on what resume says, or null",
      "estimatedLevel": "one of: None, Beginner, Intermediate, Advanced, Expert",
      "assessmentPriority": "one of: High, Medium, Low",
      "suggestedDepth": "one of: Surface, Moderate, Deep",
      "questionFocus": "one short sentence on WHAT to probe in interview e.g. 'Test real Redux usage beyond basic state' or 'Verify team size and conflict handling'"
    }
  ],

  "candidateProfile": {
    "totalYearsExperience": "number or null",
    "strongAreas": ["list of skills candidate looks genuinely strong in"],
    "weakAreas": ["list of skills that look absent or weak vs JD needs"],
    "redFlags": ["anything suspicious — e.g. claimed skill with zero project evidence"],
    "initialMatchScore": "number 0-100 — rough resume-only fit score before interview"
  },

  "interviewStrategy": {
    "totalSkillsToAssess": "number",
    "recommendedQuestionCount": "number between 8-15",
    "openWith": "which skill to open the interview with and why — one sentence",
    "watchOutFor": "one sentence on what to be skeptical about in this candidate"
  }
}

Rules:
- assessmentPriority = High if importance is Critical AND resumeEvidence is Weak or None
- assessmentPriority = High if importance is Critical AND resumeEvidence is Strong (still need to validate)
- assessmentPriority = Low only for Bonus skills with Strong evidence
- suggestedDepth = Deep for High priority, Moderate for Medium, Surface for Low
- Be skeptical — resumes exaggerate. If a skill is just listed with no project proof, resumeEvidence = Weak
- questionFocus must be actionable — tell the agent exactly what angle to probe
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, analysis: parsed });
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;