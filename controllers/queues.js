const Queue = require('../models/queue.model');
const User = require('../models/user.model');
const Promise = require('bluebird');


module.exports = {
    create: function (req, res) {
        var queue = new Queue();

        queue.name = req.body.name;
        queue.description = req.body.description;

        queue.save(function (err) {
            if(err) res.status(500).json(err);

            return res.status(200).json(queue);
        })
    },
    all: function (req, res) {
        Queue.find(function (err, queues) {
            if(err) res.status(500).json(err);

            return res.status(200).json(queues);
        })
    },
    get: function (req, res) {
      User.find({ queues: { "$in" : [req.params.queue_id]} }).then(function (users) {
        Queue.findById(req.params.queue_id)
          .populate('contacts')
          .exec(function (err, queue) {
            if(err) return res.status(500).json(err);
            var convertedJSON = JSON.parse(JSON.stringify(queue));
            convertedJSON.users = users;
            return res.status(200).json(convertedJSON);
          })
      });

    },

    getFromSid: function (req, res) {
      Queue.findOne({'taskQueueSid': req.params.taskSid}, function (err, queue) {
        if (err) return res.status(500).json(err);
        return res.status(200).json(queue);
      });
    },

    update: function (req, res) {
      User.update({ }, {$pull: {queues: req.params.queue_id }}, {multi: true}).then(function () {
        User.update({_id: {$in: req.body.users}}, {$push: {queues: req.params.queue_id}}, {multi: true}).then(function () {
          Queue.findById(req.params.queue_id, function (err, queue) {
            if (err) return res.status(500).json(err);

            queue.name = req.body.name;
            queue.description = req.body.description;
            queue.scriptKeywords = req.body.scriptKeywords;
            queue.positiveKeywords = req.body.positiveKeywords;
            queue.negativeKeywords = req.body.negativeKeywords;
            queue.customVocabulary = req.body.customVocabulary;
            queue.disposition = req.body.disposition;
            queue.script = req.body.script;

            queue.save(function(err){
              if(err) return res.send(err);

              return res.status(200).json(queue);
            });

          });

        });
      });

    },
    delete: function (req, res) {
        Queue.remove({
            _id: req.params.queue_id
        }, function (err, queue) {
            if(err) res.status(500).json(err);

            return res.status(200).json({message: 'Queue deleted.'});
        })
    },
    addContact: function (req, res) {
      Queue.findByIdAndUpdate(req.params.queue_id,
        {"$addToSet": {"contacts": req.params.contact_id}},
        {"new": true }
        )
        .populate('contacts')
        .exec().then(function (queue) {
          return res.status(200).json(queue);
        })
        .catch(function (err) {
          if (err) return res.status(500).json(err);
        })
    }
}
