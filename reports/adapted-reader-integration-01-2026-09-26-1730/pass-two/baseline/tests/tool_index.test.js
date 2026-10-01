// Capability index — the contract that keeps STEM search and the lesson-plan
// agent able to see what tools DO, without either one ever touching tool
// source.
//
// Two failure modes this guards:
//   1. The index goes stale (a new tool ships and nothing knows about it) —
//      which is exactly how four tools shipped under-indexed this month.
//   2. The index grows unbounded and starts costing real context, or starts
//      carrying tool source. A single tool file exceeds 2 MB; the whole index
//      must stay a small fraction of one tool.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const idx = JSON.parse(fs.readFileSync('tool_index.json', 'utf8'));
const promptsSrc = fs.readFileSync('prompts_library_source.jsx', 'utf8');
const promptsMod = fs.readFileSync('prompts_library_module.js', 'utf8');

describe('tool_index integrity', () => {
  it('covers every registered STEM tool and is not stale', () => {
    // The generator's own --check compares the index against the tool files.
    const out = execFileSync('node', ['dev-tools/build_tool_index.cjs', '--check'], { encoding: 'utf8' });
    expect(out).toMatch(/current: \d+ tools/);
  });

  it('every record carries id, label and a distilled keyword set', () => {
    expect(idx.tools.length).toBeGreaterThan(120);
    for (const t of idx.tools) {
      expect(t.id, 'id').toBeTruthy();
      expect(t.label, t.id + ' label').toBeTruthy();
      expect(Array.isArray(t.keywords), t.id + ' keywords').toBe(true);
      expect(Array.isArray(t.topics), t.id + ' topics').toBe(true);
    }
  });

  it('stays bounded — a record is a summary, never tool source', () => {
    const sizes = idx.tools.map((t) => JSON.stringify(t).length);
    const total = JSON.stringify(idx).length;
    expect(Math.max(...sizes), 'largest record').toBeLessThan(4000);
    // The whole index must stay far under a single large tool file (~2.4 MB).
    expect(total, 'total index size').toBeLessThan(400 * 1024);
    for (const t of idx.tools) {
      expect(t.desc.length, t.id + ' desc capped').toBeLessThanOrEqual(320);
      // Source would bring braces/arrows; a description does not.
      expect(t.desc, t.id + ' desc is prose').not.toMatch(/=>|function\s*\(|\{\s*$/);
    }
  });

  it('discriminates: distinctive terms resolve to few tools, not many', () => {
    const hay = (t) => (t.label + ' ' + t.desc + ' ' + t.topics.join(' ') + ' ' + t.keywords.join(' ') + ' ' + t.section).toLowerCase();
    const N = idx.tools.length;
    // Each of these previously returned ZERO from the tile-only search.
    for (const [q, expected] of [
      ['periodic table', 'molecule'],
      ['attachment', 'parentingLab'],
      ['manifestation', 'lawNavigator'],
      ['disclosure', 'paperTrail'],
      ['international space station', 'spaceStation']
    ]) {
      const hits = idx.tools.filter((t) => hay(t).includes(q));
      expect(hits.length, q + ' finds something').toBeGreaterThan(0);
      expect(hits.length, q + ' is not noise').toBeLessThan(N * 0.25);
      expect(hits.map((t) => t.id), q + ' finds the right tool').toContain(expected);
    }
  });
});

describe('lesson-plan agent catalog is enriched AND bounded', () => {
  it('ranks and caps instead of dumping every tool', () => {
    for (const [name, src] of [['source', promptsSrc], ['module', promptsMod]]) {
      expect(src, name + ' uses the bounded selector').toContain('selectStemTools(sourceTopic');
      expect(src, name + ' declares a cap').toMatch(/TOOL_CATALOG_LIMIT\s*=\s*\d+/);
      // The old unbounded dump must be gone from both copies.
      expect(src, name + ' no unbounded dump').not.toMatch(/stemToolRegistry\.map\(function\(t\)\s*\{\s*return\s*\{\s*id:\s*t\.id,\s*name:\s*t\.name,\s*subjects/);
    }
  });

  it('sends capability text, which the old payload lacked entirely', () => {
    expect(promptsMod).toMatch(/about:/);   // the tool's own description
    expect(promptsMod).toMatch(/covers:/);  // what it teaches
  });

  it('degrades to the old registry rather than sending nothing', () => {
    expect(promptsMod).toContain('if (!idx || !idx.length)');
    expect(promptsMod).toMatch(/subjects: t\.subjects/); // legacy fallback retained
  });

  it('the fallback reads the registry LIVE, not the load-time snapshot', () => {
    // createPromptsLibrary auto-instantiates when the module loads, which is
    // before the STEM plugins load on demand — so the constructor-time
    // `stemToolRegistry` is an empty array for the life of the page. Reading
    // window.STEM_TOOL_REGISTRY at call time is what makes the fallback real.
    for (const [name, src] of [['source', promptsSrc], ['module', promptsMod]]) {
      expect(src, name + ' reads the live global').toMatch(/window\.STEM_TOOL_REGISTRY\)\s*&&\s*window\.STEM_TOOL_REGISTRY\.length/);
      expect(src, name + ' still guards with try/catch').toMatch(/live = window\.STEM_TOOL_REGISTRY/);
    }
  });

  it('the cap actually bounds the payload for a real topic', () => {
    // Simulate the selector against the live index.
    const LIMIT = Number(promptsMod.match(/TOOL_CATALOG_LIMIT\s*=\s*(\d+)/)[1]);
    const terms = 'photosynthesis and plant cells for 7th grade'.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g);
    const scored = idx.tools.map((t) => {
      const hayTop = (t.label + ' ' + t.topics.join(' ')).toLowerCase();
      const hayAll = hayTop + ' ' + (t.desc + ' ' + t.keywords.join(' ') + ' ' + t.section).toLowerCase();
      let score = 0;
      for (const w of terms) { if (hayTop.includes(w)) score += 3; else if (hayAll.includes(w)) score += 1; }
      return { t, score };
    }).sort((a, b) => b.score - a.score).slice(0, LIMIT);
    expect(scored.length).toBe(LIMIT);
    const payload = JSON.stringify(scored.map((s) => ({
      id: s.t.id, name: s.t.label, about: s.t.desc.slice(0, 200), covers: s.t.topics.slice(0, 6)
    })));
    // Enriched yet comparable to the OLD 13 KB name-only dump of all 140.
    expect(payload.length, 'bounded payload stays small').toBeLessThan(20 * 1024);
    // And it must actually be relevant: a biology topic should surface biology.
    expect(scored[0].score, 'top hit is a real match').toBeGreaterThan(0);
  });
});

describe('runtime wiring', () => {
  it('both ANTI copies load the index, non-fatally', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const s = fs.readFileSync(f, 'utf8');
      expect(s, f).toContain('window.ALLO_TOOL_INDEX = j');
      expect(s, f + ' fetch failure is swallowed').toMatch(/tool_index\.json[\s\S]{0,600}?catch/);
    }
  });

  it('the index is mirrored for the desktop build', () => {
    const a = fs.readFileSync('tool_index.json', 'utf8');
    const b = fs.readFileSync('desktop/web-app/public/tool_index.json', 'utf8');
    expect(b).toBe(a);
  });
});
