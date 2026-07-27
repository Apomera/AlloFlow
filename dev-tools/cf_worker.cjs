#!/usr/bin/env node
/*
 * cf_worker.cjs — Cloudflare Workers control via the REST API.
 *
 * WHY THIS EXISTS: `wrangler` cannot run on this machine. `workerd` publishes
 * no win32-arm64 build and wrangler imports it at load time, so even
 * `npx wrangler whoami` throws `Unsupported platform: win32 arm64 LE`.
 * `--ignore-scripts` installs but still dies at runtime. The REST API has no
 * such constraint, and wrangler's own OAuth credential is already on disk from
 * a previous `wrangler login`, so we reuse it.
 *
 * Credential: %APPDATA%/xdg.config/.wrangler/config/default.toml
 *   oauth_token + refresh_token + expiration_time. When the token is expired
 *   (or within the skew window) it is refreshed against Cloudflare's OAuth
 *   endpoint and written back, exactly as wrangler would.
 *
 * SAFETY: every mutating action requires an explicit subcommand AND --yes.
 * Bare invocation is read-only. Nothing here deploys as a side effect.
 *
 * Usage:
 *   node dev-tools/cf_worker.cjs status                  # read-only overview
 *   node dev-tools/cf_worker.cjs kv-list                 # list KV namespaces
 *   node dev-tools/cf_worker.cjs kv-create <BINDING> --yes
 *   node dev-tools/cf_worker.cjs secret-list [--script s]
 *   node dev-tools/cf_worker.cjs secret-put <NAME> --value <v> --yes
 *   node dev-tools/cf_worker.cjs deploy --yes            # upload src/index.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '37d398da2811e2beead8fe41dac52058';
const WRANGLER_CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const API = 'https://api.cloudflare.com/client/v4';
const DEFAULT_SCRIPT = 'alloflow-catalog-submit';
const WORKER_DIR = path.resolve(__dirname, '..', 'catalog', 'cloudflare-worker');

// ─── credentials ────────────────────────────────────────────────────────────

function credPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const candidates = [
    path.join(appData, 'xdg.config', '.wrangler', 'config', 'default.toml'),
    path.join(os.homedir(), '.wrangler', 'config', 'default.toml'),
    path.join(appData, '.wrangler', 'config', 'default.toml'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function readCreds() {
  // An explicit API token always wins — CI and non-interactive runs use it.
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { kind: 'api-token', token: process.env.CLOUDFLARE_API_TOKEN };
  }
  const p = credPath();
  if (!p) return null;
  const toml = fs.readFileSync(p, 'utf8');
  const field = (name) => {
    const m = toml.match(new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, 'm'));
    return m ? m[1] : '';
  };
  return {
    kind: 'oauth',
    file: p,
    token: field('oauth_token'),
    refreshToken: field('refresh_token'),
    expiresAt: field('expiration_time'),
  };
}

async function refreshOAuth(creds) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refreshToken,
    client_id: WRANGLER_CLIENT_ID,
  });
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OAuth refresh failed (${res.status}): ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const expiresAt = new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString();

  // Write back in wrangler's own format so wrangler (or a later run) stays happy.
  let toml = fs.readFileSync(creds.file, 'utf8');
  toml = toml.replace(/^(\s*oauth_token\s*=\s*)"[^"]*"/m, `$1"${json.access_token}"`);
  toml = toml.replace(/^(\s*expiration_time\s*=\s*)"[^"]*"/m, `$1"${expiresAt}"`);
  if (json.refresh_token) {
    toml = toml.replace(/^(\s*refresh_token\s*=\s*)"[^"]*"/m, `$1"${json.refresh_token}"`);
  }
  fs.writeFileSync(creds.file, toml, 'utf8');
  return { ...creds, token: json.access_token, expiresAt };
}

async function getAuth() {
  let creds = readCreds();
  if (!creds || !creds.token) {
    throw new Error(
      'No Cloudflare credential found.\n' +
      '  Either set CLOUDFLARE_API_TOKEN, or run `npx wrangler login` once on a\n' +
      '  machine where wrangler runs (it only needs to write the OAuth token).'
    );
  }
  if (creds.kind === 'oauth') {
    const expiresIn = new Date(creds.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(expiresIn) || expiresIn < 120000) { // refresh inside a 2-min skew
      if (!creds.refreshToken) throw new Error('OAuth token expired and no refresh_token is stored.');
      process.stderr.write('  (refreshing expired Cloudflare OAuth token)\n');
      creds = await refreshOAuth(creds);
    }
  }
  return { Authorization: `Bearer ${creds.token}` };
}

// ─── API helper ─────────────────────────────────────────────────────────────

async function cf(pathname, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const auth = await getAuth();
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { ...auth, ...headers },
    body,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* some endpoints return non-JSON */ }
  if (raw) return { ok: res.ok, status: res.status, text, json };
  if (!json || json.success === false) {
    const errs = (json && json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`${method} ${pathname} -> ${res.status} ${errs || text.slice(0, 300)}`);
  }
  return json.result;
}

