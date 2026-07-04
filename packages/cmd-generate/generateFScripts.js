import { appendToFile, writeFile, boxInform, readJson, readFile, pathExists } from "@fsr/core/utils/helpers.js";
import promptQuestion from "@fsr/core/utils/prompt.js";
import path from "path";
import fsrLog from "@fsr/core/utils/console.js";
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "package.json");

const gen = { scripts: [] };
let mdfile = `# First category of scripts

Welcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.
`;


const fscriptsPath = path.join(projectDir, "fscripts.md");
gen.init = async () => {
    try {
        // Check if fscripts.md already exists
        const exists = await pathExists(fscriptsPath);
        if (exists) {
            const overwrite = await promptQuestion({
                type: "confirm",
                message: "fscripts.md already exists. Do you want to overwrite it?"
            });
            
            if (!overwrite) {
                fsrLog.info("Generation cancelled.");
                return;
            }
        }
        
        gen.packageJson = await readJson(packagePath);
        Object.keys(gen.packageJson.scripts).forEach(scriptName => {
            mdfile += `\n## ${scriptName}\n\n${
                gen.packageJson.scripts[scriptName]
            }\n\n\`\`\`bash\n${gen.packageJson.scripts[scriptName]}\n\`\`\`\n\n`;
        });
        await writeFile(fscriptsPath, mdfile);
        fsrLog.success("fscripts.md generated successfully!");
    } catch (err) {
        fsrLog.error(err);
    }
};

export default gen.init;
