import mongoose from "mongoose";

const questionsSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "question must have a value"],
      trim: true,
      // Ensures each question is unique
      unique: true,
    },
    options: {
      type: [String],
      required: [true, "A question must have options"],
      // Custom validator for exactly 4 options
      validate: {
        validator: (arr) => arr.length === 4,
        message: "Options must have exactly 4 items",
      },
    },
    correctAnswer: {
      type: String,
      required: [true, "A correct answer is required !"],
      // Custom validator to ensure correct answer is one of the options
      validate: {
        validator: function (value) {
          return this.options.includes(value);
        },
        message: "correct answer must be one of the options",
      },
    },
    level: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
      // Convert to lowercase
      set: function (val) {
        return val.toLowerCase();
      },
      trim: true,
    },
    category: {
      type: String,
      required: [true, "every question must belong to a category"],
      enum: ["math", "science", "computer", "sport", "history", "general"],
      trim: true,
      // Convert to lowercase
      set: function (val) {
        return val.toLowerCase();
      },
    },
  },
  {
    // Automatically add createdAt and updatedAt
    timestamps: true,
  }
);

const Questions = mongoose.model("Questions", questionsSchema);
export default Questions;
