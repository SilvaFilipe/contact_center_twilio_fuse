'use strict'

const twilio = require('twilio')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

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
		node.conference(req.query.workerName )
	});


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
      }
  });




  //req.query.phone
  // twiml.dial({ callerId: req.configuration.twilio.callerId }, function (node) {
  //   node.number(req.query.phone)
  // })
	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())
}
