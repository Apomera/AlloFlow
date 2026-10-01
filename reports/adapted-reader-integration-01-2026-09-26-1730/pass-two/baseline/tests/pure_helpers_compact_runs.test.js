// _compactBlueprintRunForStorage / _compactFullPackRunForStorage moved from
// AlloFlowANTI.txt into pure_helpers_module.js (2026-09-04). Two guards:
//   1. Behaviour, via the built module with stub deps.
//   2. Drift between host and module: while the host still carries the inline
//      bodies (pre-swap) they must equal the module's; once the host has been
//      swapped to shims, the shims must delegate to PureHelpers with the deps bag.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PH = () => window.AlloModules.PureHelpers;

const deps = {
  _alloDiagnosticReason: (value) => ({ code: /quota/i.test(String(value)) ? 'quota' : 'generation-failure', summary: 'redacted:' + String(value).slice(0, 12) }),
  _alloDiagnosticResourceType: (type) => (typeof type === 'string' && type ? type : 'unknown'),
  _alloDiagnosticBoundedInt: (value, max) => (Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0),
  _alloDiagnosticTimestamp: (value) => (Number.isFinite(value) ? value : null),
  _alloDiagnosticRunId: (id, prefix) => (typeof id === 'string' && id ? id : prefix + '-run'),
  ALLO_GENERATION_MAX_RESOURCES: 2,
  _alloSanitizeFullPackPreflight: (preflight) => ({ sanitized: true, count: Object.keys(preflight || {}).length }),
  ALLO_GENERATION_MAX_GROUPS: 1,
};

describe('PureHelpers compact run records', () => {
  it('exports both functions', () => {
    expect(typeof PH()._compactBlueprintRunForStorage).toBe('function');
    expect(typeof PH()._compactFullPackRunForStorage).toBe('function');
  });

  it('refuses to run without the host deps bag instead of throwing a ReferenceError later', () => {
    expect(() => PH()._compactBlueprintRunForStorage({ rows: {} })).toThrow(/missing deps/);
    expect(() => PH()._compactFullPackRunForStorage({ groups: {} })).toThrow(/missing deps/);
    expect(PH()._compactBlueprintRunForStorage(null, false, deps)).toBe(null);
  });

  it('blueprint: strips sensitive fields, bounds rows, and redacts failure reasons', () => {
    const run = {
      runId: 'bp-1', status: 'partial', apiKey: 'SECRET', prompt: 'never store',
      rows: {
        a: { tool: 'quiz', status: 'completed', rawResponse: 'big', index: 1 },
        b: { tool: 'glossary', status: 'failed', failReason: 'quota exceeded for key', failureCode: 'x' },
        c: { tool: 'faq', status: 'queued' },
      },
    };
    const out = PH()._compactBlueprintRunForStorage(run, false, deps);
    expect(out.apiKey).toBeUndefined();
    expect(out.prompt).toBeUndefined();
    expect(Object.keys(out.rows)).toEqual(['a', 'b']); // bounded by ALLO_GENERATION_MAX_RESOURCES = 2
    expect(out.rows.a.rawResponse).toBeUndefined();
    expect(out.rows.b.failReason).toBe('redacted:quota exceed');
    expect(out.rows.b.failureCode).toBe('quota');
    expect(run.rows.b.failReason).toBe('quota exceeded for key'); // input untouched

    const diag = PH()._compactBlueprintRunForStorage(run, true, deps);
    expect(Object.keys(diag.rows)).toEqual(['row-1', 'row-2']); // keys anonymised
    expect(diag.runId).toBe('bp-1');
    expect(diag.rows[`row-1`].tool).toBe('quiz');
    expect(diag.rows[`row-2`].failureCode).toBe('quota');
  });

  it('full pack: sanitises preflight in diagnostics mode and bounds groups', () => {
    const run = {
      runId: 'fp-1', status: 'running', targetMode: 'all-groups',
      preflight: { reason: 'timeout while planning', selected: [{ id: 's1', prompt: 'x' }], skipped: [{ id: 'k1', reason: 'quota' }] },
      resources: { r1: { type: 'quiz', status: 'landed', stack: 'trace' } },
      groups: {
        g1: { status: 'completed', resources: { x: { type: 'faq', status: 'completed' } } },
        g2: { status: 'queued', resources: {} },
      },
    };
    const out = PH()._compactFullPackRunForStorage(run, false, deps);
    expect(Object.keys(out.groups)).toEqual(['g1']); // ALLO_GENERATION_MAX_GROUPS = 1
    expect(out.resources.r1.stack).toBeUndefined();
    expect(out.preflight.selected[0].prompt).toBeUndefined();
    expect(out.preflight.skipped[0].failureCode).toBe('quota');

    const diag = PH()._compactFullPackRunForStorage(run, true, deps);
    expect(diag.preflight).toEqual({ sanitized: true, count: 3 });
    expect(diag.planPayload).toBe(null);
    expect(Object.keys(diag.groups)).toEqual(['group-1']);
    expect(diag.targetMode).toBe('all-groups');
  });
});

describe('host ↔ module drift for the compact run functions', () => {
  const host = readFileSync('AlloFlowANTI.txt', 'utf8');
  const moduleSrc = readFileSync('pure_helpers_source.jsx', 'utf8');
  const builtModule = readFileSync('pure_helpers_module.js', 'utf8');
  const publicModule = readFileSync('desktop/web-app/public/pure_helpers_module.js', 'utf8');

  const hostBody = (name) => {
    const m = host.match(new RegExp('^  const ' + name + ' = \\(run, diagnosticsOnly = false\\) => \\{\\n([\\s\\S]*?)^  \\};', 'm'));
    return m ? m[1].replace(/^  /gm, '') : null;
  };
  const moduleBody = (name) => {
    const m = moduleSrc.match(new RegExp('^const ' + name + ' = \\(run, diagnosticsOnly = false, deps = \\{\\}\\) => \\{\\n([\\s\\S]*?)^\\};', 'm'));
    if (!m) return null;
    // Drop the deps preamble (comment + destructure + missing-deps guard).
    return m[1].split('\n').filter((l) => !l.startsWith('  // Host-owned') && !l.startsWith('  // AlloFlowANTI') && !l.startsWith('  // error reporter') && !l.startsWith('  const { ') && !l.startsWith('  const _missing') && !l.startsWith("  if (_missing.length)")).join('\n');
  };

  it('built module and public mirror are identical and carry the functions', () => {
    expect(publicModule).toBe(builtModule);
    expect(builtModule).toContain('_compactFullPackRunForStorage,');
  });

  it.each(['_compactBlueprintRunForStorage', '_compactFullPackRunForStorage'])('%s: host is either the identical inline body (pre-swap) or a PureHelpers shim (post-swap)', (name) => {
    const inline = hostBody(name);
    if (inline) {
      expect(inline).toBe(moduleBody(name));
    } else {
      expect(host).toContain(`if (_m && typeof _m.${name} === 'function') return _m.${name}(run, diagnosticsOnly, _alloCompactRunDeps());`);
      expect(host).toContain('const _alloCompactRunDeps = () => ({');
    }
  });
});
