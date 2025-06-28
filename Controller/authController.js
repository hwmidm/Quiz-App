import jwt from "jsonwebtoken";
// To convert callback-based functions to promise-based
import { promisify } from "util";
import crypto from "crypto";

import User from "../Model/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import sendEmail from "../utils/email.js";

// Helper function to sign a JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Helper function to send token in a cookie and JSON response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
  };
  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true; // Send cookie only over HTTPS in production
  }
  res.cookie("jwt", token, cookieOptions);
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// Handles user registration (signup)
export const signUp = catchAsync(async (req, res, next) => {
  // Create a new user with provided details. Password hashing and confirmation validation
  // are handled by pre-save hooks in the User model
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword, // Virtual field handled by pre-save hook
    role: req.body.role,
  });
  // Send token and user data
  createSendToken(newUser, 201, res);
});

// Handles user login
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate if email and password are provided
  if (!email || !password) {
    return next(new AppError("You must provide your email & password", 400));
  }

  // Find user by email and explicitly select password
  const user = await User.findOne({ email: email }).select("+password");

  // Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Your email or password is incorrect", 400));
  }

  const token = signToken(user._id); // Sign a JWT for the user

  res.status(200).json({
    status: "success",
    token,
  });
});

// Protects routes by verifying JWT
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.toLowerCase().startsWith("bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not log in ! Please login and to get access", 401)
    );
  }

  // Verify the token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if the user still exists
  const currentUser = await User.findById(decode.id);

  if (!currentUser) {
    return next(
      new AppError("The user is belonging to this token no longer exist", 401)
    );
  }

  // Check if user changed password after the token was issued
  if (currentUser.changePasswordAfter(decode.iat)) {
    return next(
      new AppError("User recently change password , Please login again", 401)
    );
  }

  // Grant access to the protected route
  req.user = currentUser;
  next();
});

// Restricts access to routes based on user roles
export const restrictTo = (...roles) => {
  return catchAsync(async (req, res, next) => {
    // If the user's role is not included in the allowed roles, deny access
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You dont have permission to access this route", 403)
      );
    }
    next();
  });
};

// Handles forgot password functionality (sends reset token via email)
export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that Email", 401));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/users/resetPassword/${resetToken}`;
  const message = `forgot your Password ? submit a PATCH request with your new password and passwordConfirm to : ${resetUrl} \n 
  if you didn't forget your password ignore this email`;
  try {
    await sendEmail({
      email: user.email,
      subject: `your reset password (valid for 10 min)`,
      message,
    });
    res.status(200).json({
      status: "success",
      message: `Reset Token send to < ${user.email} >`,
    });
  } catch (error) {
    // If email sending fails, clear the reset token from the user document
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email . try again later",
        500
      )
    );
  }
});

// Handles resetting password using a reset token
export const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get User Based On Token
  const hashedtoken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // Find user by hashed token and check if the token is still valid (not expired)
  const user = await User.findOne({
    passwordResetToken: hashedtoken,
    passwordResetTokenExpire: { $gt: Date.now() },
  });

  // 2) if token has not expire and there is a user , set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  // Set the new password and clear reset token fields.
  // Password hashing and confirmation validation are handled by pre-save hooks.
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpire = undefined;
  await user.save(); // This also updates passwordChangeAt via pre-save hook

  // 3) update ChangePasswordAt property for the user (implemnted in user model)

  // 4) log In user and send jwt Token
  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    token,
  });
});

// Allows authenticated users to update their own password
export const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from Collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed currnet Password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }

  // 3) if so , updated password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.save();
  createSendToken(user, 200, res);
});
