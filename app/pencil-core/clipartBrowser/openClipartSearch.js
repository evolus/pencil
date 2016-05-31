function OpenClipartSearch() {

    this.title = "OpenClipart.org";
    this.name = "OpenClipart.org";
    this.uri = "https://openclipart.org/";
    this.icon = "https://openclipart.org/favicon.ico";

    this.baseUri = "https://openclipart.org/search/json/";
    this.options = {
        page: 1
    };

    this.req = [];
}
OpenClipartSearch.prototype = new SearchEngine();

OpenClipartSearch.prototype.merge = function (o, n) {
    for (var i in n) {
        o[i] = n[i];
    };
    return o;
};

OpenClipartSearch.prototype.buildSearchUri = function (query, options) {
    var url = this.baseUri + "?query=" + query;

    if (options.offset != null && options.limit != null) {
        options.page = (options.offset / options.limit) + 1;
    }

    var param = "";
    for (var i in options) {
        param += "&" + i + "=" + options[i];
    };

    return url + param;
};

OpenClipartSearch.prototype.searchImpl = function(query, options, callback) {
    this.options = this.merge(this.options, options);
    var url = this.buildSearchUri(query, this.options);

    for (var ii = 0; ii < this.req.length; ii++) {
        this.req[ii].abort();
        this.req[ii].onreadystatechange = null;
    }

    this.req = [];
    var thiz = this;

    console.log(`OpenClipart: searching ${query}`);
    WebUtil.get(url, function(response) {
        var r = thiz.parseSearchResult(response);
        if (callback) {
            callback(r.result, r.resultCount);
        }
    }, this.req);
};

OpenClipartSearch.prototype.formatType = function(ty) {
    if (ty) {
        var idx = ty.indexOf("/");
        if (idx != -1) {
            return ty.substring(idx + 1).toUpperCase();
        }
    }
    return Util.getMessage("unknow.type");
};

OpenClipartSearch.prototype.parseSearchResult = function(response) {
    var result = {
        result: [],
        resultCount: 0
    };

    try {
        response = JSON.parse(response);
    } catch (ex) {}

    if (!response || response.msg != "success") { return result; }

    result.resultCount = response.info.results;
    result.pages = response.info.pages;

    _.forEach(response.payload, function(e) {
        var item = {
            name: e.title,
            description: e.description,
            src: e.svg.url,
            type: 'SVG',
            size: e.svg_filesize,
            thumb: e.svg.png_thumb,
            pubDate: e.created,
            link: e.detail_link
        };

        result.result.push(item);
    });

    return result;
};

//SearchManager.registerSearchEngine(OpenClipartSearch, false);
