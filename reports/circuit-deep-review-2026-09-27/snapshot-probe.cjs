const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_lab_module.js'), 'utf8');
const marker = src.indexOf('"aria-label": "Open " + snap.label + " snapshot"');
assert(marker >= 0);
const start = src.indexOf('onClick: () => {', marker) + 'onClick: '.length;
const end = src.indexOf('\n            },', start) + '\n            }'.length;
const handler = src.slice(start, end);
const openStart = src.indexOf('function _openStemTool(id, label) {');
const openEnd = src.indexOf('\n      function _stemToolCatalogText', openStart);
const openSource = src.slice(openStart, openEnd);
assert(openStart >= 0 && openEnd > openStart);
const calls = [];
const current = { _circuit: { voltage: 24, components: [{ type: 'resistor', value: 100, id: 2 }] } };
const snap = { tool: 'circuit', label: '1 parts 9V series', data: { voltage: 9, components: [{ type: 'resistor', value: 470, id: 1 }] } };
// Execute the exact production navigation function, with only host services stubbed.
const open = new Function('window', 'setStemLabTool', '_rememberStemToolUse', '_setStemToolSearch', 'upd', 'setTimeout', '_stemDialogRef', 'announceToSR', '_formatStemToolId', openSource + '; return _openStemTool;')(
  {}, id => calls.push(['tool', id]), id => calls.push(['recent', id]), s => calls.push(['search', s]),
  (k, v) => calls.push(['update', k, v]), fn => fn(), { current: null }, s => calls.push(['announce', s]), id => id
);
const restore = fn => { calls.push(['restore']); Object.assign(current, fn(current)); };
new Function('snap', 'setStemLabTab', '_openStemTool', 'setLabToolData', 'return (' + handler + ');')(
  snap, v => calls.push(['tab', v]), open, restore
)();
const result = {
  description: 'Exact production snapshot onClick and _openStemTool executed with stub host services.',
  calls,
  snapshotVoltage: snap.data.voltage,
  actualVoltage: current._circuit.voltage,
  restored: current._circuit.voltage === snap.data.voltage,
  restorationCalls: calls.filter(c => c[0] === 'restore').length,
  sourceLines: { save: 'stem_lab/stem_tool_circuit.js:6022-6032', open: 'stem_lab/stem_lab_module.js:6268-6308', navigate: 'stem_lab/stem_lab_module.js:3752-3767' }
};
assert.equal(result.restored, false);
assert.equal(result.restorationCalls, 0);
fs.writeFileSync(path.join(__dirname, 'snapshot-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
