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
    password: {
        type: String
        //min: [6, 'Password is too short.']
    },
    imageUrl: String,
    workerSid: String,
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
    }
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
    return  'w' + this._id;
};

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
        console.log('update worker');
    }

};

module.exports = mongoose.model('User', userSchema);