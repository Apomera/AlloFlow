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
 *   node dev-tools/cf_worker.cjs status                               # read-only overview (both workers)
 *   node dev-tools/cf_worker.cjs kv-list                              # list KV namespaces
 *   node dev-tools/cf_worker.cjs kv-create <BINDING> --yes
 *   node dev-tools/cf_worker.cjs secret-list [--worker catalog|bug-digest] [--script s]
 *   node dev-tools/cf_worker.cjs secret-put <NAME> --value <v> [--worker ...] --yes
 *   node dev-tools/cf_worker.cjs deploy [--worker catalog|bug-digest|all] --yes
 *   node dev-tools/cf_worker.cjs deploy [--worker catalog|bug-digest|all] --dry-run
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { createWorkerUpload } = require('./cf_worker_upload.cjs');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '37d398da2811e2beead8fe41dac52058';
const WRANGLER_CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const API = 'https://api.cloudflare.com/client/v4';
const DEFAULT_SCRIPT = 'alloflow-catalog-submit';
const WORKER_DIR = path.resolve(__dirname, '..', 'catalog', 'cloudflare-worker');
const BUG_DIGEST_DIR = path.resolve(__dirname, '..', 'catalog', 'bug-digest-worker');
const BUG_DIGEST_DEFAULT_SCRIPT = 'alloflow-bug-digest';

const WORKER_TARGETS = {
  catalog: {
    id: 'catalog',
    dir: WORKER_DIR,
    defaultScript: DEFAULT_SCRIPT,
    configFile: 'wrangler.toml',
  },
  'bug-digest': {
    id: 'bug-digest',
    dir: BUG_DIGEST_DIR,
    defaultScript: BUG_DIGEST_DEFAULT_SCRIPT,
    configFile: 'wrangler.jsonc',
  },
};

// ─── config parsers (pure, local, pre-auth) ─────────────────────────────────

