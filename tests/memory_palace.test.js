// Tests for memory_palace_module.js — the method-of-loci 3D walk.
//
// jsdom has no WebGL, so the GL walk is NOT exercised here (live Canvas smoke).
// What IS pinned: (1) buildPalace() is pure and deterministic — rooms per branch,
// loci in reading order, camera stops inside the room, ids matching the
// adaptGenerated convention; (2) navigateRoute clamps; (3) describeLocusForSR
// carries the mnemonic (the pedagogical payload); (4) the graceful-degradation
// contract — no WebGL ⇒ visible walking-route list + notice, never a crash.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let MP;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.MemoryPalace;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8'))();
  MP = window.AlloModules.MemoryPalace;
  if (!MP) throw new Error('MemoryPalace did not register');
});

function sampleData() {
  return {
    main: 'The Water Cycle',
    branches: [
      { title: 'Sky Room', items: ['Evaporation', 'Condensation'], mnemonics: ['A kettle the size of a house boils a lake into golden steam', 'A cloud knitting itself from silver wool'] },
      { title: 'Ground Room', items: ['Precipitation', { text: 'Collection' }], mnemonics: ['Umbrellas raining upward'] },
    ],
  };
}

describe('MemoryPalace.buildPalace (pure palace model)', () => {
  it('creates an entry hall plus one room per branch, on radial spokes off the hub', () => {
    const p = MP.buildPalace(sampleData());
    expect(p.rooms.map((r) => r.key)).toEqual(['__entry', 'b0', 'b1']);
    expect(p.rooms.map((r) => r.label)).toEqual(['The Water Cycle', 'Sky Room', 'Ground Room']);
    // hub-and-spokes: the hub is central; each branch room sits out on its own spoke
    const hub = p.rooms[0].center;
    expect(Math.hypot(hub.x, hub.z)).toBe(0);
    const dist = (c) => Math.hypot(c.x - hub.x, c.z - hub.z);
    expect(dist(p.rooms[1].center)).toBeGreaterThan(500);
    expect(dist(p.rooms[2].center)).toBeGreaterThan(500);
    // the two spoke rooms point in different directions (not stacked on one line)
    expect(p.rooms[1].angle).not.toBe(p.rooms[2].angle);
    expect(Math.hypot(p.rooms[1].center.x - p.rooms[2].center.x, p.rooms[1].center.z - p.rooms[2].center.z)).toBeGreaterThan(500);
  });

  it('route = entrance then every item in reading order, ids matching adaptGenerated', () => {
    const p = MP.buildPalace(sampleData());
    expect(p.route).toEqual(['__entry', 'b0_i0', 'b0_i1', 'b1_i0', 'b1_i1']);
  });

  it('loci carry labels, mnemonics ({text} items handled), and per-stop camera rails', () => {
    const p = MP.buildPalace(sampleData());
    const byId = {}; p.loci.forEach((l) => { byId[l.id] = l; });
    expect(byId.b0_i0.label).toBe('Evaporation');
    expect(byId.b0_i0.mnemonic).toMatch(/kettle/);
    expect(byId.b1_i1.label).toBe('Collection');          // {text} object item
    expect(byId.b1_i1.mnemonic).toBe('');                  // missing mnemonic ⇒ empty, never undefined
    // camera stands inside the room, back from the frame, looking at it
    const l = byId.b0_i0;
    expect(Math.abs(l.camPos.z)).toBeLessThan(Math.abs(l.framePos.z));
    expect(l.lookAt.x).toBe(l.framePos.x);
  });

  it('alternates walls left/right within a room (classic loci pattern)', () => {
    const p = MP.buildPalace(sampleData());
    const byId = {}; p.loci.forEach((l) => { byId[l.id] = l; });
    expect(Math.sign(byId.b0_i0.framePos.z)).toBe(-1);
    expect(Math.sign(byId.b0_i1.framePos.z)).toBe(1);
  });

  it('is deterministic and survives an empty outline', () => {
    const a = MP.buildPalace(sampleData());
    const b = MP.buildPalace(sampleData());
    expect(a).toEqual(b);
    const empty = MP.buildPalace({ main: 'X', branches: [] });
    expect(empty.route).toEqual(['__entry']);
    expect(empty.rooms.length).toBe(1);
  });
});

