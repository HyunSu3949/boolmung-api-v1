// const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 //1d
    ),
    httpOnly: true,
    sameSite: "lax",
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // res에 password 제거
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // email, password 있는지 확인
  if (!email || !password) {
    return next(new AppError("이메일과 비밀번호를 입력하세요", 400));
  }
  // 이메일, 비밀번호 맞는지 확인
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("이메일 또는 비밀번호가 일치하지 않습니다", 401));
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 토큰 확인
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("토큰이 없습니다. 로그인이 필요합니다.", 401));
  }

  // 토큰 검증
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 유저 확인
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("토큰을 소유하고 있는 유저가 존재하지 않습니다.", 401)
    );
  }

  // req에 유저 정보 추가
  req.user = currentUser;
  next();
});

exports.isLogedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.restrictTo = (role) => (req, res, next) => {
  // roles ['admin', 'user']
  if (role !== req.user.role) {
    return next(
      new AppError("권한이 없습니다. 관리자 계정으로 로그인 하세요", 403)
    );
  }

  next();
};
