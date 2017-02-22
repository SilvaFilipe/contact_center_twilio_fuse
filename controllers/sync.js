'use strict'
const request = require('request-promise');

module.exports.write = function (req, res) {
  console.log('writing to sync');
  var docName = req.query.docName;
  console.log (req.query.data);
  console.log (JSON.parse(req.query.data));

  //var data = JSON.parse(req.query.data);
  var data = {a: "b"};
  data = "1";
  //var data = req.query.data;
  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Documents/' + docName;
  //console.log('url ' + url);
  var formData = { Data: JSON.stringify(data)};
  //var formData = { Data: data};
  //console.log('formData ' + JSON.stringify(data));

  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
      console.log('got sync response: ' + response);
      res.status(200);
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0');
      res.send("<Response/>");
  })
  .catch(err => {
    console.log('error posting to sync: ' + err);
    res.status(200);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.send("<Response/>");
  });

}

module.exports.save = function (docName, data) {

  // const docName = 'WorkspaceStats';
  // const url = `https://${apiKey}:${apiSecret}@preview.twilio.com/Sync/Services/${syncAppSid}/Documents/${docName}`
  // const data = { Data : response }
  // return request({ url: url, method: 'POST', formData: data})

}
