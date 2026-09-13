import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-09-13 (Aaron): starting a fresh workspace reset the UI but left the previous
// Full Pack status board (queued / completed rows) in place. The run record is
// component state (`fullPackRun`) persisted to ALLO_FULL_PACK_STORE_KEY by an effect
// that removes the key when the run is null. Both workspace resets must null it,
// like they already null the blueprint plan. (clearCanvasWorkspaceState lives in the
// host: it is reachable from the Canvas boot recovery effect, so it can never be a
// CDN-module shim — see tests/host_handlers_wave3_extraction.test.js.)
const HOST = readFileSync('AlloFlowANTI.txt', 'utf8');

const bodyOf = (name) => {
  const start = HOST.indexOf('  const ' + name + ' = ');
  expect(start, name + ' must be a host-resident closure').toBeGreaterThan(0);
  const end = HOST.indexOf('\n  };\n', start);
  return HOST.slice(start, end);
};

describe('Full Pack run record and workspace resets', () => {
  it('a fresh workspace (clearCanvasWorkspaceState) nulls the Full Pack run beside the blueprint plan', () => {
    const clear = bodyOf('clearCanvasWorkspaceState');
    expect(clear).toContain('setHistory([]);');
    expect(clear).toContain('setActiveBlueprint(null);');
    expect(clear).toContain('setBlueprintExecutionResult(null);');
    expect(clear).toContain('setFullPackRun(null);');
    // it is nulled before the settings reset, with the other run records
    expect(clear.indexOf('setFullPackRun(null);')).toBeLessThan(clear.indexOf('resetCanvasWorkspaceSettings();'));
  });

  it('Clear workspace (handleClearHistory) nulls the Full Pack run too', () => {
    const clear = bodyOf('handleClearHistory');
    expect(clear).toContain('setHistory([]);');
    expect(clear).toContain('setFullPackRun(null);');
  });

  it('the persist effect drops the saved envelope when the run is null, so the resets also clear storage', () => {
    const head = HOST.indexOf('if (!_fullPackHydratedRef.current) return;');
    const effect = HOST.slice(head, HOST.indexOf('const savedAt = new Date().toISOString();', head));
    expect(effect).toContain('if (!fullPackRun) {');
    expect(effect).toContain('safeRemoveItem(ALLO_FULL_PACK_STORE_KEY);');
  });
});