describe('MemoryPalace — route navigation + SR descriptions', () => {
  it('navigateRoute walks in order with clamping, no wrap', () => {
    const p = MP.buildPalace(sampleData());
    expect(MP.navigateRoute(p, null, 'first')).toBe('__entry');
    expect(MP.navigateRoute(p, null, 'last')).toBe('b1_i1');
    expect(MP.navigateRoute(p, '__entry', 'next')).toBe('b0_i0');
    expect(MP.navigateRoute(p, 'b1_i1', 'next')).toBe('b1_i1');   // clamp at end
    expect(MP.navigateRoute(p, 'b0_i0', 'prev')).toBe('__entry');
    expect(MP.navigateRoute({ route: [] }, null, 'next')).toBe(null);
  });

  it('describeLocusForSR announces locus position, room, item, and the mnemonic', () => {
    const p = MP.buildPalace(sampleData());
    const d = MP.describeLocusForSR(p, 'b0_i1', null);
    expect(d).toMatch(/Locus 2 of 4/);
    expect(d).toMatch(/Sky Room room/);
    expect(d).toMatch(/Condensation/);
    expect(d).toMatch(/Picture this: A cloud knitting itself/);
    expect(MP.describeLocusForSR(p, '__entry', null)).toMatch(/Palace entrance: The Water Cycle/);
    expect(MP.describeLocusForSR(p, 'nope', null)).toBe('');
  });
});

describe('MemoryPalace — recall game (pure logic)', () => {
  it('buildRecallBank shuffles deterministically by seed and covers every locus once', () => {
    const p = MP.buildPalace(sampleData());
    const a = MP.buildRecallBank(p, 42);
    const b = MP.buildRecallBank(p, 42);
    expect(a).toEqual(b);                                              // same seed ⇒ same order
    expect(a.map((x) => x.id).sort()).toEqual(['b0_i0', 'b0_i1', 'b1_i0', 'b1_i1']);
    const c = MP.buildRecallBank(p, 7);
    expect(c.map((x) => x.id).sort()).toEqual(a.map((x) => x.id).sort());
  });

  it('matchAnswer forgives case/accents/punctuation and small typos, rejects different answers', () => {
    expect(MP.matchAnswer('Evaporation', '  evaporation ')).toBe(true);
    expect(MP.matchAnswer('Evaporación', 'evaporacion')).toBe(true);   // accents
    expect(MP.matchAnswer('Condensation', 'condensasion')).toBe(true); // 1 typo on a long word
    expect(MP.matchAnswer('Evaporation', 'condensation')).toBe(false);
    expect(MP.matchAnswer('Sun', 'sunn')).toBe(false);                 // short words get no tolerance
    expect(MP.matchAnswer('Sun', '')).toBe(false);
  });

  it('scoreRecall: first-try full marks, eventual half, reveals nothing; perfect detection', () => {
    const s = MP.scoreRecall({
      a: { attempts: 1, correct: true, revealed: false },
      b: { attempts: 3, correct: true, revealed: false },
      c: { attempts: 4, correct: false, revealed: true },
    });
    expect(s).toMatchObject({ total: 3, firstTry: 1, eventual: 1, revealed: 1, points: 15, perfect: false });
    const win = MP.scoreRecall({ a: { attempts: 1, correct: true, revealed: false } });
    expect(win.perfect).toBe(true);
    expect(MP.scoreRecall({}).perfect).toBe(false);
  });

  it('describeLocusForRecall asks the question but NEVER leaks the answer or mnemonic', () => {
    const p = MP.buildPalace(sampleData());
    const d = MP.describeLocusForRecall(p, 'b0_i0', null);
    expect(d).toMatch(/Locus 1 of 4/);
    expect(d).toMatch(/Sky Room room/);
    expect(d).toMatch(/What belongs at this locus\?/);
    expect(d).not.toMatch(/Evaporation/);
    expect(d).not.toMatch(/kettle/);
    // entry stop is not a question
    expect(MP.describeLocusForRecall(p, '__entry', null)).toMatch(/Palace entrance/);
  });

  it('recall-mode fallback route list hides every answer too', () => {
    const div = document.createElement('div'); document.body.appendChild(div);
    const handle = MP.render(div, sampleData(), { t: (k) => k, recall: true });
    expect(handle.fellBack).toBe(true);                                // jsdom has no WebGL
    const text = div.textContent;
    expect(text).toMatch(/What belongs at this locus\?/);
    expect(text).not.toMatch(/Evaporation/);
    expect(text).not.toMatch(/kettle/);
    expect(() => handle.revealLocus('b0_i0')).not.toThrow();           // recall API is noop-safe on fallback
    expect(() => handle.setLocusStatus('b0_i0', 'correct')).not.toThrow();
    handle.destroy(); div.remove();
  });
});

