const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './web/index.tsx',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.[contenthash].js',
    library: 'app',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
      // dumb workaround for the init-in-html-instead-of-in-index.tsx
      inject: 'head',
      scriptLoading: 'blocking',
    }),
    new CopyPlugin({
      patterns: [{ from: './web/main.css', to: 'main.css' }],
    }),
  ],

  // Enable sourcemaps for debugging webpack's output.
  devtool: 'source-map',

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader' }],
        exclude: /node_modules/,
      },
    ],
  },
};
