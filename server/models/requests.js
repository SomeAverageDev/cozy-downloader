var cozydb = require('cozydb');

module.exports = {
    download: {
        all: cozydb.defaultRequests.all,
        byStatus: cozydb.defaultRequests.by('status')
    }
};
