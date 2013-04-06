Spine ?= require('spine')
$ = Spine.$

Uploader =
  getURL: (object) ->
    object and object.url?() or object.url

  enabled: true
  pending: false
  requests: []

  disable: (callback) ->
    @enabled = false
    do callback
    @enabled = true

  requestNext: ->
    next = @requests.shift()
    if next
      @request(next)
    else
      @pending = false

  request: (callback) ->
    (do callback).complete(=> do @requestNext)
      
  queue: (callback) ->
    return unless @enabled
    if @pending
      @requests.push(callback)
    else
      @pending = true
      @request(callback)
    callback

class Base
  defaults:
    contentType: false 
    headers: {'X-Requested-With': 'XMLHttpRequest'}
    processData: false
  
  ajax: (params, defaults) ->
    xhr = @createXHR()
    ajaxSettings = $.extend({}, @defaults, xhr: xhr , defaults, params) 
    $.ajax(ajaxSettings)

  createXHR: =>
    xhr = $.ajaxSettings.xhr()
    if xhr.upload
      xhr.upload.addEventListener('progress',@uploadProgress , false)
      #xhr.upload.addEventListener('load', @uploadLoad, false)
    -> return xhr
    
  queue: (callback) ->
    Uploader.queue(callback)

class Singleton extends Base
  constructor:(@record) ->
    @model = @record.constructor

  create: (params, options) ->

    #Note: The file system has been prefixed:
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder

    if window.FormData
      formdata = new FormData()

    if window.requestFileSystem and @record.type.match('image.*')
    	window.requestFileSystem(window.TEMPORARY, 1024*1024, (fs) =>
    	  fs.root.getFile(@record.file.name, {create: true}, (fileEntry) =>
    	    fileEntry.createWriter((fileWriter) =>
    	    
            builder = new BlobBuilder()
            builder.append(@record.file)
            blob = builder.getBlob()
            
            fileWriter.onwriteend = =>
              @record.preview = fileEntry.toURL()
              @record.trigger 'previewReady'
              
            fileWriter.write(blob);

    	    , @errorHandler)
    	  , @errorHandler)
      , @errorHandler)

    if formdata
      formdata.append('desk_id', @record.desk_id)
      formdata.append(@record.name, @record.file)

      @ajax(
        params,
        type: 'POST'
        url: Uploader.getURL(@model)
        data: formdata
      ).success(@recordUploadResponse(options))
       .error(@errorUploadResponse(options))

  uploadProgress: (e) =>
    @record.trigger 'uploadProcess', e

  errorHandler: (e) -> 
    switch e.code
      when FileError.QUOTA_EXCEEDED_ERR then msg = 'QUOTA_EXCEEDED_ERR'
      when FileError.NOT_FOUND_ERR then msg = 'NOT_FOUND_ERR'
      when FileError.SECURITY_ERR then msg = 'SECURITY_ERR'
      when FileError.INVALID_MODIFICATION_ERR then msg = 'INVALID_MODIFICATION_ERR'
      when FileError.INVALID_STATE_ERR then msg = 'INVALID_STATE_ERR'
      else msg = 'Unknown Error'

    console.log('Error: ' + msg)


  # Private

  recordUploadResponse: (options = {}) =>
    (data, status, xhr) =>
      if Spine.isBlank(data)
        data = false
      else
      	data = @model.fromJSON(data)
    
      Spine.Ajax.disable =>
        if data
          # ID change, need to do some shifting
          if data.id and @record.id isnt data.id
            @record.changeID(data.id)

          # Update with latest data
          @record.updateAttributes(data.attributes())
        
      @record.trigger('uploadSuccess', data, status, xhr)
      options.success?.apply(@record)
      
  errorUploadResponse: (options = {}) =>
    (xhr, statusText, error) =>
      @record.trigger('uploadError', xhr, statusText, error)
      options.error?.apply(@record)


Include =
  upload: -> new Singleton(this)

Spine.Model.Uploader =
  extended: ->
    @bind 'create', @uploadCreate
    @include Include

  uploadCreate: (record, options = {}) ->
    record.upload().create(options.upload, options)

# Globals
Spine.Upload = Uploader
module?.exports = Uploader
