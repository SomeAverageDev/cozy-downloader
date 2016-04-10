// Definition of the document type and basic operations
var cozydb = require('cozydb');

var Download = cozydb.getModel('Download', {
    /*
		URL to download
    */
    'url': {
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
