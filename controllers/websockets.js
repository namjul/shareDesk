
///////////////////////////////////////////
//           socket.io routing           //
///////////////////////////////////////////

var io = require('socket.io'),
	util = require('util'),
	fs = require('fs');

	
module.exports = function(app) {

	var socket = io.listen(app),
		model = app.model,
		rooms	= app.rooms;
		

	socket.on('connection', function(client) {
		// new client is here!
		client.on('message', function( message ) { 

			console.log("action: " + message.action + " -- data: " + util.inspect(message.data) );

			if (!message.action) {
				return;
			}

			switch (message.action) {
				case 'initializeMe':
					initClient(client);
					break;

				case 'joinRoom':
					joinRoom(client, message.data, function(clients) {
						client.send( { action: 'roomAccept', data: '' } );
					});
					break;

				case 'moveFile':
					
					moveFile(client, message);
					break;

				case 'newFile':
					newFile(client, message.data);
					break;

				case 'renameFile':
					renameFile(client, message.data.id, message.data.value);
					break;

				case 'deleteFile':
					deleteFile(client, message.data.id);
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
		var msg = {
			action : 'join-announce',
			data : { sid: client.sessionId, user_name: client.user_name }
		}

		rooms.add_to_room_and_announce(client, room, msg);

		//create desk upload folder
		var dir = app.uploadFolder + '/' + room;
		fs.stat(dir, function(error, stats) {
			if(typeof stats=='undefined' || !stats.isDirectory()) {
				fs.mkdir(dir, 448, function(error) {
					if (error) throw new Error('could not create ' + app.uploadFolder + ' folder');
				});
			}
		});

		successFunction();
	}


	function moveFile(client, msg) {
		//report to all other browsers
		var messageOut = {
			action: msg.action,
			data: {
				id: msg.data.id,
				position: {
					left: msg.data.position.left,
					top: msg.data.position.top
				}
			}
		};

		broadcastToRoom( client, messageOut );

		model.setFilePosition(null, msg.data.id, msg.data.position.left, msg.data.position.top, function(error, file) {
			console.log("setFilePosition error:", error);	
		});
	}


	function newFile (client, data) {
		var msg = {
			action: 'newFile',
			data: data
		}
		broadcastToRoom(client, msg);

	}


	function renameFile (client, fileId, newName) {
		model.renameFile(fileId, newName, function(error, file) {
			var msg = {};
			msg.action = 'renameFile';
			msg.data = { id: fileId, value: newName };
			broadcastToRoom(client, msg);
			//broadcast?
			//console.log(error);
		});
	}


	function deleteFile (client, fileId) {
		model.getFile(fileId, function(error, file) {
			if(error) {
				console.log(error);
			}
			else {
				model.deleteFile(fileId, function(error, file) {
					if(error) {
						console.log(error);
					}
					else {
						var msg = {
							action : 'deleteFile',
							data : { id: fileId }
						};
						broadcastToRoom(client, msg);
					}
				});
			}
			fs.unlink(file.location, function(error, test) {
				//console.log(error, test);
			});
		});
	}

	
	function getRoom( client , callback ) {
		room = rooms.get_room( client );
		//console.log( 'client: ' + client.sessionId + " is in " + room);
		callback(room);
	}


	function broadcastToRoom ( client, message ) {
		rooms.broadcast_to_roommates(client, message);
	}
	
}

