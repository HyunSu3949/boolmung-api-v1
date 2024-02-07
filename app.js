const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const roomRouter = require("./routes/roomRoutes");

const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5500", // 로컬 개발 서버
      "https://boolmung-client-v1.vercel.app", // 프로덕션 서버
      "*",
    ],
    credentials: true,
  })
);

app.options("*", cors());

app.use(express.static(`${__dirname}/public`));

app.get("/", (req, res) => {
  res.status(200).send("Hello from the server!");
});

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/rooms", roomRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
