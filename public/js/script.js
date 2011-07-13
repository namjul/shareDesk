// Define a cross-browser window.console.log method.
// For IE and FF without Firebug, fallback to using an alert.
if (!window.console) {
  var log = window.opera ? window.opera.postError : alert;
  window.console = { log: function(str) { log(str) } };
}


//Creating socket.io instance
var socket = io.connect();

socket.on('connect', function() {
	console.log('Connection established');	
});

socket.on('error', function (reason){
  console.error('Unable to connect Socket.IO', reason);
});

socket.on('disconnect', function(){ 
	console.log('Server disconnected');	 
});

socket.on('notAllowed', function(){ 
	console.log('notAllowed');	
	if($('#filesWrapper').length !== 0) {
		location.reload();   
	}
});

var timerForDeskTimeOut = false;


var other_users_objects = new Array();
var users_send_to = new Array();
var its_me_user = null;


//All other messages
socket.on('message', function(data){ 
	console.log('unknow message: ',data);
});

socket.on('newConnection', function(){ 
	//start Initialization by joining desk
	socket.emit('joinDesk', {deskName: location.pathname.split('/')[1], identifier: getCookie('identifier')});
});

//Setup all the files
socket.on('initFiles', function(files) {
	console.log('<--- initFiles',files);

	if($('#filesArea .file').length !== 0) {
		$('#filesArea .file').remove();
	}

	if(files.length < 1) {
		$('#filesWrapper').addClass('newDesktop');
	} 
	
	for (i in files) {
		file = files[i];
		drawFile(file);
	}	
});

//Setup all users
socket.on('initUsers', function(users) {
	console.log('<--- initUsers', users);

	other_users_objects = new Array();
	users_send_to = new Array();
	its_me_user = null;

	if($('#userBar li').length !== 0) {
		$('#userBar li').remove();
	}

	for (i in users) {
		addUser(users[i]);
	}
});

//Setup desk timeOut
socket.on('deskCreationDate', function(date) {
	console.log('<--- deskCreationDate', date);
	if(!timerForDeskTimeOut) {
		setTimer(date, true);
		timerForDeskTimeOut = true;
	}
});

//Annouce an leaving client
socket.on('joinAnnouce', function(user) {
	console.log('<--- joinAnnouce', user);
	addUser(user);
});

//Annouce an leaving client
socket.on('leaveAnnouce', function(userId) {
	console.log('<--- leaveAnnouce', userId);
	removeUser(userId);
});

var fileTempId_already_exists = new Array();
//Annouce a new file
socket.on('newFileAnnouce', function(file) {
	console.log('<--- newFileAnnouce', file);
	var existsAlready = false;
	for(i in fileTempId_already_exists) {
		if(fileTempId_already_exists[i] == file.tempFileId) {
			fileTempId_already_exists.splice(i,1);
			existsAlready = true;
		}
	}

	if(!existsAlready) {
		drawFile(file, true);		
	}
});

//Annouce new fileposition 
socket.on('moveFileAnnouce', function(file) {
	console.log('<--- moveFileAnnouce', file);
	if($("#" + file.id).parent().get(0) !== $('#uploadingFiles').get(0)) {

		$("#" + file.id).animate({
			left: file.position.x+"px",
			top: file.position.y+"px" 
		}, 500);
	} else {
		var top = $("#" + file.id).offset().top;
		var left = $("#" + file.id).offset().left;
		$("#" + file.id).css('top',top).css('left',left);

		var $el = $("#" + file.id).detach();
		$el.appendTo('#filesArea');

		if($('#uploadingFiles').children().length == 0){
			$('#uploadingFiles').animate({bottom:-145}, 300);
		}

		$("#" + file.id).animate({
			left: file.position.x+"px",
			top: file.position.y+"px" 
		}, 500);

	}
});

//Annouce new filename 
socket.on('renameFileAnnouce', function(file) {
	console.log('<--- renameFileAnnouce', file);
	$("#" + file.id).find('.title').text(file.value);
});

//Annouce file deletion 
socket.on('deleteFileAnnouce', function(fileId) {
	console.log('<--- deleteFileAnnouce', fileId);
	$("#" + fileId).fadeOut(function() {
		$(this).remove();

		//Add DnD Icon if filearea empty
		if($('.file').length === 0) {
			$('#filesWrapper').addClass('newDesktop');
			$('#dragBack').removeClass('newDesktop');
		}
	});	
});

