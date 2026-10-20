// Analyze Source web verification (2026-10-19). Each segment's grounded check searches with the
// lesson's topic. Without a topic, one short subject label is generated first; the document text
// itself is never the search query. In Canvas, where the search runs on that query, no label means
// no search (and the analysis says verification was unavailable).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);

let verify;
beforeAll(() => {
  globalThis.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('phase_k_helpers_module.js');
  verify = window.AlloModules.PhaseKHelpers.performDeepVerification;
});

const DOCUMENT = 'PRIVATE_DOCUMENT_SENTINEL. In 1773 colonists dumped tea into Boston Harbor to protest taxation without representation.';
function deps(overrides) {
  const callGemini = vi.fn(async (prompt, json, useSearch) => (useSearch ? { text: 'Verified facts [1]', groundingMetadata: null } : 'Causes of the American Revolution'));
  return Object.assign({
    callGemini, chunkText: (text) => [text], setGenerationStep: vi.fn(), warnLog: vi.fn(), applyGlobalCitations: (t) => t,
    sourceTopic: '', _isCanvasEnv: false, isCanvas: false,
  }, overrides, { callGemini: (overrides && overrides.callGemini) || callGemini });
}
const searchCalls = (d) => d.callGemini.mock.calls.filter((call) => call[2] === true);

describe('Analyze Source verification query', () => {
  it("searches with the lesson's topic when there is one", async () => {
    const d = deps({ sourceTopic: '  The American Revolution ' });
    await verify(DOCUMENT, d);
    expect(d.callGemini.mock.calls.filter((call) => call[2] !== true)).toHaveLength(0);
    expect(searchCalls(d)).toHaveLength(1);
    expect(searchCalls(d)[0][4]).toBe('The American Revolution');
  });

  it('generates a short subject label when there is no topic, and searches with that', async () => {
    const d = deps({});
    await verify(DOCUMENT, d);
    const labelCall = d.callGemini.mock.calls[0];
    expect(labelCall[2]).toBe(false);
    expect(searchCalls(d)[0][4]).toBe('Causes of the American Revolution');
    for (const call of searchCalls(d)) expect(String(call[4])).not.toContain('PRIVATE_DOCUMENT_SENTINEL');
  });

  it('keeps only the first line of the label, without quotes or trailing punctuation', async () => {
    const callGemini = vi.fn(async (prompt, json, useSearch) => (useSearch ? { text: 'ok' } : { text: '"Boston Tea Party."\nExtra commentary' }));
    const d = deps({ callGemini });
    await verify(DOCUMENT, d);
    expect(searchCalls(d)[0][4]).toBe('Boston Tea Party');
  });

  it('does not search in Canvas when no label can be made', async () => {
    const callGemini = vi.fn(async (prompt, json, useSearch) => { if (!useSearch) throw new Error('label failed'); return { text: 'should not run' }; });
    const d = deps({ callGemini, _isCanvasEnv: true });
    const out = await verify(DOCUMENT, d);
    expect(out).toEqual({ text: '', sources: [] });
    expect(searchCalls(d)).toHaveLength(0);
  });

  it('still verifies outside Canvas (Google grounding) when no label can be made', async () => {
    const callGemini = vi.fn(async (prompt, json, useSearch) => { if (!useSearch) throw new Error('label failed'); return { text: 'Verified' }; });
    const d = deps({ callGemini });
    await verify(DOCUMENT, d);
    expect(searchCalls(d)).toHaveLength(1);
    expect(searchCalls(d)[0][4]).toBe(null);
  });
});
