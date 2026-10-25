'use strict';

// Retain CRA's compiler, environment, proxy and browser helpers while using
// the supported webpack-dev-server API instead of CRA's removed v4 hooks.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';
const fs = require('node:fs');
const { createRequire } = require('node:module');
const requireTool = createRequire(require.resolve('react-scripts/package.json'));
require('react-scripts/config/env');
const paths = require('react-scripts/config/paths');
const { createDevServerConfig, httpsConfig } = require('./dev-server-config.cjs');

async function start() {
  const host = process.env.HOST || '127.0.0.1';
  const requestedPort = process.env.PORT || '3000';
  if (!/^\d+$/.test(requestedPort) || Number(requestedPort) < 1 || Number(requestedPort) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  if (!requireTool('react-dev-utils/checkRequiredFiles')([paths.appHtml, paths.appIndexJs])) {
    throw new Error('The application entry point or public/index.html is missing.');
  }
  const { choosePort, createCompiler, prepareProxy, prepareUrls } = requireTool('react-dev-utils/WebpackDevServerUtils');
  await requireTool('react-dev-utils/browsersHelper').checkBrowsers(paths.appPath, process.stdout.isTTY);
  const port = await choosePort(host, Number(requestedPort));
  if (port === null) throw new Error('The development port is unavailable. Set PORT to an unused port.');
  const https = httpsConfig(paths);
  const urls = prepareUrls(https ? 'https' : 'http', host, port, paths.publicUrlOrPath.slice(0, -1));
  const manifest = require(paths.appPackageJson);
  const proxy = prepareProxy(manifest.proxy, paths.appPublic, paths.publicUrlOrPath);
  const options = createDevServerConfig({ paths, proxy, https, requireTool });
  const compiler = createCompiler({ appName: manifest.name,
    config: require('react-scripts/config/webpack.config')('development'), urls,
    useYarn: fs.existsSync(paths.yarnLockFile), useTypeScript: fs.existsSync(paths.appTsConfig), webpack: requireTool('webpack') });
  const Server = requireTool('webpack-dev-server');
  const server = new Server({ ...options, host, port, setupExitSignals: false }, compiler);
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    try {
      await server.stop();
      await new Promise((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  if (process.env.CI !== 'true') process.stdin.once('end', close);
  try { await server.start(); }
  catch (error) { await close(); throw error; }
  console.log('AlloFlow development preview: ' + urls.localUrlForBrowser);
  requireTool('react-dev-utils/openBrowser')(urls.localUrlForBrowser);
  return { server, compiler, close };
}

if (require.main === module) start().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };
