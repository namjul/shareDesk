Spine = require('spine')
File = require('models/file')

class FileItem extends Spine.Controller
  className: 'grid-file'

  elements: 
    '.wrap': 'wrap'
    '.wrap-inside': 'inside'

  events: 
    'click .wrap': 'select'

  constructor: () ->
    super

    @file.bind 'progress', @progress
    @file.bind 'finished', @finished
    
    @append require('views/desk/grid.file')(@file) 

  # static width of file element with margin
  @outerWidth = 200

  # static width of file element without margin
  @width = 170

  select: (evt) ->
    @wrap.addClass('selected')
    @trigger 'selected', @, @el.position()

  unselect: (evt) ->
    @wrap.removeClass('selected')

  progress: (file, progress) =>
    @el.find('.progress-percentage').text(progress)
    @el.find('.progress').css('height', progress + '%')

  finished: (file) =>
    @file.uploading = false
    @inside.html('')
    @inside.removeClass('uploading')

module.exports = FileItem 
