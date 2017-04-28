const Call = require('../models/call.model');

module.exports = {
    all: function (req, res) {
        Call.find({},function (err, users) {
            if(err) return res.status(500).json(err);

            return res.status(200).json(users);
        })
    },
    get: function (req, res) {
        Call.findById(req.params.user_id, function (err, user) {
            if(err) return res.status(500).json(err);

            return res.status(200).json(user);
        })
    }
};
