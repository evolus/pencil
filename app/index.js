"use strict";

if (require('electron-squirrel-startup')) {
  return;
}

const electron = require("electron");
const app      = electron.app;
const Console  = require("console").Console;
const pkg      = require("./package.json");
const fs       = require("fs");
const path     = require("path");

app.commandLine.appendSwitch("allow-file-access-from-files");
app.commandLine.appendSwitch("allow-file-access");

const BrowserWindow = electron.BrowserWindow;


// logs
const output = fs.createWriteStream(app.getPath("userData") + "/user.log");
const errorOutput = fs.createWriteStream(app.getPath("userData") + "/error.log");
const logger = new Console(output, errorOutput);

var handleRedirect = (e, url) => {
    e.preventDefault();
    electron.shell.openExternal(url);
}

var mainWindow = null;
function createWindow() {
    var mainWindowProperties = {
        title: pkg.name,
        autoHideMenuBar: true,
        webPreferences: {
          webSecurity: false,
          allowRunningInsecureContent: true,
          allowDisplayingInsecureContent: true,
          defaultEncoding: "UTF-8"
        },
    };

    var iconFile = process.platform == "win32" ? "app.ico" : "css/images/logo-shadow.png";
    mainWindowProperties.icon = path.join(__dirname, iconFile);

    mainWindow = new BrowserWindow(mainWindowProperties);

    var devEnable = false;
    if (process.argv.indexOf("--enable-dev") >= 0) {
        devEnable = true;
    } else if (process.env.PENCIL_ENV === "development") {
        devEnable = true;
    }

    app.devEnable = devEnable;

    mainWindow.hide();
    mainWindow.maximize();

    if (devEnable) {
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.setMenu(null);
    }

    var mainUrl = "file://" + __dirname + "/app.xhtml";
    mainWindow.loadURL(mainUrl);
    mainWindow.show();

    //mainWindow.webContents.openDevTools();

    mainWindow.on("closed", function() {
        mainWindow = null;
        app.exit(0);
    });

    mainWindow.webContents.on("will-navigate", handleRedirect);
    mainWindow.webContents.on("new-window", handleRedirect);

    app.mainWindow = mainWindow;
    global.mainWindow = mainWindow;
}

// Quit when all windows are closed.
app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on('ready', function() {
    var protocol = require('protocol');
    var fs = require('fs');

    protocol.registerBufferProtocol("ref", function(request, callback) {
        var path = request.url.substr(6);
        console.log("PATH", path);

        fs.readFile(path, function (err, data) {
            console.log("Got data: ", data.length);
            callback({mimeType: "image/jpeg", data: new Buffer(data)});
        });

    }, function (error, scheme) {
        if (error) {
            console.log("ERROR REGISTERING", error);
        }
    });


    // Create the browser window.
    createWindow();

    const renderer = require("./pencil-core/common/renderer");
    renderer.start();

    const webPrinter = require("./pencil-core/common/webPrinter");
    webPrinter.start();
});
app.on("activate", function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    } else {
        app.show();
    }
});

process.on('uncaughtException', function (error) {
    logger.error(error);
});

console.log("Platform: " + process.platform.trim());
