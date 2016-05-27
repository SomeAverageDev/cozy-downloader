// Generated by CoffeeScript 1.10.0
var File, cozydb,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

cozydb = require('cozydb');

module.exports = File = (function(superClass) {
  extend(File, superClass);

  function File() {
    return File.__super__.constructor.apply(this, arguments);
  }

  File.schema = {
    id: String,
    name: String,
    path: String,
	creationDate: String,
    lastModification: String,
	binary: Object,
	mime: String,
	size: Number,
	tags: [String],
    "class": String
  };

	File.byFullPath = function(params, callback) {
	  return File.request("byFullPath", params, callback);
	};

	File.isPresent = function(fullPath, callback) {
	  console.log("File.isPresent:",fullPath);
	  return File.request("byFullPath", {
		key: fullPath
	  }, function(err, files) {
		if (err) {
		  callback(err);
		}
		return callback(null, (files != null) && files.length > 0);
	  });
	};

	File.createNewFile = function(data, file, callback) {
	  var attachBinary, upload;
	  upload = true;
	  attachBinary = function(newFile) {
		file.path = data.name;
		return newFile.attachBinary(file, {
		  "name": "file"
		}, function(err, res, body) {
		  upload = false;
		  if (err) {
			return newFile.destroy(function(error) {
			  return callback("Error attaching binary: " + err);
			});
		  } else {
			return true;
		  }
		});
	  };
	  return File.create(data, function(err, newFile) {
		if (err) {
		  return callback(new Error("Server error while creating file; " + err));
		} else {
		  attachBinary(newFile);
		  return true;
		}
	  });
	};

  return File;

})(cozydb.CozyModel);