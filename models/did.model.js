const mongoose = require('mongoose');
const twilio = require('twilio')
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN)

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


DidSchema.methods.setVoiceUrl = function (url) {
  client.incomingPhoneNumbers(this.sid)
    .update({voiceUrl: url })
    .then((number) => console.log('set voiceURL for %s %s', number.sid, number.voiceUrl));
};


module.exports = mongoose.model('Did', DidSchema);
