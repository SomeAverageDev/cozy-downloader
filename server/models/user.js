var cozydb, getUserInfo, hideEmail;

cozydb = require('cozydb');

hideEmail = function(email) {
  return email.split('@')[0].replace('.', ' ').replace('-', ' ');
};

getUserInfo = function(callback) {
  return cozydb.api.getCozyUser(function(err, user) {
    var name, ref, words;
    if (err) {
      return callback(err);
    }
    name = ((ref = user.public_name) != null ? ref.length : void 0) ? user.public_name : (words = hideEmail(user.email).split(' '), words.map(function(word) {
      return word[0].toUpperCase() + word.slice(1);
    }).join(' '));
    return callback(null, {
      name: name,
      email: user.email
    });
  });
};

module.exports.getUserInfo = getUserInfo;

module.exports.getDisplayName = function(callback) {
  return getUserInfo(function(err, user) {
    if (err) {
      return callback(err);
    }
    return callback(null, user.name);
  });
};
