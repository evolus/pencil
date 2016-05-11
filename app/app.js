const clipboard   = require("electron").clipboard;
const tmp         = require("tmp");
const path        = require("path");
const moment      = require("moment");
const fs          = require("fs");
const os          = require("os");
const unzip       = require("unzip2");
const dialog      = require("electron").remote.dialog;
const nativeImage = require('electron').nativeImage;

let platform = process.platform;
let arch = process.arch;
let fmPath = "";
if (platform === "win32" && arch === "x64") {
  fmPath = [platform, arch].join('/');
} else {
  fmPath = platform;
}

const fontManager = require("./lib/font-manager/" + fmPath + "/fontmanager");

tmp.setGracefulCleanup();

var webFrame = require("electron").webFrame;
webFrame.registerURLSchemeAsPrivileged("file");
webFrame.registerURLSchemeAsSecure("file");
webFrame.registerURLSchemeAsBypassingCSP("file");
