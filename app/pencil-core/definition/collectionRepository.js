'use strict';

const STENCILS_REPO_URL = "https://raw.githubusercontent.com/mbrainiac/stencils-repository/master/repository.xml";

var CollectionRepository = {
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
                    Dialog.error(`Can not download stencil reposiroty file: ${error.message}`);
                    return reject(error);
                }
                Dialog.error(`Failed to download reposiroty at ${url}`);
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
            var collections = CollectionRepository.parse(dom, url);

            return callback(collections);
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

    Dom.workOn("./p:collection", collectionsNode, function (node) {
        collections.push(CollectionRepository.parseCollection(node));
    });

    //the one with uppercase "C" is intended for newer version with support for version checking
    Dom.workOn("./p:Collection", collectionsNode, function (node) {
        var minVersion = node.getAttribute("required-version");
        if (minVersion) {
            if (Util.compareVersion(pkgInfo.version, minVersion) < 0) return;
        }
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

    return collections;
};

CollectionRepository.parseCollection = function(collectionNode) {
    var collection = {};

    Dom.workOn("./*", collectionNode, function (node) {
        collection[_.camelCase(node.localName)] = Dom.getText(node);
    });

    return collection;
}
