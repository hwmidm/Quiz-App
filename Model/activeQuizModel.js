import mongoose from "mongoose";
// Import Question model to fetch random questions
import Question from "../Model/questionsModel.js";

const activeQuizSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
    // Ensures only one active quiz per user
    unique: true,
  },
  questions: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Question",
      required: true,
    },
  ],
  // Timestamp for quiz creation, used for expiration
  createdAt: {
    type: Date,
    default: Date.now,
    // Document will expire and be deleted after 6000 seconds (100 minutes)
    expires: 6000,
  },
});

// Starts a new quiz session for a user or updates an existing one
// It selects random questions and manages the ActiveQuiz document
activeQuizSchema.statics.startQuiz = async function (
  userId,
  numberOfQuestions = 3
) {
  // Aggregate to get a specified number of random questions
  const randomQuestions = await Question.aggregate([
    { $sample: { size: numberOfQuestions } },
  ]);
  // Validate if enough questions were found
  if (randomQuestions.length < numberOfQuestions) {
    throw new Error(
      `Not enough questions available. Please add at least ${numberOfQuestions} questions.`
    );
  }
  if (randomQuestions.length === 0) {
    throw new Error("No questions available to start a quiz.");
  }

  // Find if an active quiz already exists for the user
  let activeQuiz = await this.findOne({ user: userId });
  const questionIds = randomQuestions.map((q) => q._id);

  // If an active quiz exists, update it with new questions and reset its creation time
  // Otherwise, create a new active quiz.
  if (activeQuiz) {
    activeQuiz.questions = questionIds;
    activeQuiz.createdAt = Date.now();
    await activeQuiz.save();
  } else {
    activeQuiz = await this.create({
      user: userId,
      questions: questionIds,
    });
  }

  // Return formatted question data suitable for the client
  return {
    activeQuizId: activeQuiz._id,
    questionsForClient: randomQuestions.map((q) => ({
      _id: q._id,
      category: q.category,
      question: q.question,
      options: q.options,
    })),
  };
};

// Checks if the current active quiz has expired. If so, it deletes the quiz and throws an error.
activeQuizSchema.methods.checkExpiration = async function () {
  const quizStartTime = this.createdAt.getTime();
  const expiresInSeconds = 6000;
  const quizEndTime = quizStartTime + expiresInSeconds * 1000;

  // Compare current time with quiz end time.
  if (Date.now() > quizEndTime) {
    // If expired, delete the active quiz document from the database.
    await this.deleteOne();
    throw new Error("Your quiz time has expired.");
  }
};

// Processes a user's submitted answers for the active quiz
// It validates answers, calculates scores, and prepares detailed results
activeQuizSchema.methods.processSubmission = async function (
  examAnswers,
  originalQuestionsFromDB
) {
  let thisExamScore = 0;
  let correctAnswersCount = 0;
  let falseAnswersCount = 0;
  let userAnswersToStore = [];

  // Convert question IDs to strings for robust comparison
  const activeQuizIds = this.questions.map((q) => q._id.toString());
  const examQuestionsIds = examAnswers.map((q) => q.id);

  // Validate that submitted answers match the questions in the active quiz
  if (
    !(
      examQuestionsIds.length === activeQuizIds.length &&
      examQuestionsIds.every((item) => activeQuizIds.includes(item))
    )
  ) {
    throw new Error(
      "One or more submitted questions are not part of your active quiz."
    );
  }

  // Checking submitted answers to score the quiz
  for (const item of examAnswers) {
    const originalQuestion = originalQuestionsFromDB.find(
      (q) => q._id.toString() === item.id
    );

    // Ensure submitted question ID matches a valid question from DB
    if (!originalQuestion) {
      throw new Error(
        "A submitted question ID could not be matched with an original question in the database."
      );
    }

    // Determine if the answer is correct and update scores
    // const isCorrect = originalQuestion.correctAnswer === item.answer;

    // Normalize answers for case-insensitive comparison
    const normalizedAnswer = item.answer.toLowerCase().trim();
    const correctAnswer = originalQuestion.correctAnswer.toLowerCase();
    const isCorrect = correctAnswer === normalizedAnswer;
    if (isCorrect) {
      // Assuming each correct answer is 10 points
      thisExamScore += 10;
      correctAnswersCount++;
    } else {
      falseAnswersCount++;
    }

    // Store detailed answer information for the quiz result.
    userAnswersToStore.push({
      questionId: item.id,
      userAnswers: item.answer,
      isCorrect: isCorrect,
      correctAnswerOfQuiz: originalQuestion.correctAnswer,
    });
  }
  return {
    thisExamScore,
    correctAnswersCount,
    falseAnswersCount,
    userAnswersToStore,
  };
};

const ActiveQuiz = mongoose.model("ActiveQuiz", activeQuizSchema);
export default ActiveQuiz;
