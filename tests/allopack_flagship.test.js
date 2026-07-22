// AlloPack format v0.1 — executable spec (2026-07-20).
// The flagship pack (allopacks/water_cycle_grade6.allopack.json) is validated the way the APP
// will consume it: shapes checked against what the renderers actually read, directions run
// through the REAL normalizer (eval-sliced from ANTI), the envelope through the REAL Agent
// Core artifact contract. A pack that passes here loads via Load Project and renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const pack = JSON.parse(readFileSync(resolve(process.cwd(), 'allopacks/water_cycle_grade6.allopack.json'), 'utf8'));
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// The REAL directions normalizer + evaluator, eval-sliced from the app.
const start = anti.indexOf('function _alloNormalizeDirectionsData(');
const end = anti.indexOf('let globalAudioCtx');
const { normalize } = new Function(anti.slice(start, end) + '\nreturn { normalize: _alloNormalizeDirectionsData };')();

const items = pack.history;
const byId = Object.fromEntries(items.map((i) => [i.id, i]));
const ofType = (t) => items.filter((i) => i.type === t);

describe('envelope + loader compatibility', () => {
  it('has the allopack metadata block and a history array (what handleLoadProject consumes)', () => {
    expect(pack.allopack.spec).toBe('0.1');
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(6);
  });
  it('every item carries the envelope: unique id, registered type, title, timestamp, data', () => {
    const seen = new Set();
    const REGISTERED = new Set(['simplified', 'glossary', 'concept-sort', 'quiz', 'sentence-frames', 'faq', 'directions', 'anchor-chart']);
    for (const it2 of items) {
      expect(it2.id && !seen.has(it2.id)).toBe(true);
      seen.add(it2.id);
      expect(REGISTERED.has(it2.type), 'unregistered flagship resource type: ' + it2.type).toBe(true);
      expect(typeof it2.title).toBe('string');
      expect(new Date(it2.timestamp).toString()).not.toBe('Invalid Date');
      expect(it2.data).toBeTruthy();
    }
  });
  it('every type in the pack is STUDENT-SAFE (matches the app TEACHER_ONLY_TYPES registry)', () => {
    const teacherOnly = anti.slice(anti.indexOf('const TEACHER_ONLY_TYPES = ['), anti.indexOf('const TEACHER_ONLY_TYPES = [') + 600);
    for (const it2 of items) expect(teacherOnly).not.toContain("'" + it2.type + "'");
  });
  it('the Agent Core artifact contract accepts the pack (catalog-submission ready)', () => {
    const Contracts = require_(resolve(process.cwd(), 'agent_core_contracts_module.js'));
    const report = Contracts.validateArtifact({
      schemaVersion: Contracts.SCHEMA_VERSION,
      artifactId: 'allopack-water-cycle-grade6',
      type: 'allopack',
      title: pack.allopack.title,
      language: pack.allopack.language,
      data: pack,
    });
    expect(report.ok, JSON.stringify(report.errors || [])).toBe(true);
  });
});

describe('per-type shapes (as the renderers read them)', () => {
  it('simplified: markdown string with real paragraphs', () => {
    const r = ofType('simplified')[0];
    expect(typeof r.data).toBe('string');
    expect(r.data.split(/\n{2,}/).length).toBeGreaterThanOrEqual(4);
  });
  it('glossary: array of {term, def, tier} — 8+ terms so the word games play well', () => {
    const g = ofType('glossary')[0];
    expect(Array.isArray(g.data)).toBe(true);
    expect(g.data.length).toBeGreaterThanOrEqual(8);
    for (const e of g.data) {
      expect(typeof e.term).toBe('string');
      expect(typeof e.def).toBe('string');
      expect(['Academic', 'Domain-Specific']).toContain(e.tier);
      if (e.translations) for (const v of Object.values(e.translations)) expect(v).toMatch(/: /); // "Term: Def" convention
    }
  });
  it('concept-sort: every categoryId resolves; colors are bg-*-500 tailwind tokens', () => {
    const cs = ofType('concept-sort')[0].data;
    const catIds = new Set(cs.categories.map((c) => c.id));
    expect(cs.categories.length).toBeGreaterThanOrEqual(2);
    for (const c of cs.categories) expect(c.color).toMatch(/^bg-[a-z]+-500$/);
    for (const i of cs.items) expect(catIds.has(i.categoryId)).toBe(true);
    expect(cs.items.length).toBeGreaterThanOrEqual(6);
  });
  it('quiz: correctAnswer is BYTE-IDENTICAL to one option; conceptLabels stable + lowercase', () => {
    const q = ofType('quiz')[0].data;
    expect(q.questions.length).toBeGreaterThanOrEqual(5);
    for (const question of q.questions) {
      expect(typeof question.conceptLabel).toBe('string');
      expect(question.conceptLabel).toBe(question.conceptLabel.toLowerCase());
      if (question.type === 'mcq') {
        expect(question.options).toHaveLength(4);
        expect(question.options).toContain(question.correctAnswer);
      } else if (question.type === 'shortAnswer') {
        expect(typeof question.expectedAnswer).toBe('string');
      }
    }
    expect(Array.isArray(q.reflections)).toBe(true);
  });
  it('sentence-frames: list mode with items[].text and a markdown rubric table', () => {
    const sf = ofType('sentence-frames')[0].data;
    expect(sf.mode).toBe('list');
    for (const i of sf.items) expect(typeof i.text).toBe('string');
    expect(sf.rubric).toMatch(/\|.*\|.*\|/);
  });
  it('faq: array of {question, answer}', () => {
    const f = ofType('faq')[0];
    expect(Array.isArray(f.data)).toBe(true);
    for (const e of f.data) { expect(typeof e.question).toBe('string'); expect(typeof e.answer).toBe('string'); }
  });
});

