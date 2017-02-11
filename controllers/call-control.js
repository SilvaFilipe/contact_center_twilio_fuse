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


module.exports.holdOn = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {


    if (call == null){
      console.log ('Could not find call to hold: ' + callSid);
    } else {
      client.conferences(call.conferenceSid).participants(callSid).update({
        hold: "True"
      }, function (err, participant) {
        if (err) {
          console.log('error with particpant hold: ' + err);
        } else {
          console.log('participant.muted');
        }
      });
    }

  });

  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("OK")


}

