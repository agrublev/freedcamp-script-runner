const walkDependencies = require("./walkDependencies");
const showImpact = require("./showImpact");

function parseName(nameVersion) {
    // TODO: check urls
    let nameVersionStr = String(nameVersion).trim();
    let scope = false;
    if (nameVersionStr[0] === `@`) {
        scope = true;
        nameVersionStr = nameVersionStr.slice(1);
    }
    let [name, versionLoose] = nameVersionStr.split(`@`);
    if (!versionLoose) {
        versionLoose = `latest`;
    }
    if (scope) {
        name = `@${name}`;
    }
    return { name, versionLoose };
}

async function t(dep) {
    const { name, versionLoose } = parseName(dep);
    const tt = await walkDependencies({ [name]: versionLoose });
    // console.warn("-- Console tt", tt);
    showImpact(name, versionLoose, tt).then(e => {
        console.warn("-- Console WHAT", e);
    });
}

t("antd");
