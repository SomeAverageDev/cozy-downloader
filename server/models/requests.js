var cozydb = require('cozydb');

module.exports = {
    download: {
        all: cozydb.defaultRequests.all,
        byStatus: cozydb.defaultRequests.by('status'),
        byUrl: cozydb.defaultRequests.by('url'),
        byFilename: cozydb.defaultRequests.by('filename')
	},

	file: {
		byFullPath: function(doc) {
		  return emit(doc.path + "/" + doc.name, doc);
		}
	},

	folder: {
		all: cozydb.defaultRequests.all,
		byFolder: cozydb.defaultRequests.by('path'),
		byFullPath: function(doc) {
			return emit(doc.path + '/' + doc.name, doc);
		}
	}
};
