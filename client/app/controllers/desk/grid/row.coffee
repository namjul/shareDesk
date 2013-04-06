Spine = require('spine')
FileItem = require('controllers/desk/grid/fileitem')

class Row extends Spine.Controller
  className: 'grid-files-row'

  constructor: (firstRow=false) ->
    super

    # holds all files in this row
    @filesHolder = []

    # state of selection
    @hasFileSelected = false

    # hold row selection inlinebar
    @rowInlinebar = null

    # hold row fake selection inlinebar
    @rowFakeInlinebar = null

  addFile: (fileItem, prepend=false) ->
    fileItem.bind 'selected', @fileSelected
    @filesHolder.push(fileItem)
    @append fileItem

  fileOverlap: (newFileItem) ->
    width = 0
    for fileItem in @filesHolder
      width += fileItem.el.outerWidth(true)
    width += FileItem.outerWidth unless not newFileItem
    if width > @el.width() then return fileItem

  full: ->
    width = 0
    for fileItem in @filesHolder
      width += fileItem.el.outerWidth(true)
    spaceLeft = @el.parent().width() - @el.width() 
    if spaceLeft > FileItem.outerWidth then return false
    else return true

  rowWidth: ->
    width = 0
    for fileItem in @filesHolder
      width += fileItem.el.outerWidth(true)
    return width

  fileSelected: (file, position) =>
    @trigger 'fileSelected', @, file, position

  closeRowInlinebar: ->
    @rowInlinebar.close() unless not @rowInlinebar
    @rowFakeInlinebar.close() unless not @rowFakeInlinebar
    @el.find('.grid-file .selected').removeClass('selected')

  deselectFilesBut: (fileLeave) ->
    for file in @filesHolder
    	file.unselect() unless file.file.id == fileLeave.file.id


    
module.exports = Row 
