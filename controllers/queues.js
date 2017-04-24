const Queue = require('../models/queue.model');

module.exports = {
    create: function (req, res) {
        var queue = new Queue();

        queue.name = req.body.name;
        queue.description = req.body.description;

        queue.save(function (err) {
            if(err) return res.send(err);

            return res.json(queue);
        })
    },
    all: function (req, res) {
        Queue.find(function (err, queues) {
            if(err) return res.send(err);

            return res.json(queues);
        })
    },
    get: function (req, res) {
        Queue.findById(req.params.queue_id)
          .populate('users queues')
          .exec(function (err, queue) {
            if(err) return res.send(err);

            return res.json(queue);
        })
    },
    update: function (req, res) {
        Queue.findById(req.params.queue_id, function (err, queue) {
            if(err) return res.send(err);

            queue.name = req.body.name;
            queue.description = req.body.description;

            queue.save(function(err){
                if(err) return res.send(err);

                return res.json(queue);
            });
        })
    },
    delete: function (req, res) {
        Queue.remove({
            _id: req.params.queue_id
        }, function (err, queue) {
            if(err) return res.send(err);

            return res.json({message: 'Queue deleted.'});
        })
    }
}
