import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import Question from "../Model/questionsModel.js";
import User from "../Model/userModel.js";
import filterObject from "../utils/filterObj.js"; // Utility for filtering object properties

// Factory function to get all documents of a given Model
export const getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    const queryObj = { ...req.query };

    // Exclude pagination and sorting fields from the query
    const excludeFields = ["sort", "page", "limit", "field"];
    excludeFields.forEach((el) => delete queryObj[el]);
    const doc = await Model.find(queryObj);
    res.status(200).json({
      status: "success",
      result: doc.length,
      data: {
        doc,
      },
    });
  });
};

// Factory function to create a new document for a given Model
export const createOne = (Model) => {
  if (Model === Question) {
    return catchAsync(async (req, res, next) => {
      const newQuestion = await Question.create({
        question: req.body.question,
        options: req.body.options,
        correctAnswer: req.body.correctAnswer,
        level: req.body.level,
        category: req.body.category,
      });
      res.status(201).json({
        status: "success",
        data: {
          newQuestion,
        },
      });
    });
  } else if (Model === User) {
    return catchAsync(async (req, res, next) => {
      const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
      });

      res.status(201).json({
        status: "success",
        data: {
          newUser,
        },
      });
    });
  }
};

// Factory function to get a single document by ID for a given Model
export const getOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        doc,
      },
    });
  });
};

// Factory function to delete a single document by ID for a given Model
export const deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  });
};

// Factory function to update a single document by ID for a given Model
export const updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    // Define allowed fields for update (specific to Question model in current usage)
    let allowFieldsForUpdate = [
      "question",
      "options",
      "correctAnswer",
      "level",
      "category",
    ];

    // Filter request body to include only allowed fields
    const { filtered: filteredBody, invalid: invalidFields } = filterObject(
      req.body,
      allowFieldsForUpdate
    );

    // Return error if any invalid fields were provided
    if (invalidFields.length > 0) {
      return next(
        new AppError(
          `Invalid field(s) provided for update : ${invalidFields.join(", ")}`,
          400
        )
      );
    }

    // Find and update the document, run validators for updated fields
    const doc = await Model.findByIdAndUpdate(req.params.id, filteredBody, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators on update
    });
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        doc,
      },
    });
  });
};

// Factory function to allow users to update their own profile
export const updateMe = (Model) => {
  return catchAsync(async (req, res, next) => {
    // Prevent password updates via this route
    if (req.body.password || req.body.confirmPassword)
      return next(new AppError("This route is not for password update", 400));

    // Define allowed fields for user profile update
    let allowFieldsForUpdate = ["name"];

    // Filter request body
    const { filtered: filteredBody, invalid: invalidFields } = filterObject(
      req.body,
      allowFieldsForUpdate
    );

    // Return error if any invalid fields were provided
    if (invalidFields.length > 0) {
      return next(
        new AppError(
          `Invalid field(s) provided for update : ${invalidFields.join(", ")}`,
          400
        )
      );
    }

    // Find and update the authenticated user's document
    const updateUser = await Model.findByIdAndUpdate(
      req.user.id, // User ID from `protect` middleware
      filteredBody,
      {
        runValidators: true,
        new: true,
      }
    );
    res.status(200).json({
      status: "success",
      data: {
        updateUser,
      },
    });
  });
};
