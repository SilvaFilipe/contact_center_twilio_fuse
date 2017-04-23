const Group = require('../models/group.model');
//const Call = require('../models/call.model');


module.exports = {
    create: function (req, res) {
        var group = new Group();

        group.name = req.body.name;
        group.description = req.body.description;

        group.save(function (err) {
            if(err) return res.send(err);

            return res.json(group);
        })
    },
    all: function (req, res) {
        Group.find(function (err, groups) {
            if(err) return res.send(err);

            return res.json(groups);
        })
    },
    get: function (req, res) {
        Group.findById(req.params.user_id, function (err, group) {
            if(err) return res.send(err);

            return res.json(group);
        })
    },
    update: function (req, res) {
        Group.findById(req.params.user_id, function (err, user) {
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
    delete: function (req, res) {
        Group.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if(err) return res.send(err);

            return res.json({message: 'Group deleted.'});
        })
    }
}
