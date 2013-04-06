describe 'Tag', ->
  Tag = null
  
  beforeEach ->
    class Tag extends Spine.Model
      @configure 'Tag'
  
  it 'can noop', ->
    