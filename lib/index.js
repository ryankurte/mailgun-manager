var express = require('express');
var bodyParser = require('body-parser');
var Mailgun = require('mailgun-js');
var winston = require('winston');
var validator = require('validator');

//Set configuration
var config = {
    domain: process.env.DOMAIN,
    apiKey: process.env.API_KEY,
    listName: process.env.LIST,
    port: process.env.PORT
};

//Setup application
var app = express();
var mg = Mailgun(config);
var list = mg.lists(config.listName);

//Bind in bodyparser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Define routes

app.get('/', function (req, res) {
  res.send('Hello World!');
});

//Subscribe to the specified mailing list
app.post('/subscribe', function(req, res) {
	//Validate inputs
	if(!req.body.address) {
		return res.json({error: "address field required"});
	}
	if(!validator.isEmail(req.body.address)) {
		return res.json({error: "address does not appear to be a valid email"});
	}
	if(!req.body.name) {
		return res.json({error: "name field required"});
	}

	//Create user object
    var user = {
        subscribed: true,
        address: req.body.address,
        name: req.body.name,
        vars: {}
    }

    //Add user to list
    list.members().create(user, function(err, data) {
    	if(err) {
    		winston.error("Error subscribing user", {error: err});
    		return res.json({error: "internal server error"});
    	}
        winston.info("Subscribed user", {user: user});
        return res.json({result: "subscription complete"});
    });
});

//Launch application
var server = app.listen(config.port, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Mailgun manager running at http://%s:%s', host, port);
});

