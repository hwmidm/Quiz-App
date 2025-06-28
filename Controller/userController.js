import User from "../Model/userModel.js";
import catchAsync from "../utils/catchAsync.js"; // Utility for catching async errors
// Import reusable factory functions for CRUD operations
import {
  getAll,
  createOne,
  deleteOne,
  getOne,
  updateMe,
} from "./factoryFunction.js";
import QuizResult from "../Model/quizResultModel.js";


// --- User-Specific Controller Functions (using Factory Functions) ---
export const createUser = createOne(User);
export const getUsers = getAll(User);
export const getUser = getOne(User);
export const deleteUser = deleteOne(User);
export const updateUser = updateMe(User);

// --- Specific User Controller Logic ---

// Deactivates the currently authenticated user's account (soft delete)
export const deleteMe = catchAsync(async (req, res, next) => {
  // Sets user's 'active' status to false, but doesn't actually delete the document
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const userQuizResult = catchAsync(async (req, res, next) => {
  const userQuizResultHistory = await QuizResult.find({ user: req.user._id });
  res.status(200).json({
    status : "success" ,
    result : userQuizResultHistory.length , 
     data : {
      userQuizResultHistory
     }
  })
});
