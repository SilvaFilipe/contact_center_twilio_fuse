var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
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
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  recordingSid: String,
  recordingUrl: String,
  recordingDuration: String,
  recordingChannels: String,
  user_id: String,
  user_ids: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  callerName: String,
  recipientName: String,
  transcription: String,
  voiceBaseMediaId: String,
  mailTranscription: String,
  mailRecordingUrl: String,
  mailRecordingSid: String,
  mailVoiceBaseMediaId: String,
  mailRecordingDuration: String,
  created: {type : Date, default : Date.now},
  sipCallSid: String,
  sipAnswered: Boolean,
  sentimentScore: Number,
  sentimentComparative: Number,
  positiveWords: Array,
  negativeWords: Array,
  queue: {type: mongoose.Schema.ObjectId, ref: 'Queue'},
  voicebaseResponse: Object,
  qscore: Number,
  agentWordCount: Number,
  callerWordCount: Number,
  agentTalkRatio: Number,
  disposition: String,
  scriptKeywords: Array,
  positiveKeywords: Array,
  negativeKeywords: Array,
  scriptKeywordRatio: Number,
  listMember: {type: mongoose.Schema.ObjectId, ref: 'ListMember'}
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

callSchema.static('addQueueByCallSid', function (queueId, callSid) {
  this.findOne({ callSid: callSid }, function(err, callToUpdate){
    if (callToUpdate){
      callToUpdate.queue = queueId
      callToUpdate.save(function (err) {
        if (err){ console.log('err adding queue to call: '+ err);}
      });
    }
  });
});


callSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Call', callSchema);
