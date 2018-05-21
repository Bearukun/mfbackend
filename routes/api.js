var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require('../models/user');
var utils = require('../tools/utils');
var emailer = require('../tools/emailer');
const URL = require('../package.json').serverURL;
const frontendURL = require('../package.json').frontendURL;
var db = mongoose.connection;

//POST call for making a new user
router.post('/signup', function (req, res) {

  let genVerificationCode = utils.generateCode();

  console.log(req.body);

  if (!req.body.email.address || !req.body.password || !req.body.username) {
    res.json({ success: false, msg: 'Missing email, password or username.' });
  } else {
    var newUser = new User({
      email: { address: req.body.email.address, verficationCode: genVerificationCode, newsLetter: req.body.email.newsletter },
      password: req.body.password,
      username: req.body.username,
      info: { gender: req.body.info.gender, age: req.body.info.age,  nationality: req.body.info.nationality}

    });
    newUser.save(function (err) {
      if (err) {
        console.log(err)
        //Need a way to check if it's the username or email that's taken - or both.
        return res.json({ success: false, msg: 'Email and/or username already in use.' });
      }
      res.json({ success: true, msg: 'Successfully created new user' });
      try {
        emailer.sendVerification(req.body.username, req.body.email, URL+'api/verify/' + genVerificationCode, false);
      } catch (err) {
        res.json({ success: false, msg: 'Something went wrong, try again' });
      }
    });
  }
});

//GET call to verify a users ID.
router.get('/verify/:id', function (req, res, next) {
  User.findOne({
    'email.verficationCode': req.params.id
  }, function (err, user) {
    //Check the verificationcode
    if (!user) {
      return res.json({ success: false, msg: "Bad verfication code" });
    }
    else {
      //For later: Send JSON or render ok page here
      //res.json({ success: true, stats: "Email verified!" });
      if (user.email.isVerified) {
        res.render('verify', { msg: "Email has already been verified." });
      } else {
        user.email.isVerified = true;
        user.save(function (err) {
          if (err) {
            res.json({ success: false, stats: "Failed to save changes" });
          }
        });
        res.render('verify', { msg: "Email has been verified thanks!" });
      }
    }
  });
});

//POST call to handle signin
router.post('/signin', function (req, res) {
  User.findOne({
    'email.address': req.body.email
  }, function (err, user) {
    if (err){
      return res.status(500).send({ success: false, msg: 'Something went wrong with the database - please contact support.' });
    } 
    if (!user) {
      res.status(401).send({ success: false, msg: 'Authentication failed: Email not found.' });
    } else {
      //Check for password match
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          //Check if user is verified
          if (user.email.isVerified) {
            //If email is found and password is correct create a token
            var token = jwt.sign({
              email: user.email.address,
              username: user.username,
              roles: user.roles
            }, config.secret);
            //Update login time
            user.info.lastLogin = Date.now();
            //Save the changes on mongoDB
            user.save(function (error) {
              if (error) {
                console.error(error);
                return res.status(500).send({ success: false, msg: 'Could not save data to database.' });
              }
            });
            //Return the information including token as JSON
            res.json({ success: true, token: 'JWT ' + token, username: user.username });
          } else {
            res.status(401).send({ success: false, msg: 'Email not verified.' });
          }
        } else {
          res.status(401).send({ success: false, msg: 'Authentication failed: Wrong password.' });
        }
      });
    }
  });
});

//POST call to handle signin
router.post('/forgot', function (req, res) {
  //Generate random string
  let genResetCode = utils.generateCode();
  //Find user by email address
  User.findOne({
    'email.address': req.body.email
  }, function (err, user) {
    if (err) {
      return res.json({ success: false, msg: "Beep boop, something bad happend" });
    }
    //Keeping it safe, to avoid user exposure
    if (!user) {
      return res.json({ success: true, msg: "If registered, an email with instructions on how to reset your password has been sent to the provided email" });
    } else {
      //Check if users account has been verified - it should be
      if (!user.email.isVerified) {
        //Send email
        try {
          emailer.sendVerification(user.username, user.email.address, URL+'api/verify/' + user.email.verficationCode, true);
        } catch (err) {
          res.json({ success: false, msg: 'Something went wrong when sending the email, try again' });
        }
        return res.json({ success: true, msg: "If registered, an email with instructions on how to reset your password has been sent to the provided email" });
      } else {
        //Save the reset code into the user object
        user.email.resetPasswordToken = genResetCode;
        //Give an expirery date for the token
        user.email.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        //Save the changes on mongoDB
        user.save(function (error) {
          if (error) {
            console.error(error);
            return res.status(500).send({ success: false, msg: 'Could not save data to database.' });
          }
        });
        //Send email
        try {
          emailer.sendReset(user.username, user.email.address, frontendURL+'/#/forgot/' + user.email.resetPasswordToken);
        } catch (err) {
          res.json({ success: false, msg: 'Something went wrong when sending the email, try again' });
        }
        //Return JSON object back
        return res.json({ success: true, msg: "If registered, an email with instructions on how to reset your password has been sent to the provided email" });
      }
    }
  });
});

