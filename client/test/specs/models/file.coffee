describe 'File', ->
  File = null
  
  beforeEach ->
    class File extends Spine.Model
      @configure 'File'
  
  it 'can noop', ->
    