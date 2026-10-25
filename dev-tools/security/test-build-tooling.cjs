'use strict';
// Exercise the actual transitive loaders and worker used by react-scripts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const web = path.resolve(process.env.SECURITY_WEB_APP || path.join(__dirname, '../../desktop/web-app'));
const requireWeb = createRequire(path.join(web, 'package.json'));
const scratch = path.join(web, 'node_modules/.cache/alloflow-security-tests');
fs.mkdirSync(scratch, { recursive: true });

function fixture() {
  // Keep compiler artifacts in its own dependency cache, never public/build.
  return fs.mkdtempSync(path.join(scratch, 'compatibility-'));
}

async function compile(config) {
  const compiler = requireWeb('webpack')({ mode: 'development', devtool: false, ...config });
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => compiler.close((closeError) => {
      if (error || closeError) return reject(error || closeError);
      if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
      resolve(stats);
    }));
  });
}

test('patched serializer preserves build options and cannot inject code through RegExp flags', () => {
  const serialize = requireWeb('serialize-javascript');
  const value = { pattern: /^private_/gi, when: new Date('2026-01-01T00:00:00Z'), callback: function (x) { return x + 1; } };
  const decoded = vm.runInNewContext('(' + serialize(value) + ')');
  assert.equal(decoded.pattern.test('PRIVATE_name'), true);
  assert.equal(decoded.when.toISOString(), value.when.toISOString());
  assert.equal(decoded.callback(2), 3);
  const malicious = /safe/g;
  Object.defineProperty(malicious, 'flags', { value: 'g");globalThis.compromised=true;//' });
  const context = { compromised: false };
  // A serializer may safely reject a forged built-in object or ignore its spoofed property.
  let encoded;
  try { encoded = serialize(malicious); } catch (error) { assert.ok(error instanceof Error); return; }
  try { vm.runInNewContext(encoded, context); }
  catch (error) { assert.equal(error.name, 'SyntaxError'); }
  assert.equal(context.compromised, false);
});

test('production minifier worker still receives RegExp options and source maps', { timeout: 60000 }, async () => {
  const { terser } = requireWeb('rollup-plugin-terser');
  const plugin = terser({ numWorkers: 1, mangle: { properties: { regex: /^private_/ } }, format: { comments: /keep/ } });
  const result = await plugin.renderChunk.call(plugin,
    '/* keep */ const record = {private_value: 7}; module.exports = record.private_value;',
    { fileName: 'fixture.js' }, { format: 'cjs', sourcemap: true });
  const context = { module: { exports: null } };
  vm.runInNewContext(result.code, context);
  assert.equal(context.module.exports, 7);
  assert.match(result.code, /keep/);
  assert.ok(result.map);
});

test('SVG loader retains CRA default URLs, ReactComponent exports, title, ref and viewBox', async () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>');
  fs.writeFileSync(path.join(dir, 'entry.js'), 'import url, {ReactComponent} from "./icon.svg"; export {url, ReactComponent};');
  const previousDirectory = process.cwd();
  const previousEnvironment = process.env.NODE_ENV;
  let rule;
  try {
    process.chdir(web);
    process.env.NODE_ENV = 'production';
    const config = requireWeb('react-scripts/config/webpack.config')('production');
    rule = config.module.rules.flatMap((entry) => entry.oneOf || [])
      .find((entry) => entry.test instanceof RegExp && entry.test.test('icon.svg'));
  } finally {
    process.chdir(previousDirectory);
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
  assert.ok(rule, 'The shipped CRA SVG rule must still exist');
  await compile({ context: dir, entry: './entry.js', target: 'node',
    resolve: { modules: [path.join(web, 'node_modules'), 'node_modules'] },
    module: { rules: [rule] },
    output: { path: path.join(dir, 'output'), filename: 'bundle.cjs', library: { type: 'commonjs2' }, publicPath: '/assets/' } });
  const result = require(path.join(dir, 'output/bundle.cjs'));
  assert.match(result.url, /^\/assets\/static\/media\/icon\.[a-f0-9]+\.svg$/);
  assert.equal(result.ReactComponent.$$typeof, Symbol.for('react.forward_ref'));
  const markup = requireWeb('react-dom/server').renderToStaticMarkup(
    requireWeb('react').createElement(result.ReactComponent, { title: 'Accessible fixture', 'aria-label': 'Fixture icon' }));
  assert.match(markup, /viewBox="0 0 10 10"/);
  assert.match(markup, /<title[^>]*>Accessible fixture<\/title>/);
  assert.match(markup, /aria-label="Fixture icon"/);
});

test('CSS URL loader resolves assets relative to original source-map paths', async () => {
  const dir = fixture();
  const original = path.join(dir, 'styles/source.scss');
  fs.mkdirSync(path.dirname(original));
  fs.writeFileSync(path.join(dir, 'styles/icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  fs.writeFileSync(path.join(dir, 'entry.css'), '.example { background: url("./icon.svg"); }');
  fs.writeFileSync(path.join(dir, 'source-map-loader.cjs'),
    'module.exports = function(source) { this.callback(null, source, ' +
    JSON.stringify({ version: 3, file: 'entry.css', sources: [original], names: [], mappings: 'AAAA', sourcesContent: ['.example { background: url("./icon.svg"); }'] }) + '); };');
  await compile({ context: dir, entry: './entry.css', target: 'node',
    module: { rules: [
      { test: /\.css$/, use: [
        { loader: requireWeb.resolve('css-loader'), options: { sourceMap: true, esModule: false } },
        { loader: requireWeb.resolve('resolve-url-loader'), options: { sourceMap: true } },
        { loader: path.join(dir, 'source-map-loader.cjs') },
      ] },
      { test: /\.svg$/, type: 'asset/resource' },
    ] },
    output: { path: path.join(dir, 'output'), filename: 'bundle.cjs', library: { type: 'commonjs2' }, publicPath: '/assets/' } });
  const css = require(path.join(dir, 'output/bundle.cjs')).toString();
  assert.match(css, /background:\s*url\(\/assets\/[a-f0-9]+\.svg\)/);
  assert.equal(fs.readdirSync(path.join(dir, 'output')).filter((name) => name.endsWith('.svg')).length, 1);
});
