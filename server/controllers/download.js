var express = require('express');
var router = express.Router();
var cozydb = require('cozydb');
var fs = require('fs');

var Download = require('../models/download');
var User = require('../models/user');
var CozyInstance = require('../models/cozyinstance');
var Folder = require('../models/folder');

var debug = require('debug')('downloader');

// HOME Notification Helper
var NotificationsHelper = require('cozy-notifications-helper');
var notificationsHelper = new NotificationsHelper('downloader');

// COZY domain
var localHost = '';
var cozyLocale = 'en';
var folderInFilesId = '';

var persistentDirectory = process.env.APPLICATION_PERSISTENT_DIRECTORY;
if ( typeof persistentDirectory === 'undefined') {
	persistentDirectory = __dirname+'/../../client/public/data';
}

CozyInstance.first(function (err, instance) {
	//debug("domain:",instance);
	//cozyDomain = instance.domain;
	cozyLocale = instance.locale;
});

// FILES and FOLDERS apps options
var filesFolderName = '/Downloads';
var defaultFileTag = 'Downloads';

// Check il a file exists. Works in both Node 0.10 and greater
var fileExistsSync = function (path, mode) {
  if (typeof fs.accessSync === 'function') {
	if (typeof(mode)==='undefined') mode = fs.F_OK;
    try {
      fs.accessSync(path, mode);
      return true;
    } catch (e) {
      return false;
    }

  } else {
    return fs.existsSync(path);
  }
}

// CREATE FOLDER IF NEEDED
Folder.isPresent ( filesFolderName , function(err, isFolderPresent) {
	if (err) {
		debug("Folder.isPresent:err:",err);
	} else if (isFolderPresent) {
		debug ("folder is already present in Folders");
	} else {
		Folder.createNewFolder ( {path: '', name: filesFolderName.substring(1) }, function(err) {
			if(err) {
				// ERROR
				debug("Folder.createNewFolder:err:",err);
			} else {
				debug ("Folder created (in Files app) :", filesFolderName);
			}
		});
	}
});

/*****************************************************
*	Function to store a download in the Files app
*****************************************************/
var storeDownloadInFiles = function (download) {
	var File = require('../models/file');

	File.isPresent(filesFolderName+'/'+download.filename, function(err, isFilePresent) {
		debug("File.isPresent:isFilePresent:", isFilePresent);
		if (err) {
			debug("File.isPresent:err:",err);
			return true;//res.sendStatus(200);
		} else if (isFilePresent) {
			debug ("download ",download.pathname," already present in file...");
			return true;//res.sendStatus(206);
		} else {

			// SEND DOWNLOAD TO FILE APP
			var now = new Date();
			var fileData = {
				name: download.filename,
				size: download.filesize,
				path: filesFolderName,
				creationDate: now.toISOString(),
				lastModification: now.toISOString(),
				tags: [defaultFileTag],
				mime: download.mime
			};
			//debug("File.createNewFile:fileData:", fileData);

			File.createNewFile(fileData, download.pathname, function(err) {
				if(err) {
					// ERROR
					debug("File.createNewFile:err:", err);
				} else {
					debug ("File.createNewFile:OK:download '",download.pathname,"' stored in files app");
					// destroy the download and local file
					download.destroy(function (err) {
						if (download.pathname != null) {
							try {
								fs.unlinkSync(download.pathname);
								debug('download.destroy:OK:', download.pathname);
								return true;//res.sendStatus(200);
							}
							catch (err) {
								debug("download.destroy:error:", err);
								return false;//res.sendStatus(500);
							}
						}
					});
				}
			});
		}
	});
};

