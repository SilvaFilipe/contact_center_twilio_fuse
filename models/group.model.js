const mongoose = require('mongoose');

var GroupSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Required field.']
    },
    description: {
        type: String
    },
    users: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    //queues: [{ type: mongoose.Schema.ObjectId, ref: 'Queue' }]
});

module.exports = mongoose.model('Group', GroupSchema);
