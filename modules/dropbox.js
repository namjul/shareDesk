var util = require("util");
var dbox = require("dbox");
var fs = require('fs');

var SUCCESS = 'success';
var FAILED = 'failed';

var Desk = require('../models/desk.js').desk;

var client = dbox.createClient({
    app_key    : "sfp3gm7e13ryvz8",             // required
    app_secret : "6yapnqebb3z7vd3",           // required
    root       : "sandbox"          // optional (defaults to sandbox)
});

module.exports = {

  // authenticate dropbox user with desk
  auth: function(a) {
    
  },

  // Object to array converter
  sync: function(deskid, callback) {
    var optionsMkdir;
    var deskPath;

    Desk.findById(deskid, function(err, desk) {
    	deskPath = '/' + desk.name + '/';


      if(desk.dropbox === undefined || desk.dropbox.oauth_token === undefined || desk.dropbox.oauth_token_secret === undefined) {
         return
      }

    	optionsMkdir = {
	        oauth_token: desk.dropbox.oauth_token,
	        oauth_token_secret: desk.dropbox.oauth_token_secret,
	    }

    });

    this.sync_plain(deskid, function (status, reply) {
        if(status === 404) {
            client.mkdir(deskPath, optionsMkdir, function(status, reply) {
                module.exports.sync_plain(deskid, function(status, reply) {
                    callback(status, reply);
                });
            });
        }
    });
    
  	
  },

  sync_plain: function(deskid, callback) {
    var isSuccess = false;

    Desk.findById(deskid, function(err, desk) {
        if(err) throw new Error(err);
  
        /*****************
        ** Timezone anpassen/berücksichtigen
        ********************/


        var lastSync = desk.synced;
        if(lastSync === undefined)
            lastSync = 0;

        desk.synced = Date.now();
  
        var options = {
            oauth_token: desk.dropbox.oauth_token,
            oauth_token_secret: desk.dropbox.oauth_token_secret,
            include_deleted : true,
        }

        var deskPath = '/' + desk.name + '/';

        // syncs server with the dropbox files (save info in server-db)
        client.metadata(deskPath, options, function(status, reply) {
            
            console.log(status);
            console.log(reply);
            // if folder does not exist
            if(status === 404) {
                callback(status, reply);
                return;

            } else if(status === 200) {
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
            if(file.modified >= lastSync && (file.revision === undefined || file.revision === null)) {
                fs.readFile(file.path, function(err, data) {
                    if(err) throw new Error(err);

                    // in closure
                    (function  (file){
                     
                      client.put('/' + desk.name + '/' + file.name, data, options, function(status, reply) {
                        if(status === 200) {
                          // remove file from server
                          var tempPath = file.path;
                          //console.log(tempPath);

                          var replyJson = reply; //JSON.parse(reply);
                          file.path = replyJson.path;
                          file.name = replyJson.path.replace(/^.*[\\\/]/, '');
                          file.size = replyJson.bytes;
                          file.modified = Date.parse(replyJson.modified);
                          file.path = replyJson.path;
                          file.type = replyJson.mime_type;
                          file.revision = replyJson.rev;
                          //console.log(tempPath);
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

                    })(file);
              });
           }
        });
    });
        
    return ;
  },

}
