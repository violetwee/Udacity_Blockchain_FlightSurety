const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: ['babel-polyfill', path.join(__dirname, "src/dapp")],
  output: {
    path: path.join(__dirname, "prod/dapp"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/dapp/index.html")
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG || 'debug')
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  resolve: {
    extensions: [".js"],
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve("buffer"),
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url'),
    }
  },
  devServer: {
    static: path.join(__dirname, "dapp"),
    port: 8000,
    // stats: "minimal"
  }
};