//Annouce file deletion not allowed
socket.on('deleteFileNotAllowed', function(fileId) {
	console.log('<--- deleteFileNotAllowed', fileId);
	newMessage('You are not allowed to delete files', its_me_user);
});
//Fileupload finished and saved
socket.on('progressAnnouce', function(file) {
	console.log('<--- progressAnnouce', file);
	showProcess(file.tempFileId, file.bytesReceived, file.bytesExpected);
});

//Fileupload finished and saved
socket.on('fileSavedAnnouce', function(file) {
	console.log('<--- fileSavedAnnouce', file);

	if($('.'+file.tempFileId).length === 0) {
		var _file = file.file;
		_file.tempFileId = file.tempFileId;
		drawFile(_file);
		fileTempId_already_exists.push(file.tempFileId);
	} else {

		//remove filgroupid
		var $fileHtml = $('.'+file.tempFileId);
		$fileHtml.removeClass(file.tempFileId);
		console.log(file);
		setFileHandler($fileHtml, file.file);
	}
});

//Chat message
socket.on('newMessage', function(data) {
	console.log('<--- newMessage', data);
	newMessage(data.msg, data.fromUser);
});

//Rename user
socket.on('renameUser', function(user) {
	console.log('<--- renameUser', user);
	$('#'+user.sid+' div').text(user.username);
	for(i in other_users_objects) {
		if(other_users_objects[i].sid === user.sid) {
			other_users_objects[i].username = user.username;
			break;
		}
	}
});

//Password change
socket.on('setPassword', function(data) {
	console.log('<--- setPassword', data);
	newMessage(data.msg, data.fromUser);
	$('#secure span').attr('class', data.protection);
	$('#passwordProtection').remove();	

});

// Change file downloads-clicks
socket.on('addDownloadClick', function(data) {
	console.log('<--- addDownloadClick', data);
	$('#'+data._id).find('.clicksText').text('(' + data.downloads + ' clicks)');
	Cufon.refresh();
});

// Filupload got aborted 
socket.on('uploadAbortedAnnouce', function(tempFileId) {
	console.log('<--- uploadAbortedAnnouce', tempFileId);
	$('.'+tempFileId).remove();

	if($('#uploadingFiles').children().length == 0){
		$('#uploadingFiles').animate({bottom:-145}, 300);
	}
	
});


///////////////////////////////////////////

/* Draws a file into the desk
 * @params file object
 **/
function drawFile(file, isNew, isOrigin) {
	
	//Remove DnD Icon
	if($('#filesWrapper').hasClass('newDesktop')) {
		$('#filesWrapper').removeClass('newDesktop');
	}


	//Check fileformat
	var format = file.format.substr(0,file.format.indexOf('/'));
	var formatClass = '';
	
	switch(format) {
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

			if(file.format.substr(file.format.indexOf('/')+1) === 'pdf') {
				formatClass = 'pdf';
				break;
			}
		default: 		
			formatClass = 'unknown';
			break;
	}

	
	//Check filesize
	fileSizeIndicator = '';
	if(file.size !== undefined) {
		var inMB = file.size/1000/1000; 
		if(inMB > 1000) {
			fileSizeIndicator = 'fileSizeExtrem';
		}
		else if(inMB > 500) {
			fileSizeIndicator = 'fileSizeBigger';
		}
		else if(inMB > 100) {
			fileSizeIndicator = 'fileSizeBig';
		}
		else if(inMB > 10) {
			fileSizeIndicator = 'fileSizeSmall';
		}
	}
	

	var context = {
		id: file._id,
		sizeClass: fileSizeIndicator,
		format: formatClass,
		name: file.name,
		size: bytesToSize(file.size),
		downloads: file.downloads
	}
	var $fileHtml = $(renderTemplate('#file-template', context));

	$fileHtml.appendTo('#filesArea');
	Cufon.refresh();
	$fileHtml.css('display', 'none').css('top', file.y).css('left', file.x);
	$fileHtml.fadeIn(Math.floor(Math.random() * 3000)); 

	if(!isNew) {

		setFileHandler($fileHtml, file);
	}	

	else {

		var tempFileId = file.tempFileId;
		$fileHtml.addClass(''+tempFileId);
		$fileHtml.find('.progress').show();

		if(isOrigin) {
			$fileHtml.addClass('origin');
		}
	}
	
}

/* Draws uploading file into uploadBox
 * @params file object
 * */
