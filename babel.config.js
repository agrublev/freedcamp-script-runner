module.exports = {
    presets: [
        "@babel/preset-react",
        [
            "@babel/preset-env",
            {
                useBuiltIns: "entry",
                corejs: "3.2.1",
                loose: true,
                shippedProposals: true,
                targets: {
                    node: "current"
                }
            }
        ]
    ],
    plugins: [
        [
            "@babel/plugin-proposal-decorators",
            {
                legacy: true
            }
        ],
        [
            "module-resolver",
            {
                root: ["./"],
                alias: {
                    "@utils": "./lib/utils"
                }
            }
        ],
        ["@babel/plugin-syntax-class-properties"],
        "@babel/plugin-proposal-export-default-from",
        "@babel/plugin-transform-runtime"
    ]
};
