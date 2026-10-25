#!/usr/bin/env node
'use strict';

// Deliberately local: no npx downloads, dependency changes, builds or deployment.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const CHECKS = Object.freeze([
  Object.freeze(['dev-tools/sync_static_svg_policy.cjs', '--check']),
  Object.freeze(['dev-tools/check_agent_core_mirrors.cjs']),
]);
const NATIVE_SUITES = Object.freeze([
  'tests/mcp_bundle_audit_security.test.cjs',
  'tests/mcp_ace_browser_security.test.cjs',
  'tests/mcp_artifact_source_bytes.test.cjs',
]);
const SUITES = Object.freeze([
  'tests/mcp_security_runner.test.js',
  'tests/mcpb_release_workflow.test.js',
  'tests/mcp_agent_security.test.js',
  'tests/mcp_http_transport.test.js',
  'tests/mcp_configuration_security.test.js',
  'tests/mcp_svg_security.test.js',
  'tests/sanitize_html_dom.test.js',
  'tests/agent_core_pack_media_budgets.test.js',
  'tests/agent_core_pack_validation_budget.test.js',
  'tests/agent_core_media_security.test.js',
  'tests/agent_core_native_pack_media.test.js',
  'tests/mcp_epub_archive_security.test.js',
  'tests/mcp_epub_validation.test.js',
  'tests/mcp_stdio_smoke.test.js',
  'tests/mcp_native_pack.test.js',
  'tests/mcp_illustrated_pack.test.js',
]);
const VITEST = 'node_modules/vitest/vitest.mjs';

function run(args = [], { root = ROOT, spawn = spawnSync, env = process.env, log = console } = {}) {
  let temporary;
  let exitCode = 0;
  const started = Date.now();
  try {
    if (args.length > 1 || args.some(arg => !['--list', '--help'].includes(arg))) {
      throw new Error('Usage: node dev-tools/verify_mcp_security.cjs [--list | --help]');
    }
    if (args.includes('--help')) {
      log.log('Verify static SVG policy, Agent Core mirrors and focused MCP security/compatibility tests.\n'
        + 'Uses installed dependencies and isolated workspace temporary files; no network or deployment.\n'
        + 'Use --list to print the fixed check and test manifest.');
      return 0;
    }
    if (args.includes('--list')) {
      log.log([...CHECKS.map(check => check.join(' ')), ...NATIVE_SUITES, ...SUITES].join('\n'));
      return 0;
    }
    root = fs.realpathSync(root);
    if (!fs.existsSync(path.join(root, VITEST))) {
      throw new Error('Local Vitest is missing. Install the repository dependencies before running this gate.');
    }
    for (const file of [...CHECKS.map(check => check[0]), ...NATIVE_SUITES, ...SUITES]) {
      if (!fs.existsSync(path.join(root, file))) throw new Error('Required verification file is missing: ' + file);
    }
    const temporaryRoot = path.join(root, 'tmp', 'mcp-security');
    fs.mkdirSync(temporaryRoot, { recursive: true });
    temporary = fs.realpathSync(fs.mkdtempSync(path.join(temporaryRoot, 'run-')));
    const relative = path.relative(root, temporary);
    if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
      temporary = undefined; // Never recursively remove a target outside the checkout.
      throw new Error('The MCP security temporary directory must remain inside the checkout.');
    }
    // Keep Vite's temporary files on the workspace filesystem (including on
    // Windows), and keep personal MCP configuration out of protocol fixtures.
    const childEnv = { ...env };
    for (const name of Object.keys(childEnv)) {
      if (/^(?:ALLOFLOW_MCP_.*|ALLOFLOW_DESKTOP_HOME|SANITIZE_ANTI|TMP|TEMP|TMPDIR)$/i.test(name)) delete childEnv[name];
    }
    Object.assign(childEnv, { TMP: temporary, TEMP: temporary, TMPDIR: temporary });
    const commands = [...CHECKS, ['--test', ...NATIVE_SUITES], [VITEST, 'run', ...SUITES, '--maxWorkers=1', '--no-cache']];
    for (const command of commands) {
      log.log('[mcp-security] ' + (command[0] === VITEST ? `${SUITES.length} focused test suites` : command.join(' ')));
      const result = spawn(process.execPath, command, {
        cwd: root, env: childEnv, stdio: 'inherit', shell: false, windowsHide: true,
      });
      if (result.error) throw new Error('Could not run ' + command[0] + ': ' + result.error.message);
      if (result.status !== 0) {
        log.error('[mcp-security] Failed: ' + command[0] + (result.signal ? ' (' + result.signal + ')' : ''));
        exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
        break;
      }
    }
  } catch (error) {
    log.error('[mcp-security] ' + error.message);
    exitCode = 2;
  } finally {
    if (temporary) {
      try { fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
      catch (error) {
        log.error('[mcp-security] Could not clean temporary files at ' + temporary + ': ' + error.message);
        if (!exitCode) exitCode = 2;
      }
    }
  }
  if (!exitCode) log.log(`[mcp-security] All checks passed in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  return exitCode;
}

module.exports = { CHECKS, NATIVE_SUITES, SUITES, VITEST, run };
if (require.main === module) process.exitCode = run(process.argv.slice(2));
