var mongoose = require('mongoose');
const sync = require('../controllers/sync.js');


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
      updated_at: Date,
      recordingSid: String,
      recordingUrl: String,
      recordingDuration: String,
      recordingChannels: String
    }
  ],
  muted: String,
  hold: String,
  conferenceSid: String,
  conferenceFriendlyName: String,
  conferenceStatusCallbackEvent: String,
  updated_at: Date,
  recordingSid: String,
  recordingUrl: String,
  recordingDuration: String,
  recordingChannels: String,
  user_id: String,
  callerName: String
});

callSchema.methods.saveSync = function () {
//  sync.saveMap('calls', this.callSid, this);
  sync.saveDoc('c' + this.callSid, this);
};

callSchema.methods.createSync = function (cb) {
//  sync.saveMap('calls', this.callSid, this);
  sync.createDoc('c' + this.callSid, this, cb);
};

module.exports = mongoose.model('Call', callSchema);
