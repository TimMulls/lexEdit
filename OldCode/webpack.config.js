'use strict';

const path = require('path');
const glob = require('glob')
//const os = require('os');
const pkg = require("./package.json");
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
//const {InjectManifest} = require('workbox-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PurgeCSSPlugin = require('purgecss-webpack-plugin');

const date = (new Date());
const bannerText = `
LexEdit - HTML5 Template Editor v${pkg.version}
Copyright(c) 2010-2025 Lexinet Corporation.  All rights reserved.
Licensed under the Lexinet Commercial License. Unauthorized use is prohibited.
Date: ${date}`;

const PROJECT_ROOT = path.resolve(__dirname, '../');

const PATHS = {
    src: path.join(__dirname, 'src'),
    semantic: path.join(__dirname, 'semantic')
}

const purgePaths = [].concat(
    glob.sync(`${PATHS.src}/**/* `, { nodir: true }),
    glob.sync(`${PATHS.semantic}/**/* `, { nodir: true })
)

module.exports = {
    //parallelism: 1,
    bail: true,
    //mode: "production", // "production" | "development" | "none"   Chosen mode tells webpack to use its built-in optimizations accordingly.
    //devtool: 'inline-source-map',  // generate source map
    target: 'web', // The environment in which the bundle should run changes chunk loading behavior, available external modules and generated code style
    entry: {
        index: {
            import: './src/index.ts',
        }
    },
    output: {
        library: {
            type: 'umd',
            name: 'LexEdit',
            export: 'default',
            umdNamedDefine: true,
        },
        globalObject: 'this',
        filename: '[name].bundle.js',        
        path: 'C:\\inetpub\\lexDNN8\\WebSite\\DesktopModules\\LexinetCustMod\\WebControls\\lexEdit2\\dist\\',
        publicPath: '/DesktopModules/LexinetCustMod/WebControls/lexEdit2/dist/',
        assetModuleFilename: 'assets/[name][ext]'
    },
    /*
    performance: {
        hints: "warning", // enum
        maxAssetSize: 200000, // int (in bytes),
        maxEntrypointSize: 400000, // int (in bytes)
        assetFilter: function (assetFilename) {
            // Function predicate that provides asset filenames
            return assetFilename.endsWith('.css') || assetFilename.endsWith('.js');
        }
    },
    */
    optimization: {
        chunkIds: "deterministic",
        // method of generating ids for chunks
        moduleIds: "deterministic",
        // method of generating ids for modules
        mangleExports: "deterministic",
        // rename export names to shorter names

        emitOnErrors: true,
        mangleWasmImports: true,
        removeAvailableModules: true,
        flagIncludedChunks: true,
        concatenateModules: true,
        splitChunks: {
            chunks: 'all',
            minSize: 20000,
            minRemainingSize: 0,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            enforceSizeThreshold: 50000,
            cacheGroups: {
                styles: {
                    name: 'styles',
                    test: /\.css$/,
                    chunks: 'all',
                    enforce: true
                },
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    //chunks: 'all'
                    priority: -10,
                    reuseExistingChunk: true,
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                    //enforce: true,
                    filename: '[name].bundle.js'
                }
            }
        },
        minimize: true, // minimize the output files
        minimizer: [new TerserPlugin({
            parallel: true,
            terserOptions: {
                mangle: true
            }
        })],
    },
    externals: {
        'canvas-prebuilt': 'undefined',
        'canvas': 'undefined',
        'jsdom/lib/jsdom/utils': JSON.stringify({ Canvas: null }),
        'jsdom/lib/jsdom/living/generated/utils': JSON.stringify({ implForWrapper: null }),
        'jsdom': 'null',
        'xmldom': JSON.stringify({ DOMParser: null }),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    // disable type checker - we will use it in fork plugin
                    transpileOnly: true
                }
            },
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                ],
            },
            // this handles images
            {
                test: /\.jpe?g$|\.gif$|\.cur$|\.ico$|\.png$|\.svg$/,
                type: 'asset/resource',
                generator: {
                    filename: 'img/[name].[ext]'
                }
            },

            // the following rules handle font extraction
            /*
                        {
                            test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                            type: 'asset/inline',
                        },
            */

            {
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[hash][ext][query]'
                }
            },

        ]
    },
    resolve: {
        // options for resolving module requests
        // (does not apply to resolving of loaders)
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        // directories where to look for modules (in order)
        extensions: ['.ts', '.tsx', '.js', '.json', '.jsx'],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.BannerPlugin(bannerText),
        new webpack.EnvironmentPlugin({
            AppVersion: pkg.version
        }),
        /*
        new webpack.ProgressPlugin({
            activeModules: true // display the current module
        }),
        */
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
        }),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: '[name].css',
            //chunkFilename: '[id].css',
        }),

        new PurgeCSSPlugin({
            paths: purgePaths,
            only: ['bundle', 'vendor']
        }),

        /*
        new WorkboxPlugin.GenerateSW({
            swDest: 'service-worker.js',
            // these options encourage the ServiceWorkers to get in there fast
            // and not allow any straggling "old" SWs to hang around
            clientsClaim: true,
            skipWaiting: true,
            maximumFileSizeToCacheInBytes: 3000000
        }),
        */
        /*
        new InjectManifest({
            swSrc: './src/sw.js',
            swDest: 'sw.js',
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        }),
        */

        new ForkTsCheckerWebpackPlugin({
            typescript: {
                enabled: true,
                ignoreDiagnostics: [2339, 7053, 2554, 2345, 6133, 2694, 2362, 2551, 2322, 2740, 7030, 2564, 2532, 2367],
                configFile: path.resolve(PROJECT_ROOT, './tsconfig.json'),
                configOverwrite: {
                    compilerOptions: {
                        sourceMap: false,
                        skipLibCheck: true,
                        inlineSourceMap: false,
                        declarationMap: false,
                        noEmit: true,
                        incremental: false,
                    },
                },
                profile: true,
            },
            async: false,
            typescript: {
            }
        })
    ]
};