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
        Group.findById(req.params.group_id)
          .populate('users queues')
          .exec(function (err, group) {
            if(err) return res.send(err);

            return res.json(group);
        })
    },
    update: function (req, res) {
        Group.findById(req.params.group_id, function (err, group) {
            if(err) return res.send(err);

            group.name = req.body.name;
            group.description = req.body.description;

            if (Array.isArray(req.body.users)) {
                group.users = req.body.users.map(function (user) {
                  return user._id;
                });
            }

            group.save(function(err){
                if(err) return res.send(err);

                return res.json(group);
            });
        })
    },
    delete: function (req, res) {
        Group.remove({
            _id: req.params.group_id
        }, function (err, group) {
            if(err) return res.send(err);

            return res.json({message: 'Group deleted.'});
        })
    }
}
