'use strict'

const twilio = require('twilio')
const Queue = require('../models/queue.model');
const Did = require('../models/did.model');
const User = require('../models/user.model');
const listener = require('./event_listener.js')
const Promise = require('bluebird');

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)


module.exports.didInboundCallHandler = function (req, res) {

  // primary handler for incoming calls
  var fromNumber = unescape(req.query.From);
  var toNumber = unescape(req.query.To);
  console.log('inbound call from: %s to %s', fromNumber, toNumber);

  Did.findOne({'number': toNumber}, function (err, did) {
    if (err) {
      console.log('error finding did: ' + err);
      module.exports.welcomePBX(req,res);
    } else {
      if (!did) {
        console.log('could not find did: ' + toNumber);
        module.exports.welcomePBX(req,res);
      } else {
        if (!did.flow){
          module.exports.welcomePBX(req,res);
        } else {

          let twiml = new twilio.TwimlResponse();
          if (did.greetingText){
            twiml.say(did.greetingText, {voice: 'alice'});
          }
          if (did.greetingAudioUrl){
            twiml.play(did.greetingAudioUrl);
          }


          // Render the response as XML in reply to the webhook request
          if (did.flow == "queues") {
            twiml.redirect('/api/ivr/welcome', {method: "GET"});
          } else if (did.flow=="conferenceCall"){
            twiml.dial(function(dialNode) { dialNode.conference(toNumber) });
          } else if (did.flow=="user"){
            twiml.redirect('/api/agents/didInboundExtensionCall', {method: "GET"});
          } else if (did.flow=="companyDirectory"){
            twiml.redirect('/api/ivr/welcomePBX', {method: "GET"});
          }

          res.type('text/xml');
          res.send(twiml.toString());

        }

      }
    }
  });
}

module.exports.welcome = function (req, res) {
  listener.log_twiml_event(req);
  var sayText='Please say or ';
  var twiml = new twilio.TwimlResponse()
  let keywords = []

  var promise = Queue.find({}).exec();
  promise.then(function(queues) {
    for (var digit=1; digit<queues.length; digit++){
      var queue = queues[digit-1];
      console.log('found queue %s', queue.name)
      sayText = sayText + 'Press ' + digit + ' for ' + queue.name + '. ';
      keywords.push(queue.name )
    }
    return; // returns a promise
  })
    .then(function() {
      console.log('beginning twiml');

      twiml.gather({
        input: 'dtmf speech',
        action: 'select-team',
        method: 'GET',
        numDigits: 1,
        timeout: 4,
        language: process.env.LANGUAGE_BCP47,
        hints: keywords.join()
      }, function (node) {
        node.say(sayText, {voice: 'alice'})
      })

      twiml.say('You did not say anything or enter any digits.')
      twiml.pause({length: 2})
      twiml.redirect({method: 'GET'}, 'welcome')

      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())
    })
    .catch(function(err){
      console.log('err: ' + err);
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry an INVRerror occurred</Say></Response>')
    });
}

