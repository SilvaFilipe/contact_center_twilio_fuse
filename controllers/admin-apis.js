'use strict'
const Did = require('../models/did.model');
const User = require('../models/user.model');
const twilio = require('twilio')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)


module.exports.didSearch = function (req, res) {
  var areaCode = req.query.areacode;
  var tollFree = req.query.tollfree;
  var countryCode = req.query.countryCode;

  if (tollFree === "1"){
    client.availablePhoneNumbers(countryCode).tollFree.list({
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
    client.availablePhoneNumbers(countryCode).local.list({
      areaCode: areaCode,
      voiceEnabled: true
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
  var userId = req.body.userId;
  console.log(phoneNumber);
  var inUseTest = Did.findByNumber(phoneNumber, function (err, existingDid) {
    if (existingDid){
      console.log('number already purchased!')
      return res.status(500).json('Did already purchased');
    } else {
      client.incomingPhoneNumbers.create({
        phoneNumber:phoneNumber,
        voiceUrl: process.env.PUBLIC_HOST + '/api/agents/didInboundExtensionCall',
        smsUrl: process.env.PUBLIC_HOST + '/api/agents/didInboundExtensionSms',
        voiceMethod: "GET",
        smsMethod: "GET"
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
              res.send(err);
            } else {
              if (userId){
                User.findById(userId, function (err, user) {
                  if(err) return res.status(500).json(err);
                  user.dids.push(newDid._id);
                  user.save(function (userErr, user) {
                    if(userErr) return res.status(500).json(userErr);
                    res.setHeader('Cache-Control', 'public, max-age=0')
                    res.send(newDid);
                  })
                });
              } else {
                res.setHeader('Cache-Control', 'public, max-age=0')
                res.send(newDid);
              }
            }
          })
        }
      });
    }
  });
}


