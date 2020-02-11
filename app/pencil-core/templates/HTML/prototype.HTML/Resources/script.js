function scaleMap(page, r) {
    var map = page.querySelector("map");
    var container = page.querySelector(".ImageContainer > .Links");
    if (!container) {
        container = document.createElement("div");
        container.setAttribute("class", "Links");
        page.querySelector(".ImageContainer").appendChild(container);
    } else {
        container.innerHTML = "";
    }
    
    map.querySelectorAll("area").forEach(function (area) {
        var original = area._originalCoords || area.getAttribute("coords");
        area._originalCoords = original;
        var coords = original.split(/\,/).map(function (v) {
            return Math.round(parseFloat(v) / r);
        });
        
        area.setAttribute("coords", coords.join(","));
        var a = document.createElement("a");
        a.style.left = convertRatio(coords[0]) + "px";
        a.style.top = convertRatio(coords[1]) + "px";
        a.style.width = convertRatio(coords[2] - coords[0]) + "px";
        a.style.height = convertRatio(coords[3] - coords[1]) + "px";
        a.setAttribute("href", area.getAttribute("href"));
        
        container.appendChild(a);
    });
}
function convertRatio(value) {
    return parseFloat(value); // * window.devicePixelRatio;
}

function fitImages() {
    var pages = document.querySelectorAll("body > div.Page");
    var W = 0;
    var H = 0;
    
    var activePage = null;
    
    pages.forEach(function (page) {
        if (page.offsetWidth == 0 || page.offsetHeight == 0) return;
        
        W = page.offsetWidth - (window.useExpandedMode ? 200 : 40);
        H = page.offsetHeight - 40;
        activePage = page;
    });
    
    if (activePage && window.lastActivePage != activePage) {
        window.useExpandedMode = false;
        invalidateExpandMode("dontFit");
        window.lastSize = null;
        
        document.body.querySelectorAll(".TOC > div").forEach(function (item) {
            var matched = item.classList.contains("Page_" + activePage.id);
            if (matched) {
                document.title = item._name + " - " + window.originalTitle;
                item.classList.add("Focused");
                item.focus();
            } else {
                item.classList.remove("Focused");
            }
        });
        
        window.lastActivePage = activePage;
    }
    
    
    if (W && H) {
        if (window.lastSize && window.lastSize.W == W && window.lastSize.H == H) return;

        var imgs = document.querySelectorAll("body > div.Page img");
        imgs.forEach(function (img) {
            var r = window.useExpandedMode ? Math.min(img.naturalWidth / W, img.naturalHeight / H) : Math.max(img.naturalWidth / W, img.naturalHeight / H);
            
            if (r < 1 && !window.useExpandedMode) r = 1;
            var w = Math.round(img.naturalWidth / r);
            var h = Math.round(img.naturalHeight / r);
            
            img.style.width = w + "px";
            img.style.height = h + "px";
            
            img.setAttribute("width", w);
            img.setAttribute("height", h);
            
            var page = img;
            while (!page.classList.contains("Page")) page = page.parentNode;
            
            scaleMap(page, r * (img._originalWidth / img.naturalWidth));
        });
        
        window.lastSize = {W: W, H: H};
    }
}
function checkActivePage() {
    var pages = document.querySelectorAll("body > div.Page");
    var found = false;
    var firstPage = null;
    pages.forEach(function (page) {
        if (!firstPage) firstPage = page;
        if (page.offsetWidth != 0 && page.offsetHeight != 0) found = true;
    });
    
    if (!found && firstPage) {
        location.hash = "#" + firstPage.id;
        fitImages();
    }
}

function workingThreadFunction() {
    try {
        try {
            fitImages();
        } catch (e) {
            console.error(e);
        }
        try {
            checkActivePage();
        } catch (e) {
            console.error(e);
        }
    } catch (e) {
        console.error(e);
    } finally {
        window.setTimeout(workingThreadFunction, 300);
    }
}


var idleTimeout = null;
function handleMouseMove() {
    if (!document.body.classList.contains("Active")) {
        document.body.classList.add("Active");
    }
    
    if (idleTimeout) window.clearTimeout(idleTimeout);
    idleTimeout = window.setTimeout(function () {
        document.body.classList.remove("Active");
        idleTimeout = null;
    }, 400);
}

var THUMB_WIDTH = 250;
var THUMB_HEIGHT = 160;
var THUMB_DISPLAY_SIZE = 160;

function buildThumbnail(url, callback) {
    var image = new Image();
    image.onload = function () {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        var r = Math.max(image.width / THUMB_WIDTH, image.height / THUMB_HEIGHT);
        var w = image.width / r, h = image.height / r;
        canvas.width = w;
        canvas.height = h;
        
        ctx.drawImage(image, 0, 0, w, h);
        
        callback(canvas.toDataURL('image/png'), w, h);
    };
    
    image.src = url;
}

function generateTOC() {
    var toc = document.createElement("div");
    toc.setAttribute("class", "TOC");
    var pages = document.querySelectorAll("body > div.Page");
    pages.forEach(function (page) {
        var title = page.querySelector("h2");
        var img = page.querySelector(".ImageContainer img");
        
        var item = document.createElement("div");
        var imageWrapper = document.createElement("a");
        var itemImage = document.createElement("img");
        
        item.classList.add("Page_" + page.id);
        item.setAttribute("tabindex", 0);
        item._name = title.textContent;
        
        imageWrapper.setAttribute("href", "#" + page.id);

        item.appendChild(imageWrapper);
        var name = document.createElement("strong");
        name.innerHTML = title.innerHTML;
        
        toc.appendChild(item);
        
        buildThumbnail(img.src, function (dataUrl, w, h) {
            var r = Math.max(w / THUMB_DISPLAY_SIZE, h / THUMB_DISPLAY_SIZE);
            var w = w / r, h = h / r;
            
            imageWrapper.appendChild(itemImage);
            itemImage.style.width = w + "px";
            itemImage.style.height = h + "px";
            itemImage.src = dataUrl;
            
            imageWrapper.appendChild(name);
        });
    });
    
    document.body.appendChild(toc);
}

function invalidateExpandMode(dontFit) {
    if (window.useExpandedMode) {
        document.body.classList.add("ExpandMode");
    } else {
        document.body.classList.remove("ExpandMode");
    }
    
    if (!dontFit) fitImages();
}

function boot() {
    window.originalTitle = document.title;
    document.addEventListener("mousemove", handleMouseMove);
    var style = document.createElement("link");
    style.setAttribute("rel", "stylesheet");
    style.setAttribute("href", "Resources/style.css");
    document.querySelector("head").appendChild(style);
    
    var imgs = document.querySelectorAll("body > div.Page img");
    imgs.forEach(function (img) {
        img._originalWidth = parseInt(img.getAttribute("width"), 10);
        img._originalHeight = parseInt(img.getAttribute("height"), 10);
    });
    
    
    generateTOC();
    workingThreadFunction();

    
    window.zoomToggleButton = document.createElement("button");
    window.zoomToggleButton.classList.add("ToggleZoomButton");
    window.zoomToggleButton.setAttribute("title", "Toggle expand/fit mode");
    document.body.appendChild(window.zoomToggleButton);
    
    window.zoomToggleButton.addEventListener("click", function () {
        window.useExpandedMode = window.useExpandedMode ? false : true;
        window.lastSize = null;
        invalidateExpandMode();
    }, false);
}

window.onload = boot;

















