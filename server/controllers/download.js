var express = require('express');
var router = express.Router();
var Download = require('../models/download');
var NotificationHelper = require('cozy-notifications-helper');
var cozydb = require('cozydb');

var cozydomain = 'http://your.friends.cozy.url/';

cozydb.api.getCozyDomain(function(err, domain) {
  if (err) {
    return console.log(err);
  }
  return cozydomain = domain;
});


// Create a new download
router.post('/downloads/', function(req, res, next) {

	console.log("router.post.download:START");
		
	var urlParsing = require('url');
	var filename = urlParsing.parse(req.body.url).pathname;
	var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;
	filename = filename.substring(filename.lastIndexOf('/')+1);


	if ( typeof persistentDirectory === 'undefined') {
		persistentDirectory = 'data';
	}
	console.log("persistentDirectory:" + persistentDirectory);

    model = req.body.download ? JSON.parse(req.body.download) : req.body;
    newDownload = new Download(model); 

	newDownload.filename = persistentDirectory+'/'+filename;
	newDownload.protocol = urlParsing.parse(req.body.url).protocol;
	newDownload.created = new Date().toISOString(); 
	newDownload.status = 'submitted';

	// url is the location of file to download
	// filename is full path of destination
	var downloadFile = function(currentProtocol, currentUrl, currentFile) {

		//Download a page and save to disk
		var http = null;
		var fs = require('fs');

		currentFile = 'client/'+currentFile;

		console.log("currentProtocol:" + currentProtocol);

		// CHECK PROTOCOL
		if (currentProtocol.match(/^https*:$/)) {
			// HTTP ou HTTPs
			currentProtocol = currentProtocol.slice(0, -1); // remove ':'
			// loading library
			http = require(currentProtocol);

			http.get(currentUrl, function(response) {
				if (response.statusCode !== 200) {
					if (response) { 
						console.log(response.statusCode + ' ERROR getting ' + currentUrl);
					}
					//process.exit(1);
				}
				console.log('start download from URL ['+currentUrl+'], saving to file ['+currentFile+']');
				var fd = fs.openSync(currentFile, 'w');
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
					console.log('end download file ['+currentFile+']');

					// email notification
					if (newDownload.notify == true) {

						var mailOptions = {
							from: 'myCozy',
							subject: 'Cozy Downloader : your download is successful',
							content: 'You file has been downloaded ! Find it at instance = '+JSON.stringify(cozydb.api.getCozyInstance(), null, 2),
						};
						cozydb.api.sendMailToUser(mailOptions, function(err) {
							console.log('sent update mail to cozy user');
							if (err) {
								return console.log(err);
							}
						});

					}

				  //process.exit(0);
				});
			}).on('error', function(e) {
				console.log("Got error: " + e.message);
				//process.exit(1);
			});
		}

	};

	Download.create(newDownload, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK downloading

			downloadFile(newDownload.protocol, newDownload.url, newDownload.filename);
			res.sendStatus(200);
       }
    });
	
	console.log("router.post.downloads:END");

});

// List of all downloads
router.get('/downloads/list', function(req, res, next) {
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

// Fetch an existing download by its ID
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


// Remove an existing download and delete file
router.delete('/downloads/:id', function(req, res, next) {
    Download.destroy(req.params.id, function(err) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK
			var fs = require('fs');
            res.sendStatus(204);
        }
    });
});

// Update an existing download
router.put('/downloads/:id', function(req, res, next) {
    /*
        First, get the document we want to update.
    */
    Download.find(req.params.id, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else if(!download) {
            // DOC NOT FOUND
            res.sendStatus(404);
        } else {
            // UPDATE THE OBJECT
            download.updateAttributes(req.body, function(err, download) {
				if(err) {
					// ERROR
                    next(err);
                } else {
					// OK
                    res.status(200).send(download);
                }
            });
        }

    });
});

// Export the router instance to make it available from other files.
module.exports = router;
