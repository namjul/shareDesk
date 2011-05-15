
///////////////////////////////////////////
//           SETUP Dependencies          //
///////////////////////////////////////////
var connect = require('connect'),
	express = require('express'),
	mongoStore = require('connect-mongodb'),
	model = require('./models/model-native-driver').db,
	util = require('util'),
	port = (process.env.PORT || 8081);	

       
///////////////////////////////////////////
//             SETUP Express             //
///////////////////////////////////////////
var app = module.exports = express.createServer();

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

app.error(function(err, req, res, next) {
  	if (err instanceof NotFound) {
    	res.render('404', { status: 404 });
  	} else {
    	next(err);
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

app.get('/:id', function(req, res){
	res.render('index.jade', {
		locals: {pageTitle: ('shareDesk - ' + req.params.id) }
	});
});



// start websockets controller
require('./controllers/websockets')(app);



// Only listen on $ node app.js
if (!module.parent) {
  app.listen(port);
  console.log("ShareDesk server listening on port %d", app.address().port);
}



