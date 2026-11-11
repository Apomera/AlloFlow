#!/usr/bin/env node
// check_ai_requirements.cjs - keep ai_requirements.json (which tools need generative AI) true.
//
// ai_requirements.json holds one record per tool: STEM Lab (every registerTool id in
// stem_lab/stem_tool_*.js), SEL Hub (sel_hub/sel_tool_*.js) and the top-level tool families.
// Each record carries a HUMAN-SET class:
//   none      the tool file holds no generative-AI call site (read-aloud via callTTS is
//             tracked separately as readAloud and does not count)
//   optional  the core activity works with no AI; AI adds something (aiAdds / partial)
//   required  nothing useful happens without AI
// and MECHANICAL fields this script can recompute (callSites, readAloud, micCloud, network).
//
// What --check fails on:
//   count-vs-class     class "none" but the file has an AI call site; class optional/required
//                      but the file has none. (Records marked gate:"manual" are skipped and
//                      LISTED as skipped: their file is shared with other features.)
//   missing-record     a registered STEM/SEL tool id has no record
//   orphan-record      a STEM/SEL record names an id no file registers, the wrong file, or a
//                      top-level record names a file that does not exist
//   catalogue-mismatch tool-catalog-data.js `ai:` disagrees with the inventory (direct id
//                      match, or the inventory's catalogueCards map), or a card cannot be
//                      resolved at all
//   bad-record         unknown class, optional without aiAdds, duplicate id
//   stale-mechanical   a mechanical field differs from a fresh scan (fix: --write)
//
// A call site is an INVOCATION of callGemini / callGeminiVision / callImagen /
// callGeminiImageEdit / callGeminiAudio / onCallGemini (any receiver: ctx., window., props.),
// of a local alias (`var ask = ctx.callGemini; ask(...)`), or of the STEM host's AI hint
// (ctx.getHint / an alias of it). Guards, typeof tests and comments are not call sites.
// Known limit: this is a regex scan, not a parser. A call written inside a string literal
// (a code sample shown to students) is counted. That errs toward "has AI", the safe side
// for a "Works without AI" claim; mark such a record gate:"manual" with the reason.
//
// Usage:
//   node dev-tools/check_ai_requirements.cjs --check      exit 1 on any finding
//   node dev-tools/check_ai_requirements.cjs --write      refresh mechanical fields only;
//                                                         a class conflict is REPORTED, never
//                                                         rewritten (exit 1)
//   node dev-tools/check_ai_requirements.cjs --scan <file...>   print the scan of given files
//   options: --root <dir> --inventory <file> --json --quiet
// Exit: 0 clean, 1 finding(s), 2 configuration error.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_INVENTORY = 'ai_requirements.json';
const CATALOGUE_FILE = 'tool-catalog-data.js';
const CLASSES = ['none', 'optional', 'required'];

// aiChat is the STEM host's callback-style text helper (ctx.aiChat); ctx.generateText is its
// promise-style twin and is counted only with a receiver (the bare name is too common).
const TEXT_FNS = ['callGemini', 'onCallGemini', 'callGeminiAudio', 'aiChat'];
const VISION_FNS = ['callGeminiVision', 'onCallGeminiVision'];
const IMAGE_FNS = ['callImagen', 'callGeminiImageEdit', 'onCallImagen', 'onCallGeminiImageEdit'];
const TTS_FNS = ['callTTS'];
const HINT_FNS = ['getHint'];
const AI_FNS = TEXT_FNS.concat(VISION_FNS, IMAGE_FNS);
const ALL_FNS = AI_FNS.concat(TTS_FNS);

function toPosix(p) { return String(p).replace(/\\/g, '/'); }

/*
 * Blank out comments so a call quoted in prose is not counted. Deliberately conservative:
 * a `//` only starts a comment at line start or after whitespace (so `https://` survives),
 * and a block comment only when it opens at line start or after whitespace. Line structure
 * is kept. Stripping can only LOWER a count, never raise it.
 */
function stripComments(src) {
  let out = String(src).replace(/(^|[\s;{}(),])\/\*[\s\S]*?\*\//g, function (m, pre) {
    return pre + m.slice(pre.length).replace(/[^\n]/g, ' ');
  });
  out = out.split('\n').map(function (line) {
    const m = /(^|\s)\/\/(?!\/?[A-Za-z0-9.-]+\.[a-z]{2,}\/)/.exec(line);
    if (!m) return line;
    const at = m.index + m[1].length;
    // An odd number of quotes before the marker means it sits inside a string literal.
    const head = line.slice(0, at);
    const q = function (ch) { return (head.split(ch).length - 1) % 2 === 1; };
    if (q("'") || q('"') || q('`')) return line;
    return head;
  }).join('\n');
  return out;
}

