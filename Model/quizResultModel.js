import mongoose from "mongoose";

// Import ActiveQuiz model for remove activeQuiz when submitted Once
import ActiveQuiz from "./activeQuizModel.js";

const quizResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  // Reference to the active quiz session from which this result was generated
  activeExam: {
    type: mongoose.Schema.ObjectId,
    ref: "ActiveQuiz",
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  // The user's score for the quiz (will be converted to percentage in pre-save hook)
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  // This array storing details of each question answered by the user
  quizAnswers: [
    {
      questionId: {
        type: mongoose.Schema.ObjectId,
        ref: "Question",
      },
      userAnswers: {
        type: String,
        required: true,
      },
      isCorrect: {
        type: Boolean,
        required: true,
      },
      correctAnswerOfQuiz: {
        type: String,
        required: true,
      },
    },
  ],
  attemptedAt: {
    type: Date,
    default: Date.now(),
  },
});

// Pre-save hook to convert the raw score into a percentage
// Assumes each question is worth 10 points (based on controller logic)
quizResultSchema.pre("save", function (next) {
  if (
    this.score !== undefined &&
    this.totalQuestions !== undefined &&
    this.totalQuestions > 0
  ) {
    // Calculate maximum possible points
    const maxPossibleScore = this.totalQuestions * 10;
    // Convert raw score to percentage
    this.score = (this.score / maxPossibleScore) * 100;

    // Handle cases where division might result in NaN
    if (isNaN(this.score)) {
      this.score = 0;
    }
    // Round the final score with two decimal
    this.score = parseFloat(this.score.toFixed(2));
  }
  next();
});

//  Creates a new QuizResult document and cleans up the associated ActiveQuiz
//  This method centralizes the logic for finalizing a quiz session
quizResultSchema.statics.createResultAndCleanupActiveQuiz = async function (
  quizData,
  userActiveQuizId
) {
  // Create the new quiz result document
  const newQuizResult = await this.create(quizData);

  // Delete the active quiz session as it's no longer needed
  await ActiveQuiz.findByIdAndDelete(userActiveQuizId);

  return newQuizResult;
};

const ExamResult = mongoose.model("ExamResult", quizResultSchema);

export default ExamResult;
