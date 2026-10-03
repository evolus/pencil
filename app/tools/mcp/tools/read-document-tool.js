/**
 * Tool: read_document
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Reads domain specification files from the MCP knowledge base with section and line slicing.
 */

var fs = require("fs");
var path = require("path");
var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

function ReadDocumentTool(options) {
    options = options || {};
    this.kbDir = options.kbDir || path.join(__dirname, "../kb");

    BaseTool.call(
        this,
        "read_document",
        "Reads a domain specification document or a specific section from the knowledge base.",
        {
            doc_path: z.string().describe("Path of the document to read (e.g., 'data_types_specification.md', 'output_schema.md', or 'design_tokens_mini.md')."),
            section: z.string().optional().describe("Optional specific heading title to extract (returns only that section)."),
            start_line: z.number().int().positive().optional().describe("Optional starting line number (1-based, inclusive)."),
            end_line: z.number().int().positive().optional().describe("Optional ending line number (1-based, inclusive).")
        }
    );
}
ReadDocumentTool.prototype = new BaseTool();

ReadDocumentTool.prototype._resolvePath = function (inputPath) {
    if (!inputPath || typeof inputPath !== "string") {
        throw new Error("Invalid document path");
    }

    var clean = inputPath.trim().replace(/\\/g, "/");
    // Strip leading /kb/ or kb/
    if (clean.indexOf("/kb/") === 0) {
        clean = clean.slice(4);
    } else if (clean.indexOf("kb/") === 0) {
        clean = clean.slice(3);
    } else if (clean.indexOf("/") === 0) {
        clean = clean.slice(1);
    }

    // Try direct candidate under kbDir
    var directCandidate = path.resolve(this.kbDir, clean);
    var kbRoot = path.resolve(this.kbDir);

    // Prevent directory traversal attacks
    if (directCandidate.indexOf(kbRoot) === 0 && fs.existsSync(directCandidate) && fs.statSync(directCandidate).isFile()) {
        return directCandidate;
    }

    // Try under pencil/ subfolder if not found directly
    var pencilCandidate = path.resolve(this.kbDir, "pencil", clean);
    if (pencilCandidate.indexOf(kbRoot) === 0 && fs.existsSync(pencilCandidate) && fs.statSync(pencilCandidate).isFile()) {
        return pencilCandidate;
    }

    // Try with .md extension if omitted
    if (!/\.md$/i.test(clean)) {
        var withMdCandidate = path.resolve(this.kbDir, clean + ".md");
        if (withMdCandidate.indexOf(kbRoot) === 0 && fs.existsSync(withMdCandidate) && fs.statSync(withMdCandidate).isFile()) {
            return withMdCandidate;
        }

        var pencilWithMd = path.resolve(this.kbDir, "pencil", clean + ".md");
        if (pencilWithMd.indexOf(kbRoot) === 0 && fs.existsSync(pencilWithMd) && fs.statSync(pencilWithMd).isFile()) {
            return pencilWithMd;
        }
    }

    throw new Error("Document not found in knowledge base: " + inputPath);
};

ReadDocumentTool.prototype._extractSection = function (content, sectionTitle) {
    if (!sectionTitle) return content;

    var cleanTitle = sectionTitle.trim().toLowerCase();
    var lines = content.split(/\r?\n/);
    var matchedStart = -1;
    var matchedLevel = -1;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            var level = headingMatch[1].length;
            var text = headingMatch[2].trim().toLowerCase();

            // Strip numbers like "1. Dimension" -> "dimension"
            var textWithoutNum = text.replace(/^\d+[\.\)]\s*/, "");

            if (matchedStart === -1) {
                if (text === cleanTitle || textWithoutNum === cleanTitle || text.indexOf(cleanTitle) !== -1) {
                    matchedStart = i;
                    matchedLevel = level;
                }
            } else {
                // If we've already matched, stop when reaching a heading of equal or higher level
                if (level <= matchedLevel) {
                    return lines.slice(matchedStart, i).join("\n");
                }
            }
        }
    }

    if (matchedStart !== -1) {
        return lines.slice(matchedStart).join("\n");
    }

    throw new Error("Section '" + sectionTitle + "' not found in document");
};

ReadDocumentTool.prototype._sliceLines = function (content, startLine, endLine) {
    if (!startLine && !endLine) return content;

    var lines = content.split(/\r?\n/);
    var start = (startLine && startLine > 0) ? startLine - 1 : 0;
    var end = (endLine && endLine > 0) ? endLine : lines.length;

    if (start >= lines.length) {
        return "";
    }

    return lines.slice(start, end).join("\n");
};

ReadDocumentTool.prototype.execute = async function (args, context) {
    if (!args || !args.doc_path) {
        throw new Error("Missing required argument: 'doc_path'");
    }

    var filePath = this._resolvePath(args.doc_path);
    var content = fs.readFileSync(filePath, "utf8");

    // Slicing pipeline: section first (if specified), then line slicing
    if (args.section) {
        content = this._extractSection(content, args.section);
    }

    if (args.start_line || args.end_line) {
        content = this._sliceLines(content, args.start_line, args.end_line);
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    doc_path: args.doc_path,
                    resolved_file: path.relative(this.kbDir, filePath),
                    content: content
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    ReadDocumentTool: ReadDocumentTool
};
