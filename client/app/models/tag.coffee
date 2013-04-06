Spine = require('spine')

class Tag extends Spine.Model
  @configure 'Tag', 'name'
  
  @extend Spine.Model.Ajax

  @belongsTo 'file', 'models/file'

module.exports = Tag
