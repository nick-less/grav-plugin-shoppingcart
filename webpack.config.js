const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	mode : "development",
	entry : './src/js/shoppingcart.js',
	output : {
		filename : 'js/shoppingcart.js',
		path : path.resolve(__dirname, 'dist/grav-plugin-shoppingcart'),
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
		filename : '[name].css'
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
};