const Contact = require('../models/contact.model');
const S3 = require('../services/s3');

module.exports = {
    create: function (req, res) {
        var contact = new Contact();

        contact.name = req.body.name;
        contact.description = req.body.description;
        contact.phone = req.body.phone;
        contact.save(function (err) {
          if(err) return res.status(500).send(err);

          return res.status(200).json(contact);
        });
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
    },
    uploadAvatarImage: async function uploadAvatarImage(req, res) {
      let file = req.file;
      console.log(file);
      const contactId = req.params.contact_id;
      try {
        var avatarUrls = await S3.upload(file);
        let contact = await Contact.findById(contactId).exec();
        contact.avatarUrls = avatarUrls;
        contact.avatarUrl = avatarUrls["80"]; //default avatar
        let savedContact = await contact.save();
        return res.status(200).json({
          contact: savedContact,
          success: true
        });
      } catch(err) {
        return res.status(400).json({
          err: err,
          errString: JSON.stringify(err),
          success: false
        });
      }
    }
};
