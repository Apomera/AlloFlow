// PD `resource` activity — frozen snapshots of pipeline resources
// (concept-sort / timeline / glossary) embedded BY VALUE in a pd-1.0 module.
//
// Design pins:
//  - The snapshot is data inside the module: digests bind it, it works offline.
//  - resource NEVER gates (score gates stay quiz-only in every validator).
//  - Concept sort completes when every card is PLACED — a mismatched sort
//    still completes (formative practice, sim philosophy).
//  - All three independent pd-1.0 validators (pd_core, worker, publish
//    pipeline inventory) understand the type; a module that passes one is not
//    silently rejected by another.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const PdCore = require(resolve(process.cwd(), 'pd_core_module.js'));
const Pipeline = require(resolve(process.cwd(), 'dev-tools/lib/pd_publish_pipeline.cjs'));
const worker = (await import(resolve(process.cwd(), 'catalog/cloudflare-worker/src/index.js').replace(/\\/g, '/'))).default;

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));

function catalogTesting() {
  const win = { React, AlloModules: {} };
  const store = {};
  const storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  new Function('window', 'localStorage', SRC)(win, storage);
  return win.AlloModules.CommunityCatalog._pdTesting;
}

function conceptSortActivity() {
  return {
    id: 'resource-1', type: 'resource', title: 'Sort the supports', gate: { kind: 'none' },
    content: {
      resourceType: 'concept-sort', instructions: 'Sort each support.',
      data: {
        categories: [{ id: 'c1', label: 'Representation' }, { id: 'c2', label: 'Engagement' }],
        items: [
          { id: 'i1', content: 'Diagram alongside text', categoryId: 'c1' },
          { id: 'i2', content: 'Choice of topic', categoryId: 'c2' },
        ],
      },
    },
  };
}

function moduleWith(activity) {
  return {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'resource-demo', version: '1.0.0', language: 'en-US', title: 'Resource demo', topic: 'UDL', estMinutes: 10, audience: 'educator', license: 'CC-BY-SA-4.0' },
    sections: [{ title: 'Explore', activities: [activity] }],
  };
}

describe('pd_core validation', () => {
  it('accepts all three resource types', () => {
    expect(PdCore.validatePdModule(moduleWith(conceptSortActivity())).ok).toBe(true);
    const timeline = { id: 'r-t', type: 'resource', title: 'Timeline', gate: { kind: 'none' }, content: { resourceType: 'timeline', data: { items: [{ date: '1984', event: 'CAST founded.' }] } } };
    expect(PdCore.validatePdModule(moduleWith(timeline)).ok).toBe(true);
    const glossary = { id: 'r-g', type: 'resource', title: 'Terms', gate: { kind: 'none' }, content: { resourceType: 'glossary', data: { items: [{ term: 'Scaffold', def: 'Temporary support.' }] } } };
    expect(PdCore.validatePdModule(moduleWith(glossary)).ok).toBe(true);
  });

  it('rejects an unknown resourceType, a dangling categoryId, and duplicate ids', () => {
    const bad1 = conceptSortActivity(); bad1.content.resourceType = 'word-cloud';
    expect(PdCore.validatePdModule(moduleWith(bad1)).error).toMatch(/resourceType/);
    const bad2 = conceptSortActivity(); bad2.content.data.items[1].categoryId = 'nope';
    expect(PdCore.validatePdModule(moduleWith(bad2)).error).toMatch(/categoryId/);
    const bad3 = conceptSortActivity(); bad3.content.data.items[1].id = 'i1';
    expect(PdCore.validatePdModule(moduleWith(bad3)).error).toMatch(/duplicate item id/);
  });

  it('rejects a score gate on resource — it can never block a learner', () => {
    const gated = conceptSortActivity(); gated.gate = { kind: 'score', threshold: 0.8 };
    const res = PdCore.validatePdModule(moduleWith(gated));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/produces no score/);
  });

  it('accessibility preflight demands alt text for embedded images', () => {
    const act = conceptSortActivity();
    act.content.data.items[0].image = 'https://example.org/img.png';
    const readiness = PdCore.auditAccessibilityReadiness(moduleWith(act));
    expect(readiness.status).toBe('review-required');
    expect(readiness.issues.some((i) => i.code === 'resource-image-alt-missing')).toBe(true);
    act.content.data.items[0].imageAlt = 'A diagram beside a paragraph.';
    expect(PdCore.auditAccessibilityReadiness(moduleWith(act)).status).toBe('ready-for-render-audit');
  });
});

