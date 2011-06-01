
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
			drawUploadingFile(data.filesgroupid, data.name, data.x, data.y);
			break;

		case 'createFile':
			console.log('createFile', data);
			//File ist fertig geuploaded 
			break;

		case 'renameFile':
			console.log('renameFile', data);
			$("#" + data.id).find('h1').text(data.value);
			break;

		case 'deleteFile':
			console.log('deleteFile', data);
			$("#" + data.id).remove();
			break;

		case 'process':
			console.log('process', data);
			showProcess(data.filesgroupid, data.bytesReceived, data.bytesExpected);
			break;

		default:
			//unknown message
			console.log('unknows message', data);
			break;
	}


} 


//----------------------------------
// Just Drawing a new file
//----------------------------------
function drawNewFile(id, name, x, y) {

	var fileID = id;

	var fileHTML = '<div id="' + fileID + '" class="file draggable">\
									<h1>' + name + '</h1>\
									<div class="operations">\
										<a class="download-file" href="http://' + location.host + '/download' + location.pathname + '/' + fileID + '">download</a>\
										<a href="#" class="delete-file">delete</a>\
									</div>\
									</div>',
		$file = $(fileHTML);

	$file.appendTo('#wrapper');

	$file.draggable();

	$file.animate({left:x, top:y}, Math.floor(Math.random() * 1000));


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
	$file.find('.delete-file').click(	function(){
			$file.remove();
			//notify server of delete
			sendAction( 'deleteFile' , { 'id': fileID });
		}
	);
	
	//rename files
	$file.find('h1').editable( onFileChange,
		{
			style   : 'inherit',
			cssclass   : 'file-edit-form',
			type      : 'textarea',
			onblur: 'submit',
			event: 'dblclick',			
		}
	);

	function onFileChange( text, result ) {
		
		$('form.file-edit-form').remove();

		console.log('rename file', text, result);
		sendAction('renameFile', { id: fileID, value: text });
		return(text);
	}	

}

//----------------------------------
// Sho uploading file
//----------------------------------
function drawUploadingFile(filesgroupid, name, x, y) {
	
	console.log('drawUploadingFile');

	var FileGroupId = filesgroupid;

	var fileHTML = '<div class="file draggable ' + fileID + '">\
									<h1>' + name + '</h1>\
									</div>',
		$file = $(fileHTML);

	$file.css('top', y).css('left', x);

	$file.appendTo('#wrapper');

	$file.draggable();

}

//----------------------------------
// Show Process of files 
//----------------------------------
function showProcess(id, bytesReceived, bytesExpected) {
	console.log(id, bytesReceived, bytesExpected);
}

//----------------------------------
// first time init files
//----------------------------------
function initFiles( fileArray ) {
	for (i in fileArray) {
		file = fileArray[i];
		drawNewFile(file._id, file.name, file.x, file.y);
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

	// Detector demo
	if (!$.imageUploadSupported) {
		$(document.body).addClass('not_supported');
		$('#image-detector').text('This browser DOES NOT supports image resizing and uploading.');
	} else {
		$('#image-detector').text('This browser supports image resizing and uploading.');
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
				x: $.mouseXposition,
				y: $.mouseYposition	
			};
			sendAction('newFile', data);

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
