/**
 * Tool: use_skill
 * Follows classic Pencil prototype pattern (BaseExporter style).
 * Loads and returns the full markdown instructions of a specified skill.
 */

var fs = require("fs");
var path = require("path");
var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

function UseSkillTool(options) {
    options = options || {};
    this.kbDir = options.kbDir || path.join(__dirname, "../kb");

    BaseTool.call(
        this,
        "use_skill",
        "Loads and activates a skill by name. Returns the complete skill workflow instructions.",
        {
            skill_name: z.string().describe("The name of the skill to activate (e.g., 'pencil_designer').")
        }
    );
}
UseSkillTool.prototype = new BaseTool();

UseSkillTool.prototype._normalizeSkillName = function (name) {
    if (!name) return "";
    return name.trim().toLowerCase().replace(/_/g, "-");
};

UseSkillTool.prototype.execute = async function (args, context) {
    if (!args || !args.skill_name) {
        throw new Error("Missing required argument: 'skill_name'");
    }

    var requestedName = args.skill_name.trim();
    var normalized = this._normalizeSkillName(requestedName);
    var skillsDir = path.join(this.kbDir, "skills");

    var targetFile = null;
    var matchedDir = null;

    if (fs.existsSync(skillsDir)) {
        var entries = fs.readdirSync(skillsDir);
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var entryNorm = this._normalizeSkillName(entry);

            if (entryNorm === normalized || entry === requestedName) {
                var candidate = path.join(skillsDir, entry, "SKILL.md");
                if (fs.existsSync(candidate)) {
                    targetFile = candidate;
                    matchedDir = entry;
                    break;
                }
            }
        }
    }

    if (!targetFile) {
        throw new Error("Skill '" + requestedName + "' not found in knowledge base.");
    }

    var content = fs.readFileSync(targetFile, "utf8");

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    skill: requestedName,
                    instructions: content
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    UseSkillTool: UseSkillTool
};
