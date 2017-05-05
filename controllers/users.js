const User = require('../models/user.model');
const Group = require('../models/group.model');
const Queue = require('../models/queue.model');
const Call = require('../models/call.model');
const _ = require('lodash');
const Promise = require('bluebird');
const differenceWith = require('lodash.differencewith');


module.exports = {
    me: function (req, res) {
        var data = {user: req.user, roles: req.session.roles};
        res.json(data);
    },
    create: function (req, res) {
        var user = new User();

        user.firstName = req.body.firstName;
        user.email = req.body.email;
        user.password = req.body.password;

        user.save(function (err) {
            if(err) return res.status(500).json(err);

            return res.status(200).json(user);
        })
    },
    all: function (req, res) {
        User.find(function (err, users) {
            if(err) return res.status(500).json(err);

            return res.status(200).json(users);
        })
    },
    query: function (req, res) {

        var params = {};

        if(req.query.search){
          var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

          params.$or = [{ 'firstName': { $regex: re }}, { 'lastName': { $regex: re }}, { 'email': { $regex: re }}];
        }

        User.find(params, function (err, users) {
            if(err) return res.status(500).json(err);

            return res.status(200).json(users);
        })
    },
    queryExcludeGroupUsers: function (req, res) {
        var params = {};

        if(req.query.search){
          var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

          params.$or = [{ 'firstName': { $regex: re }}, { 'lastName': { $regex: re }}, { 'email': { $regex: re }}];
        }

        Group.findById(req.params.group_id).populate('users').exec()
          .then(function (group) {
            params._id = {$nin: group.users};
            return User.find(params).exec();
          })
          .then(function (users) {
            return res.status(200).json(users);
          })
          .catch(function (err) {
            return res.status(500).json(err);
          });

    },

    queryExcludeUserGroups: function (req, res) {
      var params = {};

      if(req.query.search){
        var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

        params.$or = [{ 'name': { $regex: re }}, { 'description': { $regex: re }}];
      }

      Group.find({ users: { "$in" : [req.params.user_id]} }).select('_id').then(function (groups) {
        params._id = {$nin: groups};
        return Group.find(params).select('_id description name').exec();
      })
      .then(function (groups) {
        return res.status(200).json(groups);
      })
      .catch(function (err) {
        return res.status(500).json(err);
      });

    },

    queryExcludeUserQueues: function (req, res) {
      var params = {};
      if(req.query.search){
        var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

        params.$or = [{ 'name': { $regex: re }}, { 'description': { $regex: re }}];
      }

      User.findById(req.params.user_id).populate('queues').exec()
        .then(function (user) {
          params._id = {$nin: user.queues};
          return Queue.find(params).exec();
        })
        .then(function (queues) {
          return res.status(200).json(queues);
        })
        .catch(function (err) {
          return res.status(500).json(err);
        });

    },

    get: function (req, res) {
      Group.find({ users: { "$in" : [req.params.user_id]} }).select('_id description name').then(function (groups) {
        User.findById(req.params.user_id).populate('dids queues').exec().then(function (user) {
          req.acl.userRoles(req.params.user_id.toString(), function(err, roles){
            var convertedJSON = JSON.parse(JSON.stringify(user));
            convertedJSON.roles = roles;
            convertedJSON.groups = groups;
            return res.status(200).json(convertedJSON);
          });
        }, function (err) {
          if(err) return res.status(500).json(err);
        });
      }, function (err) {
        if(err) return res.status(500).json(err);
      });

    },
    getCalls: function (req, res) {
        var params = {
          user_ids: req.user_id
        };

        if(req.query.search){
          var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

          params.$or = [{ 'transcription': { $regex: re }}, { 'from': { $regex: re }}, { 'to': { $regex: re }}];
        }

        Call.paginate(params, {
          sort: {
            created_at: -1
          },
          //select: 'recordingUrl created_at to from direction duration',
          lean: true,
          limit: 8,
          page: req.params.page ? req.params.page : 1
        }).then(function (calls) {
            return res.status(200).json(calls);
        })
        .catch(function (err) {
          if(err) return res.status(500).send(err);
        })
    },
    getVoicemails: function (req, res) {
        var params = {
          user_ids: req.user_id,
          mailRecordingUrl: {$exists: true}
        };

        if(req.query.search){
          var re = new RegExp('^.*' + req.query.search + '.*$', 'i');

          params.$or = [{ 'transcription': { $regex: re }}, { 'from': { $regex: re }}, { 'to': { $regex: re }}];
        }
        Call.paginate(params, {
          sort: {
            created_at: -1
          },
          //select: 'recordingUrl created_at to from direction duration',
          lean: true,
          limit: 8,
          page: req.params.page ? req.params.page : 1
        }).then(function (calls) {
            return res.status(200).json(calls);
        })
        .catch(function (err) {
          if(err) return res.status(500).send(err);
        })
    },
    update: function (req, res) {
      Group.update({ }, {$pull: {users: req.params.user_id }}, {multi: true}).then(function () {
          Group.update({_id: {$in : req.body.groups} }, {$push: {users: req.params.user_id }}, {multi: true}).then(function () {
            User.findById(req.params.user_id, function (err, user) {
              if(err) return res.send(err);
              User.findOne({'extension': req.body.extension}, function (err, findUser) {
                if (err) return res.send(err);
                if (findUser && findUser._id.toString() !== req.params.user_id) return res.status(500).send('Extension already in use!');
                user.email = req.body.email || user.email;
                user.firstName = req.body.firstName || user.firstName;
                user.lastName = req.body.lastName || user.lastName;
                user.phone = req.body.phone || user.phone;
                user.skills = req.body.skills || user.skills;
                user.extension = req.body.extension || user.extension;
                user.forwarding = req.body.forwarding || user.forwarding;
                user.sipURI = req.body.sipURI || user.sipURI;
                user.hasFax = req.body.hasFax;
                user.hasVoicemail = req.body.hasVoicemail;
                user.hasDid = req.body.hasDid;
                if (Array.isArray(req.body.queues)) {
                  user.queues = req.body.queues.map(function (queue) {
                    return queue._id;
                  });
                }

                req.acl.userRoles(req.params.user_id.toString(), function(err, roles){
                  if (roles.length === 0) {
                    req.acl.addUserRoles(req.params.user_id.toString(), req.body.roles, function (err) {
                      if(err) return res.send(err);
                      user.save(function(err){
                        if(err) return res.send(err);

                        return res.json(user);
                      });
                    });
                  }
                  else {
                    req.acl.removeUserRoles(req.params.user_id.toString(), roles, function (err) {
                      if(err) return res.send(err);
                      req.acl.addUserRoles(req.params.user_id.toString(), req.body.roles, function (err) {
                        if(err) return res.send(err);
                        user.save(function(err){
                          if(err) return res.status(500).json(err);

                          return res.status(200).json(user);
                        });
                      });
                    });
                  }
                });
              });

            })

          });
      });
    },
    starUser: function (req, res) {

        User.findById(req.params.user_id, function (err, user) {
            if(err) return res.send(err);


            user.starredBy = user.starredBy || [];

            var starredUser = user.starredBy.find(function (u) {
              if(!u){ return false; }
              return u.userId.toString() == req.user._id;
            });
            if(starredUser){
              starredUser.starred = req.body.starred;
            }else{
               user.starredBy.push({
                 userId: req.user._id,
                 starred: req.body.starred
               });
            }
            user.save(function(err){
                if(err) return res.status(500).json(err);

                return res.status(200).json({success: true});
            });
        })
    },
    delete: function (req, res) {
        User.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if(err) return res.status(500).json(err);

            return res.status(200).json({message: 'User deleted.'});
        })
    }
}
