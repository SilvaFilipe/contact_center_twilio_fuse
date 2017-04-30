const mongoose = require('mongoose');

var ContactSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Required field.']
    },
    phone: {
        type: String,
        required: [true, 'Required field.']
    },
    description: {
        type: String
    },
    photoUrl: {
        type: String
    }
});

module.exports = mongoose.model('Contact', ContactSchema);
