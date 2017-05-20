const Contact = require('../models/contact.model');

module.exports = {
    create: function (req, res) {
        var contact = new Contact();

        contact.name = req.body.name;
        contact.description = req.body.description;
        contact.phone = req.body.phone;
        contact.avatarUrl = req.body.avatarUrl;

        contact.save(function (err) {
            if(err) return res.send(err);

            return res.json(contact);
        })
    },
    all: function (req, res) {
        Contact.find(function (err, contacts) {
            if(err) return res.send(err);

            return res.json(contacts);
        })
    },
    get: function (req, res) {

        Contact.findById(req.params.contact_id)
          .populate({
            path: 'users',
            select: 'firstName lastName email extension'
          })
          .exec(function (err, contact) {
            if(err) return res.status(500).json(err);

            if(!contact) return res.status(404).send("No contact found");

            return res.status(200).json(contact);
        })
    },
    update: function (req, res) {
        Contact.findById(req.params.contact_id, function (err, contact) {
            if(err) return res.send(err);

            contact.name = req.body.name;
            contact.description = req.body.description;
            contact.users = req.body.users;

            if (Array.isArray(req.body.users)) {
                contact.users = req.body.users.map(function (user) {
                  return user._id;
                });
            }

            contact.save(function(err){
                if(err) return res.send(err);

                return res.json(contact);
            });
        })
    },
    delete: function (req, res) {
        Contact.remove({
            _id: req.params.contact_id
        }, function (err, contact) {
            if(err) return res.send(err);

            return res.json({message: 'Contact deleted.'});
        })
    }
};
