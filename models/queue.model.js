const mongoose = require('mongoose');
const twilio 	= require('twilio')
const taskrouterClient = new twilio.TaskRouterClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_WORKSPACE_SID)

if (process.env.DYNO) {
  util = require('../util-pg.js')
} else {
  util = require('../util-file.js')
}


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
  this.taskQueueFriendlyName = tmpId;
}

/*

QueueSchema.methods.setFriendlyName = function (cb) {
  var queue = this;
  var tmpId = queue.name.toLowerCase();
  tmpId = tmpId.replace(/[^a-z0-9 ]/g, '');
  tmpId = tmpId.replace(/[ ]/g, '_');
  this.taskQueueFriendlyName = tmpId;
  queue.model('Queue').update({_id: queue._id}, {
    taskQueueFriendlyName: tmpId
  }, function(err, affected, resp) {
    if (err){
      console.log('setFriendlyName err');
      console.log(err);
      return cb(err);
    } else {
      console.log('setFriendlyName success');
      console.log(resp);
      return cb(null, resp);
    }

  })
}
*/

QueueSchema.methods.syncQueue = function () {
  var queue = this;
  util.getConfiguration(function (err, config) {
    if (err) {
      console.log(err);
    } else {
      var queueForSync = {
        sid: queue.taskQueueSid,
        friendlyName: queue.taskQueueFriendlyName,
        reservationActivitySid: config.twilio.workerReservationActivitySid,
        assignmentActivitySid: config.twilio.workerAssignmentActivitySid,
        targetWorkers: 'queues HAS "' + queue.taskQueueFriendlyName + '"'
      }

      if (queue.taskQueueSid) {

        taskrouterClient.workspace.taskQueues(queue.taskQueueSid).update(queueForSync, function (err) {
          if (err) {
            console.log(err)
          } else {
            console.log('updated taskqueue ' + queue.taskQueueFriendlyName
            );
            console.log(queueForSync);
          }
        })

      } else  {

        taskrouterClient.workspace.taskQueues.create(queueForSync, function (err, queueFromApi) {
          if (err) {
            console.log(err)
          } else {
            queue.model('Queue').update({_id: queue._id}, {
              taskQueueSid: queueFromApi.sid
            }, function(err, affected, resp) {
              console.log(resp);
            })
          }
        })
      }
    }
  })

}

QueueSchema.pre('save', function(next){
  doc = this;
  console.log('queue %s pre 1', doc._id);
  doc.setFriendlyName();
  next();
})
/*
QueueSchema.post('save', function(doc, next) {
  console.log('queue %s post 1', doc._id);
  doc.setFriendlyName(
    function (){
      next();
    });
});
*/
QueueSchema.post('save', function(doc, next) {
  console.log('queue %s post 2', doc._id);
  doc.syncQueue();
  next();
});

module.exports = mongoose.model('Queue', QueueSchema);
