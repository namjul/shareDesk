Spine = require('spine')

class Settings extends Spine.Controller

  tag: 'aside'

  className: 'settings'

  constructor: ->
    super

    # set deskname property
    @deskname = ''

    @el.css('width', '0')

    if @starter then @starter.bind 'finished', @initAll
    
  initAll: (deskname) =>

    if deskname then @deskname = deskname

    @html require('views/desk/settings')(deskname: @deskname)
    @el.animate(
      width: 35 
    , 
      100
    , ->
      $(this).css('width', '') 
    );
    
  deactivate: ->
    @el.css('width', '0')
    @html ''

module.exports = Settings 
