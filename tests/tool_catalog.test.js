// Unit tests for window.AlloModules.ToolCatalog (tool_catalog_module.js).
//
// This catalog is the single source of truth the generate-dispatcher + AlloBot
// prompts read from; the module's own header notes tools "silently fell out of
// AlloBot's awareness" when copies drifted. These tests pin the registry
// contract (every entry well-formed, ids unique) and the prompt formatters.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let TC;
beforeAll(() => {
  loadAlloModule('tool_catalog_module.js');
  TC = window.AlloModules.ToolCatalog;
  if (!TC) throw new Error('ToolCatalog failed to register');
});

describe('TOOL_CATALOG (registry contract)', () => {
  it('every entry has a non-empty string id and description', () => {
    expect(Array.isArray(TC.TOOL_CATALOG)).toBe(true);
    expect(TC.TOOL_CATALOG.length).toBeGreaterThan(0);
    for (const t of TC.TOOL_CATALOG) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
    }
  });
  it('tool ids are unique', () => {
    const ids = TC.getToolIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getToolIds / getToolIdsCsv', () => {
  it('includes the core tool ids and matches the catalog length', () => {
    const ids = TC.getToolIds();
    for (const core of ['analysis', 'simplified', 'glossary', 'outline', 'image', 'quiz']) {
      expect(ids).toContain(core);
    }
    expect(ids.length).toBe(TC.TOOL_CATALOG.length);
  });
  it('CSV joins ids with ", "', () => {
    expect(TC.getToolIdsCsv()).toContain('analysis, simplified');
    expect(TC.getToolIdsCsv().split(', ').length).toBe(TC.TOOL_CATALOG.length);
  });
  it('honors a passed-in catalog override', () => {
    expect(TC.getToolIds([{ id: 'x' }, { id: 'y' }])).toEqual(['x', 'y']);
    expect(TC.getToolIdsCsv([{ id: 'x' }, { id: 'y' }])).toBe('x, y');
  });
});

describe('getToolEntry', () => {
  it('returns the entry for a known id', () => {
    const e = TC.getToolEntry('persona');
    expect(e).toBeDefined();
    expect(e.id).toBe('persona');
    expect(e.description).toMatch(/interview/i);
  });
  it('returns undefined for an unknown id', () => {
    expect(TC.getToolEntry('definitely-not-a-tool')).toBeUndefined();
  });
});

describe('prompt formatters', () => {
  it('formatToolCatalogForPrompt emits one bolded markdown line per tool', () => {
    const out = TC.formatToolCatalogForPrompt();
    expect(out).toContain('**analysis**');
    expect(out.split('\n').length).toBe(TC.TOOL_CATALOG.length);
  });
  it('formatToolCatalogInline uses the "id — description" form', () => {
    const out = TC.formatToolCatalogInline();
    expect(out).toContain('analysis — Analyzes source text');
    expect(out.split('\n').length).toBe(TC.TOOL_CATALOG.length);
  });
});
