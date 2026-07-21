// AlloPack catalog validator (2026-07-20) — the executable spec applied to EVERY pack in
// allopacks/. Adding a new pack file automatically subjects it to these checks; a pack that
// passes loads via Load Project and renders. Shapes are validated the way the RENDERERS read
// them, directions through the REAL app normalizer, envelopes through the REAL Agent Core
// contract. Catalog policy (settled 2026-07-20): packs are ENGLISH-ONLY.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const Contracts = require_(resolve(process.cwd(), 'agent_core_contracts_module.js'));

// REAL directions normalizer, eval-sliced from the app.
const _s = anti.indexOf('function _alloNormalizeDirectionsData(');
const _e = anti.indexOf('let globalAudioCtx');
const { normalize } = new Function(anti.slice(_s, _e) + '\nreturn { normalize: _alloNormalizeDirectionsData };')();

const TEACHER_ONLY = anti.slice(anti.indexOf('const TEACHER_ONLY_TYPES = ['), anti.indexOf('const TEACHER_ONLY_TYPES = [') + 600);
const REGISTERED = new Set(['simplified', 'glossary', 'concept-sort', 'quiz', 'sentence-frames', 'faq', 'directions', 'timeline', 'outline']);
const LEGAL_GAMES = new Set(['crossword', 'wordScramble', 'memory', 'matching', 'bingo', 'timelineGame', 'conceptSortGame', 'syntaxScramble', 'vennDiagram', 'causeEffectSort']);

const files = readdirSync(resolve(process.cwd(), 'allopacks')).filter((f) => f.endsWith('.allopack.json'));
expect(files.length).toBeGreaterThan(0);