describe('MemoryPalace — spaced-repetition mastery (pure scheduling)', () => {
  const NOW = '2026-07-03T12:00:00.000Z';
  const dayMs = 86400000;
  const daysFromNow = (iso) => Math.round((Date.parse(iso) - Date.parse(NOW)) / dayMs);

  it('updateMastery advances the interval on strong recall, drops back on a slip', () => {
    // first correct → reps 1 → ladder[reps-1]=ladder[0] = 1 day (SM-2 first interval)
    let m = MP.updateMastery({}, { a: { attempts: 1, correct: true } }, NOW);
    expect(m.a.strength).toBe(1);
    expect(m.a.reps).toBe(1);
    expect(daysFromNow(m.a.dueAt)).toBe(1);
    expect(m.a.lastResult).toBe('first-try');
    // another strong recall → reps 2 → ladder[1] = 3 days
    m = MP.updateMastery(m, { a: { attempts: 1, correct: true } }, NOW);
    expect(m.a.reps).toBe(2);
    expect(daysFromNow(m.a.dueAt)).toBe(3);
    // a miss → reps drops to 1, and due tomorrow (strength 0 ⇒ 1 day)
    m = MP.updateMastery(m, { a: { attempts: 3, correct: false } }, NOW);
    expect(m.a.reps).toBe(1);
    expect(m.a.strength).toBe(0);
    expect(daysFromNow(m.a.dueAt)).toBe(1);
    expect(m.a.lastResult).toBe('missed');
  });

  it('a give-up REVEAL reschedules for tomorrow, not weeks out (regression)', () => {
    // a well-learned item (reps 5) that the student reveals must come back SOON —
    // the old code only special-cased s===0 and pushed revealed items to ladder[4]=35d.
    const m = MP.updateMastery({ x: { reps: 5, strength: 1 } }, { x: { attempts: 1, revealed: true } }, NOW);
    expect(m.x.strength).toBe(0.2);
    expect(m.x.lastResult).toBe('revealed');
    expect(daysFromNow(m.x.dueAt)).toBe(1);
  });

  it('eventual (multi-attempt) and revealed recalls score partial strength', () => {
    const m = MP.updateMastery({}, {
      b: { attempts: 3, correct: true },   // eventual → 0.6
      c: { attempts: 4, revealed: true },  // revealed → 0.2
    }, NOW);
    expect(m.b.strength).toBe(0.6);
    expect(m.b.lastResult).toBe('eventual');
    expect(m.c.strength).toBe(0.2);
    expect(m.c.lastResult).toBe('revealed');
    expect(m.c.reps).toBe(0);   // revealed does not advance reps
  });

  it('dueLoci splits never-reviewed (new) from scheduled-and-due, ignores future', () => {
    const palace = MP.buildPalace(sampleData());   // loci: b0_i0, b0_i1, b1_i0, b1_i1
    const mastery = {
      b0_i0: { strength: 1, dueAt: '2026-07-01T00:00:00.000Z' },   // past → due
      b0_i1: { strength: 0.6, dueAt: '2026-07-20T00:00:00.000Z' }, // future → not due
      // b1_i0, b1_i1 never reviewed → new
    };
    const info = MP.dueLoci(palace, mastery, NOW);
    expect(info.due).toEqual(['b0_i0']);
    expect(info.newIds.sort()).toEqual(['b1_i0', 'b1_i1']);
    expect(info.dueCount).toBe(1);
    expect(info.newCount).toBe(2);
    expect(info.reviewedCount).toBe(2);
    expect(info.total).toBe(4);
  });

  it('masteryStrength returns the value or null for unseen loci', () => {
    expect(MP.masteryStrength({ x: { strength: 0.6 } }, 'x')).toBe(0.6);
    expect(MP.masteryStrength({ x: { strength: 0.6 } }, 'y')).toBe(null);
    expect(MP.masteryStrength(null, 'x')).toBe(null);
  });
});

