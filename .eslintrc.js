module.exports = {
	globals: {
		importScripts: true
	},
	env: {
		browser: true,
		node: true,
		es6: true
	},
	parserOptions: {
		ecmaVersion: 6,
		sourceType: "module"
	},
	rules: {
		"no-console": ["off"],
		camelcase: [
			1,
			{
				properties: "always"
			}
		],
		complexity: ["warn", 5],
		"max-nested-callbacks": ["warn", 8],
		"no-unused-vars": "warn",
		"max-statements": [
			"warn",
			{
				max: 4
			}
		],
		"max-statements-per-line": [
			"warn",
			{
				max: 1
			}
		],
		"getter-return": "warn",
		"jsx-quotes": ["warn", "prefer-double"]
	},
	extends: ["prettier", "eslint:recommended"]
};
