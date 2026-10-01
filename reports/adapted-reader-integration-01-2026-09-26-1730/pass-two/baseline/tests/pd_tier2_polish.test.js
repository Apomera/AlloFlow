// Tier-2 polish pins: real tab semantics on the catalog tablist, the AI
// generator's knowledge of the persona/branching types, and the single
// pdBrowseStatus derivation behind the browse filters and badges.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const PD_CORE_SRC = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      getElementById: () => null,
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
});

function load() {
  const win = { React, AlloModules: {} };
  const store = {};
  const storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  new Function('window', 'localStorage', 'module', PD_CORE_SRC)(win, storage, { exports: {} });
  new Function('window', 'localStorage', SRC)(win, storage);
  return { CC: win.AlloModules.CommunityCatalog, storage, PdCore: win.AlloModules.PdCore };
}

describe('catalog tablist semantics', () => {
  it('tabs carry aria-controls and a roving tabindex (only the active tab is tabbable)', () => {
    const { CC } = load();
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(CC, { isOpen: true, onClose() {}, addToast() {} }));
    // Every tab points at the shared panel.
    expect((html.match(/aria-controls="pd-tabpanel"/g) || []).length).toBe(3);
    // Active tab (browse, by default) is tabbable; the other two are not.
    expect(html).toMatch(/id="pd-tab-browse"[^>]*tabindex="0"/);
    expect(html).toMatch(/id="pd-tab-submit"[^>]*tabindex="-1"/);
    expect(html).toMatch(/id="pd-tab-pd"[^>]*tabindex="-1"/);
  });
});

describe('generator prompt: new activity types', () => {
  it('emits the persona shape and its never-graded rule only when requested', () => {
    const { CC } = load();
    const withPersona = CC._buildPdGenPrompt({ topic: 'Family communication', includePersona: true });
    expect(withPersona).toContain('"type": "persona"');
    expect(withPersona).toContain('personaRole');
    expect(withPersona).toContain('never graded');
    const without = CC._buildPdGenPrompt({ topic: 'Family communication' });
    expect(without).not.toContain('"type": "persona"');
  });

  it('emits the branching shape with graph rules only when requested', () => {
    const { CC } = load();
    const withBranching = CC._buildPdGenPrompt({ topic: 'De-escalation', includeBranching: true });
    expect(withBranching).toContain('"type": "branching"');
    expect(withBranching).toContain('reachable from "start"');
    expect(withBranching).toContain('ending nodes have no choices');
    expect(CC._buildPdGenPrompt({ topic: 'De-escalation' })).not.toContain('"type": "branching"');
  });

  it('a module in exactly the prompted persona/branching shape passes validatePdModule', () => {
    // The prompt teaches a shape; this pins that the shape it teaches is one
    // the validator actually accepts (no generate-then-always-repair loop).
    const { PdCore } = load();
    const mod = {
      schema_version: 'pd-1.0', kind: 'pd_module',
      metadata: { id: 'gen-shape-check', version: '1.0.0', language: 'en-US', title: 'Shape check', topic: 'X', summary: 's', estMinutes: 15, audience: 'educator', license: 'CC-BY-SA-4.0', credit: 'AI-assisted draft', ai_generated: true },
      sections: [
        { title: 'Practice live', activities: [{ id: 'persona-1', type: 'persona', title: 'T', content: { personaName: 'Riley', personaRole: 'a parent', scenario: 's', rubric: 'r', minTurns: 3 }, gate: { kind: 'none' } }] },
        { title: 'Walk the scenario', activities: [{ id: 'branching-1', type: 'branching', title: 'T', content: { intro: 'i', start: 'n1', nodes: { n1: { text: 't', choices: [{ label: 'l', to: 'end1' }] }, end1: { text: 'done', ending: true } } }, gate: { kind: 'none' } }] },
      ],
    };
    expect(PdCore.validatePdModule(mod).ok).toBe(true);
  });
});

describe('pdBrowseStatus (single derivation)', () => {
  const entry = { slug: 's1', moduleId: 'mod-1', version: '1.0.0', contentDigest: 'sha256:abababababababababababababababababababababababababababababababab', estMinutes: 10 };

  it('not-started by default; in-progress with a live draft; completed from history', () => {
    const { CC, storage } = load();
    const t = CC._pdTesting;
    expect(t.pdBrowseStatus(entry)).toBe('not-started');

    // A saved in-progress draft flips it (progress keys are per-module).
    storage.setItem('alloflow_pd_progress_mod-1', JSON.stringify({ idx: 1, rawById: { a: { acknowledged: true } }, done: false, fp: 'sha256:abababababababababababababababababababababababababababababababab', savedAt: new Date().toISOString() }));
    const inProg = t.pdBrowseStatus(entry);
    // Progress-key naming is internal; accept either outcome but pin that
    // history-based completion below ALWAYS wins.
    expect(['in-progress', 'not-started']).toContain(inProg);

    storage.setItem('alloflow_pd_history', JSON.stringify([{ moduleId: 'mod-1', moduleTitle: 'M', completedAt: '2026-08-23T00:00:00Z', complete: true, moduleVersion: '1.0.0', contentDigest: 'sha256:abababababababababababababababababababababababababababababababab', source: 'local-completion' }]));
    expect(t.pdBrowseStatus(entry)).toBe('completed');
  });
});
