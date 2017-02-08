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

            return res.json({message: 'User created.'});
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

                return res.json({message: 'User updated.'});
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
