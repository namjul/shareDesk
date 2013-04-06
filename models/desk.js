// The Post model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var util = require('util');
/*
var dropboxSchema = new Schema({
	token: String,
  token_secret: String,
  uid: String,
});*/

var tagSchema = new Schema({
	name: String,
});
tagSchema.virtual('toSpine').get(function() {
  var obj = this.toObject(); 
  obj.id = obj._id; 
  delete obj._id; 
  return obj; 
});

var filesSchema = new Schema({
	name: String,
	type: String,
  path: String,
	size: {type: Number, min: 0},
  modified: { type: Number, default: Date.now},
	downloads: {type: Number, min: 0},
	tags: [tagSchema],
  revision: String,
  sharedlink: String,
  sharedexpire: Number,
	public: Boolean,
});
filesSchema.virtual('toSpine').get(function() {
  var obj = this.toObject(); 
  obj.id = obj._id; 
  delete obj._id; 
  return obj; 
});
filesSchema.methods.toSpineMethod = function toSpineMethod(cb) {
  var temp = {}; 
  var self = this;
  this.schema.eachPath(function(path) { 
    if (path == '_id') { 
        temp.id = self[path]; 
    } else {
      temp[path] = self[path];
    } 
  }); 
  return temp;
}

var deskSchema = new Schema({
  name: { 
    type: String, 
    index: { unique: true }, 
    required: true 
  },
  // created
  date: {type: Date, default: Date.now},
  synced: Number,
  files: [filesSchema],
  dropbox: {
    oauth_token: String,
    oauth_token_secret: String,
    uid: String,
  },
});
deskSchema.virtual('toSpine').get(function() {
  var obj = this.toObject(); 
  obj.id = obj._id; 
  delete obj._id; 
  for(var i=0; i<obj.files.length; i++){
    obj.files[i].id = obj.files[i]._id;
    delete obj.files[i]._id;
    //obj.files[i].desk_id = obj.id;
    for(var j=0; j<obj.files[i].tags.length; j++){
      obj.files[i].tags[j].id = obj.files[i].tags[j]._id;
      delete obj.files[i].tags[j]._id;
    }
  }
  return obj; 
});

// Moongose Plugin
function mergePlugin(schema, options) { 
  schema.method('merge', function (obj) { 
    var self = this; 
    self.schema.eachPath(function(path) { 
      // avoid overwrite the _id and undefined properties 
      if (path != '_id' && (typeof obj[path] != "undefined")) { 
          self.set(path, obj[path]); 
      } 
    }); 
    return this; 
  }); 
}; 
mongoose.plugin(mergePlugin); // set merge(obj) method to all model instance 

module.exports.desk = mongoose.model('Desk', deskSchema);
module.exports.file = mongoose.model('File', filesSchema);
module.exports.tag = mongoose.model('Tag', tagSchema);
