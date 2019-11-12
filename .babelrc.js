module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                targets: {
                    node: "8"
                }
            }
        ]
    ],
    plugins: ["@babel/plugin-transform-runtime"]
    // 	[
    // 		"@babel/plugin-proposal-decorators",
    // 		{
    // 			legacy: true
    // 		}
    // 	],
    // 	["@babel/plugin-syntax-class-properties"],
    // 	[
    // 		"@babel/plugin-proposal-class-properties",
    // 		{
    // 			loose: true
    // 		}
    // 	],
    // ]
};
