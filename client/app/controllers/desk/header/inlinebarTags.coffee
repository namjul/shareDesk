Spine = require('spine')

class InlinebarTags extends Spine.Controller

  className: 'inline inline-tags'

  elements:
    '.inline-bar-content': 'content'

  constructor: ->
    super

  open: ->
    @el.css('height', 0)
    @html require('views/desk/inlinebar')
    tags = []
    for file in @desk.files().all()
    	for tag in file.tags().all()
        if @selectDistinctTags(tags, tag) then continue
        else tags.push(tag) 
    		
    @content.html(require('views/desk/alltags')(tags: tags))
    height = @el.find('.inline-bar').outerHeight(true)
    @el.animate(
      height: height
    , 200)

  close: ->
    @el.animate(
      height: 0 
      opacity: 0
    , 200, =>
      @release()
    )

  selectDistinctTags: (tags, tag) ->
    for t in tags
    	if tag.name == t.name then return true
   
    return false
module.exports = InlinebarTags
