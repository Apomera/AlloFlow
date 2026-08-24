// PD authoring — the My modules shelf, module builder (PdEditor), and remix.
//
// Three visibility tiers for educator-authored PD: private (device-local
// drafts on this shelf), shared (module JSON exported and imported by a
// colleague), submitted (the existing /submitPd review route). Only the third
// tier is ever maintainer-reviewed. These tests pin the shelf's storage
// contract (caps, shape filtering), the remix provenance rules, the blank
// scaffold's validity, and the editor surface (render + axe smoke).

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const PD_CORE_SRC = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/approved/udl-representation-quickstart.json'), 'utf8'));

function freshStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

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
  const storage = freshStorage();
  new Function('window', 'localStorage', 'module', PD_CORE_SRC)(win, storage, { exports: {} });
  new Function('window', 'localStorage', SRC)(win, storage);
  return { CC: win.AlloModules.CommunityCatalog, win, storage, Core: win.AlloModules.PdCore };
}

function render(component, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
}

async function audit(fragment) {
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PD editor audit</title></head>'
    + '<body><main><h1>PD authoring</h1>' + fragment + '</main></body></html>';
  const dom = new JSDOM(page, { runScripts: 'outside-only' });
  dom.window.eval(axe.source);
  return dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] },
  });
}

describe('blankPdModule scaffold', () => {
  it('passes the validator AND the accessibility preflight out of the box', () => {
    const { CC, Core } = load();
    const blank = CC._pdTesting.blankPdModule();
    const v = Core.validatePdModule(blank);
    expect(v.ok).toBe(true);
    expect(Core.auditAccessibilityReadiness(v.module).status).toBe('ready-for-render-audit');
  });
});

describe('My modules shelf storage contract', () => {
  it('upsert + load + delete round-trips and newest saves list first', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    const a = t.newPdDraftFromModule(t.blankPdModule(), 'hand');
    const b = t.newPdDraftFromModule(t.blankPdModule(), 'ai');
    expect(t.upsertPdMyModule(a).ok).toBe(true);
    expect(t.upsertPdMyModule(b).ok).toBe(true);
    const list = t.loadPdMyModules();
    expect(list.length).toBe(2);
    expect(list[0].draftId).toBe(b.draftId); // unshift: newest first
    t.deletePdMyModule(a.draftId);
    expect(t.loadPdMyModules().length).toBe(1);
    expect(t.loadPdMyModules()[0].draftId).toBe(b.draftId);
  });

  it('updating an existing draft keeps its position and does not duplicate', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    const a = t.newPdDraftFromModule(t.blankPdModule(), 'hand');
    t.upsertPdMyModule(a);
    const edited = { ...a, module: { ...a.module, metadata: { ...a.module.metadata, title: 'Edited title' } } };
    expect(t.upsertPdMyModule(edited).ok).toBe(true);
    const list = t.loadPdMyModules();
    expect(list.length).toBe(1);
    expect(list[0].module.metadata.title).toBe('Edited title');
    expect(new Date(list[0].updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(a.updatedAt).getTime());
  });

  it('rejects a 51st draft with a clear error (count cap)', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    for (let i = 0; i < 50; i++) {
      const d = t.newPdDraftFromModule(t.blankPdModule(), 'hand');
      d.draftId = 'draft-fixed-' + i; // deterministic ids so the loop cannot collide
      expect(t.upsertPdMyModule(d).ok).toBe(true);
    }
    const overflow = t.newPdDraftFromModule(t.blankPdModule(), 'hand');
    const res = t.upsertPdMyModule(overflow);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/full/);
    expect(t.loadPdMyModules().length).toBe(50);
  });

  it('rejects an oversized draft (per-draft byte cap)', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    const big = t.blankPdModule();
    big.sections[0].activities[0].content.body = 'x'.repeat(400000);
    const res = t.upsertPdMyModule(t.newPdDraftFromModule(big, 'hand'));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/too large/);
  });

  it('load filters junk records instead of crashing', () => {
    const { CC, storage } = load();
    storage.setItem('alloflow_pd_my_modules_v1', JSON.stringify([
      null, 42, { noDraftId: true }, { draftId: 'ok-1', module: { kind: 'pd_module' } }, { draftId: 'bad', module: 'not-an-object' },
    ]));
    const list = CC._pdTesting.loadPdMyModules();
    expect(list.length).toBe(1);
    expect(list[0].draftId).toBe('ok-1');
  });
});

