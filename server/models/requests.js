var cozydb = require('cozydb');

module.exports = {
    download: {
        all: cozydb.defaultRequests.all,
        byStatus: cozydb.defaultRequests.by('status'),
        byUrl: cozydb.defaultRequests.by('url'),
        byFilename: cozydb.defaultRequests.by('filename')
	}
};
