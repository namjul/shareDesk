
var Db = require('../lib/mongodb/db').Db,
    ObjectId = require('../lib/mongodb/bson/bson').ObjectID,
    Server = require('../lib/mongodb/connection').Server,
	conf = require('../config.js').database;;

db = function(database, callback) {

	this.desks = false;
	var self = this;

	this.db = new Db(database, new Server(conf.hostname, conf.port, {}, {}));
	
	this.db.open(function(err, db) {
		if(db == null) throw new Error('no database connection');
		db.collection('desks', function(err, collection) {
			// make sure we have an index and unique constrain on name 
			collection.ensureIndex({name : 1}, {unique : true}, function() {}) 
			//self.desks = collection;
		});
		//callback();
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


//-----
//Desktop Operations
//-----

/* create desktop */
db.prototype.createDesk = function(deskName, callback) {
    this.getCollection(function(error, desk_collection) {
		if( error ) callback(error)
      	else {
        	desk_collection.insert({name:deskName}, function(error, objects) {
				if( error ) callback(error)
				else callback(null, objects);
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



//-----
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
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
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
db.prototype.renameFile = function(deskName, id, newName, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': id},
						{$set:{'files.$.name': newName}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};

/* change position file */
db.prototype.setFilePosition = function(deskName, id, x, y, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': id},
						{$set:{'files.$.y': y, 'files.$.x': x}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};

/* delete file */
db.prototype.deleteFile = function(deskName, id, callback) {
    this.getCollection(function(error, desk_collection) {
      	if( error ) callback(error)
      	else {
      		desk_collection.update(
						{'files._id': id},
						{$unset:{'files.$': id}},
						function(error, file) {
							if( error ) callback(file)
							else callback(null, file);
						}
			);
      	}
    });
};

exports.db = db;
