const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

var dist_path = path.resolve(__dirname, 'dist/grav-plugin-shoppingcart');

	
module.exports = env => ({
	mode : "development",
	entry : './src/js/index.js',
	output : {
		filename : 'js/shoppingcart.js',
		path : (env && env.dist_path? env.dist_path : dist_path),
	},
	module : {
		rules : [ {
			test : /\.s[ac]ss$/i,
			use : [  MiniCssExtractPlugin.loader,
				{
					loader: 'css-loader',
					options: {
						importLoaders: 2,
						sourceMap: true
					}
				},
				
				{
					loader: 'sass-loader',
					options: {
						sourceMap: true
					}
				} ],
		}, 
		],

	},
	plugins : [ new MiniCssExtractPlugin({
		filename : 'css/[name].css'
	}), new CopyPlugin([ {
		from : "*.yaml"
	}, {
		from : "composer.*"
	}, {
		from : "LICENSE"
	}, {
		from : "*.php"
	}, {
		from : "*.md"
	}, {
		from : 'admin',
		to : 'admin'
	}, {
		from : 'pages',
		to : 'pages'
	}, {
		from : 'templates',
		to : 'templates'
	}, {
		from : 'vendor',
		to : 'vendor'
	}, {
		from : 'classes',
		to : 'classes'
	}, ]), ],
});