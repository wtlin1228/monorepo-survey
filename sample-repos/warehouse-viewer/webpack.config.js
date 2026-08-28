const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }],
  },
  resolve: { extensions: [".ts", ".js"] },
  output: { path: path.resolve(__dirname, "dist"), filename: "bundle.js" },
  plugins: [new HtmlWebpackPlugin({ title: "Warehouse Viewer" })],
};
