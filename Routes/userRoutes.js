import express from "express";

import * as userController from "../Controller/userController.js";
import * as authController from "../Controller/authController.js";
import * as questionController from "../Controller/questionsController.js";

const router = express.Router();

// --- Authentication Routes ---
router.route("/signUP").post(authController.signUp); // Route for user registration
router.route("/login").post(authController.login); // Route for user login
router.route("/forgotPassword").post(authController.forgotPassword); // Route for  password reset
router.route("/resetPassword/:token").patch(authController.resetPassword); // Route for resetting password using a token

// --- Authenticated User-Specific Routes ---

// Route for a logged-in user to update their own profile
router
  .route("/updateMe")
  .patch(authController.protect, userController.updateUser);

// Route for a logged-in user to deactivate their account (soft delete)
router
  .route("/deleteMe")
  .patch(authController.protect, userController.deleteMe);

// Route for a logged-in user to change their password
router
  .route("/updatePassword")
  .patch(authController.protect, authController.updatePassword);

// Route for getting the current user's quiz result history
router
  .route("/QuizResultHistory")
  .get(authController.protect, userController.userQuizResult);

router.route("/").get(userController.getUsers).post(userController.createUser); // GET: Get all users; POST: Create a user

// Routes for specific user by ID
router
  .route("/:id")
  .get(userController.getUser)
  .delete(
    authController.protect,
    authController.restrictTo("Admin"),
    userController.deleteUser
  );

export default router;
