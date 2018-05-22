'use strict';
const nodemailer = require('nodemailer');
let ejs = require("ejs");

var transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: 'polygonmail4@gmail.com',
        pass: 'polygon1234'
    }
});


function sendVerification(username, email, verifylink, forgotPass) {
    ejs.renderFile(__dirname + '/emailTemplates/verify.ejs', { username: username, verifyLink: verifylink, forgotPass: forgotPass }, function (err, data) {
        if (err) {
            throw err;
        } else {
            if (forgotPass) {
                var mainOptions = {
                    from: '"OpenStats" <noreply@openstats.dk>', // sender address - adr. will revert to gmail
                    to: email, // list of receivers
                    subject: 'Confirm your email', // Subject line
                    text: 'Hi ' + username + '! Before you can reset your password you must verify your account: ' + verifylink, // plain text body
                    html: data
                };
            } else {
                var mainOptions = {
                    from: '"OpenStats" <noreply@openstats.dk>', // sender address - adr. will revert to gmail
                    to: email, // list of receivers
                    subject: 'Confirm your email', // Subject line
                    text: 'Hi ' + username + '! To verify your account go to: ' + verifylink, // plain text body
                    html: data
                };
            }
            //console.log("html data ======================>", mainOptions.html);
            transporter.sendMail(mainOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    throw err;
                } else {
                    console.log('Message sent: ' + info.response);
                }
            });
        }
    });
};

function sendReset(username, email, resetLink) {
    ejs.renderFile(__dirname + '/emailTemplates/reset.ejs', { username: username, resetLink: resetLink }, function (err, data) {
        if (err) {
            throw err;
        } else {
                var mainOptions = {
                    from: '"OpenStats" <noreply@openstats.dk>', // sender address - adr. will revert to gmail
                    to: email, // list of receivers
                    subject: 'Reset password', // Subject line
                    text: 'Hi ' + username + '! To reset the password for your account, please click the link below: ' + resetLink, // plain text body
                    html: data
                };
            //console.log("html data ======================>", mainOptions.html);
            transporter.sendMail(mainOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    throw err;
                } else {
                    console.log('Message sent: ' + info.response);
                }
            });
        }
    });
};

function sendResetConfirm(username, email) {
    ejs.renderFile(__dirname + '/emailTemplates/resetConfirm.ejs', { username: username }, function (err, data) {
        if (err) {
            throw err;
        } else {
                var mainOptions = {
                    from: '"OpenStats" <noreply@openstats.dk>', // sender address - adr. will revert to gmail
                    to: email, // list of receivers
                    subject: 'Password has been reset ', // Subject line
                    text: 'Hi ' + username + '! Your password has been reset.', // plain text body
                    html: data
                };
            //console.log("html data ======================>", mainOptions.html);
            transporter.sendMail(mainOptions, function (err, info) {
                if (err) {
                    throw err;
                } else {
                    console.log('Message sent: ' + info.response);
                }
            });
        }
    });
};

module.exports = { sendVerification, sendReset, sendResetConfirm };