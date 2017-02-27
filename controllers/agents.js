'use strict'

const async 	= require('async')
const twilio = require('twilio')
const uuidV1 = require('uuid/v1');
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_WORKSPACE_SID)

const Call = require('../models/call.model');
const User = require('../models/user.model');

module.exports.login = function (req, res) {
  var friendlyName = req.body.worker.friendlyName

  /* all token we generate are valid for 1 hour */
  const lifetime = 3600

  taskrouterClient.workspace.workers.get({FriendlyName: friendlyName}, function (err, data) {
    if (err) {
      res.status(500).json(err)
      return
    }

    for (var i = 0; i < data.workers.length; i++) {
      var worker = data.workers[i]

      if (worker.friendlyName === friendlyName) {
        /* create a token for taskrouter */
        var workerCapability = new twilio.TaskRouterWorkerCapability(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
          process.env.TWILIO_WORKSPACE_SID, worker.sid)

        workerCapability.allowActivityUpdates()
        workerCapability.allowReservationUpdates()
        workerCapability.allowFetchSubresources()

        /* create a token for Twilio client */
        var phoneCapability = new twilio.Capability(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN)

        phoneCapability.allowClientOutgoing(req.configuration.twilio.applicationSid)
        phoneCapability.allowClientIncoming(friendlyName.toLowerCase())

        /* create token for Twilio IP Messaging */
        var grant = new twilio.AccessToken.IpMessagingGrant({
          serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
          endpointId: req.body.endpoint
        })

        var accessToken = new twilio.AccessToken(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_API_KEY,
          process.env.TWILIO_API_SECRET,
          { ttl: lifetime })

        accessToken.addGrant(grant)
        accessToken.identity = worker.friendlyName

        var tokens = {
          worker: workerCapability.generate(lifetime),
          phone: phoneCapability.generate(lifetime),
          chat: accessToken.toJwt()
        }

        req.session.tokens = tokens;
        req.session.worker = worker;

        return res.json(req.user);
      }

    }
    res.status(404).end()

    return
  })
}

module.exports.logout = function (req, res) {

  req.session.destroy(function (err) {
    if (err) {
      res.status(500).json(err)
    } else {
      res.status(200).end()
    }
  })

}

module.exports.getSession = function (req, res) {
  if (!req.session.worker) {
    res.status(403).end()
  } else {

    res.status(200).json({
      tokens: req.session.tokens,
      worker: req.session.worker,
      configuration: {
        twilio: req.configuration.twilio
      }
    })

  }
}

module.exports.call = function (req, res) {
  var twiml = new twilio.TwimlResponse()

  twiml.dial({ callerId: req.configuration.twilio.callerId }, function (node) {
    node.conference(req.query.workerName, {waitUrl: "/sounds/ringing.xml", waitMethod: "GET"})
  });
  /*

   var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" record="record-from-answer-dual"><Conference endConferenceOnExit="true" waitMethod="GET" waitUrl="/sounds/ringing.xml" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.workerName + '</Conference></Dial></Response>';
   var escaped_twiml = require('querystring').escape(twiml);
   client.calls.create({
   url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
   to: req.query.phone,
   from: req.configuration.twilio.callerId,
   statusCallback: process.env.PUBLIC_HOST + '/listener/call_events',
   statusCallbackMethod: "POST",
   statusCallbackEvent: ["initiated", "answered", "completed"]
   }, function(err, call) {
   if (err){
   console.log(err);
   } else {
   console.log('created outbound call ' + call.sid);
   // insert into db
   var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
   var newCall = new Call( Object.assign(dbFields) );
   newCall.save(function (err) {
   if(err){ console.log(err);}
   });
   }
   });

   //req.query.phone
   // twiml.dial({ callerId: req.configuration.twilio.callerId }, function (node) {
   //   node.number(req.query.phone)
   // })
   */
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send(twiml.toString())
}

module.exports.sendToCallSidConference = function (req, res) {
  var callSid = req.query.CallSid;
  var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" record="record-from-answer-dual"><Conference endConferenceOnExit="false" waitMethod="GET" waitUrl="'+ process.env.PUBLIC_HOST  + '/sounds/ringing.xml" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + callSid + '</Conference></Dial></Response>';
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send(twiml.toString())
}


module.exports.agentToConference = function (req, res) {

  var roomName = req.query.roomName;
  var caller_sid = req.query.caller_sid;
  var twiml = '<Response><Dial><Conference endConferenceOnExit="false" waitMethod="GET" waitUrl="'+ process.env.PUBLIC_HOST  + '/sounds/ringing.xml" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + roomName + '</Conference></Dial></Response>';
  var escaped_twiml = require('querystring').escape(twiml);

  client.calls(caller_sid).update({
    url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
    method: "GET"
  }, function(err, call) {
    if (err){
      console.log(err);
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(JSON.stringify( 'ERROR' , null, 3))
    } else {
      console.log ("moved agent " + caller_sid + ' to room ' + roomName);
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(JSON.stringify( 'OK' , null, 3))
    }
  });

}


module.exports.outboundCall = function (req, res) {
  if (req.query.phone.length < 5) {
    console.log('dialing an extension: ' + req.query.phone);
    User.findOne({'extension': parseInt(req.query.phone)}, function (err, userToDial) {
      if (err) {
        console.log ('error finding user by extension: ' + err);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send("ERROR")
      } else {
        if (userToDial != null) {
          console.log('userToDial: ' + userToDial._id);
          User.findOne({'_id': req.query.user_id}, function (err, thisUser) {
            if (err) {
              console.log ('error finding user ' + req.query.user_id);
              res.setHeader('Cache-Control', 'public, max-age=0')
              res.send("ERROR")
            } else {
              console.log ('found user ' + thisUser._id);
              var confName = 'ex_' + req.query.phone + '_' + thisUser._id;
              // insert into db
              var dbFields = { callSid: uuidV1(), callerName: thisUser.fullName, user_id: req.query.user_id, from: thisUser.extension, conferenceFriendlyName:confName, to: req.query.phone, updated_at: new Date(), direction: 'outbound_extension'};
              var newCall = new Call( Object.assign(dbFields) );
              newCall.save(function (err) {
                if(err){
                  console.log(err);
                  res.setHeader('Cache-Control', 'public, max-age=0')
                  res.send("ERROR")
                } else {
                  newCall.saveSync();
                  // create sync item in userMessages
                  res.setHeader('Cache-Control', 'public, max-age=0')
                  res.send({call: newCall})
                }
              });
            }
          });
        } else {
          console.log('could not find user at this extension');
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send("ERROR")
        }
      }
    });
  } else {
    // dial phone number
    client.calls.create({
      url: process.env.PUBLIC_HOST + "/api/agents/sendToCallSidConference",
      method: "GET",
      to: req.query.phone,
      from: req.configuration.twilio.callerId,
      statusCallback: process.env.PUBLIC_HOST + '/listener/call_events',
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "answered", "completed"]
    }, function(err, call) {
      if (err){
        console.log(err);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send("ERROR")
      } else {
        console.log('created outbound call ' + call.sid);
        // insert into db
        var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
        var newCall = new Call( Object.assign(dbFields) );
        newCall.save(function (err) {
          if(err){
            console.log(err);
          } else {
            newCall.saveSync();
          }
        });
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send({call: call})
      }
    });
  }



}

