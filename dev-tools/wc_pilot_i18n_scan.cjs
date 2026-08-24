// Inventory the user-visible English still hardcoded in the Water Cycle tool's
// newer surfaces (Be the Water, the mode bar, the Explorer section tabs).
//
//   node dev-tools/wc_pilot_i18n_scan.cjs            # list
//   node dev-tools/wc_pilot_i18n_scan.cjs --json     # machine-readable
//
// WHY A SCANNER AND NOT A GREP. A negative grep is not evidence of absence in
// this file: `t(` appears in an aliased form, keys are nested rather than
// dotted, and repo-wide greps have timed out here and read as zero hits. This
// walks explicit line ranges and reports every string literal that reaches a
// user, so the extraction list is derived rather than remembered.
//
// It deliberately reports CANDIDATES, not certainties: the caller decides. A
// scanner that silently drops "probably not user-visible" strings is how copy
// gets left behind in one language.
'use strict';

const fs = require('fs');
const SRC = 'stem_lab/stem_tool_watercycle.js';
const source = fs.readFileSync(SRC, 'utf8');
const lines = source.split(/\r?\n/);

// Regions added after the tool was last localized. Anchored on code, not line
// numbers, so the scan survives edits above it.
const REGIONS = [
  ["kernel", "  var WC_PILOT_UNIT_M =", "  window.WaterCyclePilotKernel = {"],
  ["sections", "          var WC_SECTIONS = [", "          function renderWcModeBar() {"],
  ["modebar", "          function renderWcModeBar() {", "          function startStewardCampaign("],
  ["pilot-scene", "          function wcPilotCanvasRef(canvasEl) {", "          function renderWcPilot() {"],
  ["pilot-ui", "          function renderWcPilot() {", "          if (wcMode === 'pilot') {"],
];

// Strings that are not user-visible copy: CSS, selectors, ids, data values,
// colours, key names, and the like.
const NOT_COPY = [
  /^[a-z0-9-]+$/,                       // single LOWERCASE token: ids, slugs, css classes
  /^[a-z-]+:[a-z0-9 ,.%()#-]+$/i,      // css declaration
  /^#[0-9a-f]{3,8}$/i,                 // hex colour
  /^[\d.,\s%pxremvhw+*/()-]+$/i,       // numbers/units
  /^\s*$/,
  /^rgba?\(/i,
  /^[A-Za-z]+\/[A-Za-z]+/,             // mime-ish
];

function isCopy(s) {
  if (s.length < 3) return false;
  if (NOT_COPY.some((re) => re.test(s))) return false;
  // Real copy has a space or sentence punctuation, or is a capitalised word.
  return /\s/.test(s) || /[.!?]/.test(s) || /^[A-Z]/.test(s);
}

const found = [];
for (const [name, startAnchor, endAnchor] of REGIONS) {
  const start = lines.findIndex((l) => l.startsWith(startAnchor));
  if (start === -1) { console.error(`region ${name}: start anchor not found`); continue; }
  let end = lines.findIndex((l, i) => i > start && l.startsWith(endAnchor));
  if (end === -1) end = lines.length;
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*)/.test(line)) continue;              // comments
    if (/className:|addColorStop|createLinearGradient|dataset\./.test(line)) continue;
    // Skip lines that are inside the injected stylesheet.
    if (/^\s*,?'\./.test(line)) continue;
    const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(line))) {
      const raw = m[1] !== undefined ? m[1] : m[2];
      const before = line.slice(Math.max(0, m.index - 24), m.index);
      // Already localized, or a key being passed to t().
      if (/\bt\(\s*$|__alloT\(\s*$|\bt\('[^']*',\s*$|__alloT\('[^']*',\s*$/.test(before)) continue;
      const s = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_x, h) => String.fromCharCode(parseInt(h, 16)));
      if (!isCopy(s)) continue;
      found.push({ region: name, line: i + 1, text: s });
    }
  }
}

// De-duplicate on text, keeping the first sighting.
const seen = new Map();
for (const f of found) if (!seen.has(f.text)) seen.set(f.text, f);
const unique = [...seen.values()];

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(unique, null, 2));
} else {
  const byRegion = {};
  for (const f of unique) (byRegion[f.region] = byRegion[f.region] || []).push(f);
  for (const [region, items] of Object.entries(byRegion)) {
    console.log(`\n── ${region} (${items.length}) ──`);
    for (const it of items) console.log(`  ${String(it.line).padStart(6)}  ${JSON.stringify(it.text).slice(0, 132)}`);
  }
  console.log(`\nTOTAL unique candidate strings: ${unique.length}`);
}
