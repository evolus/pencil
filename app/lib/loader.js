
function loadFontManager() {
    let platform = process.platform;
    let arch = process.arch;
    let fmPath = "";
    if (platform === "win32" && arch === "x64") {
      fmPath = [platform, arch].join('/');
    } else {
      fmPath = platform;
    }

    return require(`./font-manager/${fmPath}/fontmanager`);
}

exports.fontManager = loadFontManager();
