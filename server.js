// Initial Setup Dependencies
var express = require('express'),
    mongoose = require('mongoose'),
    fs = require('fs'),
    utils = require('./modules/utils');
// Fetch the site configuration
var config = require('./config/settings');
process.title = config.uri.replace(/http:\/\/(www)?/, '');

// connect to Mongodb when the app initializes
mongoose.connect('mongodb://localhost/' + (process.env.NODE_ENV || 'development'));

var app = module.exports = express.createServer();
app.config = config;

//Setup environment configurations
require('./config/environment.js')(app, express);

//Exception handling
process.on('uncaughtException', function(err){
  console.log('Caught exception: '+err+'\n'+err.stack);
  console.log('\u0007'); // Terminal bell
  //External Logger e.g. airbrake
  process.exit(1);
});


// Static files werden nicht gefunden wenn dies nur in der enviroment.js steht, wieso?
app.use(express.static(__dirname + '/public'));


// Default Routes
app.get('/', function(req, res){
  res.render('index.jade', {layout: false});
});

app.get('/:deskname', function(req, res, next){
  //change route if request is an ajax call
  if (req.isXMLHttpRequest){
    if (req.params.deskname in utils.oc(['files'])) {
      next(); 
    }
  } else {
    res.render('index.jade', {layout: false});
  }
});

//Boot Controllers
(function (app) {
  fs.readdir(__dirname + '/controllers', function(err, files){
    if (err) throw err;
    files.forEach(function(file){
      // TODO just load .js files
      var name = file.replace('.js', '')
      require('./controllers/' + name)(app);
    });
  });
})(app);

if (!module.parent) {
  app.listen(config.port, null);
  // TODO: ausgabe 8080 auch wenn anders configuriert
  console.log('Running in '+(process.env.NODE_ENV || 'development')+' mode @ '+config.uri);
}
