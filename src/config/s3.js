const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3ClientOptions = {};
if (process.env.AWS_REGION) {
  s3ClientOptions.region = process.env.AWS_REGION;
} else if (process.env.AWS_DEFAULT_REGION) {
  s3ClientOptions.region = process.env.AWS_DEFAULT_REGION;
} else {
  s3ClientOptions.region = 'us-east-1';
}

const s3 = new S3Client(s3ClientOptions);

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
    }
  })
});

module.exports = { upload, s3 };
