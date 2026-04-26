import express from "express";
import { model } from "../AI/geminiApi.js";

const router = express.Router();

router.post("/generate-questions", async (req, res) => {
  const { analysis } = req.body;

  if (!analysis) {
    return res.status(400).json({ error: "analysis object is required" });
  }

  const { skills, candidateProfile, interviewStrategy, jobTitle, experienceLevel } = analysis;
  const skillsToAssess = skills.filter(s => s.assessmentPriority !== "Low");

  const prompt = `
You are an expert technical interviewer for a ${jobTitle} position.
Candidate level: ${experienceLevel}

Skills to assess:
${JSON.stringify(skillsToAssess, null, 2)}

Candidate profile:
- Strong areas: ${candidateProfile.strongAreas.join(", ")}
- Weak areas: ${candidateProfile.weakAreas.join(", ")}
- Red flags: ${candidateProfile.redFlags.join(", ")}
- Watch out for: ${interviewStrategy.watchOutFor}

Generate exactly ${interviewStrategy.recommendedQuestionCount} questions.

Return ONLY raw JSON:
{
  "questions": [
    {
      "id": 1,
      "skill": "exact skill name",
      "category": "Technical | Tool | Soft Skill | Domain Knowledge",
      "priority": "High | Medium | Low",
      "depth": "Deep | Moderate | Surface",
      "type": "Practical | Scenario | Conceptual | Behavioural",
      "question": "the actual question"
    }
  ],
  "openingMessage": "Warm natural opener. Make candidate comfortable. Do not mention scoring.Do not include Candidate name or company name. Keep it generic.",
  "closingMessage": "Natural message telling candidate their answers are being evaluated."
}

STRICT question rules:
- Every question must be SPECIFIC and CONCRETE
- BAD: "Tell me about your Python experience"
- GOOD: "You have a 50,000 row CSV where 3 columns have nulls and one has duplicates — walk me through exactly what Python code you'd write to clean it before analysis"
- BAD: "How do you handle teamwork?"  
- GOOD: "Describe a specific time you disagreed with a teammate on a technical decision — what was the disagreement, what did you do, and what was the outcome?"
- Questions must be answerable in 3-5 sentences — not too broad, not too narrow
- Deep → Practical or Scenario
- Moderate → Scenario or Behavioural  
- Surface → Conceptual
- Order: High priority first, then Medium, then Low
- First question: ${interviewStrategy.openWith}
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.json({
      success: true,
      totalQuestions: parsed.questions.length,
      openingMessage: parsed.openingMessage,
      closingMessage: parsed.closingMessage,
      questions: parsed.questions,
    });
  } catch (err) {
    console.error("Question generation error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;