/*****************************************************
*	Function to download a file from an URL
*****************************************************/
var proceedWithDownload = function (download) {
	// https://github.com/SamDecrock/node-httpreq#download

	debug("proceedWithDownload:START:", download.url);

	var httpreq = require('httpreq');

	var currentPourcentage = 0;
	var newPourcentage = 0;

	download.fileprogress = 0;
	download.filesize = 0;
	download.status = 'pending';

	httpreq.download( download.url , download.pathname ,
		function (err, progress) {
			//debug("progress:", progress);
			if (err) {
				debug('ERROR:httpreq.download:progress:', err, progress);
				download.updateAttributes({updated: new Date(),statusMessage: JSON.stringify(err), status: 'error'}, function(err) {
					if(err) {
						// ERROR
						return debug("ERROR:httpreq.download:progress:download.updateAttributes", err);
					} else {
						// OK
						return true;
					}
				});
			}
			else {
				newPourcentage = (parseInt(progress.percentage) - (parseInt(progress.percentage) % 5));
				if (download.filesize !== progress.totalsize || (newPourcentage > currentPourcentage && newPourcentage < 101)) {
					debug("httpreq.download:inProgress:", download.filename, ", pourcentage:", newPourcentage);
					currentPourcentage = newPourcentage;
					if (download.status === 'pending') {
						download.updateAttributes({ updated: new Date(), status: download.status, filesize: progress.totalsize, fileprogress: progress.currentsize}, function(err) {
							if(err) {
								// ERROR
								return debug("ERROR:httpreq.download:progress:inProgress:download.updateAttributes",err);
							} else {
								// OK
								//debug("httpreq.download:progress:inProgress:download.updateAttributes:OK");
								return true;
							}
						});

					}
				}
			}
		},
		function (err, result) {
			debug("result:", result);
			if (err) {
				debug('ERROR:httpreq.download:finished:result:1:',err,result);

				download.updateAttributes({updated: new Date(),statusMessage: JSON.stringify(err), status: 'error'}, function(err) {
					if(err) {
						// ERROR
						return debug("ERROR:httpreq.download:finished:err:download.updateAttributes:err", err);
					} else {
						// OK
						return true;
					}
				});

			}
			else {
				//debug (result);
				if (err) {
					debug('ERROR:httpreq.download:finished:err:', err);
					download.status = 'error';
					download.statusMessage=JSON.stringify(err);

				} else if (result.statusCode != 200) {
					debug('httpreq.download:finished:OK:statusCode!=200:', result);
					download.status = 'error';
					download.statusMessage=JSON.stringify(result);

					// error, delete local file
					try {
						debug('TRY:httpreq.download:finished:fs.unlinkSync:', result.downloadlocation);
						fs.unlinkSync(result.downloadlocation);
					}
					catch (err) {
						debug('ERROR:httpreq.download:finished:fs.unlinkSync:err:', err);
					}
				} else {
					//debug('OK:httpreq.download:finished:OK:', result);
					// download OK

					(download.filesize === 0) ? download.filesize = result.headers['content-length'] : function () {
						var stats = fs.statSync(downloads[i].pathname);
						return stats['size'];
					};

					(result.headers['content-length'] === 0) ? download.fileprogress = download.filesize : download.fileprogress = result.headers['content-length'];

					if (download.filesize < download.fileprogress) {
						download.filesize = download.fileprogress;
					}

					download.statusMessage=JSON.stringify(result);
					download.status = 'available';
					download.mime = result.headers['content-type'];
				}

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
							return debug("ERROR:httpreq.download:finished:download.updateAttributes",err);
						} else {
							// OK
							//debug('download.updateAttributes:END:',download);
							return true;
						}
					}
				);

				// Store in Files
				if (download.storeinfiles == true) {
					storeDownloadInFiles(download);
				}

				// HOME notification
				var notifyMailMessage, notifyHomeMessage, notifyTitle;

				if (download.status !== 'error') {
					if (download.storeinfiles) {
						notifyMailMessage = 'Your file [<a href="'+localHost+'/#apps/files/folders/'+folderInFilesId+'">'+download.filename+'</a>] has been downloaded successfully.';
					} else {
						notifyMailMessage = 'Your file [<a href="'+localHost+'/#apps/downloader/">'+download.filename+'</a>] has been downloaded successfully.';
					}
					notifyMailMessage += '<br />It was submitted within the URL [<a href="'+download.url+'">'+download.url+'</a>].';
					notifyMailMessage += '<br /><br />Find it on <a href="'+localHost+'">your cozy</a> !';
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
				}, void 0);

				// EMAIL notification if requested
				if (download.notify == true) {

					User.getUserInfo(function(err, user) {
						if (err != null) {
							debug(err);
						} else {
							var mailOptions = {
								from: 'myCozy <' + user.email || 'cozy@localhost>',
								subject: notifyTitle,
								content: notifyMailMessage,
								html: '<html><body>Hello ' + user.name + '<br /><br />' + notifyMailMessage + '</body></html>',
							};

							cozydb.api.sendMailToUser(mailOptions, function(err) {
								debug('sent mail notification to cozy user:'+user.email);
								if (err) {
									debug(err);
								}
							});
						}
					});

				}
				debug("proceedWithDownload:END:", download.url);
			}

		}
	);
}


