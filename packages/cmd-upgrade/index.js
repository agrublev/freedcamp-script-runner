import upgradePackages from "./upgradePackages.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "upgrade",
    desc: "Upgrade all packages except those listed in 'ignore-upgrade'",
    handler: async () => upgradePackages(),
    menu: true
};
