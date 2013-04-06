/*
 * /controllers/example.js
 */

var Desk = require('../models/desk.js').desk;
var fs = require('fs');
var async = require('async');
var dropbox = require("../modules/dropbox");
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
var FAILED = 'failed'

module.exports = function (app){

  var route = '', 
      controller = DeskController;

  route = '/desks';
  app.get(route, controller.index);
  app.post(route, controller.create);

  route = '/desks/:desk_id';
  app.put(route, controller.update);
  app.del(route, controller.destroy);
  app.get(route, controller.show);

}

var DeskController = {

  //GET: /desks
  index: function(req, res) {
    // list of desks?
  },

  //POST: /desks
  create: function(req, res, next) {
    Desk.find({"name":req.body.name}, function(err, desks) {
      if(desks.length === 0) {
        var desk = new Desk();
        desk.name = req.body.name;
        desk.save( function(err) {
          if (err) {
            res.json({ type: FAILED}, 500);
            console.log(err);
            //throw err;
            return;
          }
          res.json(desk.toSpine);
        });
      } else if (desks.length === 1) {
        res.json(desks[0].toSpine);
      } else {
        res.json({ type: 'double desks existing!!!'}, 500);
      }
    });
        
  },

  //GET: /desks/:desk_id
  show: function(req, res, next) {
    Desk.findOne({_id: req.params.desk_id}, function(err, desk) {
      if (err) {
        console.log(err);
        res.json({type: FAILED}, 500);
        return;
      }
      if(desk)
        res.json(desk.toSpine);
      else
        // responde with nothing instead 404
        res.json();
    });
  },

  //PUT: /desks/:desk_id
  update: function(req, res, next) {

    console.log('DESK PUT');

    async.parallel({
      desks: function(callback){
        Desk.find({"name":req.body.name}, function(err, desks) {
          if(err) return callback(err);
          callback(null, desks);
        });
      },
      desk: function(callback){
        Desk.findById(req.body.id, function(err, desk){
          if(err) return callback(err);
          callback(null, desk);
        });
      },
    },

    // callback is called after top functions are finished
    function(err, results){
      if(err) throw err;
      var desk = results.desk,
          desks = results.desks;

      console.log('desk by id: ', desk);
      console.log('desks by name: ', desks);

      if(typeof(desk) !== 'undefined' && desk != null) {

        //take the created desk and rename it
        if(desks.length === 0) {
          desk.name = req.body.name;
          desk.save(function(err, desk) {
            if (!err) res.json(desk.toSpine);
          });
        } else if(desks.length === 1) {
          var dir = res.app.config.uploadFolder;
          var tempDesk = desks[0];

          //update files
          for ( var i=0, len=desk.files.length; i<len; ++i ){
            var tempPath = desk.files[i].path;
            var tempFile = desk.files[i];
            tempFile.path = dir + '/' + tempDesk._id + '/' + tempFile._id;
            tempDesk.files.push(desk.files[i]);
            //update of the rest is missing!!

            if(tempDesk.dropbox === undefined || tempDesk.dropbox.oauth_token === undefined || tempDesk.dropbox.oauth_token_secret === undefined) {

              console.log('NO DROPBOX');
            
              // move file to location
              fs.rename(tempPath, dir + '/' + tempDesk._id + '/' + tempFile._id, function (err) { 
                // If Error moving file: maybe filesystem and database not consitent? 
                throw err; 
              });
              fs.rmdir(dir + '/' + desk._id)

            } else if(tempDesk.dropbox.oauth_token !== undefined && tempDesk.dropbox.oauth_token_secret !== undefined) {

              console.log('DROPBOX');

              options = {
                oauth_token: tempDesk.dropbox.oauth_token,
                oauth_token_secret: tempDesk.dropbox.oauth_token_secret
              };

              // in closure
              (function  (path, name){
                //Upload to Dropbox
                console.log('file to dropbox', file);
                fs.readFile(path, function(err, data) {
                  if(err) throw new Error(err);

                  client.put('/' + tempDesk.name + '/' + name, data, options, function(status, reply) {
                    console.log('Upload TO Dropbox finished', status, reply);
                  });
                });
              })(tempPath, tempFile.name);
            }
          }

          tempDesk.save(function(err, desk) {
            if (!err) res.json(desks[0].toSpine);
          });
          desk.remove();
        } else {
          res.json({ type: 'double desks existing!!!'}, 500);
        }

      } else {
        throw new Error('could not find desk by id'); 
      }
    });
  },

  //DELETE: /desks/:desk_id
  destroy: function(req, res, next) {
    // needed?
  }

}



