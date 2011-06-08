
///////////////////////////////////////////
//            SOCKET.IO STUFF            //
///////////////////////////////////////////
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
	var message = m; //JSON.parse(m);
	var action = message.action;
	var data = message.data;

	console.log('<-- ' + action, m);

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
			initFiles(data);
			break;

		case 'moveFile':
			$("#" + data.id).animate({
				left: data.position.left+"px",
				top: data.position.top+"px" 
			}, 500);
			break;

		case 'join-announce':
			console.log('new User entered Desktop', data);
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


//----------------------------------
// Just Drawing a new file
//----------------------------------
function drawNewFile(id, name, x, y, format) {

	var fileID = id;

	if(name.length > 14) {
		name = name.substr(0, 14) + '..';
	} 

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
			$file.remove();
			//notify server of delete
			sendAction( 'deleteFile' , { 'id': fileID });
		}
	);
	
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
		if(original.length > 14) {
			newtext = text.substr(0, 14) + '..';
		} else {
			newtext = original;
		}
		$('form.file-edit-form').remove();
		sendAction('renameFile', { id: fileID, value: text });
		return(newtext);
	}	

}

//----------------------------------
// Show uploading file
//----------------------------------
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
											<div class="progress"></div>\
										</div>\
										<h3 class="title">'+name+'</h3>\
									</div>';


	var $file = $(fileHTML);

	$file.css('top', y).css('left', x);

	$file.appendTo('#wrapper');

}

//----------------------------------
// Set file when upload has completed
//----------------------------------
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

	if(name.length > 14) {
		name = name.substr(0, 14) + '..';
	} 

	$file.find('h3').text(name);

	var fileHTML = '<a href="http://' + location.host + '/download' + location.pathname + '/' + fileID + '" class="download">download</a><a href="#" class="delete">delete</a>';

	$file.find('div.operations').prepend(fileHTML);

	$file.draggable();

	//when user press delete button
	$file.find('.delete').click(	function(){
			$file.remove();
			//notify server of delete
			sendAction( 'deleteFile' , { 'id': fileID });
		}
	);
	
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
		if(original.length > 14) {
			newtext = text.substr(0, 14) + '..';
		} else {
			newtext = original;
		}
		$('form.file-edit-form').remove();
		sendAction('renameFile', { id: fileID, value: text });
		return(newtext);
	}	


}


//----------------------------------
// Show Process of files 
//----------------------------------
function showProcess(id, bytesReceived, bytesExpected) {
	
	var percent = ((bytesReceived/bytesExpected).toFixed(3));

	
	var newHeight = (((-percent*46) % 46) + 46) % 46;
	var newOpacity = ((-percent*100 % 100) + 100) % 100;

	if($('.'+id).length == 0) {
		drawUploadingFile(id, 'uploading...', 0, 0, 'unknown');	
	}
	
	$('.' + id + ' .progress').css('height', newHeight);
	$('.' + id + ' .progress').css('opacity', newOpacity/100);


}

//----------------------------------
// first time init files
//----------------------------------
function initFiles( fileArray ) {
	for (i in fileArray) {
		file = fileArray[i];
		drawNewFile(file._id, file.name, file.x, file.y, file.format);
	}
}

///////////////////////////////////////////
//            Drag&Drop STUFF            //
///////////////////////////////////////////

//----------------------------------
// Uploader 
//----------------------------------

/**
* @param Event Object from FileReader on onloaded
*/
var Uploader = function() {
	
};

