Spine = require('spine')

class File extends Spine.Model
  @configure 'File', 'name', 'type', 'size', 'file', 'path', 'downloads'

  @extend Spine.Model.Ajax
  @extend Spine.Model.Uploader
  #Spine.Model.host = "http://localhost:3000"
  
  @belongsTo 'desk', 'models/desk'
  @hasMany 'tags', 'models/tag'


  @filter: (desk_id, query) ->
    @select (file) ->
      if query.length == 1 and query[0] == '' then return true
      if file.desk_id == desk_id
        if query.length == 0 then false
        for q in query
          if file.name.toLowerCase().indexOf(q.toLowerCase()) isnt -1 and q isnt '' then return true
          console.log file.tags().all()
          for tag in file.tags().all()
            if tag.name.toLowerCase().indexOf(q.toLowerCase())  isnt -1 and q isnt '' then return true
        return false
      else return false

  module.exports = File
