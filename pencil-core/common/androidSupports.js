var AndroidSupports = {};

AndroidSupports.insertScreenCapture = function () {
    Util.beginProgressJob("Taking screenshot", AndroidSupports.screenCaptureStarter);
};
AndroidSupports.screenCaptureStarter = function (listener) {
    //alert("inserting screen capture...");
    
    var SEP = "/";
    
    var sdkPath = "/home/dgthanhan/Apps/android-sdk-linux_x86-64_r21";
    var utilJar = "/home/dgthanhan/Working/Projects/Pencil/DDMSUtil/ddmsutil.jar";
    
    var java = "/usr/bin/java";
    var classpath = utilJar;
    
    var additionalSDKJars = [
        "ddms.jar",
        "x86_64/swt.jar"
    ];
    
    for (var i = 0; i < additionalSDKJars.length; i ++) {
        var jar = additionalSDKJars[i];
        classpath += ":" + sdkPath + SEP + "tools" + SEP + "lib" + SEP + jar
    }
    
    var mainClass = "vn.evolus.ddmsutil.Main";
    var adbPath = sdkPath + SEP + "platform-tools" + SEP + "adb";
    var output = "/home/dgthanhan/Desktop/foo.png";
    
    var args = [
        "-cp", classpath,
        mainClass,
        "-adb", adbPath,
        "-o", output
    ];
    
    var app = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
    app.initWithPath(java);

    var process = Components.classes["@mozilla.org/process/util;1"]
                        .createInstance(Components.interfaces.nsIProcess);
    process.init(app);

    process.runAsync(args, args.length);
    
    var count = 0;
    var tracker = function () {
        if (process.isRunning) {
            window.setTimeout(tracker, 200);
            listener.onProgressUpdated("Please wait", count ++, 20);
        } else {
            var handler = function (imageData) {
                var def = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
                
                var w = imageData.w;
                var h = imageData.h;
                
                if (w > 250) {
                    w = w / 2;
                    h = h / 2;
                }
                
                var pw = parseInt(Pencil.activeCanvas.getAttribute("width"), 10);
                var ph = parseInt(Pencil.activeCanvas.getAttribute("height"), 10);
                
                var dim = new Dimension(w, h);
                
                Pencil.activeCanvas.insertShape(def, new Bound(pw / 2, ph / 2, w, h), {
                    "imageData": {initialValue: imageData},
                    "box": {initialValue: dim}
                });
                
                listener.onTaskDone();
            };
            
            var imageFile = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
            imageFile.initWithPath(output);
            
            var url = Util.ios.newFileURI(imageFile).spec + "?" + (new Date().getTime());

            ImageData.fromUrlEmbedded(url, handler);
        }
    };

    window.setTimeout(tracker, 1000);
};

AndroidSupports.submit = function () {
    
};

registerToolbar({id: "android", name: "Android Toolbar"});
