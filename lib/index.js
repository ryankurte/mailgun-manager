var express = require('express');
var bodyParser = require('body-parser');
var winston = require('winston');
var validator = require('validator');
var Promise = require('bluebird');

var manager = require('./manager');

//Set configuration
var config = {
    mailgun: {
        domain: process.env.DOMAIN,
        apiKey: process.env.API_KEY,
        listName: process.env.LIST,
        retry: 10
    },
    port: process.env.PORT || 3000,
    url: process.env.SERVER,
    org: process.env.ORG
};

//Setup application
var app = express();
var mgr = manager(config);

//Bind in bodyparser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//Define routes

//Test route
app.get('/', function(req, res) {
    res.send('Hello World!');
});

//Subscribe to the specified mailing list
app.post('/subscribe', function(req, res) {
    //Validate inputs
    if (!req.body.address) {
        return res.json({
            error: "address field required"
        });
    }
    if (!validator.isEmail(req.body.address)) {
        return res.json({
            error: "address does not appear to be a valid email"
        });
    }
    if (!req.body.name) {
        return res.json({
            error: "name field required"
        });
    }

    mgr.add(req.body.address)
    .then(function(message) {
        return res.json({result: 'success', message: message})
    }, function(error) {
        return res.json({result: 'error', message: error});
    })

});

function validateAddressAndToken(address, token) {
    if (!address) return Promise.reject("address field required");
    if (!validator.isEmail(address)) return Promise.reject("address must be a valid email");
    if (!token) return Promise.reject("token required");
    if (!validator.isUUID(token)) return Promise.reject("token must be a valid UUIDv4");
    return Promise.resolve({
        address: address,
        token: token
    });
}

//Activate subscription to the specified mailing list
app.get('/activate', function(req, res) {
    validateAddressAndToken(req.query.address, req.query.token)
        .then(function(query) {
            winston.info("submitting activate", {
                address: query.address
            });
            return mgr.activate(query.address, query.token);
        })
        .then(function(message) {
            return res.json({result: 'ok'});
        }, function(error) {
            return res.json({result: 'error', message: error});
        });
});

//Unsubscribe from the specified mailing list
app.get('/unsubscribe', function(req, res) {
    validateAddressAndToken(req.query.address, req.query.token)
        .then(function(query) {
            winston.info("submitting unsubscribe", {
                address: query.address
            });
            return mgr.unsubscribe(query.address, query.token);
        })
        .then(function(message) {
            return res.json({result: 'ok'});
        }, function(error) {
            return res.json({result: 'error', message: error});
        });
});


//Launch application
var server = app.listen(config.port, function() {
    var host = server.address().address;
    var port = server.address().port;

    winston.info('Mailgun manager running at http://%s:%s', host, port);
    winston.info('Domain: %s List: %s', config.mailgun.domain, config.mailgun.listName);
});