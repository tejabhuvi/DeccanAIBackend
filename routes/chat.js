import express from "express";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const {
    questions,
    answers = [],          // { questionId, question, answer, skill, depth }[]
    currentQuestionIndex,
    newAnswer = null,      // the answer the candidate just submitted
  } = req.body;

  if (!questions || currentQuestionIndex === undefined) {
    return res.status(400).json({ error: "questions and currentQuestionIndex are required" });
  }

  // Save incoming answer if provided
  const updatedAnswers = [...answers];
  if (newAnswer && questions[currentQuestionIndex - 1]) {
    const answeredQuestion = questions[currentQuestionIndex - 1];
    updatedAnswers.push({
      questionId: answeredQuestion.id,
      skill: answeredQuestion.skill,
      category: answeredQuestion.category,
      priority: answeredQuestion.priority,
      depth: answeredQuestion.depth,
      question: answeredQuestion.question,
      answer: newAnswer,
    });
  }

  // Check if all questions are done
  const allDone = currentQuestionIndex >= questions.length;

  if (allDone) {
    return res.json({
      success: true,
      status: "completed",
      message: null,
      currentQuestionIndex,
      answers: updatedAnswers,
      nextQuestion: null,
      progress: {
        answered: updatedAnswers.length,
        total: questions.length,
        percentage: 100,
      },
    });
  }

  // Return next question
  const nextQuestion = questions[currentQuestionIndex];

  return res.json({
    success: true,
    status: "in_progress",
    nextQuestion: {
      id: nextQuestion.id,
      skill: nextQuestion.skill,
      question: nextQuestion.question,
      type: nextQuestion.type,
    },
    currentQuestionIndex: currentQuestionIndex + 1,
    answers: updatedAnswers,
    progress: {
      answered: updatedAnswers.length,
      total: questions.length,
      percentage: Math.round((updatedAnswers.length / questions.length) * 100),
    },
  });
});

// Follow-up chat route — called AFTER evaluation identifies weak spots
router.post("/chat/followup", async (req, res) => {
  const {
    followUpQuestions,
    followUpAnswers = [],
    currentFollowUpIndex,
    newAnswer = null,
  } = req.body;

  if (!followUpQuestions || currentFollowUpIndex === undefined) {
    return res.status(400).json({ error: "followUpQuestions and currentFollowUpIndex are required" });
  }

  const updatedAnswers = [...followUpAnswers];
  if (newAnswer && followUpQuestions[currentFollowUpIndex - 1]) {
    const answeredQuestion = followUpQuestions[currentFollowUpIndex - 1];
    updatedAnswers.push({
      skill: answeredQuestion.skill,
      question: answeredQuestion.question,
      answer: newAnswer,
      isFollowUp: true,
    });
  }

  const allDone = currentFollowUpIndex >= followUpQuestions.length;

  if (allDone) {
    return res.json({
      success: true,
      status: "followup_completed",
      followUpAnswers: updatedAnswers,
      nextQuestion: null,
    });
  }

  const nextQuestion = followUpQuestions[currentFollowUpIndex];

  return res.json({
    success: true,
    status: "followup_in_progress",
    nextQuestion: {
      skill: nextQuestion.skill,
      question: nextQuestion.question,
    },
    currentFollowUpIndex: currentFollowUpIndex + 1,
    followUpAnswers: updatedAnswers,
    progress: {
      answered: updatedAnswers.length,
      total: followUpQuestions.length,
      percentage: Math.round((updatedAnswers.length / followUpQuestions.length) * 100),
    },
  });
});

export default router;