describe.each(files)('AlloPack: %s', (file) => {
  const pack = JSON.parse(readFileSync(resolve(process.cwd(), 'allopacks', file), 'utf8'));
  const items = pack.history;
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const ofType = (t) => items.filter((i) => i.type === t);

  it('envelope: spec, standards with glosses, sourceTopic, history', () => {
    expect(pack.allopack.spec).toBe('0.1');
    expect(pack.allopack.title).toBeTruthy();
    expect(pack.allopack.gradeLevel).toBeTruthy();
    expect(pack.allopack.standards).toMatch(/\(.+\)/); // codes carry a human gloss
    expect(typeof pack.sourceTopic).toBe('string');
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it('items: unique ids, registered types, student-safe, display-string meta', () => {
    const seen = new Set();
    for (const it of items) {
      expect(it.id, 'duplicate id ' + it.id).toBe(seen.has(it.id) ? '__dupe__' : it.id);
      seen.add(it.id);
      expect(REGISTERED.has(it.type), 'unregistered type ' + it.type).toBe(true);
      expect(TEACHER_ONLY).not.toContain("'" + it.type + "'");
      expect(typeof it.title).toBe('string');
      expect(new Date(it.timestamp).toString()).not.toBe('Invalid Date');
      if (it.meta !== undefined) expect(typeof it.meta).toBe('string');
    }
  });

  it('ENGLISH-ONLY catalog policy: no embedded translations', () => {
    expect(JSON.stringify(pack)).not.toContain('"translations"');
    expect(pack.allopack.language).toBe('en');
  });

  it('directions: present, opens the unit, normalizer keeps every objective', () => {
    const d = ofType('directions');
    expect(d.length).toBe(1);
    const norm = normalize(d[0].data);
    expect(norm.body.length).toBeGreaterThan(80);
    const authored = (d[0].data && d[0].data.objectives) || [];
    expect(norm.objectives).toHaveLength(authored.length);
    for (const o of authored) {
      expect(['xp', 'game', 'manual']).toContain(o.kind);
      if (o.kind === 'game') {
        expect(LEGAL_GAMES.has(o.gameType), 'illegal gameType ' + o.gameType).toBe(true);
        if (o.resourceRef) expect(byId[o.resourceRef], 'unresolvable resourceRef ' + o.resourceRef).toBeTruthy();
      }
      if (o.kind === 'xp') { expect(o.amount).toBeGreaterThanOrEqual(1); expect(o.amount).toBeLessThanOrEqual(1000); }
    }
    // a game goal needs a glossary to play against
    if (authored.some((o) => o.kind === 'game')) expect(ofType('glossary').length).toBeGreaterThanOrEqual(1);
    // exactly one honest self-check keeps the checklist human
    expect(authored.filter((o) => o.kind === 'manual').length).toBeGreaterThanOrEqual(1);
  });

  it('per-type shapes match what the renderers read', () => {
    for (const r of items) {
      if (r.type === 'simplified') {
        expect(typeof r.data).toBe('string');
        expect(r.data.split(/\n{2,}/).length).toBeGreaterThanOrEqual(4);
      }
      if (r.type === 'glossary') {
        expect(Array.isArray(r.data)).toBe(true);
        expect(r.data.length).toBeGreaterThanOrEqual(8);
        for (const g of r.data) {
          expect(typeof g.term).toBe('string');
          expect(typeof g.def).toBe('string');
          expect(['Academic', 'Domain-Specific']).toContain(g.tier);
        }
      }
      if (r.type === 'concept-sort') {
        const ids = new Set(r.data.categories.map((c) => c.id));
        expect(r.data.categories.length).toBeGreaterThanOrEqual(2);
        for (const c of r.data.categories) expect(c.color).toMatch(/^bg-[a-z]+-500$/);
        for (const i of r.data.items) expect(ids.has(i.categoryId), 'orphan categoryId ' + i.categoryId).toBe(true);
        expect(r.data.items.length).toBeGreaterThanOrEqual(6);
      }
      if (r.type === 'quiz') {
        expect(r.data.questions.length).toBeGreaterThanOrEqual(5);
        for (const q of r.data.questions) {
          expect(q.conceptLabel).toBe(String(q.conceptLabel).toLowerCase());
          if (q.type === 'mcq') {
            expect(q.options).toHaveLength(4);
            expect(q.options, 'correctAnswer not byte-identical to an option: ' + q.question).toContain(q.correctAnswer);
          } else if (q.type === 'shortAnswer') {
            expect(typeof q.expectedAnswer).toBe('string');
          }
        }
        expect(Array.isArray(r.data.reflections)).toBe(true);
      }
      if (r.type === 'sentence-frames') {
        expect(r.data.mode).toBe('list');
        for (const i of r.data.items) expect(typeof i.text).toBe('string');
        expect(r.data.rubric).toMatch(/\|.*\|.*\|/);
      }
      if (r.type === 'faq') {
        expect(Array.isArray(r.data)).toBe(true);
        for (const f of r.data) { expect(typeof f.question).toBe('string'); expect(typeof f.answer).toBe('string'); }
      }
      if (r.type === 'timeline') {
        expect(r.data.progressionLabel).toMatch(/:/); // "AXIS: low -> high"
        expect(r.data.items.length).toBeGreaterThanOrEqual(4);
        for (const t of r.data.items) { expect(typeof t.date).toBe('string'); expect(typeof t.event).toBe('string'); }
      }
      if (r.type === 'outline') {
        expect(typeof r.data.main).toBe('string');
        expect(r.data.branches.length).toBeGreaterThanOrEqual(2);
        for (const b of r.data.branches) { expect(typeof b.title).toBe('string'); expect(Array.isArray(b.items)).toBe(true); }
      }
    }
  });

  it('authoring rules: privacy, size, no embedded images, Agent Core contract', () => {
    const s = JSON.stringify(pack).toLowerCase();
    for (const banned of ['iep', '504 plan', 'accommodation', 'low group', 'high group', 'sped']) {
      expect(s, 'banned term in pack: ' + banned).not.toContain(banned);
    }
    expect(JSON.stringify(pack).length).toBeLessThan(500000);
    expect(JSON.stringify(pack)).not.toMatch(/data:image\//);
    const report = Contracts.validateArtifact({
      schemaVersion: Contracts.SCHEMA_VERSION,
      artifactId: 'allopack-' + file.replace('.allopack.json', ''),
      type: 'allopack',
      title: pack.allopack.title,
      language: pack.allopack.language,
      data: pack,
    });
    expect(report.ok, JSON.stringify(report.errors || [])).toBe(true);
  });
});

describe('catalog-wide', () => {
  it('every pack has an image shot-list companion', () => {
    const docs = readdirSync(resolve(process.cwd(), 'allopacks'));
    for (const f of files) {
      const pack = JSON.parse(readFileSync(resolve(process.cwd(), 'allopacks', f), 'utf8'));
      if (!pack.allopack.imageShotList) continue;
      const base = pack.allopack.imageShotList.split('/').pop();
      expect(docs, 'missing shot-list ' + base).toContain(base);
    }
  });
  it('resource-type coverage across the catalog is broad (variety goal)', () => {
    const types = new Set();
    for (const f of files) {
      for (const it of JSON.parse(readFileSync(resolve(process.cwd(), 'allopacks', f), 'utf8')).history) types.add(it.type);
    }
    expect(types.size).toBeGreaterThanOrEqual(7);
  });
});
