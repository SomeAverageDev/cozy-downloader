var express = require('express');
var router = express.Router();
var Download = require('../models/download');
var NotificationsHelper = require('cozy-notifications-helper');
var cozydb = require('cozydb');
var fs = require('fs');

var CozyInstance = require('../models/cozyinstance');
var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;
if ( typeof persistentDirectory === 'undefined') {
	persistentDirectory = __dirname+'/../../client/public/data';
}

/*
console.log(CozyInstance.getLocale(function(err, locale) {
      if ((err != null) || !locale) {
        locale = 'en';
      }
      return null;
    })
);
console.log(CozyInstance.getURL(function(err, locale) {
      return null;
    })
);

*/

var notificationsHelper = new NotificationsHelper('downloader');

var proceedWithDownload = function (download) {
	// https://github.com/SamDecrock/node-httpreq#download

	console.log("proceedWithDownload:START:", download.url);

	var httpreq = require('httpreq');
	var inProgress=0;

	download.fileprogress = 0;
	download.filesize = 0;
	download.status = 'submitted';

	httpreq.download( download.url , download.pathname ,
		function (err, progress) {
			if (err) {
				console.log('ERROR:httpreq.download:progress:',err,progress);
				download.updateAttributes({updated: new Date(),statusMessage: JSON.stringify(err), status: 'error'}, function(err) {
					if(err) {
						// ERROR
						return console.log(err);
					} else {
						// OK
						return true;
					}
				});
			}
			else {

				if (inProgress !== parseInt(progress.percentage) && progress.percentage < 90) {
					inProgress = parseInt(progress.percentage);
					download.updateAttributes({updated: new Date(),filesize: progress.totalsize, fileprogress: progress.currentsize}, function(err) {
						if(err) {
							// ERROR
							return console.log(err);
						} else {
							// OK
							return true;
						}
					});
				}
			}
			//console.log(progress);
		},
		function (err, res) {
			if (err) {
				console.log('ERROR:httpreq.download:res:1:',err,res);
				download.updateAttributes({updated: new Date(),statusMessage: JSON.stringify(err), status: 'error'}, function(err) {
					if(err) {
						// ERROR
						return console.log(err);
					} else {
						// OK
						return true;
					}
				});
			}
			else {
				//console.log (res);
				if (err) {
					console.log('ERROR:httpreq.download:res:2:'+err);
					download.status = 'error';
					download.statusMessage=JSON.stringify(err);

				} else if (res.statusCode != 200) {
					console.log('ERROR:httpreq.download:res:3:'+JSON.stringify(res));
					download.status = 'error';
					download.statusMessage=JSON.stringify(res);

					// error, delete local file
					try {
						console.log('request for delete file:' + res.downloadlocation);
						fs.unlinkSync(res.downloadlocation);
					}
					catch (err) {
						console.log('file delete error:'+err);
					}
				} else {
					// download OK
					(download.filesize === 0) ? download.filesize = res.headers['content-length'] : '';
					download.fileprogress = res.headers['content-length'];
					download.statusMessage=JSON.stringify(res);
					download.status = 'available';
				}

				download.updateAttributes({
						updated: new Date(),
						filesize:download.filesize,
						fileprogress:download.fileprogress,
						statusMessage:download.statusMessage,
						status:download.status
					},
					function(err) {
						if(err) {
							// ERROR
							return console.log(err);
						} else {
							// OK
							return true;
						}
					}
				);

				// NOTIFICATION
				// HOME notification
				var notifyRef = "notify-downloader-new", notifyMailMessage, notifyHomeMessage, notifyTitle;

				if (download.status !== 'error') {
					notifyMailMessage = 'Your file ['+download.filename+'], submitted within the URL [<a href="'+download.url+'">'+download.url+'</a>] has been successfully downloaded.';
					notifyHomeMessage = 'Your file ['+download.filename+'] has been downloaded';
					notifyTitle = 'Cozy-Downloader : your file is available'
				} else {
					notifyMailMessage = 'Oups, your file ['+download.filename+'], submitted within the URL [<a href="'+download.url+'">'+download.url+'</a>] has not been downloaded.';
					notifyHomeMessage = 'Oups, your file ['+download.filename+'] has not been downloaded.';
					notifyTitle = 'Cozy-Downloader : your download failed'
				}

				notificationsHelper.createOrUpdatePersistent(notifyRef, {
					resource: {
						app: 'downloader',
						url: '/'
					},
					text: notifyHomeMessage
				}, console.log());

				// EMAIL notification if requested
				if (download.notify == true) {
					var mailOptions = {
						from: 'myCozy <cozy@localhost>',
						subject: notifyTitle,
						content: notifyMailMessage +  ' ! Find it on your instance',
					};

					cozydb.api.sendMailToUser(mailOptions, function(err) {
						console.log('sent mail notification to cozy user');
						if (err) {
							console.log(err);
						}
					});
				}
			}
//					console.log(res);
		}
	);

	console.log("proceedWithDownload:END:", download.url);
}


