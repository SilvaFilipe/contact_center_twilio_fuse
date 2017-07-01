const Did = require('../models/did.model');
const User = require('../models/user.model');
const Promise = require('bluebird');
const S3 = require('../services/s3');

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
    },

    get: function (req, res) {

      Did.findById(req.params.id)
        .exec(function (err, did) {
          if(err) return res.status(500).json(err);

          if(!did) return res.status(404).send("No Did found");

          return res.status(200).json(did);
        })
    },

    update: function (req, res) {
      Did.findById(req.params.id, function (err, did) {
        if(err) return res.send(err);

        did.greetingText = req.body.greetingText;
        did.flow = req.body.flow;

        did.save(function(err){
          if(err) return res.send(err);
          did.setVoiceUrl(process.env.PUBLIC_HOST + '/api/ivr/didInboundCallHandler')
          return res.status(200).json(did);
        });
      })
    },

  uploadGreetingAudio: async function uploadGreetingAudio(req, res) {
      console.log('upload greeting audio file to s3');
      let file = req.file;
      const didId = req.params.did_id;
      try {
        var audioUrl = await S3.uploadSingleFile(file);
        let did = await Did.findById(didId).exec();
        did.greetingAudioUrl = audioUrl;
        let savedDid= await did.save();
        return res.status(200).json({
          did: savedDid,
          success: true
        });
      } catch (err) {
        return res.status(400).json({
          err: err,
          errString: JSON.stringify(err),
          success: false
        });
      }
    }

};
