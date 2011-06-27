// Socket.io routing   
// -------------
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
			leaveRoom(client);
		});

	});
	
	
	// Handlers
	//--------------
	
	//Creates room and send files and users to Client
	function initClient (client) {

		getRoom(client, function(room) {	
			//Send client all the files from the room
			model.getAllFiles(room, function(err, files) {
				client.send({ action: 'initFiles', data: files});
			});

			roommates_clients = rooms.room_clients(room);
			roommates = [];

			var j = 0;
			for (i in roommates_clients)
			{
				if (roommates_clients[i].sessionId != client.sessionId)
				{
					roommates[j] = {
						sid: roommates_clients[i].sessionId,
					};
					j++;
				}
			}

			console.log('initialusers: ' + roommates);
			client.send(
				{
					action: 'initialUsers',
					data: roommates
				}
			)
			
		});
	}

	//Adds client to a room and sends an annoucement to other clients
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
	
	//Removes client from a room and sends an annoucement to other clients
	function leaveRoom (client) {
		console.log (client.sessionId + ' just left');
		var msg = {};
		msg.action = 'leave-announce';
		msg.data	= { sid: client.sessionId };
		rooms.remove_from_all_rooms_and_announce(client, msg);

	}
	

	//Saves new destination of file
	function moveFile(client, msg) {
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
		//report to all other clients
		broadcastToRoom( client, messageOut );

		model.setFilePosition(null, msg.data.id, msg.data.position.left, msg.data.position.top, function(error, file) {
			console.log("setFilePosition error:", error);	
		});
	}

	//Creates new file and reposts to other clients
	function newFile (client, data) {
		var msg = {
			action: 'newFile',
			data: data
		}
		broadcastToRoom(client, msg);

	}

	//Renames file and reports to other clients
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

	//Delets Ffile and report
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
			//delete file on storage
			fs.unlink(file.location, function(error, test) {
			});
		});
	}

	//Returns the room the client is in.
	function getRoom( client , callback ) {
		room = rooms.get_room( client );
		//console.log( 'client: ' + client.sessionId + " is in " + room);
		callback(room);
	}

	//Broadcasts a message to other clients than the given one
	function broadcastToRoom ( client, message ) {
		rooms.broadcast_to_roommates(client, message);
	}
	
}

