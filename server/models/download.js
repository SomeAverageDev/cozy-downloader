// Definition of the document type and basic operations
var cozydb = require('cozydb');


var Download = cozydb.getModel('Download', {
    // Download model
    'url': {
        'type': String,
        'default': ''
    },
    'protocol': {
        'type': String,
        'default': null
    },
    'filename': {
        'type': String,
        'default': ''
    },
    'fileId': {
        'type': String,
        'default': ''
    },
	'notify': {
        'type': Boolean,
        'default': false
    },
    'status': {
        'type': String,
        'default': 'submitted'
    },
	'token': {
      'type': String,
      'default': null
    },
	'created': {
      'type': Date,
      'default': null
    },
    'updated': {
      'type': Date,
      'default': null
    } 
});


// Make this model available from other files.
module.exports = Download;
