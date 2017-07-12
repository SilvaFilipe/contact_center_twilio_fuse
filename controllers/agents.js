'use strict';
var AccessToken = require('twilio').AccessToken;
var IpMessagingGrant = AccessToken.IpMessagingGrant;
const colors = require('colors');
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
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
  const lifetime = 60 * 60 * 24  * 7 // 1 week in seconds
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
        var token = new twilio.AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET);
        var ipmGrant = new IpMessagingGrant({
          serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
          endpointId: process.env.TWILIO_IPM_SERVICE_SID + worker.friendlyName  + req.body.endpoint
        });
        token.addGrant(ipmGrant);
        token.identity = worker.friendlyName ;

        var tokens = {
          worker: workerCapability.generate(lifetime),
          phone: phoneCapability.generate(lifetime),
          chat: token.toJwt()
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
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=0')
  res.send(twiml.toString())
}

module.exports.sendToCallSidConference = function (req, res) {
  var callSid = req.query.CallSid;
  var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="' + process.env.CALL_RECORDING_DEFAULT + '"><Conference endConferenceOnExit="false" waitMethod="GET" waitUrl="'+ process.env.PUBLIC_HOST  + '/sounds/ringing.xml" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + callSid + '</Conference></Dial></Response>';
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
  var twiml = '<Response><Play>' + process.env.PUBLIC_HOST  + '/sounds/downchime.mp3</Play><Pause length="86400"/><Redirect/></Response>';
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


module.exports.dialCustomerTransfer = function (req, res) {
  var toNumber = req.query.toNumber;
  var caller_sid = req.query.caller_sid;
  console.log('transfer call %s to %s', caller_sid, toNumber );
  if (toNumber.length < 5){
    console.log('transferring to extension call');
    req.query.CallSid = caller_sid
    req.query.From = req.configuration.twilio.callerId
    req.query.extension = toNumber
    module.exports.extensionInboundCall(req,res);
  } else {
    var twiml = '<Response><Dial>' + toNumber + '</Dial></Response>';
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
        console.log ("transferred " + caller_sid + ' to  ' + toNumber);
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send(JSON.stringify( 'OK' , null, 3))
      }
    });
  }
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
          console.log('userToDial: ' + userToDial.email);
          User.findOne({'_id': req.query.user_id}, function (err, thisUser) {
            if (err) {
              console.log ('error finding user ' + req.query.user_id);
              res.setHeader('Cache-Control', 'public, max-age=0')
              res.send("ERROR")
            } else {
              console.log ('found user ' + thisUser.email);
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

                  // TODO also call SIP phone
                  if (userToDial.sipURI != undefined && userToDial.sipURI.length > 0) {
                    console.log('extension call to ' + userToDial.sipURI)
                    // Dial a SIP phone with a timeout
                    // dont record the sip leg or you get double transcriptions
                    var sipTwiml = '<Response><Dial><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="' + process.env.PUBLIC_HOST + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + confName+ '</Conference></Dial></Response>';
                    var escaped_twiml = require('querystring').escape(sipTwiml);
                    var toSipURI = userToDial.sipURI;
                    if (userToDial.sipURI.indexOf("sip:") == -1) {
                      toSipURI = 'sip:' + userToDial.sipURI;
                    }
                    client.calls.create({
                      url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
                      to: toSipURI,
                      from: req.configuration.twilio.callerId,
                      timeout: 15
                    }, function (err, sipCall) {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log('created outbound to SIP call ' + sipCall.sid);
                        newCall.sipCallSid = sipCall.sid;
                        newCall.save(function (err) {
                          if (err) {
                            console.log(err);
                          } else {
                            newCall.saveSync();
                          }
                        });

                        // insert into db
                        // var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
                        // var newCall = new Call( Object.assign(dbFields) );
                        // newCall.save(function (err) {
                        //   if(err){ console.log(err);}
                        // });
                      }
                    });
                  }


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

    User.findOne({'_id': req.query.user_id}).populate('dids').exec(function (err, userRequestingDial) {
      var fromNumber = req.configuration.twilio.callerId

      if (!err && userRequestingDial != null) {
        console.log('userRequestingDial: ' + userRequestingDial.email);
        if (userRequestingDial.dids.length>0){
          fromNumber=userRequestingDial.dids[0].number;
        }
        if (userRequestingDial.forwarding && userRequestingDial.forwarding.length >= 10){
          fromNumber=userRequestingDial.forwarding
        }
      }
      console.log('fromNumber: ' + fromNumber);

      client.calls.create({
        url: process.env.PUBLIC_HOST + "/api/agents/sendToCallSidConference",
        method: "GET",
        to: req.query.phone,
        from: fromNumber,
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
          var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date(), queue: req.query.queue};
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
                    res.setHeader('Cache-Control', 'public, max-age=0')
                    res.send("ERROR")
                  } else {
                    console.log('updated call(2) ' + call2.callSid);
                    call2.addUserIds(req.query.user_id);
                    call2.createSync(function (response) {
                      if (response != 'err') {
                        res.setHeader('Cache-Control', 'public, max-age=0');
                        res.send({call: call, document: JSON.parse(response).unique_name})
                      } else {
                        console.log(response)
                        res.setHeader('Cache-Control', 'public, max-age=0')
                        res.send({call: call, document: null})
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
                } else {
                  console.log(response)
                  res.setHeader('Cache-Control', 'public, max-age=0')
                  res.send({call: call, document: null})
                }
              });
            }
          });
        }
      });

    });

  }
}

