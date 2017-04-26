var express = require('express');

module.exports = function (app, passport, acl) {

    app.get('/', index);

    app.get('/user-setup', setup);

    //Register
    app.get('/register', register);

    app.post('/register', passport.authenticate('local', {
        successRedirect: '/me',
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

    app.post('/auth/sign-in', function(req, res, next) {
      passport.authenticate('local-login', function(err, user, info) {
        if (err) {
          return res.status(500).end('Authentication Failed!');
        }
        if (!user) {
          return res.status(404).end('Authentication Failed!');
        }
        req.logIn(user, function(err) {
          if (err) { return next(err); }
          return res.status(200).end('successfully login!');
        });
      })(req, res, next);
    });

    app.post('/auth/register', function(req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if (err) {
          return res.status(500).end('Register Failed!');
        }
        if (!user) {
          return res.status(404).end('Register Failed!');
        }
        else {
          return res.status(200).send(user);
        }

      })(req, res, next);
    });


  /*
    app.post('/auth/sign-in', passport.authenticate('local-login', {
      successRedirect: '/auth-me',
      failureRedirect: '/auth-failure',
      failureFlash: true
    }));

*/

    app.get('/auth/google', passport.authenticate('google', {
        //scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
        scope: ['profile', 'email']
    }));

    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/me',
        failureRedirect: '/register',
        failureFlash: true
    }));

    app.get('/logout', logout);

    //Secured routes
    app.get('/admin', acl.middleware(1), admin);

    app.get('/workspace_login', acl.middleware(1), login);

    app.get('/workspace', acl.middleware(1), workspace);

    app.get('/calls', acl.middleware(1), calls);

    //app.get('/me', passport.passportMiddleware(), me);
    app.get('/me', acl.middleware(1), me);
    app.get('/auth-me', acl.middleware(1), authme);
    app.get('/auth-failure', authfailure);

    var pagesRouter = express.Router();

    var dashboard = require('../controllers/dashboard.js');
    pagesRouter.route('/dashboard').get(acl.middleware(2), dashboard.index);
    app.use('/pages', pagesRouter);


    //function roleMiddleware(parts) {
    //    return function (req, res, next) {
    //        passport.passportMiddleware()(req, res, function () {
    //            if (parts) {
    //                return acl.middleware(parts, getUserId)(req, res, next);
    //            } else {
    //                return acl.middleware(1, getUserId)(req, res, next);
    //            }
    //        })
    //
    //        function getUserId(req){
    //            return req.user._id.toString();
    //        }
    //    }
    //}

    //Route definition

    function index(req, res) {
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
            message: req.flash('message')[0],
            errors: req.flash('registerFromErrors')[0],
            formData: req.flash('formData')[0]
        });
    }

    function signin(req, res) {
        res.render('pages/login', {
            nav_active: 'login',
            message: req.flash('message')
        });
    }

    function me(req, res) {
        res.render('pages/profile', {
            user: req.user,
            nav_active: 'profile',
            page_title: 'Profile'
        })
    }

    function authme(req, res) {
      res.status(200).end('successfully login!');
    }

    function authfailure(req, res) {
      res.status(404).end('Authentication Failed!');
    }

    function logout(req, res) {
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
};

