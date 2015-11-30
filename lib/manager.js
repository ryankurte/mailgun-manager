var winston = require('winston');
var validator = require('validator');
var uuid = require('uuid');
var Mailgun = require('mailgun-js');

var Manager = function(config) {
    this.domain = config.domain;
    this.apiKey = config.apiKey;
    this.listName = config.listName;
    this.retry = 10;

    this.mg = Mailgun(config);

    this.list = this.mg.lists(config.listName);
}

Manager.prototype.add = function(address, name) {
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

    //Add user to list
    return this.list.members().create(user)
        .then(function(res) {
            winston.info('added user', {
                address: address,
                user: res
            });
            return Promise.resolve('added user');
        }, function(error) {
            winston.warn('error adding user', {
                address: address
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

module.exports = function(options) {
    return new Manager(options);
};