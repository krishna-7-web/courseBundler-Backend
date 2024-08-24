import express from "express";
import {
  createCourse,
  deleteCourse,
  deleteLecture,
  getAllCourses,
} from "../controllers/courseController.js";
import { Course } from "../models/Course.js";
import singleUpload from "../middlewares/multer.js";
import {
  authorizedAdmin,
  authorizedSubscribers,
  isAuthenticated,
} from "../middlewares/auth.js";
import {
  addLecture,
  getCourseLectures,
} from "../controllers/courseController.js";

const router = express.Router();

// Get All Courses without Admin
router.route("/courses").get(isAuthenticated, getAllCourses);

// Create new Course - only Admin
router
  .route("/createcourse")
  .post(isAuthenticated, authorizedAdmin, singleUpload, createCourse);

// Add lecture, Delete, Get Course Details

router
  .route("/course/:id")
  .get(isAuthenticated, authorizedSubscribers, getCourseLectures)
  .post(isAuthenticated, authorizedAdmin, singleUpload, addLecture)
  .delete(isAuthenticated, authorizedAdmin, deleteCourse);

// Delete Lectures
router
  .route("/lecture")
  .delete(isAuthenticated, authorizedAdmin, deleteLecture);

export default router;
