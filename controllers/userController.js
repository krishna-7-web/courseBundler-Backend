import { catchAsyncError } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { uplaodFilesToCloudinary } from "../utils/features.js";
import cloudinary from "cloudinary";
import { Stats } from "../models/Stats.js";

const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;
  const file = req.file;

  if (!name || !email || !password || !file)
    return next(new ErrorHandler("Please enter all Fields", 400));

  let user = await User.findOne({ email });

  if (user) return next(new ErrorHandler("User Already Exist", 409));

  //   Upload file on cloudinary
  const result = await uplaodFilesToCloudinary([file]);

  user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: result[0].public_id,
      url: result[0].url,
    },
  });

  sendToken(res, user, "Registered Successfully", 201);
});

const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorHandler("Please enter all Fields", 400));

  const user = await User.findOne({ email }).select("+password");

  if (!user) return next(new ErrorHandler("Incorrect email or password", 401));

  const isMatch = await user.comparePassword(password);

  if (!isMatch)
    return next(new ErrorHandler("Incorrect email or password", 401));

  sendToken(res, user, `Welcome back ${user.name}`, 201);
});

const logout = catchAsyncError((req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});

const getMyProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

const changePassword = catchAsyncError(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return next(new ErrorHandler("Please enter all Fields", 400));

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) return next(new ErrorHandler("Incorrect Old Password", 400));

  user.password = newPassword;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully",
  });
});

const updateProfile = catchAsyncError(async (req, res, next) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;

  if (email) user.email = email;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile Updated Successfully",
  });
});

const updateProfilePicture = catchAsyncError(async (req, res, next) => {
  const file = req.file;

  const user = await User.findById(req.user._id);
  // Cloudinary Todo

  await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  const result = await uplaodFilesToCloudinary([file]);

  user.avatar.public_id = result[0].public_id;
  user.avatar.url = result[0].url;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile Picture Uploded Successfully",
  });
});

const forgetPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new ErrorHandler("please enter your email", 400));

  const user = await User.findOne({ email });

  if (!user) return next(new ErrorHandler("User not found", 400));

  const resetToken = await user.getResetToken();

  // Send Token Via Email

  const url = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

  const message = `Clickon the link to Reset your Password. ${url}. If you have not request then please ignore.`;

  sendEmail(user.email, "CourseBundler Reset Password", message);

  await user.save();

  res.status(200).json({
    success: true,
    message: `Reset Token has been sent to ${user.email}`,
  });
});

const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: {
      $gt: Date.now(),
    },
  });

  if (!user)
    return next(new ErrorHandler("Token is invalid or has been expired", 401));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully",
  });
});

const addToPlaylist = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const course = await Course.findById(req.query.id);

  if (!course) return next(new ErrorHandler("Invalid Course id", 404));

  const itemExist = user.playlist.find((item) => {
    if (item.course.toString() === course._id.toString()) return true;
  });

  if (itemExist) return next(new ErrorHandler("Item Already Exist", 408));

  user.playlist.push({
    course: course._id,
    poster: course.poster.url,
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: "Added to playlist",
  });
});

const removeFromPlaylist = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const course = await Course.findById(req.query.id);

  if (!course) return next(new ErrorHandler("Invalid Course id", 404));

  const newPlaylist = user.playlist.filter((item) => {
    if (item.course.toString() !== course._id.toString()) return item;
  });

  user.playlist = newPlaylist;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Remove From playlist",
  });
});

// Admin Controllers

const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find({});

  res.status(200).json({
    success: true,
    users,
  });
});

const updateUserRole = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role === "user") user.role = "admin";
  else user.role = "user";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Role Updated",
  });
});

const deleteUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  // cancel Subscription

  await user.deleteOne({ _id: user._id });

  res.status(200).json({
    success: true,
    message: "User Delete Successfully",
  });
});

const deleteMyProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  // cancel Subscription

  await user.deleteOne({ _id: user._id });

  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "User Delete Successfully",
    });
});

User.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);

  const subscriptions = await User.find({ "subscription.status": "active" });

  stats[0].users = await User.countDocuments();
  stats[0].subscriptions = subscriptions.length;
  stats[0].createdAt = new Date(Date.now());

  await stats[0].save();
});

export {
  register,
  login,
  logout,
  getMyProfile,
  changePassword,
  updateProfile,
  updateProfilePicture,
  forgetPassword,
  resetPassword,
  addToPlaylist,
  removeFromPlaylist,
  getAllUsers,
  updateUserRole,
  deleteUser,
  deleteMyProfile,
};
