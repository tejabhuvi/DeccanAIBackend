import express from "express";
import { model } from "../AI/geminiApi.js";

const router = express.Router();

// Phase 1 — batch evaluate all answers + decide follow-ups
router.post("/evaluate", async (req, res) => {
  const { answers, analysis, followUpAnswers = [] } = req.body;

  if (!answers || !analysis) {
    return res.status(400).json({ error: "answers and analysis are required" });
  }

  const allAnswers = [
    ...answers,
    ...followUpAnswers.map(f => ({ ...f, isFollowUp: true })),
  ];

  const prompt = `
You are an expert skill assessor evaluating a candidate for a ${analysis.jobTitle} role.
Candidate level: ${analysis.experienceLevel}
Resume match score before interview: ${analysis.candidateProfile.initialMatchScore}/100

Here are all the interview questions and the candidate's answers:
${JSON.stringify(allAnswers, null, 2)}

Red flags to watch for: ${analysis.candidateProfile.redFlags.join(", ")}

Evaluate the candidate thoroughly and return ONLY raw JSON:
{
  "skillScores": [
    {
      "skill": "skill name",
      "category": "Technical | Tool | Soft Skill | Domain Knowledge",
      "priority": "Critical | Important | Bonus",
      "score": <number 1-10>,
      "level": "None | Beginner | Intermediate | Advanced | Expert",
      "verdict": "one of: Strong | Adequate | Weak | Bluffing",
      "evidence": "1-2 sentences on what in their answer supports this score",
      "gap": "what specifically is missing or wrong, null if score >= 7"
    }
  ],
  "needsFollowUp": [
    {
      "skill": "skill name",
      "reason": "why this needs a follow-up — what was unclear or weak",
      "followUpQuestion": "one specific, pointed follow-up question based on their actual answer"
    }
  ],
  "overallScore": <number 1-100>,
  "interviewVerdict": "one of: Strong Hire | Hire | Maybe | No Hire",
  "summary": "3-4 sentences honest summary of candidate performance"
}

Scoring rules:
- Score 1-3: No real knowledge, bluffing, or completely wrong
- Score 4-5: Basic awareness but cannot apply it
- Score 6-7: Adequate — knows enough to do the job with guidance
- Score 8-9: Strong — can apply independently with good depth
- Score 10: Expert — exceptional answer, went beyond what was asked
- Be honest and strict — do NOT inflate scores
- verdict "Bluffing": candidate used buzzwords but couldn't explain or apply
- needsFollowUp: ONLY include skills where score is 4-6 AND the gap is critical to the role
- Maximum 3 follow-up questions — only the most important gaps
- overallScore weights Critical skills 3x, Important skills 2x, Bonus skills 1x
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(cleaned);

    const hasFollowUps = evaluation.needsFollowUp && evaluation.needsFollowUp.length > 0;
    const isFinalEvaluation = followUpAnswers.length > 0 || !hasFollowUps;

    // If no follow-ups needed or already did follow-ups → generate learning plan
    if (isFinalEvaluation) {
      const learningPlan = await generateLearningPlan(evaluation, analysis);
      return res.json({
        success: true,
        phase: "final",
        evaluation,
        learningPlan,
      });
    }

    // Follow-ups needed — return them
    return res.json({
      success: true,
      phase: "followup_needed",
      evaluation,
      followUpQuestions: evaluation.needsFollowUp.map((f, i) => ({
        id: i + 1,
        skill: f.skill,
        question: f.followUpQuestion,
        reason: f.reason,
      })),
    });

  } catch (err) {
    console.error("Evaluate error:", err);
    return res.status(500).json({ error: err.message });
  }
});

async function generateLearningPlan(evaluation, analysis) {
  const gaps = evaluation.skillScores.filter(s => s.score < 7 && s.gap);

  if (gaps.length === 0) {
    return { message: "No significant gaps found. Candidate is well-prepared for this role." };
  }

  const prompt = `
You are a learning advisor creating a personalised learning plan for a ${analysis.jobTitle} candidate.

Candidate's skill gaps identified from their interview:
${JSON.stringify(gaps, null, 2)}

Candidate's strong areas (leverage these for faster learning):
${analysis.candidateProfile.strongAreas.join(", ")}

Overall interview score: ${evaluation.overallScore}/100
Verdict: ${evaluation.interviewVerdict}

Create a realistic, prioritised learning plan. Return ONLY raw JSON:
{
  "learningPlan": [
    {
      "skill": "skill name",
      "currentLevel": "their current level",
      "targetLevel": "realistic target level in the given timeframe",
      "priority": "High | Medium | Low",
      "estimatedWeeks": <number>,
      "whyImportant": "one sentence on why this gap matters for the role",
      "adjacentStrength": "which of their existing skills helps them learn this faster, null if none",
      "resources": [
        {
          "title": "resource name",
          "type": "Course | Documentation | Book | Practice | Project",
          "url": "actual URL if known, null if not sure",
          "estimatedHours": <number>,
          "description": "one sentence on what this covers and why it helps"
        }
      ],
      "practiceProject": "one concrete mini-project they can build to practice this skill"
    }
  ],
  "totalEstimatedWeeks": <number — realistic total with parallel learning>,
  "learningOrder": ["skill1", "skill2", "skill3"],
  "quickWins": ["2-3 things they can learn in under a week that will immediately help"],
  "finalAdvice": "2-3 sentences of honest, encouraging advice for this specific candidate"
}

Rules:
- Order by priority: High gaps in Critical skills first
- estimatedWeeks must be realistic — don't say 1 week for a complex skill
- adjacentStrength: if they know JavaScript well, TypeScript is faster to learn — use this
- resources: include a mix of free and structured options
- practiceProject must be concrete: not "build something with pandas" but "build a script that loads the Titanic dataset, cleans it, and outputs survival rate by age group"
- quickWins: things learnable in 3-5 days that give immediate value
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export default router;