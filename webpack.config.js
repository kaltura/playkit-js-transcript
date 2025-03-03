'use strict';

const webpack = require('webpack');
const path = require('path');
const packageData = require('./package.json');
const {insertStylesWithNonce} = require('@playkit-js/webpack-common');

const plugins = [
  new webpack.DefinePlugin({
    __VERSION__: JSON.stringify(packageData.version),
    __NAME__: JSON.stringify(packageData.name)
  })
];

module.exports = {
  context: __dirname + '/src',
  entry: {
    'playkit-transcript': 'index.ts'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
    library: ['KalturaPlayer', 'plugins', 'transcript'],
    devtoolModuleFilenameTemplate: './transcript/[resource-path]'
  },
  devtool: 'source-map',
  plugins: plugins,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json'
        },
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              attributes: {
                id: `${packageData.name}`
              },
              insert: insertStylesWithNonce
            }
          },
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
                exportLocalsConvention: 'camelCase'
              }
            }
          },
          {
            loader: 'sass-loader'
          }
        ]
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'demo')
    },
    client: {
      progress: true
    }
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    fallback: {stream: require.resolve('stream-browserify')}
  },
  externals: {
    '@playkit-js/kaltura-player-js': 'root KalturaPlayer',
    preact: 'root KalturaPlayer.ui.preact'
  }
};