function drawUploadingFile(file) {

	//Remove DnD Icon
	if($('#filesWrapper').hasClass('newDesktop')) {
		$('#filesWrapper').removeClass('newDesktop');
	}


	//Check fileformat
	var format = file.format.substr(0,file.format.indexOf('/'));
	var formatClass = '';
	
	switch(format) {
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

			if(file.format.substr(file.format.indexOf('/')+1) === 'pdf') {
				formatClass = 'pdf';
				break;
			}
		default: 		
			formatClass = 'unknown';
			break;
	}

	
	//Check filesize
	fileSizeIndicator = '';
	if(file.size !== undefined) {
		var inMB = file.size/1000/1000; 
		if(inMB > 1000) {
			fileSizeIndicator = 'fileSizeExtrem';
		}
		else if(inMB > 500) {
			fileSizeIndicator = 'fileSizeBigger';
		}
		else if(inMB > 100) {
			fileSizeIndicator = 'fileSizeBig';
		}
		else if(inMB > 10) {
			fileSizeIndicator = 'fileSizeSmall';
		}
	}
	

	var context = {
		id: file._id,
		sizeClass: fileSizeIndicator,
		format: formatClass,
		name: file.name,
		size: bytesToSize(file.size)
	}
	var $fileHtml = $(renderTemplate('#file-template', context));

	$('#uploadingFiles').animate({bottom:0}, 300);
	$fileHtml.appendTo('#uploadingFiles');
	Cufon.refresh();
	$fileHtml.css('display', 'none');
	$fileHtml.fadeIn(); 

	var tempFileId = file.tempFileId;
	$fileHtml.addClass(''+tempFileId);
	$fileHtml.find('.progress').show();

}


/* Sets file Handlers
 * @params filesGroupId
 * @params file object
 * */
function setFileHandler($fileHtml, file) {

	if(!timerForDeskTimeOut && $('.timer').text() === 'ShareDesk') {
		setTimer(new Date());
		timerForDeskTimeOut = true;
	}

	//Check fileformat
	var format = file.format.substr(0,file.format.indexOf('/'));
	var formatClass = '';
	switch(format) {
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
			if(file.format.substr(file.format.indexOf('/')+1) == 'pdf') {
				formatClass = 'pdf';
				break;
			}
		default: 		
			formatClass = 'unknown';
			break;
	}

	//Set format if it was unknown
	var $fileFormat = $fileHtml.find('.format');
	if($fileFormat.hasClass('unknown')) {
		$fileFormat.removeClass('unknown');
		$fileFormat.addClass(formatClass);
	}	

	//Send position if origin
	if($fileHtml.hasClass("origin")) {
		var _file = {
			id: file._id,
			position: {
				x: parseInt($fileHtml.css('left')),
				y: parseInt($fileHtml .css('top'))
			},
		};
		socket.emit('moveFile', _file);
	}
	
	//Add real id
	$fileHtml.attr('id', file._id);
	
	//Add title
	$fileHtml.find('.title').text(file.name);

	//Remove Progress
	$fileHtml.find('.progress').fadeOut(function() {
		$(this).remove();	
	});

		
	var fileId = file._id;

	$fileHtml.draggable({ stack: ".file"});

	//Set filedrag/click handler
	var hasDragged = false;
	$fileHtml.bind( "dragstart", function(ev, ui) {
		if(!hasDragged) hasDragged = true;
	});

	$fileHtml.bind( "dragstop", function(ev, ui) {
		var file = {
			id: fileId,
			position: {
				x: ui.position.left,
				y: ui.position.top
			}
		};
		socket.emit('moveFile', file);
		hasDragged = false;
	});

	$fileHtml.find('.format').bind('mouseup', function(ev) {
		if(!hasDragged) {
			$fileHtml.addClass('active');
			$fileHtml.find('.operations').fadeIn('fast');
		}
	});

	//when user press download button
	$fileHtml.find('.download').bind('mouseup',	function(){
		if(!hasDragged) {
			var ifrm = document.getElementById('downloadiFrame');
    		ifrm.src = 'http://' + location.host + '/' + location.pathname.split('/')[1] + '/download/' + file._id;
			
			//window.open('http://' + location.host + '/' + location.pathname.split('/')[1] + '/download/' + file._id, '_blank');
		}
	});

	//when user press delete button
	$fileHtml.find('.delete').bind('mouseup', function(){
		if(!hasDragged) {

			var answer = confirm("Wollen sie wirklich diese Datei löschen?")
			if (answer){

				//notify server of delete
				socket.emit('deleteFile', { fileId: file._id, identifier: getCookie('identifier') });

			}
		}	
	});


	$('body').click(function(ev) {
		if(!$(ev.target).parents().is(".file")) {
			$('.operations').hide()
			$('.file').removeClass('active');
		}
	});


	//Set renaming handlers
	$fileHtml.find('.title').editable( onFileChange,{
			style   : 'inherit',
			cssclass   : 'fileEditForm',
			type      : 'text',
			onblur: 'submit',
			event: 'dblclick'
	});

	function onFileChange( text, result ) {
		$('form.file-edit-form').remove();
		socket.emit('renameFile', { id: fileId, value: text });
		return(text);
	}

}

