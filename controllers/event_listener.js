'use strict'
const util = require('util')
const url = require('url');
const request = require('request-promise');
const Task = require('../models/task.model');
const Call = require('../models/call.model');
const User = require('../models/user.model');
const sync = require('../controllers/sync.js');
const callcontrol = require('../controllers/call-control.js');
const twilio = require('twilio');
const client = new twilio( process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const taskrouterClient = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const options = { auth: { api_user: process.env.SENDGRID_USERNAME,  api_key: process.env.SENDGRID_PASSWORD }};
const mailer = nodemailer.createTransport(sgTransport(options));
var moment = require('moment');

module.exports.voicemail_transcription_events= function (req, res) {
  console.log('logging voicemail_transcription_events');
  var data = req.body;
  var transcriptionText =req.body.media.transcripts.text;
  var voiceBaseMediaId = req.body.media.mediaId;
  console.log('mediaID: ' + voiceBaseMediaId);
  //console.log(transcriptionText);
  var callSid = req.query.callSid;
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to update voicemail transcription: ' + callSid);
      res.status(404);
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      return res.send("<Response/>")
    } else {
      console.log ('updating transcription: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:{mailTranscription: transcriptionText, mailVoiceBaseMediaId: voiceBaseMediaId}}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating voicemail call: " + err);
        } else {
          console.log('updated with voicemail transcription' + call2.callSid);
          call2.saveSync();
          call2.user_ids.map( function(userid) {
            var mData = {type: 'voicemail-transcription-sent', data: {callSid: callSid, callerName: call2.callerName, fromNumber: call2.from}};
            sync.saveList ('m' + userid, mData);
            // send vm email
            User.findOne({_id:userid}, function(err, userToMail){
              if (userToMail!=null){
                var formatted_time = moment().format('YYYY-MM-DD_HH-mm')
                var email = {
                  to: userToMail.email,
                  from: process.env.FROM_EMAIL,
                  subject: 'Voicemail from ' + call2.from,
                  html: 'You have a new voicemail from ' + call2.from + '<br /><br />Transcription: ' + transcriptionText,
                  attachments: [
                    {
                      filename: formatted_time + '.mp3',
                      path: call2.mailRecordingUrl + ".mp3"
                    }
                  ]
                };
                // todo - attach audio file
                mailer.sendMail(email, function(err, response) {
                  if (err) {console.log(err); } else { console.log('sent vm email to ' + userToMail.email)}
                });
              }
            });

          });

        }
        res.status(200);
        res.setHeader('Content-Type', 'application/xml')
        res.setHeader('Cache-Control', 'public, max-age=0')
        return res.send("<Response/>");
      });
    }
  });

}

module.exports.transcription_events = function (req, res) {
  console.log('logging transcription event');
  var data = req.body;
  var transcriptionText =req.body.media.transcripts.text;
  var voiceBaseMediaId = req.body.media.mediaId;
  console.log('mediaID: ' + voiceBaseMediaId);
  //console.log(transcriptionText);
  var callSid = req.query.callSid;
  var sentiment = require('sentiment');
  var r1 = sentiment(transcriptionText);
  console.log('sentiment:')
  console.log(r1);
  try {
    var sentimentScore = r1.score
    var sentimentComparative= r1.comparative
    var positiveWords = r1.positive
    var negativeWords = r1.negative
  } catch (e) {
    var sentimentScore = null
    var sentimentComparative = null
    var positiveWords = []
    var negativeWords = []
  }
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to update transcription: ' + callSid);
      res.status(404);
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      return res.send("<Response/>")
    } else {
      console.log ('updating transcription: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:{transcription: transcriptionText, voiceBaseMediaId: voiceBaseMediaId, sentimentScore: sentimentScore, sentimentComparative: sentimentComparative, positiveWords: positiveWords, negativeWords: negativeWords }}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating call: " + err);
        } else {
          console.log('updated with transcription' + call2.callSid);
          call2.saveSync();
          call2.user_ids.map( function(userid) {
            var mData = {type: 'transcription-sent', data: {callSid: callSid, callerName: call2.callerName, fromNumber: call2.from}};
            sync.saveList ('m' + userid, mData);
          });

        }
        res.status(200);
        res.setHeader('Content-Type', 'application/xml')
        res.setHeader('Cache-Control', 'public, max-age=0')
        return res.send("<Response/>");
      });
    }
  });

}

