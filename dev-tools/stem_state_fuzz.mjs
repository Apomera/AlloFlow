// Throw malformed persisted state at a STEM tool and see what throws.
//
//   node dev-tools/stem_state_fuzz.mjs <toolId> [tab,tab,...]
//   node dev-tools/stem_state_fuzz.mjs migration flight3d,vformation,wind,routes,world,aero,navigate,inquiry
//
// Why: tool state is persisted, so it comes back stale, partial or corrupted --
// a key renamed by a later build, a half-written value, a schema from a version
// that shipped months ago. Every render in a normal test uses well-formed
// state, so none of that is ever exercised.
//
// It matters more than an ordinary crash. These tools sit under a shared error
// boundary, so one tool throwing can blank the surface around it.
//
// The keys are read out of the tool's own source (`d.<key>` and
// `toolData[...]` reads) rather than guessed, so it fuzzes what the tool
// actually consults. Each profile assigns one hostile value to every key at
// once; a profile that throws is then narrowed key by key to name the culprit.
//
// Found in migration, all three the same mistake -- a guard testing FALSINESS
// where it needed to test SHAPE:
//   trials = 'nope'            -> iqTrials.filter is not a function
//   choices = 'push through'   -> (choices || []).map is not a function
//   choices = [null]           -> Cannot read properties of null (reading 'label')
// The last two are reachable from a model response, not just from storage:
// `!parsed.choices.length` passes a string happily, because a string has one.
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TOOL_ID = args[0];
if (!TOOL_ID) {
  console.error('usage: node dev-tools/stem_state_fuzz.mjs <toolId> [tab,tab,...]');
  process.exit(2);
}
const ROOT = process.cwd();
const toolPath = path.join(ROOT, 'stem_lab', 'stem_tool_' + TOOL_ID + '.js');
if (!existsSync(toolPath)) { console.error('no such tool: ' + toolPath); process.exit(2); }
const WEBAPP = path.join(ROOT, 'desktop/web-app', 'node_modules');

const React = require_(path.join(WEBAPP, 'react'));
const { renderToStaticMarkup } = require_(path.join(WEBAPP, 'react-dom/server'));
const { JSDOM } = require_(path.join(ROOT, 'node_modules/jsdom'));

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window; global.document = dom.window.document;
// Node exposes globalThis.navigator as a getter, so it has to be redefined
// rather than assigned.
try { Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true }); } catch (e) { /* already writable */ }
global.Blob = dom.window.Blob; global.URL = dom.window.URL;
// React logs invalid attribute values (width="NaN") as warnings rather than
// throwing, and those are defects too, so they are collected.
const attrWarnings = [];
const realErr = console.error;
console.error = (...a) => { const m = String(a[0] || ''); if (/Received NaN|Invalid DOM property|Warning:/.test(m)) attrWarnings.push(m.slice(0, 120)); else realErr(...a); };

require_(toolPath);
const reg = (window.StemLab && window.StemLab._registry) || {};
const ids = Object.keys(reg);
const KEY = reg[TOOL_ID] ? TOOL_ID
  : ids.find((k) => k.toLowerCase() === String(TOOL_ID).toLowerCase())
  || (ids.length === 1 ? ids[0] : null);
const tool = KEY && reg[KEY];
if (!tool) { console.error('tool did not register (registry has: ' + (ids.join(', ') || 'nothing') + ')'); process.exit(2); }

const src = readFileSync(toolPath, 'utf8');
const stateKeys = Array.from(new Set([...src.matchAll(/\bd\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])))
  .filter((k) => !['tab'].includes(k));
const TABS = args[1] ? args[1].split(',') : [null];

const HOSTILE = [
  ['null', () => null],
  ['undefined', () => undefined],
  ['NaN', () => NaN],
  ['Infinity', () => Infinity],
  ['negative', () => -1],
  ['zero', () => 0],
  ['huge', () => 1e9],
  ['empty string', () => ''],
  ['unknown id string', () => 'definitely-not-a-real-id'],
  ['empty array', () => []],
  ['empty object', () => ({})],
  ['string where an array belongs', () => 'not-an-array'],
  ['array of nulls', () => [null, null]],
  ['object with null fields', () => ({ label: null, choices: null, scenario: null })]
];

function renderOnce(tab, state) {
  const store = { [KEY]: Object.assign({}, tab ? { tab } : {}, state) };
  const ctx = {
    React, toolData: store, update: () => {}, updateMulti: () => {},
    addToast: () => {}, announceToSR: () => {}, t: (k, fb) => (fb == null ? k : fb),
    isDark: true, setStemLabTool: () => {}, awardXP: () => {}, beep: () => {}, celebrate: () => {},
    icons: new Proxy({}, { get: () => function Icon() { return null; }, has: () => true })
  };
  return renderToStaticMarkup(React.createElement(() => tool.render(ctx)));
}

console.log(KEY + ': fuzzing ' + stateKeys.length + ' state keys across ' + TABS.length + ' tab(s)\n');
const findings = [];
let renders = 0;
for (const [label, make] of HOSTILE) {
  const all = {};
  for (const k of stateKeys) all[k] = make();
  for (const tab of TABS) {
    let err = null;
    try { renders++; const html = renderOnce(tab, all); if (!html || html.length < 200) err = 'rendered almost nothing'; }
    catch (e) { err = String(e.message).slice(0, 90); }
    if (!err) continue;
    // Narrow: which single key is responsible?
    let culprit = '(several)';
    for (const k of stateKeys) {
      const one = {}; one[k] = make();
      try { renders++; renderOnce(tab, one); } catch (e) { culprit = k; break; }
    }
    findings.push({ label, tab: tab || 'default', key: culprit, err });
  }
}

for (const f of findings) {
  console.log('! ' + (f.tab + '').padEnd(12) + (f.key + '').padEnd(24) + '= ' + f.label.padEnd(30) + f.err);
}
const warns = Array.from(new Set(attrWarnings));
if (warns.length) {
  console.log('\ninvalid attribute values reached the DOM (' + warns.length + ' distinct):');
  for (const w of warns.slice(0, 6)) console.log('  ' + w.replace(/\s+/g, ' ').slice(0, 110));
}
console.log('\n' + renders + ' renders, ' + findings.length + ' crash(es), ' + warns.length + ' attribute warning(s).');
process.exit(findings.length || warns.length ? 1 : 0);
