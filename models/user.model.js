const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const twilio = require('twilio');
const client = new twilio( process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const colors = require('colors');
const async 	= require('async')

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID);

var UserSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Required field.']
    },
    lastName: {
        type: String,
        required: [true, 'Required field.']
    },
    email: {
        type: String,
        unique : true,
        required: [true, 'Required field.']
    },
    phone: {
        type: String
    },
    extension: {
        type: Number
    },
    password: {
        type: String
        //min: [6, 'Password is too short.']
    },
    imageUrl: String,
    avatarUrl: String,
    avatarUrls: [{
      80: String,
      320: String
    }],
    workerSid: String,
    workerFriendlyName: String,
    friendlyWorkerName: String,
    hasDid: Boolean,
    hasFax: Boolean,
    hasVoicemail: Boolean,
    sipURI: String,
    forwarding: String,
    skills: [String],
    /* For reset password */
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    mailGreetingUrl: String,
    local: {
        email: {
            type: String
        },
        password: {
            type: String
        }
    },
    google: {
        id: String,
        token: String,
        email: {
            type: String
        },
        name: String
    },
    starredBy: [{ userId: { type: mongoose.Schema.ObjectId, ref: 'User' }, starred: Boolean}],
    queues: [{ type: mongoose.Schema.ObjectId, ref: 'Queue' }],
    dids: [{ type: mongoose.Schema.ObjectId, ref: 'Did' }],
    contacts: [{ type: mongoose.Schema.ObjectId, ref: 'Contact' }]
});

