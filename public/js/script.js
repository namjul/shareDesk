

var socket = new io.Socket(); 
 socket.connect();

//an action has happened, send it to the
//server
function sendAction(action, data)
{
	console.log('--> ' + action);

	var message = { 
		action: action,
		data: data
	}

	socket.send ( message );
}




socket.on('connect', function(){ 
	console.log('successful socket.io connect');

	//let the path be the room name
	var path = location.pathname;

	//imediately join the room which will trigger the initializations
	sendAction('joinRoom', path);
});

socket.on('disconnect', function(){ 
	//alert("Server disconnected. Please reload page.");
});

socket.on('message', function(data){ 
	getMessage(data);
});

//respond to an action event
function getMessage( m )
{
	var message = m; //JSON.parse(m);
	var action = message.action;
	var data = message.data;

	//console.log('<-- ' + action);

	switch (action)
	{
		case 'roomAccept':
			//okay we're accepted, then request initialization
			//(this is a bit of unnessary back and forth but that's okay for now)
			sendAction('initializeMe', null);
			break;

		case 'roomDeny':
			//this doesn't happen yet
			break;
			
		case 'initFiles':
			console.log("got the files");
			console.log(data);
			break;

		default:
			//unknown message
			alert('unknown action: ' + JSON.stringify(message));
			break;
	}


}