Uploader.prototype = {

		/**
     * Array of all files
		 * * */
		elements: [],

		 /**
     * Fills the elements array with the files data
		 * * */
    startUpload: function(files) {

				this.elements = [];

			//count how many files FileReader has passed
			var readFiles = 0;
			
			// Process each of the dropped files individually
			for(var i = 0, length = files.length; i < length; i++) {
				
				var reader = new FileReader(),
						file = files[i],
						self = this;

				// Handle errors that might occur while reading the file (before upload).
				reader.onerror = function(evt) {
					var message;
					// REF: http://www.w3.org/TR/FileAPI/#ErrorDescriptions
					switch(evt.target.error.code) {
						case 1:
							message = file.name + " not found.";
							break;
						case 2:
							message = file.name + " has changed on disk, please re-try.";
							break;
						case 3:
							messsage = "Upload cancelled.";
							break;
						case 4:
							message = "Cannot read " + file.name + ".";
							break;
						case 5:
							message = "File too large for browser to upload.";
							break;
					}
					console.log(message);	
				}

				// When the file is done loading, POST to the server.
				reader.onloadend = function(evt){

					var data = evt.target.result;
					
					self.elements.push({name:file.name, size:file.size, type:file.type, data: data});
						
					
					if(data.length > 128){
						var base64StartIndex = data.indexOf(',') + 1;
						if(base64StartIndex < data.length) {
							self.elements.push({name:file.name, size:file.size, type:file.type, data: data.substring(base64StartIndex) });
						}
					} 

					//If all Files are read start sending them
					if (++readFiles == files.length) {
       	 		self.send();
     			}
					
				}

				// init the reader event handlers
				//reader.onprogress = handleReaderProgress;
				//reader.onloadend = handleReaderLoadEnd;

				// begin the read operation
				reader.readAsDataURL(file);

			}

		},

    /**
     * @param Object HTTP headers to send to the server, the key is the
     * header name, the value is the header value
     */
    headers : {},

    /**
     * @return String A random string
     */
    generateBoundary: function() {
			return "-----------------------" + (new Date).getTime();	
		},

    /**
     * Constructs the message as discussed in the section about form
     * data transmission over HTTP
     *
     * @param Array elements
     * @param String boundary
     * @return String
     */
    buildMessage : function() {
			
			var CRLF = "\r\n";
   		var parts = [];
			var boundary = this.generateBoundary();				

			this.elements.forEach(function(element, index, all) {

				var part = "";
				
				var fieldName = 'upload';

				/*
				 * Content-Disposition header contains name of the field
				 * used to upload the file and also the name of the file as
				 * it was on the user's computer.
				 */
				part += 'Content-Disposition: form-data; ';
				part += 'name="' + fieldName + '"; ';
				part += 'filename="'+ element.name + '"' + CRLF;
				
				/*
				 * Content-Type header contains the mime-type of the file
				 * to send. Although we could build a map of mime-types
				 * that match certain file extensions, we'll take the easy
				 * approach and send a general binary header:
				 * application/octet-stream
				 */
				part += "Content-Type: " + element.type;
				part += CRLF + CRLF; // marks end of the headers part
				
				/*
				* Field value
				*/
				part += element.data + CRLF;

				parts.push(part);
				
			});

			var request = "--" + boundary + CRLF;
      request+= parts.join("--" + boundary + CRLF);
      request+= "--" + boundary + "--" + CRLF;

    	return request;
    				
		},

    /**
     * @return null
     */
    send : function() {
			
			var boundary = this.generateBoundary(),
					contentType = "multipart/form-data; boundary=" + boundary,
					uniqueID = Math.round(Math.random()*99999999);
			
			$.ajax({
				type: 'POST',
				url: '/upload' + location.pathname + '/' + uniqueID,
				data: this.buildMessage(), // Just send the Base64 content in POST body
				processData: false,
				timeout: 60000, // 1 min timeout
				dataType: 'text', // Pure Base64 char data
				contentType: null,
				contentType: contentType,
				beforeSend: function onBeforeSend(xhr, settings) {
					// Put the important file data in headers
						xhr.setRequestHeader('Content-Type', contentType);

						xhr.send = xhr.sendAsBinary;
					
					// Update status
					console.log('Uploading and Processing  + file.name + ...');
				},
				error: function (xhr,err) {

					console.log("readyState: "+xhr.readyState+"\nstatus: "+xhr.status);
   			  console.log("responseText: "+xhr.responseText);
									},
				success: function onUploadComplete(response) {
					//response = $.parseJSON(response);

					console.log(response);
						
					// If the parse operation failed (for whatever reason) bail
					if(!response || typeof response == "undefined") {
						// Error, update the status with a reason as well.
						console.log('The server was unable to process the upload.');
						return;
					}						
				}
			}); 

		}
};

//----------------------------------
// Init Drag&Drop 
//----------------------------------

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

///////////////////////////////////////////
//           jQuery DOM Ready            //
///////////////////////////////////////////
$(function() {
	
	/*
	uploader = new Uploader();

	//Init Drag&Drop Upload
	initBrowserWarning();
	initDnD();
	*/

	//----------------------------------
	// Upload script html5Uploader jQuery Plugin
	//----------------------------------

	// Detector demo
	if (!$.fileUploadSupported) {
		$(document.body).addClass('not_supported');
		$('#detector').text('This browser is NOT supported.');
	} else {
		$('#detector').text('This browser is supported.');
	}


	var uniqueID = Math.round(Math.random()*99999999);
	// Enable plug-in
	$('#wrapper').fileUpload( {
		url: '/upload' + location.pathname + '/' + uniqueID,
		type: 'POST',
		dataType: 'json',
		beforeSend: function () {

			$(document.body).addClass('uploading');

			var data = {
				filesgroupid: uniqueID,
				name: 'uploading',
				x: $.mouseXposition-20-50,
				y: $.mouseYposition-20-30,
				format: $.myFileType
			};
			sendAction('newFile', data);
			drawUploadingFile(uniqueID, 'uploading...', $.mouseXposition-20-50, $.mouseYposition-20-30, $.myFileType
, 'origin');

		},
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
