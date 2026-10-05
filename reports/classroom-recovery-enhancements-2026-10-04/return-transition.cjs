const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), label = process.argv[2] || 'current';
const base = label === 'candidate' ? path.join(__dirname, 'candidate') : root;
const inputPaths = Object.fromEntries(['AlloFlowANTI.txt', 'host_handlers_source.jsx', 'host_handlers_module.js'].map(file => [file, path.join(base, file)]));
const inputs = Object.fromEntries(Object.entries(inputPaths).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]));
const shim = inputs['AlloFlowANTI.txt'].match(/^  const handleReturnToStart = [^\n]+/m)?.[0]; assert(shim);
function mount(mode, blocked) {
  const calls = [], voices = [], state = { hasSelectedMode: true, shellDeepLinkTool: 'reader', canvasRecoveryRevision: 0 };
  let pending = null, requests = 0;
  const request = run => { requests++; if (blocked) { pending = run; return false; } return run(); };
  const deps = { requestReadingSupportTransition: request, isCanvas: true, canvasRecoveryImmediateSaveRef: { current: false }, _alloCmdCtxRef: { current: { stopVoiceLoop: () => voices.push('command') } } };
  for (const name of new Set(inputs['host_handlers_source.jsx'].match(/\bset[A-Z]\w+/g))) deps[name] = value => { const key = name[3].toLowerCase() + name.slice(4); state[key] = typeof value === 'function' ? value(state[key]) : value; calls.push(name); };
  const window = { React: {}, AlloModules: {}, location: { href: 'https://local.example/#reader' }, AlloFlowVoice: { stopActiveVoiceSession: reason => voices.push(reason) }, AlloSpeechPlayer: { stop: () => voices.push('speech') } };
  vm.runInNewContext(mode === 'source' ? inputs['host_handlers_source.jsx'] + '\nwindow.__factory = createHostHandlers;' : inputs['host_handlers_module.js'], { window, console: { log() {}, error() {} }, setTimeout, clearTimeout, Date, structuredClone });
  const create = mode === 'source' ? window.__factory : window.AlloModules.HostHandlers;
  const api = create(deps);
  const invoke = new Function('requestReadingSupportTransition', '_alloHostHandlers', shim + '\nreturn handleReturnToStart;')(request, () => api);
  return { invoke, state, calls, voices, deps, window, requests: () => requests, confirm: () => { const run = pending; pending = null; return run(); }, cancel: () => { pending = null; } };
}
const results = [];
for (const mode of ['source', 'generated']) {
  for (const [name, run] of [
    ['current allowed return stops voice and opens Start while preserving location', () => { const h = mount(mode, false); h.invoke(); assert.equal(h.requests(), 1); assert.equal(h.state.hasSelectedMode, false); assert.equal(h.state.shellDeepLinkTool, null); assert.equal(h.deps.canvasRecoveryImmediateSaveRef.current, true); assert.equal(h.state.canvasRecoveryRevision, 1); assert.deepEqual(h.voices, ['command', 'return-to-start', 'speech']); assert.equal(h.window.location.href, 'https://local.example/#reader'); }],
    ['blocked and cancelled return preserves reading support, voice and workspace', () => { const h = mount(mode, true); assert.equal(h.invoke(), false); h.cancel(); assert.equal(h.requests(), 1); assert.equal(h.calls.length, 0); assert.equal(h.voices.length, 0); assert.equal(h.state.hasSelectedMode, true); assert.equal(h.state.shellDeepLinkTool, 'reader'); assert.equal(h.deps.canvasRecoveryImmediateSaveRef.current, false); }],
    ['confirmed delayed return performs the original behavior exactly once', () => { const h = mount(mode, true); h.invoke(); assert.equal(h.calls.length, 0); h.confirm(); assert.equal(h.requests(), 1); assert.equal(h.state.hasSelectedMode, false); assert.equal(h.state.shellDeepLinkTool, null); assert.equal(h.state.canvasRecoveryRevision, 1); assert.deepEqual(h.voices, ['command', 'return-to-start', 'speech']); assert.equal(h.calls.filter(name => name === 'setHasSelectedMode').length, 1); }],
  ]) {
    try { run(); results.push({ mode, name, passed: true }); } catch (error) { results.push({ mode, name, passed: false, error: error.stack }); }
  }
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const result = { label, completedAt: new Date().toISOString(), passed: results.every(item => item.passed), total: results.length, inputs: Object.fromEntries(Object.entries(inputPaths).map(([name, file]) => [name, { path: file, sha256: hash(fs.readFileSync(file)) }])), actualHostShim: true, actualCompleteFactories: true, controlledBoundaries: ['reading-support transition acknowledgement', 'voice APIs', 'state setters'], results };
fs.writeFileSync(path.join(__dirname, `${label}-return-transition.json`), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ label, total: result.total, passed: result.passed, failed: results.filter(item => !item.passed).map(item => item.name) })); if (!result.passed) process.exitCode = 1;
