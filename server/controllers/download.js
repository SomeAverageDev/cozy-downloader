var express = require('express');
var router = express.Router();
var Download = require('../models/download');


// Create a new download
router.post('/create', function(req, res, next) {

	var urlparsing = require('url');
	var filename = urlparsing.parse(req.body.url).pathname;
	filename = filename.substring(filename.lastIndexOf('/')+1);
	var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;

	if ( typeof persistentDirectory === 'undefined') {
		persistentDirectory = './client/data';
	}

/*
    Download.create(req.body, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else {
*/
			// OK downloading

			// url is the location of file to download
			// fileName is full path of destination
			var downloadFile = function(url , fileName) {

				//Download a page and save to disk
				var http = require('http');
				var fs = require('fs');

				http.get(url, function(response) {
					if (response.statusCode !== 200) {
						if (response) { 
							console.log(response.statusCode + ' ERROR getting ' + url);
						}
						//process.exit(1);
					}
					console.log('start download from URL ['+url+'], saving to file ['+fileName+']');
					var fd = fs.openSync(fileName, 'w');
					response.on("data", function(chunk) {			
						fs.write(fd, chunk,  0, chunk.length, null, function(err, written, buffer) {
							if(err) {
								console.log(err);
								//process.exit(1);
							}
						}); 
					 });
						
					response.on("end", function() {
						fs.closeSync(fd);
						console.log('end download file ['+fileName+']');

					  //process.exit(0);
					});
				}).on('error', function(e) {
					console.log("Got error: " + e.message);
					//process.exit(1);
				});
			};
			
			console.log("persistentDirectory:" + persistentDirectory);
			downloadFile(req.body.url, persistentDirectory+'/'+filename);

			res.sendStatus(200);
//       }
//    });


});


// Fetch an existing download
router.get('/downloads/:id', function(req, res, next) {
    Download.find(req.params.id, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK
            res.status(200).send(download);
        }
    });
});

// List of all downloads
router.get('/downloads', function(req, res, next) {
    /*
        Download.request` asks the data system to request a CouchDB view, given its
        name.
    */
    Download.request('all', function(err, downloads) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK
            res.status(200).json(downloads);
        }
    });
});

// Export the router instance to make it available from other files.
module.exports = router;
