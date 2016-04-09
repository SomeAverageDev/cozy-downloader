// Definition of the document type and basic operations
var cozydb = require('cozydb');

var Download = cozydb.getModel('Download', {
    /*
		URL to download
    */
    'url': {
        default: '',
        type: String,
    }
});


// Make this model available from other files.
module.exports = Download;
