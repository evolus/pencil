
var RECORD = new RegExp('<div[^>]*id="cc_record_listing"[^>]*>((?:(?!<div[^>]*style=""[^>]*><br[^>]*clear="all").)*)', 'g');

var FILE_INFO = ('<table[^>]*id="cc_file_info"[^>]*>((?:(?!<div[^>]*id="cc_action_buttons"[^>]*>).)*)');
var NAME = ('<td[^>]*colspan="2"[^>]*>[^<]*<h2>[^<]*<span[^>]*class=""[^>]*>[^<]*<a[^>]*>([^<]*)<');
var AUTHOR = ('<th>by\:<\/th>(?:(?!class="cc_user_link").)*class="cc_user_link">([^>]*)<');
var LICENSE = ('<th>license\:<\/th>(?:(?!<a).)*(?:(?!href=").)*href="([^"]*)"[^>]*>(?:(?!src=").)*src="([^"]*)"[^>]*>');
var DESC = ('<td[^>]*class="cc_search_result_info"[^>]*>((?:(?!<\/td>).)*)<\/td>');

var IMAGE_INFO = ('<div[^>]*class="cc_file_download_popup"[^>]*>((?:(?!<\/div>).)*)<\/div>');
var IMAGE_TYPE = ('<a(?:(?!type=).)*type="(.[^"]*)"');
var IMAGE_SRC = ('<a(?:(?!href=).)*href="(.[^"]*)"');
var IMAGE_SIZE = /<a[^>]*>[^\(]*\(([^\)]*)\)/;

