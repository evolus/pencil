const {clipboard, nativeImage, shell, ipcRenderer, webFrame} = require("electron");
window.remote = require("@electron/remote");
window.clipboard = clipboard;
window.nativeImage = nativeImage;
window.shell = shell;
window.ipcRenderer = ipcRenderer;
window.webFrame = webFrame;

window._ = require("lodash");
window.rimraf = require("rimraf");
window.QP = require("q");

window.tmp = require("tmp");
window.path = require("path");
window.moment = require("moment");
window.fs = require("fs");
window.os = require("os");
window.jimp = require("jimp");
window.pkgInfo = require("./package.json");
window.QueueHandler = require("./pencil-core/common/QueueHandler");
window.sharedUtil = require("./pencil-core/common/shared-util");
window.dialog = window.remote.dialog;
window.freehand = require("perfect-freehand");

const _ = window._;
const rimraf = window.rimraf;
const QP = window.QP;
const tmp = window.tmp;
const path = window.path;
const moment = window.moment;
const fs = window.fs;
const os = window.os;
const jimp = window.jimp;
const pkgInfo = window.pkgInfo;
const QueueHandler = window.QueueHandler;
const sharedUtil = window.sharedUtil;
const dialog = window.dialog;
const freehand = window.freehand;
tmp.setGracefulCleanup();

// webFrame.registerURLSchemeAsPrivileged("file");
// webFrame.registerURLSchemeAsSecure("file");
// webFrame.registerURLSchemeAsBypassingCSP("file");
