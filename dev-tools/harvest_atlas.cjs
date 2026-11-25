#!/usr/bin/env node
/**
 * harvest_atlas.cjs — builds the "Atlas" directory data for the About modal by
 * reading the REAL catalogs (so the Atlas stays complete + current instead of
 * being hand-typed). Reads-only from the hub modules; the single thing it
 * WRITES is the ATLAS_HUBS block in view_info_modal_source.jsx (between the
 * ATLAS_DATA_START / ATLAS_DATA_END markers). Re-run after tools change:
 *
 *   node dev-tools/harvest_atlas.cjs          # write the block
 *   node dev-tools/harvest_atlas.cjs --print  # just print a summary
 *   node dev-tools/harvest_atlas.cjs --check  # fail if the committed block is stale
 *
 * Then rebuild the modal:  node _build_view_info_modal_module.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const p = (...a) => path.join(ROOT, ...a);
const read = (f) => fs.readFileSync(p(f), 'utf8');

// ── English strings, for resolving t('stem.tools_menu.*') category labels ──
let UI = {};
try { UI = vm.runInNewContext('(' + read('ui_strings.js') + ')'); }
catch (e) { console.warn('WARN: could not parse ui_strings.js for i18n:', e.message); }
function resolveKey(key) {
  let o = UI;
  for (const part of key.split('.')) {
    if (o && typeof o === 'object' && part in o) o = o[part]; else return null;
  }
  return typeof o === 'string' ? o : null;
}
function prettify(key) {
  const last = String(key).split('.').pop() || '';
  return last.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
// t shim: t(key, fallback) -> fallback ; t(key) -> resolved or prettified key.
// It also remembers which key produced each label, so the modal can show the
// label in the reader's language (toolKeys / nameKey in the output).
const KEY_BY_TEXT = new Map();
function tShim(key, fallback) {
  const english = resolveKey(key);
  const out = (fallback != null && fallback !== '') ? fallback : (english || prettify(key));
  // Only record keys that ui_strings.js registers; a pack can only translate those.
  if (english && !KEY_BY_TEXT.has(out)) KEY_BY_TEXT.set(out, key);
  return out;
}
function keysFor(labels) {
  const keys = labels.map((l) => KEY_BY_TEXT.get(l) || null);
  return keys.some(Boolean) ? keys : undefined;
}

// ── extract a named array literal from a module source, eval with a t shim ──
function extractArray(file, varName) {
  const txt = read(file);
  // Try EVERY declaration-shaped match, not just the first. stem_lab_module.js
  // documents the registry in a comment that contains the literal text
  // `var _allStemTools = [...]`; that comment sits ~2300 lines above the real
  // declaration, so first-match-wins grabbed it, sliced out `[...]`, and died
  // on `SyntaxError: Unexpected token ']'` — which read as "the Atlas is
  // stale" rather than "the harvester cannot parse". Skip anything that does
  // not yield a real array.
  const re = new RegExp('(?:var|const|let)\\s+' + varName + '\\s*=\\s*\\[', 'g');
  const candidates = [];
  let m;
  while ((m = re.exec(txt))) candidates.push(m.index);
  if (!candidates.length) throw new Error(`array ${varName} not found in ${file}`);

  let lastErr = null;
  for (const at of candidates) {
    try {
      const parsed = extractArrayAt(txt, at);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (err) { lastErr = err; }
  }
  throw new Error(`array ${varName} in ${file} matched ${candidates.length} declaration(s) but none parsed`
    + (lastErr ? ` — last error: ${lastErr.message}` : ''));
}

function extractArrayAt(txt, at) {
  let i = txt.indexOf('[', at), depth = 0, str = null, prev = '';
  let j = i;
  for (; j < txt.length; j++) {
    const ch = txt[j];
    if (str) { if (ch === str && prev !== '\\') str = null; }
    else if (ch === '"' || ch === "'" || ch === '`') str = ch;
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { j++; break; } }
    prev = ch;
  }
  const sandbox = { t: tShim, window: {}, React: {}, document: {}, navigator: {} };
  return vm.runInNewContext('(' + txt.slice(i, j) + ')', sandbox);
}

// ── group a STEM/SEL-style flat array (category markers + tools) ──
function groupByCatMarker(arr) {
  const cats = [];
  let cur = null;
  const markerLabel = {}; // id -> label, for dynamic-tool insertion
  for (const it of arr) {
    if (!it) continue;
    if (it.category === true || /^_cat_/.test(it.id || '')) {
      cur = { id: it.id, name: it.label, tools: [], toolIds: [] };
      markerLabel[it.id] = it.label;
      cats.push(cur);
    } else if (cur && it.label) {
      cur.tools.push(it.label);
      cur.toolIds.push(it.id || '');
    }
  }
  return { cats, markerLabel };
}

// Directory totals deliberately count searchable catalog entries, not plugin
// files: one plugin can expose multiple tools or be loaded outside a hub list.

// ── STEM ──
const stemRaw = extractArray('stem_lab/stem_lab_module.js', '_allStemTools');
const stem = groupByCatMarker(stemRaw);
// One area record: stable id (descriptions are keyed by it, so renaming an area
// cannot strand its text), English name + tools, and the keys that translate them.
function areaRecord(c) {
  const rec = { id: c.id, name: c.name };
  const nameKey = KEY_BY_TEXT.get(c.name);
  if (nameKey) rec.nameKey = nameKey;
  rec.tools = c.tools;
  const toolKeys = keysFor(c.tools);
  if (toolKeys) rec.toolKeys = toolKeys;
  return rec;
}
const stemHub = {
  id: 'steam', hub: 'STEAM Lab', icon: '🔬',
  sourceKind: 'registry', sourceLabel: 'Generated from the STEAM Lab registry',
  total: stem.cats.reduce((n, c) => n + c.tools.length, 0),
  categories: stem.cats.filter((c) => c.tools.length).map(areaRecord),
};

// ── Verified Cloudflare direct links for STEAM Lab tools (strictly from _redirects) ──
const CLOUDFLARE_APP_ORIGIN = 'https://alloflow-cdn.pages.dev';
const redirectSlugById = new Map();
try {
  for (const line of read('_redirects').split(/\r?\n/)) {
    const m = /^\/([a-z0-9-]+)\s+\/app\/\?tool=([A-Za-z0-9]+)\s+302$/.exec(line.trim());
    if (m) redirectSlugById.set(m[2], m[1]);
  }
} catch (e) {
  console.warn('WARN: could not read _redirects for STEAM direct links:', e.message);
}
const ATLAS_STEAM_DIRECT_LINKS = {};
for (const it of stemRaw) {
  if (!it || it.category === true || /^_cat_/.test(it.id || '') || !it.id || !it.label) continue;
  const slug = redirectSlugById.get(it.id);
  if (slug && !Object.prototype.hasOwnProperty.call(ATLAS_STEAM_DIRECT_LINKS, it.label)) {
    ATLAS_STEAM_DIRECT_LINKS[it.label] = CLOUDFLARE_APP_ORIGIN + '/' + slug;
  }
}

// ── SEL (seed + dynamic tools inserted into their category) ──
const sel = groupByCatMarker(extractArray('sel_hub/sel_hub_module.js', '_allSelTools'));
const selDynamic = extractArray('sel_hub/sel_hub_module.js', '_dynamicTools');
const catPos = { // slug -> _cat_ marker id (from _catPositions in the module)
  'self-awareness': '_cat_SelfAwareness', 'self-regulation': '_cat_SelfRegulation',
  'self-direction': '_cat_SelfDirection', 'inner-work': '_cat_InnerWork',
  'care-of-self': '_cat_CareOfSelf', 'social-awareness': '_cat_SocialAwareness',
  'relationship-skills': '_cat_RelationshipSkills', 'responsible-decision-making': '_cat_DecisionMaking',
  'stewardship': '_cat_Stewardship', 'self-management': '_cat_SelfRegulation',
};
for (const dt of selDynamic) {
  const markerId = catPos[dt._cat];
  const cat = sel.cats.find((c) => c.id === markerId);
  if (cat && dt.label && !cat.tools.includes(dt.label)) { cat.tools.push(dt.label); cat.toolIds.push(dt.id || ''); }
}
// The SEL Hub translates its own labels with sel.hub.* keys built from ids
// (sel_hub_module.js ~84-87); reuse them so the Atlas matches the hub.
function selAreaRecord(c) {
  const slug = String(c.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rec = { id: c.id, name: c.name, nameKey: 'sel.hub.category_info.' + slug + '.label', tools: c.tools };
  if (c.toolIds.some(Boolean)) rec.toolKeys = c.toolIds.map((id) => (id ? 'sel.hub.tool.' + id + '.label' : null));
  return rec;
}
const selHub = {
  id: 'sel', hub: 'SEL Hub', icon: '🧠',
  sourceKind: 'registry', sourceLabel: 'Generated from the SEL Hub registry',
  total: sel.cats.reduce((n, c) => n + c.tools.length, 0),
  categories: sel.cats.filter((c) => c.tools.length).map(selAreaRecord),
};

// ── Research Hub (3 inquiry lanes) ──
const lanes = extractArray('research_hub_module.js', 'PLACEHOLDER_LANES');
const researchHub = {
  id: 'research', hub: 'Research Hub', icon: '🔎', total: lanes.length,
  sourceKind: 'registry', sourceLabel: 'Generated from the inquiry-lane registry',
  categories: [{ id: 'inquiry-lanes', name: 'Inquiry lanes', tools: lanes.map((l) => `${l.label}${l.tagline ? ' — ' + l.tagline : ''}`) }],
};

// ── Studios & Surfaces (top-level surfaces from the command palette) ──
const cmds = extractArray('allo_commands_module.js', 'cmds');
// Labels that are actions or settings, not places to work in. Matched after
// "Open"/"Go to" is stripped, so the palette's wording can change without
// letting them back in.
const NOT_A_SURFACE = /^(export( menu)?|read this page( to me)?|class session|class analytics|(the )?dashboard|a specific stem tool|find the right book)$/i;
// These are hubs of their own in the Atlas, so listing them here double-counts.
const OWN_HUBS = new Set(['steam lab', 'sel hub', 'research hub']);
const surfaces = cmds
  .filter((c) => c && c.opensPanel && c.label)
  .map((c) => c.label.replace(/^(Open|Go to) (the )?/i, '').trim())
  .filter((l) => !NOT_A_SURFACE.test(l) && !OWN_HUBS.has(l.toLowerCase()));
// Standalone surfaces reachable from the Learning/Educator hub tiles that are
// NOT command-palette entries (those launchers are JSX, not a data array — see
// harvest map). Small documented supplement; review if a hub tile is added.
const SURFACE_SUPPLEMENT = [
  'Memory Palace', 'Video Studio', 'AlloStudio', 'Cinematic Studio', 'Whiteboard',
  'LitLab', 'Throughline', 'PoetTree', 'Open Groove Studio', 'Family Bridge',
  'Guided Mode', 'Visual Organizer', 'Interview Mode', 'AlloHaven',
];
// "Lit Lab" and "LitLab" are one tool: dedupe on the letters alone, keep the
// first spelling seen (the palette's), and capitalise labels like "my notebook".
const surfaceByLetters = new Map();
for (const label of [...surfaces, ...SURFACE_SUPPLEMENT]) {
  const letters = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!surfaceByLetters.has(letters)) surfaceByLetters.set(letters, label.charAt(0).toUpperCase() + label.slice(1));
}
const allSurfaces = Array.from(surfaceByLetters.values()).sort();
const surfacesHub = {
  id: 'studios', hub: 'Studios & Surfaces', icon: '🎬', total: allSurfaces.length,
  sourceKind: 'mixed', sourceLabel: 'Command palette plus curated top-level launchers',
  categories: [{ id: 'studios', name: 'Open from anywhere', tools: allSurfaces }],
};

// Documents & Literacy is a set of scattered pipeline features, not a tile
// catalog, so it is curated here rather than harvested (see harvest map).
// Names follow what the app calls each feature now.
const DOC_TOOLS = [
  'Text Adaptation', 'Immersive Reader', 'Side-by-side Translation', 'Glossary',
  'Word Sounds', 'Oral Fluency Check', 'Reading Library', 'Accessible PDF export',
];
const docsHub = {
  id: 'documents', hub: 'Documents & Literacy', icon: '📄', total: DOC_TOOLS.length,
  sourceKind: 'curated', sourceLabel: 'Curated index of core literacy surfaces',
  categories: [{
    id: 'core-literacy', name: 'Core literacy tools', tools: DOC_TOOLS,
    // Registered under about.atlas_docs in ui_strings.js so packs can translate them.
    toolKeys: DOC_TOOLS.map((l) => 'about.atlas_docs.' + l.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')),
  }],
};

const ATLAS_HUBS = [docsHub, stemHub, selHub, researchHub, surfacesHub];

// ── output ──
const json = JSON.stringify(ATLAS_HUBS, null, 2);
const linksJson = JSON.stringify(ATLAS_STEAM_DIRECT_LINKS, null, 2);
const SRC = 'view_info_modal_source.jsx';
const START = '/* ATLAS_DATA_START — generated by dev-tools/harvest_atlas.cjs, do not edit by hand */';
const END = '/* ATLAS_DATA_END */';
const block = `${START}\nconst ATLAS_HUBS = ${json};\nconst ATLAS_STEAM_DIRECT_LINKS = ${linksJson};\n${END}`;
if (/[`]|\$\{/.test(block)) {
  console.error('Generated Atlas block contains a backtick or ${ — refusing.');
  process.exit(1);
}
if (process.argv.includes('--json')) {
  console.log(json);
} else if (process.argv.includes('--print')) {
  for (const h of ATLAS_HUBS) {
    console.log(`\n${h.icon} ${h.hub} — total ${h.total}, ${h.categories.length} categories`);
    for (const c of h.categories) console.log(`   • ${c.name} (${c.tools.length}): ${c.tools.slice(0, 6).join(', ')}${c.tools.length > 6 ? ' …' : ''}`);
  }
  console.log('\n--- JSON length', json.length, 'chars ---', Object.keys(ATLAS_STEAM_DIRECT_LINKS).length, 'STEAM Cloudflare links');
} else if (process.argv.includes('--check')) {
  const txt = read(SRC);
  const si = txt.indexOf(START), ei = txt.indexOf(END);
  if (si === -1 || ei === -1) { console.error('markers not found in ' + SRC); process.exit(1); }
  const current = txt.slice(si, ei + END.length);
  if (current !== block) {
    console.error(`Atlas data is stale in ${SRC}. Run: node dev-tools/harvest_atlas.cjs`);
    process.exit(1);
  }
  console.log(`Atlas data is current (${ATLAS_HUBS.length} hubs, ${ATLAS_HUBS.reduce((sum, hub) => sum + hub.total, 0)} catalog entries, ${Object.keys(ATLAS_STEAM_DIRECT_LINKS).length} STEAM Cloudflare links).`);
} else {
  const txt = read(SRC);
  const si = txt.indexOf(START), ei = txt.indexOf(END);
  if (si === -1 || ei === -1) { console.error('markers not found in ' + SRC); process.exit(1); }
  const out = txt.slice(0, si) + block + txt.slice(ei + END.length);
  fs.writeFileSync(p(SRC), out, 'utf8');
  console.log(`Wrote ATLAS_HUBS (${ATLAS_HUBS.length} hubs, ${json.length} chars, ${Object.keys(ATLAS_STEAM_DIRECT_LINKS).length} STEAM Cloudflare links) into ${SRC}`);
}
