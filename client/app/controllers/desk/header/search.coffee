Spine = require('spine')

class Search extends Spine.Controller

  className: 'search-bar-over'
  
  elements:
    '.find-tag-fake': 'info'
    '.tag-input-list': 'tagList'
    '.tag-input-field': 'tagInput'
    '.tag-field': 'tagItem'
    'input': 'search'
    '.search-icon': 'button'

  events:
    'click': 'hideInfo' 
    'focus input': 'focus' 
    'blur input': 'blur' 
    'keyup input': 'searchInput' 
    'click .tag-field': 'deleteTag'
    
  constructor: ->
    super

    # vars
    @newSearchTag = ''

    @html require('views/desk/search')

  searchInput: (evt) =>
    code = evt.keyCode or evt.which
    @newSearchTag = @search.val()
    
    if code == 8 and @newSearchTag == ''
    	if @tagList.find('li.select-for-delete').remove().length == 0
        @tagList.find('li.tag-field:last').addClass('select-for-delete')

      sumWidth = 0
      for tagField in @tagList.find('li.tag-field')
        sumWidth += $(tagField).outerWidth()
      if sumWidth < 420
        @button.fadeIn()

    if code == 13 and @newSearchTag != ''
    	tagView = require('views/desk/searchTag')(tagname: @newSearchTag)
    	tagView.hide()
    	@tagInput.before tagView
    	@search.val('')
    	@newSearchTag = ''
    	sumWidth = 0
    	for tagField in @tagList.find('li.tag-field')
    		sumWidth += $(tagField).outerWidth()
    	if sumWidth >= 420
        @button.fadeOut()
    	tagView.fadeIn()

    @newSearch()

  deleteTag: (evt) ->
    $(evt.target).remove()

    sumWidth = 0
    for tagField in @tagList.find('li.tag-field')
      sumWidth += $(tagField).outerWidth()
    if sumWidth < 420
      @button.fadeIn()

    @newSearch()

  newSearch: ->
    tagList = []
    for tag in @tagList.find('li.tag-field')
      tagList.push($(tag).text()) 
    tagList.push(@newSearchTag)
    @trigger 'search', tagList
        	
  focus: =>
    @info.hide()

  blur: =>
    @info.show() unless @el.find('.tag-field').length > 0

  hideInfo: =>
    @search.trigger 'focus'

module.exports = Search 
