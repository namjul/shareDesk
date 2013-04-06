var mongoose = require('mongoose');
var Desk = require('../models/desk.js');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

mongoose.connect('mongodb://localhost/test1'); 

// drop db (test)
mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) { 
    console.log("error: " + err); 
    console.log(result); 
    process.exit(0); 
});

mongoose.disconnect();

mongoose.connect('mongodb://localhost/test'); 


var tests = function(){
	var desk1 = new Desk();
	//desk1._id = new ObjectId.fromString("000000000001");
	desk1._id = "testDeskId";
	desk1.name = "testDeskName";
	desk1.save();
	console.log("saved");
};

export = tests();
