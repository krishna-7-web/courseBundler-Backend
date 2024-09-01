import { catchAsyncError } from "../middlewares/catchAsyncErrors.js";
import { Course } from "../models/Course.js";
import { Stats } from "../models/Stats.js";
import ErrorHandler from "../utils/errorHandler.js";
import { uplaodFilesToCloudinary } from "../utils/features.js";
import cloudinary from "cloudinary";

const getAllCourses = catchAsyncError(async (req, res, next) => {
  const keyword = req.query.keyword || "";
  const category = req.query.category || "";

  const courses = await Course.find({
    title: {
      $regex: keyword,
      $options: "i",
    },
    category: {
      $regex: category,
      $options: "i",
    },
  }).select("-lectures");

  res.status(200).json({
    success: true,
    courses,
  });
});

const createCourse = catchAsyncError(async (req, res, next) => {
  const { title, description, category, createdBy } = req.body;

  const course = await Course.findOne({ title, description });

  if (course) return next(new ErrorHandler("Course Already Exist", 401));

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload File", 401));

  if (!title || !description || !category || !createdBy)
    return next(new ErrorHandler("Please add all Fields", 400));

  const result = await uplaodFilesToCloudinary([file]);

  await Course.create({
    title,
    description,
    category,
    createdBy,
    poster: {
      public_id: result[0].public_id,
      url: result[0].url,
    },
  });

  res.status(201).json({
    success: true,
    message: "Course created Successfully. You can add lectures now.",
  });
});

const getCourseLectures = catchAsyncError(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  course.views += 1;

  await course.save();

  res.status(200).json({
    success: true,
    lectures: course.lectures,
  });
});

const addLecture = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title || !description)
    return next(new ErrorHandler("Please enter all fields", 400));

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload File", 401));

  const course = await Course.findById(id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  // Upload file here
  // Max video size 100 MB
  const result = await uplaodFilesToCloudinary([file]);

  course.lectures.push({
    title,
    description,
    video: {
      public_id: result[0].public_id,
      url: result[0].url,
    },
  });

  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(200).json({
    success: true,
    message: "Lecture added in Course",
  });
});

const deleteCourse = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const course = await Course.findById(id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  // Delete the course poster from Cloudinary
  const posterResponse = await cloudinary.v2.uploader.destroy(
    course.poster.public_id
  );
  console.log("Poster Deletion Response:", course.poster.public_id);

  // Loop through the lectures and delete each video's Cloudinary resource
  for (const lecture of course.lectures) {
    await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
      resource_type: "video",
    });
    console.log("Lecture Video Deletion Response:", lecture.video.public_id);
  }

  // Delete the course from the database
  await Course.deleteOne({ _id: id });

  res.status(200).json({
    success: true,
    message: "Course deleted successfully.",
  });
});
const deleteLecture = catchAsyncError(async (req, res, next) => {
  const { courseId, lectureId } = req.query;

  const course = await Course.findById(courseId);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  const lecture = course.lectures.find((item) => {
    if (item._id.toString() === lectureId.toString()) return item;
  });

  await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
    resource_type: "video",
  });

  course.lectures = course.lectures.filter((item) => {
    if (item._id.toString() !== lectureId.toString()) return item;
  });

  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(200).json({
    success: true,
    message: "Lecture deleted Successfully.",
  });
});

Course.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);

  const course = await Course.find({});

  let totalViews = 0;

  for (let i = 0; i < course.length; i++) {
    totalViews += course[i].views;
  }

  stats[0].views = totalViews;
  stats[0].createdAt = new Date(Date.now());

  await stats[0].save();
});

export {
  getAllCourses,
  createCourse,
  getCourseLectures,
  addLecture,
  deleteCourse,
  deleteLecture,
};
