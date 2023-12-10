const { BrowserWindow } = require("electron");
const os = require("os");
const { autoUpdater } = require("electron-updater");

function AppUpdater() {
}
AppUpdater.prototype.checkForUpdates = function() {
    if (isDev()) {
      return;
    }

    const platform = os.platform();
    if (platform === "linux") {
        return;
    }

    const log = require("electron-log");
    log.transports.file.level = "info";
    autoUpdater.logger = log;

    autoUpdater.signals.updateDownloaded(it => {
        notify("A new update is ready to install", `Version ${it.version} is downloaded and will be automatically installed on Quit`)
    })
    autoUpdater.checkForUpdates();
    console.log('checking for update');
};

function notify(title, message) {
  let windows = BrowserWindow.getAllWindows();
  if (windows.length == 0) {;
    return;
  }

  windows[0].webContents.send("notify", title, message);
  console.log(message);
}

function isDev() {
    return process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);
}

module.exports = new AppUpdater();
