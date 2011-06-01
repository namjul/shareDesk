
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

app.configure(function(){
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

app.configure('development', function(){
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	app.set('db-uri', 'mongodb://localhost/sharedesk-development');
	app.model = new model('sharedesk-development', function() {});
});

app.configure('production', function(){
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

app.get('/download/:deskid/:fileid', function(req, res) {
	// send file
	app.model.getFile(req.params.fileid, function(error, file) {
		if(error) ;//console.log(error);
		else {
			if(typeof file != 'undefined')
			fs.readFile("./"+file.location, function(error, data){
				if (error) console.log(error);
				if (typeof data == 'undefined') {
					res.writeHead('404');
					res.end();
				} else {
					res.writeHead('200', {
						'Content-Type' : file.format,
						'Content-Length' : data.length,
						'Content-Disposition' : 'attachment; filename=' + file.name
					});
					res.write(data);
					res.end();
				}
			});
			else {
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

	// check directory, create if it not exists
	var dir = basedir + req.params.deskname;
	fs.stat(dir, function(error, stats) {
		if(typeof stats=='undefined' || !stats.isDirectory()) {
			fs.mkdir(dir, 448, function(error) {
				fs.mkdir(basedir, 448, function(error) {
					console.log(error);
				});
				fs.mkdir(dir, 448, function(error) {
					console.log(error);
				});
			});
		}
	});

	form.uploadDir = dir;

	form.on('progress', function(bytesReceived, bytesExpected) {
		var msg = {
			action: 'progress',
			data: {
				filesgroupid: filesgroupid,
				bytesReceived: bytesReceived,
				bytesExpected: bytesExpected
			}
		};
		rooms.broadcast_room(req.params.filesgroupid, msg);
	});
/*
	form.on('fileBegin', function(name, file) {
		console.log('fileBegin: ' + file.name + '\n');

	});
*/
	form.on('file', function(name, file) {
		var fileModel = {
			name: file.name,
			location: file.path,
			x: -1,
			y: -1,
			format: file.type
		}
		var msg = {
			action: 'createFile',
			data: {
				filesgroupid: filesgroupid,
				file: fileModel
			}
		}
		app.model.createFile("/"+req.params.deskname, fileModel, function(error, file) {
			if(error) console.log(error);
		});
		rooms.broadcast_room(req.params.deskname, msg);
	});

	form.parse(req, function(error, fields, files) {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.write(util.inspect(fields));
		res.end(util.inspect(files));
	});
});


// start websockets controller
require('./controllers/websockets')(app);



// Only listen on $ node app.js
if (!module.parent) {
  app.listen(port);
  console.log("ShareDesk server listening on port %d", app.address().port);
}



