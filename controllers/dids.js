const Did = require('../models/did.model');
const User = require('../models/user.model');
const Promise = require('bluebird');


module.exports = {

    all: function (req, res) {
        var promises = [];

        Did.find(function (err, dids) {
            if(err) res.status(500).json(err);
            dids = JSON.parse(JSON.stringify(dids));
            for (let i in dids) {
              promises.push(getUserHasDid(dids[i]));
            }
            Promise.all(promises)
            .then(function(data){
              return res.status(200).json(data);
            })
            .catch(function(err){
              return res.status(500).json(err);
            });

            function getUserHasDid(did){
              return new Promise(function(resolve, reject){
                User.findOne({ dids: { "$in" : [did._id]} }).then(function (user) {
                  did.user = {};
                  if (user) {
                    did.user._id = user._id;
                    did.user.name = user.fullName;
                  }
                  else {
                    did.user._id = '';
                    did.user.name = '';
                  }
                  return resolve(did);
                }, function (err) {
                  if(err) return reject(err);
                });
              });
            }

        })
    }

};
