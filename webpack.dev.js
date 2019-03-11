const webpack = require("webpack");
const path = require("path");

/*
 * SplitChunksPlugin is enabled by default and replaced
 * deprecated CommonsChunkPlugin. It automatically identifies modules which
 * should be splitted of chunk by heuristics using module duplication count and
 * module category (i. e. node_modules). And splits the chunks…
 *
 * It is safe to remove "splitChunks" from the generated configuration
 * and was added as an educational example.
 *
 * https://webpack.js.org/plugins/split-chunks-plugin/
 *
 */

/*
 * We've enabled UglifyJSPlugin for you! This minifies your app
 * in order to load faster and run less javascript.
 *
 * https://github.com/webpack-contrib/uglifyjs-webpack-plugin
 *
 */

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
	entry: "./bin/testme.js",
	module: {
		rules: [
			{
				include: [path.resolve(__dirname, "bin")],
				loader: "babel-loader",

				options: {
					plugins: ["syntax-dynamic-import"],

					presets: [
						[
							"@babel/preset-env",
							{
								modules: false
							}
						]
					]
				},

				test: /\.js$/
			}
		]
	},

	output: {
		path: path.resolve(__dirname, "bin"),
		filename: "built.js"
	},
	node: {
		console: false,
		global: true,
		process: true,
		// __filename: "mock",
		// __dirname: "mock",
		Buffer: true,
		setImmediate: true
		// See "Other node core libraries" for additional options.
	},
	mode: "production"
};
