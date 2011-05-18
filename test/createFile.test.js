var app = require('../app');

var model = app.model;

model.createFile("test", {name: 'test.txt', location: '../test/..', x: 3, y: 4, format: 'text'}, function(error, file){
	if (typeof error == 'undefined' || typeof error == 'null') {
		console.log(error);
	}
	console.log(file);
});
