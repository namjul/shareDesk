class Mediator 

  @channels = {}

  @subscribe: (channel, fn) ->
    if not @channels[channel] then @channels[channel] = []
    @channels[channel].push context: @, callback: fn
    @

  @publish: (channel) ->
    if not @channels[channel] then return false
    args = Array.prototype.slice.call(arguments, 1)
    for channel, i in @channels
    	subscription = @channels[channel][i]
    	subscription.callback.apply subscription.context, args
    @

module.exports = Mediator 
