'use strict';
// Prepare a bounded patch and current-source acceptance tools; never write product files.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { applyPatch, parsePatch, createTwoFilesPatch } = require('diff');
const { execFileSync } = require('node:child_process');
const OUT = __dirname, ROOT = path.resolve(OUT, '../../../..');
const ISOLATED = 'C:/Users/cabba/.codex/worktrees/reader-preview-isolation/UDL-Tool-Updated';
const read = p => fs.readFileSync(p, 'utf8');
const normal = s => s.replace(/\r\n/g, '\n');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const originals = new Map(), outputs = new Map(), evidence = [];
function current(name) {
  if (!originals.has(name)) originals.set(name, fs.existsSync(path.join(ROOT, name)) ? fs.readFileSync(path.join(ROOT, name)) : null);
  return originals.get(name) === null ? '' : normal(originals.get(name).toString('utf8'));
}
function patchFrom(relative) {
  const raw = normal(read(path.join(ISOLATED, relative)));
  evidence.push({ path: relative, sha256: sha(raw) });
  for (const patch of parsePatch(raw)) {
    const name = patch.newFileName.replace(/^b\//, '');
    const before = outputs.has(name) ? outputs.get(name) : current(name);
    if (patch.oldFileName === '/dev/null' && before) throw Error('New patch target already exists: ' + name);
    const after = applyPatch(before, patch, { fuzzFactor: 0 });
    if (after === false) throw Error('Patch no longer applies exactly: ' + relative + ' -> ' + name);
    outputs.set(name, after);
  }
}
patchFrom('reports/reader-preview-focus/host-focus.patch');
patchFrom('reports/reader-preview-scroll/reader-scroll.patch');
patchFrom('reports/tree-lab-experience/tree-lab-experience.patch');
patchFrom('reports/tree-lab-experience/validation.patch');
const focusValidation = parsePatch(normal(read(path.join(ISOLATED, 'reports/reader-preview-focus/validation-focus.patch'))));
const focusTestPatch = focusValidation.find(p => p.newFileName === 'b/tests/reader_preview_focus_narration.test.js');
if (!focusTestPatch) throw Error('Focus production test patch missing');
const focusTestName = 'tests/reader_preview_focus_narration.test.js';
if (current(focusTestName)) throw Error('Focus production test already exists');
let focusTest = applyPatch('', focusTestPatch, { fuzzFactor: 0 });
if (focusTest === false) throw Error('Focus test addition invalid');
focusTest = focusTest.replace("require('../reports/reader-preview-focus/prepare-delta.cjs')", "require('./helpers/reader_focus_effect.cjs')");
focusTest = focusTest.replace("process.env.ALLO_FOCUS_CANDIDATE||'AlloFlowANTI.txt'", "'AlloFlowANTI.txt'");
outputs.set(focusTestName, focusTest);
const helperName = 'tests/helpers/reader_focus_effect.cjs';
if (current(helperName)) throw Error('Focus extraction helper already exists');
const helper = `'use strict';\n// Extract the production focus effect without executing the full application.\nfunction extractFocusEffect(source) {\n  const start = source.indexOf('  const focusNarrationAudioRef = useRef(null);');\n  const marker = '  }, [focusNarrationEnabled, t, selectedVoice, voiceSpeed, voiceVolume]);';\n  const end = source.indexOf(marker, start);\n  if (start < 0 || end < start) throw new Error('Focus narration effect not found');\n  return source.slice(source.indexOf('  useEffect(() => {', start), end + marker.length);\n}\nmodule.exports = { extractFocusEffect };\n`;
outputs.set(helperName, helper);
const keysPath = path.join(ISOLATED, 'reports/tree-lab-experience/new-translation-keys.json');
const keys = JSON.parse(read(keysPath));
if (Object.keys(keys).length !== 16) throw Error('Expected sixteen Tree Lab English keys');
let strings = current('ui_strings.js');
const catalog = JSON.parse(strings), additions = [];
for (const [fullKey, value] of Object.entries(keys)) {
  const parts = fullKey.split('.');
  if (parts.length !== 3 || parts[0] !== 'stem' || parts[1] !== 'treelab') throw Error('Unexpected translation key: ' + fullKey);
  const key = parts[2], existing = catalog.stem.treelab[key];
  if (existing !== undefined && existing !== value) throw Error('Translation collision: ' + fullKey);
  if (existing === undefined) additions.push('      ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
}
if (additions.length) {
  const anchor = '    "treelab": {\n';
  if (strings.split(anchor).length !== 2) throw Error('English Tree Lab section is not unique');
  strings = strings.replace(anchor, anchor + additions.join('\n') + '\n');
  JSON.parse(strings); outputs.set('ui_strings.js', strings);
}
let combined = '';
for (const [name, after] of outputs) {
  const before = current(name);
  const patch = createTwoFilesPatch(originals.get(name) === null ? '/dev/null' : 'a/' + name, 'b/' + name, before, after, '', '', { context: 3 });
  if (applyPatch(before, patch, { fuzzFactor: 0 }) !== after) throw Error('Round-trip patch mismatch: ' + name);
  combined += patch;
}
const parser = require('@babel/parser');
for (const [name, contents] of outputs) if (/\.(?:jsx|js|cjs)$/.test(name) && name !== 'ui_strings.js') parser.parse(contents, { sourceType: 'unambiguous', plugins: ['jsx'] });
for (const [name, before] of originals) {
  const now = fs.existsSync(path.join(ROOT, name)) ? fs.readFileSync(path.join(ROOT, name)) : null;
  if ((before === null) !== (now === null) || (before && !before.equals(now))) throw Error('Source moved during preparation: ' + name);
}
function write(name, contents) { fs.writeFileSync(path.join(OUT, name), contents); }
write('combined.patch', combined);
write('preimages.json', JSON.stringify({ at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), evidence, files: [...outputs].map(([name, after]) => ({ path: name, beforeSha256: originals.get(name) === null ? null : sha(originals.get(name)), beforeLfSha256: sha(current(name)), afterLfSha256: sha(after), added: originals.get(name) === null })), englishKeysAdded: additions.length, strictPatchRoundTrip: true, syntaxParsed: true }, null, 2) + '\n');
write('new-translation-keys.json', JSON.stringify(keys, null, 2) + '\n');
function isolated(name) { return normal(read(path.join(ISOLATED, name))); }
let focus = isolated('reports/reader-preview-focus/browser-check.cjs');
focus = focus.replace("{extractFocusEffect}=require('./prepare-delta.cjs')", "{extractFocusEffect}=require('../../../../tests/helpers/reader_focus_effect.cjs')");
focus = focus.replace("require('./mount-fixture.cjs')", "require('./focus-mount-fixture.cjs')");
focus = focus.replace("path.resolve(dir,'../..')", "path.resolve(dir,'../../../..')");
focus = focus.replace("path.join(dir,'host-candidate.txt')", "path.join(root,'AlloFlowANTI.txt')");
focus = focus.replace("path.join(dir,'integrated-snapshot/instructional_context_module.js')", "path.join(root,'instructional_context_module.js')");
focus = focus.replace("path.join(dir,'reader-fixture.js')", "path.join(root,'view_simplified_module.js')");
focus = focus.replace("'browser-results.json'", "'focus-browser-results.json'");
focus = focus.replace('actual captured reader and candidate host focus effect', 'current production reader module and current host focus effect');
write('focus-browser.cjs', focus);
write('focus-mount-fixture.cjs', isolated('reports/reader-preview-focus/mount-fixture.cjs'));
let scroll = isolated('reports/reader-preview-scroll/browser-scroll-extended.cjs');
scroll = scroll.replace("require('./mount-fixture.cjs')", "require('./scroll-mount-fixture.cjs')");
scroll = scroll.replace("path.resolve(dir,'../..')", "path.resolve(dir,'../../../..')");
scroll = scroll.replace("path.resolve(process.env.ALLO_SCROLL_CANDIDATE||path.join(dir,'reader-candidate.js'))", "path.join(root,'view_simplified_module.js')");
scroll = scroll.replace("path.join(dir,'integrated-snapshot/instructional_context_module.js')", "path.join(root,'instructional_context_module.js')");
scroll = scroll.replace("process.env.ALLO_SCROLL_OUTPUT||'extended-scroll.json'", "'scroll-browser-results.json'");
write('scroll-browser.cjs', scroll);
write('scroll-mount-fixture.cjs', isolated('reports/reader-preview-scroll/mount-fixture.cjs'));
let fixture = isolated('reports/tree-lab-experience/browser-fixture.cjs');
fixture = fixture.replace("path.resolve('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')", "path.resolve(__dirname,'../../../..')");
const oldStart = fixture.indexOf("const BASE = path.join(OUT,'baseline');");
const oldEnd = fixture.indexOf('const harnessSource=', oldStart);
if (oldStart < 0 || oldEnd < oldStart) throw Error('Tree fixture snapshot anchors changed');
fixture = fixture.slice(0, oldStart) + fixture.slice(oldEnd);
fixture = fixture.replace("  if(rel==='stem_lab/stem_tool_treelab.js') file=path.join(OUT,variant,'stem_tool_treelab.js');\n", '');
fixture = fixture.replace("  if(rel==='stem_lab/stem_lab_module.js') file=path.join(BASE,'stem_lab_module.js');\n", '');
fixture = fixture.replace("variant='baseline'", "variant='current'").replace("process.argv[2]||'baseline'", "process.argv[2]||'current'");
write('tree-browser-fixture.cjs', fixture);
let tree = isolated('reports/tree-lab-experience/browser-check.cjs');
tree = tree.replace("require('./browser-fixture.cjs')", "require('./tree-browser-fixture.cjs')");
tree = tree.replace("const ROOT='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';", "const ROOT=path.resolve(__dirname,'../../../..');");
tree = tree.replace("launch('candidate')", "launch('current')").replaceAll('candidate-', 'current-tree-');
tree = tree.replace("'browser-results.json'", "'tree-browser-results.json'").replace("'browser-partial.json'", "'tree-browser-partial.json'").replace("'browser-failure.png'", "'tree-browser-failure.png'");
write('tree-browser.cjs', tree);
console.log(JSON.stringify({ files: [...outputs.keys()], englishKeysAdded: additions.length, patchBytes: Buffer.byteLength(combined), sourceWrites: false }, null, 2));
