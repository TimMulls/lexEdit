# lexEdit

This package contains just the source code needed to build lexEdit

You will need to change the following files

webpack.config.js
    path to out put of the compiled code
    also the publicpath for the fonts

src/app/appConfig.ts
    A number of items should be changed in this file to match your setup


To Build the Code
in package.json there is a scripts section under which there is a build line which ever is
labled as "build" is what will happen when you build the project in visual studio

You can either change the build line from the default of" build": "webpack --mode development" which
compiles the code and maps the source to make it easier to debug. Or you can run "npm run buildl" to
run the live version from the node command prompt to compile the live version which does not include
source mappings and also minimizes the code.

You should NEVER put the development version of the code on a live server and only use it for local development
also never copy over the .map files to anything but local machine unless debugging and then delete after done.

Besides this package there is also another directory of source required to run the app
This is defined in the webpack.config.js file for the output as well.
The directory structor and files should be as follows
lexEdit2
    dist                        //This is the directory which the compiled Typescript gets put
    images                      //The images used in the editor
    file-upload.aspx and cs     //This is called to upload the files to the server and make the required images
    lexEdit.ascx and cs         //The usercontrol which is the main control for the app
    lexEdit.aspx and cs         //A test for the usercontrol so it can be called variables passed easiser
    SaveImage.ashx              //Used to download an image from the editor in the imageEditor