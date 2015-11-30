var path = require('path');
var fs = require('fs');

var templates = {};

fs
    .readdirSync(__dirname + '/../templates')
    .filter(function(file) {
        return ((file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-4) == '.txt'))
    })
    .forEach(function(file) {
    	var fileName = __dirname + '/../templates/' + file;
    	
    	console.log('loading: ' + fileName);
        var template = fs.readFileSync(fileName, 'utf8');
        templates[file] = template;
    })


module.exports = templates;
