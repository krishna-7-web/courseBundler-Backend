import express from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Load environment variables
config({
  path: "./config/config.env",
});

const app = express();

// Using Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Place before routes to populate req.cookies

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // Allow credentials (cookies) to be sent
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Importing & using Routes /
import ErrorMiddleware from "./middlewares/Error.js";
import course from "./routes/courseRoutes.js";
import other from "./routes/otherRoutes.js";
import payment from "./routes/paymentRoutes.js";
import user from "./routes/userRoutes.js";

app.use("/api/v1", course);
app.use("/api/v1", user);
app.use("/api/v1", payment);
app.use("/api/v1", other);

app.get("/", (req, res) => {
  res.send(
    `<h1>Site is working. Click <a href=${process.env.FRONTEND_URL}>to visit frontend</a></h1>`
  );
});

app.use(ErrorMiddleware);

export default app;
