var server = require('../../server');

exports['file show '] = function(beforeExit, assert){
	assert.response(server, {
		url: '/file/4eba6350c5bb478f3100000d',
		method: 'GET'
	}, {
		status: 200,
	});
}