module.exports.voicemail_recording_events = function (req, res) {
  console.log('logging voicemail recording event');
  var accountSid = req.query.AccountSid;
  var callSid = req.query.CallSid;
  var recordingSid = req.query.RecordingSid;
  var recordingUrl = req.query.RecordingUrl;
  var recordingDuration = req.query.RecordingDuration;
  var recordingChannels = req.query.RecordingChannels;
  var updated_at = new Date();
  var dbFields = { accountSid: accountSid, callSid: callSid, updated_at: updated_at, mailRecordingSid: recordingSid, mailRecordingUrl: recordingUrl, mailRecordingDuration: recordingDuration};
  console.log('recording event called: ' + callSid);

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      //insert new call
      console.log ('null call with recording: ' + callSid);
    } else {
      console.log ('updating call with recording: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating recording: " + err);
        } else {
          console.log('updated with recording ' + call2.callSid);
          call2.saveSync();
        }
      });
    }
  });

  // send for transcription


  console.log ('recordingUrl: ' + recordingUrl);
  if (process.env.DEFAULT_LANGUAGE=="en-US"){
    var configuration= '{"configuration" : { "language":"' + process.env.DEFAULT_LANGUAGE + '", "executor":"v2", "publish": { "callbacks": [ { "url" : "' + process.env.PUBLIC_HOST + '/listener/voicemail_transcription_events?callSid=' + callSid + '", "method" : "POST", "include" : [ "transcripts", "keywords", "topics", "metadata" ] } ] }, "ingest":{ "channels":{ "left":{ "speaker":"caller" }, "right":{ "speaker":"agent" } } } } }';
  } else {
    //Language 'es-LA' does not support feature 'Semantic Keywords and Topics Configuration
    var configuration= '{"configuration" : { "language":"' + process.env.DEFAULT_LANGUAGE + '", "keywords":{"semantic":false},"topics":{"semantic":false}, "executor":"v2", "publish": { "callbacks": [ { "url" : "' + process.env.PUBLIC_HOST + '/listener/voicemail_transcription_events?callSid=' + callSid + '", "method" : "POST", "include" : [ "transcripts", "metadata" ] } ] }, "ingest":{ "channels":{ "left":{ "speaker":"caller" }, "right":{ "speaker":"agent" } } } } }';
  }
  console.log(configuration);

  request.post({
    url:'https://apis.voicebase.com/v2-beta/media',
    formData: { media:recordingUrl + ".wav", configuration: configuration},
    headers: {
      'Authorization': 'Bearer ' + process.env.VOICEBASE_TOKEN
    }
  }, function(err,httpResponse,body){
    //console.log('voicebase response');
    console.log('err: '+ err);
    //console.log(util.inspect(httpResponse, false, null))
    //console.log('body' + body);

  })

  res.status(200);
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")

};

