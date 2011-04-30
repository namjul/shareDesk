
function defineModels(mongoose, callback) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;

  /**
    * Model: Desk
    */
	var File = new Schema({
	    name 		: String,
	 	location 	: String,
		x 			: { type: Number, default: 0 },
		y 			: { type: Number, default: 0 },
		format 		: { type: String, default: 'txt' }
	});
	
  	Desk = new Schema({
    	name		: { type: String, unique: true },
    	files		: [File]
  	});

	Desk.virtual('id')
	    .get(function() {
	      return this._id.toHexString();
	 	});

	
	
	//-----
	//Desktop Operations
	//-----
	
	/* create desktop */
	Desk.static('createDesk', function(deskName, callback) {
		var desk = new Desk();
		desk.name = deskName;
		desk.save(function(err){
			//console.log(err + 'saved!');
			callback(null);
		});
	});
	
	/* delete desktop */
	Desk.static('deleteDesk', function(deskName, callback) {
		Desk.find({name:deskName}).remove(function() {
			//console.log('deleted!');
			callback(null);
		});
	});
	
	/* get desktop files
	 * returns all the files in the given desktop */
	Desk.static('getDeskFiles', function(deskName, callback) {
		this.findOne({name:deskName}, function(err, desk) {
			if(desk) {
				callback(null, desk.files);
			} else {
				callback(null);
			}
		});
	});
	
	//-----
	//File Operations
	//-----
	
	/* create file */
	Desk.static('createFile', function(deskName, file, callback) {
		this.findOne({name:deskName}, function(err, desk) {
			if(desk) {
				desk.files.push(file);
				desk.save(function(){
					//console.log('saved!');
					callback(null);
				});
			} else {
				callback(new Error('Desk does not exist'));
			}
		});
	});
	
	/* update new position */
	Desk.static('updateFile', function(deskName, newfile, callback){
		console.log(newfile._id);
		this.findOne({_id : newfile._id}, function(err, file) {
		
			file.update(newfile, function() {
				console.log('updated!');
				callback(null);
			});
		});
	});
	
	/* update filename */
	
	/* delete file */
	
	

  mongoose.model('Desk', Desk);
  callback();
}

exports.defineModels = defineModels;