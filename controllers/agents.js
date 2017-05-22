'use strict';

const colors = require('colors');
const async 	= require('async');
const twilio = require('twilio');
const uuidV1 = require('uuid/v1');
const sync = require('../controllers/sync.js');
const listener = require('./event_listener.js')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN);

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_WORKSPACE_SID)

const Call = require('../models/call.model');
const User = require('../models/user.model');
const Did = require('../models/did.model');
const callController = require('./call-control.js')

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
    node.conference(req.query.workerName, {waitUrl: process.env.PUBLIC_HOST  + "/api/callControl/play_ringing", waitMethod: "POST"})
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
  var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="record-from-answer-dual"><Conference endConferenceOnExit="false" waitMethod="GET" waitUrl="'+ process.env.PUBLIC_HOST  + '/sounds/ringing.xml" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + callSid + '</Conference></Dial></Response>';
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send(twiml.toString())
}


module.exports.agentToSilence = function (req, res) {

  var caller_sid = req.query.caller_sid;
  var twiml = '<Response><Pause length="86400"/><Redirect/></Response>';
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
      console.log ("moved agent " + caller_sid + ' silence');
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(JSON.stringify( 'OK' , null, 3))
    }
  });

}

module.exports.toCallEnded = function (req, res) {

  var caller_sid = req.query.caller_sid;
  var twiml = '<Response><Play>' + process.env.PUBLIC_HOST  + '/sounds/bing-low.wav</Play><Pause length="86400"/><Redirect/></Response>';
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
      console.log ("moved agent " + caller_sid + ' silence');
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(JSON.stringify( 'OK' , null, 3))
    }
  });

}



module.exports.agentToConference = function (req, res) {

  var roomName = req.query.roomName;
  var caller_sid = req.query.caller_sid;
  var twiml = '<Response><Dial><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="'+ process.env.PUBLIC_HOST  + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + roomName + '</Conference></Dial></Response>';
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
        return res.send("ERROR")
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
              var dbFields = { callSid: uuidV1(), recipientName: userToDial.fullName, callerName: thisUser.fullName, user_id: req.query.user_id, from: thisUser.extension, conferenceFriendlyName:confName, to: req.query.phone, updated_at: new Date(), direction: 'extension'};
              var newCall = new Call( Object.assign(dbFields) );

              console.log('using addUserIds'.underline.red);

              newCall.addUserIds([req.query.user_id, userToDial._id]);

              newCall.save(function (err) {
                if(err){
                  console.log(err);
                  res.setHeader('Cache-Control', 'public, max-age=0')
                  res.send("ERROR")
                } else {
                  console.log('saved new extension call ' + newCall.callSid);
                  newCall.saveSync();
                  // create sync item in userMessages
                  var mData = {type: 'inboundCall', data: {callSid: newCall.callSid, conferenceFriendlyName: confName, callerName: newCall.callerName, fromNumber: newCall.from}};
                  sync.saveList ('m' + userToDial._id, mData);
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
        console.log('using addUserIds'.underline.red);
        console.log('call to: ', req.query.phone);

        newCall.addUserIds(req.query.user_id);
        newCall.save(function (err) {
          if(err){
            console.log(err);
            if (err.code && err.code === 11000) {
              console.log("unique constraint error on call");
              Call.findOneAndUpdate({'callSid': call.sid}, {$set:dbFields}, function(err, call2){
                if(err) {
                  console.log("Something wrong when updating call: " + err);
                } else {
                  console.log('updated call(2) ' + call2.callSid);
                  call2.addUserIds(req.query.user_id);
                  call2.createSync(function (response) {
                    if (response != 'err') {
                      res.setHeader('Cache-Control', 'public, max-age=0');
                      res.send({call: call, document: JSON.parse(response).unique_name})
                    }
                  });
                }
              });

            }
          } else {
            newCall.createSync(function (response) {
              if (response != 'err') {
                res.setHeader('Cache-Control', 'public, max-age=0');
                res.send({call: call, document: JSON.parse(response).unique_name})
              }
            });
          }
        });

      }
    });
  }
}


