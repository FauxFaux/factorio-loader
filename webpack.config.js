const path = require('path');

module.exports = {
  entry: './web/index.tsx',
  output: {
    path: path.join(process.cwd(), 'web'),
    filename: 'bundle.js',
    library: 'app',
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: 'source-map',

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [{ test: /\.tsx?$/, use: [{ loader: 'babel-loader' }], exclude: /node_modules/ }],
  },
};