module.exports.selectTeam = function (req, res) {
  listener.log_twiml_event(req);
  var selectedQueue=null;
  var promise = Queue.find({}).exec();
  if (req.query.SpeechResult) {
    console.log('speech ' + req.query.SpeechResult)
  }
  promise.then(function(queues) {
    for (var digit=1; digit<queues.length; digit++){
      var queue = queues[digit-1];
      if (req.query.Digits && parseInt(req.query.Digits) === digit) {
        selectedQueue = queue;
        console.log('selected ' + queue.name)
      }
      if (req.query.SpeechResult && req.query.SpeechResult.toLowerCase() == queue.name.toLowerCase()) {
        selectedQueue = queue;
        console.log('selected ' + queue.name)
      }
    }
    return; // returns a promise
  })
    .then(function() {
      console.log('got queue %s' + selectedQueue)
      var twiml = new twilio.TwimlResponse()

      /* the caller pressed a key that does not match any team */
      if (selectedQueue === null) {
        // redirect the call to the previous twiml
        twiml.say('Your selection was not valid, please try again')
        twiml.pause({length: 2})
        twiml.redirect({ method: 'GET' }, 'welcome')
      } else {
        twiml.gather({
          action: 'create-task?queueFriendlyName=' + encodeURIComponent(selectedQueue.taskQueueFriendlyName),
          method: 'GET',
          numDigits: 1,
          timeout: 3
        }, function (node) {
          node.say('OK lets connect to ' + selectedQueue.name + '. Press any key if you want a callback, if you want to talk to an agent please wait in the line')
        })

        /* create task attributes */
        var attributes = {
          text: 'Caller answered IVR with option "' + selectedQueue.name + '"',
          channel: 'phone',
          phone: req.query.From,
          name: req.query.From,
          title: 'Inbound call',
          type: 'inbound_call',
          queue: selectedQueue.taskQueueFriendlyName
        }

        twiml.enqueue({ workflowSid: req.configuration.twilio.workflowSid }, function (node) {
          node.task(JSON.stringify(attributes), {
            priority: 1,
            timeout: 3600
          })
        })
      }
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())

    })
    .catch(function(err){
      console.log(err)
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry an select team error occurred</Say></Response>')
    });

}

module.exports.selectTeamOld = function (req, res) {
  listener.log_twiml_event(req);
	var team = null

	for (var i = 0; i < req.configuration.ivr.options.length; i++) {
		if (parseInt(req.query.Digits) === req.configuration.ivr.options[i].digit) {
			team = req.configuration.ivr.options[i]
		}
	}

	var twiml = new twilio.TwimlResponse()

	/* the caller pressed a key that does not match any team */
	if (team === null) {
		// redirect the call to the previous twiml
		twiml.say('Your selection was not valid, please try again')
		twiml.pause({length: 2})
		twiml.redirect({ method: 'GET' }, 'welcome')
	} else {
		twiml.gather({
			action: 'create-task?teamId=' + team.id + '&teamFriendlyName=' + encodeURIComponent(team.friendlyName),
			method: 'GET',
			numDigits: 1,
			timeout: 5
		}, function (node) {
			node.say('Press any key if you want a callback, if you want to talk to an agent please wait in the line')
		})

		/* create task attributes */
		var attributes = {
			text: 'Caller answered IVR with option "' + team.friendlyName + '"',
			channel: 'phone',
			phone: req.query.From,
			name: req.query.From,
			title: 'Inbound call',
			type: 'inbound_call',
			team: team.id
		}

		twiml.enqueue({ workflowSid: req.configuration.twilio.workflowSid }, function (node) {
			node.task(JSON.stringify(attributes), {
				priority: 1,
				timeout: 3600
			})
		})

	}

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())
}

module.exports.createTask = function (req, res) {
	/* create task attributes */
	var attributes = {
		text: 'Caller answered IVR with option "' + req.query.queueFriendlyName + '"',
		channel: 'phone',
		phone: req.query.From,
		name: req.query.From,
		title: 'Callback request',
		type: 'callback_request',
		queue: req.query.queueFriendlyName
	}

	taskrouterClient.workspace.tasks.create({
		WorkflowSid: req.configuration.twilio.workflowSid,
		attributes: JSON.stringify(attributes)
	}, function (err, task) {

		var twiml = new twilio.TwimlResponse()

		if (err) {
			console.log(err)
			twiml.say('An application error occured, the demo ends now')
		}  else {
			twiml.say('Thanks for your callback request, an agent will call you back a soon as possible')
			twiml.hangup()
		}

		res.setHeader('Content-Type', 'application/xml')
		res.setHeader('Cache-Control', 'public, max-age=0')
		res.send(twiml.toString())
	})

}