function OpenClipartSearch() {

    this.title = "OpenClipart.org";
    this.name = "OpenClipart.org";
    this.uri = "http://openclipart.org/";
    this.icon = "data:image/png;base64," +
                "iVBORw0KGgoAAAANSUhEUgAAAEsAAAAyCAYAAAAUYybjAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz" +
                "AAAI4gAACOIB4F0inAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAA0qSURB" +
                "VGiBzZt7cFRVnsc/997udKc7jyZPYogKwiyOQRAcn4TZoVZHwKlxgFkliaVWjbrKOOs/u05Z7sPd" +
                "2kLL2kLGdYfVYsoqwxuhJgNr4YCgSBBKYSQiSgigREhCukl3Hp2+j3P2j9uddHc66U7S0f1W3Uqf" +
                "c8/jd7/3/H73d37nF0VKSZZRAZSPsY8KiLjyc8DiaF0zsBc4BvSMYUwdOA1k7QGVLJKlAPuAm8fQ" +
                "PgdwA5oQQunp6dG9Xm/E4XDkR+/HIOMuHYgA5miDSymlEMJoaWmpnz179oExPktqgbNI1hJgE+Ab" +
                "7wCWZXHx4kV8Ph8+37iHSUAwGPzE5/MtlFJGJjqWmg2BoljMBIgC0DSNkpISWltb6ejoyIpQubm5" +
                "1wIzFUXRJjpWNslS0jdJD5fLhaZptLW1EYlMeDEAOMvKyvKByokO5MiCMCNDClDG9j40RTCl/X26" +
                "TjQSOOamYoo7w54KXLcI7ngWlIT3VtjY2LjHsqxOIcTbqqr+ETg1JqFiM2TBZrmAZcA6YFqmnUJH" +
                "jxLYuxfPrFmUrVqVcC/c9hlf/Ps8XBpUl41RmoffgxvuGSzquk5zczMAt9xyi6WqagCwgBPAZuA9" +
                "ICOdH+/KUoAa4DfRv26gIF2n8NmzdDQ00LFxI+GzZ4eEKC6m6N57h8oFU3H6Kol0f0ufAV7nGCS7" +
                "2grcM9JdDSiN/l4C/AQIAf3YX/LtwCEgnKrzWMmqBv4OWI69oorSdTCuXKFz61Y6GhoIHT2ass3l" +
                "N99MJMtbRMmdj3L53f8gEB4jWWODO3oB/Ar4W2AAaAd2An8E/hJrnIlBqQReAM4B7wNPYzueIxJl" +
                "9ffTuXkzzcuW0XTNNbQ888yIRAH4d+/GDAYHy4rmpPjuxwC4Gp6gVyn7sCLHkKIvk9YFQBm2r/gv" +
                "Usr9hmE0NTU1lcLIK6sAeAhYjU2MDxj1/UrL4ur+/XQ0NNC1axdWb2+GTwNiYICunTuZ+thjg3Wq" +
                "Kx93xY0MXD5NTwQKXBkPlyiXjBAJvQYohLsW4My9A811B5rzZlBGVSxFUZQih8NxW2Vl5T8A/xjf" +
                "OgdYim2HqoE8IDedMD3Hj9PR0EDn5s3o7e3jeyKgY+PGBLKc+aWU1jzJxW3PEgiPn6whSCz9C6T5" +
                "BfT8AUXxoLnm28S5bkd1TE/ZS1EUzeFwzFYUxeXAXjGvAw9g26G0hnrgwgU6Nm6ko6GB/i+/nOhT" +
                "ANB94ACRS5dwXXNNTEp881dwcduzdA+AkKBmxZOzIWU/5sBHmAMf2dNpZTg9K8nJf5R46ySEiFy4" +
                "cOEkMFUFdgG12F+JEYkyAgEurV/PiZoaPp4xg/MvvJA1ogCkEHRu3pxQpzrdeGfciSUhOJC1qVLP" +
                "b3Wi9/w3wkh8JsuyehsaGj4G8lVsY+ZNNYAYGODKjh18/sADHKmo4MxTTxH86CPIfqQCsFUxHo68" +
                "Esr+ejUAgZQf88lAoh2TUprr16+/HLsz7J0ZXV2c++1vubJjR8JXarLRe+IE/adP47nxxsG6/NmL" +
                "UVQHwYiJKcCRzQ1aEhR1CqpzVkKd3+8/Ef3ZowJvkxTu+PKRR7i8YcN3SlQMyatLdeZS8MN7kED3" +
                "JKui5rqN+C2uZVm9x44d+3O0GFKBPwBX4ztZfRn5JJOCjk2bEsqax0fZ4r8HwD/Jqqi5bk8oCyEi" +
                "L7/88ifRYo8KfIvtsQ6i5Be/mFypRsHA+fMEm5oS6nKr5qG6vPTqoFuTN7cjiSzTNHuOHDnSB/RL" +
                "Kc2YBXidONtV9uCDKNqEwz/jRmeSKmouL1Pm2S9wsgy96rgORUuIhsu2trYPo79DMORQbAUGXe6c" +
                "qVPxLV48OVJlgM5t25CGMVhWXXmU/uTXwOSRlayCpmkGDxw48EG0mEBWN5DgYJTX1U2OVBnA6Ooi" +
                "sHdvQl1O8fU48koImxAeNfo+PmiuOxLKUkrr+eef/xz70KQXEjfS64hbXaXLl6Pmpt3tTBqG+Vwe" +
                "H0W31wMQ6M/2bBqaa0FCTTgc/tbv91tAr4wG/eLJ2k2c3dLy8ym+//5sS5Ux/I2NCZtxxeGitOZx" +
                "AAJZdiG0nGoUZcgvl1KaZ86c2RcthmL18WQNAAmfoe9TFa3+frp27Uqo07zF5BRfj25Br569uVLZ" +
                "q507dx6OFlOSBfA7bPsFQNGSJTimTMmeVGNEqu1PycJfAdk19MlkSSnFmjVrvgYMKeXgTMlkHcA+" +
                "xLRv5uRQunJl9qQaI67u24cedySmqBrFt9urfcJBwdiYihctpzqhLhgMxg40Ek7Ak8kSwJ/iK75P" +
                "VZSWRefWrQl1ao4XT9U8zCxFImzDPuRTCiHCJ06cGNziJMydov/vAX+s4Fu0CFdV1cSlGieSHVRH" +
                "XgklP34KyI4qJrsMlmX1v/baa7EYeFqyPiX+dENRKHvooYlLNU6Ejh0j3NIyVKEo+ObcD4pCcACs" +
                "Cepisr2yLCu8e/fubmBASmnE3xsp4LGRuKyW71MVYbihV5xu8mf9GMHEIhGKVo7quC5xro6Oj6M/" +
                "Q8ntRyLrTeIiEXlz5+K96abxSzVBJEciHN4iyhY/A0xMFVNsnEOHDh16P1rMmKxWIBBfUVZbO36p" +
                "JohwSws9n36aUOe94S4URw49ETDECB3TIIXLYLz44ot/wf7QDssFGy3u+D/EuRHltbXJOQTfKcxA" +
                "wrtDzfFQOGcZEtuNGETGyTJKNNg3hEgkcuXs2bM60CelHPYKRiPrbeLYdV9/PYV33ZWhINmDmpND" +
                "5dNPD4uCaO4Ciu98BIhTRWcu3HAvmUB1zkJRhxxuKaU4f/58LOltmArC6Mf3ncAFoDhWUV5XR/Dw" +
                "4RE7ZA2Kgq+mhrK6Osp++csRdxGytBqW/I4+IPKD6bim3wW5aTMKAHAkuQymaXbv2bPnULSYkqx0" +
                "WTSPYgcGPWCHTpoqKpDmJMRIAG91NeV1dZTV1uK+9tpR2xqGQWtrK33REPiMGTOYkoLUyEA7xw7a" +
                "q3JutQc1qku5xa8n2CzDMLq8Xu8SwzBM4DOZgph0iSE7gP8kSpazpISin/4U/549abplDte0aZSt" +
                "WkV5fT15N4+ejmpZFkIIgsEg7e3tg8luiqLgcqU+sjb0wPBKJQctZ15CVU9PT6thGBLoSUUUpCer" +
                "FzgO/E2soryubsJkOXw+SlesoLy+nsJFi1DUkU2nEAIhBL29vXR0dBAKDWmIoijk5XmpqJiK2+1A" +
                "iKFMQSkthBXhQsu6YWNqOfNAGSJXCKGfOnXqvWgxpQpCZilH64DbiJ5WF//852he75hPgFSXi6Kl" +
                "Symvr6d42TLUEVYCgGVZ0jRN+vr65Llz52RnZ6dmWUMnFS6XC5/PR2FhIU6nk0Cgm0CgGyn6kdZF" +
                "hHkR0zjP1St/xjJtOVV16GOewmvv2bBhw5FocUSyMsn8cwKXiTP0p+vrh3nVqUdX8C1aRHl9PaUr" +
                "V+IYJQNZSinC4XB/X19fuLGx8ZOXXnrpM7/fb9XU1Ey/9dZb51RVVV1bWFiolZSUuD0eT0Z5ZcJq" +
                "Q0Q+xzKaKSpsZVqFRFEL8JRuQdGGUgojkchlt9v9M0CXUjaP+DgZpkluAR6MFQLvvsvJpUtHbOyd" +
                "M4fy+nrKV61Kuwk3DCNoWZb+1Vdf7Xv11Vd3v/XWW5exE8w80b8WtgvTv2LFiqm1tbW3zZkzZ3F+" +
                "fn6Voiiq0+ksIE3yr9vtxpPrQJitKNrUBJcB4NKlS/9bWVn5z0CXlPLrEQeSUmZyLZRSBmQUwjDk" +
                "4fJyeQAGr6aqKtn63HOy9+RJmQ6GYYR0Xfe3tbU1rl279mFgQdw1H5gJTMH2A1VsEzAN+GGsncfj" +
                "+dHatWsfPn369Ia+vr6zuq77TdPsTTt5EkzT7HnnnXeejY47ZTQeMiVLkVK2x0/S/eGH8rP77pNf" +
                "Pv64vHrwoJRCjCqUZVn9hmEEurq6Dm/ZsuXXBQUFP0oi6a+wM3kcowpsm4ViYDp2UssCYMHcuXMX" +
                "bt++/TdtbW1/GhgYuKTrul8IEUlHlq7rV+bPn18THWf0uTMkCynlf0kpR2ckCUIIXdf1QCgUOrV/" +
                "//5/mjt37sIkgm7Czix0jUGOeOLATrgrB2YBt8TGrq+vv++DDz74N7/f/7Gu61cMwwgIMfyNhkKh" +
                "k9E+N6adbwzCVUsp/RkQJHRdD/T39399/PjxV5cvX35PEkE3A1WAZzwEpSEvpco6nc5b16xZs6q5" +
                "ufn3vb29X+m63qXrul/Xdf8TTzyxLNquMt34Y82DvwBcl+qGaZpBIUTkm2++ee+NN97Y+corr3wT" +
                "d1tgH4T4GcXpyzYURXFgkxe7nAAzZ87Mufvuu32bNm26EnVEAc5IKUf9r7OxkvWoEGKdqqoFYPsn" +
                "Qgijq6vr6K5du7atXr06/rMrsX2WANAtU+ziv2soipLLEHF5DAUSQkBLOi7G/B8W7e3t/+r1eh/Q" +
                "db334MGD25988skj0ZPbGPqwCQpIKSdnE5kFKIqiYBMGI4RkhvUZj0ZEJ8oHSrANrCSqZjIL/6r2" +
                "/xX/BwSxr+GgTUkRAAAAAElFTkSuQmCC";

    this.baseUri = "http://www.openclipart.org/search/";
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

    debug("OpenClipart: searching '" + query + "'");
    //debug("url: " + url);
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
    var r = {result: [], resultCount: 0};
    if (!response) return r;
    response = response.replace(/[\r\n]+/g, "");
    try {
        var recordRegexp = new RegExp('<div[^>]*class="r-img">(?:(?!<h4><a).)*<h4><a[^>]*>([^<]*)<\/a>(?:(?!<p>by).)*<p>by[^<]*<a[^>]*>([^<]*)</a>(?:(?!<p><a).)*<p><a[^>]*href="([^"]*)[^>]*>', "g");
        var records = recordRegexp.exec(response);
        var resultCount = 0;
        while (records != null) {
            var item = {name: records[1], author: records[2], desc: "", images: [
                {src: records[3], type: "image/svg+xml", typeName: "SVG", size: ""}
            ]};
            var ext = item.images[0].src.match(/\.(png$)|\.(jpg$)|\.(bmp$)/i);
            if (ext) {
                item.images[0].type = "image/png";
                item.images[0].typeName = RegExp.$1.toUpperCase();
            }
            //debug("  -> name: " + item.name + ", author: " + item.author + ", dscription: " + item.desc);
            //debug("    -> imgsrc: " + item.images[0].src + ", imgtype: " + item.images[0].type + ", size: " + item.images[0].size);

            resultCount++;
            r.result.push(item);

            records = recordRegexp.exec(response);
        }
        r.resultCount = resultCount;
    } catch (e) {
        Console.dumpError(e);
    }
    return r;
};

//SearchManager.registerSearchEngine(OpenClipartSearch, false);

