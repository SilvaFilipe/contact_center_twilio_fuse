'use strict'
const util = require('util')
const url = require('url');
const request = require('request-promise');
const Task = require('../models/task.model');
const Call = require('../models/call.model');
const User = require('../models/user.model');
const sync = require('../controllers/sync.js');
const twilio = require('twilio');
const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN);
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)



module.exports.transcription_events = function (req, res) {
  console.log('logging transcription event');
  //console.log(req.body);
  //console.log(util.inspect(res, false, null))
  var data = req.body;
  var transcriptionText =req.body.media.transcripts.text;
  console.log(transcriptionText);
  var callSid = req.query.callSid;
  Call.findOne({'callSid': callSid}, function (err, call) {
    if (call == null){
      console.log ('Could not find call to update transcription: ' + callSid);
    } else {
      console.log ('updating transcription: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:{transcription: transcriptionText}}, {new: true}, function(err, call2){
        if(err) {
          console.log("Something wrong when updating call: " + err);
        } else {
          console.log('updated with transcription' + call2.callSid);
          call2.saveSync();
        }
      });
    }
  });

  res.status(200);
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send("<Response/>")

}

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

  var configuration= '{"configuration" : { "executor":"v2", "publish": { "callbacks": [ { "url" : "' + process.env.PUBLIC_HOST + '/listener/transcription_events?callSid=' + callSid + '",  "method" : "POST",  "include" : [ "transcripts", "keywords", "topics", "metadata" ] } ] } } "ingest":{ "channels":{ "left":{ "speaker":"agent" }, "right":{ "speaker":"caller" } } } }'
  console.log(configuration);

  request.post({
    url:'https://apis.voicebase.com/v2-beta/media',
    formData: { media:recordingUrl + ".wav", configuration: configuration},
    headers: {
      'Authorization': 'Bearer ' + process.env.VOICEBASE_TOKEN
    }
  }, function(err,httpResponse,body){
    console.log('voicebase response');
    console.log('err: '+ err);
    //console.log(util.inspect(httpResponse, false, null))
    console.log('body' + body);

  })

  res.status(200);
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
  var duration = req.body.Duration || 0;
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

                      })

                    }
                });

            } else {
                console.log ('Could not find reservation ' + friendlyName + ' to accept.')
            }
        });

    }

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
                        console.log(err);
                        if (err.code && err.code === 11000) {
                            console.log("unique constraint error");
                            // try update again
                            Task.findOneAndUpdate({'taskSid': taskSid}, {$set:dbFields, $push: {"taskEvents": eventHistory} }, {new: true}, function(err, task2){
                                if(err) console.log("Something wrong when updating task: " + err);
                                console.log('updated task(2) ' + task2.taskSid);
                            });
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
