import path from "path";
import chalk from "chalk";
import prompt from "../utils/prompt.js";
import fs from "fs";
import { sync as spawnSync } from "cross-spawn";
import fsrLog from "../utils/console.js";

const packagePath = path.resolve(process.cwd(), "package.json");

const run = (cmd, args) => {
    const result = spawnSync(cmd, args, { stdio: "inherit" });
    if (result.status !== 0) {
        throw new Error(`${cmd} exited with code ${result.status}`);
    }
};

const publish = async () => {
    if (!fs.existsSync(packagePath)) {
        fsrLog.error("Cannot find package.json in the current directory");
        process.exit(1);
    }

    const { name, version } = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    fsrLog.log(chalk.bold(`\nPublishing ${chalk.cyan(name)} @ ${chalk.yellow(version)}\n`));

    // Check npm login status — npm whoami exits non-zero when not logged in.
    const whoami = spawnSync("npm", ["whoami"], { encoding: "utf8" });
    if (whoami.status !== 0) {
        fsrLog.log(chalk.yellow("Not logged in to npm. Running `npm login`...\n"));
        run("npm", ["login"]);
    } else {
        fsrLog.log(chalk.green(`Logged in as: ${whoami.stdout.trim()}\n`));
    }

    const tag = await prompt({
        type: "select",
        message: chalk.green.bold.underline("Which dist-tag?"),
        choices: ["latest", "next", "beta", "alpha"]
    });

    const confirmed = await prompt({
        type: "confirm",
        message: chalk.green.bold.underline(
            `Publish ${chalk.cyan(name)}@${chalk.yellow(version)} with tag ${chalk.magenta(tag)}?`
        ),
        default: false
    });

    if (!confirmed) {
        fsrLog.log(chalk.yellow("Publish cancelled."));
        return;
    }

    run("npm", ["publish", "--tag", tag, "--access", "public"]);

    fsrLog.log(chalk.green.bold(`\nPublished ${name}@${version} → ${tag}\n`));
};

export default publish;

publish();
