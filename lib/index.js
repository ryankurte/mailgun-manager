var express = require('express');
var Mailgun = require('mailgun-js');

var config = {
    domain: process.env.DOMAIN,
    apiKey: process.env.API_KEY
};

var app = express();
var mg = Mailgun(config);

app.get('/', function (req, res) {
      res.send('Hello World!');
});

var server = app.listen(3000, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log('Example app listening at http://%s:%s', host, port);
});


