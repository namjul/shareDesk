Spine = require('spine')
Desk = require('models/desk')
File = require('models/file')
Uploader = require('modules/uploader')
Dropper = require('modules/dropper')
$ = Spine.$

class Upload extends Spine.Controller
  constructor: ->
    super

    # add to DOM
    @appendTo @parent.right

    # listen to drag event on dropper
    Dropper.bind 'drop', @fileDrop

    # listen to model event
    Uploader.bind 'progressAll', @updateProgress
    Uploader.bind 'finished', @uploadFinished
    Desk.bind 'ajaxSuccess', @deskUpdated

    # to check if submited
    @submited = false

    # set state to close
    @hoverState = 'close'
    @hasUploaded = false
  
  className: 'uploadInput'

  events: 
    "focus input": "focusInputHandler"
    "blur input": "blurInputHandler"
    "keypress input": "submitInputHandler"

  elements:
    ".progress span": "progressField"
    ".input span": "percentField"
    "input": "inputField"
    ".input-info": "inputInfo"

  fileDrop: (files) =>
    # Set Progress-input-field
    @html require('views/start/upload')

  updateProgress: (file, percentage, eta) =>

    @progressField.css('width', percentage + '%')
    if not eta 
      @percentField.html(percentage)
    else
      @percentField.html(eta)

  uploadFinished: () =>
    @inputSignal()

  focusInputHandler: =>
    if @inputField.val() == @inputField.attr('title')  
    	@inputField.val("")
  blurInputHandler: =>
    if @inputField.val() == ""
    	@inputField.val(@inputField.attr('title'))

  submitInputHandler: (evt) =>
    code = evt.keyCode or evt.which
    @newDeskName = @inputField.val().NormaliseUrl()
    if code == 13 and @newDeskName != ''
      @submited = true
      if Uploader.isUploading 
      	@trigger 'end', @newDeskName 
      else 
        @log 'save desk'
        desk = Desk.findByAttribute('name', Uploader.deskname)
        desk.name = @newDeskName
        desk.save()

  deskUpdated: (desk) =>
    if desk.name == @newDeskName
      @log 'save desk updated'
      @trigger 'end', desk.name 

  inputSignal: (count = 3) =>
    @inputInfo.fadeIn(500).fadeOut(1000, =>
      if not @submited and count > 1 then @inputSignal(count-1)
      else if not @submited then @trigger 'end', Uploader.deskname 
    );

  deactivate: ->
    Dropper.unbind 'drop', @fileDrop
    Uploader.unbind 'progressAll', @updateProgress
    Uploader.unbind 'finished', @uploadFinished
    Desk.unbind 'ajaxSuccess', @deskUpdated
    @release()

module.exports = Upload
