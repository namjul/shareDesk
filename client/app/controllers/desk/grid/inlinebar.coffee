Spine = require('spine')
FileItem = require('controllers/desk/grid/fileitem')
TagList = require('controllers/desk/grid/tagList')

class Inlinebar extends Spine.Controller

  className: 'inline real'

  elements:
    '.inline-bar-content': 'content'
    '.inline-bar-arrow': 'arrow'
    '.inline-bar-wrap': 'wrap'

  constructor: ->
    super
    @el.css('height', 0)
    @html require('views/desk/inlinebar')
    @render() 
    
    # change on browser resize
    $(window).bind 'resize', @resize

  render: ->
    @log @file
    @tagList.release() unless not @tagList
    @tagList = new TagList(file: @file.file)
    @content.append @tagList.el

  open: ->
    @el.animate(
      height: @height()
    , 100)

  close: ->
    @el.animate(
      height: 0 
      opacity: 0
    , 200, =>
      @release()
    )

  height: ->
    height = @el.find('.inline-bar').outerHeight(true)

  setTop: (top) ->
    @el.css('top', top)

  setArrow: (animate = true) ->
    left = @file.el.position().left + FileItem.width/2 - 12.5
    @arrow.css('left', left) unless animate
    if animate
    	@arrow.animate(
    	  left: left
    	, 500
    	)

  setWrapWidth: (width) ->
    @wrap.css('width', width)

  setFile: (file) ->
    @file = file

  resize: (evt) =>
    @el.css('height', @height())
    @fake?.el.css('height', @height())

  setFile: (file) ->
    @file = file
   
module.exports = Inlinebar
