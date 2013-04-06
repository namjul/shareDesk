module.exports = function(app, express){


  //General configurations
  app.configure(function() {

    // we dont use connect formidable feature
    //delete express.bodyParser.parse['multipart/form-data'];
    //app.use(express.logger());
    app.use(express.bodyParser());
    //app.use(app.router);
    //app.use(express.cookieParser());
    //app.use(express.session({ secret: "filesecurity"}));
    app.use(express.static(__dirname + '/public'));
  });


  //Development configurations
  app.configure('development', function() {
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
    /*
    app.all('/robots.txt', function(req,res) {
      res.send('User-agent: *\nDisallow: /', {'Content-Type': 'text/plain'});
    });
    */
  });


  //Production configurations
  app.configure('production', function() {
    app.use(express.errorHandler());
    /*
    app.all('/robots.txt', function(req,res) {
      res.send('User-agent: *', {'Content-Type': 'text/plain'});
    });
    */
  });


};
