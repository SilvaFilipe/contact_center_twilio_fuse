const mongoose = require('mongoose');

var QueueSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Required field.']
    },
    description: {
        type: String
    },
    priority: {
      type: Number,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    }
});

module.exports = mongoose.model('Queue', QueueSchema);
