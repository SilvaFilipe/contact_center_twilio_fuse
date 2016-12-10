const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const workspaceSid = process.env.TWILIO_WORKSPACE_SID;
const request = require('request-promise');
const bodyParser = require('body-parser');

module.exports.index = function (req, res) {

    const phoneTaskQueue = req.configuration.queues.filter((value) => {return value.id === 'phone'})
    console.log('phonetaskqueue: '+ phoneTaskQueue);


    var workspaceData;
    const workspaceStatsUrl = `https://${apiKey}:${apiSecret}@taskrouter.twilio.com/v1/Workspaces/${workspaceSid}/Statistics?Minutes=480`
    request({ url: workspaceStatsUrl, method: 'GET' })
        .then(response => {
            console.log('got the workspace stats, pushing to sync');
            const docName = 'WorkspaceStats';
            workspaceData = { Data : response }
            console.log(workspaceData);
    res.render('pages/dashboard', {
        nav_active: 'dashboard',
        workspaceData: JSON.parse(workspaceData.Data)
    });

})
    .then(response => {
        console.log('workspace stats sent to sync successfully')
    })
    .catch(err => {
        console.log('error posting workspaceStats to sync: ' + err)
    })



}