if (!process.env.DYNO) {
    require('dotenv').config({silent: true})
}
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var compression = require('compression');

var mongoose = require('mongoose');
var acl = require('acl');
var flash = require('connect-flash');
var passport = require('passport');

//var messagingAdapter = require('./controllers/messaging-adapter.js');
/* check if the application runs on heroku */
var util;

if (process.env.DYNO) {
    util = require('./util-pg.js')
} else {
    util = require('./util-file.js')
}

var app = express();

mongoose.connect('mongodb://localhost/personable');

mongoose.connection.on('connected', function (err) {
    if (err) throw err;

    acl = new acl(new acl.mongodbBackend(mongoose.connection.db, 'acl_'));

    acl.allow([
        {
            roles: ['phone', 'contact_center'],
            allows: [
                {resources: ['/workspace_login', '/workspace', '/calls', '/me', '/pages/dashboard'], permissions: ['get', 'post', 'delete', 'view']}
            ]
        },
        {
            roles: ['admin'],
            allows: [
                {resources: '/admin', permissions: '*'}
            ]
        }
    ]);

    //inherit roles
    acl.addRoleParents('admin', ['phone', 'contact_center']);

    //Passport
    require('./config/passport')(passport, acl);

    app.use(passport.initialize());
    app.use(passport.session()); // persistent login session


    // API Routes
    require('./routes/api.routes')(app, acl);

    // Pages router
    require('./routes/routes')(app, passport, acl);

    app.use(function(err, req, res, next) {
        // Move on if everything is alright
        if(!err) return next();
        // Something is wrong, inform user

        if(err.errorCode === 401){
            return res.redirect('/sign-in');
        }

        if(err.errorCode === 403){
            req.flash('message', 'Insufficient permissions to access <strong>' + req.path + '</strong>');
            return res.redirect('/pages/dashboard');
        }
        return res.status( err.errorCode ).send( err.msg);
    });
});

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');
app.use(compression());
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'keyboard cat',
    name: 'twilio_call_center_session',
    cookie: {expires: util.generateSessionExpirationDate(86400)}
}));

app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({
    extended: true
}));



app.use(flash()); // use connect-flash for flash messages


app.use(function (req, res, next) {

    util.getConfiguration(function (err, configuration) {
        if (err) {
            res.status(500).json({stack: err.stack, message: err.message})
        } else {
            req.configuration = configuration;
            req.util = util;
            next()
        }
    })

});


app.use('/', express.static(__dirname + '/public'));
// Routes

// Twilio Event Listeners and Callbacks
require('./routes/listener.routes')(app);

// Pages router
require('./routes/routes')(app, passport);

app.listen(app.get('port'), function () {
    console.log('magic happens on port', app.get('port'))
});