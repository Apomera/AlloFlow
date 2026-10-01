import fs from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const transforms = require('../reports/own-source-research-improvements-2026-09-26/research-settings-transform.cjs');
const normalize = transforms.normalizeResearchSettings;
const read = file => fs.readFileSync(file, 'utf8');

describe('lesson research setting normalization', () => {
  it('preserves null and explicit none without changing ordinary web/document independence', () => {
    expect(normalize({})).toEqual({ selectedOwnSourceIds: null, documentsOnly: false, useOwnSources: false, includeSourceCitations: false });
    for (const useOwnSources of [false, true]) for (const includeSourceCitations of [false, true]) {
      expect(normalize({ selectedOwnSourceIds: [], useOwnSources, includeSourceCitations })).toEqual({ selectedOwnSourceIds: [], documentsOnly: false, useOwnSources, includeSourceCitations });
    }
  });
  it('restores strict mode without enabling web or broadening a missing selection', () => {
    expect(normalize({ documentsOnly: true, useOwnSources: false, includeSourceCitations: true, selectedOwnSourceIds: null })).toEqual({ selectedOwnSourceIds: [], documentsOnly: true, useOwnSources: true, includeSourceCitations: false });
  });
  it('rejects malformed imported flags and IDs, deduplicates IDs and copies arrays', () => {
    const selectedOwnSourceIds = ['src_one', 'src_one', 'source:2.1', '', ' spaced ', '../bad', 3, {}, 'line\nbreak', 'x'.repeat(300)];
    const result = normalize({ selectedOwnSourceIds, documentsOnly: 'true', useOwnSources: 1, includeSourceCitations: 'true' });
    expect(result).toEqual({ selectedOwnSourceIds: ['src_one', 'source:2.1'], documentsOnly: false, useOwnSources: false, includeSourceCitations: false });
    expect(result.selectedOwnSourceIds).not.toBe(selectedOwnSourceIds);
    expect(normalize({ selectedOwnSourceIds: 'src_one', useOwnSources: true }).selectedOwnSourceIds).toEqual([]);
  });
});

describe('bounded workspace lifecycle integration', () => {
  it('adds snapshot, reset and autosave seams to the latest host without editing it', () => {
    const original = read('AlloFlowANTI.txt');
    const output = transforms['AlloFlowANTI.txt'](original);
    expect(output).toContain('get setSelectedOwnSourceIds() { return setSelectedOwnSourceIds; }');
    expect(output).toContain('..._alloNormalizeResearchSettings({ selectedOwnSourceIds, documentsOnly, useOwnSources, includeSourceCitations })');
    expect(output).toMatch(/sourceCustomInstructions, resourceCount,\r?\n\s+selectedOwnSourceIds, documentsOnly, useOwnSources, includeSourceCitations,/);
    const clear = output.slice(output.indexOf('const clearCanvasWorkspaceState ='), output.indexOf('const buildCanvasWorkspaceSnapshot ='));
    expect(clear).toContain('setSelectedOwnSourceIds(null)');
    expect(clear).toContain('setDocumentsOnly(false)');
    expect(read('AlloFlowANTI.txt')).toBe(original);
    expect(transforms['AlloFlowANTI.txt'](output)).toBe(output);
    expect(() => transforms['AlloFlowANTI.txt']('unexpected host')).toThrow('expected one research-settings seam');
  });

  it('restores each lesson selection and all legacy defaults through the actual transformed restore block', () => {
    const original = read('host_handlers_source.jsx');
    const output = transforms['host_handlers_source.jsx'](original);
    const start = output.indexOf('          const settings = workspace.lessonSettings || {};');
    const end = output.indexOf("          if (typeof settings.gradeLevel", start);
    const deps = { setSelectedOwnSourceIds: vi.fn(), setDocumentsOnly: vi.fn(), setUseOwnSources: vi.fn(), setIncludeSourceCitations: vi.fn() };
    const restore = new Function('workspace', '__d', '_alloNormalizeResearchSettings', output.slice(start, end));
    restore({ lessonSettings: { selectedOwnSourceIds: ['src_first'], useOwnSources: true, includeSourceCitations: true } }, deps, normalize);
    expect(deps.setSelectedOwnSourceIds).toHaveBeenLastCalledWith(['src_first']);
    expect(deps.setIncludeSourceCitations).toHaveBeenLastCalledWith(true);
    restore({ lessonSettings: { selectedOwnSourceIds: [], documentsOnly: true } }, deps, normalize);
    expect(deps.setSelectedOwnSourceIds).toHaveBeenLastCalledWith([]);
    expect(deps.setDocumentsOnly).toHaveBeenLastCalledWith(true);
    expect(deps.setIncludeSourceCitations).toHaveBeenLastCalledWith(false);
    restore({}, deps, normalize);
    expect(deps.setSelectedOwnSourceIds).toHaveBeenLastCalledWith(null);
    expect(deps.setDocumentsOnly).toHaveBeenLastCalledWith(false);
    expect(deps.setUseOwnSources).toHaveBeenLastCalledWith(false);
    expect(read('host_handlers_source.jsx')).toBe(original);
  });

  it('clears research settings when the transformed workspace reset executes', () => {
    const output = transforms['host_handlers_source.jsx'](read('host_handlers_source.jsx'));
    const start = output.indexOf('const resetCanvasWorkspaceSettings = () => {');
    const end = output.indexOf('\nconst restoreCanvasWorkspaceSnapshot', start);
    const calls = {};
    const deps = new Proxy({}, { get(_target, key) { return calls[key] || (calls[key] = vi.fn()); } });
    new Function('__d', output.slice(start, end) + '\nresetCanvasWorkspaceSettings();')(deps);
    expect(calls.setSelectedOwnSourceIds).toHaveBeenCalledWith(null);
    expect(calls.setDocumentsOnly).toHaveBeenCalledWith(false);
    expect(calls.setUseOwnSources).toHaveBeenCalledWith(false);
    expect(calls.setIncludeSourceCitations).toHaveBeenCalledWith(false);
  });
});