function addSipUserToCallSid(sipAddress, callSid){
  console.log('addSipUserToCallSid called %s %s', sipAddress, callSid);
  User.findOne({ sipURI: sipAddress }, function (err, foundUser) {
    if (err) {
      console.log('err finding user by sip address ' + err);
    } else {
      if (foundUser!=null){
        Call.findOne({ callSid: callSid}, function (err, foundCall) {
          if (foundCall==null) {
            console.log('could not find call to add user_id: ' + callSid);
          } else {
            console.log('found call ' + callSid + ' and adding ' + foundUser._id);
            foundCall.addUserIds(foundUser._id);
            foundCall.save();
          }
        });
      }
    }
  });
}

module.exports.registeredSipOutboundCall= function (req, res) {
  // termination for registered SIP client
  listener.log_twiml_event(req);
  var to = req.query.To; //sip:8583829141@kismettest.sip.us1.twilio.com:5060;user=phone
  var from = req.query.From; //sip:test@kismettest.sip.us1.twilio.com:5060
  console.log("outbound SIP call to %s from %s", to, from);
  var callerId=req.configuration.twilio.callerId;
  var numberToCall = to.split('@')[0].split(":")[1];

  try {
    var phoneNumber = phoneUtil.parseAndKeepRawInput(numberToCall, process.env.DEFAULT_COUNTY_CODE);
    var isPossible = phoneUtil.isPossibleNumber(phoneNumber);
    if (!isPossible){
      console.log('%s not possible, trying as country', numberToCall);
      phoneNumber = phoneUtil.parseAndKeepRawInput('+' + numberToCall, process.env.DEFAULT_COUNTY_CODE);
    }
    var toCallE164 = phoneUtil.format(phoneNumber, PNF.E164);
    console.log ('e164 %s', toCallE164);
    numberToCall = toCallE164;
    // if (process.env.DEFAULT_COUNTY_CODE == "44" && numberToCall.length==10){
    //   numberToCall = "44" + numberToCall
    // }
    var sipAddress = from.split(":")[1];
    setTimeout(addSipUserToCallSid, 1000, sipAddress, req.query.CallSid);
    if (numberToCall.length < 5) {
      req.query.To = numberToCall;
      console.log("SIP dialing extension: " + numberToCall);
      module.exports.extensionInboundCall(req,res);
    } else {
      console.log("dialing PSTN: " + numberToCall);
      User.findOne({ sipURI: sipAddress })
        .populate('dids')
        .exec(function (err, userToDial) {
          if (err) {return res.status(500).json(err);}
          if (!userToDial) {
            console.log("could not find user with sipAddress: " + sipAddress);
          } else {
            console.log('found user dialing: ' + userToDial.email)
            var did = userToDial.dids[0];
            if (did!=null){
              callerId=did.number;
              console.log('set callerid as did: ' + callerId)
            }
            if (userToDial.forwarding && userToDial.forwarding.length >= 10){
              callerId=userToDial.forwarding
              console.log('set callerid as forwarding: ' + callerId)
            }
          }


          var twiml = '<Response><Dial ringTone ="' + process.env.DEFAULT_COUNTY_CODE+ '" callerId="' + callerId + '" recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="' + process.env.CALL_RECORDING_DEFAULT + '">' + numberToCall  + '</Dial></Response>';
          res.send(twiml)
        });
    }
  } catch (e) {
    console.log("*** Error in registeredSipOutboundCall ***");
    console.log(e);
    var twiml = '<Response><Dial callerId="' + callerId + '" recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="' + process.env.CALL_RECORDING_DEFAULT + '">' + numberToCall  + '</Dial></Response>';
    res.send(twiml)
  }

}