describe('directions: the REAL app normalizer accepts every objective intact', () => {
  const d = ofType('directions')[0];
  const norm = normalize(d.data);
  it('all authored objectives survive normalization (no silent drops)', () => {
    expect(norm.objectives).toHaveLength(d.data.objectives.length);
    expect(norm.body).toBe(d.data.body);
  });
  it('game objectives use legal gameTypes and resolvable resourceRefs; xp within bounds', () => {
    const LEGAL_GAMES = new Set(['crossword', 'wordScramble', 'memory', 'matching', 'bingo', 'timelineGame', 'conceptSortGame', 'syntaxScramble', 'vennDiagram', 'causeEffectSort']);
    for (const o of norm.objectives) {
      if (o.kind === 'game') {
        expect(LEGAL_GAMES.has(d.data.objectives.find((x) => x.id === o.id).gameType)).toBe(true);
        const ref = d.data.objectives.find((x) => x.id === o.id).resourceRef;
        if (ref) expect(byId[ref]).toBeTruthy();
      }
      if (o.kind === 'xp') {
        const amt = d.data.objectives.find((x) => x.id === o.id).amount;
        expect(amt).toBeGreaterThanOrEqual(1);
        expect(amt).toBeLessThanOrEqual(1000);
      }
    }
  });
  it('game objectives have a glossary to play against (crossword/scramble run off glossary terms)', () => {
    const hasGameGoal = norm.objectives.some((o) => o.kind === 'game');
    if (hasGameGoal) expect(ofType('glossary').length).toBeGreaterThanOrEqual(1);
  });
});

describe('authoring rules (the ones that bite)', () => {
  it('privacy: no accommodation/grouping/level language anywhere in the pack', () => {
    const s = JSON.stringify(pack).toLowerCase();
    for (const banned of ['iep', '504', 'accommodation', 'reading level group', 'low group', 'high group', 'sped']) {
      expect(s).not.toContain(banned);
    }
  });
  it('size: comfortably under the 2M-char contract cap', () => {
    expect(JSON.stringify(pack).length).toBeLessThan(500000);
  });
  it('image slots are SLOTS (shot-list), not embedded payloads', () => {
    expect(JSON.stringify(pack)).not.toMatch(/data:image\//);
    expect(pack.allopack.imageShotList).toContain('IMAGES.md');
  });
  it('meta is a DISPLAY STRING on every item (the history panel renders it verbatim)', () => {
    for (const it2 of items) {
      if (it2.meta !== undefined) expect(typeof it2.meta).toBe('string');
    }
    // machine data (image slots) lives OUTSIDE meta
    expect(items.find((i) => i.id === 'wc-reading').imageSlot).toBe('wc-img-cycle-diagram');
  });
  it('standards are named in the allopack block with human-readable glosses', () => {
    expect(pack.allopack.standards).toContain('NGSS MS-ESS2-4');
    expect(pack.allopack.standards).toMatch(/\(.+\)/); // gloss, not bare codes
  });
  it('the app history panel never renders object metas as [object Object] (source pin)', () => {
    const hp = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8');
    expect(hp).toContain("const itemMeta = typeof item.meta === 'string' ? item.meta.trim() : '';");
    expect(hp).toContain('{itemMeta && <span>');
  });
  it('whole-pack translate repoints directions goal tethers and isolates per-item failures (source pins)', () => {
    expect(anti).toContain('_translatedIdMap[item.id] = newItem.id;');
    expect(anti).toContain("objectives: newItem.data.objectives.map(o => (o && o.resourceRef && _translatedIdMap[o.resourceRef]) ? { ...o, resourceRef: _translatedIdMap[o.resourceRef] } : o),");
    expect(anti).toContain('_translateFailures.push(item.title || item.type);');
  });
});