/*****************************************************
*	Create a new download
*****************************************************/
router.post('/downloads/new/', function(req, res, next) {
	var path = require ('path');

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
			//debug(foundDownload.length);
			if (foundDownload.length > 0) {
				//debug ('SAME URL FOUND:',foundDownload);
				return res.status(500).send('this URL is already known !');
			} else {
				//debug ('OK, this is a new URL');
				// new url > continue to download
				// Managing filename
				var fullFilename = null;
				var filenameIsOK = false;
				var fileNum=0;
				var urlParsing = require('url');
				var filename = urlParsing.parse(req.body.url).pathname;

				filename = filename.substring(filename.lastIndexOf('/')+1);

				if (filename.length === 0) {
					var d = new Date();
					filename = 'unknown-'+d.getFullYear()+(d.getMonth()+1)+d.getDate()+'-'+d.getHours()+d.getMinutes()+d.getSeconds()+'.dat';
				}

				model = req.body.download ? JSON.parse(req.body.download) : req.body;


				while (!filenameIsOK) {
					fullFilename = persistentDirectory + '/' + filename;
					if (fileExistsSync(fullFilename)) {
						// a file with the same name already exists, try to increment
						fileNum++;
						var ext = path.extname(filename);
						var basename = path.basename(filename, ext);

						debug ("ext:", ext);
						debug ("basename", basename);

						filename = basename + '-' + fileNum + ext;

						if (fileNum > 50) {
							//there must be an error
							filenameIsOK = true;
						}

					} else {
						// the file does not exist yet, which is good
						filenameIsOK = true;
					}
				}

				newDownload = new Download(model);

				newDownload.filename = filename;
				newDownload.pathname = fullFilename;
				newDownload.protocol = urlParsing.parse(req.body.url).protocol;
				newDownload.created = new Date();
				newDownload.status = 'pending';

				debug ('newDownload.pathname:', newDownload.pathname);
				debug ('newDownload.filename:', newDownload.filename);


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

/*****************************************************
*	List of all downloads
*****************************************************/
router.get('/downloads/list', function(req, res, next) {

    Download.request('all', function(err, downloads) {
        if(err) {
            // ERROR
            debug(err);
			res.sendStatus(200);
        } else {
			// OK listing downloads
			for (var i=0; i < downloads.length; i++) {
				//debug('*** checking download : ',downloads[i]);

				// checking file last modification
				var lastUpdate = (new Date()-(downloads[i].updated ? downloads[i].updated : downloads[i].created) );

				if (downloads[i].filesize !== downloads[i].fileprogress || (downloads[i].fileprogress === 0 && downloads[i].filesize === 0 ) ) {
					debug("checking last update:",lastUpdate);

					// if last update is > 90s, it could be on error
					if (lastUpdate > 90000) {
						debug("change status to error:", downloads[i].pathname);
						downloads[i].status = 'error';
						downloads[i].statusMessage = "last update is old, download might have been truncated...";
					}
				}

				if (downloads[i].status !== 'pending') {
					// check file exists
					if (fileExistsSync(downloads[i].pathname)) {
						// file is present, checking size
						var stats = fs.statSync(downloads[i].pathname);
						downloads[i].fileprogress = stats['size'];
						if (downloads[i].filesize === 0 && stats['size'] > 0) {
							downloads[i].filesize = stats['size'];
							debug("change filesize to:", downloads[i].filesize);
						}

						if (downloads[i].filesize < downloads[i].fileprogress) {
							downloads[i].filesize = downloads[i].fileprogress;
						}

						if (downloads[i].status !== 'available') {
							downloads[i].status = 'error';
							if (downloads[i].filesize > 0 && downloads[i].fileprogress === downloads[i].filesize) {
								downloads[i].status = 'available';
								debug("change status to available:", downloads[i].pathname);
							}
						}
					} else {
						debug('file does not exists ('+i+'):' , downloads[i].pathname);
						// file does not exist, update attributes
						downloads[i].status = 'filenotfound';
						//downloads[i].fileprogress = 0;
					}
				}

				// saving attributes
				downloads[i].save(function (err) {
					if (err) {
						debug ('downloads['+i+'].save:', err);
					}
				});
			}

			//debug(downloads);
            res.status(200).json(downloads);
        }
    });
});

/*****************************************************
*	Retry an existing download
*****************************************************/
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
					debug('request for delete file:' + download.pathname);
					fs.unlinkSync(download.pathname);
				}
				catch (err) {
					debug('file delete error:'+err);
				}

			}
			// RETRY
			proceedWithDownload(download);
			res.sendStatus(200);
		}
	});

});

