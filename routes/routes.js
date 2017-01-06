var express = require('express')

module.exports = function(app, passport){

    app.get('/', index);

    app.get('/admin', admin);

    app.get('/workspace_login', login);

    app.get('/workspace', workspace);

    app.get('/calls', passport.passportMiddleware(), calls);

    app.get('/register', register);

    app.post('/register', passport.authenticate('local', {
        successRedirect: '/calls',
        failureRedirect: '/register',
        failureFlash: true
    }));

    app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))
    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/calls',
        failureRedirect: '/register',
        failureFlash: true
    }))

    var pagesRouter = express.Router()

    var dashboard = require('../controllers/dashboard.js')
    pagesRouter.route('/dashboard').get(dashboard.index)
    app.use('/pages', pagesRouter)
}

function calls(req, res) {
    const twilio = require('twilio')
    const client = new twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN);

    client.recordings.list(function (err, data) {

        res.render('pages/calls', {
            nav_active: 'calls',
            calls: data.recordings
        });
    });
}

function register(req, res) {
    res.render('pages/register', {
        nav_active: 'register',
        registerMessage: req.flash('registerMessage')
    });
}

function workspace(req, res) {
    res.render('pages/workspace', {
        nav_active: 'workspace'
    });
}

function login(req, res) {
    res.render('pages/workspace_login', {
        nav_active: 'workspace'
    });
}

function admin(req, res) {
    res.render('pages/administration', {
        nav_active: 'admin'
    });

}

function index(req, res) {
    res.render('pages/index', {
        nav_active: 'setup',
        callerid: req.configuration.twilio.callerId
    });
}

