'use strict'
const Task = require('../models/task.model');
const twilio = require('twilio');
const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN);
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)


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