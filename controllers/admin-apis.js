'use strict'
const Did = require('../models/did.model');
const User = require('../models/user.model');
const twilio = require('twilio')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)
const Promise = require('bluebird');

module.exports.showSipQR = function (req, res) {
  var email = req.query.email;
  User.findOne({"email":email}, function(err, user){
    if (err){return res.status(500).json(err);}
    user.sipConfigQRCode(function(err, uri){
      if (err){return res.status(500).json(err);}
      res.send(`<img src="${uri}"/>`);
    });
  });
}


module.exports.showSipInfo = function (req, res) {
  var email = req.query.email;
  User.findOne({"email":email}, function(err, user){
    if (err){return res.status(500).json(err);}
    user.sipConfigQRCode(function(err, uri){
      if (err){return res.status(500).json(err);}
      res.send(`

<p>To use a SIP phone or mobile app, set Sip Address to ${user.friendlyWorkerName}@${process.env.SIP_DOMAIN}.sip.us1.twilio.com</p>
<table><tr>
<td>Mobile App Installation</td>
<td><a href="https://play.google.com/store/apps/details?id=com.grandstream.wave" target="_blank"><img alt="Download Grandstream Wave" src="http://www.grandstream.com/sites/default/files/googleplay.png" style="height:35px; width:100px" title="Download Grandstream Wave"></a></td>
<td><a href="https://itunes.apple.com/us/app/grandstream-wave/id1029274043?ls=1&amp;mt=8" target="_blank"><img alt="Grandstream Wave iOS" src="http://www.grandstream.com/sites/default/files/apple_App_Store_Badge.png" style="height:35px; width:120px" title="Grandstream Wave iOS"></a></td>
</tr></table>
</p>
<p>To configure mobile app, choose: "Settings", "Account Settings", "+", "Scan QR Code"</p>
<p>After scanning code below, touch "Add New Account"</p>
<img src="${uri}"/>
`);
    });
  });
}