describe('MemoryPalace — directed-generation prompt gate (pure)', () => {
  it('buildPromptEvalPrompt names the fact, the student prompt, the verdicts, and JSON-only', () => {
    const p = MP.buildPromptEvalPrompt({ userPrompt: 'a blue whale', itemLabel: 'Evaporation', mnemonic: 'a giant kettle', topic: 'Water Cycle', mode: 'image' });
    expect(p).toMatch(/Evaporation/);
    expect(p).toMatch(/a blue whale/);
    expect(p).toMatch(/a giant kettle/);
    expect(p).toMatch(/Water Cycle/);
    expect(p).toMatch(/"reject"/);
    expect(p).toMatch(/"enhance"/);
    expect(p).toMatch(/Return ONLY JSON/);
    expect(MP.buildPromptEvalPrompt({ mode: 'sculpture' })).toMatch(/3D sculpture/);
  });
  it('parsePromptEval accepts the three verdicts, strips fences, clamps, rejects junk', () => {
    expect(MP.parsePromptEval('```json\n{"verdict":"ok","enhancedPrompt":"x"}\n```')).toEqual({ verdict: 'ok', reason: '', enhancedPrompt: 'x' });
    const enh = MP.parsePromptEval('{"verdict":"ENHANCE","reason":"too vague","enhancedPrompt":"a vivid giant kettle boiling a lake"}');
    expect(enh.verdict).toBe('enhance');
    expect(enh.enhancedPrompt).toMatch(/kettle/);
    expect(MP.parsePromptEval('{"verdict":"reject","reason":"off topic"}')).toMatchObject({ verdict: 'reject', reason: 'off topic', enhancedPrompt: '' });
    expect(MP.parsePromptEval('{"verdict":"maybe"}')).toBe(null);   // invalid verdict
    expect(MP.parsePromptEval('not json')).toBe(null);
  });
  it('buildRefinePrompt embeds the current recipe JSON, the instruction, and the shape rules', () => {
    const recipe = { name: 'Kettle', parts: [{ shape: 'sphere', size: [0.5], position: [0, 0.5, 0], color: '#ff0000' }] };
    const p = MP.buildRefinePrompt(recipe, 'make it taller and add a handle');
    expect(p).toMatch(/Kettle/);
    expect(p).toMatch(/make it taller and add a handle/);
    expect(p).toMatch(/box, sphere, cylinder, cone, torus/);
    expect(p).toMatch(/Return ONLY the updated JSON/);
  });
});

describe('MemoryPalace — graceful degradation (no WebGL in jsdom)', () => {
  it('isWebGLAvailable() is false under jsdom', () => {
    expect(MP.isWebGLAvailable()).toBe(false);
  });

  it('render() falls back to a VISIBLE walking-route list + notice, never crashes', () => {
    const div = document.createElement('div'); document.body.appendChild(div);
    const handle = MP.render(div, sampleData(), { t: (k) => k });
    expect(handle.fellBack).toBe(true);
    expect(div.querySelector('[role="status"]')).toBeTruthy();
    const items = Array.prototype.slice.call(div.querySelectorAll('ol li')).map((li) => li.textContent);
    expect(items.length).toBe(5);                                  // entrance + 4 loci
    expect(items[1]).toMatch(/Evaporation/);
    expect(items[1]).toMatch(/kettle/);                            // mnemonic reaches the fallback too
    expect(() => handle.destroy()).not.toThrow();
    div.remove();
  });
});

describe('MemoryPalace — depth-relief prompt (pure, P4a statues)', () => {
  it('buildDepthPrompt asks for a grayscale depth map of the subject (white=near, black=far)', () => {
    const p = MP.buildDepthPrompt('a kettle boiling a lake into steam');
    expect(p).toContain('grayscale depth map');
    expect(p).toContain('a kettle boiling a lake into steam');
    expect(p).toContain('pure white');
    expect(p).toContain('pure black');
    expect(p).toContain('no text');
  });

  it('is pure and null-safe', () => {
    expect(MP.buildDepthPrompt('x')).toBe(MP.buildDepthPrompt('x'));
    expect(typeof MP.buildDepthPrompt()).toBe('string');
    expect(typeof MP.buildDepthPrompt(null)).toBe('string');
  });

  it('the GL handle contract includes setLocusRelief (fallback path too)', () => {
    // jsdom has no WebGL → render() returns the fallback handle; the relief setter
    // must exist there as a safe no-op so callers never need to branch.
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {});
    expect(typeof h.setLocusRelief).toBe('function');
    expect(() => h.setLocusRelief('b0_i0', 'data:image/png;base64,x', 'data:image/png;base64,y')).not.toThrow();
    h.destroy();
  });
});