module.exports.registeredSipOutboundCall= function (req, res) {
  listener.log_twiml_event(req);
  var to = req.query.To; //sip:8583829141@kismettest.sip.us1.twilio.com:5060;user=phone
  var from = req.query.From; //sip:test@kismettest.sip.us1.twilio.com:5060
  console.log("outbound SIP call to %s from %s", to, from);
  var numberToCall = to.split('@')[0].split(":")[1];
  if (numberToCall.length < 5) {
    req.query.To = numberToCall;
    console.log("SIP dialing extension: " + numberToCall);
    module.exports.extensionInboundCall(req,res);
  } else {
    console.log("dialing: " + numberToCall);
    var twiml = '<Response><Dial>' + numberToCall  + '</Dial></Response>';
    res.send(twiml)
  }
}

module.exports.extensionInboundCall = function (req, res) {
  // right now only called from SIP to extension (registeredSipOutboundCall)
  setTimeout(function() {
    // workaround to wait for call to be inserted in db, TODO find a better way
    var fromNumber = unescape(req.query.From);
    var toNumber = unescape(req.query.To);
    console.log('inbound call from: %s to %s' + fromNumber, toNumber);

    User.findOne({ extension: toNumber }, function (err, userToDial) {
      if (err){ return res.status(500).json(err); }
      if (!userToDial){ return res.status(500).send(fromNumber + ' not found in any users extension') }
      console.log ('found user ' + userToDial.email)
      Call.findOne({'callSid': req.query.CallSid}, function (err, call){
        if (err){
          return res.status(500).json(err);
        }
        if (call==null){
          console.log('could not find CallSid %s', req.query.CallSid);
          return res.status(500).json(err);
        }
        call.addUserIds([userToDial._id]);
        call.conferenceFriendlyName=req.query.CallSid;
        call.save(function (err) {
          if (err){
            return res.status(500).json(err);
          }
          call.saveSync();
          // create sync item in userMessages
          var mData = {type: 'inboundCall',
            data: {
              callSid: call.callSid,
              conferenceFriendlyName: req.query.CallSid,
              callerName: fromNumber,
              fromNumber: fromNumber
            }
          };
          sync.saveList('m' + userToDial._id, mData);

          var twiml = '<Response><Dial  recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="record-from-answer-dual"><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="'+ process.env.PUBLIC_HOST  + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.CallSid + '</Conference></Dial></Response>';
          if (userToDial.sipURI.length>0){
            // Dial a SIP phone with a timeout
            var escaped_twiml = require('querystring').escape(twiml);
            client.calls.create({
              url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
              to: 'sip:' + userToDial.sipURI,
              from: fromNumber,
              timeout: 14
            }, function(err, call) {
              if (err){
                console.log(err);
              } else {
                console.log('created outbound to SIP call ' + call.sid);
                // insert into db
                // var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
                // var newCall = new Call( Object.assign(dbFields) );
                // newCall.save(function (err) {
                //   if(err){ console.log(err);}
                // });
              }
            });
          }

          //var twiml = '<Response><Dial answerOnBridge="true"><Sip>test@kismettest.sip.us1.twilio.com</Sip> </Dial></Response>';
          setTimeout(inboundExtensionCallToVoicemail, 15000, req.query.CallSid);
          res.send(twiml)
        });
      })
    });
  }, 500);
};


