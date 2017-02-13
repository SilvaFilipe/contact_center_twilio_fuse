'use strict'

const twilio = require('twilio')
const Call = require('../models/call.model');

/* client for Twilio TaskRouter
 const taskrouterClient = new twilio.TaskRouterClient(
 process.env.TWILIO_ACCOUNT_SID,
 process.env.TWILIO_AUTH_TOKEN,
 process.env.TWILIO_WORKSPACE_SID)
 */

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)

module.exports.hangup = function (req, res) {
  var callSid = req.query.callSid;

  client.calls(callSid).update({
    status: "completed"
  }, function (err, call) {
    if (err) {
      console.log('Could not end call: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      console.log('Disconnected: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("OK")
    }
  });
}

module.exports.holdOn = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to hold: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      client.conferences(call.conferenceSid).participants(callSid).update({
        hold: "True"
      }, function (err, participant) {
        if (err) {
          console.log('error with particpant hold: ' + err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('participant hold: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}


module.exports.holdOff = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to unhold: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      client.conferences(call.conferenceSid).participants(callSid).update({
        hold: "False"
      }, function (err, participant) {
        if (err) {
          console.log('error with particpant unhold: ' + err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('participant unhold: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}

module.exports.muteOn = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to mute: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      client.conferences(call.conferenceSid).participants(callSid).update({
        muted: "True"
      }, function (err, participant) {
        if (err) {
          console.log('error with particpant mute: ' + err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('participant muted: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}

module.exports.muteOff = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to unmute: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      client.conferences(call.conferenceSid).participants(callSid).update({
        muted: "False"
      }, function (err, participant) {
        if (err) {
          console.log('error with particpant unmute: ' + err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('participant unmuted: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}