describe('remixPdModule provenance', () => {
  it('derives a valid module with -remix id, Remix title, and credit trail', () => {
    const { CC, Core } = load();
    const remixed = CC._pdTesting.remixPdModule(SEED);
    expect(remixed.metadata.id).toBe(SEED.metadata.id + '-remix');
    expect(remixed.metadata.title).toBe('Remix: ' + SEED.metadata.title);
    expect(remixed.metadata.credit).toContain('remixed from ' + SEED.metadata.id);
    expect(remixed.metadata.credit).toContain(SEED.metadata.credit); // original credit preserved
    expect(Core.validatePdModule(remixed).ok).toBe(true);
    // The source module is untouched.
    expect(SEED.metadata.title.startsWith('Remix:')).toBe(false);
  });
});

describe('pdNextActivityId', () => {
  it('returns the first free type-suffixed id across ALL sections', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    const mod = t.blankPdModule(); // has read-1
    expect(t.pdNextActivityId(mod, 'read')).toBe('read-2');
    expect(t.pdNextActivityId(mod, 'quiz')).toBe('quiz-1');
    mod.sections.push({ title: 'S2', activities: [{ id: 'quiz-1', type: 'quiz', title: 'Q', content: {} }] });
    expect(t.pdNextActivityId(mod, 'quiz')).toBe('quiz-2');
  });
});

describe('PdEditor surface', () => {
  it('renders the builder for a valid draft with a green checks panel', () => {
    const { CC } = load();
    const draft = CC._pdTesting.newPdDraftFromModule(SEED, 'remix');
    const html = render(CC.PdEditor, { draft, addToast() {}, onBack() {}, onSaved() {}, onRun() {}, onSubmit() {} });
    expect(html).toContain('Module builder');
    expect(html).toContain('Valid pd-1.0 module');
    expect(html).toContain('Accessibility-authoring preflight passed');
    expect(html).toContain(SEED.metadata.title);
    expect(html).toContain('Run this draft');
    expect(html).toContain('Submit for review');
  });

  it('shows the schema error for an invalid draft and disables running it', () => {
    const { CC } = load();
    const bad = JSON.parse(JSON.stringify(SEED));
    delete bad.metadata.title;
    const draft = CC._pdTesting.newPdDraftFromModule(bad, 'hand');
    const html = render(CC.PdEditor, { draft, addToast() {}, onBack() {}, onSaved() {}, onRun() {}, onSubmit() {} });
    expect(html).toContain('Schema: Missing metadata.title.');
    expect(html).not.toContain('preflight passed');
  });

  it('surfaces accessibility-preflight issues for an authored video without captions', () => {
    const { CC } = load();
    const mod = JSON.parse(JSON.stringify(SEED));
    mod.sections.push({ title: 'Watch', activities: [{ id: 'video-1', type: 'video', title: 'Clip', content: { url: 'https://example.test/clip.mp4' }, gate: { kind: 'none' } }] });
    const draft = CC._pdTesting.newPdDraftFromModule(mod, 'hand');
    const html = render(CC.PdEditor, { draft, addToast() {}, onBack() {}, onSaved() {}, onRun() {}, onSubmit() {} });
    expect(html).toContain('Provide captions for prerecorded video.');
  });

  it('passes an axe WCAG 2.2 A/AA smoke audit', async () => {
    const { CC } = load();
    const draft = CC._pdTesting.newPdDraftFromModule(SEED, 'remix');
    const html = render(CC.PdEditor, { draft, addToast() {}, onBack() {}, onSaved() {}, onRun() {}, onSubmit() {} });
    const results = await audit(html);
    expect(results.violations, results.violations.map(v => v.id).join(', ')).toEqual([]);
  });
});

describe('PdHome browse header', () => {
  it('offers the My modules entry point', () => {
    const { CC } = load();
    const html = render(CC.PdHome, { addToast() {} });
    expect(html).toContain('My modules');
  });
});
