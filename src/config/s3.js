const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

const s3ClientOptions = {};
if (process.env.AWS_REGION) {
  s3ClientOptions.region = process.env.AWS_REGION;
} else if (process.env.AWS_DEFAULT_REGION) {
  s3ClientOptions.region = process.env.AWS_DEFAULT_REGION;
} else {
  s3ClientOptions.region = 'ap-southeast-1';
}

let s3 = null;
let upload = null;

if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  try {
    s3 = new S3Client(s3ClientOptions);
    upload = multer({
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
  } catch (err) {
    console.error('S3 initialization failed:', err.message);
    upload = multer({ storage: multer.memoryStorage() });
  }
} else {
  console.log('S3 not configured, using memory storage');
  upload = multer({ storage: multer.memoryStorage() });
}

module.exports = { upload, s3 };

