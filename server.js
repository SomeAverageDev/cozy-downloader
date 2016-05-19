var bodyParser = require('body-parser');
var cozydb = require('cozydb');

var express = require('express');
var app = express();

/*
    Configuration section.
*/
app.use(bodyParser.json());
app.use(express.static('client'));


/*
    Define routes and their handler.
*/
var indexController = require('./server/controllers/index');
app.use(indexController);

var downloadController = require('./server/controllers/download');
app.use(downloadController);

/*
    CouchDB views initialization. It must be done before starting the server.
*/
cozydb.configure(__dirname, null, function() {
    /*
        Start the HTTP server.
    */
    var server = app.listen(9250, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log('Cozy downloader app listening at http://%s:%s', host, port);
    });
});