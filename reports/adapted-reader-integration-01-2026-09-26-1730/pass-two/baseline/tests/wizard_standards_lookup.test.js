import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// Quick Start's "Find" button did nothing for a user in Gemini Canvas. Two
// separate defects stacked:
//   1. Canvas has had no web-search transport since the maintainer proxy was
//      retired, so callGemini(useSearch) throws allo/search-unavailable.
//   2. handleWizardStandardLookup caught EVERY error and returned undefined,
//      which the wizard ignored — no results, no toast, no error.
// These tests pin the second one, which is the part that made the first
// undiagnosable from the UI.

let handleWizardStandardLookup;

const noop = () => {};

function makeDeps(overrides = {}) {
  const base = {
    ai: { backend: 'gemini' },
    safeJsonParse: (s) => { try { return JSON.parse(s); } catch (_) { return null; } },
    warnLog: noop,
    debugLog: noop,
    addToast: noop,
    t: (k) => k,
    ...overrides,
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
  });
}

function searchUnavailable() {
  const err = new Error('Canvas web search provider is not loaded.');
  err.code = 'allo/search-unavailable';
  return err;
}

beforeAll(() => {
  loadAlloModule('phase_o_misc_handlers_module.js');
  handleWizardStandardLookup = window.AlloModules?.PhaseOHandlers?.handleWizardStandardLookup;
  if (typeof handleWizardStandardLookup !== 'function') {
    throw new Error('handleWizardStandardLookup failed to register');
  }
});

