Spine = require('spine')
File = require('models/file')
$ = Spine.$

class Files extends Spine.Controller

  className: 'file-wrapper'
  constructor: ->
    super
    
    File.bind 'refresh', @render
    File.bind 'create', @createFile
    File.bind 'uploadSuccess', @uploadFinished
    File.bind 'uploadProcess', @updateFile


  render: =>
    files = File.all()
    @html require('views/file')(files)

  createFile: (record, options) =>
    file = require('views/file')(record)
    @append file 
    record.bind 'previewReady', do (file) ->
      (rec, source) ->
        #maybe video in the future
        if @type.match(/image.*/)
          file.find('img').attr('src', rec.preview)
          rec.preview = null

  uploadFinished: (record, options) ->
    console.log('finished', record)

  updateFile: (record, e) ->
    console.log('update progress', record, e)


module.exports = Files
