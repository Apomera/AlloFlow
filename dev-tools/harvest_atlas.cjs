#!/usr/bin/env node
/**
 * harvest_atlas.cjs — builds the "Atlas" directory data for the About modal by
 * reading the REAL catalogs (so the Atlas stays complete + current instead of
 * being hand-typed). Reads-only from the hub modules; the single thing it
 * WRITES is the ATLAS_HUBS block in view_info_modal_source.jsx (between the
 * ATLAS_DATA_START / ATLAS_DATA_END markers). Re-run after tools change:
 *
 *   node dev-tools/harvest_atlas.cjs          # write the block
 *   node dev-tools/harvest_atlas.cjs --print  # just print a summary + JSON
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
// t shim: t(key, fallback) -> fallback ; t(key) -> resolved or prettified key
function tShim(key, fallback) {
  if (fallback != null && fallback !== '') return fallback;
  return resolveKey(key) || prettify(key);
}

// ── extract a named array literal from a module source, eval with a t shim ──
function extractArray(file, varName) {
  const txt = read(file);
  const m = new RegExp('(?:var|const|let)\\s+' + varName + '\\s*=\\s*\\[').exec(txt);
  if (!m) throw new Error(`array ${varName} not found in ${file}`);
  let i = txt.indexOf('[', m.index), depth = 0, str = null, prev = '';
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
      cur = { id: it.id, name: it.label, tools: [] };
      markerLabel[it.id] = it.label;
      cats.push(cur);
    } else if (cur && it.label) {
      cur.tools.push(it.label);
    }
  }
  return { cats, markerLabel };
}

function countPlugins(dir, prefix) {
  try {
    return fs.readdirSync(p(dir)).filter((f) => f.startsWith(prefix) && f.endsWith('.js')).length;
  } catch { return 0; }
}

// ── STEM ──
const stem = groupByCatMarker(extractArray('stem_lab/stem_lab_module.js', '_allStemTools'));
const stemHub = {
  hub: 'STEM Lab', icon: '🔬',
  total: Math.max(countPlugins('stem_lab', 'stem_tool_'), stem.cats.reduce((n, c) => n + c.tools.length, 0)),
  categories: stem.cats.filter((c) => c.tools.length).map((c) => ({ name: c.name, tools: c.tools })),
};

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
  if (cat && dt.label && !cat.tools.includes(dt.label)) cat.tools.push(dt.label);
}
const selHub = {
  hub: 'SEL Hub', icon: '🧠',
  total: Math.max(countPlugins('sel_hub', 'sel_tool_'), sel.cats.reduce((n, c) => n + c.tools.length, 0)),
  categories: sel.cats.filter((c) => c.tools.length).map((c) => ({ name: c.name, tools: c.tools })),
};

// ── Research Hub (3 inquiry lanes) ──
const lanes = extractArray('research_hub_module.js', 'PLACEHOLDER_LANES');
const researchHub = {
  hub: 'Research Hub', icon: '🔎', total: lanes.length,
  categories: [{ name: 'Inquiry lanes', tools: lanes.map((l) => `${l.label}${l.tagline ? ' — ' + l.tagline : ''}`) }],
};

// ── Studios & Surfaces (top-level surfaces from the command palette) ──
const cmds = extractArray('allo_commands_module.js', 'cmds');
const surfaces = cmds
  .filter((c) => c && c.opensPanel && c.label)
  .map((c) => c.label.replace(/^Open (the )?/i, '').trim())
  // drop a few that are settings/dialogs rather than learning surfaces
  .filter((l) => !/^(export|read this page|class session|class analytics|dashboard)$/i.test(l));
// Standalone surfaces reachable from the Learning/Educator hub tiles that are
// NOT command-palette entries (those launchers are JSX, not a data array — see
// harvest map). Small documented supplement; review if a hub tile is added.
const SURFACE_SUPPLEMENT = [
  'Memory Palace', 'Video Studio', 'AlloStudio', 'Cinematic Studio', 'Whiteboard',
  'LitLab', 'Throughline', 'PoetTree', 'Open Groove Studio', 'Family Bridge',
  'Guided Mode', 'Visual Organizer', 'Interview Mode', 'AlloHaven',
];
const allSurfaces = Array.from(new Set([...surfaces, ...SURFACE_SUPPLEMENT])).sort();
const surfacesHub = {
  hub: 'Studios & Surfaces', icon: '🎬', total: allSurfaces.length,
  categories: [{ name: 'Open from anywhere', tools: allSurfaces }],
};

// Documents & Literacy is a set of scattered pipeline features, not a tile
// catalog, so it is curated here rather than harvested (see harvest map).
const docsHub = {
  hub: 'Documents & Literacy', icon: '📄', total: 8,
  categories: [{ name: 'Core literacy tools', tools: [
    'Leveled Reader', 'Immersive Reader', 'Side-by-side Translation', 'Smart Glossary',
    'Word Sounds Studio', 'Oral Reading Fluency', 'Reading Library', 'Accessible PDF export',
  ] }],
};

const ATLAS_HUBS = [docsHub, stemHub, selHub, researchHub, surfacesHub];

// ── output ──
const json = JSON.stringify(ATLAS_HUBS, null, 2);
if (process.argv.includes('--print')) {
  for (const h of ATLAS_HUBS) {
    console.log(`\n${h.icon} ${h.hub} — total ${h.total}, ${h.categories.length} categories`);
    for (const c of h.categories) console.log(`   • ${c.name} (${c.tools.length}): ${c.tools.slice(0, 6).join(', ')}${c.tools.length > 6 ? ' …' : ''}`);
  }
  console.log('\n--- JSON length', json.length, 'chars ---');
} else {
  const SRC = 'view_info_modal_source.jsx';
  const txt = read(SRC);
  const START = '/* ATLAS_DATA_START — generated by dev-tools/harvest_atlas.cjs, do not edit by hand */';
  const END = '/* ATLAS_DATA_END */';
  const si = txt.indexOf(START), ei = txt.indexOf(END);
  if (si === -1 || ei === -1) { console.error('markers not found in ' + SRC); process.exit(1); }
  const block = `${START}\nconst ATLAS_HUBS = ${json};\n${END}`;
  const out = txt.slice(0, si) + block + txt.slice(ei + END.length);
  fs.writeFileSync(p(SRC), out, 'utf8');
  console.log(`Wrote ATLAS_HUBS (${ATLAS_HUBS.length} hubs, ${json.length} chars) into ${SRC}`);
}
