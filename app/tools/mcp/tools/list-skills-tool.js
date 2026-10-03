/**
 * Tool: list_skills
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Discovers and lists all agent skills available in the MCP knowledge base.
 */

var fs = require("fs");
var path = require("path");
var BaseTool = require("./base-tool.js").BaseTool;

function ListSkillsTool(options) {
    options = options || {};
    this.kbDir = options.kbDir || path.join(__dirname, "../kb");

    BaseTool.call(
        this,
        "list_skills",
        "Lists all available skill names and summaries exposed by the Pencil MCP server.",
        {}
    );
}
ListSkillsTool.prototype = new BaseTool();

ListSkillsTool.prototype._parseFrontmatter = function (content) {
    var meta = {};
    var match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return meta;

    var lines = match[1].split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
            var key = line.slice(0, colonIdx).trim();
            var val = line.slice(colonIdx + 1).trim();
            meta[key] = val;
        }
    }
    return meta;
};

ListSkillsTool.prototype.execute = async function (args, context) {
    var skillsDir = path.join(this.kbDir, "skills");
    var skills = [];

    if (fs.existsSync(skillsDir)) {
        var entries = fs.readdirSync(skillsDir);
        for (var i = 0; i < entries.length; i++) {
            var dirName = entries[i];
            var skillFile = path.join(skillsDir, dirName, "SKILL.md");

            if (fs.existsSync(skillFile)) {
                try {
                    var content = fs.readFileSync(skillFile, "utf8");
                    var meta = this._parseFrontmatter(content);
                    var skillName = meta.name || dirName.replace(/-/g, "_");
                    var desc = meta.description || ("Pencil skill for " + dirName);

                    skills.push({
                        name: skillName,
                        description: desc
                    });
                } catch (readErr) {
                    if (context && context.logger) {
                        context.logger.warn("Failed to read skill at " + skillFile + ": " + readErr.message);
                    }
                }
            }
        }
    }

    // Default fallback if no skills directory present
    if (skills.length === 0) {
        skills.push({
            name: "pencil_designer",
            description: "Create graphical user interface design in Pencil file format."
        });
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ skills: skills }, null, 2)
            }
        ]
    };
};

module.exports = {
    ListSkillsTool: ListSkillsTool
};
