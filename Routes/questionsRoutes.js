import express from "express";

import * as questionController from "../Controller/questionsController.js";
import * as authController from "../Controller/authController.js";

const router = express.Router();

// Base route for /api/v1/questions
router
  .route("/")
  .get(questionController.getQuestions)
  .post(
    authController.protect,
    authController.restrictTo("Admin"),
    questionController.createQuestion
  );

// Route for getting a random question
router
  .route("/random")
  .get(authController.protect, questionController.getRandomQuestion);

// Route for submitting a single question's answer
router
  .route("/submitAnswer")
  .post(authController.protect, questionController.submitAnswer);

// Route for creating a new quiz session (starts an active quiz)
router
  .route("/createQuiz")
  .get(authController.protect, questionController.createQuiz);

// Route for submitting a quiz
router
  .route("/submitQuiz")
  .post(authController.protect, questionController.submitQuiz);


// Routes for specific question by ID: /api/v1/questions/:id
router
  .route("/:id")
  .get(questionController.getOneQuestion)
  .patch(
    authController.protect,
    authController.restrictTo("Admin"),
    questionController.updateQuestion
  )
  .delete(
    authController.protect,
    authController.restrictTo("Admin"),
    questionController.deleteQuestion
  );

export default router;
