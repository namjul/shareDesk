//     sharedesk.js 0.2
//     (c) 2010 Samuel Hobl, Alexander Kumbeiz, Goran Janosevic.

// Initial Setup Dependencies
// -------------

var connect = require('connect'),
	express = require('express'),
	mongoStore = require('connect-mongodb'),
	model = require('./models/model-native-driver').db,
	util = require('util'),
	port = (process.argv[2] || 8081),
	formidable = require('formidable'),
	exec = require('child_process').exec,
	demoDeskTimeOutinDays = 3,
	deskTimeOutinDays = 30,
	path = require('path'),
	fs = require('fs'),
	socketio = require('socket.io'),
	url = require('url'),
	crypto = require('crypto');

       
// Setup Express
// -------------
var app = module.exports = express.createServer();

app.configure(function() {
 	app.set('views', __dirname + '/views');
 	app.set('view engine', 'jade');
 	app.use(express.bodyParser());
	app.use(express.cookieParser());
	//app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'keyboard cat'}));
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


// Desk Route
// different desk for each different name
app.get('/:deskname', function(req, res){

	var deskname = req.params.deskname;
	
	app.model.getDesk(deskname, function(error, desk) {
		if(error) console.log('Error');
		else {


			var isAuthorized = true;
			var isProtected = false;

			if(desk !== undefined && 'protection' in desk) {

				isProtected = true;
				
				if(req.cookies.identifier != desk.protection.identifier) {

					isAuthorized = false;

					//render passwortrequest view
					res.render('password.jade', {
						locals: {
							pageTitle: ('shareDesk - ' + req.params.deskname),
						}
					});

				} 
			}

			deskTimeOut = deskTimeOutinDays;
			if(deskname === 'demo') {
				 deskTimeOut = demoDeskTimeOutinDays;
			}
			if(desk !== undefined && desk.date !== undefined && isAuthorized){
				var currentTime = new Date();
				var diffTime = currentTime.getTime()-desk.date.getTime();
				var diffinDays = diffTime / ( 1000 * 60 * 60 * 24 );

				if(diffinDays > deskTimeOut) {
						
					app.model.deleteDesk(deskname, function() {

						console.log('JETZT EIN DELETE');

						//Deleting all files from this desk
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
								timeLeft: 'ShareDesk',
								deskTimeOut: deskTimeOut*86400000, 
								isProtected: isProtected ? 'private' : 'public'
							}
						});
					});
				} else {
					//render view
					res.render('index.jade', {
						locals: {
							pageTitle: ('shareDesk - ' + req.params.deskname),
							timeLeft: '',
							deskTimeOut: deskTimeOut*86400000,
							isProtected: isProtected ? 'private' : 'public'
						}
					});
				}
			} else if (isAuthorized) {
				//render view
				res.render('index.jade', {
					locals: {
						pageTitle: ('shareDesk - ' + req.params.deskname),
						timeLeft: 'ShareDesk',
						deskTimeOut: deskTimeOut*86400000,
						isProtected: isProtected ? 'private' : 'public'
					}
				});
			}
		}	
	});
});

// Download Route
// deskname is unimportant
app.get('/:deskname/download/:fileid', function(req, res) {

	var deskname = req.params.deskname;

	app.model.getDesk(deskname, function(error, desk) {
		if(error) console.log('Error');
		else {


			var isAuthorized = true;

			if(desk !== undefined && 'protection' in desk) {
				
				if(req.cookies.identifier != desk.protection.identifier) {

					isAuthorized = false;

					//render passwortrequest view
					res.render('password.jade', {
						locals: {
							pageTitle: ('shareDesk - ' + req.params.deskname),
						}
					});

				} 
			} 

			if(isAuthorized) {

				// send file
				app.model.getFile(req.params.fileid, function(error, file) {
					if(error) {
						console.log("getFile error", error);
					}
					else {
						path.exists('./' + file.location, function(exists) {
							if(!exists || !file) {
								res.render('brokenfile.jade', {
									locals: {pageTitle: ('shareDesk - ' + req.params.deskname) },
									layout: 'layoutSimple.jade'
								});
								return;
							}

							//Add an download-click to the file
							app.model.addDownloadClick(req.params.fileid, function(error) {
								if(error) {
									console.log("add DownloadClick Error", error);
								} else {
									file.downloads = file.downloads+1
									app.io.sockets.in(deskname).emit('addDownloadClick', file);
								}
							});
				
							// HTTP Header
							res.writeHead('200', {
								'Content-Type' : file.type,
								'Content-Disposition' : 'attachment;filename=' + file.name,
								'Content-Length' : fs.statSync('./' + file.location).size,
							});
									
							// Filestream		
							fs.createReadStream('./' + file.location, {
								'bufferSize': 4 * 1024
							}).pipe(res);
						});
					}
				});
			}
		}
	});
});


