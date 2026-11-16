#!/usr/bin/env node
'use strict';

/**
 * check_cloud_deploy_parity.cjs
 *
 * Read-only preflight verifying static mirror/config parity across non-Pages
 * cloud surfaces (Firestore rules/indexes, optional Cloud Functions, and
 * Cloudflare Workers) and reporting modified cloud targets that deploy.sh
 * does not publish automatically.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { createWorkerUpload } = require('./cf_worker_upload.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

function stripJsonComments(input) {
  let noComments = '';
  let inString = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') {
        inLineComment = false;
        noComments += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      noComments += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
    }
    noComments += ch;
  }

  // Also strip JSONC trailing commas before '}' or ']' outside strings.
  let out = '';
  inString = false;
  escape = false;
  for (let i = 0; i < noComments.length; i += 1) {
    const ch = noComments[i];
    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < noComments.length && /\s/.test(noComments[j])) j += 1;
      if (noComments[j] === '}' || noComments[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}

function parseActiveKvBindings(tomlText) {
  const bindings = [];
  let inKvBlock = false;
  let current = null;

  for (const rawLine of tomlText.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Strip inline TOML comments outside double-quoted strings.
    let line = '';
    let inQuotes = false;
    let esc = false;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (inQuotes) {
        line += ch;
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inQuotes = false;
      } else {
        if (ch === '#') break;
        if (ch === '"') inQuotes = true;
        line += ch;
      }
    }
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('[')) {
      if (current) {
        bindings.push(current);
        current = null;
      }
      inKvBlock = /^\[\[kv_namespaces\]\]/.test(line);
      if (inKvBlock) current = { binding: '', id: '' };
      continue;
    }

    if (inKvBlock && current) {
      const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/);
      if (m) {
        if (m[1] === 'binding') current.binding = m[2];
        if (m[1] === 'id') current.id = m[2];
      }
    }
  }
  if (current) bindings.push(current);
  return bindings;
}

function defaultGitChangedPaths(rootDir, sinceRef) {
  const changed = new Set();
  const statusOut = cp.execFileSync(
    'git',
    ['status', '--porcelain=v1', '-uall'],
    { cwd: rootDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  for (const rawLine of statusOut.split(/\r?\n/)) {
    if (!rawLine || rawLine.length < 4) continue;
    let rel = rawLine.slice(3).trim();
    if (rel.includes(' -> ')) rel = rel.split(' -> ').pop();
    rel = rel.replace(/^"(.*)"$/, '$1').replace(/\\/g, '/');
    if (rel) changed.add(rel);
  }
  if (sinceRef) {
    const diffOut = cp.execFileSync(
      'git',
      ['diff', '--name-only', `${sinceRef}...HEAD`],
      { cwd: rootDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    for (const rawLine of diffOut.split(/\r?\n/)) {
      const rel = rawLine.trim().replace(/\\/g, '/');
      if (rel) changed.add(rel);
    }
  }
  return [...changed].sort();
}

const CLOUD_TARGETS = [
  {
    id: 'firestore',
    command: 'npx firebase deploy --config desktop/web-app/firebase.live-sessions.json --only firestore:rules,firestore:indexes',
    match: (p) => (
      p === 'firestore.rules' ||
      p === 'firestore.indexes.json' ||
      p === 'desktop/web-app/firestore.rules' ||
      p === 'desktop/web-app/firestore.indexes.json' ||
      p === 'desktop/web-app/firebase.live-sessions.json'
    ),
  },
  {
    id: 'firebase-functions',
    command: 'npx firebase deploy --config desktop/web-app/firebase.functions.json --only functions',
    match: (p) => (
      p === 'desktop/web-app/firebase.functions.json' ||
      p.startsWith('desktop/web-app/functions/')
    ),
  },
  {
    id: 'cloudflare-catalog-worker',
    command: 'node dev-tools/cf_worker.cjs deploy --yes',
    match: (p) => p.startsWith('catalog/cloudflare-worker/'),
  },
  {
    id: 'cloudflare-bug-digest-worker',
    command: 'npx wrangler deploy --config catalog/bug-digest-worker/wrangler.jsonc',
    match: (p) => p.startsWith('catalog/bug-digest-worker/'),
  },
];

function checkBytePair(rootDir, leftRel, rightRel, label, parityErrors, checkedFiles) {
  const leftPath = path.join(rootDir, leftRel);
  const rightPath = path.join(rootDir, rightRel);
  checkedFiles.push(leftRel, rightRel);
  if (!fs.existsSync(leftPath)) {
    parityErrors.push(`${label}: missing ${leftRel}`);
    return;
  }
  if (!fs.existsSync(rightPath)) {
    parityErrors.push(`${label}: missing ${rightRel}`);
    return;
  }
  const leftBuf = fs.readFileSync(leftPath);
  const rightBuf = fs.readFileSync(rightPath);
  if (!leftBuf.equals(rightBuf)) {
    parityErrors.push(`${label}: byte drift between ${leftRel} and ${rightRel}`);
  }
}

function inspectCloudParity(options = {}) {
  const rootDir = path.resolve(options.root || REPO_ROOT);
  const parityErrors = [];
  const checkedFiles = [];

  checkBytePair(
    rootDir,
    'firestore.rules',
    'desktop/web-app/firestore.rules',
    'Firestore rules mirror',
    parityErrors,
    checkedFiles
  );
  checkBytePair(
    rootDir,
    'firestore.indexes.json',
    'desktop/web-app/firestore.indexes.json',
    'Firestore indexes mirror',
    parityErrors,
    checkedFiles
  );
  checkBytePair(
    rootDir,
    'desktop/web-app/functions/web_source_fetch.js',
    'desktop/runtime/web-source-fetch.cjs',
    'Source-fetch safety core mirror',
    parityErrors,
    checkedFiles
  );

  const catalogTomlRel = 'catalog/cloudflare-worker/wrangler.toml';
  const catalogEntryRel = 'catalog/cloudflare-worker/src/index.js';
  const digestConfigRel = 'catalog/bug-digest-worker/wrangler.jsonc';
  const digestEntryRel = 'catalog/bug-digest-worker/src/index.js';
  checkedFiles.push(catalogTomlRel, catalogEntryRel, digestConfigRel, digestEntryRel);

  const catalogTomlPath = path.join(rootDir, catalogTomlRel);
  const catalogEntryPath = path.join(rootDir, catalogEntryRel);
  const digestConfigPath = path.join(rootDir, digestConfigRel);
  const digestEntryPath = path.join(rootDir, digestEntryRel);

  let catalogBugReportsId = null;
  if (!fs.existsSync(catalogTomlPath)) {
    parityErrors.push(`Missing ${catalogTomlRel}`);
  } else {
    const toml = fs.readFileSync(catalogTomlPath, 'utf8');
    const kvBindings = parseActiveKvBindings(toml);
    for (const item of kvBindings) {
      if (!item.binding) {
        parityErrors.push(`${catalogTomlRel} has an active [[kv_namespaces]] block without binding name`);
        continue;
      }
      if (!item.id || /^REPLACE_WITH/i.test(item.id)) {
        parityErrors.push(`${catalogTomlRel} active KV binding ${item.binding} uses placeholder or empty id`);
      }
      if (item.binding === 'BUG_REPORTS') catalogBugReportsId = item.id;
    }
    if (!catalogBugReportsId) {
      parityErrors.push(`${catalogTomlRel} is missing an active BUG_REPORTS KV binding`);
    }
  }

  if (!fs.existsSync(catalogEntryPath)) {
    parityErrors.push(`Missing ${catalogEntryRel}`);
  } else {
    try {
      createWorkerUpload(catalogEntryPath, {
        main_module: 'index.js',
        compatibility_date: '2026-05-04',
        bindings: [],
      });
    } catch (err) {
      parityErrors.push(`Cloudflare catalog worker bundle validation failed: ${err.message}`);
    }
  }

  if (!fs.existsSync(digestEntryPath)) {
    parityErrors.push(`Missing ${digestEntryRel}`);
  }
  if (!fs.existsSync(digestConfigPath)) {
    parityErrors.push(`Missing ${digestConfigRel}`);
  } else {
    try {
      const digestCfg = JSON.parse(stripJsonComments(fs.readFileSync(digestConfigPath, 'utf8')));
      const bugKv = (digestCfg.kv_namespaces || []).find((k) => k && k.binding === 'BUG_REPORTS');
      if (!bugKv || !bugKv.id) {
        parityErrors.push(`${digestConfigRel} is missing BUG_REPORTS kv_namespaces binding`);
      } else if (catalogBugReportsId && bugKv.id !== catalogBugReportsId) {
        parityErrors.push(
          `BUG_REPORTS KV namespace mismatch: ${catalogTomlRel} (${catalogBugReportsId}) !== ${digestConfigRel} (${bugKv.id})`
        );
      }
    } catch (err) {
      parityErrors.push(`Invalid ${digestConfigRel}: ${err.message}`);
    }
  }

  let changedPaths = [];
  if (Array.isArray(options.changedPaths)) {
    changedPaths = options.changedPaths.map((p) => String(p).replace(/\\/g, '/'));
  } else if (options.skipGit !== true) {
    try {
      changedPaths = defaultGitChangedPaths(rootDir, options.since || null);
    } catch (err) {
      parityErrors.push(`Git inspection failed: ${err.message}`);
    }
  }

  const pendingTargets = [];
  for (const target of CLOUD_TARGETS) {
    const files = changedPaths.filter((p) => target.match(p));
    if (files.length) {
      pendingTargets.push({
        target: target.id,
        files,
        command: target.command,
      });
    }
  }

  const requireCleanCloud = options.requireCleanCloud === true;
  const ok = parityErrors.length === 0 && (!requireCleanCloud || pendingTargets.length === 0);

  return {
    ok,
    parityErrors,
    pendingTargets,
    checkedFiles: [...new Set(checkedFiles)],
  };
}

function makeTempFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-cloud-parity-'));
  const files = {
    'firestore.rules': 'rules_version = "2";\nservice cloud.firestore { match /databases/{db}/documents { match /{document=**} { allow read, write: if false; } } }\n',
    'desktop/web-app/firestore.rules': 'rules_version = "2";\nservice cloud.firestore { match /databases/{db}/documents { match /{document=**} { allow read, write: if false; } } }\n',
    'firestore.indexes.json': '{"indexes":[],"fieldOverrides":[]}\n',
    'desktop/web-app/firestore.indexes.json': '{"indexes":[],"fieldOverrides":[]}\n',
    'desktop/web-app/functions/web_source_fetch.js': 'module.exports = { ok: true };\n',
    'desktop/runtime/web-source-fetch.cjs': 'module.exports = { ok: true };\n',
    'catalog/cloudflare-worker/wrangler.toml': 'name = "alloflow-catalog-submit"\n[[kv_namespaces]]\nbinding = "BUG_REPORTS"\nid = "kv-123456"\n# [[kv_namespaces]]\n# binding = "SUBMIT_RATE"\n# id = "REPLACE_WITH_ID"\n',
    'catalog/cloudflare-worker/src/index.js': 'export default { async fetch() { return new Response("ok"); } };\n',
    'catalog/bug-digest-worker/wrangler.jsonc': '{\n  "name": "alloflow-bug-digest",\n  "kv_namespaces": [{ "binding": "BUG_REPORTS", "id": "kv-123456" }],\n  // trailing comma + comment\n}\n',
    'catalog/bug-digest-worker/src/index.js': 'export default { async fetch() { return new Response("ok"); } };\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
  }
  return tmp;
}

function runSelftest() {
  const assert = require('node:assert/strict');
  const tmp = makeTempFixture();
  try {
    // 1. Clean baseline passes (commented REPLACE_WITH_ID ignored)
    const clean = inspectCloudParity({ root: tmp, changedPaths: [] });
    assert.equal(clean.ok, true, 'clean fixture should pass: ' + clean.parityErrors.join('; '));
    assert.deepEqual(clean.parityErrors, []);
    assert.deepEqual(clean.pendingTargets, []);

    // 2. Firestore rules mirror drift fails
    const rulesMirror = path.join(tmp, 'desktop/web-app/firestore.rules');
    const origRules = fs.readFileSync(rulesMirror, 'utf8');
    fs.writeFileSync(rulesMirror, origRules + '// drift\n', 'utf8');
    const drifted = inspectCloudParity({ root: tmp, changedPaths: [] });
    assert.equal(drifted.ok, false, 'drifted firestore rules must fail');
    assert.ok(drifted.parityErrors.some((e) => e.includes('Firestore rules mirror')));
    fs.writeFileSync(rulesMirror, origRules, 'utf8');

    // 3. BUG_REPORTS KV split-brain fails
    const digestPath = path.join(tmp, 'catalog/bug-digest-worker/wrangler.jsonc');
    const origDigest = fs.readFileSync(digestPath, 'utf8');
    fs.writeFileSync(digestPath, origDigest.replace('kv-123456', 'kv-different'), 'utf8');
    const kvMismatch = inspectCloudParity({ root: tmp, changedPaths: [] });
    assert.equal(kvMismatch.ok, false, 'KV split-brain must fail');
    assert.ok(kvMismatch.parityErrors.some((e) => e.includes('BUG_REPORTS KV namespace mismatch')));
    fs.writeFileSync(digestPath, origDigest, 'utf8');

    // 4. Dirty cloud target paths populate pendingTargets with deploy commands
    const pending = inspectCloudParity({
      root: tmp,
      changedPaths: [
        'firestore.rules',
        'catalog/cloudflare-worker/src/index.js',
        'catalog/bug-digest-worker/src/index.js',
      ],
    });
    assert.equal(pending.ok, true, 'advisory mode should remain ok:true unless --require-clean-cloud');
    assert.equal(pending.pendingTargets.length, 3);
    assert.ok(pending.pendingTargets.some((t) => t.target === 'firestore' && t.command.includes('firestore:rules')));
    assert.ok(pending.pendingTargets.some((t) => t.target === 'cloudflare-catalog-worker' && t.command.includes('cf_worker.cjs')));
    assert.ok(pending.pendingTargets.some((t) => t.target === 'cloudflare-bug-digest-worker' && t.command.includes('wrangler.jsonc')));

    const strictPending = inspectCloudParity({
      root: tmp,
      changedPaths: ['catalog/cloudflare-worker/src/index.js'],
      requireCleanCloud: true,
    });
    assert.equal(strictPending.ok, false, '--require-clean-cloud must fail when cloud targets are dirty');

    return { ok: true, checks: 5 };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    const res = runSelftest();
    if (args.includes('--json')) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`Cloud deploy parity selftest passed (${res.checks} checks).`);
    }
    process.exit(0);
  }

  const sinceIdx = args.indexOf('--since');
  const since = sinceIdx >= 0 ? args[sinceIdx + 1] : null;
  const requireCleanCloud = args.includes('--require-clean-cloud');
  const asJson = args.includes('--json');

  const result = inspectCloudParity({ since, requireCleanCloud });
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.parityErrors.length) {
      console.error('Cloud deploy parity errors:');
      result.parityErrors.forEach((e) => console.error(' - ' + e));
    } else {
      console.log(`Cloud mirror & config parity passed (${result.checkedFiles.length} checked files).`);
    }
    if (result.pendingTargets.length) {
      console.log(`Pending non-Pages cloud targets (${result.pendingTargets.length}; deploy.sh does not deploy these automatically):`);
      for (const item of result.pendingTargets) {
        console.log(` - ${item.target}: ${item.files.join(', ')}`);
        console.log(`   manual deploy: ${item.command}`);
      }
    } else {
      console.log('No pending non-Pages cloud target changes detected.');
    }
  }
  process.exit(result.ok ? 0 : 1);
}

module.exports = { inspectCloudParity, runSelftest, stripJsonComments, parseActiveKvBindings };