function countRe(src, re) { const m = src.match(re); return m ? m.length : 0; }

function invocationRe(names) {
  // name( | name?.( | name.call( | name.apply(   but not `function name(`
  return new RegExp('(?<!function\\s{1,4})(?<![\\w$])(?:' + names.join('|') + ')\\s*(?:\\?\\.\\s*)?(?:\\.\\s*(?:call|apply)\\s*)?\\(', 'g');
}

function findAliases(src, names) {
  // <alias> = ...<name>   or   <alias>: <recv>.<name>   where <name> is not being invoked.
  const out = new Set();
  // Three shapes only, so `disabled: !callGemini` or `style: callGemini ? a : b` (flags,
  // not aliases) never match:
  //   alias = recv.name            alias = <guard> && recv.name
  //   alias = <test> ? recv.name : fallback
  const N = '(' + names.join('|') + ')';
  const RECV = '(?:[A-Za-z_$][\\w$]*\\s*\\??\\.\\s*)*';
  const TAIL = '(?![\\w$])(?!\\s*(?:\\?\\.\\s*)?\\()';
  const re = new RegExp('(?<![\\w$.])([A-Za-z_$][\\w$]*)\\s*(?:=(?![=>])|:)\\s*(?:[^;\\n?]{0,240}?(?:\\?|&&)\\s*)?\\(?\\s*' + RECV + N + TAIL, 'g');
  let m;
  while ((m = re.exec(src)) !== null) {
    const alias = m[1];
    if (ALL_FNS.indexOf(alias) !== -1 || HINT_FNS.indexOf(alias) !== -1) continue;
    if (/^(?:var|let|const|return|typeof|if|else|case|default|true|false|null|function)$/.test(alias)) continue;
    // What follows the name decides it: a flag keeps computing (`? 1 : 0.5`, `=== 'function'`),
    // an alias ends the expression or falls back (`;` `,` `)` `}` newline `||` `:`).
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 24);
    if (!/^\s*(?:[;,)}\n\r]|\|\||\?\?|:|$)/.test(after)) continue;
    // `x: cond ? callGemini : null` is an alias; `x: callGemini ? 'on' : 'off'` was cut above.
    // A guard that only tests the function (`!!f`, `typeof f`) yields a boolean, not the function.
    if (/(?:=|:)\s*(?:!!|typeof\b)[^?&]*$/.test(m[0])) continue;
    out.add(alias);
  }
  return [...out];
}

