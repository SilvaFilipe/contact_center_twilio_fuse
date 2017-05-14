const fs = require('fs');
const S3FS = require('s3fs');
const s3fsImpl = new S3FS('kismet-dev', { //hardcoded for now
  accessKeyId: "AKIAI4EUIUI65ONERDCA",
  secretAccessKey: "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",
  region: 'us-west-2'
});
const Promise = require('bluebird');

exports.upload = function (file) {
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
        return resolve(response);
      })
      .catch((err) => { reject(err) });
  });
};

exports.getS3Url = function (filename) {
  return `https://s3-us-west-2.amazonaws.com/kismet-dev/${filename}`
};
