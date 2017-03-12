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


module.exports.recordOn = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to start recording: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="record-from-answer-dual"><Conference beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + call.conferenceFriendlyName + '</Conference></Dial></Response>';
      var escaped_twiml = require('querystring').escape(twiml);
      client.calls(callSid).update({
        url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
      }, function (err, call) {
        if (err) {
          console.log('Could not start recording: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('Started recording: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}


module.exports.recordOff = function (req, res) {
  var callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to stop recording: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {
      var twiml = '<Response><Dial record="do-not-record"><Conference beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + call.conferenceFriendlyName + '</Conference></Dial></Response>';
      var escaped_twiml = require('querystring').escape(twiml);
      client.calls(callSid).update({
        url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
      }, function (err, call) {
        if (err) {
          console.log('Could not stop recording: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        } else {
          console.log('Stopped recording: ' + callSid);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("OK")
        }
      });
    }
  });
}


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


module.exports.playRecording = function (req, res) {
  var fs = require('fs'),
    https = require('https'),
    clips = [],
    currentfile,
    callSid = req.query.callSid;

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to play recording: ' + callSid);
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send("ERROR")
    } else {

      for (let item of call.callEvents) {
        if (item.recordingUrl && item.recordingUrl != undefined) {
          //console.log('X: ' + item.recordingUrl);
          clips.push(item.recordingUrl);
        }
      }

      console.log('clips count: ' + clips.length);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
//        'Content-Length': output.size
      });

      createRecording();

      // console.log('Playing recording: ' + callSid);
      // res.setHeader('Cache-Control', 'public, max-age=0')
      // res.send("OK")
    }
  });

  var createRecording = function () {
    // recursive function
    currentfile = clips.shift();
    console.log('requesting ' + currentfile);
    var request = https.get(currentfile + ".mp3", function(response) {
      //response.pipe(output, {end: false});
      response.pipe(res, {end: false});
      if (!clips.length) {
        response.on("end", function() {
          console.log('done streaming recording');
          res.end();
        });
      } else {
        createRecording();
      }
    });
  }
}

