/*
 * /controllers/example.js
 */

var Desk = require('../models/desk.js').desk;
var File = require('../models/desk.js').file;
var dropbox = require("../modules/dropbox");
var formidable = require('formidable');
var util = require('util');
var appUtil = require('../modules/utils');
var fs = require('fs');
var path = require('path');
var async = require('async');
var dbox = require("dbox");

// in dropbox utils ausgliedern
var client = dbox.createClient({
    app_key    : "sfp3gm7e13ryvz8",             // required
    app_secret : "6yapnqebb3z7vd3",           // required
    root       : "sandbox"          // optional (defaults to sandbox)
});

var options = {
  oauth_token        : "",  
  oauth_token_secret : "", 
}

var SUCCESS = 'success';
var FAILED = 'failed';
var NOFILE = 'no file';
var ABORTED = 'aborted';

module.exports = function (app){

  var route = '', 
      controller = FileController;

  route = '/files';
  app.get(route, controller.index);
  app.post(route, controller.create);

  route = '/files/:file_id';
  app.get(route, controller.show);
  app.put(route, controller.update);
  app.del(route, controller.destroy);

  route = '/desk/:deskid/file/:fileid/download';
  app.get(route, controller.download);

  route = '/desk/:deskid/file/:fileid/media';
  app.get(route, controller.media);
}


