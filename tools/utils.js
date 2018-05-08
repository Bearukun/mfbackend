var config = require('../config/database');
var jwt = require('jsonwebtoken');
var randomstring = require("randomstring");

//Function to extract email information from token
function emailFromJwt(token) {
  var decoded;
  try {
    decoded = jwt.verify(token, config.secret);
    console.log(decoded);
  } catch (error) {
    console.log(error)
  }
  return decoded.email;
}

function generateCode(){
  return randomstring.generate();
};

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = { emailFromJwt, getToken, generateCode };