// ─── read-only commands ─────────────────────────────────────────────────────

async function cmdStatus() {
  const creds = readCreds();
  console.log('Cloudflare account :', ACCOUNT_ID);
  console.log('Credential         :', creds ? `${creds.kind}${creds.file ? ' @ ' + creds.file : ''}` : 'NONE');
  if (creds && creds.kind === 'oauth') {
    const mins = Math.round((new Date(creds.expiresAt).getTime() - Date.now()) / 60000);
    console.log('Token expires      :', creds.expiresAt, `(${mins} min)`);
  }
  console.log('');

  const scripts = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts`);
  console.log(`Workers (${scripts.length}):`);
  scripts.forEach((s) => console.log(`  - ${s.id}   modified ${s.modified_on || '?'}`));
  console.log('');

  const namespaces = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces?per_page=100`);
  console.log(`KV namespaces (${namespaces.length}):`);
  namespaces.forEach((n) => console.log(`  - ${n.title.padEnd(46)} ${n.id}`));
  console.log('');

  await reportBindings(scripts, namespaces);
}

// Compare what wrangler.toml declares against what actually exists, and say
// which features are consequently dead. A placeholder KV id is not a warning
// in the abstract — it means that endpoint fail-closes in production.
const BINDING_MEANING = {
  BUG_REPORTS: 'POST /submitBug (in-app bug reports)',
  PD_SUBMISSIONS: 'POST /submitPd (PD module submissions)',
  PLUGIN_SUBMISSIONS: 'POST /submitPlugin (Tool Forge plugin submissions)',
  SEARCH_RATE: 'GET /search per-IP + daily budget counters (fails OPEN if absent)',
};

const SECRET_MEANING = {
  GITHUB_PAT: 'POST /submit, /submitTranslation, /submitItemCorrection (catalog -> GitHub)',
  SERPER_API_KEY: 'GET /search (web search for Gemini Canvas)',
  ADMIN_TOKEN: 'GET /bugs, /pdSubmissions, /pluginSubmissions (token-gated readers)',
};

