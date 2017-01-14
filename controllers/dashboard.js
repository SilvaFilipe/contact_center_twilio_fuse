const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const workspaceSid = process.env.TWILIO_WORKSPACE_SID;
const request = require('request-promise');
const bodyParser = require('body-parser');
const twilio  = require('twilio');
const async = require('async');

const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)



module.exports.index = function (req, res) {

    const phoneTaskQueue = req.configuration.queues.filter((value) => {return value.id === 'phone'})
    console.log(phoneTaskQueue[0]);
    taskQueueSid = phoneTaskQueue[0].taskQueueSid;



    taskrouterClient.workspace.taskQueues(taskQueueSid).statistics.get({}, function(err, queueResponseData) {
        if(!err) {
            console.log('Queue data: ')
            //console.log(queueResponseData);

            taskrouterClient.workspace.statistics.get({}, function(err, workspaceData) {

                console.log('workspaceData: ');
                //console.log(workerData);

                module.exports.getWorkerStats(function (workerData) {
                    console.log('workerdata: ');
                    console.log(workerData);

                    res.render('pages/dashboard', {
                        nav_active: 'dashboard',
                        workspaceData: workspaceData,
                        queueData: queueResponseData,
                        workerData: workerData,
                        page_title: 'Dashboard'
                    })
                })
            })
        }
    });

}

module.exports.getWorkerStats = function (cb) {

    taskrouterClient.workspace.workers.get( function (err, data) {

        async.map(data.workers, getWorkerItemStats, function(err, results){
            cb(results);
        });

        //cb(data.workers);
    });
}
var getWorkerItemStats = function(item, callback){
    taskrouterClient.workspace.workers(item.sid).statistics.get({}, function(err, responseData) {
        item.stats = responseData;
        callback(null, item)
    });
}
