var mongoose = require('mongoose');

var callSchema = mongoose.Schema({
  accountSid: String,
  duration: Number,
  callSid: { type: String, index: { unique: true } },
  callStatus: String,
  callbackSource: String,
  direction: String,
  from: String,
  fromCity: String,
  fromCountry: String,
  fromState: String,
  fromZip: String,
  sequenceNumber: Number,
  timestamp: String,
  to: String,
  callEvents: [
    {
      callStatus: String,
      callbackSource: String,
      sequenceNumber: Number,
      timestamp: String,
      conferenceSid: String,
      conferenceFriendlyName: String,
      conferenceStatusCallbackEvent: String,
      muted: String,
      hold: String,
      updated_at: Date
    }
  ],
  muted: String,
  hold: String,
  conferenceSid: String,
  conferenceFriendlyName: String,
  conferenceStatusCallbackEvent: String,
  updated_at: Date
});

module.exports = mongoose.model('Call', callSchema);
