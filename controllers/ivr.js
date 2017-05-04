'use strict'

const twilio = require('twilio')
const Queue = require('../models/queue.model');
const listener = require('./event_listener.js')
const Promise = require('bluebird');

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

module.exports.welcome = function (req, res) {
  listener.log_twiml_event(req);
  var sayText='';
  var twiml = new twilio.TwimlResponse()

  var promise = Queue.find({}).exec();
  promise.then(function(queues) {
    for (var digit=0; digit<queues.length; digit++){
      var queue = queues[digit];
      console.log('found queue %s', queue.name)
      sayText = sayText + 'Press ' + digit + ' for ' + queue.name + '. ';
    }
    return; // returns a promise
  })
    .then(function() {
      console.log('beginning twiml');

      twiml.gather({
        action: 'select-team',
        method: 'GET',
        numDigits: 1,
        timeout: 10
      }, function (node) {
        node.say(sayText) //, {'voice':'alice'}
      })

      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send(twiml.toString())
    })
    .catch(function(err){
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, max-age=0')
      res.send('<Response><Say>Sorry an INVRerror occurred</Say></Response>')
    });
}

module.exports.welcomeOld = function (req, res) {
  listener.log_twiml_event(req);
  var twiml = new twilio.TwimlResponse()

	twiml.gather({
		action: 'select-team',
		method: 'GET',
		numDigits: 1,
		timeout: 10
	}, function (node) {
		node.say(req.configuration.ivr.text, {'voice':'alice'})
	})

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())
}


module.exports.selectTeam = function (req, res) {
  listener.log_twiml_event(req);
  var selectedQueue = null;

  var promise = Queue.find({}).exec();
  promise.then(function(queues) {
    for (var digit=0; digit<queues.length; digit++){
      var queue = queues[digit];
      console.log('found queue %s', queue.name)

      if (parseInt(req.query.Digits) === digit) {
        selectedQueue = queue;
      }
    }
    return; // returns a promise
  })
    .then(function() {
      var twiml = new twilio.TwimlResponse()

      /* the caller pressed a key that does not match any team */
      if (selectedQueue === null) {
        // redirect the call to the previous twiml
        twiml.say('Your selection was not valid, please try again')
        twiml.pause({length: 2})
        twiml.redirect({ method: 'GET' }, 'welcome')
      } else {
        twiml.gather({
          action: 'create-task?queueFriendlyName=' + encodeURIComponent(selectedQueue.name),
          method: 'GET',
          numDigits: 1,
          timeout: 3
        }, function (node) {
          node.say('Press any key if you want a callback, if you want to talk to an agent please wait in the line')
        })

        /* create task attributes */
        var attributes = {
          text: 'Caller answered IVR with option "' + selectedQueue.name + '"',
          channel: 'phone',
          phone: req.query.From,
          name: req.query.From,
          title: 'Inbound call',
          type: 'inbound_call',
          queue: selectedQueue.name
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
