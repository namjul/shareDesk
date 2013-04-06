Spine = require('spine')
$ = Spine.$
Dropper = require('modules/dropper')
UploadController = require('controllers/start/upload')
Uploader = require('modules/uploader')

class Starter extends Spine.Controller
  constructor: ->
    super

  initAll: ->
    # Set half browser width
    @el.css('width', $(window).width()/2)
    @html require('views/start/start')
    @loadDesktopImage()
    @db.tipTip({delay:100, defaultPosition: 'left'})

    # add resize event
    $(window).resize(@resize)

    # listen to drag event on dropper
    Dropper.bind 'dragEnter', @fileEnter
    Dropper.bind 'dragLeave', @fileLeave
    Dropper.bind 'drop', @fileDrop

    # Start Upload Controller
    @uploadController = new UploadController parent: @
    @uploadController.bind 'end', @finished

    # set state to close
    @isUploading = false

  elements:
    ".left": "left"
    ".right": "right"
    ".db-info": "db"
    
  className: "start"

  resize: (evt) =>
    # set the width to the half of viewport
    viewportWidth = $(window).width(); 
    if @isUploading then viewportWidth =-200
    @el.css('width', viewportWidth/2)

  fileLeave: =>
    if not @isUploading
      viewportWidth = $(window).width(); 
      @el.stop(true, false).animate(
        width: viewportWidth/2
      ,
        duration: 300,
        easing: 'easeOutBack'
      ).css('overflow', 'visible')

  fileEnter: =>
    if not @isUploading
      currentWidth = @el.width()
      @el.stop(true, false).animate(
        width: currentWidth-200
      ,
        duration: 300,
        easing: 'easeOutBack'
      ).css('overflow', 'visible')

  fileDrop: (files) =>
    @right.find('h1').addClass('small')
    @db.remove()
    @isUploading = true

  loadDesktopImage: =>
    img = new Image()
    self = @
    $(img).load ->
      $(this).hide();

      self.left.prepend(this)
      $(this).fadeIn('slow');
    .attr('src', 'images/desktop.png')

  finished: (deskname) =>
    @uploadController.deactivate()

    # Update browser url bar
    Spine.Route.navigate("/" + deskname, false)

    # hide right content 
    @right.fadeOut 100,  =>
      @right.remove()

    #hide left content
    @el.animate(
      width: 0
    ,
      duration: 500
      easing: 'easeOutExpo'
      complete: =>
        @.release()
        @trigger 'finished', deskname
    ).css('overflow', 'visible')

  deactivate: ->
    Dropper.unbind 'dragEnter', @fileEnter
    Dropper.unbind 'dragLeave', @fileLeave
    Dropper.unbind 'drop', @fileDrop
    @uploadController.unbind 'end', @finished unless not @uploadController
    @uploadController = null
    @html ''
    @release()
    
module.exports = Starter