UserSchema.methods.generateHash = function (password) {
    //console.log('psass:', password);
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.validPassword = function (password) {
    //console.log(password, this.password);
    return bcrypt.compareSync(password, this.password);
};

UserSchema.virtual('fullName').get(function () {
  return this.firstName + " " + this.lastName
});

UserSchema.methods.sipConfigQRCode = (function (callback) {
  var QRCode = require('qrcode');
  var user = this;
  var xml = `<?xml version="1.0" encoding="utf-8"?>
    <AccountConfig version="1">
    <Account>
    <RegisterServer>${process.env.SIP_DOMAIN}.sip.us1.twilio.com</RegisterServer>
    <UserID>${user.friendlyWorkerName}</UserID>
    <AuthID>${user.friendlyWorkerName}</AuthID>
    <AuthPass>CallCenter99</AuthPass>
    <AccountName>${process.env.SIP_DOMAIN}</AccountName>
    <DisplayName>${user.friendlyWorkerName}</DisplayName>
    </Account>
    </AccountConfig>`;

  QRCode.toDataURL(xml, function (err, url) {
    if (err){
      callback(err);
    } else {
      callback(null, url);
    }
  })
});


UserSchema.methods.setExtension = function (extNumber) {
  var user = this;
  if ( extNumber == null) {
    //assign the next available number
    if (user.extension > 99){
      console.log ('not changing extension ' + user.extension + ' for user ' + user.email);
      return;
    }

    this.model('User').findOne({ extension: { $gt: 99} }).sort('-extension').exec(function (err, otherUser) {
        if (err) {
          console.log('setExtension err: ' + err);
        }
        if (otherUser) {
          console.log('setting extension ' + (otherUser.extension + 1) + ' for user: ' + user.email);
          user.model('User').update({_id: user._id}, {
            extension: otherUser.extension+1
          }, function(err, affected, resp) {
            if (err){
              console.log(err);
            }
          })
        } else {
          console.log('setting extension 100 for user: ' + user.email);
          user.model('User').update({_id: user._id}, {
            extension: 100
          }, function(err, affected, resp) {
            console.log(resp);
          })

        }
      });

  } else {
    console.log('setting extension ' + extNumber + ' for user: ' + user.email);

    user.model('User').update({_id: user._id}, {
      extension: extNumber
    }, function(err, affected, resp) {
      console.log(resp);
    })
  }

}

UserSchema.methods.syncSipCredential = function (){
  console.log('syncSipCredential called');
  var user = this;
  client.sip.credentialLists.list(function(err, data) {
    data.credentialLists.forEach(function(credentialList) {
      if(credentialList.friendly_name == "CallCenter"){
        console.log("Found credential list "+ credentialList.sid);
        client.sip.credentialLists(credentialList.sid).credentials.list(function(err, credentialData) {
          var credentialSid=null;
          console.log('showing credentials for ' + credentialList.friendly_name)
          credentialData.credentials.forEach(function (credential) {
            if (credential.username == user.friendlyWorkerName) {
              console.log('found credential' + credential.sid);
              credentialSid = credential.sid;
            }
          });
          console.log("credentialSid  is " + credentialSid );
          if (credentialSid == null){
            console.log('creating new credential');
            client.sip.credentialLists(credentialList.sid).credentials.create({
              username:  user.friendlyWorkerName,
              password: "CallCenter99"
            }, function(err, credential) {
              if (err){ console.log(err); } else {
                console.log("Created credential " + credential.sid);
              }
            });
          }
        });
      }
    });
  });

}

UserSchema.methods.syncWorker = function () {
    //var user = this;
    this.model('User').findOne({ _id: this._id }).populate('queues').exec(function (err, user) {
      if(err){
        console.log(err);
      } else {
        userQueues=[]
        user.queues.forEach(function(queue){
          userQueues.push(queue.taskQueueFriendlyName)
        });
      }
      if (user.workerSid == undefined ){
        //create worker
        var newWorkerData = {
          friendlyName: user.friendlyWorkerName,
          attributes: JSON.stringify( { "contact_uri":"client:" + user.friendlyWorkerName, "queues":userQueues,"team":"sales", "email":user.email})
        }
        console.log('new user data: ' + JSON.stringify(newWorkerData, null, 4));
        taskrouterClient.workspace.workers.create(newWorkerData)
          .then(function (newWorker) {
            console.log('created worker: ' + JSON.stringify(newWorker, null, 4));
            user.model('User').update({_id: user._id}, {
              workerSid: newWorker.sid
            }, function(err, affected, resp) {
              console.log('updated user sid:'.green, newWorker.sid,resp);
            })
          })
          .catch(function (err) {
            console.log('worker creation error: '.red + JSON.stringify(err, null, 4));
          })

      } else {
        //update worker
        console.log('update worker ' + user.workerSid );
        taskrouterClient.workspace.workers(user.workerSid ).update({
          friendlyName: user.friendlyWorkerName,
          attributes: JSON.stringify( { "contact_uri":"client:" + user.friendlyWorkerName, "queues":userQueues,"team":"sales", "email":user.email})
        }, function(err, worker) {
          if (err){
            console.log('worker update error: ' + JSON.stringify(err, null, 4));
          }
        });
      }
    });

};

UserSchema.static('findByFriendlyName', function (name, callback) {
  return this.findOne({ friendlyWorkerName: name }, callback);
});

UserSchema.pre('save', function(next) {
  //set friendlyWorkerName field dynamically if not found

  const join_symbol = "_";

  if(!this.friendlyWorkerName){
    console.log('friendly name not found');
      let friendlyNameCandidate = [createCompliantString(this.firstName), createCompliantString(this.lastName)].join(join_symbol);

    this.constructor.findByFriendlyName(friendlyNameCandidate, (err, user) => {
      if (err) console.log('findByFriendlyName err, called with: '.error, friendlyNameCandidate);

      if (user) {
        this.friendlyWorkerName = [friendlyNameCandidate, this.email].join(join_symbol);
      } else {
        this.friendlyWorkerName = friendlyNameCandidate
      }
      next()
    })
  }else{
    next();
  }

  function createCompliantString(str){
    return str.toLowerCase().split(" ").join(join_symbol);
  }

});

module.exports = mongoose.model('User', UserSchema);