/* Adds User to the userbar
 * @params userId
 * */
function addUser(user) {

	var context = {
		sid: user.sid,
		username: user.username,
		color: 'rgb(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ')'
	}
	var $userHtml = $(renderTemplate('#user-template', context));

	if(user.me) {
		$userHtml.addClass('me');
		its_me_user = user;

		//Set right/bottom userBox
		var $meBox = $('#meName');
		var cookieUsername = getCookie('username');

		if(cookieUsername !== null) {
			user.username = cookieUsername;
			socket.emit('renameUser', user);
			$meBox.text(cookieUsername);
		} else {
			$meBox.text(user.username);
		}
		$meBox.css({backgroundColor: 'rgb(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ')'});

		function onFileChange( text, result ) {
			user.username = text;
			$('form.file-edit-form').remove();
			socket.emit('renameUser', user);

			//Set name in cookie
			var a = new Date();
			a = new Date(a.getTime() +1000*60*60*24*20);
			document.cookie = 'username='+text+'; expires='+a.toGMTString()+'; path=/'; 
			
			return(text);
		}

		//Set renaming handlers
		$('#meName').editable( onFileChange,{
				style   : 'inherit',
				cssclass   : 'userEditForm',
				type      : 'text',
				onblur: 'submit',
				event: 'dblclick'
		});	

	}
	else {

		other_users_objects.push(user);

		$userHtml.appendTo('#userBar');
		$('#userBar').find('li').css('width', 100/other_users_objects.length+'%');

		$userHtml.toggle(function() {

			$(this).addClass('selected');
			users_send_to.push(user);
			for(i in other_users_objects) {
				if(other_users_objects[i].sid === user.sid) {
					addUserSendTo(other_users_objects[i]);
				}
			}

		}, function() {

			$(this).removeClass('selected');
			for (i=0;i<=users_send_to.length;i++){
				if(user.sid == users_send_to[i].sid) {
					users_send_to.splice(i,1);
					break;
				}
			}
			for(i in other_users_objects) {
				if(other_users_objects[i].sid === user.sid) {
					removeUserSendTo(other_users_objects[i]);
				}
			}
		});
	}
	

}

/* Removes user from desk
 * */
function removeUser(userId) {

	if(users_send_to.length != 0) {
		for (i=0;i<=users_send_to.length;i++){
			if(userId == users_send_to[i].sid) {
				users_send_to.splice(i,1);
				break;
			}
		}
	}

	if(other_users_objects.length != 0) {
		$('#userBar').find('#'+userId).remove();
		var i=0;
		for (i=0;i<=other_users_objects.length;i++){
			if(other_users_objects[i].sid === userId) {
				removeUserSendTo(other_users_objects[i]);
			}

			if(userId == other_users_objects[i].sid) {
				other_users_objects.splice(i,1);
				break;
			}
		}
		$('#userBar').find('li').css('width', 100/other_users_objects.length+'%');	
	}
}

/* Checks send to users and notifies user
 * */
function removeUserSendTo(user) {

	$('#label .'+user.sid).remove();
	if($('.labelUser').length === 0 && $('.allUsers').length === 0) {
	 	$('#label p').append('<span class="allUsers">all</span>');
	}
	$('#chat input').trigger('focus');
}
function addUserSendTo(user) {

	if($('#label .'+user.sid).length === 0) {
		$('#label .allUsers').remove();
		$('#label p').append('<span class="labelUser ' + user.sid + '" style="color:rgb(' +user.color.r+ ',' +user.color.g+ ',' +user.color.b+ ')">' + user.username + '</span>');
	}
	$('#chat input').trigger('focus');
}


/* Show current file upload progress
 * @params fileId
 * @params bytesReceived
 * @params bytesExpected
 * */
function showProcess(tempFileId, bytesReceived, bytesExpected) {

	var percent = ((bytesReceived/bytesExpected).toFixed(3));


	var newHeight = (((-percent*46) % 46) + 46) % 46;
	var newOpacity = ((-percent*100 % 100) + 100) % 100;

	if($('.'+tempFileId).length == 0) {
		var file = {
			tempFileId : tempFileId,
			name : 'uploading...',
			size: bytesExpected,
			x : 0,
			y : 0,
			downloads: 0,
			format : 'unknown',

		}
		fileTempId_already_exists.push(tempFileId);
		drawUploadingFile(file);	
		console.log('draw new from progress', file);
	}

	$('.' + tempFileId + ' .progressPercent span').text(Math.round(100*percent));
	$('.' + tempFileId + ' .progressBack').css('height', newHeight);
	$('.' + tempFileId + ' .progressBack').css('opacity', newOpacity/100);

}

