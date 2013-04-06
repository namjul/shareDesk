Spine = require('spine')
Dropper = require('modules/dropper')
Desk = require('models/desk')
File = require('models/file')
$ = Spine.$

class Deskuploader extends Spine.Module

  @extend Spine.Events
  @extend Spine.Log

  @init: ->

    # listen to drag event on dropper
    Dropper.bind 'drop', @fileDrop

    # listen to model event
    Desk.bind 'ajaxSuccess', @deskUpdated
    File.bind 'uploadSuccess', @uploadFinished
    File.bind 'uploadProcess', @updateProgress

    # generated deskname
    @deskname = ''

    # handles state of uploader
    @hadFirstUpload = false

    # Reset all parameters
    @reset()

  @disable: ->
    @UploadingAllowed = false

  @enable: ->
    @uploadingAllowed = true
    
  @fileDrop: (files) =>
    if @uploadingAllowed
      @isUploading = true
      @startStamp = new Date()

      # check if deskname exists
      @deskname = @getCurrentDeskname()
      if @deskname == '' then @deskname = @randomString()

      filesAsArray = @toArray(files)

      # save files
      if @files[@deskname] 
      	for file in filesAsArray
          @files[@deskname].push(file)
      else
        @files[@deskname] = filesAsArray

      desk = Desk.findByAttribute('name', @deskname)
      if not desk then Desk.create({name: @deskname})
      else @deskUpdated desk

  @getCurrentDeskname: ->
    window.location.pathname.substr(1)

  @randomString: ->
    name = ''
    for i in [0..10]
    	name += Math.floor(Math.random() * 36).toString(36);
    name

  @deskUpdated: (desk) =>
    if @isUploading and desk.name == @deskname
      for file, i in @files[desk.name]
        if file.uploading then continue
        file.uploading = true
        @filesTotalSize += file.size
        Spine.Ajax.disable =>
          fileM = File.create(desk: desk, name: file.name, type: file.type, size: file.size, file: file)
          #file.bind 'previewReady', (record, source) ->
            #console.log record, source

  @updateProgress: (file, evt) =>
    if @hadFirstUpload 
      percentage = Math.round((evt.loaded / evt.total) * 100)

      # calculate estimated time
      lapsed = @startStamp - evt.timeStamp
      eta = Math.abs(Math.round(lapsed * evt.total / evt.loaded - lapsed))

      # set rest time as percentage or etaTime
      if evt.total - evt.loaded > 104860000
        etaTimeUnit = 'sec'
        if (etaHuman = eta/1000) > 60 then etaHuman /= 60; etaTimeUnit = 'min'
        if etaHuman > 60 then etaHuman /= 60; etaTimeUnit = 'hour'
        @trigger 'progressSingle', file, percentage, Math.round(etaHuman) + ' ' + etaTimeUnit 
      else
        @trigger 'progressSingle', file, percentage

    else @updateProgressAll(file, evt)
    
  @updateProgressAll: (file, evt) =>
    # calculate progress in percent
    @filesLoadedSize = evt.loaded
    percentage = Math.round(((evt.loaded + @filesFinishedSize) / @filesTotalSize) * 100)
    if percentage > 100 then percentage = 100     

    # calculate estimated time
    lapsed = @startStamp - evt.timeStamp
    eta = Math.abs(Math.round(lapsed * evt.total / evt.position - lapsed))

    # set signal each 1/4 if file is bigger then 100MB 
    if @filesTotalSize > 104860000
      if percentage > 25 and @reachedStep == 0
        #@inputSignal()	
        @reachedStep += 25
      else if percentage > 50 and @reachedStep == 25
        #@inputSignal()	
        @reachedStep += 25
      else if percentage > 75 and @reachedStep == 50
        #@inputSignal()	
        @reachedStep += 25

    # set rest time as percentage or etaTime
    if @filesTotalSize - @filesLoadedSize > 104860000
      etaTimeUnit = 'sec'
      if (etaHuman = eta/1000) > 60 then etaHuman /= 60; etaTimeUnit = 'min'
      if etaHuman > 60 then etaHuman /= 60; etaTimeUnit = 'hour'
      @trigger 'progressAll', file, percentage, Math.round(etaHuman) + ' ' + etaTimeUnit 
    else
    	@trigger 'progressAll', file, percentage

  @uploadFinished: (file, evt) =>

    # change file state
    file.file.uploading = false

    # one file of all has finished uploading
    @trigger 'fileFinished', file

    # trigger of all files are uploaded
    @filesCount++
    @filesFinishedSize += @filesLoadedSize
    if @filesCount == @files[@deskname].length
      @hadFirstUpload = true
      @reset()
      @trigger 'finished', @deskname

  @reset: ->
    # set a place for dragged in files
    @files = []

    # files sum size
    @filesTotalSize = 0 
    @filesLoadedSize = 0 
    @filesFinishedSize = 0 
    @filesCount = 0

    # start Date of upload
    @startStamp = null
    # signal counter
    @reachedStep = 0

    # set uploading state
    @isUploading = false

    # enable/disable uploading
    @uploadingAllowed = true


  @toArray: (collection) ->
    ary = []  
    for col in collection
    	ary.push(col)
    ary

module.exports = Deskuploader