module.exports.recording_events = function (req, res) {
  console.log('logging recording event');
  var accountSid = req.query.AccountSid;
  var callSid = req.query.CallSid;
  var recordingSid = req.query.RecordingSid;
  var recordingUrl = req.query.RecordingUrl;
  var recordingDuration = req.query.RecordingDuration;
  var recordingChannels = req.query.RecordingChannels;
  var updated_at = new Date();
  var dbFields = { accountSid: accountSid, callSid: callSid, updated_at: updated_at, recordingSid: recordingSid, recordingUrl: recordingUrl, recordingDuration: recordingDuration, recordingChannels: recordingChannels};
  console.log('recording event called: ' + callSid);

  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      //insert new call
      console.log ('null call with recording: ' + callSid);
    } else {
      console.log ('updating call with recording: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating recording: " + err);
        } else {
          console.log('updated with recording ' + call2.callSid);
          call2.saveSync();
        }
      });
    }
  });

  // send for transcription


  console.log ('recordingUrl: ' + recordingUrl);
  if (process.env.DEFAULT_LANGUAGE=="en-US"){
    var configuration= '{"configuration" : { "language":"' + process.env.DEFAULT_LANGUAGE + '", "executor":"v2", "publish": { "callbacks": [ { "url" : "' + process.env.PUBLIC_HOST + '/listener/transcription_events?callSid=' + callSid + '", "method" : "POST", "include" : [ "transcripts", "keywords", "topics", "metadata" ] } ] }, "ingest":{ "channels":{ "left":{ "speaker":"caller" }, "right":{ "speaker":"agent" } } } } }';
  } else {
    //Language 'es-LA' does not support feature 'Semantic Keywords and Topics Configuration
    var configuration= '{"configuration" : { "language":"' + process.env.DEFAULT_LANGUAGE + '", "keywords":{"semantic":false},"topics":{"semantic":false}, "executor":"v2", "publish": { "callbacks": [ { "url" : "' + process.env.PUBLIC_HOST + '/listener/transcription_events?callSid=' + callSid + '", "method" : "POST", "include" : [ "transcripts", "metadata" ] } ] }, "ingest":{ "channels":{ "left":{ "speaker":"caller" }, "right":{ "speaker":"agent" } } } } }';
  }

  console.log(configuration);

  request.post({
    url:'https://apis.voicebase.com/v2-beta/media',
    formData: { media:recordingUrl + ".wav", configuration: configuration},
    headers: {
      'Authorization': 'Bearer ' + process.env.VOICEBASE_TOKEN
    }
  }, function(err,httpResponse,body){
    if (err!=null){
      console.log('voicebase err: '+ err);
    }
    console.log('voicebase response');
    console.log('body' + body);
    //console.log(util.inspect(httpResponse, false, null))

  })

  res.status(200);
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")

};


module.exports.log_statuscallback_event = function (req, res) {
  console.log('logging statuscallback twiml');
  var callStatus = req.body.CallStatus;
  var duration = req.body.CallDuration || 0;
  var from = req.body.From;
  var direction = req.body.Direction;
  var timestamp = req.body.Timestamp;
  var accountSid = req.body.AccountSid;
  var fromCountry = req.body.FromCountry;
  var fromCity = req.body.FromCity;
  var callSid = req.body.CallSid;
  var to = req.body.To;
  var fromZip = req.body.FromZip;
  var fromState = req.body.FromState;
  var callerName = req.body.CallerName;
  var updated_at = new Date();

  var url_parts = url.parse(req.url);
  var callbackSource = url_parts.pathname;

  var dbFields = { duration: duration, callStatus: callStatus, from: from, direction: direction, timestamp: timestamp, accountSid: accountSid, callbackSource:callbackSource, fromCountry: fromCountry, fromCity: fromCity, callSid: callSid, to: to, fromZip: fromZip, fromState: fromState, updated_at : updated_at, callerName: callerName };
  var callEvents =  { callStatus: callStatus, callbackSource: callbackSource, timestamp: timestamp, updated_at: updated_at };

  console.log('TwiML event called: ' + callbackSource);
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      //insert new call
      console.log ('inserting new call: ' + callSid);
      var newCall = new Call( Object.assign(dbFields, {callEvents: [callEvents]}) );
      newCall.save(function (err) {
        if(err){
          console.log(err);
          if (err.code && err.code === 11000) {
            console.log("unique constraint error on call");
            // try update again
            Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
              if(err) {
                console.log("Something wrong when updating call: " + err);
              } else {
                console.log('saved call(2) ' + call2.callSid);
                call2.saveSync();
              }
            });
          }
        } else {
          console.log('saved new call');
          newCall.saveSync();
        }
      });
    } else {
      console.log ('updating call: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
        if(err) console.log("Something wrong when updating call: " + err);
        console.log('updated with TwiML ' + call2.callSid);
        call2.saveSync();

        if (callStatus=='completed'){
          //hangup sip call
          callcontrol.hangupSipLeg(callSid);
          call2.user_ids.map( function(userid) {
            var mData = {type: 'call-end', data: {callSid: callSid, callerName: call2.callerName, fromNumber: call2.from}};
            sync.saveList ('m' + userid, mData);
          });

        }

      });
    }
  });
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")
}


