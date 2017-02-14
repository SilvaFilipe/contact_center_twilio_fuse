'use strict'

const twilio = require('twilio')

/* client for Twilio TaskRouter
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)
 */

const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN)


module.exports.assignment = function (req, res) {
	res.setHeader('Content-Type', 'application/json')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(JSON.stringify({ }, null, 3))
}

module.exports.agentToConference = function (req, res) {
    var task_sid = req.query.task_sid;
    var reservation_sid = req.query.reservation_sid;
    var agent_uri = req.query.agent_uri;
    var caller_number = req.query.caller_number;

    var twiml = '<Response><Dial><Conference statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events"  startConferenceOnEnter="false" statusCallbackEvent="start end join leave mute hold">' + reservation_sid + '</Conference></Dial></Response>';
    var escaped_twiml = require('querystring').escape(twiml);

    client.calls.create({
        url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
        to: agent_uri,
        from: caller_number,
        statusCallback: process.env.PUBLIC_HOST + '/listener/call_events',
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["answered", "completed"],
        method: "GET"
    }, function(err, call) {
        process.stdout.write('Dialed ' + agent_uri + ' for '+ reservation_sid + ': ' + call.sid);
    });

}



module.exports.moveToConference = function (req, res) {

    var agent_sid = req.query.agent_sid;
    var caller_sid = req.query.caller_sid;
    var task_sid = req.query.task_sid;
    var twiml = '<Response><Dial><Conference beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + task_sid + '</Conference></Dial></Response>';
    var escaped_twiml = require('querystring').escape(twiml);

    client.calls(caller_sid).update({
        url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
        method: "GET"
    }, function(err, call) {
        console.log(err);
        client.calls(agent_sid).update({
            url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
            method: "GET"
        }, function(err, call) {
            console.log(err);
        });
    });

    console.log ('moved ' + agent_sid + ' and ' + caller_sid + ' to conference ' + task_sid);

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=0')
    res.send(JSON.stringify( 'ok' , null, 3))


}
