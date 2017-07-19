"use strict";

const {app, protocol, shell, BrowserWindow} = require("electron");
const pkg      = require("./package.json");
const fs       = require("fs");
const path     = require("path");

app.commandLine.appendSwitch("allow-file-access-from-files");
app.commandLine.appendSwitch("allow-file-access");

// Disable hardware acceleration by default for Linux
// TODO: implement a setting for this one and requires a restart after changing that value
if (process.platform.trim().toLowerCase() == "linux" && app.disableHardwareAcceleration) {
    console.log("Hardware acceleration disabled for Linux.");
    app.disableHardwareAcceleration();
}

global.sharedObject = { appArguments: process.argv };

var handleRedirect = (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
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

    if (process.platform == 'darwin') {
        var {MacOSToolbar} = require('./views/toolbars/MacOSToolbar');
        MacOSToolbar.createMacOSToolbar();
    }

    mainWindow.webContents.on("will-navigate", handleRedirect);
    mainWindow.webContents.on("new-window", handleRedirect);

    app.mainWindow = mainWindow;
    global.mainWindow = mainWindow;

    // const updater = require('./updater');
    // setTimeout(function() {
    //     updater.checkForUpdates();
    // }, 3000);
}

// Quit when all windows are closed.
app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on('ready', function() {
    protocol.registerBufferProtocol("ref", function(request, callback) {
        var path = request.url.substr(6);

        fs.readFile(path, function (err, data) {
            if (err) {
                callback({mimeType: "text/html", data: new Buffer("Not found")});
            } else {
                callback({mimeType: "image/jpeg", data: new Buffer(data)});
            }
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

    const globalShortcutMainService = require("./tools/global-shortcut-main.js");
    globalShortcutMainService.start();
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

app.on("will-quit", function () {
  require("electron").globalShortcut.unregisterAll()
});

process.on('uncaughtException', function (error) {
    console.error(error);
});
