'use strict'
const Did = require('../models/did.model');
const twilio = require('twilio')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)


module.exports.didSearch = function (req, res) {
  var areaCode = req.query.areacode;
  var tollFree = req.query.tollfree;

  if (tollFree == "1" || tollFree =="true"){
    client.availablePhoneNumbers("US").tollFree.list({
      voiceEnabled: true,
      smsEnabled: true
    }, function(err, data) {
      if (err) {
        console.log(err);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.statusCode = 500;
        res.send(err)
      } else {
        console.log(data);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send(data.available_phone_numbers)
      }
    });
  } else {
    client.availablePhoneNumbers("US").local.list({
      areaCode: areaCode,
      voiceEnabled: true,
      smsEnabled: true
    }, function(err, data) {
      if (err) {
        console.log(err);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.statusCode = 500;
        res.send(err)
      } else {
        console.log(data);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send(data.available_phone_numbers)
      }
    });
  }

}

module.exports.didPurchase = function (req, res) {
  var phoneNumber = req.body.phoneNumber;
  console.log(phoneNumber);
  client.incomingPhoneNumbers.create({
    phoneNumber:phoneNumber,
    voiceUrl:'https://demo.twilio.com/welcome/voice',
    smsUrl:'https://demo.twilio.com/welcome/sms/reply'
  }, function(buyError, number) {
    if (buyError) {
      console.error('Buying the number failed. Reason: '+ buyError.message);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.statusCode = 500;
      res.send(buyError)
    } else {
      console.log('Number purchased! Phone number is: '+ number.phoneNumber);
      var didModel = new Did();
      didModel.number = number.phoneNumber;
      didModel.sid = number.sid;
      didModel.save(function (err, newDid) {
        if(err) {
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.statusCode = 500;
          res.send(err)
        } else {
          // add this did to the user record!
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send(newDid);
        }
      })

    }
  });
}


