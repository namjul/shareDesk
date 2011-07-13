/*
 *  HTML5 File Uploader
 *  
 *  Author: samyhoo at gmail.com
 *  Web: http://namart.at
 *	Credits: http://timc.idv.tw/html5-file-upload/
 */

//Log function to be called with Uploader
window.log = function (s) {
	try {
		console.log.apply(this, arguments);
	} catch (e) {
		try {
			// .apply() won't work in Chrome
			console.log(s);
		} catch (e) {
		}
	}
};


/**
* @param Event Object from FileReader on onloaded
*/
var Uploader = function() {

	// Don't do logging if window.log function does not exist.
	this.log = window.log || $.noop;	
	
	// Feature detection

	// Read as binary string: FileReader API || Gecko-specific function (Fx3)
	this.canReadAsBinaryString = (window.FileReader || window.File.prototype.getAsBinary);
	// Read file using FormData interface
	this.canFormData = !!(window.FormData);
	
	// Send file in multipart/form-data with binary xhr
	this.canSendBinaryString = (
		(window.XMLHttpRequest && window.XMLHttpRequest.prototype.sendAsBinary)
		|| (window.ArrayBuffer && window.BlobBuilder)
	);

	this.fileUploadSupported = ((this.canReadAsBinaryString && this.canSendBinaryString) || (this.canFormData));
	
	// jQuery.ajax config
	var config = {
		fileError: function (info, textStatus, textDescription) {
			window.alert(textDescription);
		}
	};	
};

Uploader.prototype = {


    /**
     * @return String A random string
     */
    generateBoundary: function() {
			return "-----------------------" + (new Date).getTime();	
	},


	/**
     * Constructs the message for one file
     * @param Array elements
     * @param String boundary
     * @return String
     */
    buildMessage : function(file, boundary) {


 		var dashdash = '--';
    	var crlf = '\r\n';

 		/* Build RFC2388 string. */
   		 var builder = '';

    	builder += dashdash;
    	builder += boundary;
    	builder += crlf;
		

		var info = {
			type: file.type,
			size: file.size,
			name: file.name 
		};
		
		// A placeholder MIME type
		if (!info.type) info.type = 'application/octet-stream';
		

		/* Generate headers. */            
		builder += 'Content-Disposition: form-data; name="' + info.name + '"';
		if (info.name) {
			builder += '; filename="' + info.name + '"';
		}
		builder += crlf;

		builder += 'Content-Type: ' + info.type;
		builder += crlf;
		builder += crlf; 

		/* Append binary data. */
		builder += file.data;
		builder += crlf;


		

		/* Mark end of the request. */
		builder += dashdash;
		builder += boundary;
		builder += dashdash;
		builder += crlf;
		
		return builder;    	
	},


    /**
     * Constructs the message for multiple files
     * @param Array elements
     * @param String boundary
     * @return String
     */
    buildMessageMulti : function(files, boundary) {


 		var dashdash = '--';
    	var crlf = '\r\n';

 		/* Build RFC2388 string. */
   		 var builder = '';

    	builder += dashdash;
    	builder += boundary;
    	builder += crlf;
		
		
		for (var i = 0; i < files.length; i++) {

			var file = files[i];

			var info = {
				// properties of standard File object || Gecko 1.9 properties
				type: file.type || '', // MIME type
				size: file.size || file.fileSize,
				name: file.name || file.fileName
			};
			
			// A placeholder MIME type
			if (!info.type) info.type = 'application/octet-stream';
			

			/* Generate headers. */            
        	builder += 'Content-Disposition: form-data; name="user_file[]"';
        	if (info.name) {
          		builder += '; filename="' + info.name + '"';
       	 	}
       		builder += crlf;

 			builder += 'Content-Type: ' + info.type;
        	builder += crlf;
        	builder += crlf; 

			/* Append binary data. */
        	builder += file.getAsBinary();
        	builder += crlf;

			/* Write boundary. */
			builder += dashdash;
			builder += boundary;
			builder += crlf;

		}

		/* Mark end of the request. */
		builder += dashdash;
		builder += boundary;
		builder += dashdash;
		builder += crlf;
		
		return builder;    	
	},


    /**
     * @return null
     */
    send : function(settings, file) {

		console.log('SEND new FIle: ', file, settings);
	
		if(this.canFormData) {
			log('INFO: Bypass file reading, insert file object into FormData object directly.');

			settings.processData = false;
			settings.contentType = null;
			settings.__beforeSend = settings.beforeSend;

			var formData = new FormData();

			formData.append(file.name, file);
			
			settings.beforeSend = function (xhr, s) {
				s.data = formData;
				if (s.__beforeSend) return s.__beforeSend.call(this, xhr, s);
			}
			

			$.ajax(settings);

			

									
		} else if (this.canSendBinaryString) {

			//Create Boundary
			var boundary = this.generateBoundary();

			// If FileReader is supported by browser
			if (window.FileReader) {

				settings.contentType = 'multipart/form-data; boundary=' + boundary;
				settings.__beforeSend = settings.beforeSend;
				settings.beforeSend = function (xhr, s) {
					//xhr.send = xhr.sendAsBinary;
					
					//the top version dont work
					XMLHttpRequest.prototype.send = function(data) {
						return this.sendAsBinary(data);
					}

					if (s.__beforeSend) return s.__beforeSend.call(this, xhr, s);

				}


				var self = this;

				var reader = new FileReader();
				reader.onerror = function (ev) {
					if (ev.target.error) {
						switch (ev.target.error) {
							case 8:
							log('ERROR: File not found.');
							settings.fileError.call(this, info, 'FILE_NOT_FOUND', 'File not found.');
							break;
							case 24:
							log('ERROR: File not readable.');
							settings.fileError.call(this, info, 'IO_ERROR', 'File not readable.');
							break;
							case 18:
							log('ERROR: File cannot be access due to security constrant.');
							settings.fileError.call(this, info, 'SECURITY_ERROR', 'File cannot be access due to security constrant.');
							break;
							case 20: //User Abort
							break;
						}
					}
				}

				reader.onloadend = function (ev) {	

					var bin = ev.target.result;
					var nfile = {
						type:file.type,
						size:file.size,
						name:file.name,
						data:bin
					}

					var formData = self.buildMessage(nfile, boundary);

					settings.data = formData;
								
					$.ajax(settings);

				};
				reader.readAsBinaryString(file);
				

			//If getAsBinary is supported by browser
			} else if (window.File.prototype.getAsBinary) {


				var formData = this.buildMessageMulti(file, boundary);

				settings.data = formData;
				settings.contentType = 'multipart/form-data; boundary=' + boundary;
				settings.___beforeSend = settings.beforeSend;
				settings.beforeSend = function (xhr, s) {
					xhr.send = xhr.sendAsBinary;
					if (s.___beforeSend) return s.___beforeSend.call(this, xhr, s);

					//the top version dont work
					XMLHttpRequest.prototype.send = function(data) {
						return this.sendAsBinary(data);
					}

				}
			
				$.ajax(settings);

			}

		
		} else {
			
			console.log('Your browser dont support FileUpload');
		}
	}
};

