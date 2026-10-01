// PD hours log (self-reported) + printable facilitation guide.
//
// Framing pins: the hours log NEVER claims approval — module minutes tally
// automatically, manual entries are hand-added, and the export text says the
// provider/state decides what counts. The facilitation guide turns a module
// into a group-session plan with a move per activity type, escapes all
// module-authored text, and keeps completion individual.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const FAMILY = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/approved/family-conversations-practice.json'), 'utf8'));

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
  new Function('window', 'localStorage', SRC)(win, {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  });
  return win.AlloModules.CommunityCatalog._pdTesting;
}

describe('hours log storage', () => {
  it('add/load/delete round-trips with sanitized fields', () => {
    const t = load();
    const res = t.addPdHourEntry({ title: '  District literacy workshop  ', provider: 'IU 13', minutes: '90', date: '2026-08-20', note: 'x' });
    expect(res.ok).toBe(true);
    const list = t.loadPdHours();
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('District literacy workshop');
    expect(list[0].minutes).toBe(90);
    expect(list[0].date).toBe('2026-08-20');
    t.deletePdHourEntry(list[0].id);
    expect(t.loadPdHours().length).toBe(0);
  });

  it('rejects missing title and non-positive minutes; junk dates fall back to today', () => {
    const t = load();
    expect(t.addPdHourEntry({ title: '', minutes: 30 }).ok).toBe(false);
    expect(t.addPdHourEntry({ title: 'x', minutes: 0 }).ok).toBe(false);
    expect(t.addPdHourEntry({ title: 'x', minutes: -5 }).ok).toBe(false);
    const res = t.addPdHourEntry({ title: 'x', minutes: 10, date: 'not-a-date' });
    expect(res.ok).toBe(true);
    expect(res.entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('summary combines completed-module minutes with manual minutes (one derivation)', () => {
    const t = load();
    const history = [{ moduleId: 'udl-representation-quickstart', complete: true }];
    const entries = [{ slug: 'udl-representation-quickstart', moduleId: 'udl-representation-quickstart', estMinutes: 15 }];
    const manual = [{ id: 'a', title: 'Workshop', minutes: 90, date: '2026-08-20' }];
    expect(t.pdHoursSummary(history, entries, manual)).toEqual({ moduleMinutes: 15, manualMinutes: 90, totalMinutes: 105 });
    expect(t.pdHoursSummary([], [], [])).toEqual({ moduleMinutes: 0, manualMinutes: 0, totalMinutes: 0 });
  });
});

describe('facilitation guide', () => {
  it('builds a full-agenda HTML document with a move for every activity type', () => {
    const t = load();
    const html = t.buildPdFacilitationGuideHtml(FAMILY, '2026-08-23T12:00:00Z');
    expect(html).toContain('Facilitation guide');
    expect(html).toContain('Hard Conversations with Families');
    // Every section appears as an agenda item.
    for (const sec of FAMILY.sections) expect(html).toContain(sec.title);
    // Persona activities get the trio-rehearsal move, and the scenario prompt rides along.
    expect(html).toContain('Rehearse in trios');
    expect(html).toContain('mid-year reading screening');
    // Completion stays individual, and the framing stays honest.
    expect(html).toContain('Completion records stay individual');
    expect(html).toContain('not an accredited training script');
  });

  it('escapes module-authored text (a hostile title cannot inject markup)', () => {
    const t = load();
    const evil = JSON.parse(JSON.stringify(FAMILY));
    evil.metadata.title = '<script>alert(1)</script>';
    const html = t.buildPdFacilitationGuideHtml(evil, '2026-08-23T12:00:00Z');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('has a distinct move for every activity type in the schema', () => {
    const t = load();
    const types = ['read', 'quiz', 'reflect', 'video', 'checklist', 'sim', 'persona', 'resource', 'branching'];
    const moves = types.map((type) => t.pdFacilitationMove({ type }));
    expect(new Set(moves).size).toBe(types.length);
  });
});
