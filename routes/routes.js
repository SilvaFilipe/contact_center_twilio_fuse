var express = require('express')

module.exports = function(app, passport){

    app.get('/', index);

    app.get('/user-setup', setup);

    //Register
    app.get('/register', register);

    app.post('/register', passport.authenticate('local', {
        successRedirect: '/calls',
        failureRedirect: '/register',
        failureFlash: true
    }));

    //Login
    app.get('/sign-in', signin);

    app.post('/sign-in', passport.authenticate('local-login', {
        successRedirect: '/me',
        failureRedirect: '/sign-in',
        failureFlash: true
    }));
    
    app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))
    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/me',
        failureRedirect: '/register',
        failureFlash: true
    }));

    app.get('/logout', logout);

    //Secured routes
    app.get('/admin', passport.passportMiddleware(), admin);

    app.get('/workspace_login', passport.passportMiddleware(), login);

    app.get('/workspace', passport.passportMiddleware(), workspace);

    app.get('/calls', passport.passportMiddleware(), calls);

    app.get('/me', passport.passportMiddleware(), me);

    var pagesRouter = express.Router()

    var dashboard = require('../controllers/dashboard.js')
    pagesRouter.route('/dashboard').get(passport.passportMiddleware(), dashboard.index)
    app.use('/pages', pagesRouter)
};

function index(req, res){
    res.render('pages/index', {
        nav_active: null
    })
}

function calls(req, res) {
    const twilio = require('twilio')
    const client = new twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN);

    client.recordings.list(function (err, data) {

        res.render('pages/calls', {
            nav_active: 'calls',
            page_title: 'Calls',
            calls: data.recordings
        });
    });
}

function register(req, res) {
    res.render('pages/register', {
        nav_active: 'register',
        message: req.flash('message')
    });
}

function signin(req, res) {
    res.render('pages/login', {
        nav_active: 'login',
        message: req.flash('message')
    });
}

function me(req, res){
    res.render('pages/profile', {
        user: req.user,
        nav_active: 'profile',
        page_title: 'Profile'
    })
}

function logout(req, res){
    req.logout();
    res.redirect('/sign-in');
}

function workspace(req, res) {
    res.render('pages/workspace', {
        nav_active: 'workspace',
        page_title: 'Workspace'
    });
}

function login(req, res) {
    res.render('pages/workspace_login', {
        nav_active: 'workspace',
        page_title: 'Workspace Login'
    });
}

function admin(req, res) {
    res.render('pages/administration', {
        nav_active: 'admin',
        page_title: 'Admin'
    });
}

function setup(req, res) {
    res.render('pages/setup', {
        nav_active: 'setup',
        page_title: 'Setup',
        callerid: req.configuration.twilio.callerId
    });
}

