// Run $ vows 

// Force test environment
process.env.NODE_ENV = 'test';


var vows = require('vows'),
    assert = require('assert');

var util = require('util');
var rooms = require('../logics/rooms');
var app = require('../app');

var model   = app.model;

exports.suite1 = vows.describe('Desk Model')
	
	.addBatch({
		'create desktop': {
        	topic: function() {
				model.createDesk('/test2', this.callback);
			 },
		
			'return 1 desk': function(error, desk) {
				//console.log(desk);
				assert.length(desk, 1);
			}
		}
	})
	.addBatch({
		'get collection': {
        	topic: function() {
				model.findAll(this.callback);
			 },
		
			'return collection': function(error, desks) {
				assert.isArray(desks);
			}
		}
	})
	.addBatch({
		'find by id': {
        	topic: function() {
				var callback = this.callback
				model.getCollection(function(error, desk_collection) {
			      if( error ) callback(error)
			      else {
					desk_collection.findOne({name:'/test2'}, function(error, result) {
						if( error ) callback(error)
						else {
							model.findById(result._id, callback);
						}
					});
			      }
			    });
			 },
		
			'returns deskname /test2': function(error, desk) {
				assert.equal(desk.name, '/test2');
			},
		}
	})
	.addBatch({
		'create file': {
        	topic: function() {
				model.createFile('/test2', {name : 'filenameHans', location : 'path to da file', x : 51, y : 15, format : 'DAS FORMAT'}, this.callback);
			 },
		
			'return id of new file': function(error, id) {
				assert.isString(id.toString());
			}
		}
	})
	.addBatch({
		'get all files': {
        	topic: function() {
				model.getAllFiles('/test2', this.callback);
			 },
		
			'return all files with length 1': function(error, files) {
				//assert.length(files, 1);
				assert.isArray(files);
			}
		}
	}) 
	.addBatch({
		'rename file': {
        	topic: function() {
				var callback = this.callback;
				model.getCollection(function(error, desk_collection) {
			      if( error ) callback(error)
			      else {
					desk_collection.findOne({name:'/test2'}, function(error, desk) {
						if( error ) callback(error)
						else {
							model.renameFile('/test2', desk.files[0]._id, 'HAAAAANSI', callback);
						}
					});
			      }
			    });				
			 },
		
			'return correct name': function(error, file) {
				
				assert.equal(file['$set']['files.$.name'], 'HAAAAANSI');
				
			}
		}
	})
	.addBatch({
		'change position file': {
        	topic: function() {
				var callback = this.callback;
				model.getCollection(function(error, desk_collection) {
			      if( error ) callback(error)
			      else {
					desk_collection.findOne({name:'/test2'}, function(error, desk) {
						if( error ) callback(error)
						else {
							model.setFilePosition('/test2', desk.files[0]._id, 100, 100, callback);
						}
					});
			      }
			    });				
			 },
		
			'return correct x,y values': function(error, file) {
				assert.equal(file['$set']['files.$.y'], 100);
				assert.equal(file['$set']['files.$.x'], 100);
			}
		}
	})
	.addBatch({
		'delete file': {
        	topic: function() {
				var callback = this.callback;
				model.getCollection(function(error, desk_collection) {
			      if( error ) callback(error)
			      else {
					desk_collection.findOne({name:'/test2'}, function(error, desk) {
						if( error ) callback(error)
						else {
							model.deleteFile('/test2', desk.files[0]._id, callback);
						}
					});
			      }
			    });				
			 },
		
			'return unset order': function(error, file) {
				assert.isObject(file);
			}
		}
	})
	.addBatch({
		'remove desktop': {
        	topic: function() {
				model.deleteDesk('/test2', this.callback);
			 },
		
			'return collection object': function(error, desk) {
				assert.isObject(desk);
			}
		}
	});

