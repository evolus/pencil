
function loadFontManager() {
    let platform = process.platform;
    let arch = process.arch;
    let fmPath = "";
    if ((platform === "win32" || platform === "linux") && arch === "x64") {
      fmPath = [platform, arch].join('/');
    } else {
      fmPath = platform;
    }

    try {
        return require(`./font-manager/${fmPath}/fontmanager`);
    } catch (e) {
        console.error("Failed to load pre-compiled font manager, returning a dummy version.");
        return {
            getAvailableFontsSync: function () {
                return [
                    { family: "Arial"}
                ];
            }
        }
    }
}

exports.fontManager = loadFontManager();
