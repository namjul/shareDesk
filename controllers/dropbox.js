/*
 * /controllers/example.js
 */

var dbox = require("dbox");
var util = require("util");
var fs = require('fs');

var SUCCESS = 'success';
var FAILED = 'failed';
// in dropbox utils ausgliedern ??
var Desk = require('../models/desk.js').desk;
// in dropbox utils ausgliedern
var dropbox = require("../modules/dropbox");

// in dropbox utils ausgliedern
var client = dbox.createClient({
    app_key    : "sfp3gm7e13ryvz8",             // required
    app_secret : "6yapnqebb3z7vd3",           // required
    root       : "sandbox"          // optional (defaults to sandbox)
});

module.exports = function (app){

    var route = '', 
    controller = DropboxController;

    route = '/:deskname/dropbox';
    app.get(route, controller.index);

    route = '/:deskname/access';
    app.get(route, controller.access);

    route = '/desk/:deskid/account';
    app.get(route, controller.account);
    app.post(route, controller.create);

    // synchronize desk with dropbox (initial; getting new files from dropbox)
    route = '/desk/:deskid/sync';
    app.get(route, controller.sync);

    route = '/test/test';
    app.get(route, controller.test);
}



var DropboxController = {

    // GET: /test
    test: function(req, res) {
        var test = dropbox.auth(0);
        console.log(test);
    },

    //GET: /:deskname/dropbox
    index: function(req, res) {

      Desk.findOne({"name":req.params.deskname}, function(err, desk) {
        if (err) {
          console.log(err);
          res.json({type: FAILED}, 500);
          return;
        }
        if(desk){
          client.request_token(function(status, reply){
              console.log(status, reply)

              desk.dropbox = {
                  oauth_token: reply.oauth_token,
                  oauth_token_secret: reply.oauth_token_secret,
                  uid: reply.uid
              };

              desk.save(function(err, desk) {
                console.log("dropbox-request-oauth saved");
                res.redirect(client.build_authorize_url(reply.oauth_token, res.app.config.uri + '/' + req.params.deskname + '/access'));
              });

          });
        } else {
          res.redirect('/' + req.params.deskname);
        }
      });
    },

    //GET: /:deskname/access
    access: function(req, res, next) {
      Desk.findOne({"name":req.params.deskname}, function(err, desk) {
        if (err) {
          console.log(err);
          res.json({type: FAILED}, 500);
          return;
        }
        if(desk){
          var options = {
              oauth_token        : desk.dropbox.oauth_token,  
              oauth_token_secret : desk.dropbox.oauth_token_secret
          }
          client.access_token(options, function(status, reply){
            console.log(status, reply);

            desk.dropbox = {
                oauth_token: reply.oauth_token,
                oauth_token_secret: reply.oauth_token_secret,
                uid: reply.uid
            };

            desk.save(function(err) {
              console.log("dropbox-access-oauth saved");

              // Make a sync
              dropbox.sync(desk._id, function (status, reply) {
                if(status !== 200) throw new Error(status + '\n' + reply);
              });

              res.redirect('/' + req.params.deskname);
            });
          });
        } else {
          res.redirect('/' + req.params.deskname);
        }
      });
    },

    // GET /desk/:deskid/account
    account: function(req, res, next) {
        Desk.findById(req.params.deskid, function(err, desk) {
            console.log(desk);
            options = {
                oauth_token: desk.dropbox.oauth_token,
                oauth_token_secret: desk.dropbox.oauth_token_secret
            }/*
      client.account(options, function(status, reply) {
        //console.log(status)
        // 200
        //console.log(reply) 
        res.json(reply);
      });*/
            /*
      fs.ReadStream('./uploads/0e3f867fb4d7ac7d8205aeb830a920f7.JPG').pipe(request.put('https://api.dropbox.com/1/files_put/sandbox/0e3f867fb4d7ac7d8205aeb830a920f7.JPG', function(err, resp, obj) {
        console.log(res);
        res.send(util.inspect(obj));
      }));*/
      
            fs.readFile('./uploads/0e3f867fb4d7ac7d8205aeb830a920f7.JPG', function(err, data) {
                if(err) {
                    console.log(err);
                    return;
                }
                client.put('/TEST/0e3f867fb4d7ac7d8205aeb830a920f7.JPG', data, options, function(status, reply) {
                    console.log(status);
                    console.log(reply);

                    client.metadata('/TEST/0e3f867fb4d7ac7d8205aeb830a920f7.JPG', options, function(status, reply) {
                        console.log(status);
                        console.log(reply);
                    });
        
                    client.metadata('/TEST/', options, function(status, reply) {
                        console.log(status);
                        console.log(reply);
                    });
                });
            });
      
        });
    },

    // GET: /desk/:deskid/sync
    sync: function(req, res, next) { 
        dropbox.sync(req.params.deskid, function (status, reply) {
            if(status !== 200) throw new Error(status + '\n' + reply);
        });
        /*
        var isSuccess = false;

        Desk.findById(req.params.deskid, function(err, desk) {
            if(err) throw new Error(err);
      
            /*****************
            ** Timezone anpassen/berücksichtigen
            ********************/
/*

            var lastSync = desk.synced;
            if(lastSync === undefined)
                lastSync = 0;

            desk.synced = Date.now();
      
            var options = {
                oauth_token: desk.dropbox.oauth_token,
                oauth_token_secret: desk.dropbox.oauth_token_secret,
                include_deleted : true,
            }

            var optionsMkdir = {
                oauth_token: desk.dropbox.oauth_token,
                oauth_token_secret: desk.dropbox.oauth_token_secret,
            }

            var deskPath = '/' + desk.name + '/';
            client.metadata(deskPath, options, function(status, reply) {
                
                console.log(status);
                console.log(reply);
                // if folder does not exist
                if(status === 404) {
                    client.mkdir(deskPath, optionsMkdir, function(status, reply) {
                        console.log(status + "\n" + util.inspect(reply));
                    });
                    res.redirect(req.url);
                    //console.log(util.inspect(res));
                }

                if(status === 200) {
                    console.log(2);
                    var replyJson = JSON.parse(reply);
                    replyJson.contents.forEach(function(file) {
                        console.log(util.inspect(file));
                        var filename = file.path.replace(/^.*[\\\/]/, '');
                        // skip directories
                        if(file.is_dir) return;
                        // check only newer files than sync date
                        if(file.modified !== undefined) {
                            // milliseconds
                            var date = Date.parse(file.modified);
                            console.log(date + ' === ' + lastSync);
                            if(date >= lastSync) {
                                // save/update metadata into db
                                var foundFileInDb = false;
                                desk.files.forEach(function(dbFile) {
                                    // check if
                                    console.log(dbFile);
                                    console.log(filename);
                                    console.log(dbFile.name);
                                    if (filename === dbFile.name) {
                                        if(file.is_deleted) {
                                            console.log("deleted");
                                            //desk.files.remove(dbFile);
                                            dbFile.remove();
                                        } else {
                                            // update dropbox info in db
                                            dbFile.size = file.bytes;
                                            dbFile.modified = Date.parse(file.modified);
                                            dbFile.path = file.path;
                                            dbFile.name = filename;
                                            dbFile.type = file.mime_type;
                                            dbFile.revision = file.rev;
                                            // set found switch
                                        }
                                        foundFileInDb = true;
                                        return;
                                    }
                                });
                                if (!foundFileInDb) {
                                    
                                    if(file.is_deleted) return;

                                    // push file info from dropbox to desk
                                    var newFile = {
                                        name: filename,
                                        size: file.bytes,
                                        modified: Date.parse(file.modified),
                                        path: file.path,
                                        type: file.mime_type,
                                        revision: file.rev
                                    };
                                    console.log("push");
                                    desk.files.push(newFile);
                                }
                            }
                        }

                        // save desk, because sync date and synced files
                        desk.save(function(err, desk) {
                            if (err) {
                                //res.json({ type: FAILED}, 500);
                                throw new Error(err);
                            }
                            isSuccess = true;                
                        });
                    });
                }
            });

            // sync files with dropbox from server (incl. upload); updates server_db
            desk.files.forEach( function(file) {
                // files for each
                console.log("for each files");
                console.log(util.inspect(lastSync));
                console.log(util.inspect(file.modified));
                if(file.modified >= lastSync) {
                    fs.readFile(file.path, function(err, data) {
                        if(err) throw new Error(err);

                        client.put('/' + desk.name + '/' + file.name, data, options, function(status, reply) {
                          if(status === 200) {
                            // remove file from server
                            var tempPath = file.path;

                            var replyJson = reply; //JSON.parse(reply);
                            file.path = replyJson.path;
                            file.name = replyJson.path.replace(/^.*[\\\/]/, '');
                            file.size = replyJson.bytes;
                            file.modified = Date.parse(replyJson.modified);
                            file.path = replyJson.path;
                            file.type = replyJson.mime_type;
                            file.revision = replyJson.rev;

                            desk.save(function(err, desk) {
                              console.log("save_dropbox to server file");
                              if (err) {
                                //res.json({ type: FAILED}, 500);
                                throw new Error(err);
                              }
                              fs.unlink(tempPath, function(err) {
                                  if(err) throw new Error(err);
                              });
                            });
                          }

                        });
                  });
               }
            });
        });*/
        
    },

    //POST: /example
    create: function(req, res, next) {
        //new Post({title: req.body.title, author: req.body.author}).save();
        var instance = new Post();
        instance.title = "Ein neuer Post";
        instance.author = "Nam";
        instance.save(function(err) {
            if(err) return next(err);
            res.json(instance);
        })
    },

    //GET: /example/:id.:format?
    show: function(req, res, next) {

    },

    //PUT: /example/:id.:format?
    update: function(req, res, next) {
    },

    //DELETE: /example/:id.:format?
    destroy: function(req, res, next) {
    }

}




