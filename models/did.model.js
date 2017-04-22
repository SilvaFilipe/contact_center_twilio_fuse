const mongoose = require('mongoose');

var DidSchema = mongoose.Schema({
    number: {
        type: String
    },
    sid: {
        type: String
    }
});

module.exports = mongoose.model('Did', DidSchema);
