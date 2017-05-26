/**
 * Created by dev on 5/26/17.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const async = require('async');
const User = require('../models/user.model');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const options = { auth: { api_user: process.env.SENDGRID_USERNAME,  api_key: process.env.SENDGRID_PASSWORD }};
const mailer = nodemailer.createTransport(sgTransport(options));

module.exports = {
  forgot: function (req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            return res.status(400).send({
              message: 'No account with that email has been found'
            });
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {

        var email = {
          to: user.email,
          from: 'beans@beanserver.net',
          subject: 'Password Reset',
          html: '<p>You are receiving this because you have requested the reset of the password for your account.</p>' +
          '<p>Please click on the following link, or paste this into your browser to complete the process:</p>' +
          'http://' + req.headers.host + '/api/reset/' + token +
          '<p>If you did not request this, please ignore this email and your password will remain unchanged</p>'
        };

        mailer.sendMail(email, function(err, response) {
          if (err) {
            console.log(err);
            return res.status(404).send({message: JSON.stringify(err)});
          }
          console.log(response);
          res.json({ message: 'An email has been sent to the provided email with further instructions.' });
          done(err, 'done');
        });

      }
    ], function(err) {
      if (err) return next(err);
    });
  },

  validateResetToken: function (req, res) {
    var hosturl = process.env.SITE_URL;

    console.log('Reset password GET from email token', req.params.token);

    User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }, function (err, user) {

      if (err || !user) {
        return res.redirect(hosturl + '/access/forgot-password');
      }

      res.redirect(hosturl + '/access/reset-password/' + req.params.token);
    });
  },

  resetPassword: function (req, res, next) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            return res.status(400).send({
              message: 'Password reset token is invalid or has expired.'
            });
          }

          var hashedPassword = user.generateHash(req.body.password);
          user.password = hashedPassword;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function(err) {
            req.login(user, function(err) {
              done(err, user);
            });
          });
        });
      },
      function(user, done) {

        var email = {
          to: user.email,
          from: 'beans@beanserver.net',
          subject: 'Your password has been changed',
          html: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };

        mailer.sendMail(email, function(err, response) {
          if (err) {
            console.log(err);
            return res.status(404).send({message: JSON.stringify(err)});
          }
          console.log(response);
          res.json({ message: 'Success! Your password has been changed.' });
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
    });
  }
};
