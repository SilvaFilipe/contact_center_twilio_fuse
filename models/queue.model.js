const mongoose = require('mongoose');
const twilio 	= require('twilio')
const taskrouterClient = new twilio.TaskRouterClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_WORKSPACE_SID)


var QueueSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Required field.']
    },
    description: {
        type: String
    },
    priority: {
      type: Number,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    },
    taskQueueSid: { type: String},
    taskQueueFriendlyName: { type: String},
    targetWorkerExpression: { type: String},
    reservationActivitySid: { type: String},
    assignmentActivitySid: { type: String},
    maxReservedWorkers: { type: Number},

});

QueueSchema.methods.setFriendlyName = function () {
  var queue = this;
  var tmpId = queue.name.toLowerCase();
  tmpId = tmpId.replace(/[^a-z0-9 ]/g, '');
  tmpId = tmpId.replace(/[ ]/g, '_');
  queue.model('Queue').update({_id: queue._id}, {
    taskQueueFriendlyName: tmpId
  }, function(err, affected, resp) {
    console.log(resp);
  })
}

QueueSchema.methods.syncQueue = function () {
  var queue = this;
  var queueForSync = {
    sid: queue.taskQueueSid,
    friendlyName: queue.taskQueueFriendlyName,
    reservationActivitySid: config.twilio.workerReservationActivitySid,
    assignmentActivitySid: config.twilio.workerAssignmentActivitySid,
    targetWorkers: 'queues HAS "' + queue.taskQueueFriendlyName + '"'
  }

  if (queue.taskQueueSid) {

    taskrouterClient.workspace.taskQueues(queue.taskQueueSid).update(taskQueue, function (err) {
      if (err) {
        callback(err)
      } else {
        callback(null, taskQueue)
      }
    })

  } else  {

    taskrouterClient.workspace.taskQueues.create(queueForSync, function (err, queueFromApi) {
      if (err) {
        callback(err)
      } else {
        queue.model('Queue').update({_id: queue._id}, {
          taskQueueSid: queueFromApi.sid
        }, function(err, affected, resp) {
          console.log(resp);
          callback(null, queue)
        })
      }
    })
  }

}

module.exports = mongoose.model('Queue', QueueSchema);
