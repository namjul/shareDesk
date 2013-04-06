Spine = require('spine')
$ = Spine.$

class Dropper extends Spine.Module

  @extend Spine.Events
  @extend Spine.Log

  @el: $('body')

  @init: ->

    # Set elements
    dropperEl = document.createElement 'div'
    dropperEl.setAttribute 'id', 'dropper'
    @el.prepend dropperEl
    @dropper = @el.find('#dropper')

    # Set Event handlers
    @el.bind 'dragenter', @dragEnterHandler
    @dropper.bind 'dragover', @dragOverHandler
    @dropper.bind 'dragleave', @dragLeaveHandler
    @dropper.bind 'drop', @dropHandler

  @dragEnterHandler: (evt) =>
    if evt.target.id != 'dropper'
      @trigger 'dragEnter'
      @dropper.css('z-index', 99)

  @dragLeaveHandler: (evt) =>
    @dropper.css('z-index', 0)
    @trigger 'dragLeave'

  @dragOverHandler: (evt)=>
    evt.stopPropagation()
    evt.preventDefault()
    #jQuery events has the dataTransfer object inside originalEvent
    evt.originalEvent.dataTransfer.dropEffect = 'copy'

  @dropHandler: (evt)=>
    evt.stopPropagation()
    evt.preventDefault()
    @dropper.css('z-index', 0)
    @trigger 'drop', evt.originalEvent.dataTransfer.files

module.exports = Dropper