function stripJsonComments(src) {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
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
    if (ch === '/' && next === '/') {
      i += 1;
      while (i + 1 < src.length && src[i + 1] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 1;
      while (i + 1 < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

function parseCatalogConfig(workerDir = WORKER_DIR, { allowPlaceholders = false } = {}) {
  const entry = path.join(workerDir, 'src', 'index.js');
  const tomlPath = path.join(workerDir, 'wrangler.toml');
  const toml = fs.readFileSync(tomlPath, 'utf8');

  // Refuse to ship a config that still has placeholder namespace ids — that
  // deploys a worker whose endpoints fail closed with no error at deploy time.
  const placeholders = [...toml.matchAll(/binding\s*=\s*"([^"]+)"\s*\nid\s*=\s*"(REPLACE_WITH[^"]*)"/g)].map((m) => m[1]);
  if (placeholders.length && !allowPlaceholders) {
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
  const scriptName = (toml.match(/^name\s*=\s*"([^"]+)"/m) || [])[1] || DEFAULT_SCRIPT;

  // keep_bindings preserves secrets already set on the worker; without it an
  // upload silently drops every secret_text binding.
  const metadata = {
    main_module: 'index.js',
    compatibility_date: compatibilityDate,
    bindings,
    keep_bindings: ['secret_text'],
  };

  return { entry, scriptName, metadata, bindings, crons: [] };
}

function parseBugDigestConfig(workerDir = BUG_DIGEST_DIR) {
  const cfgPath = path.join(workerDir, 'wrangler.jsonc');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(stripJsonComments(raw));
  const mainRel = typeof cfg.main === 'string' && cfg.main.trim() ? cfg.main.trim() : 'src/index.js';
  const entry = path.resolve(workerDir, mainRel);
  const scriptName = typeof cfg.name === 'string' && cfg.name.trim() ? cfg.name.trim() : BUG_DIGEST_DEFAULT_SCRIPT;
  const crons = Array.isArray(cfg.triggers && cfg.triggers.crons)
    ? cfg.triggers.crons.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim())
    : [];
  return { cfg, entry, mainModule: path.basename(entry), scriptName, crons };
}

function buildMigrationPayload(migrations) {
  if (!Array.isArray(migrations) || !migrations.length) return undefined;
  if (migrations.length === 1) {
    const m = migrations[0];
    const out = { new_tag: m.tag };
    if (Array.isArray(m.new_sqlite_classes) && m.new_sqlite_classes.length) out.new_sqlite_classes = m.new_sqlite_classes;
    if (Array.isArray(m.new_classes) && m.new_classes.length) out.new_classes = m.new_classes;
    if (Array.isArray(m.renamed_classes) && m.renamed_classes.length) out.renamed_classes = m.renamed_classes;
    if (Array.isArray(m.deleted_classes) && m.deleted_classes.length) out.deleted_classes = m.deleted_classes;
    return out;
  }
  return {
    new_tag: migrations[migrations.length - 1].tag,
    steps: migrations.map((m) => {
      const step = {};
      if (Array.isArray(m.new_sqlite_classes) && m.new_sqlite_classes.length) step.new_sqlite_classes = m.new_sqlite_classes;
      if (Array.isArray(m.new_classes) && m.new_classes.length) step.new_classes = m.new_classes;
      if (Array.isArray(m.renamed_classes) && m.renamed_classes.length) step.renamed_classes = m.renamed_classes;
      if (Array.isArray(m.deleted_classes) && m.deleted_classes.length) step.deleted_classes = m.deleted_classes;
      return step;
    }),
  };
}

function buildBugDigestMetadata(parsed, {
  liveBindings = null,
  destinationAddress = '',
  useConfigSendEmail = false,
  includeMigrations = false,
  allowUnresolvedSendEmail = false,
} = {}) {
  const { cfg, mainModule, scriptName } = parsed;
  const bindings = [];

  for (const [name, value] of Object.entries(cfg.vars || {})) {
    bindings.push({ type: 'plain_text', name, text: String(value) });
  }

  for (const kv of (cfg.kv_namespaces || [])) {
    if (!kv || !kv.binding || !kv.id || /^REPLACE_WITH/i.test(kv.id)) {
      throw new Error(`${scriptName} wrangler.jsonc has invalid or placeholder KV binding: ${kv && kv.binding}`);
    }
    bindings.push({ type: 'kv_namespace', name: kv.binding, namespace_id: kv.id });
  }

  for (const doBinding of ((cfg.durable_objects && cfg.durable_objects.bindings) || [])) {
    if (!doBinding || !doBinding.name || !doBinding.class_name) continue;
    const entry = {
      type: 'durable_object_namespace',
      name: doBinding.name,
      class_name: doBinding.class_name,
    };
    if (doBinding.script_name) entry.script_name = doBinding.script_name;
    bindings.push(entry);
  }

  const trimmedDest = String(destinationAddress || '').trim();
  if (trimmedDest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedDest)) {
    throw new Error('BUG_DIGEST_DESTINATION_ADDRESS is not a valid email address.');
  }

  for (const emailBinding of (cfg.send_email || [])) {
    if (!emailBinding || !emailBinding.name) continue;
    if (trimmedDest) {
      bindings.push({
        type: 'send_email',
        name: emailBinding.name,
        destination_address: trimmedDest,
      });
      continue;
    }
    const liveMatch = Array.isArray(liveBindings)
      ? liveBindings.find((b) => b && b.type === 'send_email' && b.name === emailBinding.name)
      : null;
    if (liveMatch && liveMatch.destination_address) {
      bindings.push({
        type: 'send_email',
        name: emailBinding.name,
        destination_address: liveMatch.destination_address,
      });
      continue;
    }
    if (liveMatch && (liveMatch.allowed_destination_addresses || liveMatch.allowed_sender_addresses)) {
      const preserved = { type: 'send_email', name: emailBinding.name };
      if (liveMatch.allowed_destination_addresses) preserved.allowed_destination_addresses = liveMatch.allowed_destination_addresses;
      if (liveMatch.allowed_sender_addresses) preserved.allowed_sender_addresses = liveMatch.allowed_sender_addresses;
      bindings.push(preserved);
      continue;
    }
    if (useConfigSendEmail || allowUnresolvedSendEmail) {
      const configured = { type: 'send_email', name: emailBinding.name };
      if (emailBinding.destination_address) configured.destination_address = emailBinding.destination_address;
      if (emailBinding.allowed_destination_addresses) configured.allowed_destination_addresses = emailBinding.allowed_destination_addresses;
      if (emailBinding.allowed_sender_addresses) configured.allowed_sender_addresses = emailBinding.allowed_sender_addresses;
      bindings.push(configured);
      continue;
    }
    throw new Error(
      `Refusing to deploy ${scriptName} without a verified send_email destination_address for "${emailBinding.name}".\n` +
      '  Workers Free Email Routing requires destination_address (kept out of git by design).\n' +
      '  For an existing worker, cf_worker.cjs preserves the live destination_address automatically;\n' +
      '  for a fresh deploy, set BUG_DIGEST_DESTINATION_ADDRESS or pass --use-config-send-email.'
    );
  }

  const metadata = {
    main_module: mainModule,
    compatibility_date: cfg.compatibility_date || '2026-10-22',
    bindings,
    keep_bindings: ['secret_text'],
  };
  if (Array.isArray(cfg.compatibility_flags) && cfg.compatibility_flags.length) {
    metadata.compatibility_flags = [...cfg.compatibility_flags];
  }
  if (cfg.observability && typeof cfg.observability === 'object') {
    metadata.observability = cfg.observability;
  }
  if (includeMigrations) {
    const mig = buildMigrationPayload(cfg.migrations);
    if (mig) metadata.migrations = mig;
  }
  return metadata;
}

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
      '  Either set CLOUDFLARE_API_TOKEN, or run `node dev-tools/cf_login.cjs`\n' +
      '  (the browser sign-in wrangler login does, without wrangler).'
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

  if (fs.existsSync(path.join(BUG_DIGEST_DIR, 'wrangler.jsonc'))) {
    console.log('');
    await reportBugDigestStatus(scripts, namespaces);
  }

  if (unset.length) {
    console.log('');
    console.log('Unconfigured KV bindings:', unset.join(', '));
    console.log('Create each with:  node dev-tools/cf_worker.cjs kv-create <BINDING> --yes');
  }
}

async function reportBugDigestStatus(scripts, namespaces) {
  let parsed;
  try {
    parsed = parseBugDigestConfig(BUG_DIGEST_DIR);
  } catch (err) {
    console.log(`Bug-digest worker config error: ${err.message}`);
    return;
  }
  const { scriptName, cfg } = parsed;
  const deployed = scripts.some((s) => s.id === scriptName);
  console.log(`Worker "${scriptName}": ${deployed ? 'deployed' : 'NOT DEPLOYED'}`);
  if (!deployed) return;

  try {
    const settings = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/settings`);
    const bindings = (settings && settings.bindings) || [];
    const bugKvCfg = (cfg.kv_namespaces || []).find((k) => k.binding === 'BUG_REPORTS');
    const bugKvLive = bindings.find((b) => b.type === 'kv_namespace' && b.name === 'BUG_REPORTS');
    const kvExists = bugKvCfg && namespaces.some((n) => n.id === bugKvCfg.id);
    const kvMark = bugKvLive && bugKvCfg && bugKvLive.namespace_id === bugKvCfg.id && kvExists ? 'ok' : 'MISMATCH';
    const doLive = bindings.find((b) => b.type === 'durable_object_namespace' && b.name === 'BUG_DIGEST');
    const emailLive = bindings.find((b) => b.type === 'send_email' && b.name === 'EMAIL');
    const emailMark = emailLive
      ? (emailLive.destination_address ? 'ok (destination_address set)' : 'ok (sender/destination list)')
      : 'NOT BOUND';
    console.log('  Bindings:');
    console.log(`    [${kvMark.padEnd(28)}] BUG_REPORTS (KV)`);
    console.log(`    [${(doLive ? `ok (${doLive.class_name})` : 'NOT BOUND').padEnd(28)}] BUG_DIGEST (Durable Object)`);
    console.log(`    [${emailMark.padEnd(28)}] EMAIL (send_email)`);
  } catch (err) {
    console.log('  (could not read settings:', err.message, ')');
  }

  try {
    const sched = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/schedules`);
    const crons = ((sched && sched.schedules) || []).map((s) => s.cron);
    console.log(`  Cron triggers: ${crons.length ? crons.join(', ') : '(none)'}`);
  } catch (err) {
    console.log('  (could not read schedules:', err.message, ')');
  }

  try {
    const secrets = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/secrets`);
    const names = new Set((secrets || []).map((s) => s.name));
    console.log('  Secrets:');
    for (const reqSecret of ['ADMIN_TOKEN', 'DIGEST_RECIPIENT']) {
      console.log(`    [${names.has(reqSecret) ? 'set    ' : 'NOT SET'}] ${reqSecret}`);
    }
  } catch (err) {
    console.log('  (could not read secrets:', err.message, ')');
  }
}

async function cmdKvList() {
  const namespaces = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces?per_page=100`);
  namespaces.forEach((n) => console.log(`${n.id}  ${n.title}`));
}

function resolveScriptForWorker(args) {
  const explicitScript = argVal(args, '--script');
  if (explicitScript) return explicitScript;
  const workerFlag = argVal(args, '--worker');
  if (workerFlag) {
    const target = WORKER_TARGETS[workerFlag];
    if (!target) {
      throw new Error(`Unknown --worker "${workerFlag}". Expected one of: ${Object.keys(WORKER_TARGETS).join(', ')}`);
    }
    return target.defaultScript;
  }
  return process.env.CF_SCRIPT || DEFAULT_SCRIPT;
}

async function cmdSecretList(args) {
  const scriptName = resolveScriptForWorker(args);
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
  if (!name || !value) throw new Error('Usage: secret-put <NAME> --value <value> [--worker catalog|bug-digest] --yes');
  const scriptName = resolveScriptForWorker(args);
  requireYes(args, `set secret ${name} on worker ${scriptName}`);

  await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/secrets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, text: value, type: 'secret_text' }),
  });
  // Never echo the value back, even partially.
  console.log(`Secret ${name} set on ${scriptName}.`);
}

