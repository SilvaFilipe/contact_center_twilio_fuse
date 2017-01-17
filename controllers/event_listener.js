'use strict'
const Task = require('../models/task.model');


module.exports.workspace_events = function (req, res) {

    var eventType = req.body.EventType;
    var accountSid = req.body.AccountSid;
    var workspaceSid = req.body.WorkspaceSid;
    var workspaceName = req.body.WorkspaceName;
    var description = req.body.EventDescription;
    var resourceType = req.body.ResourceType;
    var resourceSid = req.body.ResourceSid;
    var eventDate = req.body.Timestamp;



    if ( resourceType=='task' ){

        // task fields
        var taskSid = req.body.TaskSid;
        var taskAttributes = JSON.parse(req.body.TaskAttributes);
        var taskAge = req.body.TaskAge;
        var taskPriority = req.body.TaskPriority;
        var taskAssignmentStatus = req.body.TaskAssignmentStatus;
        var taskCanceledReason = req.body.TaskCanceledReason;
        var taskCompletedReason = req.body.TaskCompletedReason;

        var to = taskAttributes.to;
        var from = taskAttributes.from ;
        var call_status = taskAttributes.call_status;
        var call_sid = taskAttributes.call_sid ;
        var call_type = taskAttributes.call_type ;
        var channel = taskAttributes.channel ;

        var eventHistory =  {taskAttributes: taskAttributes, taskAge: taskAge, taskPriority: taskPriority, taskAssignmentStatus: taskAssignmentStatus, taskCanceledReason: taskCanceledReason, taskCompletedReason: taskCompletedReason, description: description, eventDate: eventDate};
        var dbFields = {eventType: eventType, accountSid: accountSid, resourceType: resourceType, description: description,
            resourceSid: resourceSid, eventDate: eventDate, taskSid: taskSid, taskAttributes: taskAttributes, taskAge: taskAge,
            taskPriority: taskPriority, taskAssignmentStatus: taskAssignmentStatus, taskCanceledReason: taskCanceledReason,
            taskCompletedReason: taskCompletedReason, to: to ,from: from, call_status: call_status, call_sid: call_sid,
            call_type: call_type, channel: channel };
        //task.taskEvents.push(eventHistory);

        Task.findOneAndUpdate({'resourceSid': resourceSid}, {$set:dbFields, $push: {"taskEvents": eventHistory} }, {new: true}, function(err, task){
            if(err) console.log("Something wrong when updating task: " + err);
            if (task) {
                console.log('updated task ' + task.resourceSid);
            } else {
                console.log('creating new task ' + resourceSid);
                var newTask= new Task(dbFields);
                newTask.save(function (err) {
                    if(err){
                        console.log(err);
                        if (err.code && err.code === 11000) {
                            console.log("unique constraint error");
                            // try update again
                            Task.findOneAndUpdate({'resourceSid': resourceSid}, {$set:dbFields, $push: {"taskEvents": eventHistory} }, {new: true}, function(err, task2){
                                if(err) console.log("Something wrong when updating task: " + err);
                                console.log('updated task(2) ' + task2.resourceSid);
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

module.exports.conference_events = function (req, res) {

    var statusCallbackEvent = req.query.StatusCallbackEvent;
    var friendlyName = req.query.FriendlyName;

    if ( statusCallbackEvent=='participant-join' ){

    }

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=0')
    res.send("<Response/>")
}