var FileController = {
  
  //GET: /files
  index: function(req, res, next) {

    Desk.findOne({_id: req.query.desk_id}, function(err, desk) {
      if (err) {
        console.log(err);
        res.json({type: FAILED}, 500);
        return;
      }
      if(desk && desk.files){
        var files = [];
        for(var i = 0; i < desk.files.length; i++) {
          files.push(desk.files[i].toSpine) 
        }
        res.json(files);
      }
      else {
        // responde with nothing instead 404
        res.json();
      }
    });

  },

  //POST: /files
  create: function(req, res, next) {
    
    console.log('FILE PUT');
    // is called after file has been uploaded

    //if no file is there
    if(!req.files) return res.json({type: ABORTED}); 

    var files = req.files,
        fields = req.body,
        dir = res.app.config.uploadFolder + '/' + req.body.desk_id;

    // check if uploadDeskFolder exists
    try {
      fs.lstatSync(dir);
    }
    catch(e) {
      fs.mkdirSync(dir, 0755);
    }

    Object.keys(files).forEach(function(key){

      file = files[key];      

      (function  (file){

        Desk.findById(req.body.desk_id, function(err, desk){

          if(err) throw err;

          if(desk == null) throw new Error('desk dont exist, cannot save file');

          var f = new File();

          if(desk.dropbox === undefined || desk.dropbox.oauth_token === undefined || desk.dropbox.oauth_token_secret === undefined) {

            f.name = file.filename;
            f.type = file.type;
            f.size = file.size;
            f.modified = Date.now();
            f.path = dir + '/' + f._id;
            f.downloads = 0;

            desk.files.push(f);

            desk.save(function(err, desk) {
              if (!err) res.json(f.toSpine);
            });

            // move file to location
            try {
              console.log(file.path);
              fs.rename(file.path, dir + '/' + f._id, function (err) { 
                throw err; 
                // say CG to remove file
                file = null; 
              });
            }
            catch (e){
              throw new Error(e)
            }
          } else if(desk.dropbox.oauth_token !== undefined && desk.dropbox.oauth_token_secret !== undefined) {

              options = {
                oauth_token: desk.dropbox.oauth_token,
                oauth_token_secret: desk.dropbox.oauth_token_secret
              }

              //Upload to Dropbox
              fs.readFile(file.path, function(err, data) {
                if(err) throw new Error(err);

                client.put('/' + desk.name + '/' + file.filename, data, options, function(status, reply) {
                  console.log('Upload TO Dropbox finished', status, reply);
                  if(status === 200) {
                    var replyJson = reply; //JSON.parse(reply);
                    f.path = replyJson.path;
                    f.name = replyJson.path.replace(/^.*[\\\/]/, '');
                    f.size = replyJson.bytes;
                    f.modified = Date.parse(replyJson.modified);
                    f.type = replyJson.mime_type;
                    f.revision = replyJson.rev;

                    desk.files.push(f);

                    desk.save(function(err, desk) {
                      console.log("save");
                      if (err) {
                        //res.json({ type: FAILED}, 500);
                        throw new Error(err);
                        // say CG to remove file
                        file = null; 
                      }
                    });

                    // delete file localy missing!!!

                  } else {
                    console.log('Log: Could not upload file to dropbox'); 
                  }
                });
              });
              
              //Respond
              res.json(f.toSpine);
          }
        });

      })(file);

    });
    
  },

  //GET: /files/:file_id
  show: function(req, res, next) {

    Desk.findOne({ 'files._id': req.params.file_id }, function(err, desk){
      if (err) {
        res.json({type: FAILED}, 500);
        throw err;
      }
      if (desk !== undefined && desk !== null ){
        file = desk.files.id(req.params.file_id);
        res.json(file);
      } else {
        res.json({type: FAILED}, 404);
      }
    });
  },

  //PUT: /files/:file_id
  update: function(req, res, next) {

    var fileId = req.params.file_id;

    async.parallel({
      // get current desk of file
      isDesk: function(callback){
        Desk.findOne({ 'files._id': fileId }, function(err, desk){
          if(err) return callback(err);
          callback(null, desk);
        });
      },
      // get desk of where file should be
      shouldDesk: function(callback){
        Desk.findById(req.body.desk_id, function(err, desk){
          if(err) return callback(err);
          callback(null, desk);
        });
      },
    },

    function(err, results) {
      if(err) throw err;
      var isDesk = results.isDesk,
          shouldDesk = results.shouldDesk;

      // check if they exist(maybe if shouldDesk not exists, create one?)
      if(shouldDesk === null || isDesk === null) {
        console.log('this should not happen!')
        res.json({type: FAILED}, 500);
        return
        //throw err;
      }
    
      // get the file we are dealing with
      file = isDesk.files.id(fileId);
      if(file === null) {
        console.log('file should be in the database, this should not happen!')
        res.json({type: FAILED}, 500);
        //throw new Error("file with id not found");
      }

      // if file is already in the shouldDesk, so only file properties need an update
      if(shouldDesk._id.toString() === isDesk._id.toString()){

        console.log('Log: update file');

        //no dropbox needed, only maybe a dropbox sync
        // because file is already localy in the right desk folder or in the dropbox
        
        file.name = req.body.name;
        file.downloads = req.body.downloads;
        // update the rest of the file properties needed for db 
        
        // save desk now
        isDesk.save(function (err) {
          if (err) {
            res.json({ type: FAILED}, 500);
            console.log(err);
            //throw err;
            return;
          }
          res.json(req.body);
        });

      // if file is not in shouldDesk
      } else {

        console.log('Log: update and move file');

        var oldPath = file.path;

        // first remove old one
        file.remove();

        //create the new file
        var newFile = new File();
        newFile._id = fileId;
        newFile.path = res.app.config.uploadFolder + '/' + shouldDesk._id + '/' + fileId;
        newFile.name = file.name;
        newFile.size = file.size;
        newFile.modified = file.modified;
        newFile.type = file.type;
        newFile.revision = file.revision;
        shouldDesk.files.push(newFile);

        // functions called in serie
        async.series([
          function(callback){
            isDesk.save( function(err) {
              if(err) return callback(err);
              callback(null);
            });
          },
          function(callback){
            shouldDesk.save( function(err) {
              if(err) return callback(err);
              callback(null);
            }); 
          },
          function(callback){
            var dir = res.app.config.uploadFolder + '/' + shouldDesk._id;

            // check if uploadDeskFolder exists
            try {
              fs.lstatSync(dir);
            }
            catch(e) {
              fs.mkdirSync(dir, 0755);
            }

            // move file to new location
            fs.rename(oldPath, newFile.path, function (err) { 
              if(err) return callback(err);
              callback(null)
            });
          },
          function(callback){
            // if target desk is connected with dropbox, sync files
            if(shouldDesk.dropbox !== undefined && shouldDesk.dropbox.oauth_token !== undefined && shouldDesk.dropbox.oauth_token_secret !== undefined) {
              dropbox.sync(shouldDesk.desk_id, function (status, reply) {
                if(status !== 200) throw new Error(status + '\n' + reply);
              });
            }
            callback(null);
          }
        ],
        //callback
        function(err, result){
          if (err) {
            res.json({ type: FAILED}, 500);
            console.log(err);
            return;
          }
          res.json(newFile.toSpineMethod()); 
        });
      }
    });
  },

  //DELETE: /files/:file_id
  destroy: function(req, res, next) {

    var fileId = req.params.file_id;

    Desk.findOne({ 'files._id': fileId}, function(err, desk){

      options = {
        oauth_token: desk.dropbox.oauth_token,
        oauth_token_secret: desk.dropbox.oauth_token_secret
      }

      if (err) {
        res.json({type: FAILED}, 500);
        console.log('"' + util.inspect(err)+'"');
        //throw err;
        return;
      }

      if(desk !== null && desk.files) {

        file = desk.files.id(fileId);
        file.remove();
        desk.save(function (err) {
          
          if(desk.dropbox !== undefined && desk.dropbox.oauth_token !== undefined && desk.dropbox.oauth_token_secret !== undefined) {
            console.log("del dropbox");
            console.log(file.path);
            client.rm(file.path, options, function(status, reply) {
              if(status !== 200) throw new Error(reply);
              console.log(reply);
            });
          } else {
            // remove from server fs
            fs.unlink(file.path, function(err) {
                if(err) throw new Error(err);
                console.log("removed file from server");
            });
          }
          if (err) {
            res.json({ type: FAILED}, 500);
            console.log('"' + util.inspect(err)+'"');
            //throw err;
            return;
          }
          res.json();

        });
      } else {
        // when desk was found
        res.json({type: FAILED}, 404);
      }

    });

  },

  download: function(req, res, next) {
    Desk.findById(req.params.deskid, function(err, desk) {

      options = {
        oauth_token: desk.dropbox.oauth_token,
        oauth_token_secret: desk.dropbox.oauth_token_secret
      }

      var file = desk.files.id(req.params.fileid);
      if(file) {
        if(desk.dropbox === undefined || desk.dropbox.oauth_token === undefined || desk.dropbox.oauth_token_secret === undefined) {
          console.log("locla file");
          fs.readFile(file.path, function(err, data) {
            res.writeHead(200, { 'Content-Type': file.type });
            res.end(data);
          });
        } else {
          // + 60 * 100 milliseconds to make sure that link dont expire during redirect
          if(file.sharedlink !== undefined && file.sharedexpire > Date.now() + 60 * 1000) {
            console.log("saved sharedlink: " + file.sharedlink);
            res.redirect(file.sharedlink);
          } else {
            // get new sharedlink
            client.shares(file.path, options, function(status, reply){
              if(status === 200) {
                reply = JSON.parse(reply);
                file.sharedlink = reply.url;
                file.sharedexpire = Date.parse(reply.expires);

                console.log("created sharedlink: " + file.sharedlink);

                desk.save( function(err, desk) {
                  if (err) throw new Error(err);
                });
                res.redirect(file.sharedlink);
              } else {
                throw new Error(status + "\n" + reply);
              }
            });
          }
        }
      }
    });
  },

  media: function(req, res, next) {
    Desk.findById(req.params.deskid, function(err, desk) {

      options = {
        oauth_token: desk.dropbox.oauth_token,
        oauth_token_secret: desk.dropbox.oauth_token_secret
      }

      var file = desk.files.id(req.params.fileid);
      if(file) {
        if(desk.dropbox === undefined || desk.dropbox.oauth_token === undefined || desk.dropbox.oauth_token_secret === undefined) {
          console.log("locla file");
          fs.readFile(file.path, function(err, data) {
            res.writeHead(200, { 'Content-Type': file.type });
            res.end(data);
          });
        } else {

          // get new medialink
          client.media(file.path, options, function(status, reply){
            if(status === 200) {
              reply = JSON.parse(reply);

              res.redirect(reply.url);

            } else {
              throw new Error(status + "\n" + reply);
            }
          });
        }
      }
    });
  }
}
