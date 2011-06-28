//     sharedesk.js 0.1.x
//     (c) 2010 Samuel Hobl, Alexander Kumbeiz, Goran Janosevic.

// Initial Setup Dependencies
// -------------

var connect = require('connect'),
	express = require('express'),
	mongoStore = require('connect-mongodb'),
	model = require('./models/model-native-driver').db,
	util = require('util'),
	port = (process.env.PORT || 8081),
	rooms	= require('./logics/rooms.js'),
	formidable = require('formidable'),
	exec = require('child_process').exec,
	fs = require('fs'),
	deskTime = 60;

       
// Setup Express
// -------------
var app = module.exports = express.createServer();
app.rooms = rooms;

app.configure(function() {
 	app.set('views', __dirname + '/views');
 	app.set('view engine', 'jade');
 	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'keyboard cat'}));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


// node environment, use in terminal: "export NODE_ENV=production"
//NODE_ENV=test
app.configure('test', function() {
	app.set('db-uri', 'mongodb://localhost/sharedesk-test');
	app.model = new model('sharedesk-test', function() {});
});
//NODE_ENV=development
app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	app.set('db-uri', 'mongodb://localhost/sharedesk-development');
	app.model = new model('sharedesk-development', function() {});
});
//NODE_ENV=production
app.configure('production', function() {
	app.set('db-uri', 'mongodb://localhost/sharedesk-production');
	app.model = new model('sharedesk-production', function() {});
});

// Error handling
// -------------
function NotFound(msg) {
  	this.name = 'NotFound';
  	Error.call(this, msg);
  	Error.captureStackTrace(this, arguments.callee);
}
// extend from Error Object
util.inherits(NotFound, Error);

// Not Found Page
app.get('/404', function(req, res) {
	throw new NotFound;
});

// Server Error Page
app.get('/500', function(req, res) {
	throw new Error('An expected error');
});

// Server Error Page
app.get('/bad', function(req, res) {
	unknownMethod();
});

// on error redirect to 404 page
app.error(function(error, req, res, next) {
  	if (error instanceof NotFound) {
    	res.render('404', { status: 404 });
  	} else {
    	next(error);
  	}
});

// Routes
// -------------

// Home directory
app.get('/', function(req, res){
	res.render('home', {
		layout: false
	});
});

// Download Route
// deskname is unimportant
// fileid is the id for the whole group of file (if multiupload)
app.get('/download/:deskname/:fileid', function(req, res) {
	// send file
	app.model.getFile(req.params.fileid, function(error, file) {
		if(error) {
			console.log("getFile error", error);
		}
		else {
			if(typeof file != 'undefined') {

				// HTTP Header
				res.writeHead('200', {
					'Content-Type' : file.type,
					'Content-Disposition' : 'attachment;filename=' + file.name
				});
						
				// Filestream		
				fs.createReadStream('./' + file.location, {
					'bufferSize': 4 * 1024
				}).pipe(res);

			}
			else {
				console.log("cannot read file");
				res.writeHead('404');
				res.end();
			}
		}
	});
});

// Desk Route
// different desk for each different name
app.get('/:deskname', function(req, res){

	var deskname = req.params.deskname;

	app.model.getDesk(deskname, function(error, desk) {
		if(error) console.log('Error');
		else {
			if(desk !== undefined ){
				var currentTime = new Date();
				var diffTime = currentTime.getTime()-desk.date.getTime();
				var diffMinutes = Math.ceil(diffTime / ( 1000 * 60 ));
				var leftTimeMessage;
				var leftTime = deskTime-diffMinutes;

				console.log('ZEITEN', deskTime,diffMinutes );
				
				//falls weniger als 1 Minute
				if(leftTime < 60) {
					leftTime = leftTime;
					leftTimeMessage = ' Minuten bis reset';
				}
				//falls weniger als 1 Tag
				else if(leftTime/60 < 24) {
					leftTime = leftTime/60;
					leftTimeMessage = ' Stunden bis reset';
				}
				//falls größer noch Tage
				else {
					leftTime = leftTime/60/24;
					leftTimeMessage = ' Tage bis reset';
				}

				leftTimeMessage = leftTime.toFixed(2) + leftTimeMessage;

				console.log(diffMinutes);

				if(diffMinutes > deskTime) {
						
					console.log('deleted');
					app.model.deleteDesk(deskname, function() {

						console.log('EIN DELETE JETZT');

						var child = exec('rm -R ./uploads/'+ deskname,
							function (error, stdout, stderr) {
								console.log('stdout: ' + stdout);
								console.log('stderr: ' + stderr);
								if (error !== null) {
									console.log('exec error: ' + error);
								}
						});
						
						//render view
						res.render('index.jade', {
							locals: {
								pageTitle: ('shareDesk - ' + req.params.deskname),
								timeLeft: deskTime
							}
						});
					});
				} else {
					//render view
					res.render('index.jade', {
						locals: {
							pageTitle: ('shareDesk - ' + req.params.deskname), 
							timeLeft: leftTimeMessage
						}
					});
				}
			} else {
				//render view
				res.render('index.jade', {
					locals: {
						pageTitle: ('shareDesk - ' + req.params.deskname),
						timeLeft: 'leer'
					}
				});
			}
		}	
	});
});

// Upload Route
// used to upload file with ajax
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

	// send progress-message, at one percent-rate or above
	form.on('progress', function(bytesReceived, bytesExpected) {									
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

	// uploading file done, save to db
	form.on('file', function(name, file) {
		console.log('file');
		var fileModel = {
			name: file.name,
			location: file.path,
			x: -1,
			y: -1,
			format: file.type
		}

		app.model.createFile(req.params.deskname, fileModel, function(error) {
			if (error) {
				console.log('Desktop doesnt exist, so creating a new one',error);
				app.model.createDesk(req.params.deskname, function(error) {
					if (error) {
						console.log('Creating Desktop error?: ',error);
					} 
					else {
						app.model.createFile(req.params.deskname, fileModel, function(error) {
							if (error) {
								console.log('Error creating File', error);
							}
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
					}
				});
			}
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

	// start upload/receiving file
	// close connection when done
	form.parse(req, function(error, fields, files) {

		res.writeHead(200, {'content-type': 'text/plain'});
		res.write('received upload:\n\n');
		res.end(util.inspect({fields: fields, files: files}));
		
	});

});

//create Upload folder if it not exists
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



