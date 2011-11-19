![sharedesk logo](http://sharedesk.at/images/logo.png)

What is ShareDesk?
-------------
[ShareDesk](http://sharedesk.at) is a web based file sharing tool build on
node.js, websockets(socket.io), HTML5/CSS3, jQuery.  
It is compatible with newest version of chrome, firefox, safari.

![Demo Board](http://sharedesk.at/images/screenshot.png)

See a demo here:
[sharedesk.at/demo](http://sharedesk.at/demo) 

Features
------------
* file upload/download
* drag&drop functionality
* typical PC desktop behaviour (overview of all files, moving files, renaming
  files, deleting files)
* real-time notification of user actions
* upload progress
* overview of acive users
* chat
* password protection

Usage
------------
If you wanna share files with ShareDesk just append to the url the name
of your project (set a password if you want) and start dragging files :)  
[sharedesk.at/nameofyourproject](http://sharedesk.at/nameofyourproject) 

or you use it on your own server, below are some instruction how to install it.

Installation
------------
**node.js**

You can find the installation instruction for you system at the github wiki of nodejs (https://github.com/joyent/node/wiki/Installation).  
Sharedesk will not work on Windows systems.

**NPM**

To install the node modules used in sharedesk, you need the node package manager (NPM).  
The installation instruction can be find at the npm github page (https://github.com/isaacs/npm).

**MongoDB**

Sharedesk uses mongoDB as the database. It can also be installed on different systems.  
The instruction are on the mongoDB website (http://www.mongodb.org/display/DOCS/Quickstart).

**shareDesk**

As we have installed the runtime environment we can proceed with shareDesk.
There are two ways to get shareDesk:  
* Download the archive file (zip) and extract it to your directory (https://github.com/namjul/shareDesk/zipball/master).  
* Get shareDesk by cloning it with git:  
`git clone git://github.com/eeezyy/shareDesk.git`

**Modules**

Go to your shareDesk folder in the console and run the following command:  
`npm install`

Run the server
------------
Start the mongoDB deamon: `mongod &`

Start shareDesk in the shareDesk directory: `node app.js`  
To start shareDesk on a different port then 80, just append the port:  
`node app.js 8080`

On linux systems you can assure that shareDesk runs even if you are logged out from your system by prepending the command `nohup`:  
`nohup node app.js`

Licence
------------
ShareDesk — A web based file sharing tool.
Copyright (C) 2011 Samuel Hobl, Alexander Kumbeiz, Goran Janosevic

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

the *images* used in sharedesk, however are licensed under cc non commercial noderivs:

<a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/3.0/"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by-nc-nd/3.0/80x15.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/3.0/">Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported License</a>.