async function reportBindings(scripts, namespaces) {
  const tomlPath = path.join(WORKER_DIR, 'wrangler.toml');
  const toml = fs.readFileSync(tomlPath, 'utf8');
  const declared = [...toml.matchAll(/\[\[kv_namespaces\]\]\s*\nbinding\s*=\s*"([^"]+)"\s*\nid\s*=\s*"([^"]+)"/g)]
    .map((m) => ({ binding: m[1], id: m[2] }));

  console.log('KV bindings declared in wrangler.toml:');
  const unset = [];
  declared.forEach(({ binding, id }) => {
    const placeholder = /^REPLACE_WITH/.test(id);
    const exists = namespaces.some((n) => n.id === id);
    const mark = placeholder ? 'NOT SET' : (exists ? 'ok' : 'ID NOT FOUND IN ACCOUNT');
    console.log(`  [${mark.padEnd(22)}] ${binding.padEnd(20)} ${BINDING_MEANING[binding] || ''}`);
    if (placeholder || !exists) unset.push(binding);
  });
  console.log('');

  const scriptName = process.env.CF_SCRIPT || DEFAULT_SCRIPT;
  const deployed = scripts.some((s) => s.id === scriptName);
  console.log(`Worker "${scriptName}": ${deployed ? 'deployed' : 'NOT DEPLOYED'}`);
  if (deployed) {
    try {
      const secrets = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/secrets`);
      const names = new Set((secrets || []).map((s) => s.name));
      console.log('  Secrets:');
      Object.keys(SECRET_MEANING).forEach((n) => {
        console.log(`    [${names.has(n) ? 'set    ' : 'NOT SET'}] ${n.padEnd(18)} ${SECRET_MEANING[n]}`);
      });
      const extra = [...names].filter((n) => !SECRET_MEANING[n]);
      if (extra.length) console.log('    other:', extra.join(', '));
    } catch (err) {
      console.log('  (could not read secrets:', err.message, ')');
    }
  }

  if (unset.length) {
    console.log('');
    console.log('Unconfigured KV bindings:', unset.join(', '));
    console.log('Create each with:  node dev-tools/cf_worker.cjs kv-create <BINDING> --yes');
  }
}

async function cmdKvList() {
  const namespaces = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces?per_page=100`);
  namespaces.forEach((n) => console.log(`${n.id}  ${n.title}`));
}

async function cmdSecretList(args) {
  const scriptName = argVal(args, '--script') || process.env.CF_SCRIPT || DEFAULT_SCRIPT;
  const secrets = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/secrets`);
  if (!secrets || !secrets.length) { console.log('(no secrets set)'); return; }
  secrets.forEach((s) => console.log(`${s.name}  (${s.type})`));
}

// ─── mutating commands (require --yes) ──────────────────────────────────────

async function cmdKvCreate(args) {
  const binding = args[0];
  if (!binding) throw new Error('Usage: kv-create <BINDING> --yes');
  requireYes(args, `create KV namespace for binding ${binding}`);

  const title = `${DEFAULT_SCRIPT}-${binding}`;
  const created = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  console.log(`Created KV namespace "${title}"`);
  console.log(`  id = ${created.id}`);

  // Write the id straight into wrangler.toml so the placeholder cannot linger.
  const tomlPath = path.join(WORKER_DIR, 'wrangler.toml');
  let toml = fs.readFileSync(tomlPath, 'utf8');
  const re = new RegExp(`(\\[\\[kv_namespaces\\]\\]\\s*\\nbinding\\s*=\\s*"${binding}"\\s*\\nid\\s*=\\s*)"[^"]*"`);
  if (re.test(toml)) {
    toml = toml.replace(re, `$1"${created.id}"`);
    fs.writeFileSync(tomlPath, toml, 'utf8');
    console.log(`  wrangler.toml updated for binding ${binding}`);
  } else {
    console.log(`  NOTE: no [[kv_namespaces]] block for ${binding} in wrangler.toml — add the id by hand.`);
  }
}

async function cmdSecretPut(args) {
  const name = args[0];
  const value = argVal(args, '--value');
  if (!name || !value) throw new Error('Usage: secret-put <NAME> --value <value> --yes');
  const scriptName = argVal(args, '--script') || process.env.CF_SCRIPT || DEFAULT_SCRIPT;
  requireYes(args, `set secret ${name} on worker ${scriptName}`);

  await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/secrets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, text: value, type: 'secret_text' }),
  });
  // Never echo the value back, even partially.
  console.log(`Secret ${name} set on ${scriptName}.`);
}

