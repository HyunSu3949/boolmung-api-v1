const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "이름을 입력하세요"],
    },
    email: {
      type: String,
      required: [true, "이메일을 입력하세요"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "이메일 형식으로 입력하세요"],
    },
    photo: String,
    password: {
      type: String,
      required: [true, "비밀번호를 입력하세요"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "비밀번호 확인을 입력하세요"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "비밀번호가 일치하지 않습니다.",
      },
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
      },
    },
  }
);

//비밀번호 저장 전 암호화
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // 저장 전 비밀번호 확인 제거
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre(/^find/, function (next) {
  //active true인것만 반환
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
