const AWS = require("aws-sdk");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

AWS.config.update({
  region: "ap-northeast-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3();

exports.getPresignedUrlToUpload = catchAsync(async (req, res, next) => {
  const objectKey = req.user.email + "-" + Date.now();

  const params = {
    Bucket: "bm-storage/userImg",
    Key: objectKey,
    Expires: 60 * 5,
    ContentType: "image/png",
  };

  s3.getSignedUrl("putObject", params, (error, url) => {
    if (error) {
      return next(new AppError(error.message, 500));
    } else {
      res.status(200).json({
        status: "success",
        data: {
          url,
          objectKey: `/userImg/${objectKey}`,
        },
      });
    }
  });
});
