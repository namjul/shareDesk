/*
 * /controllers/example.js
 */

var Desk = require('../models/desk.js').desk;
var Tag = require('../models/desk.js').tag;
var util = require('util');

var SUCCESS = 'success';
var FAILED = 'failed'

module.exports = function (app){

  var route = '', 
      controller = TagController;
  /*
  route = '/desk/:deskid/tags';
  // list all tags from desk
  app.get(route, controller.index);
  // rename tag (one all files)
  app.put(route, controller.update);
  // show files with tag
  app.get(route, controller.show);
  */
  route = '/tags';
  // set new tag on file
  app.post(route, controller.create);

  route = '/desk/:deskid/file/:fileid/tag/:tagname';
  // remove tag from file
  app.del(route, controller.destroy);

}

var TagController = {
/*
  //GET: /desk/:deskid/tags
  index: function(req, res) {
    //throw new Error('I am an uncaught exception');
    Post.find(function(err, posts) {
      res.json(posts);
        console.log("test");
    });
  },
*/
  //POST: /tags
  create: function(req, res, next) {
    Desk.findOne({"files._id": req.body.file_id}, function(err, desk){
      if(err) throw err;

      if (desk) {
        for (var i = 0; i < desk.files.length; i++) {
          var file = desk.files[i];
          if (file._id == req.body.file_id) {
            // check if tag already exists
            for(var j = 0; j < file.tags.length; j++) {
              if (file.tags[j].name === req.body.name){
                res.json(file.tags[j].toSpine);
                return
              }
            }  
            var t = new Tag();
            t.name = req.body.name;
            file.tags.push(t);
            desk.save(function (err) {
              if (err) {
                res.json({ type: FAILED}, 500);
                console.log(err);
                //throw err;
                return;
              }
              res.json(t.toSpine);
            });
            //break;
            return;
          }
        }
      }
      res.json({type: FAILED}, 404);
    });
  },
/*
  //GET: /desk/:deskid/tags
  show: function(req, res, next) {

  },

  //PUT: /desk/:deskid/tags
  update: function(req, res, next) {
  },
*/
  //DELETE: /desk/:deskid/file/:fileid/tag
  destroy: function(req, res, next) {
    Desk.find({"_id": req.params.deskid }, function(err, desk){
      if(err) throw err;

      if (desk && desk[0] && desk[0].files)
      for (var i = 0; i < desk[0].files.length; i++) {
        var file = desk[0].files[i];
        if (desk[0].files[i]._id == req.params.fileid) {
          // check if tag already exists
          //for(var k = 0; k < req.body.tags.length; k++) {
            for(var j = 0; j < desk[0].files[i].tags.length; j++) {
              if (desk[0].files[i].tags[j].name === req.params.tagname)
                // removes tag
                desk[0].files[i].tags.splice(j, 1);
            }  
          //}
          desk[0].save(function (err) {
            if (err) {
              res.json({ type: FAILED}, 500);
              console.log(err);
              //throw err;
              return;
            }
            res.json({ type: SUCCESS, fileid: file._id, tags: desk[0].files[i].tags});
          });
          //break;
          return;
        }
      }
    });
  }

}