describe('wizard standards lookup', () => {
  it('sends an explicit web query carrying grade + framework, not the bare goal', async () => {
    // The Canvas search transport fetches results client-side, so the query is
    // whatever this handler supplies. Left to WebSearchProvider's regex
    // extractor, the prompt's `Learning Goal: "main ideas"` line scrapes down to
    // just "main ideas" — which searches the open web for reading-comprehension
    // blogs containing no standard codes, and the Find button returns nothing.
    const callGemini = vi.fn(async () => ({ text: '[]' }));

    await handleWizardStandardLookup('3rd Grade', 'main ideas', 'CCSS', makeDeps({ callGemini }));

    const [, jsonMode, useSearch, temperature, searchQuery] = callGemini.mock.calls[0];
    expect(useSearch).toBe(true);
    expect(searchQuery).toBeTruthy();
    expect(searchQuery).toContain('CCSS');
    expect(searchQuery).toContain('3rd Grade');
    expect(searchQuery).toContain('main ideas');
    expect(searchQuery).toMatch(/standard/i);
    // Must not be the bare goal — that is the failure mode this pins.
    expect(searchQuery.trim()).not.toBe('main ideas');
  });

  it('falls back to CCSS in the query when no region is given', async () => {
    const callGemini = vi.fn(async () => ({ text: '[]' }));

    await handleWizardStandardLookup('5th Grade', 'fractions', '', makeDeps({ callGemini }));

    const searchQuery = callGemini.mock.calls[0][4];
    expect(searchQuery).toContain('CCSS');
    expect(searchQuery).toContain('5th Grade');
    expect(searchQuery).toContain('fractions');
  });

  it('marks grounded results as web-verified', async () => {
    const callGemini = vi.fn(async () => ({
      text: JSON.stringify([{ code: 'CCSS.ELA-LITERACY.RI.3.2', description: 'Determine the main idea.', framework: 'CCSS' }]),
    }));

    const out = await handleWizardStandardLookup('3rd Grade', 'main ideas', 'CCSS', makeDeps({ callGemini }));

    expect(out).toHaveLength(1);
    expect(out[0].webVerified).toBe(true);
    expect(out[0].code).toBe('CCSS.ELA-LITERACY.RI.3.2');
  });

  it('falls back to model knowledge when search is unavailable, flagged NOT verified', async () => {
    const callGemini = vi.fn()
      .mockRejectedValueOnce(searchUnavailable())
      .mockResolvedValueOnce(JSON.stringify([
        { code: 'CCSS.ELA-LITERACY.RI.3.2', description: 'Determine the main idea.', framework: 'CCSS' },
      ]));

    const out = await handleWizardStandardLookup('3rd Grade', 'main ideas', 'CCSS', makeDeps({ callGemini }));

    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(1);
    // The whole point: the teacher must be able to tell these apart.
    expect(out[0].webVerified).toBe(false);

    // The retry must be an ungrounded JSON call, not another search attempt.
    const [, jsonMode, useSearch] = callGemini.mock.calls[1];
    expect(jsonMode).toBe(true);
    expect(useSearch).toBe(false);
  });

  it('instructs the fallback not to invent standard codes', async () => {
    const callGemini = vi.fn()
      .mockRejectedValueOnce(searchUnavailable())
      .mockResolvedValueOnce('[]');

    await handleWizardStandardLookup('3rd Grade', 'main ideas', '', makeDeps({ callGemini }));

    const fallbackPrompt = callGemini.mock.calls[1][0];
    expect(fallbackPrompt).toMatch(/DO NOT invent, guess, or approximate a code/);
    expect(fallbackPrompt).toMatch(/return an empty JSON array/);
  });

  it('rethrows a non-search failure instead of silently returning nothing', async () => {
    const boom = new Error('quota exhausted');
    boom.code = 'allo/quota';
    const callGemini = vi.fn(async () => { throw boom; });

    // Previously this resolved to undefined and the button just stopped
    // spinning, which is indistinguishable from an unwired button.
    await expect(
      handleWizardStandardLookup('3rd Grade', 'main ideas', '', makeDeps({ callGemini }))
    ).rejects.toThrow('quota exhausted');
  });

  it('returns an array (never undefined) when the model answers with prose', async () => {
    const callGemini = vi.fn(async () => ({ text: 'Here are some standards you might like!' }));

    const out = await handleWizardStandardLookup('3rd Grade', 'main ideas', '', makeDeps({ callGemini }));

    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(0);
  });

  it('uses webSearchProvider results on the local-backend path', async () => {
    // webSearchProvider was referenced here but never destructured from deps
    // AND never placed in the deps bag, so this path threw ReferenceError.
    const search = vi.fn(async () => ({
      results: [{ title: 'CCSS RI.3.2', snippet: 'Determine the main idea.', url: 'https://example.org/ri32' }],
      contextPrompt: 'ctx',
      groundingMetadata: { groundingChunks: [] },
    }));
    const generateText = vi.fn(async () => JSON.stringify([
      { code: 'CCSS.ELA-LITERACY.RI.3.2', description: 'Determine the main idea.', framework: 'CCSS' },
    ]));

    const out = await handleWizardStandardLookup('3rd Grade', 'main ideas', 'CCSS', makeDeps({
      ai: { backend: 'ollama', generateText },
      webSearchProvider: { search },
    }));

    expect(search).toHaveBeenCalled();
    expect(out).toHaveLength(1);
    expect(out[0].webVerified).toBe(true);

    // search() resolves { results, ... } — reading .length off the envelope
    // silently produced an empty search context on every call.
    const prompt = generateText.mock.calls[0][0];
    expect(prompt).toContain('WEB SEARCH RESULTS');
    expect(prompt).toContain('https://example.org/ri32');
  });

  it('flags local-backend results as unverified when the search returns nothing', async () => {
    const search = vi.fn(async () => ({ results: [], contextPrompt: '', groundingMetadata: null }));
    const generateText = vi.fn(async () => JSON.stringify([
      { code: 'CCSS.ELA-LITERACY.RI.3.2', description: 'Determine the main idea.', framework: 'CCSS' },
    ]));

    const out = await handleWizardStandardLookup('3rd Grade', 'main ideas', 'CCSS', makeDeps({
      ai: { backend: 'ollama', generateText },
      webSearchProvider: { search },
    }));

    expect(out[0].webVerified).toBe(false);
  });
});