const URL_RE = /https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?::\d+)?[^\s'"`<>)\\]*/gi;
const IGNORE_HOST_RE = /^(?:(?:www|api)\.)?(?:w3\.org|example\.(?:com|org)|localhost|schema\.org|iiif\.io|yoursite\.com|placeholder\.com|server\d*\.com)$/;
// The URL string is handed straight to something that makes the browser request it.
const CONTACT_CALL_RE = /(?:\bfetch|\bimport|\bimportScripts|[lL]oadScript\w*|[lL]oadModule|[lL]oadCss|[lL]oad[A-Z]\w*|\w*Endpoint\w*|\bWorker|\bWebSocket|\bEventSource|\bAudio|\btileLayer|\.load|\bImage)\s*\(\s*(?:['"][A-Z]+['"]\s*,\s*)?[^()]{0,60}['"`]$/;
const CONTACT_ATTR_RE = /(?:\bsrc|\bsrcDoc|\bposter|\bscriptUrl|\bscriptSrc|\bcdn\w*|\bapi\w*|\bendpoint\w*|\btile\w*|\bmodelUrl|\bglb\w*|\bwasm\w*|\bworker\w*)\s*(?:[:=]|=\s*\\?)\s*\\?['"`]$/i;
const CONST_RE = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]$/;
// A URL that is only a link or a citation (href, url:, link:, source:) is not a contact.
const LINK_PRE_RE = /(?:\bhref|\burl|\blink|\bsource\w*|\bcitation|\bdoi|\bdocs?|\bexample|\breference|\blicen[sc]e\w*|\bterms\w*|\bcredit\w*|\bhomepage|@context)['"]?\s*(?:[:=,]|[!=]==?)\s*\\?['"`]$/i;
// Script / style / model / audio files are fetched, not visited.
const ASSET_URL_RE = /\.(?:m?js|css|wasm|glb|gltf|geojson|topojson|pdb|cif|mp3|ogg|wav)(?:[?#]\S*)?$/i;
const TILE_URL_RE = /\{z\}|%7Bz%7D|\/tilejson\.json$/i;
const DOCS_HOST_RE = /^docs?[.-]/;
// Embeds whose URL is assembled from parts ('https://phet.colorado.edu/sims/html/' + slug).
const EMBED_HOST_RE = /^(?:phet\.colorado\.edu|codap\.concord\.org)$/;
const CONST_NAME_RE = /(?:var|let|const)\s+[A-Za-z_$][\w$]*(?:_API|API_\w+|_ENDPOINT|ASSET_ROOT|_CDN|CDN_\w+|TILE\w*)\s*=\s*['"`]$/;

/* Hosts the file itself requests (not hosts it merely links to or cites). */
function contactHosts(src) {
  const hosts = new Set();
  let m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(src)) !== null) {
    const host = m[1].toLowerCase();
    if (IGNORE_HOST_RE.test(host)) continue;
    const pre = src.slice(Math.max(0, m.index - 140), m.index);
    const linked = LINK_PRE_RE.test(pre);
    let contact = (!linked && EMBED_HOST_RE.test(host)) || CONTACT_CALL_RE.test(pre) || CONTACT_ATTR_RE.test(pre) ||
      TILE_URL_RE.test(m[0]) ||
      (!linked && !DOCS_HOST_RE.test(host) && (ASSET_URL_RE.test(m[0]) || /^api\./.test(host) || CONST_NAME_RE.test(pre)));
    if (!contact) {
      const c = CONST_RE.exec(pre);
      if (c) {
        const id = c[1].replace(/\$/g, '\\$');
        contact = new RegExp('(?:fetch|import|[lL]oad\\w*|Worker|Audio)\\s*\\([^;\\n]{0,160}(?<![\\w$])' + id + '(?![\\w$])').test(src) ||
          new RegExp('\\bsrc\\s*[:=]\\s*[^;\\n]{0,80}(?<![\\w$])' + id + '(?![\\w$])').test(src);
      }
    }
    if (contact) hosts.add(host);
  }
  return [...hosts].sort();
}

/* Mechanical scan of one source text. */
function scanSource(rawSrc) {
  const src = stripComments(rawSrc);
  const count = function (names) {
    let n = countRe(src, invocationRe(names));
    const aliases = findAliases(src, names);
    if (aliases.length) n += countRe(src, invocationRe(aliases.map(function (a) { return a.replace(/\$/g, '\\$'); })));
    return { n: n, aliases: aliases };
  };
  const text = count(TEXT_FNS), vision = count(VISION_FNS), image = count(IMAGE_FNS), tts = count(TTS_FNS);
  text.n += countRe(src, /[\w$]\s*\.\s*generateText\s*(?:\?\.\s*)?\(/g);
  // The host AI hint: ctx.getHint(...) or an alias of ctx.getHint. A tool's own local
  // `function getHint` (canned hints) is NOT an AI call, so a bare getHint( only counts
  // when the file also takes getHint from a receiver.
  const takesHostHint = /[\w$]\s*\.\s*getHint(?![\w$])/.test(src);
  const localHintDef = /function\s+getHint\s*\(/.test(src);
  let hint = 0;
  if (takesHostHint) {
    hint = countRe(src, /[\w$]\s*\.\s*getHint\s*(?:\?\.\s*)?\(/g);
    const hintAliases = findAliases(src, HINT_FNS);
    if (!localHintDef) hint += countRe(src, /(?<!function\s{1,4})(?<![\w$.])getHint\s*\(/g);
    if (hintAliases.length) hint += countRe(src, invocationRe(hintAliases));
  }
  const callSites = { text: text.n, vision: vision.n, image: image.n, hint: hint };
  return {
    callSites: callSites,
    ai: text.n + vision.n + image.n + hint,
    tts: tts.n,
    readAloud: tts.n > 0,
    micCloud: /SpeechRecognition/.test(src),
    network: contactHosts(src),
    aliases: text.aliases.concat(vision.aliases, image.aliases),
    mentions: countRe(src, new RegExp('(?<![\\w$])(?:' + AI_FNS.join('|') + ')(?![\\w$])', 'g'))
  };
}

/*
 * Scan a tool file, then follow the companion pages it opens from the app's own CDN
 * (sim_shelf/sim_shelf.html, data_lab/data_lab.html ...) one level deep, so the hosts
 * THOSE pages request (PhET, CODAP) are listed against the tool that launches them.
 * Only network is merged; call-site counts stay the tool file's own.
 */
function scanFile(readFile, rel) {
  const src = readFile(rel);
  if (src == null) return null;
  const scan = scanSource(src);
  const hosts = new Set(scan.network);
  const re = /https:\/\/alloflow-cdn\.pages\.dev\/([A-Za-z0-9_.\/-]+\.html)/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(src)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const page = readFile(m[1]);
    if (page != null) for (const h of contactHosts(page)) hosts.add(h);
  }
  scan.network = [...hosts].sort();
  return scan;
}

function registerIds(src) {
  const ids = [];
  // Statement position only: Tool Forge carries a plugin TEMPLATE in a string literal
  // ("  window.StemLab.registerTool('myTool', {"), which registers nothing.
  const re = /^\s*(?:if\s*\([^)]*\)\s*)?window\.(?:StemLab|SelHub)\.registerTool\(\s*['"]([A-Za-z0-9_]+)['"]/;
  for (const line of stripComments(src).split('\n')) {
    const m = re.exec(line);
    if (m && ids.indexOf(m[1]) === -1) ids.push(m[1]);
  }
  return ids;
}

/* Registered plugin tools: id -> file, for STEM Lab and SEL Hub. */
function buildRegistry(root) {
  const reg = { stem: new Map(), sel: new Map() };
  const dirs = [['stem', 'stem_lab', 'stem_tool_'], ['sel', 'sel_hub', 'sel_tool_']];
  for (const [family, dir, prefix] of dirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter(function (n) { return n.startsWith(prefix) && n.endsWith('.js'); }).sort()) {
      const rel = dir + '/' + f;
      for (const id of registerIds(fs.readFileSync(path.join(abs, f), 'utf8'))) {
        if (!reg[family].has(id)) reg[family].set(id, rel);
      }
    }
  }
  return reg;
}

/* tool-catalog-data.js -> [{id, ai}] by running it against a stub window. */
function parseCatalogue(src) {
  const sandbox = { window: {} };
  vm.runInNewContext(String(src), sandbox, { timeout: 2000 });
  const list = sandbox.window.ALLOFLOW_PUBLIC_TOOLS;
  if (!Array.isArray(list)) throw new Error('tool-catalog-data.js did not define window.ALLOFLOW_PUBLIC_TOOLS');
  return list.map(function (t) { return { id: t.id, ai: t.ai, name: t.name }; });
}

/* Roll a set of classes up into one: all none -> none, all required -> required, else optional. */
function rollUp(classes) {
  if (!classes.length) return null;
  if (classes.every(function (c) { return c === 'none'; })) return 'none';
  if (classes.every(function (c) { return c === 'required'; })) return 'required';
  return 'optional';
}

/* What class should a catalogue card show? null when the inventory cannot say. */
function resolveCard(cardId, inventory) {
  const byId = new Map((inventory.tools || []).map(function (t) { return [t.id, t]; }));
  const map = (inventory.catalogueCards || {})[cardId];
  if (map) {
    if (map.record) { const r = byId.get(map.record); return r ? r.class : null; }
    if (Array.isArray(map.records)) {
      const cls = map.records.map(function (id) { return byId.get(id) && byId.get(id).class; });
      return cls.every(Boolean) ? rollUp(cls) : null;
    }
    if (map.family) return rollUp((inventory.tools || []).filter(function (t) { return t.family === map.family; }).map(function (t) { return t.class; }));
    return null;
  }
  const direct = byId.get(cardId);
  return direct ? direct.class : null;
}

function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/*
 * The gate. Pure: everything it reads comes in through `io`, so tests can feed bad input.
 *   inventory  parsed ai_requirements.json
 *   registry   { stem: Map(id -> file), sel: Map(id -> file) }
 *   readFile   (relPath) -> source text, or null when the file does not exist
 *   catalogue  [{id, ai}] or null to skip the catalogue rule
 */
function checkInventory(io) {
  const inventory = io.inventory || {};
  const registry = io.registry || { stem: new Map(), sel: new Map() };
  const findings = [];
  const skipped = [];
  const add = function (rule, id, message) { findings.push({ rule: rule, id: id, message: message }); };
  const tools = Array.isArray(inventory.tools) ? inventory.tools : [];
  const seen = new Set();
  const scanCache = new Map();
  const scanOf = function (rel) {
    if (!scanCache.has(rel)) {
      scanCache.set(rel, scanFile(io.readFile, rel));
    }
    return scanCache.get(rel);
  };

  for (const rec of tools) {
    const id = rec && rec.id;
    if (!id) { add('bad-record', '(no id)', 'a record has no id'); continue; }
    if (seen.has(id)) add('bad-record', id, 'duplicate record id');
    seen.add(id);
    if (CLASSES.indexOf(rec.class) === -1) { add('bad-record', id, 'class must be one of ' + CLASSES.join(' / ') + ', got ' + JSON.stringify(rec.class)); continue; }
    if (rec.class === 'optional' && !String(rec.aiAdds || '').trim()) add('bad-record', id, 'an optional tool must say what AI adds (aiAdds)');

    const plugin = rec.family === 'stem' || rec.family === 'sel';
    if (plugin) {
      const file = registry[rec.family].get(id);
      if (!file) { add('orphan-record', id, 'no ' + rec.family + ' tool file registers this id'); continue; }
      if (toPosix(rec.file || '') !== file) add('orphan-record', id, 'record says file ' + JSON.stringify(rec.file) + ' but the id is registered in ' + file);
    }
    if (!rec.file) {
      if (plugin) continue;
      skipped.push({ id: id, why: rec.gateNote || 'no file to scan' });
      continue;
    }
    const scan = scanOf(toPosix(rec.file));
    if (!scan) { add('orphan-record', id, 'file does not exist: ' + rec.file); continue; }
    if (rec.gate === 'manual') {
      skipped.push({ id: id, why: rec.gateNote || 'gate: manual' });
    } else if (rec.class === 'none' && scan.ai > 0) {
      add('count-vs-class', id, 'class "none" but ' + rec.file + ' has ' + scan.ai + ' AI call site(s) ' + JSON.stringify(scan.callSites));
    } else if (rec.class !== 'none' && scan.ai === 0) {
      add('count-vs-class', id, 'class "' + rec.class + '" but ' + rec.file + ' has no AI call site');
    }
    if (!io.skipMechanical) {
      const fresh = { callSites: scan.callSites, readAloud: scan.readAloud, micCloud: scan.micCloud, network: scan.network };
      for (const k of Object.keys(fresh)) {
        if (!sameJson(rec[k], fresh[k])) add('stale-mechanical', id, k + ' is ' + JSON.stringify(rec[k]) + ', a fresh scan gives ' + JSON.stringify(fresh[k]) + ' (run --write)');
      }
    }
  }

  for (const family of ['stem', 'sel']) {
    for (const [id, file] of registry[family]) {
      if (!tools.some(function (t) { return t && t.id === id && t.family === family; })) add('missing-record', id, 'registered in ' + file + ' but has no record');
    }
  }

  if (io.catalogue) {
    for (const card of io.catalogue) {
      const want = resolveCard(card.id, inventory);
      if (!want) add('catalogue-mismatch', card.id, 'catalogue card has no inventory record and no catalogueCards mapping');
      else if (card.ai !== want) add('catalogue-mismatch', card.id, CATALOGUE_FILE + ' says ai: ' + JSON.stringify(card.ai) + ', the inventory says ' + JSON.stringify(want));
    }
  }
  return { findings: findings, skipped: skipped, records: tools.length };
}

/* Refresh the mechanical fields in place. Never touches class. Returns ids that changed. */
function refreshMechanical(inventory, readFile) {
  const changed = [];
  for (const rec of inventory.tools || []) {
    if (!rec || !rec.file) continue;
    const scan = scanFile(readFile, toPosix(rec.file));
    if (!scan) continue;
    const fresh = { callSites: scan.callSites, readAloud: scan.readAloud, micCloud: scan.micCloud, network: scan.network };
    let touched = false;
    for (const k of Object.keys(fresh)) if (!sameJson(rec[k], fresh[k])) { rec[k] = fresh[k]; touched = true; }
    if (touched) changed.push(rec.id);
  }
  return changed;
}

const FIELD_ORDER = ['id', 'family', 'name', 'file', 'class', 'aiAdds', 'partial', 'readAloud', 'network', 'micCloud', 'deepLink', 'callSites', 'gate', 'gateNote', 'guardRead', 'note'];
function orderRecord(rec) {
  const out = {};
  for (const k of FIELD_ORDER) if (k in rec) out[k] = rec[k];
  for (const k of Object.keys(rec)) if (!(k in out)) out[k] = rec[k];
  return out;
}
/* One record per line, so a change to one tool is a one-line diff. */
function serialize(inventory) {
  const head = {};
  for (const k of Object.keys(inventory)) if (k !== 'tools') head[k] = inventory[k];
  const rows = (inventory.tools || []).map(function (t) { return '    ' + JSON.stringify(orderRecord(t)); }).join(',\n');
  const body = JSON.stringify(head, null, 2);
  // "{}" has no closing-brace line to splice before (a header-less inventory once lost its tools here).
  const open = Object.keys(head).length ? body.slice(0, body.lastIndexOf('\n}')) + ',\n' : '{\n';
  return open + '  "tools": [\n' + rows + '\n  ]\n}\n';
}

function main(argv) {
  const args = argv.slice(2);
  const opt = function (name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const root = path.resolve(opt('--root') || DEFAULT_ROOT);
  const invPath = path.resolve(root, opt('--inventory') || DEFAULT_INVENTORY);
  const quiet = args.includes('--quiet');
  const readFile = function (rel) { const p = path.join(root, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

  if (args.includes('--scan')) {
    for (const f of args.slice(args.indexOf('--scan') + 1).filter(function (a) { return !a.startsWith('--'); })) {
      const src = readFile(toPosix(path.relative(root, path.resolve(f))));
      console.log(f + ' ' + (src == null ? 'MISSING' : JSON.stringify(scanFile(readFile, toPosix(path.relative(root, path.resolve(f)))))));
    }
    return 0;
  }

  let inventory;
  try { inventory = JSON.parse(fs.readFileSync(invPath, 'utf8')); }
  catch (e) { console.error('check_ai_requirements: cannot read ' + invPath + ': ' + e.message); return 2; }
  const registry = buildRegistry(root);
  if (!registry.stem.size || !registry.sel.size) { console.error('check_ai_requirements: no registered tools found under ' + root + ' (wrong --root?)'); return 2; }
  let catalogue = null;
  const catSrc = readFile(CATALOGUE_FILE);
  if (catSrc == null) { console.error('check_ai_requirements: ' + CATALOGUE_FILE + ' not found'); return 2; }
  try { catalogue = parseCatalogue(catSrc); }
  catch (e) { console.error('check_ai_requirements: cannot parse ' + CATALOGUE_FILE + ': ' + e.message); return 2; }

  const write = args.includes('--write');
  if (write) {
    const changed = refreshMechanical(inventory, readFile);
    if (changed.length) {
      fs.writeFileSync(invPath, serialize(inventory), 'utf8');
      console.log('check_ai_requirements: refreshed mechanical fields for ' + changed.length + ' record(s): ' + changed.join(', '));
    } else console.log('check_ai_requirements: mechanical fields already current; nothing written.');
  }

  const result = checkInventory({ inventory: inventory, registry: registry, readFile: readFile, catalogue: catalogue });
  if (args.includes('--json')) { console.log(JSON.stringify(result, null, 2)); return result.findings.length ? 1 : 0; }
  const per = {};
  for (const t of inventory.tools || []) { const k = t.family + ' ' + t.class; per[k] = (per[k] || 0) + 1; }
  if (!quiet) {
    console.log('check_ai_requirements: ' + result.records + ' records, ' + registry.stem.size + ' STEM + ' + registry.sel.size + ' SEL registered ids, ' + catalogue.length + ' catalogue cards.');
    console.log('  ' + Object.keys(per).sort().map(function (k) { return k + ': ' + per[k]; }).join(' | '));
    if (result.skipped.length) {
      console.log('  NOT count-gated (' + result.skipped.length + '; class rests on a human reading, skipped is not passed):');
      for (const s of result.skipped) console.log('    ' + s.id + ' - ' + s.why);
    }
  }
  if (result.findings.length) {
    console.error('\ncheck_ai_requirements: FAIL - ' + result.findings.length + ' finding(s)');
    for (const f of result.findings) console.error('  [' + f.rule + '] ' + f.id + ': ' + f.message);
    if (write && result.findings.some(function (f) { return f.rule === 'count-vs-class'; })) {
      console.error('\n--write never changes a class. Read the tool, then edit "class" in ' + DEFAULT_INVENTORY + ' by hand.');
    }
    return 1;
  }
  console.log('check_ai_requirements: OK');
  return 0;
}

module.exports = {
  CLASSES, AI_FNS, stripComments, scanSource, scanFile, registerIds, buildRegistry, parseCatalogue,
  resolveCard, rollUp, checkInventory, refreshMechanical, serialize, findAliases, contactHosts
};

if (require.main === module) process.exit(main(process.argv));
