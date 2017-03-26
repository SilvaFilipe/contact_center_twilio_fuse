const User = require('../models/user.model');
const Call = require('../models/call.model');


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
            if(err) return res.send(err);

            return res.json(user);
        })
    },
    all: function (req, res) {
        User.find(function (err, users) {
            if(err) return res.send(err);

            return res.json(users);
        })
    },
    get: function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if(err) return res.send(err);

            return res.json(user);
        })
    },
    getCalls: function (req, res) {
        Call.paginate({
          user_ids: req.user._id,
        }, {
          sort: {
            created_at: -1
          },
          select: 'recordingUrl created_at to from direction duration',
          lean: true,
          limit: 4,
          page: req.params.page ? req.params.page : 1
        }).then(function (calls) {
            return res.json(calls);
        })
        .catch(function (err) {
          if(err) return res.send(err);
        })
    },
    update: function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if(err) return res.send(err);

            user.email = req.body.email || user.email;
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.phone = req.body.phone || user.phone;

            user.save(function(err){
                if(err) return res.send(err);

                return res.json(user);
            });
        })
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
                if(err) return res.send(err);

                return res.json({success: true});
            });
        })
    },
    delete: function (req, res) {
        User.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if(err) return res.send(err);

            return res.json({message: 'User deleted.'});
        })
    }
}
