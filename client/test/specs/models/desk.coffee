describe 'Desk', ->
  Desk = null
  
  beforeEach ->
    class Desk extends Spine.Model
      @configure 'Desk'
  
  it 'can noop', ->
    