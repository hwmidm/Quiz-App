import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Custom error class
import AppError from "../utils/AppError.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required for a user"],
      unique: true,
      minLength: [3, "A name must be at least 3 characters"],
      maxLength: [20, "Name must not be more than 20 characters"],
    },
    email: {
      type: String,
      trim: true,
      required: [true, "Email is required"],
      // Uses validator library for email format check
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email address",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please insert a password"],
      trim: true,
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["Admin", "User"],
      default: "User",
      // Capitalizes first letter
      set: function (val) {
        return val[0].toUpperCase() + val.slice(1).toLowerCase();
      },
      trim: true,
      validate: {
        validator: function (val) {
          if (val === undefined || val === null) return true;
          const allowedRoles = this.schema.path("role").enumValues;
          return allowedRoles.includes(val);
        },
        message: "Invalid role provided. Role must be either Admin or User.",
      },
    },
    passwordChangeAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    active: {
      type: Boolean,
      default: true,
      // Prevents active status from being sent in queries by default
      select: false,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Virtual field for password confirmation (not stored in DB, used for validation)
userSchema.virtual("confirmPassword").set(function (val) {
  this._confirmPassword = val;
});

// Pre-save hook to hash password and validate password confirmation
userSchema.pre("save", async function (next) {
  // Only run if password was actually modified
  if (!this.isModified("password")) return next();

  // Check if password and confirmPassword match
  if (this.password !== this._confirmPassword) {
    return next(new AppError("Your passwords do not match", 400));
  }
  // Hash the password with a cost factor of 12
  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;
  // Clear the virtual field
  this._confirmPassword = undefined;
  next();
});

// Custom transform for toJSON (when document is converted to JSON)
userSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove sensitive/internal fields from JSON output
    delete ret.password;
    delete ret._confirmPassword;
    delete ret._id;
    delete ret.__v;

    // Reorder and select fields for a cleaner JSON response
    const orederdRet = {
      id: ret.id,
      name: ret.name,
      email: ret.email,
      role: ret.role,
      createdAt: ret.createdAt,
    };
    return orederdRet;
  },
});

// Custom transform for toObject (when document is converted to a plain JS object)
userSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove sensitive/internal fields from Object output
    delete ret.password;
    delete ret._confirmPassword;
    delete ret._id;
    delete ret.__v;

    // Reorder and select fields
    const orederdRet = {
      id: ret.id,
      name: ret.name,
      email: ret.email,
      createdAt: ret.createdAt,
    };
    return orederdRet;
  },
});

// Pre-save hook to update passwordChangeAt timestamp when password is modified
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangeAt = Date.now() - 1000;
  next();
});

// Compares a candidate password with the stored hashed password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Checks if the password was changed after a given JWT timestamp
userSchema.methods.changePasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangeAt) {
    // Convert passwordChangeAt to timestamp in seconds
    const changeTimeStamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changeTimeStamp;
  }
  return false;
};

// Generates and stores a password reset token for the user
userSchema.methods.createPasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");
  // Hash the token before saving to DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  // Token valid for 10 minutes
  this.passwordResetTokenExpire = Date.now() + 10 * 60 * 1000;
  // Return unhashed token to send to user
  return resetToken;
};

// Pre-find hook to filter out inactive users by default
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