module.exports.log_twiml_event = function (req) {
  console.log('logging twiml event');
  var callStatus = req.query.CallStatus;
  var from = req.query.From;
  var direction = req.query.Direction;
  var timestamp = req.query.Timestamp;
  var accountSid = req.query.AccountSid;
  var fromCountry = req.query.FromCountry;
  var fromCity = req.query.FromCity;
  var callSid = req.query.CallSid;
  var to = req.query.To;
  var fromZip = req.query.FromZip;
  var fromState = req.query.FromState;
  var callerName = req.query.CallerName;
  var updated_at = new Date();

  var url_parts = url.parse(req.url);
  var callbackSource = url_parts.pathname;

  var dbFields = { callStatus: callStatus, from: from, direction: direction, timestamp: timestamp, accountSid: accountSid, callbackSource:callbackSource, fromCountry: fromCountry, fromCity: fromCity, callSid: callSid, to: to, fromZip: fromZip, fromState: fromState, updated_at : updated_at, callerName: callerName };
  var callEvents =  { callStatus: callStatus, callbackSource: callbackSource, timestamp: timestamp, updated_at: updated_at };

  console.log('TwiML event called: ' + callbackSource);
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      //insert new call
      console.log ('inserting new call: ' + callSid);
      var newCall = new Call( Object.assign(dbFields, {callEvents: [callEvents]}) );
      newCall.save(function (err) {
        if(err){
          console.log(err);
          if (err.code && err.code === 11000) {
            console.log("unique constraint error on call");
            // try update again
            Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
              if(err) {
                console.log("Something wrong when updating call: " + err);
              } else {
                console.log('saved call(2) ' + call2.callSid);
                call2.saveSync();
              }
            });
          }
        } else {
          console.log('saved new call');
          newCall.saveSync();
        }
      });
    } else {
      console.log ('updating call: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
        if(err) console.log("Something wrong when updating call: " + err);
        console.log('updated with TwuML ' + call2.callSid);
        call2.saveSync();
      });
    }
  });
}

module.exports.call_events = function (req, res) {
  console.log('Call event requested');
  var callStatus = req.body.CallStatus;
  var duration = req.body.CallDuration || 0;
  var from = req.body.From;
  var direction = req.body.Direction;
  var timestamp = req.body.Timestamp;
  var accountSid = req.body.AccountSid;
  var callbackSource = req.body.CallbackSource;
  var fromCountry = req.body.FromCountry;
  var fromCity = req.body.FromCity;
  var sequenceNumber = req.body.SequenceNumber;
  var callSid = req.body.CallSid;
  var to = req.body.To;
  var fromZip = req.body.FromZip;
  var fromState = req.body.FromState;
  var callerName = req.body.CallerName;
  var updated_at = new Date();

  var dbFields = { callStatus: callStatus, duration: duration, from: from, direction: direction, timestamp: timestamp, accountSid: accountSid, callbackSource:callbackSource, fromCountry: fromCountry, fromCity: fromCity, sequenceNumber: sequenceNumber,  callSid: callSid, to: to, fromZip: fromZip, fromState: fromState, updated_at: updated_at, callerName: callerName };
  var callEvents =  { callStatus: callStatus, callbackSource: callbackSource, sequenceNumber: sequenceNumber, timestamp: timestamp, updated_at: updated_at };

  console.log('Call event called: ' + callbackSource);
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      //insert new call
      console.log ('inserting new call: ' + callSid);
      var newCall = new Call( Object.assign(dbFields, {callEvents: [callEvents]}) );
      newCall.save(function (err) {
        if(err){
          console.log(err);
          if (err.code && err.code === 11000) {
            console.log("unique constraint error on call");
            // try update again
            Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
              if(err) {
                console.log("Something wrong when updating call: " + err);
              } else {
                console.log('updated call(2) ' + call2.callSid);
                call2.saveSync();
              }
            });
          }
        } else {
          console.log('called saved.');
          newCall.saveSync();
        }
      });
    } else {
      console.log ('updating call: ' + callSid);
      if (call.sequenceNumber == undefined || sequenceNumber > call.sequenceNumber) {
        Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
          if(err){
            console.log("Something wrong when updating call: " + err);
          } else {
            console.log('updated with correct sequence ' + call2.callSid);
            call2.saveSync();
            if (callStatus == 'completed'){
              call2.user_ids.map( function(userid) {
                var mData = {type: 'call-end', data: {callSid: callSid, callerName: call2.callerName, fromNumber: call2.from}};
                sync.saveList ('m' + userid, mData);
              });
            }
          }
        });
      } else {
        // event received out of sequence, don't update top level properties
        Call.findOneAndUpdate({'callSid': callSid}, {$push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
          if(err) console.log("Something wrong when updating call: " + err);
          console.log('updated out of sequence ' + call2.callSid);
        });
      }
    }
  });
  res.status(200);
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")
}

