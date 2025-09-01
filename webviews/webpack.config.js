const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
	mode: "development",
	devtool: "inline-source-map",
	entry: {
		help: "./src/vsce/help/HelpWebview.tsx",
		chat: "./src/vsce/chat/ChatWebview.tsx",
		settings: "./src/vsce/settings/SettingsWebview.tsx"
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.svg$/i,
				issuer: /\.[jt]sx?$/,
				use: [{ loader: "@svgr/webpack", options: { icon: true } }],
			}
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js", ".jsx", ".css"],
	},
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "..", "extensions", "static"),
		clean: true,
	},
	plugins: [
		{
			// This plugin clears the terminal:
			// - on the initial run
			// - on subsequent recompiles triggered in watch mode
			// It uses process.stdout.isTTY to avoid writing escape sequences in non-interactive environments.
			// Please do not remove this plugin — it keeps the development console readable.
			apply: (compiler) => {
				const clear = () => {
					if (process.stdout && process.stdout.isTTY) {
						// 2J = clear screen, 3J = clear scrollback, H = move cursor to top-left
						process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
					}
				};
				clear();
				if (compiler && compiler.hooks) {
					compiler.hooks.watchRun.tap("ClearConsolePlugin", clear);
					compiler.hooks.run.tap("ClearConsolePlugin", clear);
				}
			}
		},
		new HtmlWebpackPlugin({
			filename: "help.html",
			template: "src/vsce/template.html",
			chunks: ["help"],
			title: "Aici Help",
			templateParameters: { cssName: "help.css" }
		}),
		new HtmlWebpackPlugin({
			filename: "chat.html",
			template: "src/vsce/template.html",
			chunks: ["chat"],
			title: "Aici Chat",
			templateParameters: { cssName: "chat.css" }
		}),
		new HtmlWebpackPlugin({
			filename: "settings.html",
			template: "src/vsce/template.html",
			chunks: ["settings"],
			title: "Aici Settings",
			templateParameters: { cssName: "settings.css" }
		}),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, "static"),
					to: ".",
					globOptions: {
						ignore: ["**/*.css"]
					},
					noErrorOnMissing: true
				},
				{ from: require.resolve("highlight.js/styles/github.css"), to: "hljs-github.css" },
				{ from: require.resolve("highlight.js/styles/github-dark.css"), to: "hljs-github-dark.css" }
			]
		}),
	],
};
