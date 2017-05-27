var express = require('express');
var router = express.Router()
var listener = require('../controllers/event_listener.js')

module.exports = function(app){
    router.route('/workspace_events').post(listener.workspace_events)
    router.route('/call_events').post(listener.call_events)
    router.route('/conference_events').post(listener.conference_events)
    router.route('/recording_events').get(listener.recording_events)
    router.route('/voicemail_recording_events').get(listener.voicemail_recording_events)
    router.route('/transcription_events').post(listener.transcription_events)
    router.route('/voicemail_transcription_events').post(listener.voicemail_transcription_events)
    router.route('/log_statuscallback_event').post(listener.log_statuscallback_event)
    app.use('/listener', router)
}
