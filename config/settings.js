var settings = {
  appName: "MyApp",
  port: 8081,
  uri: 'http://localhost:8081', // Without trailing /
  debug: (process.env.NODE_ENV !== 'production'),
  uploadFolder: './uploads',
};

if (process.env.NODE_ENV == 'production') {
  settings.uri = 'http://yourname.no.de';
  settings.port = process.env.PORT || 80; 
  //settings.airbrakeApiKey = '0190e64f92da110c69673b244c862709'; // Error logging, Get free API key from https://airbrakeapp.com/account/new/Free
}
module.exports = settings;

// check if uploadFolder exists
try {
	if(!require('fs').lstatSync(settings.uploadFolder).isDirectory()) {
		require('fs').mkdirSync(settings.uploadFolder, 0755);
	}
}
catch(e) {
	require('fs').mkdirSync(settings.uploadFolder, 0755);
}