Spine = require('spine')
Search = require('controllers/desk/header/search')
FilesGrid = require('controllers/desk/filesGrid')
FilesList = require('controllers/desk/filesList')
Desk = require('models/desk')
File = require('models/file')
InlinebarTags = require('controllers/desk/header/inlinebarTags')
Uploader = require('modules/uploader')

class Desks extends Spine.Controller

  elements:
    'header': 'header'
    'a.tags': 'tag-button'
    '.search-area': 'searchArea'
    '.grid-view': 'grid'
    '.list-view': 'list'
    '.desk-content': 'deskContent'

  events:
    'click a.tags': 'openTags'
    'click .grid-view': 'activateGrid'
    'click .list-view': 'activateList'

  className: 'desk'

  constructor: ->
    super

    # set deskname property
    @deskname = ''

    if @starter then @starter.bind 'finished', @initAll
    
  initAll: (deskname) =>

    # set Uploader to desk
    Uploader.hadFirstUpload = true

    # listen to model event
    Uploader.bind 'fileFinished', @fileUpload
    Uploader.bind 'progressSingle', @fileProgress

    if deskname then @deskname = deskname

    @html require('views/desk/desk')
    @search = new Search()
    @search.bind 'search', @newSearch
    @searchArea.html @search.el
    
    Desk.bind 'ajaxSuccess', @initFiles

    # Init FileArea
    @filesArea = new FilesArea
    @deskContent.append @filesArea.el     

    @deskRecord = Desk.findByAttribute('name', @deskname)
    if not @deskRecord 
      @deskRecord = Desk.create(name: @deskname)
    else
      @initFiles()

  newSearch: (queryList) =>
    @filesArea.filesGrid.removeAllRows()
    @filesArea.filesGrid.render(File.filter(@deskRecord.id, queryList))

  openTags: ->
    if @el.find('.inline-tags').length == 0
    	@inlineTagBar = new InlinebarTags(search: @search, desk: @deskRecord)
    	@header.after @inlineTagBar.el
    	@inlineTagBar.open()
    else
    	@inlineTagBar.close()

  initFiles: (desk) =>

    # check if file is not from desk und move it
    if Uploader.deskname != @deskRecord.name and Uploader.deskname != ''
      desk = Desk.findByAttribute('name', Uploader.deskname) 
      if desk
        files = desk.files().all()
        @log 'move files', files
        for file in files
          if file.file.uploading == false
            newFile = file.attributes()
            delete newFile['desk_id']
            Spine.Upload.disable =>
              @deskRecord.files().create(newFile)
    
    @filesArea.filesGrid.render(@deskRecord.files().all())
    @filesArea.filesList.render(@deskRecord.files().all())

  activateGrid: (evt) ->
    @filesArea.filesGrid.active()
    @filesArea.filesGrid.wakeup()
    @filesArea.filesList.rest()
    $(evt.target).addClass('active')
    $(evt.target).siblings().removeClass('active')

  activateList: (evt) ->
    @filesArea.filesList.active()
    @filesArea.filesList.wakeup()
    @filesArea.filesGrid.rest()
    $(evt.target).addClass('active')
    $(evt.target).siblings().removeClass('active')

  fileUpload: (file) =>
    @log file, 'desk file finish?'
    # wenn das file noch auf den zufällig erstellen geladen wurde
    if file.desk_id != @deskRecord.id
      newFile = file.attributes()
      delete newFile['desk_id']
      Spine.Upload.disable =>
        @deskRecord.files().create(newFile)
        @log @deskRecord.files().all()
    file.trigger 'finished'

  fileProgress: (file, percentage, eta) =>
    @log file, 'desk file progress'
    if not @filesArea.filesGrid.exists(file)
    	file.uploading = true
    	@filesArea.filesGrid.prependFile(file)
    file.trigger 'progress', percentage

  deactivate: ->
    Desk.unbind 'ajaxSuccess', @initFiles
    Uploader.unbind 'fileFinished', @fileUpload
    Uploader.unbind 'progressSingle', @fileProgress
    @filesArea = null
    @html ''

class FilesArea extends Spine.Stack
  className: 'files-area stack'

  controllers:
    filesGrid: FilesGrid
    filesList: FilesList

  default: 'filesGrid'

module.exports = Desks