function resolveDeployTargets(workerFlag) {
  const raw = (workerFlag || 'catalog').trim();
  if (raw === 'all') return ['catalog', 'bug-digest'];
  if (WORKER_TARGETS[raw]) return [raw];
  throw new Error(`Unknown --worker "${raw}". Expected one of: catalog, bug-digest, all`);
}

async function uploadWorkerForm(scriptName, form) {
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
    throw new Error(`Deploy failed for ${scriptName} (${res.status}): ${errs || text.slice(0, 500)}`);
  }
  return json.result;
}

async function syncWorkerSchedules(scriptName, crons) {
  if (!Array.isArray(crons) || !crons.length) return;
  await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${scriptName}/schedules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crons.map((cron) => ({ cron }))),
  });
}

async function cmdDeploy(args) {
  const workerFlag = argVal(args, '--worker') || 'catalog';
  const dryRun = args.includes('--dry-run');
  const targets = resolveDeployTargets(workerFlag);
  const explicitScript = argVal(args, '--script');
  if (explicitScript && targets.length > 1) {
    throw new Error('Cannot combine --script with --worker all.');
  }

  if (!dryRun) {
    const desc = targets.length === 1
      ? `${explicitScript || (targets[0] === 'catalog' ? (process.env.CF_SCRIPT || DEFAULT_SCRIPT) : BUG_DIGEST_DEFAULT_SCRIPT)} from ${WORKER_TARGETS[targets[0]].dir}`
      : `Cloudflare Workers (${targets.join(', ')})`;
    requireYes(args, `deploy ${desc}`);
  }

  // Phase 1: Validate every selected Worker config and ESM dependency graph
  // locally BEFORE reading credentials or making any network request.
  const prepared = [];
  for (const targetId of targets) {
    if (targetId === 'catalog') {
      const parsed = parseCatalogConfig(WORKER_DIR, {
        allowPlaceholders: args.includes('--allow-placeholders'),
      });
      const scriptName = explicitScript || process.env.CF_SCRIPT || parsed.scriptName || DEFAULT_SCRIPT;
      const form = createWorkerUpload(parsed.entry, parsed.metadata);
      prepared.push({ targetId, scriptName, parsed, form });
    } else if (targetId === 'bug-digest') {
      const parsed = parseBugDigestConfig(BUG_DIGEST_DIR);
      const scriptName = explicitScript || parsed.scriptName || BUG_DIGEST_DEFAULT_SCRIPT;
      const previewMetadata = buildBugDigestMetadata(parsed, {
        destinationAddress: process.env.BUG_DIGEST_DESTINATION_ADDRESS || '',
        useConfigSendEmail: args.includes('--use-config-send-email'),
        includeMigrations: args.includes('--with-migrations'),
        allowUnresolvedSendEmail: true,
      });
      // Validates ESM parse + import boundaries before reading auth or network.
      createWorkerUpload(parsed.entry, previewMetadata);
      prepared.push({ targetId, scriptName, parsed, previewMetadata });
    }
  }

  if (dryRun) {
    for (const item of prepared) {
      const bindings = item.targetId === 'catalog'
        ? item.parsed.bindings.map((b) => b.name)
        : item.previewMetadata.bindings.map((b) => b.name);
      console.log(`[dry-run] Validated ${item.scriptName} (${item.targetId})`);
      console.log(`  entry   : ${item.parsed.entry}`);
      console.log(`  bindings: ${bindings.join(', ') || '(none)'}`);
      if (item.parsed.crons && item.parsed.crons.length) {
        console.log(`  crons   : ${item.parsed.crons.join(', ')}`);
      }
      console.log('  secrets : preserved via keep_bindings');
    }
    return;
  }

  // Phase 2: Perform live uploads (only after every local bundle passed).
  for (const item of prepared) {
    if (item.targetId === 'catalog') {
      await uploadWorkerForm(item.scriptName, item.form);
      console.log(`Deployed ${item.scriptName}.`);
      console.log(`  bindings: ${item.parsed.bindings.map((b) => b.name).join(', ') || '(none)'}`);
      console.log('  secrets preserved via keep_bindings');
    } else if (item.targetId === 'bug-digest') {
      const settingsRes = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${item.scriptName}/settings`, { raw: true });
      const liveExists = Boolean(settingsRes.ok && settingsRes.json && settingsRes.json.success && settingsRes.json.result);
      const liveBindings = liveExists && Array.isArray(settingsRes.json.result.bindings)
        ? settingsRes.json.result.bindings
        : null;
      const includeMigrations = !liveExists || args.includes('--with-migrations');
      const finalMetadata = buildBugDigestMetadata(item.parsed, {
        liveBindings,
        destinationAddress: process.env.BUG_DIGEST_DESTINATION_ADDRESS || '',
        useConfigSendEmail: args.includes('--use-config-send-email'),
        includeMigrations,
        allowUnresolvedSendEmail: false,
      });
      const form = createWorkerUpload(item.parsed.entry, finalMetadata);
      await uploadWorkerForm(item.scriptName, form);
      if (item.parsed.crons.length) {
        await syncWorkerSchedules(item.scriptName, item.parsed.crons);
      }
      const emailBinding = finalMetadata.bindings.find((b) => b.type === 'send_email');
      console.log(`Deployed ${item.scriptName}.`);
      console.log(`  bindings  : ${finalMetadata.bindings.map((b) => b.name).join(', ') || '(none)'}`);
      console.log(`  send_email: ${emailBinding && emailBinding.destination_address ? 'preserved verified destination_address' : 'config binding'}`);
      console.log(`  migrations: ${includeMigrations && finalMetadata.migrations ? finalMetadata.migrations.new_tag : 'skipped (already applied on live worker)'}`);
      if (item.parsed.crons.length) {
        console.log(`  crons     : ${item.parsed.crons.join(', ')}`);
      }
      console.log('  secrets preserved via keep_bindings');
    }
  }
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WORKER_TARGETS,
    stripJsonComments,
    parseCatalogConfig,
    parseBugDigestConfig,
    buildMigrationPayload,
    buildBugDigestMetadata,
    resolveDeployTargets,
  };
}

if (typeof module === 'undefined' || (typeof require !== 'undefined' && require.main === module)) {
  (async () => {
    const [cmd, ...rest] = process.argv.slice(2);
    if (!cmd || cmd === '--help' || cmd === '-h') {
      console.log('Commands: ' + Object.keys(COMMANDS).join(', '));
      console.log('Read-only: status, kv-list, secret-list, deploy --dry-run');
      console.log('Mutating (need --yes): kv-create, secret-put, deploy [--worker catalog|bug-digest|all]');
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
}
