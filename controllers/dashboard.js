const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const workspaceSid = process.env.TWILIO_WORKSPACE_SID;
const request = require('request-promise');
const bodyParser = require('body-parser');
const twilio  = require('twilio');

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
            console.log(queueResponseData);


            taskrouterClient.workspace.workers.statistics.get({}, function(err, workerResponseData) {
                if(!err) {
                    console.log('Worker data: ')
                    console.log(workerResponseData);
                }
                var workspaceData;
                const workspaceStatsUrl = `https://${apiKey}:${apiSecret}@taskrouter.twilio.com/v1/Workspaces/${workspaceSid}/Statistics?Minutes=480`
                request({ url: workspaceStatsUrl, method: 'GET' })
                .then(response => {

                    const docName = 'WorkspaceStats';
                    workspaceData = { Data : response }
                    console.log('workspaceData: ')
                    console.log(workspaceData);
                    module.exports.getWorkerStats(function (workerData){

                        console.log('worker data: ');
                        console.log(workerData);
                    res.render('pages/dashboard', {
                        nav_active: 'dashboard',
                        workspaceData: JSON.parse(workspaceData.Data),
                        queueData: queueResponseData,
                        workersData: workerResponseData,
                        workerData: workerData
                    });

                    });


            })
                .then(response => {
                    console.log('workspace stats sent to sync successfully')
            })
                .catch(err => {
                    console.log('error posting workspaceStats to sync: ' + err)
            })



        })



        }
    });

}


module.exports.getWorkerStats = function (cb) {
    result=[];
    taskrouterClient.workspace.workers.get( function (err, data) {
        if (err) {
            res.status(500).json(err)
            return
        }

        for (var i = 0; i < data.workers.length; i++) {
            var worker = data.workers[i];
            //console.log(worker);
            result.push(worker);
        }


        for (var i = 0; i < result.length; i++) {
            var worker = result[i];
            taskrouterClient.workspace.workers(worker.sid).statistics.get({}, function(err, responseData) {
                if(!err) {
                    // console.log("stats:");
                    // console.log(responseData);
                    worker.stats = responseData;
                    console.log(responseData.cumulative)
                    //result[i] = worker;
                }
                console.log('done gathering workers');
                //console.log(result);
                cb(result);

            });

        }
    });

}