module.exports.conference_events = function (req, res) {
  console.log('Conference event requested');

    var conferenceSid = req.body.ConferenceSid;
    var friendlyName = req.body.FriendlyName;
    var statusCallbackEvent = req.body.StatusCallbackEvent;
    var startConferenceOnEnter = req.body.StartConferenceOnEnter;
    var muted = req.body.Muted;
    var hold = req.body.Hold;
    var endConferenceOnExit = req.body.EndConferenceOnExit;
    var callSid = req.body.CallSid;
    var accountSid = req.body.AccountSid;
    var updated_at = new Date();
    var dbFields = { conferenceSid: conferenceSid, conferenceFriendlyName: friendlyName, conferenceStatusCallbackEvent: statusCallbackEvent, muted: muted, hold: hold, callSid: callSid, updated_at: updated_at }

    console.log('Conference event called: ' + statusCallbackEvent);
    if (callSid){
      console.log('about to update callSid with conference info: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating call: " + err);
        } else {
          if (call2==null){
            console.log('agentCallsid' + callSid + ' for conference event ' + statusCallbackEvent);
          } else {
            console.log('updated with conference info ' + call2.callSid);
            //call2.saveSync();
          }
        }
      });
    } else {
      Call.find({'conferenceSid': conferenceSid}, function (err, calls){
        if (err){
          console.log('error finding by conferenceSid ' + err);
        } else {
          calls.forEach(function (call) {
            console.log('updating call by confSid: ' + call.callSid);
            call.update({$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, raw){
              if (err) {
                console.log(err);
              } else {
                //console.log('The raw response from Mongo was ', raw);
              }
            });
          });
        }
      });
    }

  if (statusCallbackEvent == 'participant-leave'){
    // if its a call answered by sip, and only 1 participant is left, SIP caller hung up so end the call
    client.conferences(conferenceSid).participants.list(function(err, data) {
      if (data.participants.length == 1) {
        Call.find({'conferenceSid': conferenceSid}, function (err, calls) {
          if (err) {
            console.log('error finding by conferenceSid ' + err);
          } else {
            calls.forEach(function (call) {
              if (call.sipAnswered == true) {
                client.calls(call.callSid).update({status: "completed"}, function (err, call) {
                  if (err) {
                    console.log('Could not end call: ' + callSid);
                  } else {
                    console.log('SIP caller hangup so we disconnected: ' + callSid);
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  if (statusCallbackEvent == 'participant-join'){

        Task.findOne({'reservationSid': friendlyName}, function (err, task) {

            if (task && task.call_sid != callSid) { // agent is joining conference (not caller)
                var twiml = '<Response><Dial><Conference beep="false" startConferenceOnEnter="true" statusCallbackEvent="start end join leave mute hold">' + friendlyName + '</Conference></Dial></Response>';
                var escaped_twiml = require('querystring').escape(twiml);

                client.calls(task.call_sid).update({
                    url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
                    method: "GET"
                }, function(err, call) {
                    if (err){
                        console.log(err);
                    } else {
                        console.log ('Moved ' + task.call_sid + ' to conference ' + friendlyName);
                    }
                });

            } else {
                console.log ('Could not find reservation ' + friendlyName + ' to move caller to conference.')
            }
        });

        Call.findOne({"sipCallSid":callSid}, function (err, call){
          if (err){
            console.log("err finding by sipCallSid " + err);
          } else {
            if (call!=null){
              // call answered by a SIP phone, lets send a sync message to web interface to not answer this call
              call.sipAnswered=true;
              call.save(function (err, savedCall){
                if (!err){
                  savedCall.saveSync();
                }
              });
             var mData = {type: 'answeredBySip',  data: {callSid: call.callSid,} };
             call.user_ids.forEach(function (userId) {
               console.log('notified user %s answeredBySip', userId)
               sync.saveList('m' + userId, mData);
               }
             );
            }
          }
        });

    }

  if (statusCallbackEvent == 'conference-start'){
      console.log('conference-start')
        Task.findOne({'reservationSid': friendlyName}, function (err, task) {
            if (task) {
                taskrouterClient.workspace.tasks(task.taskSid).reservations(friendlyName).update({
                    reservationStatus: 'accepted'
                }, function(err, reservation) {
                    if (err){
                        console.log(err);
                    } else {
                        console.log('Accepted reservation ' + friendlyName + ': ' + reservation.reservation_status + ' ' + reservation.worker_name);
                        // TODO: update call with user_id
                      console.log('todo')
                      User.findByFriendlyName(reservation.worker_name, function (err, user) {
                        if (err){
                          console.log(err);
                        }
                        console.log('user?', user);
                          if (callSid){
                            //Conference start and end events have no callSid
                            Call.findOne({'callSid': callSid}, function (err, call) {
                              if (call == null){
                                console.log ('Could not find call to update conference: ' + callSid);
                              } else {
                                console.log ('updating call: ' + callSid);

                                if(user){
                                  console.log('adding user to call and saving');
                                  call.addUserIds(user._id);
                                  call.saveSync();
                                }
                                /*
                                This is done earlier now
                                Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, call2){
                                  if(err) {
                                    console.log("Something wrong when updating call: " + err);
                                  } else {
                                    console.log('updated with conference info ' + call2.callSid);
                                    call2.saveSync();
                                  }
                                });
                                */
                              }
                            });
                          }

                      })

                    }
                });

            } else {
                console.log ('Could not find reservation ' + friendlyName + ' to accept.')
            }
        });

    }
/*
  if (callSid && statusCallbackEvent != 'conference-start'){
      //Conference start and end events have no callSid
      Call.findOne({'callSid': callSid}, function (err, call) {
        if (call == null){
          console.log ('Could not find call to update conference: ' + callSid);
        } else {
          console.log ('updating call: ' + callSid);
          Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": dbFields} }, {new: true}, function(err, call2){
            if(err) {
              console.log("Something wrong when updating call: " + err);
            } else {
              console.log('updated with conference info ' + call2.callSid);
              call2.saveSync();
            }
          });
        }
      });
    }
*/
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=0')
    res.send("<Response/>")
};

module.exports.workspace_events = function (req, res) {

    var eventType = req.body.EventType;
    var accountSid = req.body.AccountSid;
    var workspaceSid = req.body.WorkspaceSid;
    var workspaceName = req.body.WorkspaceName;
    var description = req.body.EventDescription;
    var resourceType = req.body.ResourceType;
    var resourceSid = req.body.ResourceSid;
    var eventDate = req.body.Timestamp;

    if ( resourceType=='task' || resourceType == 'reservation' ){

        // task fields
        var taskSid = req.body.TaskSid;
        var taskAttributes = JSON.parse(req.body.TaskAttributes);
        var taskAge = req.body.TaskAge;
        var taskPriority = req.body.TaskPriority;
        var taskAssignmentStatus = req.body.TaskAssignmentStatus;
        var taskCanceledReason = req.body.TaskCanceledReason;
        var taskCompletedReason = req.body.TaskCompletedReason;
        var workflowSid = req.body.WorkflowSid;
        var taskQueueSid = req.body.TaskQueueSid;
        var reservationSid =  req.body.ReservationSid;

        var to = taskAttributes.to;
        var from = taskAttributes.from ;
        var call_status = taskAttributes.call_status;
        var call_sid = taskAttributes.call_sid ;
        var call_type = taskAttributes.call_type ;
        var channel = taskAttributes.channel ;

        var eventHistory =  {taskAttributes: taskAttributes, taskAge: taskAge, taskPriority: taskPriority, taskAssignmentStatus: taskAssignmentStatus, taskCanceledReason: taskCanceledReason, taskCompletedReason: taskCompletedReason, description: description, eventDate: eventDate};
        var dbFields = {reservationSid: reservationSid, taskQueueSid: taskQueueSid, workflowSid: workflowSid, workspaceSid: workspaceSid, eventType: eventType, accountSid: accountSid, resourceType: resourceType, description: description,
            resourceSid: resourceSid, eventDate: eventDate, taskSid: taskSid, taskAttributes: taskAttributes, taskAge: taskAge,
            taskPriority: taskPriority, taskAssignmentStatus: taskAssignmentStatus, taskCanceledReason: taskCanceledReason,
            taskCompletedReason: taskCompletedReason, to: to ,from: from, call_status: call_status, call_sid: call_sid,
            call_type: call_type, channel: channel };
        //task.taskEvents.push(eventHistory);

        Task.findOneAndUpdate({'taskSid': taskSid}, {$set:dbFields, $push: {"taskEvents": eventHistory} }, {new: true}, function(err, task){
            if(err) console.log("Something wrong when updating task: " + err);
            if (task) {
                console.log('updated task ' + task.taskSid + ': ' + eventType);
            }
            if (!task){
                console.log('creating new task ' + taskSid);
                var newTask= new Task(dbFields);
                newTask.save(function (err) {
                    if(err){
                        if (err.code && err.code === 11000) {
                            console.log("unique constraint error");
                            // try update again
                            Task.findOneAndUpdate({'taskSid': taskSid}, {$set:dbFields, $push: {"taskEvents": eventHistory} }, {new: true}, function(err, task2){
                                if(err) console.log("Something wrong when updating task: " + err);
                                console.log('updated task(2) ' + task2.taskSid);
                            });
                        } else {
                          console.log(err);
                        }
                    }
                });
            }


        });
    }

    if (resourceType=='worker'){
      var workerName = req.body.WorkerName;
      var activity = req.body.WorkerActivityName;
      var activitySid = req.body.WorkerActivitySid;
      var workerSid  = req.body.WorkerSid ;
      var data = {activitySid: activitySid, activity: activity}
      //module.exports.syncSave('workers', workerName, data);
      sync.saveMap('workers', workerName, data);
    }

    if ( taskQueueSid != undefined){

      taskrouterClient.workspace.taskQueues(taskQueueSid).statistics.get({}, function(err, responseData) {
        if(!err) {
          //console.log(responseData);
          sync.saveMap('taskQueues', 't' + taskQueueSid, responseData);
        }
      });
    }


  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")
}

module.exports.syncSave = function (mapName, key, data) {
  console.log('writing to sync doc ' + mapName + ' key: ' + key);// + ' data: ' + data);

  var formData = { Data: JSON.stringify(data)};
  var url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Maps/' + mapName + '/Items/' + key;
  request({ url: url, method: 'POST', formData: formData })
    .then(response => {
    console.log('got sync response: ' + response);
  })
  .catch(err => {
    console.log('error posting to sync: ' + err);

    url = 'https://' + process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@preview.twilio.com/Sync/Services/' + process.env.SYNC_SERVICE_SID + '/Maps/' + mapName + '/Items';
    //console.log(url);
    formData = { Key: key, Data: JSON.stringify(data)};
    request({ url: url, method: 'POST', formData: formData })
      .then(response => {
        console.log('got sync response: ');// + response);
      })
      .catch(err => {
        console.log('error posting to sync: ' + err);
      });

  });

}