async function cmdDeploy(args) {
  const scriptName = argVal(args, '--script') || process.env.CF_SCRIPT || DEFAULT_SCRIPT;
  requireYes(args, `deploy ${scriptName} from ${WORKER_DIR}`);

  const entry = path.join(WORKER_DIR, 'src', 'index.js');
  const source = fs.readFileSync(entry, 'utf8');
  const tomlPath = path.join(WORKER_DIR, 'wrangler.toml');
  const toml = fs.readFileSync(tomlPath, 'utf8');

  // Refuse to ship a config that still has placeholder namespace ids — that
  // deploys a worker whose endpoints fail closed with no error at deploy time.
  const placeholders = [...toml.matchAll(/binding\s*=\s*"([^"]+)"\s*\nid\s*=\s*"(REPLACE_WITH[^"]*)"/g)].map((m) => m[1]);
  if (placeholders.length && !args.includes('--allow-placeholders')) {
    throw new Error(
      `wrangler.toml still has placeholder KV ids for: ${placeholders.join(', ')}\n` +
      '  Those endpoints would fail closed. Create them first with kv-create,\n' +
      '  or pass --allow-placeholders if that is genuinely intended.'
    );
  }

  const vars = {};
  const varsBlock = toml.match(/^\[vars\]\s*\n([\s\S]*?)(?=^\[|\Z)/m);
  if (varsBlock) {
    [...varsBlock[1].matchAll(/^\s*([A-Z_]+)\s*=\s*"([^"]*)"/gm)].forEach((m) => { vars[m[1]] = m[2]; });
  }

  const bindings = [
    ...Object.entries(vars).map(([name, text]) => ({ type: 'plain_text', name, text })),
    ...[...toml.matchAll(/\[\[kv_namespaces\]\]\s*\nbinding\s*=\s*"([^"]+)"\s*\nid\s*=\s*"([^"]+)"/g)]
      .filter((m) => !/^REPLACE_WITH/.test(m[2]))
      .map((m) => ({ type: 'kv_namespace', name: m[1], namespace_id: m[2] })),
  ];

  const compatibilityDate = (toml.match(/compatibility_date\s*=\s*"([^"]+)"/) || [])[1] || '2026-04-01';

  // keep_bindings preserves secrets already set on the worker; without it an
  // upload silently drops every secret_text binding.
  const metadata = {
    main_module: 'index.js',
    compatibility_date: compatibilityDate,
    bindings,
    keep_bindings: ['secret_text'],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('index.js', new Blob([source], { type: 'application/javascript+module' }), 'index.js');

  const auth = await getAuth();
  const res = await fetch(`${API}/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}`, {
    method: 'PUT',
    headers: auth,
    body: form,
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch (_) { return null; } })();
  if (!res.ok || !json || json.success === false) {
    const errs = (json && json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`Deploy failed (${res.status}): ${errs || text.slice(0, 500)}`);
  }
  console.log(`Deployed ${scriptName}.`);
  console.log(`  bindings: ${bindings.map((b) => b.name).join(', ') || '(none)'}`);
  console.log(`  secrets preserved via keep_bindings`);
}

// ─── plumbing ───────────────────────────────────────────────────────────────

function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function requireYes(args, description) {
  if (!args.includes('--yes')) {
    throw new Error(`Refusing to ${description} without --yes.\n  This command changes live Cloudflare state.`);
  }
}

const COMMANDS = {
  status: cmdStatus,
  'kv-list': cmdKvList,
  'kv-create': cmdKvCreate,
  'secret-list': cmdSecretList,
  'secret-put': cmdSecretPut,
  deploy: cmdDeploy,
};

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('Commands: ' + Object.keys(COMMANDS).join(', '));
    console.log('Read-only: status, kv-list, secret-list');
    console.log('Mutating (need --yes): kv-create, secret-put, deploy');
    process.exit(0);
  }
  const fn = COMMANDS[cmd];
  if (!fn) { console.error(`Unknown command: ${cmd}`); process.exit(2); }
  try {
    await fn(rest);
  } catch (err) {
    console.error('ERROR: ' + err.message);
    process.exit(1);
  }
})();
