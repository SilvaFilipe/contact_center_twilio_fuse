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
          .exec(function (err, queue) {
            if(err) return res.status(500).json(err);
            var convertedJSON = JSON.parse(JSON.stringify(queue));
            convertedJSON.users = users;
            return res.status(200).json(convertedJSON);
          })
      });

    },
    update: function (req, res) {
      let triggerPromise;

      Queue.findById(req.params.queue_id, function (err, queue) {
        if (err) return res.status(500).json(err);

        queue.name = req.body.name;
        queue.description = req.body.description;

        if (Array.isArray(req.body.users) && req.body.users.length > 0) {
          queue.users = req.body.users.map(function (user) {
            return user._id;
          });

        triggerPromise = User.update({
           _id: {
             "$in": queue.users
           }
         }, {
           $push: {
             queues: {
               $each: [queue._id]
             }
           }
         },
          {
            multi: true
          }).exec()
        } else{
          triggerPromise = Promise.resolve();
        }

        triggerPromise
          .then(() => queue.save())
          .then(queue => res.status(200).json(queue))
          .catch(err => res.status(500).json(err));
      })
    },
    delete: function (req, res) {
        Queue.remove({
            _id: req.params.queue_id
        }, function (err, queue) {
            if(err) res.status(500).json(err);

            return res.status(200).json({message: 'Queue deleted.'});
        })
    }
}
