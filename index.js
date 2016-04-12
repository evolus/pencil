const electron = require("electron");
const app = electron.app;

app.commandLine.appendSwitch("allow-file-access-from-files");
app.commandLine.appendSwitch("allow-file-access");

const BrowserWindow = electron.BrowserWindow;

var mainWindow = null;


// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    var protocol = require('protocol');
    var fs = require('fs');
    protocol.registerBufferProtocol('ref', function(request, callback) {
        var path = request.url.substr(6);
        console.log("PATH", path);

        fs.readFile(path, function (err, data ) {
            console.log("Got data: ", data.length);
            callback({mimeType: "image/jpeg", data: new Buffer(data)});
        });

    }, function (error, scheme) {
        if (error) {
            console.log("ERROR REGISTERING", error);
        }
    });


    // Create the browser window.
    mainWindow = new BrowserWindow({title: "Pencil", autoHideMenuBar: true, webPreferences: {webSecurity: false, allowRunningInsecureContent: true, allowDisplayingInsecureContent: true, defaultEncoding: "UTF-8"}});
    mainWindow.hide();
    mainWindow.maximize();

    var mainUrl = "file://" + __dirname + "/app.xhtml";
    console.log("MainURL: " + mainUrl);
    mainWindow.loadURL(mainUrl);
    mainWindow.show();

    global.mainWindow = mainWindow;

    //mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
        mainWindow = null;
        app.exit(0);
    });


    const renderer = require("./pencil-core/common/renderer");
    renderer.start();
});
