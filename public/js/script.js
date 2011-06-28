
//Creating socket.io instance
var socket = new io.Socket(); 
socket.connect();

//an action has happened, send it to the server
function sendAction(action, data)
{
	console.log('--> ' + action, data);

	var message = { 
		action: action,
		data: data
	}

	socket.send ( message );
}


socket.on('connect', function(){ 
	console.log('successful socket.io connect');

	//let the path be the room name
	var path = location.pathname.substr(1);

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
	var message = m; 
	var action = message.action;
	var data = message.data;

	console.log('<-- ' + action, m);

	switch (action)
	{
		case 'roomAccept':
			//okay we're accepted, then request initialization
			sendAction('initializeMe', null);
			break;
			
		case 'initFiles':
			initFiles(data);
			break;

		case 'moveFile':
			$("#" + data.id).animate({
				left: data.position.left+"px",
				top: data.position.top+"px" 
			}, 500);
			break;

		case 'initialUsers':
			console.log('active users', data);
			initialUsers(data);
			break;

		case 'join-announce':
			console.log('new User entered Desktop', data);
			joinRoom(data);
			break;

		case 'leave-announce':
			console.log('User left desk', data);
			leaveRoom(data);
			break;

		case 'newFile':
			console.log('newFile', data);
			drawUploadingFile(data.filesgroupid, data.name, data.x, data.y, data.format);
			break;

		case 'createFile':
			console.log('createFile', data);
			setUploadedFile(data.filesgroupid, data.file._id, data.file.name, data.file.format);
			break;

		case 'renameFile':
			$("#" + data.id).find('h3').text(data.value);
			break;

		case 'deleteFile':
			console.log('deleteFile', data);
			$("#" + data.id).remove();
			break;

		case 'progress':
			showProcess(data.filesgroupid, data.bytesReceived, data.bytesExpected);
			break;

		default:
			//unknown message
			console.log('unknows message', action, data);
			break;
	}


} 


// ###Just Drawing a new file
function drawNewFile(id, name, x, y, format) {

	var fileID = id;
	var formatValue = format.substr(0,format.indexOf('/'));
	var formatClass = '';

	console.log(format);

	switch(formatValue) {

		case 'video': 
									formatClass = 'video';
									break;
		case 'image':
									formatClass = 'picture';
									break;
		case 'text':
									formatClass = 'text';
									break;
		case 'audio':
									formatClass = 'audio';
									break;
		case 'application':
									if(format.substr(format.indexOf('/')+1) == 'pdf') {
										formatClass = 'pdf';
										break;
									}
		default: 			formatClass = 'unknown';
									break;
	}


	var fileHTML = '<div id="' + fileID + '" class="file draggable">\
										<div class="operations">\
											<a href="http://' + location.host + '/download' + location.pathname + '/' + fileID + '" class="download">download</a>\
											<a href="#" class="delete">delete</a>\
										</div>\
										<div class="format">\
											<div class="image ' + formatClass + '"></div>\
										</div>\
										<h3 class="title">' + name + '</h3>\
									</div>';

	var $file = $(fileHTML);

	$file.appendTo('#wrapper');

	$file.draggable();

	
	$file.css('display', 'none').css('top', y).css('left', x);
	$file.fadeIn(Math.floor(Math.random() * 3000));



	//After a drag:
	$file.bind( "dragstop", function(event, ui) {
		console.log('dragstop', this);
		var data = {
			id: fileID,
			position: ui.position,
			oldposition: ui.originalPosition,
		};
		sendAction('moveFile', data);
	});

	//when user press delete button
	$file.find('.delete').click(	function(){

		var answer = confirm("Wollen sie wirklich diese Datei löschen?")
		if (answer){
			$file.remove();
			//notify server of delete
			sendAction( 'deleteFile' , { 'id': fileID });	
		}
		
	});
	
	//rename files
	$file.find('h3').editable( onFileChange,
		{
			style   : 'inherit',
			cssclass   : 'file-edit-form',
			type      : 'text',
			onblur: 'submit',
			event: 'dblclick'						
		}
	);

	function onFileChange( text, result ) {

		var input = $('form.' + result.cssclass).find('input');
		var original = input.val();
		var newtext = text;
		$('form.file-edit-form').remove();
		sendAction('renameFile', { id: fileID, value: text });
		return(newtext);
	}	

}

// ###Show uploading file
function drawUploadingFile(filesgroupid, name, x, y, format, isOrigin) {
	
	if(isOrigin == undefined) isOrigin = '';

	var FileGroupId = filesgroupid;


	var formatValue = format.substr(0,format.indexOf('/'));
	var formatClass = '';

	switch(formatValue) {

		case 'video': 
									formatClass = 'video';
									break;
		case 'image':
									formatClass = 'picture';
									break;
		case 'text':
									formatClass = 'text';
									break;
		case 'audio':
									formatClass = 'audio';
									break;
		case 'application':
									if(format.substr(format.indexOf('/')+1) == 'pdf') {
										formatClass = 'pdf';
										break;
									}
		default: 			formatClass = 'unknown';
									break;
	}

	var fileHTML = '<div class="file draggable ' + filesgroupid + ' ' + isOrigin + '">\
										<div class="operations">\
										</div>\
										<div class="format">\
											<div class="image ' + formatClass + '"></div>\
											<div class="progress">\
												<div class="progressBack"></div>\
												<div class="progressPercent">\
													<div class="progressCenter">\
														<span></span>\
													</div>\
												</div>\
											</div>\
										</div>\
										<h3 class="title">'+name+'</h3>\
									</div>';


	var $file = $(fileHTML);

	$file.css('top', y).css('left', x);

	$file.appendTo('#wrapper');

}

// ###Set file when upload has completed
function setUploadedFile(filesgroupid, id, name, format) {
	
	var $file = $('.'+filesgroupid);
	var fileID = id;

	var formatValue = format.substr(0,format.indexOf('/'));
	var formatClass = '';

	switch(formatValue) {

		case 'video': 
									formatClass = 'video';
									break;
		case 'image':
									formatClass = 'picture';
									break;
		case 'text':
									formatClass = 'text';
									break;
		case 'audio':
									formatClass = 'audio';
									break;
		case 'application':
									if(format.substr(format.indexOf('/')+1) == 'pdf') {
										formatClass = 'pdf';
										break;
									}
		default: 			formatClass = 'unknown';
									break;
	}

	var $fileFormat = $file.find('.image');
	if($fileFormat.hasClass('unknown')) {
		$fileFormat.removeClass('unknown');
		$fileFormat.addClass(formatClass);
	}

	if($file.hasClass("origin")) {
		var data = {
			id: fileID,
			position: {
				top: parseInt($file.css('top')),
				left: parseInt($file .css('left'))
			},
		};
		sendAction('moveFile', data);
	}

	$file.removeClass(filesgroupid);
	$file.attr('id', fileID);

	$file.find('h3').text(name);

	$file.find('.progress').fadeOut(function() {
		$(this).remove();	
	});

	var fileHTML = '<a href="http://' + location.host + '/download' + location.pathname + '/' + fileID + '" class="download">download</a><a href="#" class="delete">delete</a>';

	$file.find('div.operations').prepend(fileHTML);

	$file.draggable();


		//After a drag:
	$file.bind( "dragstop", function(event, ui) {
		console.log('dragstop', this);
		var data = {
			id: fileID,
			position: ui.position,
			oldposition: ui.originalPosition,
		};
		sendAction('moveFile', data);
	});

	//when user press delete button
	$file.find('.delete').click(	function(){

		var answer = confirm("Wollen sie wirklich diese Datei löschen?")
		if (answer){
			$file.remove();
			//notify server of delete
			sendAction( 'deleteFile' , { 'id': fileID });	
		}		
	});
	
	//rename files
	$file.find('h3').editable( onFileChange,
		{
			style   : 'inherit',
			cssclass   : 'file-edit-form',
			type      : 'text',
			onblur: 'submit',
			event: 'dblclick',			
		}
	);

	function onFileChange( text, result ) {

		var input = $('form.' + result.cssclass).find('input');
		var original = input.val();
		var newtext = text;
		$('form.file-edit-form').remove();
		sendAction('renameFile', { id: fileID, value: text });
		return(newtext);
	}	


}


// ###Show Process of files 
function showProcess(id, bytesReceived, bytesExpected) {
	
	var percent = ((bytesReceived/bytesExpected).toFixed(3));

	
	var newHeight = (((-percent*46) % 46) + 46) % 46;
	var newOpacity = ((-percent*100 % 100) + 100) % 100;

	if($('.'+id).length == 0) {
		drawUploadingFile(id, 'uploading...', 0, 0, 'unknown');	
	}

	$('.' + id + ' .progressPercent span').text(Math.round(100*percent));
	
	$('.' + id + ' .progressBack').css('height', newHeight);
	$('.' + id + ' .progressBack').css('opacity', newOpacity/100);


}

// ##Join/leave desktop
var sids_users = new Array();
function initialUsers(users) {

	for (user in users) {
		$('#activeUser').append('<li id="'+users[user].sid+'" style="background:'+getRandomColor()+';"></li>');
		sids_users.push(users[user].sid);
	}

	$('#activeUser').find('li').css('width', 100/users.length+'%');
}

function joinRoom(user) {
	$('#activeUser').append('<li id="'+user.sid+'" style="background:'+getRandomColor()+';"></li>');
	sids_users.push(user.sid);
	$('#activeUser').find('li').css('width', 100/sids_users.length+'%');
}

function leaveRoom(user) {
	$('#activeUser').find('#'+user.sid).remove();
	var i=0;
	for (i=0;i<=sids_users.length;i++){
		if(user.sid == sids_users[i]) {
			sids_users.splice(i,1);
		}
	}
	$('#activeUser').find('li').css('width', 100/sids_users.length+'%');
}

function getRandomColor() {
	var letters = '0123456789ABCDEF'.split('');
	var color = '#';
	for (var i = 0; i < 6; i++ ) {
			color += letters[Math.round(Math.random() * 15)];
	}
	return color;
}


// ###first time init files
function initFiles( fileArray ) {

	if(fileArray == 0) {
		$('#uploadIcon').fadeIn();
	}
	else {
		$('#dragArea').addClass('hasBackground');
	}
	for (i in fileArray) {
		file = fileArray[i];
		drawNewFile(file._id, file.name, file.x, file.y, file.format);
	}
}

// ##Init Drag&Drop 

function initDnD() {

	var dropbox = document.getElementById("wrapper");

	// init event handlers
	dropbox.addEventListener("dragenter", dragEnter, false);
	dropbox.addEventListener("dragexit", dragExit, false);
	dropbox.addEventListener("dragover", dragOver, false);
	dropbox.addEventListener("drop", drop, false);
}

function dragEnter(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	//sign an drag	
}

function dragExit(evt) {
	evt.stopPropagation();
	evt.preventDefault();
}

function dragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
}

