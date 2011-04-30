
///////////////////////////////////////////
//           socket.io routing           //
///////////////////////////////////////////

var io = require('socket.io'),
	util = require('util'),
	rooms	= require('../logics/rooms.js');

module.exports = function(app) {

	var socket = io.listen(app),
		model = app.model;
		
	socket.on('connection', function(client) {
		
		// new client is here!

		client.on('message', function( message ) { 

			console.log("action: " + message.action + " -- data: " + util.inspect(message.data) );

			if (!message.action)	return;

			switch (message.action) {
				case 'initializeMe':
					initClient(client);
					break;

				case 'joinRoom':
					joinRoom(client, message.data, function(clients) {
						client.send( { action: 'roomAccept', data: '' } );
					});
					break;

				default:
					console.log('unknown action');
					break;
			}
		});

		client.on('disconnect', function() {
				//leaveRoom(client);
		});

	  //tell all others that someone has connected
	  //client.broadcast('someone has connected');
	});
	
	
	//--------------
	// Some Functions
	//--------------
	
	function initClient (client) {

		getRoom(client, function(room) {
			
			//Send client all the files from the room
			model.getAllFiles(room, function(err, files) {
				client.send({ action: 'initFiles', data: files});
			});

		});
	}
	
	function joinRoom (client, room, successFunction) {
		var msg = {};
		msg.action = 'join-announce';
		msg.data		= { sid: client.sessionId, user_name: client.user_name };

		rooms.add_to_room_and_announce(client, room, msg);
		successFunction();
	}
	
	function getRoom( client , callback ) {
		room = rooms.get_room( client );
		//console.log( 'client: ' + client.sessionId + " is in " + room);
		callback(room);
	}

}