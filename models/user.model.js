var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
const twilio = require('twilio')

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WORKSPACE_SID)

var userSchema = mongoose.Schema({
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
        required: [true, 'Required field.']
    },
    phone: {
        type: String,
        required: [true, 'Required field.']
    },
    extension: {
        type: Number
    },
    password: {
        type: String
        //min: [6, 'Password is too short.']
    },
    imageUrl: String,
    workerSid: String,
    workerFriendlyName: String,
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
    starredBy: [
      {
        userId: {
          type: mongoose.Schema.ObjectId,
          ref: 'User'
        },
        starred: Boolean
      }
    ]
});

userSchema.methods.generateHash = function (password) {
    //console.log('psass:', password);
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function (password) {
    //console.log(password, this.password);
    return bcrypt.compareSync(password, this.password);
};

userSchema.methods.friendlyWorkerName = function () {
  //return (this.firstName + "_" + this.lastName).replace(/[^0-9a-z]/gi, '');
  return  'w' + this._id;
};

userSchema.methods.setExtension = function (extNumber) {
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

userSchema.methods.syncWorker = function () {
    var user = this;
    if (this.workerSid == undefined ){
        //create worker
        var newWorkerData = {
            friendlyName: user.friendlyWorkerName(),
            attributes: JSON.stringify( { "contact_uri":"client:" + user.friendlyWorkerName(), "channels":["phone","chat"],"team":"default", "email":user.email})
        }
        console.log('new user data: ' + JSON.stringify(newWorkerData, null, 4));
        taskrouterClient.workspace.workers.create(newWorkerData)
            .then(function (newWorker) {
                console.log('created worker: ' + JSON.stringify(newWorker, null, 4));
                User.update({_id: user._id}, {
                    workerSid: newWorker.sid
                }, function(err, affected, resp) {
                    console.log(resp);
                })
            }).catch(function (err) {
            console.log('worker creation error: ' + JSON.stringify(err, null, 4));
        })

    } else {
        //update worker
        console.log('update worker ' + this.workerSid );
        taskrouterClient.workspace.workers(this.workerSid ).update({
        friendlyName: user.friendlyWorkerName(),
        attributes: JSON.stringify( { "contact_uri":"client:" + user.friendlyWorkerName(), "channels":["phone","chat"],"team":"default", "email":user.email})
      }, function(err, worker) {
        if (err){
            console.log(err);
        }
      });
    }

};

module.exports = mongoose.model('User', userSchema);
