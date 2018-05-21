var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var UserSchema = new Schema({
    email: {
        address: { type: String, unique: true, required: true },
        verficationCode: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        newsletter: { type: Boolean },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date }
    },
    password: {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    roles: {
        isAdmin: { type: Boolean, default: false },
        isUser: { type: Boolean, default: true }
    },
    info: {
        creationDate: { type: Date, default: Date.now },
        lastLogin: { type: Date },
        rank: { type: String },
        gender: { type: String },
        age: { type: Number },
        nationality: { nationality: String }
    },
    games: {
        type: []
    }
});

UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        //Salt factor 10
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

UserSchema.methods.comparePassword = function (pass, cb) {
    bcrypt.compare(pass, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('User', UserSchema);