const fs = require('fs');
const S3FS = require('s3fs');
const s3fsImpl = new S3FS(process.env.S3_BUCKET, {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION
});
const Promise = require('bluebird');

exports.upload = function upload(file) {
  if (!file) {
    return Promise.reject('file expected');
  }

  if (!/^image\/(jpe?g|png|gif)$/i.test(file.mimetype)) {
    return Promise.reject('image expected');
  }

  var stream = fs.createReadStream(file.path);

  return new Promise((resolve, reject) => {
    return s3fsImpl.writeFile(file.originalname, stream).then( (response) => {
        fs.unlink(file.path, (err) => {
          if (err) { console.log(err); }

          reject(err);

        });
        console.log('repsonse upload', response);
        return resolve(response);
      })
      .catch((err) => { reject(err) });
  });
};

exports.getS3Url = function (filename) {
  return `https://s3-us-west-2.amazonaws.com/${process.env.S3_BUCKET}/${filename}`
};
