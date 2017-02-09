'use strict'
const url = require('url');
const Task = require('../models/task.model');
const Call = require('../models/call.model');
const twilio = require('twilio');
const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN);
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)


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

  var url_parts = url.parse(req.url);
  var callbackSource = url_parts.pathname;

  var dbFields = { callStatus: callStatus, from: from, direction: direction, timestamp: timestamp, accountSid: accountSid, callbackSource:callbackSource, fromCountry: fromCountry, fromCity: fromCity, callSid: callSid, to: to, fromZip: fromZip, fromState: fromState };
  var callEvents =  { callStatus: callStatus, callbackSource: callbackSource, timestamp: timestamp };

  console.log('TwiML event called: ' + callbackSource);
  Call.findOne({'callSid': callSid}, function (err, call) {
    console.log(call);
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
              if(err) console.log("Something wrong when updating call: " + err);
              console.log('updated call(2) ' + call2.callSid);
            });
          }
        }
      });
    } else {
      console.log ('updating call: ' + callSid);
      Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
        if(err) console.log("Something wrong when updating call: " + err);
        console.log('updated with TwuML ' + call2.callSid);
      });
    }
  });
}

module.exports.call_events = function (req, res) {
  console.log('Call event requested');
  var callStatus = req.body.CallStatus;
  var duration = req.body.Duration;
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

  var dbFields = { callStatus: callStatus, duration: duration, from: from, direction: direction, timestamp: timestamp, accountSid: accountSid, callbackSource:callbackSource, fromCountry: fromCountry, fromCity: fromCity, sequenceNumber: sequenceNumber,  callSid: callSid, to: to, fromZip: fromZip, fromState: fromState };
  var callEvents =  { callStatus: callStatus, callbackSource: callbackSource, sequenceNumber: sequenceNumber, timestamp: timestamp };


  console.log('Call event called: ' + callbackSource);
  Call.findOne({'callSid': callSid}, function (err, call) {
    console.log(call);
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
              if(err) console.log("Something wrong when updating call: " + err);
              console.log('updated call(2) ' + call2.callSid);
            });
          }
        }
      });
    } else {
      console.log ('updating call: ' + callSid);
      if (call.sequenceNumber == undefined || sequenceNumber > call.sequenceNumber) {
        Call.findOneAndUpdate({'callSid': callSid}, {$set:dbFields, $push: {"callEvents": callEvents} }, {new: true}, function(err, call2){
          if(err) console.log("Something wrong when updating call: " + err);
          console.log('updated with correct sequence ' + call2.callSid);
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

    console.log('Conference event called: ' + statusCallbackEvent);

    if (statusCallbackEvent == 'participant-join'){

        Task.findOne({'reservationSid': friendlyName}, function (err, task) {

            if (task && task.call_sid != callSid) { // agent is joining conference (not caller)
                var twiml = '<Response><Dial><Conference startConferenceOnEnter="true" statusCallbackEvent="start">' + friendlyName + '</Conference></Dial></Response>';
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

        Task.findOne({'reservationSid': friendlyName}, function (err, task) {
            if (task) {
                taskrouterClient.workspace.tasks(task.taskSid).reservations(friendlyName).update({
                    reservationStatus: 'accepted'
                }, function(err, reservation) {
                    if (err){
                        console.log(err);
                    } else {
                        console.log('Accepted reservation ' + friendlyName + ': ' + reservation.reservation_status + ' ' + reservation.worker_name);
                    }
                });

            } else {
                console.log ('Could not find reservation ' + friendlyName + ' to accept.')
            }
        });

    }
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=0')
    res.send("<Response/>")
}

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
                console.log('updated task ' + task.taskSid);
            } else {
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
/*



        Task.findOne({'resourceSid': resourceSid}, function (err, task) {

            if (task) {
                console.log('updating task ' + task.resourceSid);
                task.eventType = eventType;
                task.accountSid = accountSid;
                task.resourceType = resourceType;
                task.description = description;
                task.resourceSid = resourceSid;
                task.eventDate = eventDate;
                task.taskSid = taskSid;
                task.taskAttributes = taskAttributes;
                task.taskAge = taskAge;
                task.taskPriority = taskPriority;
                task.taskAssignmentStatus = taskAssignmentStatus;
                task.taskCanceledReason = taskCanceledReason;
                task.taskCompletedReason = taskCompletedReason;
                task.taskEvents.push(eventHistory);
                task.to = to;
                task.from = from;
                task.call_status = call_status;
                task.call_sid = call_sid;
                task.call_type = call_type;
                task.channel = channel;

                task.save(function (err) {
                    if(err){
                        console.log(err);
                    }
                });
            } else {

                console.log('creating new task ' + resourceSid);
                var newTask= new Task();

                newTask.eventType = eventType;
                newTask.accountSid = accountSid;
                newTask.resourceType = resourceType;
                newTask.description = description;
                newTask.resourceSid = resourceSid;
                newTask.eventDate = eventDate;
                newTask.taskSid = taskSid;
                newTask.taskAttributes = taskAttributes;
                newTask.taskAge = taskAge;
                newTask.taskPriority = taskPriority;
                newTask.taskAssignmentStatus = taskAssignmentStatus;
                newTask.taskCanceledReason = taskCanceledReason;
                newTask.taskCompletedReason = taskCompletedReason;
                newTask.taskEvents = [eventHistory];
                newTask.to = to;
                newTask.from = from;
                newTask.call_status = call_status;
                newTask.call_sid = call_sid;
                newTask.call_type = call_type;
                newTask.channel = channel;

                newTask.save(function (err) {
                    if(err){
                        console.log(err);
                    }
                });
            }

        });
**/

    }


    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=0')
    res.send("<Response/>")
}
