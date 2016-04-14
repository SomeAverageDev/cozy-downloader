var express = require('express');
var router = express.Router();
var Download = require('../models/download');
var NotificationHelper = require('cozy-notifications-helper');
var cozydb = require('cozydb');


// Create a new download
router.post('/downloads/', function(req, res, next) {

	//Download.findByURL(req.body.url);

	var urlParsing = require('url');
	var filename = urlParsing.parse(req.body.url).pathname;
	filename = filename.substring(filename.lastIndexOf('/')+1);

    model = req.body.download ? JSON.parse(req.body.download) : req.body;
    newDownload = new Download(model);

	newDownload.filename = filename;
	newDownload.protocol = urlParsing.parse(req.body.url).protocol;
	newDownload.created = new Date().toISOString();
	newDownload.status = 'submitted';

	var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;

	if ( typeof persistentDirectory === 'undefined') {
		persistentDirectory = './client/data';
	}
	newDownload.pathname = persistentDirectory+'/'+newDownload.filename;

	console.log ('newDownload.pathname:'+newDownload.pathname);
	console.log ('newDownload.filename:'+newDownload.filename);

	Download.create(newDownload, function(err, download) {
        if(err) {
            // ERROR
			res.status(500).send({
              app: req.application,
              error: true,
              message: err.message,
              stack: err.stack
            });
        } else {
			// OK downloading from URL
			// https://github.com/SamDecrock/node-httpreq#download
			var httpreq = require('httpreq');

			httpreq.download( download.url , download.pathname ,
				function (err, progress) {
					if (err) return console.log(err);
					//console.log(progress);
				},
				function (err, res){
					if (err) return console.log(err);
					else {
						var currentStatus = 'available';
						if (err) {
							currentStatus = 'error';
						} else {

							// UPDATE download status
							download.updateAttributes ({filesize: res.headers['content-length'], status: currentStatus, updated: new Date().toISOString()}, function(err) {
								if (err) {
									console.log("Got error updateAttributes: " + err);
									next(err);
								}
							});
						}

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
					}
					console.log(res);
				}
			);
			res.sendStatus(200);
       }
    });

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

				if (downloads[i].status !== 'submitted' ) {
					try {
						// check file exists
						fs.accessSync(downloads[i].pathname, fs.F_OK);

						// file is present, checking size
						var stats = fs.statSync(downloads[i].pathname);
						var localFilesize = stats['size'];
						var currentStatus = 'error';
						if (localFilesize > 0) {
							currentStatus = 'available';
						}

						// update attributes
						downloads[i].status = currentStatus;
						downloads[i].filesize = localFilesize;
						downloads[i].save(function (err) {});
/*
						downloads[i].updateAttributes({status: currentStatus, filesize: localFilesize}, function(err, download) {
							if(err) {
								// ERROR
								return console.log(err);
							} else {
								// OK
								return true;
							}
						});
*/

					}
					catch (err) {
						console.log('file does not exists ('+i+'):' + downloads[i].pathname);
						// file does not exist, update attributes
						downloads[i].status = 'filenotfound';
						downloads[i].filesize = 0;
						downloads[i].save(function (err) {});
/*
						downloads[i].updateAttributes({status: 'filenotfound', filesize: 0}, function(err, download) {
							if(err) {
								// ERROR
								return console.log(err);
							} else {
								// OK
								return true;
							}
						});
*/
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
			var redir = download.pathname;
			redir = redir.replace('./client','');
			redir = redir.replace(process.env.APPLICATION_PERSISTENT_DIRECTORY, '');
            res.redirect(redir);
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
            res.sendStatus(404);
        } else {
			if (download.pathname != null) {
				var fs = require('fs');
				try {
					console.log('request for delete file:' + download.pathname);
					fs.unlinkSync(download.pathname);
				}
				catch (err) {
					console.log('file delete error:'+err);
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
