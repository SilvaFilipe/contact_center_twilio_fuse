var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var taskSchema = mongoose.Schema({
    eventType: String,
    accountSid: String,
    description: String,
    resourceType: String,
    resourceSid: { type: String, index: { unique: true } },
    eventDate: String,
    eventData: Object,
    taskSid: String,
    taskAttributes: Object,
    taskEvents: [
        {
            eventDate: String,
            taskAttributes: Object,
            description: String,
            taskCanceledReason: String,
            taskAssignmentStatus: String,
            taskPriority: String,
            taskAge: String,
            type: {
                type: { type: String }
            }
        }
    ],
    taskAge: String,
    taskPriority: String,
    taskAssignmentStatus: String,
    taskCanceledReason: String,
    taskCompletedReason: String,
    to: String,
    from: String,
    call_status: String,
    call_sid: String,
    call_type: String,
    channel: String

});

module.exports = mongoose.model('Task', taskSchema);