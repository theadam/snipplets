'use strict';
var path = require('path');
var webpack = require('webpack');

var plugins = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }),
  new webpack.optimize.OccurenceOrderPlugin()
];

if (process.env.NODE_ENV === 'production') {
  plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        screw_ie8: true,
        warnings: false
      }
    })
  );
}

module.exports = {
  devtool: 'eval-source-map',
  entry: [
    './src/index'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/dist'
  },
  module: {
    loaders: [
      {test: /\.js$/, loaders: ['babel-loader'], exclude: /node_modules/},
      {
        test: /\.css$/,
        loader: "style-loader!css-loader"
      }
    ]
  },
  externals: {
  },
  plugins: plugins,
  resolve: {
    extensions: ['', '.js']
  }
};
