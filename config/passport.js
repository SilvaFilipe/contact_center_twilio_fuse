var LocalStrategy = require('passport-local').Strategy
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
var User = require('../models/user.model.js');

var secrets = require('./secrets');

module.exports = function (passport) {
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
                User.findOne({'local.email': email}, function (err, user) {
                    if (err) {
                        return authCheckDone(err);
                    }
                    if (user) {
                        return authCheckDone(null, false, req.flash('message', 'Email already in use.'));
                    }
                    var newUser = new User();

                    newUser.local.email = email;
                    newUser.local.password = newUser.generateHash(password);
                    newUser.firstName = req.body.firstName ? req.body.firstName : '';
                    newUser.save(function (err) {
                        if(err) return authCheckDone(err)

                        return authCheckDone(null, newUser);
                    })


                });
            })
        }
    ));

    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    }, function(req, email, password, done){
        User.findOne({'local.email' : email}, function (err, user) {
            if(err){
                return done(err);
            }

            if(!user){
                return done(null, false, req.flash('message', 'No user found.'));
            }

            if(!user.validPassword(password)){
                return done(null, false, req.flash('message', 'Wrong password.'))
            }

            return done(null, user);
        })
    }))

    passport.use('google', new GoogleStrategy({
            clientID: secrets.googleAuth.clientId,
            clientSecret: secrets.googleAuth.clientSecret,
            callbackURL: secrets.googleAuth.callbackURL
        }, function (token, refreshToken, profile, done) {
            process.nextTick(function () {
                User.findOne({'google.id': profile.id}, function(err, user){
                    if(err) return done(err)

                    if(user){
                        return done(null, user);
                    } else{
                        var newUser = new User();
                        console.log('profile', profile);
                        newUser.google.id = profile.id;
                        newUser.google.token = token;
                        newUser.google.name = profile.displayName;
                        newUser.google.email = profile.emails[0].value;
                        newUser.firstName = profile.name.givenName;
                        newUser.lastName = profile.name.familyName;
                        newUser.email = profile.emails[0].value;
                        newUser.imageUrl = profile.photos[0].value;

                        newUser.save(function (err) {
                            if(err) done(err);

                            return done(null, newUser)
                        });

                    }
                })
            })
        }
    ));

    //app.use(passport.initialize());
    //app.use(passport.session()); // persistent login session

    passport.passportMiddleware = passportMiddleware;
};

function passportMiddleware(){
    return function (req, res, next) {
        if( req.isAuthenticated()){
            return next()
        }
        res.redirect('/')
    }
}