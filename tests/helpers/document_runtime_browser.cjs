'use strict';
const path = require('node:path');
const { readDocumentRuntime } = require('../../desktop/mcp/remediation_headless_driver.cjs');
const root = path.resolve(__dirname, '../..');
let runtime;

// Standalone document tests need the same host authority as the application.
// Serve only manifest-verified files; do not preload libraries, so lazy-loader
// and large-document self-loading tests still exercise their production paths.
async function installDocumentRuntime(page) {
  runtime ||= readDocumentRuntime(root);
  const boot = 'http://127.0.0.1/app/__document_test__';
  const aliases = new Map();
  for (const record of Object.values(runtime.manifest.assets)) {
    const file = runtime.files.get('/app/' + record.path);
    for (const url of [...(record.aliases || []), ...(record.mirrors || [])
      .filter(m => m.sha384 === record.sha384 && m.bytes === record.bytes).map(m => m.url)]) aliases.set(url, file);
  }
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.href === boot) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Document runtime fixture</title></head><body></body></html>' });
    const file = (url.origin === 'http://127.0.0.1' && !url.search && runtime.files.get(url.pathname)) || aliases.get(url.href);
    if (file) return route.fulfill({ body: file.body, contentType: file.kind === 'wasm' ? 'application/wasm' : 'text/javascript',
      headers: { 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' } });
    if (url.origin === 'http://127.0.0.1') return route.abort();
    return route.continue();
  });
  await page.goto(boot);
  await page.addScriptTag({ content: runtime.source });
  await page.evaluate(manifest => {
    const policy = window._alloInstallRuntimeGraphHost(manifest, window);
    Object.defineProperty(window, '__alloConfigureTrustedScript', { configurable: true,
      value: (script, url, key) => policy.configureScript(script, url, key) });
  }, runtime.manifest);
  for (const file of ['accessibility_evidence_module.js', 'verification_policy_module.js']) {
    await page.addScriptTag({ path: path.join(root, file) });
  }
}
module.exports = { installDocumentRuntime };
