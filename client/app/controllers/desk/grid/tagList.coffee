Spine = require('spine')
Tag = require('models/tag')

class TagList extends Spine.Controller

  className: 'taglist'

  tag: 'ul'

  elements:
    'input': 'input'
    '.tagInput': 'inputItem'

  events:
    'keyup input': 'newTag'

  constructor: ->
    super

    for tag in @file.tags().all()
      tagTemplate = require('views/desk/filetag')(tag)
      @append tagTemplate
    @append require('views/desk/filetag')(input: true, downloadLink: '/desk/' + @file.desk_id + '/file/' + @file.id + '/download')

  newTag: (evt) ->
    code = evt.keyCode or evt.which
    @newTag = @input.val()
    if code == 13 and @newTag != ''
      @inputItem.before require('views/desk/filetag')(name: @newTag)
      @input.val('')
      @file.tags().create(name: @newTag)


module.exports = TagList 

