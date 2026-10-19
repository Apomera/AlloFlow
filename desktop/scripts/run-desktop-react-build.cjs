#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..', 'web-app');

/**
 * Keep CRA's production configuration intact while running its two installed
 * minimizers in this process. Each worker otherwise loads another copy of the
 * large application during an already memory-intensive optimization phase.
 *
 * This transform has no environment or module-cache effects and does not mutate
 * its input. The installed plugins keep their configuration in an own `options`
 * data property and implement their methods on the prototype; preserving both
 * also preserves custom minify functions, filters, and all compression options.
 */
function configureDesktopMinimizers(config, { TerserPlugin, CssMinimizerPlugin }) {
  const minimizers = config && config.optimization && config.optimization.minimizer;
  if (!Array.isArray(minimizers)) return config;

  let changed = false;
  const desktopMinimizers = minimizers.map((minimizer) => {
    if (
      !minimizer ||
      (Object.getPrototypeOf(minimizer) !== TerserPlugin.prototype &&
        Object.getPrototypeOf(minimizer) !== CssMinimizerPlugin.prototype)
    ) {
      return minimizer;
    }

    const descriptors = Object.getOwnPropertyDescriptors(minimizer);
    const options = descriptors.options;
    if (!options || !Object.hasOwn(options, 'value') || !options.value) {
      throw new Error('The installed CRA minimizer no longer exposes its options; review the desktop build runner.');
    }
    if (options.value.parallel === false) return minimizer;

    changed = true;
    descriptors.options = {
      ...options,
      value: { ...options.value, parallel: false },
    };
    return Object.create(Object.getPrototypeOf(minimizer), descriptors);
  });

  return changed
    ? { ...config, optimization: { ...config.optimization, minimizer: desktopMinimizers } }
    : config;
}

/** Install the child-process-only CRA factory wrapper, without starting webpack. */
function prepareDesktopReactBuild() {
  if (process.env.REACT_APP_DESKTOP !== '1') {
    throw new Error('The desktop React build runner requires REACT_APP_DESKTOP=1.');
  }
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(APP_ROOT)) {
    throw new Error('Run the desktop React build runner from desktop/web-app.');
  }

  // Match scripts/build.js: production must be selected before env.js, which
  // reads .env.production and clears CRA's cached paths before webpack loads.
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';

  const reactScriptsRoot = path.join(APP_ROOT, 'node_modules', 'react-scripts');
  require(path.join(reactScriptsRoot, 'config', 'env.js'));
  const configPath = require.resolve(path.join(reactScriptsRoot, 'config', 'webpack.config.js'));
  const configFactory = require(configPath);
  const resolveFromConfig = (name) => require(require.resolve(name, { paths: [path.dirname(configPath)] }));
  const minimizerTypes = {
    TerserPlugin: resolveFromConfig('terser-webpack-plugin'),
    CssMinimizerPlugin: resolveFromConfig('css-minimizer-webpack-plugin'),
  };

  require.cache[configPath].exports = function desktopConfigFactory(webpackEnv, ...args) {
    const config = configFactory.call(this, webpackEnv, ...args);
    return webpackEnv === 'production' ? configureDesktopMinimizers(config, minimizerTypes) : config;
  };

  return {
    configPath,
    buildScript: path.join(reactScriptsRoot, 'scripts', 'build.js'),
  };
}

if (require.main === module) {
  try {
    const { buildScript } = prepareDesktopReactBuild();
    // Retain the official CRA compilation, errors, warnings, and output handling.
    require(buildScript);
  } catch (error) {
    console.error('[AlloFlow Desktop] ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { configureDesktopMinimizers, prepareDesktopReactBuild };