module.exports.didInboundExtensionCall = function (req, res) {
  listener.log_twiml_event(req);
  var fromNumber = unescape(req.query.From);
  var toNumber = unescape(req.query.To);
  console.log('inbound call from: %s to %s' + fromNumber, toNumber);
  Did.findOne({'number': toNumber}, function (err, did) {
    if (err) {
      console.log ('error finding extension by did: ' + err);
      return res.status(500).json(err)
    } else {
      if (!did){
        return res.status(500).send(toNumber + ' not found in Dids')
      }
      User.findOne({ dids:  did._id }, function (err, userToDial) {
        if (err){
          return res.status(500).json(err);
        }
        if (!userToDial){
          return res.status(500).send(fromNumber + ' not found in any users dids')
        }
        console.log ('found user ' + userToDial.email)
        Call.findOne({'callSid': req.query.CallSid}, function (err, call){
          if (err){
            return res.status(500).json(err);
          }

          call.addUserIds([userToDial._id]);
          call.conferenceFriendlyName=req.query.CallSid;
          call.save(function (err) {
            if (err){
              return res.status(500).json(err);
            }
            call.saveSync();
            // create sync item in userMessages
            var mData = {type: 'inboundCall',
              data: {
                callSid: call.callSid,
                conferenceFriendlyName: req.query.CallSid,
                callerName: fromNumber,
                fromNumber: fromNumber
              }
            };
            sync.saveList('m' + userToDial._id, mData);

            var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="record-from-answer-dual"><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="'+ process.env.PUBLIC_HOST  + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.CallSid + '</Conference></Dial></Response>';

            if (userToDial.sipURI.length>0){
              // Dial a SIP phone with a timeout
              var escaped_twiml = require('querystring').escape(twiml);
              client.calls.create({
                url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
                to: 'sip:' + userToDial.sipURI,
                from: fromNumber,
                timeout: 14
              }, function(err, call) {
                if (err){
                  console.log(err);
                } else {
                  console.log('created outbound to SIP call ' + call.sid);
                  // insert into db
                  // var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
                  // var newCall = new Call( Object.assign(dbFields) );
                  // newCall.save(function (err) {
                  //   if(err){ console.log(err);}
                  // });
                }
              });
            }
            //var twiml = '<Response><Dial answerOnBridge="true"><Sip>test@kismettest.sip.us1.twilio.com</Sip> </Dial></Response>';
            setTimeout(inboundExtensionCallToVoicemail, 15000, req.query.CallSid);
            res.send(twiml)
          });
        })
      });
    }
  });
};

function inboundExtensionCallToVoicemail (callSid) {
  console.log('checking if inboundExtensionCall was answered: ' + callSid);
  Call.findOne({"callSid": callSid}, function (err, call){
    if (err){
      console.log(err);
    } else {
      var sendToVm=true;
      call.callEvents.forEach(function (callEvent){
        if (callEvent.conferenceStatusCallbackEvent=="conference-start"){
          sendToVm=false;
        }
      });
      console.log("sendToVm: "+ sendToVm);
      if (sendToVm){
        callController.toVoicemailCallSid(callSid, function(err, call){
          if (err){
            console.log(err);
          } else{
            console.log('sent call to VM: ' + call.sid);
          }
        });
      }
    }
  });
}
/*


  User.findOne({'extension': parseInt(req.query.phone)}, function (err, userToDial) {
    if (err) {
      console.log ('error finding user by extension: ' + err);
      res.setHeader('Cache-Control', 'public, max-age=0')
      return res.send("ERROR")
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
            var dbFields = { callSid: uuidV1(), recipientName: userToDial.fullName, callerName: thisUser.fullName, user_id: req.query.user_id, from: thisUser.extension, conferenceFriendlyName:confName, to: req.query.phone, updated_at: new Date(), direction: 'extension'};
            var newCall = new Call( Object.assign(dbFields) );

            console.log('using addUserIds'.underline.red);

            newCall.addUserIds([req.query.user_id, userToDial._id]);

            newCall.save(function (err) {
              if(err){
                console.log(err);
                res.setHeader('Cache-Control', 'public, max-age=0')
                res.send("ERROR")
              } else {
                console.log('saved new extension call ' + newCall.callSid);
                newCall.saveSync();
                // create sync item in userMessages
                var mData = {type: 'inboundCall', data: {callSid: newCall.callSid, conferenceFriendlyName: confName, callerName: newCall.callerName, fromNumber: newCall.from}};
                sync.saveList ('m' + userToDial._id, mData);
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



}
*/