module.exports.companyDirectory = function (req, res) {

  listener.log_twiml_event(req);
  var twiml = new twilio.TwimlResponse()
  let keywords = []
  var sayText='';
  var promise = User.find({}).exec();
  promise.then(function(users) {
    for (var digit=1; digit<users.length; digit++){
      var user = users[digit-1];
      if (user.extension){
        sayText = sayText + 'Press ' + user.extension + ' for ' + user.fullName+ '. ';
      }
      keywords.push(user.fullName )
    }
    return; // returns a promise
  })
    .then(function() {
      console.log('beginning twiml');
      twiml.gather({
        input: 'dtmf speech',
        action: 'select-extension',
        method: 'GET',
        timeout: 4,
        language: process.env.LANGUAGE_BCP47,
        hints: keywords.join()
      }, function (node) {
        node.say(sayText) //, {'voice':'alice'}
      })



      twiml.say('You did not say anything or enter any digits.')
      twiml.pause({length: 2})
      twiml.redirect({method: 'GET'}, 'welcomePBX')

      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())
    })
    .catch(function(err){
      console.log('err: ' + err);
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry a PBX IVR error occurred</Say></Response>')
    });

}

module.exports.selectExtension = function (req, res) {
  listener.log_twiml_event(req);
  var selectedUser=null;
  var promise = User.find({}).exec();
  if (req.query.SpeechResult) {
    console.log('speech ' + req.query.SpeechResult)
  }
  promise.then(function(users) {
    for (var digit=1; digit<users.length; digit++){
      var user = users[digit-1];
      if (req.query.Digits && parseInt(req.query.Digits) === user.extension) {
        selectedUser = user;
        console.log('selected ' + user.fullName)
      }
      if (req.query.SpeechResult && req.query.SpeechResult.toLowerCase() == user.fullName.toLowerCase()) {
        selectedUser = user;
        console.log('selected ' + user.fullName)
      }
    }
    return; // returns a promise
  })
    .then(function() {
      console.log('got user %s' + selectedUser)
      var twiml = new twilio.TwimlResponse()

      /* the caller pressed a key that does not match any team */
      if (req.query.Digits && req.query.Digits == "*") {
        twiml.redirect({ method: 'GET' }, 'company-directory')
      } else if (req.query.SpeechResult && req.query.SpeechResult.toLowerCase() == 'directory') {
        twiml.redirect({ method: 'GET' }, 'company-directory')
      } else if (selectedUser  === null) {
        // redirect the call to the previous twiml
        twiml.say('Your selection was not valid, please try again')
        twiml.pause({length: 2})
        twiml.redirect({ method: 'GET' }, 'welcomePBX')
      } else {
        twiml.say('Connecting you to ' + selectedUser.fullName)
        twiml.redirect({ method: 'GET' }, '/api/agents/extensionInboundCall?extension=' + selectedUser.extension)
      }
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())

    })
    .catch(function(err){
      console.log(err)
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry an select extension error occurred</Say></Response>')
    });

}

module.exports.welcomePBX = function (req, res) {

  listener.log_twiml_event(req);
  var keywords=['directory'];
  var promise = User.find({}).exec();

  promise.then(function(users) {
    for (var digit=1; digit<users.length; digit++){
      keywords.push(users[digit-1].fullName)
    }
    return; // returns a promise
  })
    .then(function() {
      var twiml = new twilio.TwimlResponse()
      console.log('beginning twiml');
      twiml.gather({
        input: 'dtmf speech',
        action: 'select-extension',
        method: 'GET',
        timeout: 4,
        language: process.env.LANGUAGE_BCP47,
        hints: keywords.join()
      }, function (node) {
        node.play(process.env.PBX_GREETING_URL)
      })

      twiml.say('You did not say anything or enter any digits.')
      twiml.pause({length: 2})
      twiml.redirect({method: 'GET'}, 'welcomePBX')

      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())
    }).catch(function(err){
      console.log(err)
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry an select extension error occurred</Say></Response>')
    });

}
