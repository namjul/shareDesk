Spine = require('spine')
Row = require('controllers/desk/grid/row')
File = require('models/file')
FileItem = require('controllers/desk/grid/fileitem')
Inlinebar = require('controllers/desk/grid/inlinebar')
InlinebarFake = require('controllers/desk/grid/inlinebarFake')

class FilesGrid extends Spine.Controller
  className: 'grid-files'

  constructor: ->
    super

    # holds all rows
    @rowsHolder = []

    # set padding
    @gridPadding = 100

    # change on browser resize
    $(window).bind 'resize', @resize

  rest: ->
    $(window).unbind 'resize', @resize
    @removeInlinebars() 

  wakeup: ->
    $(window).bind 'resize', @resize
    @resize()

  render: (files) ->
    # save files
    @files = files if files?

    # set to 0 
    @gridWidth = 0

    # set width to the right value
    @el.css('width', @el.parent().width() - @gridPadding)

    # set current columns
    @columns = @currentColumns()

    for file in @files
      # first row
      @newRow(true) if @rowsHolder.length == 0
      
      row = @rowsHolder[@rowsHolder.length-1]
      if row.filesHolder.length == @columns
        row = @newRow()
      fileItem = new FileItem(file: file)
      row.addFile(fileItem)
      #@el.css('width',  @rowsHolder[0].rowWidth()) 
      @gridWidth = @rowsHolder[0].rowWidth()

  appendFile: (file) ->
    return false unless @files
    @files.push(file)
    @removeAllRows()
    @render()

  prependFile: (file) ->
    return false unless @files
    @files.unshift(file)
    @removeAllRows()
    @render()

  exists: (file) ->
    return false unless @files
    for f in @files
    	if f.id == file.id 
    		return true
    return false

  removeAllRows: ->
    for row in @rowsHolder
      row.unbind 'fileSelected'
  
      # remove row inlinebars
      row.rowInlinebar.release() unless not row.rowInlinebar
      row.rowFakeInlinebar.release() unless not row.rowFakeInlinebar

      row.release()
    @rowsHolder = []

  removeInlinebars: ->
    for row in @rowsHolder
      if row.hasFileSelected
        row.closeRowInlinebar()
        row.hasFileSelected = false

  newRow: (firstRow=false) ->
    row = new Row(firstRow)
    row.bind 'fileSelected', @newFileSelection
    @rowsHolder.push(row)
    @append row
    row

  resize: (evt) =>
    if @space() < 0
      @removeAllRows()
      @render()
    else if @space() > 0 && @rowsHolder.length > 1
      @removeAllRows()
      @render()
    else
      @el.css('width', @el.parent().width() - @gridPadding)
      @inlinebar?.setWrapWidth(@el.parent().width() - @gridPadding)
      @inlinebar?.setArrow(false)

  space: ->
    spaceLeft = @el.parent().width() - @gridPadding - @gridWidth
    if spaceLeft > FileItem.outerWidth then return 1
    else if spaceLeft < 0 then return -1
    else return 0

  currentColumns: ->
    spaceLeft = @el.parent().width() - @gridPadding - @gridWidth
    Math.floor(spaceLeft/FileItem.outerWidth)

  newFileSelection: (row, file, position) =>

    if row.hasFileSelected
      row.deselectFilesBut(file)
      row.rowInlinebar.setFile(file)
      row.rowInlinebar.setArrow()
      row.rowInlinebar.render()
    else
      # first remove old row inlinebars
      @removeInlinebars() 

      # insert fake file content for space
      inlinebarFake = new InlinebarFake()    
      row.el.after inlinebarFake.el

    	# set new row inlinebar
      row.hasFileSelected = true
      # insert inline file content
      @inlinebar = inlinebar = new Inlinebar(file: file, fake: inlinebarFake)
      inlinebar.setTop((@el.find('.grid-files-row').index(row.el) + 1) * row.el.height()) 
      inlinebar.setWrapWidth(@el.css('width'))
      inlinebar.setArrow(false)
      @el.parent().after inlinebar.el

      # save inlinebars in row
      row.rowInlinebar = inlinebar
      row.rowFakeInlinebar = inlinebarFake

      #open both
      height = inlinebar.height()
      inlinebarFake.open(height)
      inlinebar.open()
    
module.exports = FilesGrid












