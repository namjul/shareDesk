require('lib/setup')

Spine = require('spine')
File = require('models/file')
Dropper = require('modules/dropper')
Uploader = require('modules/uploader')
Starter = require('controllers/start/start')
Desk = require('controllers/desk/desks')
Settings = require('controllers/desk/settings')
$ = Spine.$

class App extends Spine.Controller

  className: 'wrapper'

  constructor: ->
    super

    # add to DOM
    @appendTo $('body') 

    @starter = new Starter()
    @desk = new Desk(starter: @starter) 
    @settings = new Settings(starter: @starter)

    # Start Dropper & Uploader Module
    Dropper.init()
    Uploader.init()

    Spine.Route.add('/', @initHome)
    Spine.Route.add('/:deskname', @initDesk)
    Spine.Route.add('/:deskname/sync', @dropboxSync)
    Spine.Route.setup(history: true)

  dropboxSync: (deskname) =>
    @log 'sync with dropbox'
    
  initHome: =>

    @starter.deactivate(); 
    @desk.deactivate(); 
    @settings.deactivate(); 

    Uploader.hadFirstUpload = false

    @append @desk    
    @append @settings
    @append @starter
    @starter.initAll()

    @


  initDesk: (deskname) =>

    @starter.deactivate(); 
    @desk.deactivate(); 
    @settings.deactivate(); 

    Uploader.hadFirstUpload = true

    @append @desk
    @desk.deskname = deskname.deskname
    @desk.initAll()
    @append @settings
    @settings.deskname = deskname.deskname
    @settings.initAll()

    @


module.exports = App
    
