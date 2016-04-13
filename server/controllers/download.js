var express = require('express');
var router = express.Router();
var Download = require('../models/download');
var NotificationHelper = require('cozy-notifications-helper');
var cozydb = require('cozydb');


// Create a new download
router.post('/downloads/', function(req, res, next) {

	console.log("router.post.download:START");

	var urlParsing = require('url');
	var filename = urlParsing.parse(req.body.url).pathname;
	filename = filename.substring(filename.lastIndexOf('/')+1);

    model = req.body.download ? JSON.parse(req.body.download) : req.body;
    newDownload = new Download(model);

	newDownload.filename = filename;
	newDownload.protocol = urlParsing.parse(req.body.url).protocol;
	newDownload.created = new Date().toISOString();
	newDownload.status = 'submitted';

	// url is the location of file to download
	// filename is full path of destination
	var downloadFile = function(currentProtocol, currentUrl, currentFile, callback) {

		console.log("router.post.download.downloadFile:START");

		//Download a page and save to disk
		var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;
		var http = null;
		var fs = require('fs');

		if ( typeof persistentDirectory === 'undefined') {
			persistentDirectory = './client/data';
		}
		currentFile = persistentDirectory+'/'+currentFile;

		console.log("currentFile:" + currentFile);
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
					callback(response.statusCode + ' ERROR getting ' + currentUrl);
				}
				console.log('start download from URL ['+currentUrl+'], saving to file ['+currentFile+']');
				var fd = fs.openSync(currentFile, 'w');
				response.on("data", function(chunk) {
					fs.write(fd, chunk,  0, chunk.length, null, function(err, written, buffer) {
						if(err) {
							callback(err);
							console.log(err);
						}
					});
				 });

				response.on("end", function() {
					fs.closeSync(fd);
					console.log('end download file ['+currentFile+']');

					callback(null, currentFile, stats['size']);
				});
			}).on('error', function(e) {
				callback(e.message);
				console.log("Got error: " + e.message);
			});
		}
		console.log("router.post.download.downloadFile:END");

	};

	Download.create(newDownload, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK downloading
			downloadFile(newDownload.protocol, newDownload.url, newDownload.filename, function (err, currentPath, currentFilesize) {

				console.log("router.post.download.downloadFile:END");
				var currentStatus = 'available';
		        if(err) {
					currentStatus = 'error';
				}

				// UPDATE download status
				download.updateAttributes({filesize: currentFilesize, pathname: currentPath, status: currentStatus, updated: new Date().toISOString()}, function(err) {
						if (err) {
							console.log("Got error updateAttributes: " + err);
							next(err);
						}
					}
				);

				// email notification
				if (false && download.notify == true) {

					var mailOptions = {
						from: 'myCozy',
						subject: 'Cozy Downloader : your download is successful',
						content: 'You file ['+download.filename+'] has been downloaded ! Find it on your instance',
					};

					cozydb.api.sendMailToUser(mailOptions, function(err) {
						console.log('sent update mail to cozy user');
						if (err) {
							console.log(err);
						}
					});
				}

			});

			res.sendStatus(200);
       }
    });

	console.log("router.post.downloads:END");

});

// List of all downloads
router.get('/downloads/list', function(req, res, next) {
	//console.log(cozydb.api);
	var fs = require('fs');
    Download.request('all', function(err, downloads) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK
			var fs = require('fs');

//			console.log(downloads);

			for (var i=0; i < downloads.length; i++) {
				console.log('file does not exists ('+i+'):' + downloads[i].pathname);

				if (downloads[i].status !== 'submitted' ) {
					try {
						// check file exists
						fs.accessSync(downloads[i].pathname, fs.F_OK);
						// file is present
						var stats = fs.statSync(downloads[i].pathname);

						downloads[i].updateAttributes({status: 'available', filesize: stats['size']}, function(err, download) {
							if(err) {
								// ERROR
								next(err);
							} else {
								// OK
								download.status = 'available';
								download.filesize = stats['size'];
							}
						});

					}
					catch (err) {
						// file does not exist, updates attributes
						downloads[i].updateAttributes({status: 'filenotfound', filesize: 0}, function(err, download) {
							if(err) {
								// ERROR
								next(err);
							} else {
								// OK
								download.status = 'filenotfound';
								download.filesize = 0;
							}
						});
					}
				}
			}
//			console.log(downloads);
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
router.get('/downloads/delete/:id', function(req, res, next) {

    Download.find(req.params.id, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else if(!download) {
            // DOC NOT FOUND
            //res.sendStatus(404);
        } else {
			if (download.pathname != null) {
				var fs = require('fs');
				try {
					console.log('request for delete : ' + download.pathname);
					fs.unlinkSync(download.pathname);
				}
				catch (err) {
					console.log('file delete error'+err);
				}

			}
			download.destroy(function (err) {});
			res.sendStatus(200);
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
