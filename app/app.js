const {clipboard, nativeImage, shell, ipcRenderer, webFrame} = require("electron");

const _             = require("lodash");
const rimraf        = require("rimraf");
const QP            = require("q");

const tmp           = require("tmp");
const path          = require("path");
const moment        = require("moment");
const fs            = require("fs");
const os            = require("os");
const jimp          = require("jimp");
const pkgInfo       = require("./package.json");
const QueueHandler  = require("./pencil-core/common/QueueHandler");
const sharedUtil    = require("./pencil-core/common/shared-util");
const dialog        = remote.dialog;
const freehand      = require("perfect-freehand");
tmp.setGracefulCleanup();

// webFrame.registerURLSchemeAsPrivileged("file");
// webFrame.registerURLSchemeAsSecure("file");
// webFrame.registerURLSchemeAsBypassingCSP("file");
