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
var adminController = require('../controllers/admin-apis.js')
var sync = require('../controllers/sync.js')

/* routes for messaging adapter */
var messagingAdapter = require('../controllers/messaging-adapter.js')

var workers = require('../controllers/workers.js')

var users = require('../controllers/users.js')
var groups = require('../controllers/groups.js')
var queues = require('../controllers/queues.js')
var contacts = require('../controllers/contacts.js')
var resetPwdController = require('../controllers/resetPassword.js')
//var s3 = require('../controllers/s3.js')

module.exports = function(app, acl, multer){
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
    router.route('/agents/sendToCallSidConference').get(agents.sendToCallSidConference)
    router.route('/agents/agentToConference').get(agents.agentToConference)
    router.route('/agents/toCallEnded').get(agents.toCallEnded)
    router.route('/agents/agentToSilence').get(agents.agentToSilence)
    router.route('/agents/didInboundExtensionCall').get(agents.didInboundExtensionCall)
    router.route('/agents/registeredSipOutboundCall').get(agents.registeredSipOutboundCall)

    router.route('/admin/didSearch').get(adminController.didSearch)
    router.route('/admin/didPurchase').post(adminController.didPurchase)
    router.route('/admin/didDelete/:user_id').post(adminController.didDelete);

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
    router.route('/callControl/play_ringing').post(callController.play_ringing)
    router.route('/callControl/inbound_ringing').post(callController.inbound_ringing)
    router.route('/callControl/toVoicemail').get(callController.toVoicemail)
    router.route('/callControl/hangupSipLeg').get(callController.hangupSipLegRequest)

    router.route('/sync/write').get(sync.write)
    router.route('/sync/token').get(sync.token)

    router.route('/workers').get(workers.list)
    router.route('/workers').post(workers.create)
    router.route('/workers/:id').delete(workers.delete)


    router.route('/messaging-adapter/inbound').post(messagingAdapter.inbound)
    router.route('/messaging-adapter/outbound').post(messagingAdapter.outbound)

    //reset password api
    router.route('/reset/forgot').post(resetPwdController.forgot);
    router.route('/reset/:token').get(resetPwdController.validateResetToken);
    router.route('/reset/:token').post(resetPwdController.resetPassword);

    //Users api
    router.route('/users/me').get(users.me);

    router.route('/users')
        .post(users.create)
        .get(users.all);

    router.route('/users/:user_id')
        .get(users.get)
        .put(users.update)
        .delete(users.delete);

    router.route('/users/:user_id/contacts/:contact_id')
      .post(users.addContact);

    router.route('/users/:user_id/uploadAvatar')
        .post(multer(
          {
            limits: {
              fileSize: 10 * 1024 * 1024
            },
            dest: 'uploads/'
          }
        ).single('file'), users.uploadAvatarImage);

    router.route('/users/:user_id/calls/:page')
      .get(users.getCalls);

    router.route('/users/:user_id/voicemails/:page')
      .get(users.getVoicemails);

    router.route('/users/excludeGroupUsers/:group_id')
      .get(users.queryExcludeGroupUsers);

    router.route('/users/excludeQueueUsers/:queue_id')
      .get(users.queryExcludeQueueUsers);

    router.route('/users/excludeUserGroups/:user_id')
      .get(users.queryExcludeUserGroups);

    router.route('/users/excludeUserQueues/:user_id')
      .get(users.queryExcludeUserQueues);

    router.route('/users/:user_id/removeQueue/:queue_id')
      .post(users.removeQueue);

    router.route('/users/:user_id/star')
      .post(users.starUser);

    //Groups api
    router.route('/groups')
      .post(groups.create)
      .get(groups.all);

    router.route('/groups/:group_id')
      .put(groups.update)
      .get(groups.get);

    router.route('/groups/:group_id/contacts/:contact_id')
      .post(groups.addContact);

    //Queues api
    router.route('/queues')
      .post(queues.create)
      .get(queues.all);

    router.route('/queues/:queue_id')
      .put(queues.update)
      .get(queues.get);

    router.route('/queues/:queue_id/contacts/:contact_id')
      .post(queues.addContact);

    //Contacts api
    router.route('/contacts')
      .post(contacts.create)
      .get(contacts.all);


    router.route('/contacts/:contact_id')
      .put(contacts.update)
      .get(contacts.get);

    router.route('/contacts/:contact_id/uploadAvatar')
      .post(multer(
        {
          limits: {
            fileSize: 10 * 1024 * 1024
          },
          dest: 'uploads/'
        }
      ).single('file'), contacts.uploadAvatarImage);


    app.use('/api', router);

    // workaround for https://www.twilio.com/console/sms/settings
    var router2 = express.Router();
    router2.route('/inbound').post(messagingAdapter.inbound);
    app.use('/messaging-adapter', router2);

};
