const mongoose = require('mongoose');

var DidSchema = mongoose.Schema({
    number: {
        type: String
    },
    sid: {
        type: String
    },
    greetingText: {
        type: String
    },
    greetingAudioUrl: {
        type: String
    },
    flow: {
        type: String
    }
});

DidSchema.static('findByNumber', function (number, callback) {
  return this.findOne({ number: number }, callback);
});


module.exports = mongoose.model('Did', DidSchema);
