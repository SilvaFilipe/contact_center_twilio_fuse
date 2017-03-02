const User = require('../models/user.model');

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

        console.log(req.body._id, req.query.starred);
        User.findById(req.user._id, function (err, user) {
            if(err) return res.send(err);


            user.starredBy = user.starredBy || [];

            var starredUser = user.starredBy.find(function (u) {
              if(!u){ return false; }
              return u.userId == req.body._id;
            });

            if(starredUser){
              starredUser.starred = req.query.starred;
            }else{
               user.starredBy.push({
                 userId: req.params.user_id,
                 starred: req.query.starred
               });
            }

            user.save(function(err){
                if(err) return res.send(err);

                return res.json(user);
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
