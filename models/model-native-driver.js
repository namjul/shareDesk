// Database Operations
//-----

var Db = require('../lib/mongodb/db').Db,
    ObjectId = require('../lib/mongodb/bson/bson').ObjectID,
    Server = require('../lib/mongodb/connection').Server,
	conf = require('../config.js').database,
	util = require('util');

db = function(database, callback) {

	this.desks = false;
	var self = this;

	this.db = new Db(database, new Server(conf.hostname, conf.port, {}, {}));
	
	this.db.open(function(err, db) {
		if(db == null) throw new Error('no database connection');
		db.collection('desks', function(err, collection) {
			// make sure we have an index and unique constrain on name 
			collection.ensureIndex({name : 1}, {unique : true}, function() {}) 
		});
	});
};

db.prototype.getCollection= function(callback) {
  this.db.collection('desks', function(error, desk_collection) {
    if( error ) callback(error);
    else callback(null, desk_collection);
  });
};

db.prototype.findAll = function(callback) {
    this.getCollection(function(error, desk_collection) {
      if( error ) callback(error)
      else {
        desk_collection.find(function(error, cursor) {
          if( error ) callback(error)
          else {
            cursor.toArray(function(error, results) {
              if( error ) callback(error)
              else callback(null, results)
            });
          }
        });
      }
    });
};

db.prototype.findById = function(id, callback) {
    this.getCollection(function(error, desk_collection) {
      if( error ) callback(error)
      else {
        desk_collection.findOne({_id: id}, function(error, result) {
          if( error ) callback(error)
          else callback(null, result)
        });
      }
    });
};


//Desktop Operations
//-----

/* create desktop */
db.prototype.createDesk = function(deskName, callback) {
    this.getCollection(function(error, desk_collection) {
		if( error ) callback(error)
      	else {
			var currentDate = new Date();
        	desk_collection.insert({name:deskName, date: currentDate}, function(error, objects) {
				if( error ) callback(error)
				else callback(null, objects);
			});
      	}
    });
};

/* get desktop */
db.prototype.getDesk = function(deskName, callback) {
    this.getCollection(function(error, desk_collection) {
      if( error ) callback(error)
      else {
        desk_collection.findOne({name: deskName}, function(error, result) {
          if( error ) callback(error)
          else callback(null, result)
        });
      }
    });
};


/* delete desktop */
db.prototype.deleteDesk = function(deskName, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.remove({name:deskName}, function(error, ka) {
				if( error ) callback(ka)
				else callback(null, ka);
			});
      	}
    });
};



//File Operations
//-----

/* create file */
db.prototype.createFile = function(deskName, file, callback) {
    this.getCollection(function(error, desk_collection) {
		if( error ) callback(error)
      	else {
			//creatíng new key
			var id = new ObjectId();
			file['_id'] = id;
			
			desk_collection.update(
						{name:deskName},
						{$push:{files:file}},
						{safe:true, upsert: false},
						function(error) {
							if( error ) callback(error)
							else callback(null);
						}
			);
      	}
    });
};

/* get file */
db.prototype.getFile = function(id, callback) {
	this.getCollection(function(error, desk_collection) {
		if(error) callback(error)
		else {
			desk_collection.findOne({'files._id':ObjectId(id)}, function(error, desk) {
				if(error) callback(error);
				else {
					if(desk) {
						for(var i in desk.files) {
							if(desk.files[i]._id==id) {
								callback(null, desk.files[i]);
							}
						}
					}
					else {
						callback(null, []);
					}
				}
			});
		}
	});
};

/* get desktop files */
db.prototype.getAllFiles = function(deskName, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.findOne({name:deskName}, function(error, desk) {
				if( error ) callback(error)
				else {
					if( desk == null ) {
						callback(null, []);
					}
					else {
						if(typeof desk.files != 'undefined') {
							callback(null, desk.files);
						}
						else {
							callback(null, []);
						}
					}
				}
			});
      	}
    });
};

/* rename file */
db.prototype.renameFile = function(id, newName, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': ObjectId(id)},
						{$set:{'files.$.name': newName}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
		console.log("after update");
      	}
    });
};

// change position file 
db.prototype.setFilePosition = function(deskName, id, x, y, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': ObjectId(id)},
						{$set:{'files.$.y': y, 'files.$.x': x}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};

// delete file 
db.prototype.deleteFile = function(id, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': ObjectId(id)},
						{$pull:{files:{'_id': ObjectId(id)}}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};

//Password protection Operations
//-----
db.prototype.setPassword = function(deskName, protectionObject, toRemove, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
			if(toRemove) {

				desk_collection.update(
						{name: deskName},
						{ $unset : { 'protection' : 1} },
						function(error, deskSecureObject) {
							if( error ) callback()
							else callback(null, deskSecureObject);
						}
				);
	

			} else {
      			desk_collection.update(
						{name: deskName},
						{$set:{'protection': protectionObject}},
						function(error, deskSecureObject) {
							if( error ) callback()
							else callback(null, deskSecureObject);
						}
				);
			}
      	}
    });
};

// Add a download-click to file
//-----
db.prototype.addDownloadClick = function(id, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': ObjectId(id)},
						{$inc:{'files.$.downloads': 1}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};



exports.db = db;
