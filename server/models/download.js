// Definition of the document type and basic operations
var cozydb = require('cozydb');


var Download = cozydb.getModel('Download', {
    // Download model
    'url': {
        type: String,
        default: ''
    },
    'filename': {
        type: String,
        default: ''
    },
    'fileId': {
        type: String,
        default: ''
    },
	'notify': {
        type: Boolean,
        default: false
    },
    'status': {
        type: String,
        default: ''
    },
	'created': {
      type: Date,
      default: Date
    },
    'updated': {
      type: Date,
      default: Date
    } 
});


// Make this model available from other files.
module.exports = Download;
