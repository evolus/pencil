(function () {
    "use strict";

    var body = document.body;
    var pageArea = document.querySelector(".page-area");
    var breadcrumb = document.querySelector(".breadcrumb");
    var sidebarToggle = document.querySelector(".sidebar-toggle");
    var linkAreaToggle = document.querySelector(".link-toggle-input");
    var narrowLayout = window.matchMedia("(max-width: 700px)");
    var documentTitle = document.title;

    var LINK_AREAS_STORAGE_KEY = "pencil.sidebarPrototype.showLinkAreas";
    var FLASH_DURATION_MS = 800;
    var flashTimer = null;

    var pagesByFid = {};
    document.querySelectorAll(".page").forEach(function (page) {
        pagesByFid[page.dataset.fid] = page;
    });

    var treeItemsByFid = {};
    var pageOrder = [];
    document.querySelectorAll(".tree-item").forEach(function (item) {
        treeItemsByFid[item.dataset.fid] = item;
        pageOrder.push(item.dataset.fid);
    });

    var currentFid = null;

    /*
     * Remembering the checkbox is a per-viewer convenience. Storage can be unavailable (private
     * windows, blocked site data, some file:// setups), and the page then starts with the areas
     * hidden.
     */
    function readLinkAreasPreference() {
        try {
            return localStorage.getItem(LINK_AREAS_STORAGE_KEY) == "true";
        } catch (e) {
            return false;
        }
    }

    function saveLinkAreasPreference(visible) {
        try {
            localStorage.setItem(LINK_AREAS_STORAGE_KEY, String(visible));
        } catch (e) {
            return;
        }
    }

    function setLinkAreasVisible(visible) {
        body.classList.toggle("is-showing-link-areas", visible);
        linkAreaToggle.checked = visible;
    }

    /*
     * A click that misses every link area flashes the page's link areas, so viewers who keep
     * them hidden can still find where to click.
     */
    function flashLinkAreas(frame) {
        frame.classList.remove("is-flashing");
        /* Reading layout between remove and add restarts the CSS animation on repeated clicks. */
        void frame.offsetWidth;
        frame.classList.add("is-flashing");

        window.clearTimeout(flashTimer);
        flashTimer = window.setTimeout(function () {
            frame.classList.remove("is-flashing");
        }, FLASH_DURATION_MS);
    }

    function parentTreeItem(item) {
        return item.parentElement.closest(".tree-item");
    }

    function ancestorFids(fid) {
        var fids = [];
        for (var item = parentTreeItem(treeItemsByFid[fid]); item; item = parentTreeItem(item)) {
            fids.unshift(item.dataset.fid);
        }
        return fids;
    }

    function pageName(fid) {
        return treeItemsByFid[fid].querySelector(":scope > .tree-row > .tree-link").textContent;
    }

    function setExpanded(item, expanded) {
        var toggle = item.querySelector(":scope > .tree-row > .tree-toggle");
        if (!toggle) return;
        item.classList.toggle("is-collapsed", !expanded);
        toggle.setAttribute("aria-expanded", String(expanded));
    }

    function renderBreadcrumb(fid) {
        breadcrumb.textContent = "";
        ancestorFids(fid).forEach(function (ancestorFid) {
            var link = document.createElement("a");
            link.href = "#" + ancestorFid;
            link.textContent = pageName(ancestorFid);
            breadcrumb.appendChild(document.createElement("li")).appendChild(link);
        });
        var current = document.createElement("span");
        current.setAttribute("aria-current", "page");
        current.textContent = pageName(fid);
        breadcrumb.appendChild(document.createElement("li")).appendChild(current);
    }

    function renderPageNav(fid) {
        var index = pageOrder.indexOf(fid);
        document.querySelectorAll(".page-nav-link").forEach(function (link) {
            var targetFid = pageOrder[index + parseInt(link.dataset.step, 10)];
            if (targetFid) {
                link.href = "#" + targetFid;
                link.title = pageName(targetFid);
                link.removeAttribute("aria-disabled");
            } else {
                link.removeAttribute("href");
                link.removeAttribute("title");
                link.setAttribute("aria-disabled", "true");
            }
        });
    }

    function selectTreeItem(fid) {
        if (currentFid) {
            var previous = treeItemsByFid[currentFid];
            previous.classList.remove("is-current");
            previous.querySelector(":scope > .tree-row > .tree-link").removeAttribute("aria-current");
        }
        var item = treeItemsByFid[fid];
        item.classList.add("is-current");
        ancestorFids(fid).forEach(function (ancestorFid) {
            setExpanded(treeItemsByFid[ancestorFid], true);
        });
        var link = item.querySelector(":scope > .tree-row > .tree-link");
        link.setAttribute("aria-current", "page");
        link.scrollIntoView({block: "nearest"});
    }

    function setSidebarOpen(open) {
        body.classList.toggle("is-sidebar-open", open);
        sidebarToggle.setAttribute("aria-expanded", String(open));
    }

    /*
     * The URL hash holds the page fid, so reload and browser back/forward keep the page. An
     * unknown or empty hash falls back to the first page in tree order without adding a
     * history entry.
     */
    function showPageFromHash() {
        var fid = decodeURIComponent(location.hash.substring(1));
        if (!pagesByFid[fid]) {
            fid = pageOrder[0];
            history.replaceState(null, "", "#" + fid);
        }
        if (fid == currentFid) return;

        if (currentFid) pagesByFid[currentFid].hidden = true;
        pagesByFid[fid].hidden = false;

        selectTreeItem(fid);
        currentFid = fid;

        renderBreadcrumb(fid);
        renderPageNav(fid);
        document.title = pageName(fid) + " - " + documentTitle;
        pageArea.scrollTop = 0;
    }

    linkAreaToggle.addEventListener("change", function () {
        setLinkAreasVisible(linkAreaToggle.checked);
        saveLinkAreasPreference(linkAreaToggle.checked);
    });
    setLinkAreasVisible(readLinkAreasPreference());

    pageArea.addEventListener("click", function (event) {
        var frame = event.target.closest(".page-frame");
        if (!frame || event.target.closest(".link-area")) return;
        flashLinkAreas(frame);
    });

    document.querySelector(".page-tree").addEventListener("click", function (event) {
        if (event.target.closest(".tree-link")) {
            setSidebarOpen(false);
            return;
        }
        var toggle = event.target.closest(".tree-toggle");
        if (!toggle) return;
        var item = toggle.closest(".tree-item");
        setExpanded(item, item.classList.contains("is-collapsed"));
    });

    sidebarToggle.addEventListener("click", function () {
        setSidebarOpen(!body.classList.contains("is-sidebar-open"));
    });

    narrowLayout.addEventListener("change", function () {
        setSidebarOpen(false);
    });

    window.addEventListener("hashchange", showPageFromHash);
    showPageFromHash();
})();