// Upload Route
// used to upload file with ajax
app.post('/upload/:deskname/:tempFileId', function(req, res) {
	var tempFileId = req.params.tempFileId;
	var rcvd_bytes_complete = 0;
	var basedir = './uploads/';


	var form = new formidable.IncomingForm(),
		files = [],
		fields = [];

	req.params.deskname = encodeURIComponent(req.params.deskname);
	console.log(req.params);

	var oldProgressPercentage = 0;
	var dir = basedir + req.params.deskname;

	//Should check if folder exists!
	////missing
	
	form.uploadDir = dir;

	var filePath = '';

	form.on('fileBegin', function(name, file) {
		console.log(name, file);
		filePath = file.path;
	});

	// send progress-message, at one percent-rate or above
	form.on('progress', function(bytesReceived, bytesExpected) {									
		var newProgressPercentage = (bytesReceived / bytesExpected) * 100 | 0;
		if(oldProgressPercentage < newProgressPercentage) {
			
			app.io.sockets.in(req.params.deskname).emit('progressAnnouce', {
				tempFileId: tempFileId, 
				bytesReceived: bytesReceived,
				bytesExpected: bytesExpected
			});

			oldProgressPercentage = newProgressPercentage;

		}
	});

	form.on('aborted', function() {
		console.log("---------------UPLOAD ABORTED----------------");
		app.io.sockets.in(req.params.deskname).emit('uploadAbortedAnnouce', tempFileId);

		//delete file on storage
		fs.unlink(filePath, function(error, test) {
			if(error) console.log('error delete file from storage: ', error);
		});

	});

	form.on('end', function() {
		console.log("---------------UPLOAD END----------------");
	});

	// uploading file done, save to db
	form.on('file', function(name, file) {
		console.log('Upload Done this is our file: ', util.inspect(file));
		var fileModel = {
			name: file.name,
			location: file.path,
			x: -1,
			y: -1,
			format: file.type,
			size: file.size,
			downloads: 0
		}

		//Sending 'createFile' signal
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
		
								
								app.io.sockets.in(req.params.deskname).emit('fileSavedAnnouce', {
									tempFileId: tempFileId,
									file: fileModel
								});

							}
						});
					}
				});
			}
			else {

				
				app.io.sockets.in(req.params.deskname).emit('fileSavedAnnouce', {
					tempFileId: tempFileId,
					file: fileModel
				});
			}
		});
	});

	// start upload/receiving file
	// close connection when done
	form.parse(req, function(error, fields, files) {

		//console.log('PARSE',util.inspect({fields: fields, files: files}));

		res.writeHead(200, {'content-type': 'text/plain'});
		res.write('received upload:\n\n');
      	res.end();
				
	});

});


// Password protection ROUTES

app.post('/:deskname/login', function(req, res) {

	//state(0): password wrong
	//state(1): access granted
	//state(2): desk dont exists
	//state(3): desk is not protected
	var resObject = {
		state: 0,
		message: ''
	}


	app.model.getDesk(req.params.deskname, function(error, desk) {

		if(error) console.log('Error in getting desk from database', error);
		else {

			if(desk === undefined) {
				resObject.state = 2;
				resObject.message = 'This desktop is has not being created.';
				res.send(resObject);
				
			} else {

				if('protection' in desk) {

					var passwordHash = crypto.createHash('sha1').update(req.body.password).digest("hex")

					if(passwordHash != desk.protection.passwordHash) {
						resObject.state = 0;
						resObject.message = 'You entern a wrong password';
						res.send(resObject);

					} else {

						resObject.state = 1;
						resObject.message = 'Acces granted';
						
						res.cookie('identifier', desk.protection.identifier, { expires: getCookieExpire(), path:'/'+req.params.deskname });

						res.send(resObject);

					}

				} else {
				
					resObject.state = 3;
					resObject.message = 'This desk is not protected';
					res.send(resObject);

				}
			}

		}
	});
});

