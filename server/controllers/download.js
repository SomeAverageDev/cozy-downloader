var express = require('express');
var router = express.Router();
var NotificationsHelper = require('cozy-notifications-helper');
var cozydb = require('cozydb');
var fs = require('fs');

var Download = require('../models/download');
var User = require('../models/user');
var CozyInstance = require('../models/cozyinstance');
var Folder = require('../models/folder');

var filesFolderName = '/Downloads';

var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;
if ( typeof persistentDirectory === 'undefined') {
	persistentDirectory = __dirname+'/../../client/public/data';
}

CozyInstance.first(function (err, instance) {
	console.log(instance);
});

var notificationsHelper = new NotificationsHelper('downloader');

var proceedWithDownload = function (download) {
	// https://github.com/SamDecrock/node-httpreq#download

	console.log("proceedWithDownload:START:", download.url);

	var httpreq = require('httpreq');
	var inProgress=0;

	download.fileprogress = 0;
	download.filesize = 0;
	download.status = 'pending';

	httpreq.download( download.url , download.pathname ,
		function (err, progress) {
			if (err) {
				console.log('ERROR:httpreq.download:progress:',err,progress);
/*				download.updateAttributes({updated: new Date(),statusMessage: JSON.stringify(err), status: 'error'}, function(err) {
					if(err) {
						// ERROR
						return console.log(err);
					} else {
						// OK
						return true;
					}
				});*/
			}
			else {

				if (inProgress !== parseInt(progress.percentage) && parseInt(progress.percentage) < 90) {
					inProgress = parseInt(progress.percentage);
					download.updateAttributes({status: download.status, updated: new Date(),filesize: progress.totalsize, fileprogress: progress.currentsize}, function(err) {
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
				console.log (res);
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
					(download.filesize === 0) ? download.filesize = res.headers['content-length'] : function () {
						var stats = fs.statSync(downloads[i].pathname);
						return stats['size'];
					};

					(res.headers['content-length'] === 0) ? download.fileprogress = download.filesize : download.fileprogress = res.headers['content-length'];
					download.statusMessage=JSON.stringify(res);
					download.status = 'available';
					download.mime = res.headers['content-type'];
				}
/*
				download.save(function(err) {
					if(err) {
						// ERROR
						console.log('download.save:err:',err);
					} else {
						// OK
						console.log('download.save:OK:',download);
					}
					return true;
				});
*/
				download.updateAttributes({
						updated: new Date(),
						filesize:download.filesize,
						fileprogress:download.fileprogress,
						statusMessage:download.statusMessage,
						status:download.status,
						mime:download.mime
					},
					function(err) {
						if(err) {
							// ERROR
							return console.log(err);
						} else {
							// OK
							console.log('download.updateAttributes:OK:',download);
							return true;
						}
					}
				);

				// HOME notification
				var notifyMailMessage, notifyHomeMessage, notifyTitle;

				if (download.status !== 'error') {
					notifyMailMessage = 'Your file [<a href="downloads/'+download._id+'">'+download.filename+'</a>] has been downloaded successfully.';
					notifyMailMessage += '<br />It was submitted within the URL [<a href="'+download.url+'">'+download.url+'</a>].';
					notifyMailMessage += '<br /><br />Find it on your cozy';
					notifyHomeMessage = 'Your file ['+download.filename+'] has been downloaded';
					notifyTitle = 'Cozy-Downloader : your file is available !';
				} else {
					notifyMailMessage = 'Oups, your file ['+download.filename+'] has not been downloaded.';
					notifyMailMessage += '<br />It was submitted within the URL [<a href="'+download.url+'">'+download.url+'</a>].';
					notifyHomeMessage = 'Oups, your file ['+download.filename+'] has not been downloaded.';
					notifyTitle = 'Cozy-Downloader : your download failed...';
				}

				notificationsHelper.createOrUpdatePersistent('notify-downloader-new', {
					resource: {
						app: 'downloader',
						url: '/'
					},
					text: notifyHomeMessage
				}, console.log());

				// EMAIL notification if requested
				if (download.notify == true) {

					User.getUserInfo(function(err, user) {
						if (err != null) {
							console.log(err);
						} else {
							var mailOptions = {
								from: 'myCozy <' + user.email || 'cozy@localhost>',
								subject: notifyTitle,
								content: notifyMailMessage,
								html: '<html><body>Hello ' + user.name + '<br /><br />' + notifyMailMessage + '</body></html>',
							};

							cozydb.api.sendMailToUser(mailOptions, function(err) {
								console.log('sent mail notification to cozy user:'+user.email);
								if (err) {
									console.log(err);
								}
							});
						}
					});


				}
			}
//					console.log(res);
		}
	);
}


// Create a new download
router.post('/downloads/new/', function(req, res, next) {
	//console.log(req.body);

	if (req.body.url === '' || typeof (req.body.url) === 'undefined') {
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
				newDownload.status = 'pending';

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
            console.log(err);
			res.sendStatus(200);
        } else {
			// OK listing downloads
			for (var i=0; i < downloads.length; i++) {
				//console.log('*** checking download : ',downloads[i]);

				// checking file last modification
				if (downloads[i].updated && downloads[i].filesize !== downloads[i].fileprogress) {

					var lastUpdate = (new Date()-downloads[i].updated);

					console.log('checking last update='+lastUpdate);

					// if last update is > 120s, it could be on error
					if (lastUpdate > 120000) {
						downloads[i].status = 'error';
						downloads[i].statusMessage = 'last update is old, download might have been truncated...';
					}
				}

				if (downloads[i].status !== 'pending') {
					try {
						// check file exists
						fs.accessSync(downloads[i].pathname, fs.F_OK);

						// file is present, checking size
						var stats = fs.statSync(downloads[i].pathname);
						downloads[i].fileprogress = stats['size'];
						if (downloads[i].filesize === 0 && stats['size'] > 0) {
							downloads[i].filesize = stats['size'];
						}
						downloads[i].status = 'error';
						if (downloads[i].filesize > 0 && downloads[i].fileprogress === downloads[i].filesize) {
							downloads[i].status = 'available';
						}
					}
					catch (err) {
						console.log('file does not exists ('+i+'):' , downloads[i].pathname);
						// file does not exist, update attributes
						downloads[i].status = 'filenotfound';
						//downloads[i].fileprogress = 0;
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
router.delete('/downloads/delete/:id', function(req, res, next) {

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


// send download in File app
router.put('/downloads/tofile/:id', function(req, res, next) {

    Download.find(req.params.id, function(err, download) {
        if(err) {
			// ERROR
	 		console.log('requested download not found in database, id:',err);
			next(err);
        } else if(!download) {
            // DOC NOT FOUND
			console.log('requested download not found in database, id:',req.params.id);
            res.sendStatus(404);
        } else {
            // CHECKS TOSEND DOWNLOAD TO FILE APP
			console.log('requested download found');

			var File = require('../models/file');

			File.isPresent('/'+download.filename, function(err, isFilePresent) {
				console.log("File.isPresent:isFilePresent:",isFilePresent);
				if (err) {
					console.log("File.isPresent:err:",err);
					res.sendStatus(200);
				} else if (isFilePresent) {
					console.log ("download ",download.pathname," already present in file...");
					res.sendStatus(206);
				} else {

					// CREATE FOLDER IF NEEDED
					Folder.isPresent ( filesFolderName , function(err, isFolderPresent) {
						if (err) {
							console.log("Folder.isPresent:err:",err);
						} else if (isFolderPresent) {
							console.log ("folder in already present in Folders");
						} else {
							Folder.createNewFolder ( {path: '', name: filesFolderName.substring(1) }, function(err) {
								if(err) {
									// ERROR
									console.log("Folder.createNewFolder:err:",err);
								} else {
									console.log ("Folder created");
								}
							});
						}
					});

					// SEND DOWNLOAD TO FILE APP
					var now = new Date();
					var fileData = {
						name: download.filename,
						size: download.filesize,
						path: filesFolderName,
						creationDate: now.toISOString(),
						lastModification: now.toISOString(),
						"class": 'document',
						mime: download.mime
					};

					File.createNewFile(fileData, download.pathname, function(err) {
						if(err) {
							// ERROR
							console.log("File.createNewFile:err:",err);
						} else {
							console.log ("download '",download.pathname,"' stored in files app");
							// destroy the download and local file
							download.destroy(function (err) {
								if (download.pathname != null) {
									try {
										fs.unlinkSync(download.pathname);
										console.log('request for delete file:' + download.pathname);
									}
									catch (err) {
										console.log('file delete error:'+err);
									}
								}
							});
						}
					});

					res.sendStatus(200);
				}
			});
        }

    });
});

// Get folders list
router.get('/downloads/folder', function(req, res, next) {
	Folder.byFullPath ( {key: filesFolderName}, function(err, folders) {
		if(err) {
			// ERROR
			console.log(err);
		} else {
			if (folders.length > 0) {
				res.status(200).send(JSON.stringify(folders));
			} else {
				res.sendStatus(404);
			}
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
