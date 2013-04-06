Spine = require('spine')

class Desk extends Spine.Model
  @configure 'Desk', 'name'
  @extend Spine.Model.Ajax
  @hasMany 'files', 'models/file'

module.exports = Desk