describe('MemoryPalace — in-VR recall bank contract', () => {
  it('render() tolerates vrRecall opts on the fallback path (no WebGL) without throwing', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {
      recall: { seed: 7 },
      vrRecall: { getBank: () => [{ id: 'b0_i0', label: 'Evaporation' }], onPick: () => {} },
    });
    expect(typeof h.destroy).toBe('function');
    h.destroy();
  });
});

describe('MemoryPalace.decorSpot / landmarkSpot (radial placement math)', () => {
  it('rotates the beside-the-frame offset with faceYaw so sculptures stay inside rotated rooms', () => {
    // many branches → spokes at genuinely rotated angles
    const p = MP.buildPalace({
      main: 'Big Palace',
      branches: Array.from({ length: 6 }, (_, i) => ({ title: 'R' + i, items: ['a', 'b'] })),
    });
    p.loci.filter((l) => l.id !== '__entry').forEach((l) => {
      const s = MP.decorSpot(l);
      // always ~100√2 from the frame (along-wall + into-room legs)…
      const d = Math.hypot(s.x - l.framePos.x, s.z - l.framePos.z);
      expect(d).toBeCloseTo(Math.hypot(100, 100), 5);
      // …and stepped INTO the room, i.e. toward the camera stop's side of the wall:
      // the spot must be strictly closer to the camera stop than the naive legacy
      // offset would be for rotated rooms is not guaranteed — instead pin that the
      // spot lies on the same side of the wall as the camera (dot with face normal > 0).
      const nx = Math.sin(l.faceYaw), nz = Math.cos(l.faceYaw);   // frame's world +z (into the room)
      const inward = (s.x - l.framePos.x) * nx + (s.z - l.framePos.z) * nz;
      expect(inward).toBeCloseTo(100, 5);
    });
  });
  it('falls back to the legacy axis-aligned offset for pre-faceYaw persisted palaces', () => {
    const legacy = { framePos: { x: 50, y: 170, z: -20 }, faceDir: -1 };
    const s = MP.decorSpot(legacy);
    expect(s).toEqual({ x: 150, z: -120 });
    expect(MP.decorSpot(null)).toBe(null);
  });
  it('landmarkSpot stands against the far wall of each rotated room, facing the doorway', () => {
    const p = MP.buildPalace({
      main: 'Big Palace',
      branches: Array.from({ length: 5 }, (_, i) => ({ title: 'R' + i, items: ['a'] })),
    });
    p.rooms.filter((r) => r.key !== '__entry').forEach((room) => {
      const s = MP.landmarkSpot(room);
      // the far wall is the room-local +x end: the landmark sits further out along
      // the spoke than the room centre, by (ROOM_W/2 - inset)
      const rCenter = Math.hypot(room.center.x, room.center.z);
      const rSpot = Math.hypot(s.x, s.z);
      expect(rSpot).toBeGreaterThan(rCenter);
      expect(typeof s.rotY).toBe('number');
    });
    // legacy room (no angle): the old linear-corridor spot
    const s0 = MP.landmarkSpot({ center: { x: 300, z: 0 } });
    expect(s0.x).toBe(300);
    expect(s0.rotY).toBe(0);
  });
});

describe('MemoryPalace — decorate handle contract', () => {
  it('the handle includes clearLocus as a safe no-op on the fallback path', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {});
    expect(typeof h.clearLocus).toBe('function');
    expect(() => h.clearLocus('b0_i0')).not.toThrow();
    h.destroy();
  });
});

describe('MemoryPalace — CC0 collectible references', () => {
  it('the fallback handle tolerates { glbItem } object refs without throwing', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), { objects: { b0_i0: { glbItem: 'sprout' } } });
    expect(() => h.setLocusObject('b0_i0', { glbItem: 'sprout', scale: 1.5 })).not.toThrow();
    expect(() => h.replaceLocusObject('b0_i0', { glbItem: 'lantern' })).not.toThrow();
    h.destroy();
  });
});
