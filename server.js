import app from "./app.js";
import { connectDB } from "./config/database.js";
import clodinary from "cloudinary";
import RazorPay from "razorpay";
import nodeCron from "node-cron";
import { Stats } from "./models/Stats.js";

connectDB();

clodinary.v2.config({
  cloud_name: process.env.CLODINARY_CLIENT_NAME,
  api_key: process.env.CLODINARY_CLIENT_API,
  api_secret: process.env.CLODINARY_CLIENT_SECRET,
});

export const instance = new RazorPay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

nodeCron.schedule("0 0 0 1 * *", async () => {
  try {
    await Stats.create({});
  } catch (error) {
    console.log(error);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is listening on ${process.env.port}`);
});