app.post('/:deskname/password', function(req, res) {

	//state(0): error setting password
	//state(1): password succesfully set
	//state(2): password removed
	var resObject = {
		state: 0,
		message: ''
	}

	app.model.getDesk(req.params.deskname, function(error, desk) {


		if(error) console.log('Error in getting desk from database', error);
		else {


			if(desk === undefined) {
				resObject.state = 0;
				resObject.message = 'you need to upload files first before setting a password';
				res.send(resObject);
				
			} else {

				if(desk.name === 'demo') {
					resObject.state = 0;
					resObject.message = 'the demo desk does not allow password protection';
					res.send(resObject);

				} else if('protection' in desk ) {

					if(req.cookies.identifier != desk.protection.identifier) {
						resObject.state = 0;
						resObject.message = 'Your are not authorized to change the password';
						res.send(resObject);

					} else {
						//Rename password
						
						var toRemove = false;

						if(req.body !== undefined) {
							//Generate unique identifier
							var uniqueIdentifier = Math.round(Math.random()*99999999);
							var passwordHash = crypto.createHash('sha1').update(req.body.password).digest("hex"); 
							var protectionObject = {
								passwordHash:passwordHash,
								identifier:uniqueIdentifier
							}
						} else {
							toRemove = true;
						}
					

						app.model.setPassword(req.params.deskname, protectionObject, toRemove, function(error, desk) {
							if(error) console.log('Error in setting password', error);
							else {

								if(!toRemove) {

									res.cookie('identifier', uniqueIdentifier, { expires: getCookieExpire(), path:'/'+req.params.deskname });
									resObject.state = 1;
									resObject.message = 'Password has been renamed';
									res.send(resObject);

										
								} else {
									
									res.clearCookie('identifier')
									resObject.state = 2;
									resObject.message = 'Password has been removed';
									res.send(resObject);

								}
							}
						});


					}
				} else if(req.body !== undefined) {
					//Set a password
		
					//Generate unique identifier
					var uniqueIdentifier = Math.round(Math.random()*99999999);

					var passwordHash = crypto.createHash('sha1').update(req.body.password).digest("hex"); 

					var protectionObject = {
						passwordHash:passwordHash,
						identifier:uniqueIdentifier
					}

					app.model.setPassword(req.params.deskname, protectionObject, false, function(error, desk) {
						if(error) console.log('Error in setting password process', error);
						else {

							res.cookie('identifier', uniqueIdentifier, { expires: getCookieExpire(), path:'/'+req.params.deskname });
							resObject.state = 1;
							resObject.message = 'Password has been created';
							res.send(resObject);

						}
					});

				} else {
					res.clearCookie('identifier')
					resObject.state = 0;
					resObject.message = 'Password has been already removed';
					res.send(resObject);

				}
			}
		}
	
	});

});	

//Helper funktion 
/* Converts special characters
 * */
app.replaceUmlauts = function (string, index){
	var anArray = new Array(2);
	anArray[0] = new Array("Ö", "ö", "Ä", "ä", "Ü", "ü", "ß");
	anArray[1] = new Array("Oe", "oe", "Ae", "ae", "Ue", "ue", "sz");
	
	for (var i=0; i<anArray[index].length; i++){
		myRegExp = new RegExp(anArray[index][i],"g");
		string = string.replace(myRegExp, anArray[(index==0?1:0)][i]);
	}
	return string;
}


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

//having access to socket.io in controllers
app.io = socketio.listen(app);
app.io.disable('reconnect');

//Configure socket.io
app.io.configure('production', function(){
	app.io.enable('browser client minification');  // send minified client
	app.io.enable('browser client etag');          // apply etag caching logic based on version number
	app.io.set('log level', 1);                    // reduce logging
	app.io.set('transports', [                     // enable all transports (optional if you want flashsocket)
		'websocket'
	  , 'flashsocket'
	  , 'htmlfile'
	  , 'xhr-polling'
	  , 'jsonp-polling'
	]);
});


// start websockets controller
require('./controllers/websockets')(app);

// Only listen on $ node app.js
if (!module.parent) {
	app.listen(port);
	console.log("ShareDesk server listening on port %d", app.address().port);
}



//Helper
function getCookieExpire() {
	var d = new Date();
	return new Date(d.getTime() +1000*60*60*24*deskTimeOutinDays);
}


