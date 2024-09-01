import { catchAsyncError } from "../middlewares/catchAsyncErrors.js";
import { Stats } from "../models/Stats.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendEmail } from "../utils/sendEmail.js";

const contact = catchAsyncError(async (req, res, next) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message)
    return next(new ErrorHandler("Please enter all fields", 400));

  const to = process.env.MY_MAIL;
  const subject = "Contact from CourseBundler";
  const text = `I am ${name} and my Email ${email}. \n${message}`;

  await sendEmail(to, subject, text);

  res.status(200).json({
    success: true,
    message: "Your message has been sent.",
  });
});

const courseRequest = catchAsyncError(async (req, res, next) => {
  const { name, email, course } = req.body;

  if (!name || !email || !course)
    return next(new ErrorHandler("Please enter all fields", 400));

  const to = process.env.MY_MAIL;
  const subject = "Request for a course on CourseBundler";
  const text = `I am ${name} and my Email ${email}. \n${course}`;

  await sendEmail(to, subject, text);

  res.status(200).json({
    success: true,
    message: "Your Request has been sent.",
  });
});

const getDashboardStats = catchAsyncError(async (req, res, next) => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(12);

  const statsData = [];

  for (let i = 0; i < stats.length; i++) {
    statsData.unshift(stats[i]);
  }

  const requiredSize = 12 - stats.length;

  for (let i = 0; i < requiredSize; i++) {
    statsData.unshift({
      users: 0,
      subscriptions: 0,
      views: 0,
    });
  }

  const usersCount = statsData[11].users;
  const subscriptiosCount = statsData[11].subscriptions;
  const viewsCount = statsData[11].views;

  let usersPercentage = 0,
    viewsPercentage = 0,
    subscriptionsPercentage = 0;

  let usersProfit = true,
    viewsProfit = true,
    subscriptionsProfit = true;

  if (statsData[10].users === 0) usersPercentage = usersCount * 100;
  if (statsData[10].views === 0) viewsPercentage = viewsCount * 100;
  if (statsData[10].subscriptions === 0)
    subscriptionsPercentage = subscriptiosCount * 100;
  else {
    const diffrence = {
      users: statsData[11].users - statsData[10].users,
      views: statsData[11].views - statsData[10].views,
      subscriptions: statsData[11].subscriptions - statsData[10].subscriptions,
    };

    usersPercentage = (diffrence.users / statsData[10].users) * 100;
    viewsPercentage = (diffrence.views / statsData[10].views) * 100;
    subscriptionsPercentage =
      (diffrence.subscriptions / statsData[10].subscriptions) * 100;

    if (usersPercentage < 0) usersProfit = false;
    if (viewsPercentage < 0) viewsProfit = false;
    if (subscriptionsPercentage < 0) subscriptionsProfit = false;
  }

  res.status(200).json({
    success: true,
    stats: statsData,
    usersCount,
    subscriptiosCount,
    viewsCount,
    usersPercentage,
    viewsPercentage,
    subscriptionsPercentage,
    usersProfit,
    viewsProfit,
    subscriptionsProfit,
  });
});

export { contact, courseRequest, getDashboardStats };
