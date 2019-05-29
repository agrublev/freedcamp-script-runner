const inquirer = require("inquirer");
inquirer.registerPrompt("fuzzypath", require("inquirer-fuzzy-path"));

(async () => {
    return inquirer.prompt([
        {
            type: "fuzzypath",
            name: "path",
            excludePath: nodePath =>
                nodePath.startsWith("node_modules") ||
                nodePath.startsWith(".git") ||
                nodePath.startsWith(".idea"),
            // excludePath :: (String) -> Bool
            // excludePath to exclude some paths from the file-system scan
            // itemType: "any",
            itemType: "directory" | "file", //'any' |  | 'file'
            // specify the type of nodes to display
            // default value: 'any'
            // example: itemType: 'file' - hides directories from the item list
            // rootPath: "app",
            // rootPath :: String
            // Root search directory
            message: "Select a target directory for your component:",
            // default: "./",
            suggestOnly: false
            // suggestOnly :: Bool
            // Restrict prompt answer to available choices or use them as suggestions
        }
    ]);
})();