function drop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	// Get the dropped files.
	var files = evt.dataTransfer.files;
	
	// If anything is wrong with the dropped files, exit.
	if(typeof files == "undefined" || files.length == 0)
		return;

	//Start Upload
	uploader.startUpload(files);
	
}

function initBrowserWarning() {
	var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
	
	if(!isChrome && !isFirefox)
		console.log('no browser support for drag&drop upload');
}


//Gloabl variables
uploader = null;

// ##jQuery DOM Ready   
$(function() {
	
	// Upload script html5Uploader jQuery Plugin

	// Detector demo
	if (!$.fileUploadSupported) {
		$(document.body).addClass('not_supported');
		$('#detector').text('This browser is NOT supported.');
	} else {
		$('#detector').text('This browser is supported.');
	}

	// Enable plug-in
	$('#wrapper').fileUpload( {
		url: '/upload' + location.pathname + '/',
		type: 'POST',
		dataType: 'json',
		complete: function () {
			$(document.body).removeClass('uploading');
		},
		success: function (result, status, xhr) {
			if (!result) {
				window.alert('Server error.');
				return;
			}
			if (result.error !== 0) {
				window.alert(result.error);
				return;
			}
			window.alert('Success! You have sent a file named \'' + result.name + '\' with MIME type \'' + result.type + '\'.');
		}
	});
	
	
});
