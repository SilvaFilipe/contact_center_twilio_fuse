if (!process.env.DYNO) {
    require('dotenv').config({silent: true})
}
var express = require('express')
var bodyParser = require('body-parser')
var session = require('express-session')
var compression = require('compression')

var mongoose = require('mongoose');
var flash = require('connect-flash');
var passport = require('passport')

var messagingAdapter = require('./controllers/messaging-adapter.js')
/* check if the application runs on heroku */
var util

if (process.env.DYNO) {
    util = require('./util-pg.js')
} else {
    util = require('./util-file.js')
}

var app = express()

mongoose.connect('mongodb://localhost/personable');


app.set('port', (process.env.PORT || 5000))
app.set('view engine', 'ejs');
app.use(compression())
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'keyboard cat',
    name: 'twilio_call_center_session',
    cookie: {expires: util.generateSessionExpirationDate(86400)}
}))

app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({
    extended: true
}))

//Passport
require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session()); // persistent login session

app.use(flash()); // use connect-flash for flash messages


app.use(function (req, res, next) {

    util.getConfiguration(function (err, configuration) {
        if (err) {
            res.status(500).json({stack: err.stack, message: err.message})
        } else {
            req.configuration = configuration
            req.util = util
            next()
        }
    })

})

app.use('/', express.static(__dirname + '/public'))
// Routes

// API Routes
require('./routes/api.routes')(app)

// Pages router
require('./routes/routes')(app, passport)

app.listen(app.get('port'), function () {
    console.log('magic happens on port', app.get('port'))
});