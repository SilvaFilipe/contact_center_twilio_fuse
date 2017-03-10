var mongoose = require('mongoose');
const sync = require('../controllers/sync.js');
const lodash = require('lodash');


var callSchema = mongoose.Schema({
  accountSid: String,
  duration: Number,
  callSid: {type: String, index: {unique: true}},
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
  user_ids: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
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

/**
 * Add a non-duplicate user id to current call instance (doesn't save)
 * @param userIds
 */
callSchema.methods.addUserIds = function addUserIds(userIds) {
  if(!Array.isArray(userIds)){
    userIds = [userIds];
  }
  userIds = lodash.difference(userIds, this.user_ids.map( user_id => user_id.toString() ));

  if(userIds.length > 0){
    this.user_ids = userIds;
  }

};

module.exports = mongoose.model('Call', callSchema);
