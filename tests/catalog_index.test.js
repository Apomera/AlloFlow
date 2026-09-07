// Community Catalog manifest integrity.
//
// (Runs under the project's default jsdom environment: tests/setup.js assumes `window`, so
// the per-file node-environment directive is not usable in this repo — and vitest reads that
// directive from ANY leading comment, so do not even mention it verbatim up here. Only node
// fs/path is needed.)
//
// WHY: catalog/index.json on raw main IS the live catalog — a push publishes within
// minutes. The generator used to rebuild it from catalog/approved/ alone, while the
// flagship AlloPack entries were pasted in by hand. Following the README's approval
// workflow would therefore have deleted every AlloPack from the live catalog, and no
// test read index.json at all. These tests pin the two properties that prevent that:
// regeneration reproduces the committed index, and every entry points at a real file.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const gen = require(path.join(root, 'catalog', 'generate_index.js'));
const index = JSON.parse(fs.readFileSync(path.join(root, 'catalog', 'index.json'), 'utf8'));
const published = JSON.parse(fs.readFileSync(path.join(root, 'catalog', 'published_allopacks.json'), 'utf8'));
const approvedFiles = fs.readdirSync(path.join(root, 'catalog', 'approved')).filter((f) => f.endsWith('.json'));

const REQUIRED = ['slug', 'title', 'subject', 'grade_level', 'tags', 'license', 'path'];

describe('Community Catalog index', () => {
  it('has entries to check', () => {
    expect(index.entries.length).toBeGreaterThan(0);
    expect(published.length, 'no published AlloPacks — the drop-proof below would be vacuous').toBeGreaterThan(0);
  });

  it('points every entry at a file that exists', () => {
    for (const e of index.entries) {
      expect(fs.existsSync(path.join(root, e.path)), `${e.slug} → ${e.path} is missing on disk`).toBe(true);
    }
  });

  it('gives every entry the fields the catalog UI reads, with unique slugs and paths', () => {
    const slugs = new Set(), paths = new Set();
    for (const e of index.entries) {
      for (const k of REQUIRED) expect(e[k], `${e.slug || e.path} lacks ${k}`).toBeDefined();
      expect(Array.isArray(e.tags), `${e.slug} tags`).toBe(true);
      expect(slugs.has(e.slug), `duplicate slug ${e.slug}`).toBe(false);
      expect(paths.has(e.path), `duplicate path ${e.path}`).toBe(false);
      slugs.add(e.slug); paths.add(e.path);
    }
  });

  it('lists every approved submission', () => {
    const inIndex = new Set(index.entries.map((e) => e.path));
    for (const f of approvedFiles) {
      expect(inIndex.has(`catalog/approved/${f}`), `approved/${f} is not in the index`).toBe(true);
    }
  });

  it('lists every published AlloPack', () => {
    const inIndex = new Set(index.entries.map((e) => e.path));
    for (const p of published) {
      expect(inIndex.has(p.path), `published AlloPack ${p.path} is not in the index`).toBe(true);
    }
  });

  it('is exactly what the generator produces (regenerating drops nothing and changes nothing)', () => {
    // The drop-proof. Anything hand-edited into index.json but absent from the two sources
    // fails here, BEFORE a maintainer runs the generator and publishes the loss.
    const built = gen.buildManifest();
    expect(built.entries).toEqual(index.entries);
    expect(built.schema_version).toBe(index.schema_version);
  });

  it('would have caught the original defect: approved/ alone is not the whole catalog', () => {
    // Calibration on the known-bad behaviour. The old generator's output equals
    // approvedEntries(); it must be strictly smaller than the real index whenever any
    // AlloPack is published, or this file proves nothing.
    const approvedOnly = gen.approvedEntries();
    expect(approvedOnly.length).toBe(index.entries.length - published.length);
    expect(approvedOnly.length).toBeLessThan(index.entries.length);
  });

  it('derives AlloPack entries from the pack file, with manifest overrides winning', () => {
    for (const p of published) {
      const entry = index.entries.find((e) => e.path === p.path);
      const pack = JSON.parse(fs.readFileSync(path.join(root, p.path), 'utf8').replace(/^﻿/, ''));
      expect(entry.title).toBe(p.title || pack.allopack.title);
      expect(entry.license).toBe(p.license || pack.allopack.license || 'CC-BY-4.0');
      if (p.slug) expect(entry.slug).toBe(p.slug);
    }
  });

  it('refuses a published AlloPack whose file is missing, instead of publishing a 404', () => {
    const dir = fs.mkdtempSync(path.join(root, 'catalog', '.tmp-'));
    try {
      const ghost = path.relative(root, path.join(dir, 'ghost.allopack.json')).replace(/\\/g, '/');
      const { entryFromPack } = require(path.join(root, 'catalog', 'allopack_entry.js'));
      expect(() => entryFromPack(root, { path: ghost })).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