describe('completion contract (normalizeResult)', () => {
  it('concept sort completes only when EVERY card is placed — mismatches still complete', () => {
    const act = conceptSortActivity();
    expect(PdCore.normalizeResult(act, {}).completed).toBe(false);
    expect(PdCore.normalizeResult(act, { placements: { i1: 'c1' } }).completed).toBe(false);
    // Wrong sort, but all placed: formative practice never strands a learner.
    expect(PdCore.normalizeResult(act, { placements: { i1: 'c2', i2: 'c1' } }).completed).toBe(true);
    expect(PdCore.normalizeResult(act, { placements: { i1: 'c1', i2: 'c2' } }).completed).toBe(true);
    // resource yields no score, so it can never satisfy a score gate.
    expect(PdCore.normalizeResult(act, { placements: { i1: 'c1', i2: 'c2' } }).score).toBe(null);
  });

  it('timeline and glossary snapshots complete on acknowledgement', () => {
    const timeline = { id: 'r-t', type: 'resource', title: 'T', content: { resourceType: 'timeline', data: { items: [{ date: '1984', event: 'x' }] } } };
    expect(PdCore.normalizeResult(timeline, {}).completed).toBe(false);
    expect(PdCore.normalizeResult(timeline, { acknowledged: true }).completed).toBe(true);
  });

  it('an all-placed concept sort passes its (none) gate and the module completes', () => {
    const act = conceptSortActivity();
    const mod = moduleWith(act);
    const results = { 'resource-1': PdCore.normalizeResult(act, { placements: { i1: 'c2', i2: 'c1' } }) };
    const ev = PdCore.evaluateModule(mod, results);
    expect(ev.complete).toBe(true);
  });
});

describe('worker trust boundary (/submitPd)', () => {
  function fakeKv() {
    const store = {};
    return { store, async put(k, v, o) { store[k] = { v, o }; }, async get(k) { return store[k] ? store[k].v : null; }, async list() { return { keys: Object.keys(store).map((name) => ({ name })) }; } };
  }
  function env() { return { PD_SUBMISSIONS: fakeKv() }; }
  function submission(activity) {
    return {
      pd_module: moduleWith(activity),
      credit: null,
      affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true },
    };
  }
  function post(body, e) {
    return worker.fetch(new Request('https://worker.test/submitPd', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), e);
  }

  it('accepts a resource-bearing module', async () => {
    const res = await post(submission(conceptSortActivity()), env());
    const body = await res.json();
    expect(body.ok, JSON.stringify(body)).toBe(true);
  });

  it('rejects an image without imageAlt (server-side accessibility floor)', async () => {
    const act = conceptSortActivity();
    act.content.data.items[0].image = 'https://example.org/img.png';
    const res = await post(submission(act), env());
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/imageAlt/);
  });

  it('rejects unknown keys smuggled into resource data', async () => {
    const act = conceptSortActivity();
    act.content.data.script = 'alert(1)';
    const res = await post(submission(act), env());
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/outside the pd-1.0 contract/);
  });
});

describe('publish-pipeline inventory parity', () => {
  it('knows the resource type, its states, and its content keys', () => {
    expect(Pipeline.PD_STATE_INVENTORY.activityTypes).toContain('resource');
    expect(Pipeline.PD_STATE_INVENTORY.activityStates.resource).toEqual(['initial', 'in-progress', 'completed']);
  });
});

describe('editor paste normalization (normalizePdResourceData)', () => {
  it('accepts pipeline-shaped payloads: raw arrays, {events}, {entries}, {items}', () => {
    const t = catalogTesting();
    expect(t.normalizePdResourceData('glossary', [{ term: 'a', def: 'b' }])).toEqual({ items: [{ term: 'a', def: 'b' }] });
    expect(t.normalizePdResourceData('timeline', { events: [{ date: '1984', event: 'x' }] })).toEqual({ items: [{ date: '1984', event: 'x' }] });
    expect(t.normalizePdResourceData('glossary', { entries: [{ term: 'a', def: 'b' }] })).toEqual({ items: [{ term: 'a', def: 'b' }] });
    expect(t.normalizePdResourceData('timeline', { items: [{ date: '1984', event: 'x' }] })).toEqual({ items: [{ date: '1984', event: 'x' }] });
  });

  it('concept-sort requires {categories, items}; a raw array is rejected', () => {
    const t = catalogTesting();
    expect(t.normalizePdResourceData('concept-sort', [{ id: 'i1' }])).toBe(null);
    const good = { categories: [{ id: 'c1', label: 'L' }], items: [{ id: 'i1', content: 'x', categoryId: 'c1' }], extra: 'dropped' };
    expect(t.normalizePdResourceData('concept-sort', good)).toEqual({ categories: good.categories, items: good.items });
  });

  it('rejects junk', () => {
    const t = catalogTesting();
    expect(t.normalizePdResourceData('glossary', 42)).toBe(null);
    expect(t.normalizePdResourceData('glossary', { nothing: true })).toBe(null);
  });
});
