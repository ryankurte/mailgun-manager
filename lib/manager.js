var winston = require('winston');
var validator = require('validator');
var uuid = require('uuid');
var Mailgun = require('mailgun-js');
var Mustache = require('mustache');

var templates = require('./templates');

var Manager = function(config) {
    this.domain = config.domain;
    this.apiKey = config.mailgun.apiKey;
    this.listName = config.mailgun.listName;
    this.retry = 10;

    this.config = config;

    this.mg = Mailgun(config.mailgun);

    this.list = this.mg.lists(config.mailgun.listName);

}

Manager.prototype.add = function(address, name) {
    var config = this.config;

    //Create user object
    var user = {
        subscribed: false,
        address: address,
        name: name,
        vars: {
            subToken: uuid.v4(),
            unsubToken: uuid.v4()
        }
    }

    var templateOptions = {
        address: user.address,
        name: user.name,
        orgName: config.org,
        listName: this.listName,
        confirmUrl: config.url + '/activate?address=' + user.address + '&token=' + user.vars.subToken,
        unsubUrl: config.url + '/unsubscribe?address=' + user.address + '&token=' + user.vars.unsubToken
    }

    var message = buildActivateMessage(templateOptions);

    var createDone = function(res) {
        winston.info('added user', {
            address: res.address,
            user: res
        });
        return this.mg.messages().send(message);
        //return Promise.resolve('fuck');
    }.bind(this);

    //Add user to list
    return this.list.members().create(user)
        .then(createDone).then(function() {
            return Promise.resolve('added user');
        }, function(error) {
            winston.warn('error adding user', {
                address: address,
                error: error
            });
            return Promise.reject('error adding user');
        });
}

Manager.prototype.activate = function(address, token, callback) {
    var list = this.list;

    return new Promise(function(resolve, reject) {
        list.members(address).info(function(error, res) {
            if (error) {
                winston.warn('error fetching address', {
                    address: address
                })
                return reject('error fetching address');
            }

            var user = res.member;

            //Check token is correct
            if (user.vars.subToken != token) {
                winston.warn('invalid activate token', {
                    address: address
                });
                return reject('invalid activate token');
            }

            list.members(address).update({
                subscribed: 'yes'
            }, function(errorTwo, res) {
                if (errorTwo) {
                    winston.warn('activation failed', {
                        address: address,
                        error: errorTwo
                    });
                    return reject('activation server error');
                } else {
                    winston.info('activation complete', {
                        address: address
                    });
                    return resolve('activation complete');
                }
            });
        });
    });
}

Manager.prototype.unsubscribe = function(address, token, callback) {
    var list = this.list;

    return new Promise(function(resolve, reject) {
        list.members(address).info(function(error, res) {
            if (error) {
                winston.warn('error fetching address', {
                    address: address
                })
                return reject('error fetching address');
            }

            var user = res.member;

            //Check token is correct
            if (user.vars.unsubToken != token) {
                winston.warn('invalid unsubscribe token', {
                    address: address
                });
                return reject('invalid unsubscribe token');
            }

            list.members(address).update({
                subscribed: 'no'
            }, function(errorTwo, res) {
                if (errorTwo) {
                    winston.warn('unsubscribe failed', {
                        address: address,
                        error: errorTwo
                    });
                    return reject('unsubscribe server error');
                } else {
                    winston.info('unsubscribe complete', {
                        address: address
                    });
                    return resolve('unsubscribe complete');
                }
            });
        });
    });
}

function buildActivateMessage(options) {

    var template = templates['confirmation.txt'];

    var rendered = Mustache.render(template, options);

    var data = {
        from: 'List Manager <' + options.listName + '>',
        to: options.address,
        subject: 'Subscription Confirmation',
        text: rendered
    };

    return data;
}


module.exports = function(options) {
    return new Manager(options);
};