/* Creats Timer for DeskTimeOut
 * @params creationTime of desk as date object 
 * */
function setTimer(date, isISODate) {

	if(isISODate) {
		var s = date;
		var a = s.split(/[^0-9]/);
		var d=new Date (a[0],a[1]-1,a[2],a[3],a[4],a[5] );
	} else {
		var d = date;
	}
	
	var deskTime = $('.timer').attr('id')/1000;



	deskTimeOut();

	function deskTimeOut() {
		var currentTime = new Date();
		var diffTime = currentTime.getTime()-d.getTime();
		var timePast = diffTime/1000;
		var timeLeft = secondsToTime(deskTime-timePast);
		var outputTextHour = '';
		var outputTextMinute = '';
		var outputTextSecond = '';
		var output = '';
		var refreshTime = 59999; // 60sec



		if(timeLeft.h >= 24) {
			if(timeLeft.h === 24) {
				output = Math.round(timeLeft.h/24) + ' day';
			} else {
				output = Math.round(timeLeft.h/24) + ' days';
			}
		} else if(timeLeft.s <= 0 && timeLeft.m <= 0 && timeLeft.h <= 0) {
			output = 'expired';
		} else {

			if(timeLeft.h === 1) {
				outputTextHour = ' hour ';
			} else {
				outputTextHour = ' hours ';
			}

			if(timeLeft.m === 1) {
				outputTextMinute = ' minute ';
			} else {
				outputTextMinute = ' minutes ';
			}

			if(timeLeft.s === 1) {
				outputTextSecond = ' second ';
			} else {
				outputTextSecond = ' seconds ';
			}

			if(timeLeft.h > 3) {
				output = 'over ' + timeLeft.h + outputTextHour + 'left';
			} else {
				if(timeLeft.m === 0) {
					output = timeLeft.s + outputTextSecond;
					refreshTime = 1000;
				} else {
					output = timeLeft.m + outputTextMinute;
				}
			}
		}
		if(output !== 'expired') {
			$('.timer').text(output);

		} else {
			$('.timer').text(output);
		}
				
		setTimeout(deskTimeOut,refreshTime);
	}
}

/* Open/Closes chatwindow
 * */
function chatWindow(isToggle) {

	var $chatWindow = $('#chatWindow');
	var chatwindowHeight = $chatWindow.height();
	var chatContentHeight = $('#chatContent').outerHeight();
	
	//Open chat window
	if(($('#chatWindow[class="close"]').length !== 0 && isToggle !== true ) || isToggle === true) {
		

		if(chatContentHeight > chatwindowHeight || $chatWindow.hasClass('close') || chatwindowHeight > $(window).height()-30) {

			var newHeight = (chatwindowHeight > chatContentHeight) ? chatwindowHeight : chatContentHeight;
			
			if(newHeight > $(window).height()-30) {
				newHeight = $(window).height()-30;
			}

			if($chatWindow.hasClass('close')) {
				$chatWindow.animate({
					top: '-'+newHeight+'px'
				}, 100, function() {
					// Animation complete.
				});
			} else {
				$chatWindow.css('top', '-'+newHeight+'px');
				$chatWindow.css('height', newHeight+'px');
			}
			$('#chatButton').css('top', '0');
			$('#chatButton').html('<span>-</span>Close Chat');
		}
		
		$chatWindow.removeClass('close').addClass('open');
				
	}

	//Close chat window
	else if(!isToggle) {
		$chatWindow.animate({
			top: '25px'
		}, 100, function() {
			// Animation complete.
		});

		$chatWindow.removeClass('open').addClass('close');
		$('#chatButton').animate({
			top: '-25px'
		}, 300);

		$('#chatButton').html('<span>+</span>Open Chat');

	}

}

/* Adds message to chat
 * @params user object
 * @params msg as string
 * */
function newMessage(msg, user) {

	var context = {
		message: msg,
		name: user.username,
		color: 'rgb(' +user.color.r+ ',' +user.color.g+ ',' +user.color.b+ ')'
	}
	var $messageHtml = $(renderTemplate('#message-template', context));
	$('#chatContent').append($messageHtml);
	$('#chatContent').css("bottom",0);

	chatWindow(true);

}

