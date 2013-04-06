Spine = require('spine')

class InlinebarFake extends Spine.Controller

  className: 'inline fake'

  elements:
    '.inline-bar-content': 'content'

  constructor: ->
    super
    @el.css('height', 0)

  open: (height) ->
    @el.animate(
      height: height
    , 200)

  close: ->
    @el.animate(
      height: 0 
      opacity: 0
    , 100, =>
      @release()
    )
   
module.exports = InlinebarFake
