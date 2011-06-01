
///////////////////////////////////////////
//           SETUP Dependencies          //
///////////////////////////////////////////
var connect = require('connect'),
	express = require('express'),
	mongoStore = require('connect-mongodb'),
	model = require('./models/model-native-driver').db,
	util = require('util'),
	port = (process.env.PORT || 8081),
	rooms	= require('./logics/rooms.js'),
	formidable = require('formidable'),
	fs = require('fs');

       
///////////////////////////////////////////
//             SETUP Express             //
///////////////////////////////////////////
var app = module.exports = express.createServer();
app.rooms = rooms;

app.configure(function() {
	//views is the default folder already
  	app.set('views', __dirname + '/views');
  	app.set('view engine', 'jade');
  	app.use(express.bodyParser());
	//app.use(express.methodOverride());
	app.use(express.cookieParser());
	
	app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'keyboard cat'}));
	//app.use(express.logger());
  	app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  	app.use(app.router);
  	app.use(express.static(__dirname + '/public'));
});

app.configure('test', function() {
	app.set('db-uri', 'mongodb://localhost/sharedesk-test');
	app.model = new model('sharedesk-test', function() {});
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	app.set('db-uri', 'mongodb://localhost/sharedesk-development');
	app.model = new model('sharedesk-development', function() {});
});

app.configure('production', function() {
	app.set('db-uri', 'mongodb://localhost/sharedesk-production');
	app.model = new model('sharedesk-production', function() {});
});


///////////////////////////////////////////
//            ERROR Handling             //
///////////////////////////////////////////

function NotFound(msg) {
  	this.name = 'NotFound';
  	Error.call(this, msg);
  	Error.captureStackTrace(this, arguments.callee);
}

//equals to NotFound.prototype.__proto__ = Error.prototype; i think ^^
util.inherits(NotFound, Error);

app.get('/404', function(req, res) {
	throw new NotFound;
});

app.get('/500', function(req, res) {
	throw new Error('An expected error');
});

app.get('/bad', function(req, res) {
	unknownMethod();
});

app.error(function(error, req, res, next) {
  	if (error instanceof NotFound) {
    	res.render('404', { status: 404 });
  	} else {
    	next(error);
  	}
});

///////////////////////////////////////////
//           ROUTES Controller           //
///////////////////////////////////////////

app.get('/', function(req, res){
	res.render('home', {
		layout: false
	});
});

app.get('/download/:deskname/:fileid', function(req, res) {
	// send file
	app.model.getFile(req.params.fileid, function(error, file) {
		if(error) {
			console.log("getFile error", error);
		}
		else {
			if(typeof file != 'undefined') {
				fs.readFile("./"+file.location, function(error, data){
					if (error) {
						console.log("readFile error", error);
					}
					else {
						if (typeof data == 'undefined') {
							console.log("data is undefined");
							res.writeHead('404');
							res.end();
						} else {
							res.writeHead('200', {
								'Content-Type' : file.type,
								'Content-Length' : data.length,
								'Content-Disposition' : 'attachment;filename=' + file.name
							});
							res.write(data);
							res.end();
						}
					}
				});
			}
			else {
				console.log("cannot read file");
				res.writeHead('404');
				res.end();
			}
		}
	});
});

app.get('/:deskname', function(req, res){
	res.render('index.jade', {
		locals: {pageTitle: ('shareDesk - ' + req.params.deskname) }
	});
});

app.post('/upload/:deskname/:filesgroupid', function(req, res) {
	var filesgroupid = req.params.filesgroupid;
	var rcvd_bytes_complete = 0;
	var basedir = './uploads/';

	var form = new formidable.IncomingForm(),
		files = [],
		fields = [];

	var oldProgressPercentage = 0;
	var dir = basedir + req.params.deskname;

	form.uploadDir = dir;

	// send progress, minimum one percent
	form.on('progress', function(bytesReceived, bytesExpected) {
		console.log('process');
		var newProgressPercentage = (bytesReceived / bytesExpected) * 100 | 0;
		if(oldProgressPercentage < newProgressPercentage) {
			var msg = {
				action: 'progress',
				data: {
					filesgroupid: filesgroupid,
					bytesReceived: bytesReceived,
					bytesExpected: bytesExpected
				}
			}
			rooms.broadcast_room(req.params.deskname, msg);
			oldProgressPercentage = newProgressPercentage;
		}
	});

	form.on('file', function(name, file) {
		console.log('file');
		var fileModel = {
			name: file.name,
			location: file.path,
			x: -1,
			y: -1,
			format: file.type
		}

		app.model.createFile(req.params.deskname, fileModel, function(error, db_file) {
			if (error) console.log(error);
			else {
				var msg = {
					action: 'createFile',
					data: {
						filesgroupid: filesgroupid,
						file: fileModel
					}
				}
				rooms.broadcast_room(req.params.deskname, msg);
			}
		});
	});

	form.parse(req, function(error, fields, files) {

		res.writeHead(200, {'content-type': 'text/plain'});
		res.write('received upload:\n\n');
		res.end(util.inspect({fields: fields, files: files}));
		
	});

});




//create Upload folder if not exists
var uploadFolder = './uploads/';
app.uploadFolder = uploadFolder;
fs.stat(uploadFolder, function(error, stats) {
	if(typeof stats=='undefined' || !stats.isDirectory()) {
		fs.mkdir(uploadFolder, 448, function(error) {
			if (error) throw new Error('could not create ' + uploadFolder + ' folder');
		});
	}
});

// start websockets controller
require('./controllers/websockets')(app);

// Only listen on $ node app.js
if (!module.parent) {
	app.listen(port);
	console.log("ShareDesk server listening on port %d", app.address().port);
}