/**
 * Resizes 	
 * */
function resize() {

	chatWindow(true);
}


// ##jQuery DOM Ready
// ------------------
$(function() {

	//Browsersupport
	var support = checkBrowser();
	if(!support.state) {
		var systemUser = {
			name: 'ShareDesk',
			color: {
				r:255,
				g:255,
				b:255
			}
		};
		newMessage(support.msg, systemUser);
		newMessage('Please update to the newest version of chrome, safari or firefox', systemUser);
	}

	//Sort function
	$('#sort').click(function() {
	
		var $files = $('.file');
		var grid = createGrid($files.length, 50,50);

		$files.each(function(index) {
			
			if($(this).css('top') !== grid[index].y && $(this).css('left') !== grid[index].x ) {
				$(this).animate({top:grid[index].y, left:grid[index].x},500);
				var file = {
					id: $(this).attr('id'),
					position: {
						x: grid[index].x,
						y: grid[index].y
					}
				};
				socket.emit('moveFile', file);

			}
		});
		

		return false;
	});

	//Bind click event to uploadingBox to remove it
	$('#uploadingFiles').click(function() {
		$('#uploadingFiles').animate({bottom:-145}, 300);
	});
			

	//Login with password
	$('#passwordProtection input').keyup(function(e) {
			if(e.keyCode == 13) {//Enter

				$.ajax({
					url: 'http://' + location.host + '/' + location.pathname.split('/')[1]  + '/login',
					type: 'POST',
					dataType: 'json',
					data: {
						password:$(this).val()
					},
					success: function(data){
				
						if(data.state === 1) {
							window.location.href = 'http://' + location.host + '/' + location.pathname.split('/')[1]; 
						} else {
							$('#passwordProtection p').html('<span class="error">'+data.message+'</span>');
						}								
					}
				});
			}
	});


	//Start rotation of illumeBack
	if($(".sdInput").length != 0) {

		$(".sdInput input").trigger('focus');

		//Illum rotation
		var div = $(".illum")[0];
		var property = getTransformProperty(div);
		if (property) {
			var d = 0;
			setInterval(
				function () {
					div.style[property] = 'rotate(' + (d % 360) + 'deg)';
					d += 1;
				},
				30
			);
		}
	}
	


	//Set up securefeature
	$('#secure').click(function() {
		
		if($(this).find('span').attr('class') === 'private') {
			isProtected = true
		} else {
			isProtected = false;
		}
		var context = {
			text: 'Setup a password protection for your desk',
			'input-text': 'Enter password',
			'remove-protection': isProtected ? 'inline-block' : 'none'
		}
		var $passwordHtml = $(renderTemplate('#password-template', context));

		$('body').append($passwordHtml);

			//Start rotation of illumeBack
		if($passwordHtml.find(".sdInput").length != 0) {

			$(".sdInput input").trigger('focus');

			//Illum rotation
			var div = $(".illum");

			$.each(div, function(key, value) { 
				var property = getTransformProperty(value);
				if (property) {
					var d = 1*(key*100);
					setInterval(
						function () {
							value.style[property] = 'rotate(' + (d % 360) + 'deg)';
							d += 1;
						},
						30
					);
				} 
			});
		}


		$passwordHtml.find('input').keyup(function(e) {
			if(e.keyCode == 13) {//Enter
				$.ajax({
					url: 'http://' + location.host + '/' + location.pathname.split('/')[1]  + '/password',
					type: 'POST',
					dataType: 'json',
					data: {
						password:$(this).val()
					},
					success: function(data){


						if(data.state === 0) {

							$passwordHtml.find('p').text(data.message);
						
						} else if(data.state === 1) {

							//protection is set
							$('#secure span').attr('class', 'private');
			
							socket.emit('setPassword', {msg: data.message, toUsers:[], fromUser:its_me_user, room:location.pathname.split('/')[1], protection: 'private'});
							$passwordHtml.remove();	

						} 
					}
				});
			}
		});

		//Remove password
		$passwordHtml.find('button').click(function() {
			

			$.ajax({
				url: 'http://' + location.host + '/' + location.pathname.split('/')[1]  + '/password',
				type: 'POST',
				dataType: 'json',
				data: {},
				success: function(data){
							
					 if(data.state === 2){

						$('#secure span').attr('class', 'public');
						$passwordHtml.remove();	
						socket.emit('setPassword', {msg: data.message, fromUser:its_me_user, room:location.pathname.split('/')[1], protection: 'public'});

					} else if(data.state === 0) {

						$passwordHtml.find('p').html('<span class="error">'+data.message+'</span>');

					}
				}
			});

		});

		$passwordHtml.click(function(ev) {
			if(!$(ev.target).is("input") && !$(ev.target).is("button")) {
				$(this).fadeOut(function() {
					$(this).remove();	
				});
			}
		});
	});


	//Set up chat
	$('#chat input').keyup(function(e) {
		if(e.keyCode == 13) {//Enter
		
			var msg = $('#chat input').val();

			if(msg !== '') {

				$('#chat input').val('');

				newMessage(msg, its_me_user);

				socket.emit('newMessage', {msg: msg, toUsers:users_send_to, fromUser:its_me_user, room:location.pathname.split('/')[1]});
			}

		}
	});
	$('#chat input').trigger('focus');

	//Scrolling chat
	$("#chatWindow").mousewheel(function(objEvent, intDelta){
	
		if (intDelta > 0){
		   	if($('#chatContent').offset().top < 5) {
				$('#chatContent').animate({bottom:"-="+intDelta*10},0);
			}
		}
		else if (intDelta < 0){
		   	if(parseInt($('#chatContent').css('bottom'), 10) < 0) {
				$('#chatContent').animate({bottom:"-="+intDelta*10},0);
			}
		}
	});
	

	$(document).keyup(function(e) {
	  if (e.keyCode == 27) { chatWindow(false); $('#chat input').trigger('focus'); }   // esc
	});
	

	$('#chatButton').click(function() {chatWindow()});
	

	//Window resize
	$(window).resize(resize);


	// Drag&Drop Upload script 
	var uploader = new Uploader();

	if(uploader.fileUploadSupported) {
		console.log('FileUpload is supported');
	}
		
	//Stop browser from loading content if drag into infoBar, userBar
	$('#infoBar, #userBar').bind('dragover', function(ev) {

		ev.stopPropagation();
		ev.preventDefault();
		return false;	

	}).bind('drop', function(ev) {
		
		$('#dragBack').fadeOut();	
		ev.stopPropagation();
		ev.preventDefault();
		return false;
	
	});

	$('#filesWrapper, #chatWindow').bind('dragenter', function(ev) {

		$('#dragBack').filter(':not(:animated)').fadeIn();

		$('#dragBack').bind('dragleave', function(ev) {

				var firstIn = true;
				if($(ev.target).is('#dragBack')) {
					if(!firstIn) $('#dragBack').fadeOut(); 
					firstIn = false;			
				
				} else if (ev.clientX == 0, ev.clientY == 0) {
					$('#dragBack').fadeOut();

				}

				return false;
			}
		);
		
		return false;

	}).bind('dragover', function(ev) {

		var dt = ev.originalEvent.dataTransfer;
		dt.dropEffect = 'copy';

		$('#dropSign').css('top', ev.clientY-150).css('left', ev.clientX-150);

		return false;
		
	}).bind('drop', function (ev) {	

		$('#dragBack').fadeOut();	

		if (!ev.originalEvent.dataTransfer.files) {
			log('ERROR: No FileList object present; user might had dropped text.');
			return false;
		}
		if (!ev.originalEvent.dataTransfer.files.length) {
			log('ERROR: User had dropped a virual file (e.g. "My Computer")');
			return false;
		}

		var files = ev.originalEvent.dataTransfer.files;
		var grid = createGrid(files.length, ev.clientX, ev.clientY, true);

		for (var i = 0; i < files.length; i++) {
			

				//Create unique tempFileId
				var uniqueID = Math.round(Math.random()*99999999);

				
				var newFile = {
					tempFileId: uniqueID,
					name: 'uploading...',
					x: grid[i].x,
					y: grid[i].y,
					format: files[i].type,
					size: files[i].size,
					downloads: 0
				};
				drawFile(newFile, true, true);
				socket.emit('newFileAnnouce', newFile);


				//Start Uploader
				uploader.send({
					url: '/upload/' + location.pathname.split('/')[1] + '/' + uniqueID,
					type: 'POST',
					dataType: 'json'
				}, files[i]);

		}
		
		
		return false;
	});
	
});

