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
      conferenceStatusCallbackEvent: String
    }
  ],
  conferenceSid: String,
  conferenceFriendlyName: String,
  conferenceStatusCallbackEvent: String
});

module.exports = mongoose.model('Call', callSchema);
