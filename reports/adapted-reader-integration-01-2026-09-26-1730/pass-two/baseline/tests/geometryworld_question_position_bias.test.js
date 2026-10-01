// geometryWorld authored lessons — answer-position bias.
//
// SAMPLE_LESSONS put the correct choice FIRST in 82 of 83 questions (82/0/1
// across three-choice questions), so a student could clear a lesson by always
// tapping the top button. Questions are now rotated by a per-question offset.
//
// Shape here is a TREE rather than a flat bank: SAMPLE_LESSONS[lesson].npcs[]
// .question plus a recursive `followUp` chain of further steps, so the rotation
// walks the whole tree and counts nodes as it goes (neighbouring steps get
// different shifts).
//
// Keying: grading is `ci === curQ.correct` (INDEX, so `correct` is remapped) and
// there is no per-option feedback array, so only choices + correct move.
//
// validateLesson() is NOT the hook point — it sanitises AI-generated lesson
// JSON, not this authored data.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_geometryworld.js';
let built;

function walk(lessons, fn) {
  Object.keys(lessons).forEach((k) => {
    const l = lessons[k];
    if (!l || !Array.isArray(l.npcs)) return;
    l.npcs.forEach((npc, ni) => {
      const rec = (q, path) => {
        if (!q || !Array.isArray(q.choices)) return;
        fn(q, k + '/npc' + ni + path);
        (q.followUp || []).forEach((fu, i) => rec(fu, path + '/f' + i));
      };
      rec(npc.question, '');
    });
  });
}
function collect(lessons) {
  const out = [];
  walk(lessons, (q, p) => out.push([p, q]));
  return out;
}
function dist(lessons) {
  const counts = {};
  walk(lessons, (q) => {
    const n = q.choices.length;
    counts[n] = counts[n] || new Array(n).fill(0);
    counts[n][q.correct]++;
  });
  return counts;
}

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8').replace(/\r\n/g, '\n');
  const ls = src.indexOf('  var SAMPLE_LESSONS = {');
  const le = src.indexOf('\n  };', ls);
  const hs = src.indexOf('  function gwRotateQuestionTree(node, counter) {');
  const he = src.indexOf('\n  })();', hs);
  if (ls < 0 || hs < 0) throw new Error('geometryWorld source markers not found');
  built = new Function(
    src.slice(ls, le + 5) + '\n' +
    'var AUTHORED = JSON.parse(JSON.stringify(SAMPLE_LESSONS));\n' +
    src.slice(hs, he + 8) + '\n' +
    'return { authored: AUTHORED, rotated: SAMPLE_LESSONS };'
  )();
});

describe('geometryWorld — authored lessons are position-biased', () => {
  it('documents the bias: the answer is the first choice almost every time', () => {
    const d = dist(built.authored)[3];
    const total = d.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(80);
    expect(d[0] / total).toBeGreaterThan(0.9);
    expect(d[1]).toBe(0);
  });
});

describe('geometryWorld — rotation spreads answers across the whole tree', () => {
  it('reaches every question including nested followUp steps', () => {
    expect(collect(built.rotated).length).toBe(collect(built.authored).length);
    expect(collect(built.rotated).length).toBeGreaterThanOrEqual(80);
    // the tree really is nested, not flat
    expect(collect(built.authored).some(([p]) => p.includes('/f'))).toBe(true);
  });

  it('leaves no dead slot and no dominant slot', () => {
    const d = dist(built.rotated)[3];
    const total = d.reduce((a, b) => a + b, 0);
    for (let p = 0; p < 3; p++) {
      expect(d[p], 'slot ' + p + ' of ' + d.join('/')).toBeGreaterThan(0);
    }
    expect(Math.max(...d) / total).toBeLessThan(0.45);
  });

  it('preserves the choice set, the correct-answer TEXT and the prompt', () => {
    const A = collect(built.authored);
    const R = collect(built.rotated);
    A.forEach(([path, a], i) => {
      const r = R[i][1];
      expect(r.choices.slice().sort(), path).toEqual(a.choices.slice().sort());
      expect(r.choices[r.correct], path + ' answer text').toBe(a.choices[a.correct]);
      expect(r.text, path + ' prompt').toBe(a.text);
    });
  });

  it('keeps correct in range for every question', () => {
    walk(built.rotated, (q, p) => {
      expect(q.correct, p).toBeGreaterThanOrEqual(0);
      expect(q.correct, p).toBeLessThan(q.choices.length);
    });
  });
});