//Helpers

/* Check browser support for drag&drop - File Upload
 * @return object with msg und support-state as boolean 
 */
function checkBrowser() {

	// Read as binary string: FileReader API || Gecko-specific function (Fx3)
	var canReadAsBinaryString = (window.FileReader || window.File.prototype.getAsBinary);
	// Read file using FormData interface
	var canFormData = !!(window.FormData);
	
	// Send file in multipart/form-data with binary xhr
	var canSendBinaryString = (
		(window.XMLHttpRequest && window.XMLHttpRequest.prototype.sendAsBinary)
		|| (window.ArrayBuffer && window.BlobBuilder)
	);

	var fileUploadSupported = ((canReadAsBinaryString && canSendBinaryString) || (canFormData));
    var DnDSupported = 'draggable' in document.createElement('span');


	var message = '';
	var supported = true;
	if(!fileUploadSupported) {
		message = 'File Upload is not supported by your browser';
		supported = false;
	}

	if(!DnDSupported) {
		message += '; Drag & Drop is not supported by your browser';
		supported = false;
	}

	if(supported) {
		message = 'browser is supported';
	}

	return {msg: message, state: supported};
}

/* Creats a grid of coordinates
 * @params items, a number of items
 * @params offSetX number with distance from left
 * @params offtSetY number with distance from top
 * @params centers grid arround offsetcoordinate
 * @returns an array with x and y coordinates
 */
