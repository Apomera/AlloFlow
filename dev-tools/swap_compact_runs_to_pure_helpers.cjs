// One-shot host swap for the 2026-09-04 PureHelpers extraction. Run ONLY when AlloFlowANTI.txt is
// clean (git status) and quiet (no writes for ~10 min): node dev-tools/swap_compact_runs_to_pure_helpers.cjs
// Then babel-parse ANTI, run tests/pure_helpers_compact_runs.test.js, and pathspec-commit AlloFlowANTI.txt.
// HOST SWAP (run only when AlloFlowANTI.txt is clean and quiet): replace the two inline
// compact-run bodies with PureHelpers shims + one deps builder. Asserts each body matches
// the module copy first so a drifted host aborts instead of losing an edit.
const fs = require('fs');
const ROOT = require('path').resolve(__dirname, '..');
const HOST = process.argv[2] || ROOT + '/AlloFlowANTI.txt';
let host = fs.readFileSync(HOST, 'utf8');
const moduleSrc = fs.readFileSync(ROOT + '/pure_helpers_source.jsx', 'utf8');
const names = ['_compactBlueprintRunForStorage', '_compactFullPackRunForStorage'];
const moduleBody = (name) => {
  const m = moduleSrc.match(new RegExp('^const ' + name + ' = \\(run, diagnosticsOnly = false, deps = \\{\\}\\) => \\{\\n([\\s\\S]*?)^\\};', 'm'));
  if (!m) throw new Error('module body not found ' + name);
  return m[1].split('\n').filter((l) => !l.startsWith('  // Host-owned') && !l.startsWith('  // AlloFlowANTI') && !l.startsWith('  // error reporter') && !l.startsWith('  const { ') && !l.startsWith('  const _missing') && !l.startsWith('  if (_missing.length)')).join('\n');
};
for (const name of names) {
  const re = new RegExp('^  const ' + name + ' = \\(run, diagnosticsOnly = false\\) => \\{\\n([\\s\\S]*?)^  \\};\\n', 'm');
  const m = host.match(re);
  if (!m) throw new Error('host inline body not found (already swapped?) ' + name);
  const inline = m[1].replace(/^  /gm, '');
  if (inline !== moduleBody(name)) throw new Error('host body DRIFTED from module for ' + name + ' — re-extract before swapping');
  const shim = `  const ${name} = (run, diagnosticsOnly = false) => {
    const _m = window.AlloModules && window.AlloModules.PureHelpers;
    if (_m && typeof _m.${name} === 'function') return _m.${name}(run, diagnosticsOnly, _alloCompactRunDeps());
    throw new Error('[${name}] PureHelpers module not loaded - reload the page');
  };
`;
  host = host.replace(re, () => shim);
}
// Deps builder goes right before the first shim (blueprint), inside the component.
const builder = `  // Diagnostic helpers the extracted compact-run functions (PureHelpers) need.
  // Built fresh per call; the helpers themselves stay host-owned because
  // ALLO_GENERATION_METRICS and the error reporter use them too.
  const _alloCompactRunDeps = () => ({
    _alloDiagnosticReason, _alloDiagnosticResourceType, _alloDiagnosticBoundedInt, _alloDiagnosticTimestamp,
    _alloDiagnosticRunId, _alloSanitizeFullPackPreflight, ALLO_GENERATION_MAX_RESOURCES, ALLO_GENERATION_MAX_GROUPS,
  });
`;
const firstShim = '  const _compactBlueprintRunForStorage = (run, diagnosticsOnly = false) => {\n    const _m';
if (host.split(firstShim).length !== 2) throw new Error('first shim anchor not unique');
host = host.replace(firstShim, () => builder + firstShim);
fs.writeFileSync(HOST, host, 'utf8');
console.log('swapped', HOST, '→', host.split('\n').length, 'lines');