module.exports.didSearch = function (req, res) {
  var areaCode = req.query.areacode;
  var tollFree = req.query.tollfree;
  var countryCode = req.query.countryCode;

  if (tollFree === "1"){
    client.availablePhoneNumbers(countryCode).tollFree.list({
      voiceEnabled: true,
      smsEnabled: true
    }, function(err, data) {
      if (err) {
        console.log(err);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.statusCode = 500;
        res.send(err)
      } else {
        console.log(data);
        res.setHeader('Cache-Control', 'public, max-age=0')
        res.send(data.available_phone_numbers)
      }
    });
  } else {
    if (areaCode) {
      client.availablePhoneNumbers(countryCode).local.list({
        areaCode: areaCode,
        voiceEnabled: true
      }, function(err, data) {
        if (err) {
          console.log(err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.statusCode = 500;
          res.send(err)
        } else {
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send(data.available_phone_numbers)
        }
      });
    }
    else {
      client.availablePhoneNumbers(countryCode).local.list({
        voiceEnabled: true
      }, function(err, data) {
        if (err) {
          console.log(err);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.statusCode = 500;
          res.send(err)
        } else {
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.send(data.available_phone_numbers)
        }
      });
    }

  }

};

module.exports.didPurchase = function (req, res) {
  var phoneNumber = req.body.phoneNumber;
  var userId = req.body.userId;
  console.log(phoneNumber);
  var inUseTest = Did.findByNumber(phoneNumber, function (err, existingDid) {
    if (existingDid){
      console.log('number already purchased!')
      return res.status(500).json('Did already purchased');
    } else {
      client.incomingPhoneNumbers.create({
        phoneNumber:phoneNumber,
        voiceUrl: process.env.PUBLIC_HOST + '/api/agents/didInboundExtensionCall',
        voiceMethod: "GET",
        smsUrl: process.env.PUBLIC_HOST + '/api/agents/didInboundExtensionSms',
        smsMethod: "GET",
        statusCallback: process.env.PUBLIC_HOST + "/listener/log_statuscallback_event",
        statusCallbackMethod: "POST"
      }, function(buyError, number) {
        if (buyError) {
          console.error('Buying the number failed. Reason: '+ buyError.message);
          res.setHeader('Cache-Control', 'public, max-age=0')
          res.statusCode = 500;
          res.send(buyError)
        } else {
          console.log('Number purchased! Phone number is: '+ number.phoneNumber);
          var didModel = new Did();
          didModel.number = number.phoneNumber;
          didModel.sid = number.sid;
          didModel.save(function (err, newDid) {
            if(err) {
              res.setHeader('Cache-Control', 'public, max-age=0')
              res.statusCode = 500;
              res.send(err);
            } else {
              if (userId){
                User.findById(userId, function (err, user) {
                  if(err) return res.status(500).json(err);
                  user.dids.push(newDid._id);
                  user.save(function (userErr, user) {
                    if(userErr) return res.status(500).json(userErr);
                    res.setHeader('Cache-Control', 'public, max-age=0')
                    res.send(newDid);
                  })
                });
              } else {
                res.setHeader('Cache-Control', 'public, max-age=0')
                res.send(newDid);
              }
            }
          })
        }
      });
    }
  });
};

module.exports.didDelete = function (req, res) {
  let ids = [];
  let sids = [];
  let promises = [];

  for (let did of req.body.data) {
    ids.push(did.id);
    sids.push(did.sid);
  }

  function deleteDidFromTwilio(sid) {
    return new Promise(function(resolve, reject){
      client.incomingPhoneNumbers(sid).delete(function (err, deleted) {
        if (err) return reject(err);
        else {
          console.log('successfully deleted sid from twilio');
          return resolve('success');
        }
      });
    });
  }

  let index = -1;
  User.findById(req.params.user_id, function (err, user) {
    ids.filter(function (id) {
      index = user.dids.indexOf(id);
      if (index > -1) {
        user.dids.splice(index, 1);
      }
    });

    user.save(function (userErr, user) {
      if(userErr) return res.status(500).json(userErr);
      Did.remove({
        '_id': {$in: ids}
      }, function (err) {
        if (err) return res.status(500).json(err);
        for (let sid of sids) {
            promises.push(deleteDidFromTwilio(sid));
        }
        Promise.all(promises)
          .then(function(data){
            return res.status(200).json('Successfully deleted!');
          })
          .catch(function(err){
            return res.status(500).json(err);
          });

      });
    })
  });
};

module.exports.recordVoicemailGreetingCall = function (req,res){
  var number = req.query.number;
  var retry = req.query.retry;
  var userId = req.query.userId;
  var recording = req.query.RecordingUrl;

  if (number){
    //var twiml = '<Response><Say voice="alice">Hello.  At the beep, please record your new voicemail greeting.  Press star when youre done.  Lets get started.</Say><Record action="' + process.env.PUBLIC_HOST + '/api/admin/setVoicemailGreeting?userId=' + userId + '" method="GET" maxLength="60" finishOnKey="*"  />  <Say>Sorry, I did not receive a recording.</Say></Response>';
    var twiml = '<Response><Play>' + process.env.PUBLIC_HOST  + '/sounds/voicemail/hello_record_at_beep.mp3</Play><Record action="' + process.env.PUBLIC_HOST + '/api/admin/setVoicemailGreeting?userId=' + userId + '" method="GET" maxLength="60" finishOnKey="*"  />  <Say>Sorry, I did not receive a recording.</Say></Response>';
    var escaped_twiml = require('querystring').escape(twiml);
    client.calls.create({
      url: "http://twimlets.com/echo?Twiml=" + escaped_twiml ,
      method: "GET",
      to: number,
      from: req.configuration.twilio.callerId,
    }, function(err, call) {
      if (err){
        console.log(err);
        return res.status(500).json('Sorry we could not call that number.  Please try again');
      } else {
        console.log ("calling phone %s for voicemail", number);
        res.send(JSON.stringify( 'A call to record your voice mail greeting is on the way.' , null, 3))
      }
    });
  } else if (retry){
    //var twiml = '<Response><Say voice="alice">Hello.  At the beep, please record your new voicemail greeting.  Press star when youre done.  Lets get started.</Say><Record action="' + process.env.PUBLIC_HOST + '/api/admin/setVoicemailGreeting?userId=' + userId + '" method="GET" maxLength="60" finishOnKey="*"  />  <Say voice="alice">Sorry, I did not receive a recording.</Say></Response>';
    var twiml = '<Response><Play>' + process.env.PUBLIC_HOST  + '/sounds/voicemail/hello_record_at_beep.mp3</Play><Record action="' + process.env.PUBLIC_HOST + '/api/admin/setVoicemailGreeting?userId=' + userId + '" method="GET" maxLength="60" finishOnKey="*"  />  <Say voice="alice">Sorry, I did not receive a recording.</Say></Response>';
    res.send(twiml)
  } else if (recording){
    User.findOne({"_id":userId}, function (err, user){
      if (err || user == null){
        console.log(err);
        var twiml = '<Response><Say>Sorry, an error occurred saving your voicemail.</Say></Response>';
        res.send(twiml)
      } else {
        console.log ("saving voicemail for %s", user.email);
        user.mailGreetingUrl=recording;
        user.save(function (err) {
          if(err){
            console.log(err);
            var twiml = '<Response><Say>Sorry, an error occurred saving your voicemail.</Say></Response>';
            res.send(twiml)
          } else {
            var twiml = '<Response><Gather action="' +  process.env.PUBLIC_HOST + '/api/admin/setVoicemailGreeting?retry=1&amp;userId=' + userId +'" method="GET"><Play>' + process.env.PUBLIC_HOST  + '/sounds/voicemail/received_recording.mp3</Play><Play>' + process.env.PUBLIC_HOST  + '/sounds/voicemail/hangup_if_satisifed_or_star_to_record_again.mp3</Play><Play>' + recording + '</Play><Play>' + process.env.PUBLIC_HOST  + '/sounds/voicemail/hangup_if_satisifed_or_star_to_record_again.mp3</Play></Gather><Say voice="alice">Your greeting has been set. Goodbye!</Say></Response>';
            res.send(twiml)
          }
        })
      }
    });
  }

}