module.exports.extensionInboundCall = function (req, res) {
  setTimeout(function() {
    // workaround to wait for call to be inserted in db, TODO find a better way
    var fromSipAddress = unescape(req.query.From);
    if (req.query.extension){
      // called from ivr selectExtension or from transfer dialCustomerTransfer
      var toNumber = unescape(req.query.extension);
    } else {
      // called from SIP to extension (registeredSipOutboundCall)
      var toNumber = unescape(req.query.To);
    }
    console.log('extensionInboundCall call from %s to %s', fromSipAddress, toNumber);

    User.findOne({ extension: toNumber }, function (err, userToDial) {
      if (err){ return res.status(500).json(err); }
      if (!userToDial){ return res.status(500).send(toNumber + ' not found in any users extension') }
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
              callerName: fromSipAddress,
              fromNumber: fromSipAddress
            }
          };
          sync.saveList('m' + userToDial._id, mData);

          var twiml = '<Response><Dial  recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="' + process.env.CALL_RECORDING_DEFAULT + '"><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="'+ process.env.PUBLIC_HOST  + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.CallSid + '</Conference></Dial></Response>';
          if (userToDial.sipURI!=undefined && userToDial.sipURI.length>0){
            // Dial a SIP phone with a timeout
            var escaped_twiml = require('querystring').escape(twiml);
            var toSipURI = userToDial.sipURI;
            if (userToDial.sipURI.indexOf("sip:")==-1){
              toSipURI = 'sip:' + userToDial.sipURI;
            }
            console.log('creating extension call leg from %s to %s url %s', fromSipAddress, toSipURI, twiml)
            fromSipAddress = fromSipAddress.split(":")[1];
            User.findOne({ sipURI: fromSipAddress }, function(err, user){
              var fromCallerId=req.configuration.twilio.callerId;
              if (user!=null){
                fromCallerId=user.extension;
              }
              console.log('fromNumber is ' + fromCallerId);
              client.calls.create({
                url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
                to: toSipURI,
                from: fromCallerId,
                timeout: 14
              }, function(err, call) {
                if (err){
                  console.log(err);
                } else {
                  console.log('created outbound to SIP call ' + call.sid + ' to ' + toSipURI);
                  // insert into db
                  // var dbFields = { user_id: req.query.user_id, from: req.configuration.twilio.callerId, callSid: call.sid, to: req.query.phone, updated_at: new Date()};
                  // var newCall = new Call( Object.assign(dbFields) );
                  // newCall.save(function (err) {
                  //   if(err){ console.log(err);}
                  // });
                }
              });
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
  console.log('inbound call from: %s to %s', fromNumber, toNumber);
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
          console.log('could not find any user to dial')
          return res.send('<Response><Redirect method="GET">/api/ivr/welcomePBX</Redirect></Response>');
          //return res.status(500).send(fromNumber + ' not found in any users dids')
        }
        console.log ('found user ' + userToDial.email)
        setTimeout(function() { // pause to ensure callSid is in db
          Call.findOne({'callSid': req.query.CallSid}, function (err, call) {
            if (err) {
              return res.status(500).json(err);
            }

            call.addUserIds([userToDial._id]);
            call.conferenceFriendlyName = req.query.CallSid;
            call.save(function (err) {
              if (err) {
                return res.status(500).json(err);
              }
              call.saveSync();
              // create sync item in userMessages
              var mData = {
                type: 'inboundCall',
                data: {
                  callSid: call.callSid,
                  conferenceFriendlyName: req.query.CallSid,
                  callerName: fromNumber,
                  fromNumber: fromNumber
                }
              };
              sync.saveList('m' + userToDial._id, mData);

              if (userToDial.sipURI != undefined && userToDial.sipURI.length > 0) {
                // Dial a SIP phone with a timeout
                // dont record the sip leg or you get double transcriptions
                var sipTwiml = '<Response><Dial><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="' + process.env.PUBLIC_HOST + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.CallSid + '</Conference></Dial></Response>';
                var escaped_twiml = require('querystring').escape(sipTwiml);
                var toSipURI = userToDial.sipURI;
                if (userToDial.sipURI.indexOf("sip:") == -1) {
                  toSipURI = 'sip:' + userToDial.sipURI;
                }
                client.calls.create({
                  url: "http://twimlets.com/echo?Twiml=" + escaped_twiml,
                  to: toSipURI,
                  from: fromNumber,
                  timeout: 15
                }, function (err, sipCall) {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log('created outbound to SIP call ' + sipCall.sid);
                    call.sipCallSid = sipCall.sid;
                    call.save(function (err) {
                      if (err) {
                        console.log(err);
                      } else {
                        call.saveSync();
                      }
                    });

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
              var twiml = '<Response><Dial recordingStatusCallback="' + process.env.PUBLIC_HOST + '/listener/recording_events" recordingStatusCallbackMethod="GET" record="' + process.env.CALL_RECORDING_DEFAULT + '"><Conference endConferenceOnExit="false" waitMethod="POST" waitUrl="' + process.env.PUBLIC_HOST + '/api/callControl/play_ringing" beep="false" statusCallback="' + process.env.PUBLIC_HOST + '/listener/conference_events" statusCallbackEvent="start end join leave mute hold">' + req.query.CallSid + '</Conference></Dial></Response>';
              res.send(twiml)
            });
          })
        }, 250);



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
        if (callEvent.conferenceStatusCallbackEvent=="conference-start" || callEvent.conferenceStatusCallbackEvent=="conference-end"){
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
