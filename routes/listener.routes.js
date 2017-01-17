var express = require('express');
var router = express.Router()
var listener = require('../controllers/event_listener.js')

module.exports = function(app){
    router.route('/workspace_events').post(listener.workspace_events)
    app.use('/listener', router)
}