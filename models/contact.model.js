const mongoose = require('mongoose');

var ContactSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Required field.']
    },
    phone: {
        type: String
    },
    description: {
        type: String
    },
    photoUrl: {
        type: String
    },
    avatarUrl: {
        type: String
    },
    avatarUrls: [{
        80: String,
        320: String
    }]
});

module.exports = mongoose.model('Contact', ContactSchema);
