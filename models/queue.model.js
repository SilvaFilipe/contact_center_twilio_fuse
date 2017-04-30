const mongoose = require('mongoose');
const twilio 	= require('twilio');
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

QueueSchema.statics.syncWorkflow = function (callback) {

  var workflowConfiguration = { task_routing: { filters: [] }}

  this.find({}, function(err, queues) {
    queues.forEach(function (queue) {
      if (!queue.taskQueueSid || !queue.taskQueueFriendlyName ){
        console.log('Queue %s is invalid for workflow', queue._id);
        return;
      }
      var target = {
        targets: [{
          queue: queue.taskQueueSid,
          priority: queue.priority,
          expression: 'task.requested_agent==worker.agent_name'
        }],
        expression: "queue == \"" + queue.taskQueueFriendlyName + "\""
      }
      workflowConfiguration.task_routing.filters.push(target);
      var target = {
        targets: [{
          queue: queue.taskQueueSid,
          priority: queue.priority
        }],
        expression: "queue == \"" + queue.taskQueueFriendlyName + "\""
      }
      workflowConfiguration.task_routing.filters.push(target);
    });

    var callbackUrl = process.env.PUBLIC_HOST + '/api/taskrouter/assignment';

    var workflow = {
      sid: process.env.WORKFLOW_SID,
      friendlyName: 'Twilio Contact Center Workflow',
      assignmentCallbackUrl: callbackUrl,
      taskReservationTimeout: 30,
      configuration: JSON.stringify(workflowConfiguration)
    }

    module.exports.createOrUpdateWorkflow(workflow, function (err, workflow) {
      if (err) {
        callback(err)
      } else {
        process.env.WORKFLOW_SID = workflow.sid
        callback(null, workflow)
      }
    })
  });
  //return this.where('name', new RegExp(name, 'i')).exec(cb);
}


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

module.exports.createOrUpdateWorkflow = function (workflow, callback) {
  console.log('updating workflow ');
  console.log(workflow);
  if (workflow.sid) {

    taskrouterClient.workspace.workflows(workflow.sid).update(workflow, function (err) {
      if (err) {
        callback(err)
      } else {
        callback(null, workflow)
      }
    })

  } else  {

    taskrouterClient.workspace.workflows.create(workflow, function (err, workflowFromApi) {
      if (err) {
        callback(err)
      } else {
        workflow.sid = workflowFromApi.sid
        callback(null, workflow)
      }
    })

  }
}