/*****************************************************
*	Remove an existing download and delete file
*****************************************************/
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
						debug('request for delete file:' + localFilename);
					}
					catch (err) {
						debug('file delete error:'+err);
					}
				}
			});
			res.sendStatus(200);
		}
	});

});

/*****************************************************
*	Send download in File app
*****************************************************/
router.put('/downloads/tofile/:id', function(req, res, next) {

  Download.find(req.params.id, function(err, download) {
      if(err) {
    // ERROR
    debug('requested download not found in database, id:',err);
    res.sendStatus(500);
      } else if(!download) {
          // DOC NOT FOUND
    debug('requested download not found in database, id:',req.params.id);
          res.sendStatus(404);
      } else {
          // CHECKS TO SEND DOWNLOAD TO FILE APP
    debug('requested download found');

    storeDownloadInFiles(download);
    res.sendStatus(200);
    }
  });
});

/*****************************************************
*	Get folders list
*****************************************************/
router.get('/downloads/folder', function(req, res, next) {
	localHost = req.protocol + '://' + req.headers.host ; // for futur use
	debug("localHost:", localHost);

	Folder.byFullPath ( {key: filesFolderName}, function(err, folders) {
		if(err) {
			// ERROR
			debug(err);
		} else {
			if (folders.length > 0) {
				folderInFilesId = folders[0]._id; // for futur use
				res.status(200).send(JSON.stringify(folders));
			} else {
				res.sendStatus(404);
			}
		}
	});
});

/*****************************************************
*	Fetch an existing download by its ID
*****************************************************/
router.get('/downloads/:id', function(req, res, next) {
	Download.find(req.params.id, function(err, download) {
        if(err) {
            // ERROR
            next(err);
        } else {
			// OK
			debug("/downloads/:id - trying to send file : ", download.pathname);
			// check file exists
			if (fileExistsSync(download.pathname)) {

				debug('GOOD : file exists !!');

				var options = {
					dotfiles: 'deny',
					headers: {
						'x-timestamp': Date.now(),
						'x-sent': true,
						'Content-Type': 'application/octet-stream',
						'Content-Disposition': 'attachment; filename="' + download.filename +'"'
					}
				};

				res.sendFile(download.pathname, options, function (err) {
					debug('ERROR (sendFile) : ',err);
					res.sendStatus(404);
				});
			} else {
				debug('ERROR : file does not exists !!');
				// file does not exist, update attributes
				res.sendStatus(404);
			}
        }
    });
});

/*****************************************************
*	Update an existing download
*****************************************************/
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

/*****************************************************
*	Fetch an existing download by its ID
*****************************************************/
router.get('/locale', function(req, res, next) {
  var locale = require ("../../client/app/locales/" + cozyLocale);
  res.status(200).send({
    "locale": cozyLocale,
    "phrases": locale,
  });
});

// Export the router instance to make it available from other files.
module.exports = router;
