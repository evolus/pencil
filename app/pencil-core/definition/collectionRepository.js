'use strict';

Config.CORE_COLLECTION_REPO_URL = Config.define("collection.repo.core_repo_urls", "https://raw.githubusercontent.com/evolus/stencils-repository/master/repository.xml");
Config.OUTDATED_COLLECTION_REPO_URL = Config.define("collection.repo.outdated_repo_urls", "https://raw.githubusercontent.com/evolus/stencils-repository/master/repository-outdated.xml");
Config.EXTRA_COLLECTION_REPO_URLS = Config.define("collection.repo.extra_repo_urls", "");

var CollectionRepository = {
};

CollectionRepository.getCollectionRepos = function () {
    var repos = [];

    var core = Config.get(Config.CORE_COLLECTION_REPO_URL);
    if (core) {
        repos.push({
            name: "Official Repository",
            id: "sys:official",
            url: core
        });
    }

    var extras = Config.get(Config.EXTRA_COLLECTION_REPO_URLS);
    if (extras) {
        var untitledCount = 0;
        repos = repos.concat(extras.split(/\|/).map(function (item) {
            if (item.match(/^([^:]+)=(.+)$/)) {
                var name = RegExp.$1;
                var url = RegExp.$2;

                return {
                    name: name,
                    id: name.replace(/[^a-z0-9\-]+/gi, "-").toLowerCase(),
                    url: url
                };
            } else {
                untitledCount ++;
                return {
                    name: "Untitled " + untitledCount,
                    id: "untitled_" + untitledCount,
                    url: item
                };
            }
        }));
    }

    var outdated = Config.get(Config.OUTDATED_COLLECTION_REPO_URL);
    if (outdated) {
        repos.push({
            name: "Outdated Collections",
            id: "sys:outdated",
            url: outdated
        });
    }

    return repos;
};

CollectionRepository.loadCollections = function(url) {
    return QP.Promise(function(resolve, reject) {

        var nugget = require("nugget");
        var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true }).name;
        var filename = "repository-" + new Date().getTime() + ".xml";

        var nuggetOpts = {
            target: filename,
            dir: tempDir,
            resume: true,
            quiet: true
        };

        nugget(url || STENCILS_REPO_URL, nuggetOpts, function (errors) {
            if (errors) {
                var error = errors[0] // nugget returns an array of errors but we only need 1st because we only have 1 url
                if (error.message.indexOf('404') === -1) {
                    Dialog.error(`Can not download stencil repository file: ${error.message}`);
                    return reject(error);
                }
                Dialog.error(`Failed to download repository at ${url}`);
                return reject(error);
            }

            var filepath = path.join(tempDir, filename);
            console.log('repo downloaded', filepath);

            CollectionRepository.parseFile(filepath, (data) => {
                resolve(data);
            });
        });

    });
};
CollectionRepository.parseFile = function(url, callback) {
    try {
        var fs = require('fs');
        fs.readFile(url, 'utf8', function (err, data) {
            if (err) {
                callback();
                return console.log(err);
            }
            var content = data;
            var domParser = new DOMParser();
            var dom = domParser.parseFromString(content, "text/xml");
            var repo = CollectionRepository.parse(dom, url);

            return callback(repo);
        });
    } catch (e) {
        console.error(e);
    }
};

CollectionRepository.parse = function(dom, url) {
    var collections = [];

    var collectionsNode = dom.documentElement;
    var metadata = {};

    Dom.workOn("./p:metadata", collectionsNode, function (node) {
        metadata[node.localName] = Dom.getText(node);
    });

    //the one with uppercase "C" is intended for newer version with support for version checking
    Dom.workOn("./p:Collection", collectionsNode, function (node) {
        var minVersion = node.getAttribute("required-version");
        if (minVersion) {
            if (Util.compareVersion(pkgInfo.version, minVersion) < 0) return;
        }
        collections.push(CollectionRepository.parseCollection(node));
    });

    Dom.workOn("./p:collection", collectionsNode, function (node) {
        collections.push(CollectionRepository.parseCollection(node));
    });

    _.forEach(collections, function(c) {
        var existed = _.find(CollectionManager.shapeDefinition.collections, function(e) {
            return e.id == c.id;
        });
        if (existed) {
            c._installed = true;
        }
    });

    return {
        collections: collections,
        metadata: metadata
    };
};

CollectionRepository.parseCollection = function(collectionNode) {
    var collection = {};

    Dom.workOn("./*", collectionNode, function (node) {
        collection[_.camelCase(node.localName)] = Dom.getText(node);
    });

    return collection;
}
