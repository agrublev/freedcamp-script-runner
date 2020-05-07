const http = require("http");
const open = require("open");
const destroyer = require("server-destroy");
const fs = require("fs");
const path = require("path");
const { readJson } = require("../utils/helpers.js");
const scriptsDir = process.cwd();
const rootDir = path.join(scriptsDir, "./");
const packagePath = path.join(rootDir, "package.json");

const serverConfig = async () => {
    let index = await fs.readFileSync(path.resolve(__dirname, "./index.html"), "utf-8");

    return new Promise((resolve) => {
        const server = http
            .createServer(async (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Request-Method", "*");
                res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
                res.setHeader("Access-Control-Allow-Headers", "*");

                const headers = {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "text/json",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                    "Access-Control-Max-Age": 2592000 // 30 days
                };
                if (req.method === "POST") {
                    res.writeHead(200, headers);

                    let body = "";
                    req.on("data", (chunk) => {
                        body += chunk.toString(); // convert Buffer to string
                    });
                    req.on("end", () => {
                        res.end(JSON.stringify({ done: true }));
                        server.destroy();
                        resolve(JSON.parse(body));
                    });
                } else {
                    res.end(index);
                }
            })
            .listen(5252, () => {
                // open the browser to the authorize url to start the workflow
                open("http://localhost:5252", { wait: false }).then((cp) => cp.unref());
            });
        destroyer(server);
    });
};

async function main() {
    const config = await serverConfig();
    const packageJson = await readJson(packagePath);
    let configFile = path.resolve(rootDir, "config.json");
    if (packageJson.fscripts) {
        if (packageJson.fscripts.config) {
            configFile = path.resolve(rootDir, packageJson.fscripts.config);
        }
    }
    await fs.writeFileSync(configFile, JSON.stringify(config, null, 4), "utf-8");
}

module.exports = main;
