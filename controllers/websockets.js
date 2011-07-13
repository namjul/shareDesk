// Socket.io routing   
// -------------

	
module.exports = function(app) {

	var util = require('util'),
		fs = require('fs'),
		model = app.model,
		io	= app.io;


	io.sockets.on('connection', function(socket) {

		//Invokes initialization
		socket.emit('newConnection');

		//JoinDesk
		//---------
		//Client joins his room and initialization begins
		socket.on('joinDesk', function(data) {

			var deskName = data.deskName;
			app.model.getDesk(deskName, function(error, desk) {
				if(error) console.log('Error');
				else {

					var isAuthorized = true;
					if(desk !== undefined && 'protection' in desk && 'identifier' in data) {
						if(data.identifier != desk.protection.identifier) {
							isAuthorized = false;
							socket.emit('notAllowed');
						} 
					} 

					//Access granted
					if(isAuthorized) {

						//save deskName in clients socket			
						socket.deskName = deskName;
						socket.userColor = getRandomColorObject();
						socket.username = 'anonym';

						//Join Desk
						socket.join(deskName);


						//Send client all the files from the room
						model.getAllFiles(deskName, function(err, filesasArray) {
							socket.emit('initFiles', filesasArray);
						});
						
						
						var currentUsersinDesk = new Array();
						var count = 0;
						for(i in io.sockets.clients(deskName)) {	

							var userSId = io.sockets.clients(deskName)[i].id; 
							var color = io.sockets.clients(deskName)[i].userColor;
							var username = io.sockets.clients(deskName)[i].username;

							count++;

							var user = {
								sid: userSId,
								color: color,
								username: username,
								me: false
							}

							
							currentUsersinDesk.push(user);

							if(userSId === socket.id) {
								socket.broadcast.to(deskName).emit('joinAnnouce', user);
								user.me = true;	
							}

							if(count == io.sockets.clients(deskName).length) {
								socket.emit('initUsers', currentUsersinDesk);
							}


						}

						model.getDesk(deskName, function(error, desk) {
							if(error) console.log('Error');
							else {
								if(desk !== undefined && desk.date !== undefined){
									socket.emit('deskCreationDate', desk.date);
								} 
							}
						});


						//create desk upload folder
						var dir = app.uploadFolder + '/' + deskName;
						fs.stat(dir, function(error, stats) {
							if(typeof stats=='undefined' || !stats.isDirectory()) {
								fs.mkdir(dir, 448, function(error) {
									if (error) throw new Error('could not create ' + app.uploadFolder + ' folder');
								});
							}
						});
					}
				}
			});			
		});


		//newFileAnnouce
		//---------
		//Client joins his room and initialization begins
		socket.on('newFileAnnouce', function(file) {		
			//Annouce to other clients
			socket.broadcast.to(socket.deskName).emit('newFileAnnouce', file);
		});


		//moveFile
		//---------
		//Save file's new position and annouce it
		socket.on('moveFile', function(file) {

			//Save position in database
			model.setFilePosition(null, file.id, file.position.x, file.position.y, function(error, _file) {
				if(error) console.log("setFilePosition error:", error);	
				else {
					//Annouce to other clients
					socket.broadcast.to(socket.deskName).emit('moveFileAnnouce', file);

				}
			});		

		});


		//renameFile
		//---------
		//Save file's new name and annouce it
		socket.on('renameFile', function(file) {

			//Save name in database
			model.renameFile(file.id, file.value, function(error, _file) {				
				if(error) console.log("setFileName error:", error);	
				else {
					//Annouce to other clients
					socket.broadcast.to(socket.deskName).emit('renameFileAnnouce', file);
				}
			});		
		});

		//deleteFile
		//---------
		//Delete file and annouce it
		socket.on('deleteFile', function(data) {
			
			//Annouce to other clients
				
			var fileId = data.fileId;
			app.model.getDesk(socket.deskName, function(error, desk) {
				if(error) console.log('Error');
				else {

					var isAuthorized = true;
					if(desk !== undefined && 'protection' in desk && 'identifier' in data) {
						if(data.identifier != desk.protection.identifier) {
							isAuthorized = false;	
						} 
					} 

					//Access granted
					if(isAuthorized) {

						model.getFile(fileId, function(error, _file) {
							if(error) console.log(error);
							else {
								model.deleteFile(fileId, function(error, __file) {
									if(error) console.log(error);
									else {

										//Annouce to other clients
										io.sockets.in(socket.deskName).emit('deleteFileAnnouce',fileId);

										//delete file on storage
										fs.unlink(_file.location, function(error, test) {
											if(error) console.log('error delete file from storage: ', error);
										});

									}
								});
							}
						});
					} else {
						
						socket.emit('notAllowed');
					}
				}
			});

		});


		//On Client Disconnect
		//---------
		//Removing client from desk an annouce to others
		socket.on('disconnect', function () {	

			//Annouce leave to other clients
			socket.broadcast.to(socket.deskName).emit('leaveAnnouce', socket.id);

			//leaves automatically the room

		});

		//New chat message
		//---------
		socket.on('newMessage', function(data) {
			if(data.toUsers.length === 0) {
				socket.broadcast.to(data.room).emit('newMessage',data);	
			} else {
				for(i in data.toUsers) {
					io.sockets.socket(data.toUsers[i].sid).emit('newMessage',data);
				}
			}
		});

		//Renames user
		//---------
		socket.on('renameUser', function(user) {
			io.sockets.socket(user.sid).username = user.username;	
			socket.broadcast.to(io.sockets.socket(user.sid).deskName).emit('renameUser',user);	
		});	

		// Password change
		//---------
		socket.on('setPassword', function(data) {
			io.sockets.in(data.room).emit('setPassword',data); 
		});
	});

	//Helper
	
	/* Creats a random Color
	 *  */
	function getRandomColorObject() {
		
		function randomXToY() {
			var minVal = 100;
				maxVal = 200;
			return  Math.round(minVal+(Math.random()*(maxVal-minVal)));
		}

		var colorObject = {
			r:randomXToY(),
			g:randomXToY(),
			b:randomXToY()
		}
		return colorObject;
	}

	function isEmpty(ob){
	   for(var i in ob){ return false;}
	  return true;
	}

	
}

