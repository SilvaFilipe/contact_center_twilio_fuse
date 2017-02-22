var express = require('express');
var router = express.Router()

var setup = require('../controllers/setup.js')
var tasks = require('../controllers/tasks.js')

var validate = require('../controllers/validate.js')

/* routes for agent interface and phone */
var agents = require('../controllers/agents.js')

/* routes for IVR */
var ivr = require('../controllers/ivr.js')

/* routes called by the Twilio TaskRouter */
var taskrouter = require('../controllers/taskrouter.js')

var callController = require('../controllers/call-control.js')
var sync = require('../controllers/sync.js')

/* routes for messaging adapter */
var messagingAdapter = require('../controllers/messaging-adapter.js')

var workers = require('../controllers/workers.js')

var users = require('../controllers/users.js')

module.exports = function(app){
    router.route('/setup').get(setup.get)
    router.route('/setup').post(setup.update)
    router.route('/setup/workspace').get(setup.getWorkspace)
    router.route('/setup/activities').get(setup.getActivities)

    router.route('/validate/setup').post(validate.validateSetup)
    router.route('/validate/phone-number').post(validate.validatePhoneNumber)

    router.route('/tasks/callback').post(tasks.createCallback)
    router.route('/tasks/chat').post(tasks.createChat)

    router.route('/agents/login').post(agents.login)
    router.route('/agents/logout').post(agents.logout)
    router.route('/agents/session').get(agents.getSession)
    router.route('/agents/call').get(agents.call)
    router.route('/agents/outboundCall').get(agents.outboundCall)

    router.route('/ivr/welcome').get(ivr.welcome)
    router.route('/ivr/select-team').get(ivr.selectTeam)
    router.route('/ivr/create-task').get(ivr.createTask)

    router.route('/taskrouter/assignment').post(taskrouter.assignment)
    router.route('/taskrouter/moveToConference').post(taskrouter.moveToConference)
    router.route('/taskrouter/agentToConference').post(taskrouter.agentToConference)

    router.route('/callControl/holdOn').get(callController.holdOn)
    router.route('/callControl/holdOff').get(callController.holdOff)
    router.route('/callControl/muteOn').get(callController.muteOn)
    router.route('/callControl/muteOff').get(callController.muteOff)
    router.route('/callControl/hangup').get(callController.hangup)
    router.route('/callControl/recordOn').get(callController.recordOn)
    router.route('/callControl/recordOff').get(callController.recordOff)
    router.route('/callControl/playRecording').get(callController.playRecording)

    router.route('/sync/write').get(sync.write)

    router.route('/workers').get(workers.list)
    router.route('/workers').post(workers.create)
    router.route('/workers/:id').delete(workers.delete)


    router.route('/messaging-adapter/inbound').post(messagingAdapter.inbound)
    router.route('/messaging-adapter/outbound').post(messagingAdapter.outbound)

    //Users api
    router.route('/users/me').get(users.me);

    router.route('/users')
        .post(users.create)
        .get(users.all);

    router.route('/users/:user_id')
        .get(users.get)
        .put(users.update)
        .delete(users.delete);


    app.use('/api', router)

    // workaround for https://www.twilio.com/console/sms/settings
    var router2 = express.Router()
    router2.route('/inbound').post(messagingAdapter.inbound)
    app.use('/messaging-adapter', router2)

}