// Create a new download
router.post('/downloads/new/', function(req, res, next) {
	//console.log(req.body);

	if (req.body.url === '') {
		return res.status(500).send('the url parameter is empty');
	}

	// looking for same URL
	Download.request ('byUrl', {
            'key': req.body.url
          }, function(err, foundDownload) {
        if(err) {
			next (err);
		} else {
			//console.log(foundDownload.length);
			if (foundDownload.length > 0) {
				//console.log ('SAME URL FOUND:',foundDownload);
				return res.status(500).send('this URL is already known !');
			} else {
				//console.log ('OK, this is a new URL');
				// new url > continue to download
				var urlParsing = require('url');
				var filename = urlParsing.parse(req.body.url).pathname;
				filename = filename.substring(filename.lastIndexOf('/')+1);

				model = req.body.download ? JSON.parse(req.body.download) : req.body;
				newDownload = new Download(model);

				newDownload.filename = filename;
				newDownload.protocol = urlParsing.parse(req.body.url).protocol;
				newDownload.created = new Date();
				newDownload.status = 'submitted';

				newDownload.pathname = persistentDirectory+'/'+newDownload.filename;

				console.log ('newDownload.pathname:'+newDownload.pathname);
				console.log ('newDownload.filename:'+newDownload.filename);

				// saving the object in DB
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
						proceedWithDownload(download);
						res.sendStatus(200);
				   }
				});
			}
		}
	});

});

// List of all downloads
router.get('/downloads/list', function(req, res, next) {

    Download.request('all', function(err, downloads) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK listing downloads
			for (var i=0; i < downloads.length; i++) {
				//console.log('*** checking download : ',downloads[i]);

				// checking file last modification
				if (downloads[i].updated && downloads[i].filesize !== downloads[i].fileprogress) {

					var lastUpdate = (new Date()-downloads[i].updated);

					console.log('checking last update='+lastUpdate);

					// if last update is > 90s, it could be on error
					if (lastUpdate > 90000) {
						downloads[i].status = 'error';
						downloads[i].statusMessage = 'last update is old, download might have been truncated...';
					}
				}

				if (downloads[i].status !== 'submitted') {
					try {
						// check file exists
						fs.accessSync(downloads[i].pathname, fs.F_OK);

						// file is present, checking size
						var stats = fs.statSync(downloads[i].pathname);
						downloads[i].fileprogress = stats['size'];
						downloads[i].status = 'error';
						if (downloads[i].fileprogress > 0 && downloads[i].fileprogress === downloads[i].filesize) {
							downloads[i].status = 'available';
						}
					}
					catch (err) {
						console.log('file does not exists ('+i+'):' , downloads[i].pathname);
						// file does not exist, update attributes
						downloads[i].status = 'filenotfound';
						downloads[i].fileprogress = 0;
					}
				}

				// saving attributes
				downloads[i].save(function (err) {});

			}

			//console.log(downloads);
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
			console.log("/downloads/:id - trying to send file : ", download.pathname);
			try {
				// check file exists
				fs.accessSync(download.pathname, fs.F_OK);

				console.log('GOOD : file exists !!');

				var options = {
					dotfiles: 'deny',
					headers: {
						'x-timestamp': Date.now(),
						'x-sent': true,
						'Content-Type': 'application/octet-stream',
						'Content-Disposition': 'attachment; filename="' + download.filename +'"'
					}
				};
	/*
				if ( typeof persistentDirectory !== 'undefined') {
					options.root = persistentDirectory;
					console.log("setting options.root = ", options.root);
				} else {
					options.root = __dirname;
					console.log("setting options.root = ", options.root);
				}
	*/
				res.sendFile(download.pathname, options, function (err) {
					console.log('ERROR (sendFile) : ',err);
					res.sendStatus(404);
				});
			} catch (err) {
				console.log('ERROR : file does not exists !!');
				// file does not exist, update attributes
				res.sendStatus(404);
			}
        }
    });
});


// retry an existing download
router.get('/downloads/retry/:id', function(req, res, next) {

    Download.find(req.params.id, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else if(!download) {
            // DOC NOT FOUND
            res.sendStatus(404);
        } else {
			if (download.pathname != null) {
				try {
					console.log('request for delete file:' + download.pathname);
					fs.unlinkSync(download.pathname);
				}
				catch (err) {
					console.log('file delete error:'+err);
				}

			}
			// RETRY
			proceedWithDownload(download);
			res.sendStatus(200);
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
			var localFilename = download.pathname;

			download.destroy(function (err) {
				if (localFilename != null) {
					try {
						fs.unlinkSync(localFilename);
						console.log('request for delete file:' + localFilename);
					}
					catch (err) {
						console.log('file delete error:'+err);
					}
				}
			});
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
