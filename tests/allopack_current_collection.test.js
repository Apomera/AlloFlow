import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// One current illustrated pack per topic (2026-11-02 collection pass) lives in allopacks/current/.
// Older editions stay on disk but unlisted, so this gate covers what the catalog actually serves.
const api = require('../agent_core_resource_pack_module.js');
const media = require('../agent_core_pack_media_module.js');
const window = { React: { createElement() {}, useState() { return []; }, useEffect() {}, useRef() { return {}; }, useMemo(f) { return f(); }, useCallback(f) { return f; } }, AlloModules: {} };
vm.runInNewContext(fs.readFileSync('alt_text_module.js', 'utf8'), { window, console });
const { hashImage } = window.AlloModules.AltText;
const dir = 'allopacks/current/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.allopack.json')).sort();
const packs = files.map(f => [f, JSON.parse(fs.readFileSync(dir + f, 'utf8').replace(/^﻿/, ''))]);
const index = JSON.parse(fs.readFileSync('catalog/index.json', 'utf8')).entries.filter(e => e.path.endsWith('.allopack.json'));

describe('current AlloPack collection', () => {
  it('lists exactly one catalog entry per current pack, except withheld packs, and nothing else', () => {
    expect(files).toHaveLength(67);
    const withheld = new Set(JSON.parse(fs.readFileSync('catalog/superseded_allopacks.json', 'utf8')).withheld.map(w => w.path));
    expect(withheld.size).toBe(3);
    expect(index.map(e => e.path).sort()).toEqual(files.map(f => dir + f).filter(p => !withheld.has(p)));
    expect(new Set(index.map(e => e.share_slug)).size).toBe(index.length);
  });
  it('passes native validation and complete media checks', () => {
    const bad = [];
    for (const [f, pack] of packs) {
      const v = api.validatePack(pack, { profile: 'native' });
      if (!v.ok) bad.push(f + ': ' + JSON.stringify(v.errors).slice(0, 200));
      const m = media.validatePackMedia(pack, { profile: 'native' });
      if (!m.ok || !m.stats.complete) bad.push(f + ' media: ' + JSON.stringify(m.errors || m.stats).slice(0, 200));
    }
    expect(bad).toEqual([]);
  }, 120000);
  // Illustrated editions already used a second id prefix for added visuals (e.g. ag/agx), so only
  // whole ids must be unique across the collection.
  it('keeps resource ids unique and dates valid across the collection', () => {
    const owner = new Map(), bad = [];
    for (const [f, pack] of packs) for (const r of pack.history) {
      if (owner.has(r.id)) bad.push('id ' + r.id + ': ' + owner.get(r.id) + ' & ' + f); else owner.set(r.id, f);
      if (Number.isNaN(new Date(r.timestamp).getTime())) bad.push(f + ' ' + r.id + ' has no valid timestamp');
    }
    expect(bad).toEqual([]);
  });
  it('ties every sort-card, glossary and timeline description to its current picture', () => {
    const bad = [];
    let checked = 0;
    for (const [f, pack] of packs) for (const r of pack.history) {
      const rows = r.type === 'concept-sort' ? r.data.items || [] : r.type === 'glossary' ? r.data || [] : r.type === 'timeline' ? r.data.items || [] : [];
      for (const it of rows) {
        if (typeof it.image !== 'string' || !it.image.startsWith('data:image/')) continue;
        const timeline = r.type === 'timeline';
        const alt = timeline ? it.alt : it.imageAlt, hash = timeline ? it.altHash : it.imageAltHash;
        checked++;
        if ((timeline ? it.decorative : it.imageDecorative) === true) continue;
        if (typeof alt !== 'string' || alt.trim().length < 10 || hash !== hashImage(it.image)) bad.push(f + ' ' + r.id + ' ' + (it.id || it.term || it.date));
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad).toEqual([]);
  }, 120000);
});
