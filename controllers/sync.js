'use strict'
const request = require('request-promise');
const errors = require('request-promise/errors');

module.exports.saveList = function (listName, data) {
  console.log('writing to sync list ' + listName);
  var formData = { Data: JSON.stringify(data)};
  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Lists/' + listName + '/Items/';
  console.log(url);
  // update list
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
      console.log('got sync response a: ' + response);
      console.log('got sync response: ' + JSON.parse(response).list_sid + " " + JSON.parse(response).revision);
    })
    .catch(err => {
      // Assuming 404 (expected if listdoesn't exist)
      // TODO check status code and use seperate err handlers for 404 and other cases
      console.log('error updating sync list: ' + err);
      url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Lists';
      console.log(url);
      //create new doc
      formData = { UniqueName: listName, Data: JSON.stringify(data)};
      request({ url: url, method: 'POST', formData: formData })
        .then(response => {
          console.log('got sync response b: ' + response);
          console.log('got sync response: ' + JSON.parse(response).list_sid + " " + JSON.parse(response).revision);
        })
        .catch(err => {
          console.log('error creating sync list: ' + err);
        });
    });
};


module.exports.saveMap = function (mapName, key, data) {
  console.log('writing to sync map ' + mapName + ' key: ' + key);// + ' data: ' + data);

  var formData = { Data: JSON.stringify(data)};
  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Maps/' + mapName + '/Items/' + key;
  // update map
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
    console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
})
  .catch(err => {
    // Assuming 404 (expected if doc doesn't exist)
    // TODO check status code and use seperate err handlers for 404 and other cases
    console.log('error posting to sync: ' + err);
    url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Maps/' + mapName + '/Items';
    // create map
  formData = { Key: key, Data: JSON.stringify(data)};
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
    console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
})
  .catch(err => {
    console.log('error posting to sync: ' + err);
});

});

}


module.exports.saveDoc = function (docName, data) {
  console.log('writing to sync doc ' + docName);
  var formData = { Data: JSON.stringify(data)};
  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Documents/' + docName;
  // update doc
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
    console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
})
  .catch(err => {
    // Assuming 404 (expected if doc doesn't exist)
    // TODO check status code and use seperate err handlers for 404 and other cases
      console.log('error posting to sync: ' + err);
      url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Documents';
    //create new doc
    formData = { UniqueName: docName, Data: JSON.stringify(data)};
    request({ url: url, method: 'POST', formData: formData })
      .then(response => {
      console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
      })
    .catch(err => {
      console.log('error posting to sync: ' + err);
    });
  });
};


module.exports.createMap = function (mapName, cb) {

  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Maps';
  var formData = { UniqueName: mapName};
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
    console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
  cb(null, response);
})
  .catch(err => {
  if (err.response.body.indexOf('54301')>-1){
    cb(null, null);
  } else {
    console.log('error posting to sync: ' + err);
    cb(err, null);
  }
});
};

module.exports.createDoc = function (docName, data, cb) {

    var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Documents';
    //console.log(url);
    var formData = { UniqueName: docName, Data: JSON.stringify(data)};
    request({ url: url, method: 'POST', formData: formData })
      .then(response => {
        console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
        cb(response);
      })
      .catch(err => {
        console.log('error posting to sync: ' + err);
        cb('err');
      });
};

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
    console.log('got sync response: ' + JSON.parse(response).unique_name + " " + JSON.parse(response).revision);
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

module.exports.token = function (req, res ){
  var identity = req.query.identity;
  var device = req.query.device;
  var url = "https://sync-t.herokuapp.com/token?accountSid=" + process.env.TWILIO_ACCOUNT_SID  + "&apiKey=" + process.env.TWILIO_API_KEY + "&apiSecret=" + process.env.TWILIO_API_SECRET + "&appName=personable&identity=" + identity + "&device=" + device + "&serviceSid=" + process.env.SYNC_SERVICE_SID;
  console.log ('token url: ' + url);
  request({ url: url, method: 'GET' })
    .then(response => {
    console.log('got sync token: ' + JSON.parse(response));
    res.status(200);
    res.setHeader('Content-Type', 'text/json')
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.send(response);
})
  .catch(err => {
    console.log('error getting token: ' + err);
  res.status(500);
  res.setHeader('Cache-Control', 'public, max-age=0');
  res.send("Error");
});

}
