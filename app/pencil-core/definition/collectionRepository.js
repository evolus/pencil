'use strict';

const STENCILS_REPO_URL = "http://127.0.0.1:8080/collections.xml";

var CollectionRepository = {
};

CollectionRepository.loadCollections = function() {
    return new Promise(function(resolve, reject) {

        var nugget = require("nugget");
        var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true }).name;
        var filename = "repository-" + new Date().getTime() + ".xml";

        console.log('Downloading', STENCILS_REPO_URL, 'to', tempDir, filename);
        var nuggetOpts = {
            target: filename,
            dir: tempDir,
            resume: true,
            verbose: true
        };

        nugget(STENCILS_REPO_URL, nuggetOpts, function (errors) {
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

    console.log("parsing dom", dom.documentElement);
    var collectionNode = dom.documentElement;
    Dom.workOn("./p:Collection", collectionNode, function (node) {
        collections.push(CollectionRepository.parseCollection(node));
    });

    return collections;
};

CollectionRepository.parseCollection = function(collectionNode) {
    var collection = {};

    console.log("parsing collection");
    Dom.workOn("./p:*", collectionNode, function (node) {
        console.log("node", node.localName, Dom.getText(node));
        collection[_.snakeCase(node.localName)] = Dom.getText(node);
    });

    return collection;
}
