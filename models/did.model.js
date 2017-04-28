const mongoose = require('mongoose');

var DidSchema = mongoose.Schema({
    number: {
        type: String
    },
    sid: {
        type: String
    }
});

DidSchema.static('findByNumber', function (number, callback) {
  return this.findOne({ number: number }, callback);
});


module.exports = mongoose.model('Did', DidSchema);
