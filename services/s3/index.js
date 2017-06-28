const fs = require('fs');
const S3FS = require('s3fs');
const s3fsImpl = new S3FS(process.env.S3_BUCKET, {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION
});

const Promise = require('bluebird');
const sharp = require('sharp');

exports.uploadSingleFile = function uploadSingleFile(file) {
  if (!file) {
    return Promise.reject('file expected');
  }

  return new Promise(function(resolve, reject){
    s3fsImpl.writeFile(file.originalname, file.buffer).then(function () {
      fs.unlink(file.buffer, function (err) {
        if (err) {
          console.error(err);
        }
      });
      return resolve(getS3Url(file.originalname));
    }, function (err) {
      if(err) return reject(err);
    });
  });

};

exports.upload = function upload(file) {
  if (!file) {
    return Promise.reject('file expected');
  }

  if (!/^image\/(jpe?g|png|gif)$/i.test(file.mimetype)) {
    return Promise.reject('image expected');
  }

  const resizeThumbPromise = resize(file, 80, 80);
  const resizeBigPromise = resize(file, 320, 240);
  const resizeName80 = getResizeName(file.originalname, 80, 80);
  const resizeName320 = getResizeName(file.originalname, 320, 240);
  const resizePath80 = getResizeTempPath(file.originalname, 80, 80);
  const resizePath320 = getResizeTempPath(file.originalname, 320, 240);
  return new Promise((resolve, reject) => {
    Promise.all([resizeThumbPromise, resizeBigPromise])
      .then(() => {
        return Promise.resolve([resizePath80, resizePath320]);
      })
      .then((resizedPaths) => {
        return Promise.resolve([fs.createReadStream(resizedPaths[0]), fs.createReadStream(resizedPaths[1])]);
      })
      .then((streams) => {
        return Promise.all([s3fsImpl.writeFile(resizeName80, streams[0]), s3fsImpl.writeFile(resizeName320, streams[1])]);
      })
      .then(() => {
        return resolve({80: getS3Url(resizeName80), 320: getS3Url(resizeName320)})
      })
      .catch((err) => {
        reject(err)
      });
  });
};

function resize(inputFile, width, height) {
  height = height ? height : width;

  return sharp(inputFile.path)
    .resize(width, height)
    .background({r: 0, g: 0, b: 0, alpha: 0})
    .embed()
    .toFormat(sharp.format.png)
    .toFile(getResizeTempPath(inputFile.originalname, width, height));
}

function getResizeTempPath(name, width, height) {
  return `temp_resize/${width}x${height}_${name}`;
}
function getResizeName(name, width, height) {
  return `${width}x${height}_${name}`;
}
function getS3Url(filename) {
  return `https://s3-us-west-2.amazonaws.com/${process.env.S3_BUCKET}/${filename}`
}
exports.getS3Url = getS3Url;