//POST method for resetting password
router.post('/reset', function (req, res) {

  User.findOne({
    'email.resetPasswordToken': req.body.resetPasswordToken
  }, function (err, user) {
    if (err) {
      return res.json({ success: false, msg: "Beep boop, something bad happend" });
    }
    //Keeping it safe, to avoid user exposure
    if (!user) {
      return res.json({ success: false, msg: "Bad token" });
    } else {
      //Create a new Date object to compare to compare with
      var currentDate = new Date();
      //Check if the resetPassExpire is in the future
      if (currentDate < user.email.resetPasswordExpires) {
        user.password = req.body.newPassword;
        user.email.resetPasswordExpires = Date.now();
      } else {
        return res.json({ success: false, msg: "Reset link has expired, please request a new link." });
      }
      //Persist the changes
      user.save(function (error) {
        if (error) {
          console.error(error);
          return res.status(500).send({ success: false, msg: 'Could not save data to database.' });
        }
      });
      //Send email
      try {
        emailer.sendResetConfirm(user.username, user.email.address);
      } catch (error) {
        res.json({ success: false, msg: 'Something went wrong when sending the email, try again' });
      }
      //Return JSON object back
      return res.json({ success: true, msg: "Password has been reset!" });
    }
  });
});

//GET method to retriving a specific user from username.
router.get('/user/:username', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {
        if (user.roles.isAdmin) {

          User.findOne({
            'username': req.params.username
          }, function (err, foundUser) {
            if (err) throw err;
            else {

              var returnUser = {
                _id: foundUser._id,
                username: foundUser.username,
                email: foundUser.email,
                roles: foundUser.roles,
                info: foundUser.info,
                games: foundUser.games,
              }

              return res.json({ success: true, user: returnUser });
            }
          });

        } else {
          return res.status(403).send({ success: false, msg: 'Unauthorized.' });
        }
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

//DELETE method for deleting a specific user from username.
router.delete('/delete/:username', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {

        if (user.roles.isAdmin) {

          User.findOneAndRemove({
            'username': req.params.username
          }, function (err, foundUser) {
            if (err) throw err;
            else {
              return res.json({ success: true, msg: "Successfully removed user: " + req.params.username });
            }
          });

        } else {
          return res.status(403).send({ success: false, msg: 'Unauthorized.' });
        }
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});


//GET method to retriving all users.
router.get('/users', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {

        if (user.roles.isAdmin) {
          db.collection('users').find({}).toArray(function (err, result) {
            if (err) throw err;
            else {
              returnArray = [];
              for (var i = 0, len = result.length; i < len; i++) {
                var newObj = {
                  username: result[i].username,
                  email: result[i].email,
                  roles: result[i].roles,
                  info: result[i].info,
                }
                returnArray.push(newObj);
              }
              return res.json({ success: true, users: returnArray });
            }
          });

        } else {

          return res.status(403).send({ success: false, msg: 'Unauthorized.' });

        }
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

//GET method to retriving stats.
router.get('/stats', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {

        res.json({ success: true, games: user.games });
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

//GET-method for pinging the server to check if it is online.
router.get('/checkConnection', function (req, res) {

    return res.send({ success: true, msg: 'Successfull connected to the server' });
  }
);

//GET method to retriving stats for a specific game.
router.get('/stats/:game', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {
        //Check if the array if populated
        if (user.games.length == 0) {
          return res.json({ success: false, msg: "No data" });
        } else {
          //Find game
          user.games.forEach(game => {
            if (game.name == req.params.game) {
              return res.json({ success: true, stats: game.stats });
            } else {
              return res.json({ success: false, msg: "No data" });
            }
          });
        }
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

//Post method for updating stats
router.post('/stats/:game', passport.authenticate('jwt', { session: false }), function (req, res) {
  //We need the token for validation 
  var token = utils.getToken(req.headers);
  if (token) {
    User.findOne({
      'email.address': utils.emailFromJwt(token)
    }, function (err, user) {
      if (err) throw err;
      else {
        //Try to parse the incomming JSON into the user.stats object 
        try {
          //check if the user already has stats for that game
          //If it does
          if (user.games.filter(game => (game.name === req.params.game)).length != 0) {
            user.games.forEach(game => {
              if (game.name == req.params.game) {
                game.stats = JSON.parse(req.body.stats);
              }
            });
            //Tell mongoose that the stats nested object has been modified
            user.markModified('games');
            console.log("Updated stats for user: " + user.username);
          } else {
            let tempObj = {
              name: req.params.game,
              stats: JSON.parse(req.body.stats)
            }
            user.games.push(tempObj);
          }
        } catch (error) {
          console.log(error);
          return res.status(500).send({ success: false, msg: 'Bad JSON format' });
        }
        //Save the changes on mongoDB
        user.save(function (error) {
          if (error) {
            console.error(error);
            return res.status(500).send({ success: false, msg: 'Could not save data to database.' });
          }
        });
        //Respond with happy times!
        res.json({ success: true, msg: 'Statistics for ' + user.email.address + ' has been updated!' });
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

module.exports = router;