function createGrid(items, offSetX, offSetY, isMiddle) {

	//filesetup
	var outerStepNumber = 1,
		oldOuterStepNumber = 1;
	var outerNumber = 0;
	var c = 1;
	var middlePlus = 0;

	var space = 100;
	var x = 0;
	var y = 0;
	var outerWidth = 0;
	var grid = new Array();

	if(offSetX) x = offSetX;
	if(offSetY) y = offSetY;

	//Count outerSpaces
	for (var i = 0; i < items; i++) {
		oldOuterStepNumber = outerStepNumber
		if(i+1 > outerStepNumber) {
			c += 2;
			outerStepNumber += c;
			outerWidth++;
		}
	}

	if(isMiddle) {
		x -= ((outerWidth+1)*space)/2;
		y -= ((outerWidth+1)*space)/2;
	}


	outerStepNumber = 1,
	oldOuterStepNumber = 1;
	c = 1;



	for (var i = 0; i < items; i++) {

		oldOuterStepNumber = outerStepNumber

		if(i+1 > outerStepNumber) {
			c += 2;
			outerStepNumber += c;
			outerNumber++;
		}

		//Calculate new X Value 
		if(i == 0) {
			x += space * outerNumber;
		} else {			
			if(outerStepNumber > oldOuterStepNumber) {
				x += space * outerNumber;
				middlePlus = i+c - outerNumber;
			} else {						
				if(middlePlus > i) {
					x += 0;
				} else {
					x -= space;
				}
			}
		}

		//Calculate new Y Value 
		if(i == 0) {
			y -= space * outerNumber;
		} else {			
			if(outerStepNumber > oldOuterStepNumber) {
				y -= space * (outerNumber-1);
				middlePlus = i+c - outerNumber;
			} else {						
				if(middlePlus > i) {
					y += space;
				} else {
					y += 0;
				}
			}
		}

		var newCoor = { x: x, y: y};
		grid.push(newCoor);
	}

	return grid;
}


/**
 * Convert number of seconds into time object
 *
 * @param integer secs Number of seconds to convert
 * @return object
 */
function secondsToTime(secs) {


	var hours = Math.floor(secs / (60 * 60));
   
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
 
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);
   
    var obj = {
        "h": hours,
        "m": minutes,
        "s": seconds
    };
    return obj;
		
}


/**
 * Convert number of bytes into human readable format
 *
 * @param integer bytes     Number of bytes to convert
 * @param integer precision Number of digits after the decimal separator
 * @return string
 */
function bytesToSize(bytes, precision) {  
    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
   
    if ((bytes >= 0) && (bytes < kilobyte)) {
        return bytes + ' B';
 
    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        return (bytes / kilobyte).toFixed(precision) + ' KB';
 
    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
        return (bytes / megabyte).toFixed(precision) + ' MB';
 
    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        return (bytes / gigabyte).toFixed(precision) + ' GB';
 
    } else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB';
 
    } else {
        return bytes + ' B';
    }
}


/* Renders with handlebar the template and returns html
 * @params templateId
 * @params context as jsonObject
 * @returns html
 * */
function renderTemplate(templateId, context) {
	var source   = $(templateId).html();
	var template = Handlebars.compile(source);
	return template(context);
}

/* Returns the value of a given cookie
 * @params name of the cookie
 * @returns the value of given cookie
 * */

function getCookie (cookie_name) {
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );

  if ( results )
    return ( unescape ( results[2] ) );
  else
    return null;
}

/* Checks transform properties for the current browser
 * @returns the browser specific transform property
 * from: http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
 * */
function getTransformProperty(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
        }
    }
    return false;
}




