import Question from "../Model/questionsModel.js";
import ActiveQuiz from "../Model/activeQuizModel.js";
import QuizResult from "../Model/quizResultModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import {
  getAll,
  createOne,
  deleteOne,
  getOne,
  updateOne,
} from "./factoryFunction.js";
import User from "../Model/userModel.js";

// ---  CRUD Operations for Questions ---
// These operations are handled by  factory functions for reusability

export const getQuestions = getAll(Question);
export const getOneQuestion = getOne(Question);
export const createQuestion = createOne(Question);
export const updateQuestion = updateOne(Question);
export const deleteQuestion = deleteOne(Question);

// Get a single random question
export const getRandomQuestion = catchAsync(async (req, res, next) => {
  const [randomQuestion] = await Question.aggregate([{ $sample: { size: 1 } }]);
  if (!randomQuestion) {
    return next(new AppError("No question available", 404));
  }

  // Only send necessary question details to the client (exclude correct answer)
  res.status(200).json({
    status: "success",
    data: {
      randomQuestion: {
        _id: randomQuestion._id,
        question: randomQuestion.question,
        options: randomQuestion.options,
      },
    },
  });
});

// Submit an answer for a single question
export const submitAnswer = catchAsync(async (req, res, next) => {
  const { questionId, answer } = req.body;
  if (!questionId || !answer) {
    return next(new AppError("Question ID and answer are required!", 400));
  }
  const question = await Question.findById(questionId);
  if (!question) {
    return next(new AppError("No question found with that ID", 404));
  }

  // Normalize answers for case-insensitive comparison
  const normalizedAnswer = answer.toLowerCase().trim();
  const correctAnswer = question.correctAnswer.toLowerCase();
  const isCorrect = correctAnswer === normalizedAnswer;

  // Send back the original correct answer
  res.status(200).json({
    status: "success",
    data: {
      isCorrect,
      correctAnswer: question.correctAnswer,
    },
  });
});

// create a new quiz for the authenticated user
export const createQuiz = catchAsync(async (req, res, next) => {
  let quizDetails;
  // ActiveQuiz model handles selecting questions, validating count,
  // and creating/updating the active quiz session.
  try {
    quizDetails = await ActiveQuiz.startQuiz(req.user._id, 3);
  } catch (error) {
    return next(new AppError(error.message, 404));
  }

  res.status(200).json({
    status: "success",
    result: quizDetails.questionsForClient.length,
    data: {
      questions: quizDetails.questionsForClient,
    },
  });
});

// Submit an active quiz for scoring and record the results
export const submitQuiz = catchAsync(async (req, res, next) => {
  const userActiveQuiz = await ActiveQuiz.findOne({ user: req.user._id });
  if (!userActiveQuiz) {
    return next(
      new AppError(
        "No active quiz found. Please start a new quiz, or your active quiz might have expired.",
        400
      )
    );
  }
  try {
    // Check quiz expiration and handle cleanup within the ActiveQuiz model
    await userActiveQuiz.checkExpiration();
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // Fetch full question documents needed for detailed answer processing
  const activeQuizIds = userActiveQuiz.questions.map((q) => q._id.toString());
  const originalQuestionsFromDB = await Question.find({
    _id: { $in: activeQuizIds },
  });

  let resultDetails;
  try {
    // Process user's answers and score the quiz within the ActiveQuiz model
    resultDetails = await userActiveQuiz.processSubmission(
      req.body.answers,
      originalQuestionsFromDB
    );
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // Fetch user details for the quiz result record
  const userDoc = await User.findById(req.user._id);
  if (!userDoc) {
    return next(
      new AppError("User details not found for result creation.", 404)
    );
  }

  // Prepare data for the quiz result
  const quizResultData = {
    user: req.user._id,
    userName: userDoc.name,
    userEmail: userDoc.email,
    activeExam: userActiveQuiz._id,
    score: resultDetails.thisExamScore,
    quizAnswers: resultDetails.userAnswersToStore,
    totalQuestions: userActiveQuiz.questions.length,
  };

  // Create the quiz result and clean up the active quiz within the QuizResult model
  const createResultForQuiz = await QuizResult.createResultAndCleanupActiveQuiz(
    quizResultData,
    userActiveQuiz._id
  );

  res.status(200).json({
    status: "success",
    score: createResultForQuiz.score,
    totalQuestions: createResultForQuiz.totalQuestions,
    correctAnswers: resultDetails.correctAnswersCount,
    falseAnswers: resultDetails.falseAnswersCount,
    message: "Quiz submitted successfully!",
  });
});


