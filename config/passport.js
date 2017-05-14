var LocalStrategy = require('passport-local').Strategy
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
var User = require('../models/user.model.js');

var secrets = require('./secrets');

var validator = require("email-validator");

module.exports = function (passport, acl) {
    passport.serializeUser(function (user, done) {
        done(null, user.id)
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        })
    });

    passport.use('local', new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },
        function (req, email, password, authCheckDone) {
            process.nextTick(function () {
                User.findOne({'email': email}, function (err, user) {
                    if (err) {
                        return authCheckDone(err);
                    }
                    if (user) {
                        return authCheckDone(null, false, req.flash('message', 'Email already in use.'));
                    }
                    var newUser = new User();

                    var hashedPassword = newUser.generateHash(password);
                    newUser.firstName = req.body.firstName;
                    newUser.lastName = req.body.lastName;
                    newUser.email = email;
                    newUser.phone = req.body.phone;
                    newUser.local.email = email;
                    newUser.password = hashedPassword;
                    newUser.local.password = hashedPassword;
                    var error = newUser.validateSync();
                    if (error) {
                        console.log(error);
                        req.flash('message', 'Check form errors.');
                        req.flash('registerFromErrors', error.errors);
                        req.flash('formData', req.body);
                        //req.session['registerFormErrors'] = error.errors;
                        return authCheckDone(null, false);
                    } else {
                        newUser.save(function (err, savedUser) {
                            if (err) return authCheckDone(err);
                            //create taskRouter worker
                            savedUser.syncWorker();
                            //give a phone extension
                            savedUser.setExtension();
                            //add default roles
                            acl.addUserRoles(savedUser._id.toString(), 'admin', function (err) {
                                if (err) return authCheckDone(err);
                                acl.addUserRoles(savedUser._id.toString(), 'admin', function () {
                                    if (err) return authCheckDone(err);

                                    req.session.userId = savedUser._id;
                                    return authCheckDone(null, savedUser);
                                });
                            });
                        })
                    }


                });
            })
        }
    ));

    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    }, function (req, email, password, done) {
        User.findOne({'email': email}, function (err, user) {
            if (err) {
                return done(err);
            }

            if (!user) {
                return done(null, false, req.flash('message', 'No user found.'));
            }

            if (!user.validPassword(password)) {
                return done(null, false, req.flash('message', 'Wrong password.'))
            }

          // TODO - remove after worker definitions are done.
          user.syncWorker();

            acl.userRoles(user._id.toString(), function(err, roles){
              req.session.roles = roles;
              req.session.userId = user._id;
              return done(null, user);
            });
        })
    }));

    passport.use('google', new GoogleStrategy({
            clientID: secrets.googleAuth.clientId,
            clientSecret: secrets.googleAuth.clientSecret,
            callbackURL: secrets.googleAuth.callbackURL
        }, function (token, refreshToken, profile, done) {
            process.nextTick(function () {
                User.findOne({'google.id': profile.id}, function (err, user) {
                    if (err) return done(err);

                    if (user) {
                        return done(null, user);
                    } else {
                        var newUser = new User();
                        newUser.google.id = profile.id;
                        newUser.google.token = token;
                        newUser.google.name = profile.displayName;
                        newUser.google.email = profile.emails[0].value;
                        newUser.firstName = profile.name.givenName || '';
                        newUser.lastName = profile.name.familyName || '';
                        newUser.phone = 'Not set';
                        newUser.email = profile.emails[0].value;
                        newUser.imageUrl = profile.photos[0].value;

                        var error = newUser.validateSync();
                        if (error) {
                            console.log(error);
                            req.flash('message', 'Check form errors.');
                            req.flash('registerFromErrors', error.errors);
                            req.flash('formData', req.body);
                            //req.session['registerFormErrors'] = error.errors;
                            return done(null, false);
                        } else {
                            newUser.save(function (err, savedUser) {
                                if (err) return done(err);

                                //create taskrouter worker
                                savedUser.syncWorker();
                                savedUser.setExtension();

                                //add default roles
                                acl.addUserRoles(savedUser._id.toString(), 'admin', function (err) {
                                    if (err) return done(err);
                                    acl.addUserRoles(savedUser._id.toString(), 'admin', function () {
                                        if (err) return done(err);

                                        req.session.userId = savedUser._id;
                                        return done(null, savedUser);
                                    });
                                });
                            })
                        }

                        //newUser.save(function (err, savedUser) {
                        //    if (err) return done(err);
                        //
                        //    //add default roles
                        //    acl.addUserRoles(savedUser._id, 'phone');
                        //    acl.addUserRoles(savedUser._id, 'contact_center');
                        //
                        //    return done(null, savedUser)
                        //});

                    }
                })
            })
        }
    ));

    //app.use(passport.initialize());
    //app.use(passport.session()); // persistent login session

    passport.passportMiddleware = passportMiddleware;
};

function passportMiddleware() {
    return function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/')
    }
}
