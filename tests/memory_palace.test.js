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

  it('normalizes persisted route order, removes stale duplicates, and appends new loci', () => {
    const data = sampleData();
    data.memoryPalace = { routeOrder: ['b1_i1', 'missing', 'b0_i0', 'b1_i1'] };
    const p = MP.buildPalace(data);
    expect(p.route).toEqual(['__entry', 'b1_i1', 'b0_i0', 'b0_i1', 'b1_i0']);
    expect(MP.normalizeRouteOrder(['__entry', 'a', 'b', 'c'], ['c', 'c', 'nope', 'a']))
      .toEqual(['__entry', 'c', 'a', 'b']);
  });

  it('lets an unsaved preview override the persisted route without mutating source data', () => {
    const data = sampleData();
    data.memoryPalace = { routeOrder: ['b1_i1', 'b1_i0', 'b0_i1', 'b0_i0'] };
    const preview = ['b0_i1', 'b1_i0'];
    const p = MP.buildPalace(data, { routeOrder: preview });
    expect(p.route).toEqual(['__entry', 'b0_i1', 'b1_i0', 'b0_i0', 'b1_i1']);
    expect(data.memoryPalace.routeOrder[0]).toBe('b1_i1');
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

  it('adapts live camera framing to captions, images, reliefs, and sculptures', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    expect(source).toContain('function _applyAdaptiveFraming(l, ref)');
    expect(source).toContain('new THREE.Box3()');
    expect(source).toContain('ref.mat.displacementMap');
    expect(source).toContain('if (palace.route[curIdx] === id) stopTargets(curIdx);');
    expect(source).toContain('var _roomLights = {}, _roomLabels = {}, _roomPortals = {}, _roomOutlines = {}, _roomHeatmaps = {};');
    expect(source).toContain('new THREE.LineBasicMaterial');
    expect(source).toContain('function _setRoomOutlineMode()');
    expect(source).toContain('outline.opacity = active ? (overview ? 0.68 : 0.32)');
    expect(source).toContain('function roomMasterySummary(palace, mastery)');
    expect(source).toContain('var _roomLights = {}, _roomLabels = {}, _roomPortals = {}, _roomOutlines = {}, _roomHeatmaps = {}');
    expect(source).toContain('function _setRoomHeatmapState()');
    expect(source).toContain('memory_palace.mastery_room_average');
    expect(source).toContain('function _roomMasteryColor(value)');
    expect(source).toContain('var routeGuide = new THREE.Group()');
    expect(source).toContain('function _setRouteGuideState()');
    expect(source).toContain('routeGuide.visible = !!overview');
    expect(source).toContain('marker.rotation.x = Math.PI / 2');
    expect(source).toContain('function _setMasteryLegendState()');
    expect(source).toContain('memory_palace.mastery_needs_practice');
    expect(source).toContain('masteryLegend.hidden = !show');
    expect(source).toContain('memory_palace.mastery_current');
    expect(source).toContain('function _setRoomBadgeState()');
    expect(source).toContain('memory_palace.room_current');
    expect(source).toContain('roomBadgeDot.style.backgroundColor');
    expect(source).toContain('hud.appendChild(roomBadge)');
    expect(source).toContain('var progressWrap = document.createElement');
    expect(source).toContain('progressFill.style.width =');
    expect(source).toContain('focusCard = null, focusCardKicker');
    expect(source).toContain('function _setFocusCardState()');
    expect(source).toContain('var show = !recall && !overview && !freeMode && !state.xrActive && !!l');
    expect(source).toContain("memory_palace.focus_picture");
    expect(source).toContain('holder.appendChild(focusCard);');
    expect(source).toContain('focusCard = null;');
    expect(source).toContain('var completionGlow = null');
    expect(source).toContain('function _setCompletionCardState()');
    expect(source).toContain('var complete = !recall && !overview && !freeMode && !state.xrActive && total > 0');
    expect(source).toContain('memory_palace.complete_walk_again');
    expect(source).toContain('completionOverviewBtn.onclick');
    expect(source).toContain('completionCard = null;');
    expect(source).toContain('var journeyMap = null');
    expect(source).toContain('function _setJourneyMapState()');
    expect(source).toContain("journeyMap.setAttribute('aria-label', _tr(t, 'memory_palace.journey_map'");
    expect(source).toContain('var journeyGroups = {}');
    expect(source).toContain("button.setAttribute('data-journey-index', String(stop.index))");
    expect(source).toContain('journeyMapStops.push({ index: stop.index');
    expect(source).toContain("var show = !!overview && !routeVisible && !recall && journeyMapStops.length > 0");
    expect(source).toContain("journeyMap.hidden = !show");
    expect(source).toContain('journeyMap = null;');
    expect(source).toContain('var frameMeshes = [], frameRefs = {}, _emptyBeacons = []');
    expect(source).toContain('var isEmptyLocus = !img && !((opts && opts.objects) || {})[l.id]');
    expect(source).toContain('new THREE.RingGeometry(13, 17, 28)');
    expect(source).toContain('var nearby = _nearEmptyId === beacon.id');
    expect(source).toContain('beaconVisible = !!beaconRef && beaconRef.empty && !recall');
    expect(source).toContain('_emptyBeacons.length = 0');
    expect(source).toContain('function _ensureEmptyBeacon(ref)');
    expect(source).toContain('_ensureEmptyBeacon(ref);');
    expect(source).toContain('var nextStopBeacon = null');
    expect(source).toContain('new THREE.CylinderGeometry(5, 8, 76, 12)');
    expect(source).toContain('function _setNextStopBeaconState()');
    expect(source).toContain('var show = !!freeMode && !overview && !recall');
    expect(source).toContain('var nextWave = reduce ? 0.5');
    expect(source).toContain('nextStopBeacon = null;');
    expect(source).toContain('var guidedTether = null');
    expect(source).toContain('function _setGuidedTetherState()');
    expect(source).toContain('!recall && !overview && !freeMode && !state.xrActive && targetIdx < palace.route.length');
    expect(source).toContain('guidedTether.line.geometry.dispose');
    expect(source).toContain('guidedTether = null;');
    expect(source).toContain('var arrivalHalo = null');
    expect(source).toContain('function _setArrivalHaloState()');
    expect(source).toContain('arrivalHalo.outer.material.opacity');
    expect(source).toContain('arrivalHalo = null;');
    expect(source).toContain('freeNavCompass = null');
    expect(source).toContain("freeNavCompass.title = _tr(t, 'memory_palace.free_compass'");
    expect(source).toContain('freeNavCompassArrow.style.cssText');
    expect(source).toContain("freeNavCompassArrow.style.transform = 'rotate('");
    expect(source).toContain('freeNavCompass.hidden = !headingGlyph');
    expect(source).toContain('function _hideCtrlHint()');
    expect(source).toContain('ctrlHintTimer = window.setTimeout(_hideCtrlHint');
    expect(source).toContain('flex-wrap:wrap');
    expect(source).toContain('font-size:0.8125rem');
    expect(source).toContain('function _syncDockLayout()');
    expect(source).toContain('new window.ResizeObserver(_syncDockLayout)');
    expect(source).toContain('freeNavCue.style.bottom = overlayBottom');
    expect(source).toContain('function _setActiveRoom(roomIdx)');
    expect(source).toContain('portal.emissiveIntensity = Number(key) === _activeRoomIdx');
    expect(source).toContain('roomIdx: ri');
    expect(source).toContain('function _syncFreeRoomContext()');
    expect(source).toContain('var focusRef = freeMode ? _freeStopRef : _hlRef;');
    expect(source).toContain('_syncFreeRoomContext();');
    expect(source).toContain('function _updateFreeCue(roomIdx, ref)');
    expect(source).toContain("freeNavCue.setAttribute('aria-live', 'polite')");
    expect(source).toContain('freeNavText.textContent = roomLabel +');
    expect(source).toContain('var freeNavCue = null, freeNavText = null, freeReturnBtn = null');
    expect(source).toContain('headingGlyph =');
    expect(source).toContain('freeReturnBtn.onclick = function () { goTo(curIdx); }');
    expect(source).toContain("freeReturnBtn.setAttribute('aria-label', _tr(t, 'memory_palace.free_return'");
    expect(source).toContain('stopRing: stopRing');
    expect(source).toContain('light.intensity = Number(key) === _activeRoomIdx');
    expect(source).toContain('var roomLinks = [], roomLinkSeen = {}');
    expect(source).toContain('roomLinks: roomLinks');
    expect(source).toContain('var crossLinkGroup = new THREE.Group()');
    expect(source).toContain('function _setCrossLinkState()');
    expect(source).toContain('var show = !!overview && !recall && crossLinks.length > 0');
    expect(source).toContain('link.label.visible = show && active');
    expect(source).toContain('var focusedCrossLink = -1');
    expect(source).toContain('function _focusCrossLink(index)');
    expect(source).toContain('memory_palace.connections_hint');
    expect(source).toContain('focusButton.onclick = function () { _focusCrossLink(linkIdx); }');
    expect(source).toContain('function _jumpToRoom(roomIdx)');
    expect(source).toContain('jumpButton.onclick = function (event)');
    expect(source).toContain('_setCrossLinkState();');
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

  it('summarizes mastery by room with average strength and coverage', () => {
    const p = MP.buildPalace(sampleData());
    const summary = MP.roomMasterySummary(p, {
      b0_i0: { strength: 1 },
      b0_i1: { strength: 0.5 },
      b1_i0: { strength: 0 }
    });
    expect(summary[0]).toEqual({ count: 0, rated: 0, average: null, coverage: 0 });
    expect(summary[1]).toEqual({ count: 2, rated: 2, average: 0.75, coverage: 1 });
    expect(summary[2]).toEqual({ count: 2, rated: 1, average: 0, coverage: 0.5 });
  });

  it('normalizes explicit non-linear branch connections into room links', () => {
    const p = MP.buildPalace({ main: 'X', branches: [
      { title: 'A', items: ['a'], connections: [{ target: 2, label: 'supports' }] },
      { title: 'B', items: ['b'], connections: [{ target: 2, label: '' }] },
      { title: 'C', items: ['c'], connections: [] }
    ] });
    expect(p.roomLinks).toEqual([{ fromRoomIdx: 1, toRoomIdx: 3, label: 'supports' }]);
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
    // another strong recall ON A LATER DAY → reps 2 → ladder[1] = 3 days
    const NEXT = '2026-07-04T12:00:00.000Z';
    m = MP.updateMastery(m, { a: { attempts: 1, correct: true } }, NEXT);
    expect(m.a.reps).toBe(2);
    expect(Math.round((Date.parse(m.a.dueAt) - Date.parse(NEXT)) / dayMs)).toBe(3);
    // a miss → reps drops to 1, and due tomorrow (strength 0 ⇒ 1 day)
    m = MP.updateMastery(m, { a: { attempts: 3, correct: false } }, NEXT);
    expect(m.a.reps).toBe(1);
    expect(m.a.strength).toBe(0);
    expect(Math.round((Date.parse(m.a.dueAt) - Date.parse(NEXT)) / dayMs)).toBe(1);
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

  it('eventual (second-attempt) and revealed recalls score partial strength', () => {
    const m = MP.updateMastery({}, {
      b: { attempts: 2, correct: true },   // eventual → 0.6
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


describe('MemoryPalace - decoration SR labels (accessibility parity)', () => {
  it('describeLocusForSR appends the decoration name when supplied', () => {
    const p = MP.buildPalace(sampleData());
    const id = p.route.find((x) => x !== '__entry');
    const withDecor = MP.describeLocusForSR(p, id, null, { [id]: 'Torch' });
    expect(withDecor).toContain('Torch');
    const without = MP.describeLocusForSR(p, id, null, {});
    expect(without).not.toContain('Torch');
  });
  it('describeLocusForRecall includes the decoration as a CUE but never the answer', () => {
    const p = MP.buildPalace(sampleData());
    const id = p.route.find((x) => x !== '__entry');
    const l = p.loci.find((x) => x.id === id);
    const desc = MP.describeLocusForRecall(p, id, null, { [id]: 'Torch' });
    expect(desc).toContain('Torch');
    expect(desc).not.toContain(l.label);
    if (l.mnemonic) expect(desc).not.toContain(l.mnemonic);
  });
  it('setDecor is on the handle (fallback path) as a safe no-op', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {});
    expect(typeof h.setDecor).toBe('function');
    expect(() => h.setDecor({ b0_i0: 'Star' })).not.toThrow();
    expect(typeof h.setLocusBusy).toBe('function');
    expect(() => h.setLocusBusy('b0_i0', true)).not.toThrow();
    h.destroy();
  });
});

describe('MemoryPalace - live 3D organizer HUD contract', () => {
  it('keeps route controls accessible and provides a persistent visual route companion', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    expect(source).toContain("hud.setAttribute('role', 'toolbar')");
    expect(source).toContain("var routeBtn = mkBtn('Route'");
    expect(source).toContain("routePanel.hidden = !routeVisible");
    expect(source).toContain("routeBtn.setAttribute('aria-pressed'");
    expect(source).toContain("button.setAttribute('data-route-index', String(index))");
    expect(source).toContain("button.setAttribute('aria-current', 'step')");
    expect(source).toContain('goTo(index)');
    expect(source).toContain('function setRouteVisible(visible, moveFocus)');
    expect(source).toContain("routeBtn.setAttribute('aria-expanded'");
    expect(source).toContain("routePanel.addEventListener('keydown', onRouteKeyDown)");
    expect(source).toContain("if (e.key !== 'Escape') return");
    expect(source).toContain("routePanel.querySelector('[aria-current=\"step\"]')");
    expect(source).toContain("button.style.backgroundColor = button.hasAttribute('aria-current')");
    expect(source).toContain("routePanel.removeEventListener('keydown', onRouteKeyDown)");
    expect(source).toContain("progress.textContent = curIdx === 0 ? 'Entrance'");
    expect(source).toContain("ovBtn.setAttribute('aria-pressed'");
    expect(source).toContain('min-width:44px;min-height:44px');
    expect(source).not.toContain("routePanel.setAttribute('aria-hidden', 'true')");
    expect(source).not.toContain("[hud].forEach(function (nd) { try { nd.setAttribute('aria-hidden', 'true')");
  });
  it('surfaces customization choices only near empty loci and uses hysteresis', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(source).toContain('function _notifyEmptyApproach()');
    expect(source).toContain("typeof opts.onEmptyLocusApproach !== 'function'");
    expect(source).toContain('_emptyDistanceSq(keep) <= 290 * 290');
    expect(source).toContain("var leaveReason = leaving && !leaving.empty ? 'filled' : 'departed'");
    expect(source).toContain('var best = null, bestD = 210 * 210');
    expect(source).toContain('if (!ref.empty) return');
    expect(source).toContain('ref.empty = false');
    expect(source).toContain('ref.empty = true');
    expect(view).toContain('onEmptyLocusApproach: (locus, near, idx, total, reason)');
    expect(view).toContain('role="region"');
    expect(view).toContain("Empty gallery spot: {label}");
    expect(view).toContain('Use built-in cues');
    expect(view).toContain('Quick image here');
    expect(view).toContain('Quick sculpture here');
    expect(view).toContain('const handleQuickCreate = (type, locus, originalPrevious)');
    expect(view).toContain('const handleQuickUndo = () =>');
    expect(view).toContain("status: 'ready'");
    expect(view).toContain('Regenerate');
    expect(view).toContain('Undo');
    expect(source).toContain('state.setLocusBusy = function (id, busy)');
    expect(source).toContain("g.fillText(busy ?");
  });

  it('keeps in-world frame captions legible and responsive to app typography', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    expect(source).toContain("document.querySelector('.allo-docsuite')");
    expect(source).toContain('base / 16');
    expect(source).toContain("appRoot.classList.contains('theme-contrast')");
    expect(source).toContain("ctx.font = '800 ' + font");
    expect(source).toContain("type.contrast ? '#fff200' : '#ffffff'");
    expect(source).toContain('window.devicePixelRatio');
    expect(source).toContain('function _refreshFrameLabels()');
    expect(source).toContain('new window.MutationObserver(_queueCaptionRefresh)');
    expect(source).toContain('document.fonts.ready.then');
    expect(source).toContain('ref.label.material.opacity = 1');
    expect(source).not.toContain('lab.material.opacity = _op');
    expect(source).toContain('_replaceFrameLabel(ref, ref.captionText)');
    expect(source).toContain('function _scaleFrameLabels()');
    expect(source).toContain('var factor = overview ? 0.82');
    expect(source).toContain('_scaleFrameLabels();');
    expect(source).toContain('if (reduce) label.scale.set(tx, ty, 1)');
    expect(source).toContain('depthTest: !occlusionSafe');
    expect(source).toContain('sp.renderOrder = occlusionSafe ? 24 : 12');
    expect(source).toContain("makeLabelSprite(THREE, recall ? '?' : l.label, color, 24, true)");
    expect(source).toContain('makeLabelSprite(THREE, text, ref.baseColor, 24, true)');
  });
  it('provides a clickable status map and a responsive frame callout', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(view).toContain("const progressStops = progressPalace");
    expect(view).toContain('role="progressbar"');
    expect(view).toContain('role="listitem"');
    expect(view).toContain("handleRef.current?.goTo(i + 1)");
    expect(view).toContain("Visual palace progress map");
    expect(view).toContain("onEmptyLocusAnchor: (id, point)");
    expect(view).toContain("ref={calloutLineRef}");
    expect(view).toContain("max-h-[58%] sm:max-h-none");
    expect(source).toContain("function _emitEmptyAnchor()");
    expect(source).toContain("_anchorProject.project(camera)");
    expect(source).toContain("function _scaleFrameLabels()");
    expect(source).toContain("c.label.visible = visible");
    expect(source).toContain("Math.abs(c.x - placed[i].x) < 0.2");
  });

  it('keeps a bounded three-version tray and replaces regenerated sculptures live', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(view).toContain("const nextVariants = [...session.variants");
    expect(view).toContain("].slice(-3)");
    expect(view).toContain("const handleQuickVariant = (index)");
    expect(view).toContain("Recent versions");
    expect(view).toContain("aria-pressed={quickCreate.selected === index");
    expect(view).toContain("live?.replaceLocusObject");
    expect(view).toContain("onClick={() => handleQuickVariant(index)}");
  });
  it('adds a guided self-check journey without replacing the existing quiz modes', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(view).toContain("mode:'bank'|'type'|'self'");
    expect(view).toContain("startRecall('self', false)");
    expect(view).toContain("const revealSelfCheck = () =>");
    expect(view).toContain("const markSelfCheck = (remembered) =>");
    expect(view).toContain('I remembered');
    expect(view).toContain('I missed it');
    expect(view).toContain('Reveal, then rate my recall');
    expect(view).toContain('_laterRecall(() => advanceRecall())');
  });

  it('shows study-only in-world mastery rings with weak, developing, and strong colors', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    expect(source).toContain('var masteryRing = null');
    expect(source).toContain('new THREE.RingGeometry(12, 17, 32');
    expect(source).toContain('_mastery >= 0.8 ? 0x22c55e');
    expect(source).toContain('Math.PI * 2 * _mastery');
    expect(source).toContain('masteryRing: masteryRing');
    expect(source).toContain('if (!recall && opts.mastery)');
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(view).toContain('Memory rings:');
    expect(view).toContain("memory strength ' + strengthLabel");
    expect(view).toContain('hasMasteryRings');
  });
  it('provides a distraction-free palace presentation with native fullscreen fallback', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(view).toContain('const [presenting, setPresenting] = React.useState(false)');
    expect(view).toContain('const handlePresentation = async () =>');
    expect(view).toContain('node.requestFullscreen || node.webkitRequestFullscreen');
    expect(view).toContain('document.exitFullscreen || document.webkitExitFullscreen');
    expect(view).toContain('webkitfullscreenchange');
    expect(view).toContain("document.body.style.overflow = 'hidden'");
    expect(view).toContain('h-[100dvh]');
    expect(view).toContain("event.key === 'Escape'");
    expect(view).toContain('Present palace');
    expect(view).toContain('Exit presentation');
    expect(view).toContain('fixed inset-0 z-[9999]');
    expect(view).toContain("height: presenting ? '100%'");
    expect(view).toContain('!presenting && !recall && proximityLocus');
    expect(view).toContain('!presenting && directMode && !recall');
    expect(view).toContain('!presenting && recall && !finished');
  });
  it('supports accessible drag, move, preview, save, reset, and undo route arrangement', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(source).toContain('function normalizeRouteOrder(defaultRoute, preferredOrder)');
    expect(source).toContain('var routeNo = Math.max(1, palace.route.indexOf(l.id))');
    expect(source).toContain('makeNumBadge(THREE, routeNo, color)');
    expect(view).toContain('Arrange walking route');
    expect(view).toContain('draggable');
    expect(view).toContain('const moveRouteItem = (fromIndex, toIndex)');
    expect(view).toContain('Move {label} earlier');
    expect(view).toContain('Move {label} later');
    expect(view).toContain('Preview route in 3D');
    expect(view).toContain('Save walking route');
    expect(view).toContain('Undo route change');
    expect(view).toContain('Original order');
    expect(view).toContain('This palace has recall history.');
    expect(view).toContain('routeOrder = routeDraft.slice()');
    expect(view).toContain('routeOrder: activeRouteOrder');
  });
  it('offers a paced, narrated cinematic tour that pauses on interaction', () => {
    const source = readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');
    const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
    expect(source).toContain('railEaseMultiplier');
    expect(source).toContain('state.setTourPace = function (multiplier)');
    expect(source).toContain('setTourPace: setTourPace');
    expect(view).toContain('const _mpTourPaces = Object.freeze');
    expect(view).toContain('Cinematic tour');
    expect(view).toContain('const startCinematicTour = () =>');
    expect(view).toContain('const pauseCinematicTour =');
    expect(view).toContain('data-palace-tour-control="true"');
    expect(view).toContain('onPointerDownCapture={handleTourInteraction}');
    expect(view).toContain('onKeyDownCapture={handleTourInteraction}');
    expect(view).toContain('window.AlloSpeechPlayer');
    expect(view).toContain('window.__alloPlaybackRate');
    expect(view).toContain('const tourRoomGroups = progressStops.reduce');
    expect(view).toContain('Room {current} of {total}');
    expect(view).toContain('memory stops in this room');
    expect(view).toContain('Route complete');
    expect(view).toContain('Try a guided recall walk');
    expect(view).toContain('Reduced-motion settings use instant camera cuts.');
  });
});

// ── Self-authored images (generation effect) ──────────────────────────────
// The method of loci works because the learner BUILDS the picture. These pin
// that a student's own image outranks the generated one everywhere the
// mnemonic is read, that the generated line is kept rather than destroyed,
// and that the quality checks stay language-neutral (an English word-list
// heuristic would silently mis-judge every non-Latin pack).
describe('MemoryPalace — self-authored mnemonics', () => {
  it('lets a saved own-image outrank the generated one and keeps the AI line', () => {
    const data = sampleData();
    data.memoryPalace = { myMnemonics: { b0_i0: 'My uncle boiling the whole ocean in a teacup' } };
    const p = MP.buildPalace(data);
    const own = p.loci.find((l) => l.id === 'b0_i0');
    expect(own.mnemonic).toBe('My uncle boiling the whole ocean in a teacup');
    expect(own.mnemonicSource).toBe('self');
    expect(own.aiMnemonic).toContain('kettle');            // generated line preserved, not overwritten
    const untouched = p.loci.find((l) => l.id === 'b0_i1');
    expect(untouched.mnemonicSource).toBe('ai');
    expect(untouched.mnemonic).toBe(untouched.aiMnemonic);
  });

  it('carries the student own image into the screen-reader announcement', () => {
    const data = sampleData();
    data.memoryPalace = { myMnemonics: { b0_i0: 'A kettle wearing my sneakers' } };
    const p = MP.buildPalace(data);
    const said = MP.describeLocusForSR(p, 'b0_i0', null, {});
    expect(said).toContain('A kettle wearing my sneakers');
    expect(said).not.toContain('golden steam');            // the replaced AI line is not also read out
  });

  it('ignores blank overrides and never rewrites the entrance', () => {
    const data = sampleData();
    data.memoryPalace = { myMnemonics: { b0_i0: '   ', __entry: 'not allowed' } };
    const p = MP.buildPalace(data);
    expect(p.loci.find((l) => l.id === 'b0_i0').mnemonicSource).toBe('ai');
    expect(p.loci.find((l) => l.id === '__entry').mnemonic).toBe('');
  });

  it('applyOwnMnemonic swaps in place and reverts to the generated line when cleared', () => {
    const p = MP.buildPalace(sampleData());
    const ai = p.loci.find((l) => l.id === 'b0_i0').mnemonic;
    expect(MP.applyOwnMnemonic(p, 'b0_i0', 'A lake in a kettle')).toBe(true);
    expect(p.loci.find((l) => l.id === 'b0_i0').mnemonic).toBe('A lake in a kettle');
    MP.applyOwnMnemonic(p, 'b0_i0', '');
    const back = p.loci.find((l) => l.id === 'b0_i0');
    expect(back.mnemonic).toBe(ai);                        // falling back restores, never blanks
    expect(back.mnemonicSource).toBe('ai');
    expect(MP.applyOwnMnemonic(p, '__entry', 'nope')).toBe(false);
    expect(MP.applyOwnMnemonic(p, 'no_such_locus', 'nope')).toBe(false);
  });

  it('mnemonicFeedback flags empty, too-short and label-echo drafts', () => {
    expect(MP.mnemonicFeedback('', 'Evaporation').empty).toBe(true);
    expect(MP.mnemonicFeedback('steam', 'Evaporation').tooShort).toBe(true);
    expect(MP.mnemonicFeedback('  evaporation  ', 'Evaporation').echoesLabel).toBe(true);
    const good = MP.mnemonicFeedback('A kettle the size of a house screaming on my roof', 'Evaporation');
    expect(good.ok).toBe(true);
    expect(good.criteria).toEqual(MP.MNEMONIC_CRITERIA);
  });

  it('judges non-Latin drafts by the same rules (no ASCII-only word matching)', () => {
    // An accent/ASCII-folding check would strip these to '' and call every
    // Japanese draft an echo of every Japanese label.
    expect(MP.mnemonicFeedback('やかんが屋根の上で叫んでいる', '蒸発').echoesLabel).toBe(false);
    expect(MP.mnemonicFeedback('やかんが屋根の上で叫んでいる', '蒸発').ok).toBe(true);
    expect(MP.mnemonicFeedback('蒸発', '蒸発').echoesLabel).toBe(true);
    expect(MP.mnemonicFeedback('Осьминог играет на пианино в моей кухне', 'Испарение').ok).toBe(true);
  });

  it('setLocusMnemonic updates the accessible route list without a rebuild', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {});            // jsdom ⇒ visible fallback route list
    expect(typeof h.setLocusMnemonic).toBe('function');
    expect(el.textContent).toContain('golden steam');
    h.setLocusMnemonic('b0_i0', 'A kettle wearing my sneakers');
    expect(el.textContent).toContain('A kettle wearing my sneakers');
    expect(el.textContent).not.toContain('golden steam');
    h.setLocusMnemonic('b0_i0', '');                      // clearing restores the generated line
    expect(el.textContent).toContain('golden steam');
    h.destroy();
  });
});

// ── Recall order — the backward/shuffled mastery check ────────────────────
describe('MemoryPalace.buildRecallOrder', () => {
  it('walks forward by default and excludes the entrance', () => {
    const p = MP.buildPalace(sampleData());
    const order = MP.buildRecallOrder(p, {});
    expect(order).not.toContain('__entry');
    expect(order).toEqual(p.route.filter((id) => id !== '__entry'));
  });

  it('reverses the route for the backward check', () => {
    const p = MP.buildPalace(sampleData());
    const fwd = MP.buildRecallOrder(p, { direction: 'forward' });
    expect(MP.buildRecallOrder(p, { direction: 'backward' })).toEqual(fwd.slice().reverse());
  });

  it('shuffles deterministically per seed and covers every locus exactly once', () => {
    const p = MP.buildPalace(sampleData());
    const fwd = MP.buildRecallOrder(p, { direction: 'forward' });
    const a = MP.buildRecallOrder(p, { direction: 'shuffle', seed: 42 });
    const b = MP.buildRecallOrder(p, { direction: 'shuffle', seed: 42 });
    expect(a).toEqual(b);                                  // seeded ⇒ replayable for tests + retries
    expect(a.slice().sort()).toEqual(fwd.slice().sort());  // a permutation, never a subset
  });

  it('never mutates the palace route and survives a junk direction', () => {
    const p = MP.buildPalace(sampleData());
    const before = p.route.slice();
    MP.buildRecallOrder(p, { direction: 'backward' });
    MP.buildRecallOrder(p, { direction: 'shuffle', seed: 3 });
    expect(p.route).toEqual(before);
    expect(MP.buildRecallOrder(p, { direction: 'sideways' })).toEqual(before.filter((id) => id !== '__entry'));
    expect(MP.buildRecallOrder(null, {})).toEqual([]);
  });
});

// ── View wiring for the two learner-facing lanes ──────────────────────────
// jsdom cannot mount the organizer, so these pin the source contract the way
// the sibling HUD tests do: the plumbing exists, persists to its own sub-store,
// and pushes live rather than remounting the walk.
describe('MemoryPalace view — own image + recall order wiring', () => {
  const view = () => readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('offers a zero-AI own-image editor that persists to its own sub-store', () => {
    const v = view();
    expect(v).toContain('const saveOwnMnemonic = (id, text) =>');
    expect(v).toContain('store.myMnemonics = next');
    expect(v).toContain("id=\"mp-own-mnemonic\"");
    expect(v).toContain("t('memory_palace.own_write')");
    expect(v).toContain("t('memory_palace.own_revert')");
    // the four criteria are self-rated prompts, not a machine score
    expect(v).toContain("t('memory_palace.own_crit_action')");
    expect(v).toContain("t('memory_palace.own_crit_personal')");
  });

  it('pushes an edited image into the live walk instead of remounting it', () => {
    const v = view();
    expect(v).toContain('handleRef.current.setLocusMnemonic(id, own)');
    expect(v).toContain('MP.applyOwnMnemonic(palaceRef.current, id, own)');
    // myMnemonics must stay OUT of dataKey or every save would rebuild the
    // scene and throw the walker back to the entrance.
    const mpv = v.slice(v.indexOf('const MemoryPalaceView = ('));
    const dataKey = mpv.slice(mpv.indexOf('const dataKey = JSON.stringify({'), mpv.indexOf('const nowISO'));
    expect(dataKey).not.toContain('myMnemonics');
  });

  it('drops a stale draft when the walker moves to another locus', () => {
    const v = view();
    expect(v).toContain("React.useEffect(() => { setMnEditing(false); setMnDraft(''); }, [mnLocusId]);");
  });

  it('runs the recall check in a chosen order without moving the palace', () => {
    const v = view();
    expect(v).toContain('MP.buildRecallOrder(palace, { direction: dir, seed, only })');
    expect(v).toContain('recallOrderRef.current');
    expect(v).toContain("retryRecall('backward')");
    expect(v).toContain("retryRecall('shuffle')");
    // restart through retryRecall, never exit-then-start (stale state + disarms)
    expect(v).not.toContain('exitRecall(); startRecall(');
    // goTo still takes a ROUTE index — the geography is unchanged
    expect(v).toContain('const nextIdx = route.indexOf(nextId);');
  });

  it('keeps the harder orders as a next step, not a fourth start button', () => {
    const v = view();
    const summary = v.slice(v.indexOf("t('memory_palace.order_next')"));
    expect(summary.slice(0, 2000)).toContain("t('memory_palace.order_backward')");
    // offered from the finished-run summary
    expect(v.indexOf("t('memory_palace.order_next')")).toBeGreaterThan(v.indexOf('recall && finished && ('));
  });
});

// ── Expanding the palace (student-built rooms and loci) ───────────────────
// The pedagogical promise is "the palace grows and nothing you already learned
// moves", so the stability assertions here are the point, not decoration.
function withExtras(rooms, loci) {
  const d = sampleData();
  d.memoryPalace = { extraRooms: rooms || [], extraLoci: loci || [] };
  return d;
}

describe('MemoryPalace — student-built extensions', () => {
  it('merges student rooms and loci into the walk, marked as theirs', () => {
    const p = MP.buildPalace(withExtras(
      [{ id: 'xr1', title: 'My Attic' }],
      [{ id: 'xl1', room: 'b0', label: 'My own fact' }, { id: 'xl2', room: 'xr1', label: 'Attic thing' }],
    ));
    expect(p.rooms.map((r) => r.key)).toEqual(['__entry', 'b0', 'b1', 'xr1']);
    expect(p.rooms.find((r) => r.key === 'xr1').mine).toBe(true);
    // a student locus sits right after its own room's generated loci
    expect(p.route).toEqual(['__entry', 'b0_i0', 'b0_i1', 'xl1', 'b1_i0', 'b1_i1', 'xl2']);
    const mine = p.loci.find((l) => l.id === 'xl1');
    expect(mine.mine).toBe(true);
    expect(mine.label).toBe('My own fact');
    expect(mine.roomIdx).toBe(1);
  });

  it('re-homes a locus whose room disappeared instead of deleting the student work', () => {
    const p = MP.buildPalace(withExtras([], [{ id: 'xl1', room: 'b7_gone', label: 'Orphan' }]));
    const orphan = p.loci.find((l) => l.id === 'xl1');
    expect(orphan).toBeTruthy();
    expect(orphan.roomIdx).toBe(1);              // first room, not dropped
    expect(p.route).toContain('xl1');
  });

  it('never moves a generated room when the student adds an annex', () => {
    const at = (rooms) => JSON.stringify(MP.buildPalace(withExtras(rooms, [])).rooms.find((r) => r.key === 'b0').center);
    const none = at([]);
    expect(at([{ id: 'xr1', title: 'A' }])).toBe(none);
    expect(at([{ id: 'xr1', title: 'A' }, { id: 'xr2', title: 'B' }])).toBe(none);
    expect(at([{ id: 'xr1', title: 'A' }, { id: 'xr2', title: 'B' }, { id: 'xr3', title: 'C' }])).toBe(none);
  });

  it('never moves an existing annex or wall frame when another is added', () => {
    const roomsA = [{ id: 'xr1', title: 'A' }];
    const roomsB = [{ id: 'xr1', title: 'A' }, { id: 'xr2', title: 'B' }];
    const annexAt = (rooms) => JSON.stringify(MP.buildPalace(withExtras(rooms, [])).rooms.find((r) => r.key === 'xr1').center);
    expect(annexAt(roomsA)).toBe(annexAt(roomsB));
    // and a wall frame does not re-space when a student locus joins its room —
    // wall SLOTS would have divided the room by the new count
    const frame = (loci) => JSON.stringify(MP.buildPalace(withExtras([], loci)).loci.find((l) => l.id === 'b0_i0').framePos);
    const before = frame([]);
    expect(frame([{ id: 'xl1', room: 'b0', label: 'one' }])).toBe(before);
    expect(frame([{ id: 'xl1', room: 'b0', label: 'one' }, { id: 'xl2', room: 'b0', label: 'two' }])).toBe(before);
  });

  it('keeps the annex ring inside the palace bounds', () => {
    const p = MP.buildPalace(withExtras([{ id: 'xr1', title: 'A' }, { id: 'xr2', title: 'B' }], []));
    p.rooms.forEach((r) => {
      expect(Math.abs(r.center.x)).toBeLessThan(p.bounds.maxX);
      expect(Math.abs(r.center.z)).toBeLessThan(p.bounds.maxZ);
    });
  });

  it('mints ids that cannot collide with generated ones, even after gaps', () => {
    expect(MP.nextExtraLocusId([])).toBe('xl1');
    expect(MP.nextExtraLocusId([{ id: 'xl1' }, { id: 'xl9' }])).toBe('xl10');
    expect(MP.nextExtraRoomId([{ id: 'xr1' }])).toBe('xr2');
    expect(MP.nextExtraLocusId([{ id: 'xl3' }]).startsWith('b')).toBe(false);
  });

  it('round-trips a floor click into room-local space and back', () => {
    const p = MP.buildPalace(sampleData());
    const l = p.loci.find((x) => x.id === 'b0_i1');
    const hit = MP.roomAtPoint(p, l.framePos.x, l.framePos.z, 0);
    expect(hit.roomKey).toBe('b0');
    const placed = MP.buildPalace(withExtras([], [{ id: 'xl1', room: hit.roomKey, label: 'here', lx: hit.lx, lz: hit.lz }]));
    const mine = placed.loci.find((x) => x.id === 'xl1');
    expect(mine.framePos.x).toBeCloseTo(l.framePos.x, 5);
    expect(mine.framePos.z).toBeCloseTo(l.framePos.z, 5);
  });

  it('refuses floor points that are not inside a room', () => {
    const p = MP.buildPalace(sampleData());
    expect(MP.roomAtPoint(p, 0, 0)).toBe(null);            // the hub plaza
    expect(MP.roomAtPoint(p, 1e6, 1e6)).toBe(null);        // outside everything
  });

  it('auto-placed spots stay inside the room and do not stack', () => {
    const p = MP.buildPalace(withExtras([], [
      { id: 'xl1', room: 'b0', label: 'a' }, { id: 'xl2', room: 'b0', label: 'b' }, { id: 'xl3', room: 'b0', label: 'c' },
    ]));
    const mine = p.loci.filter((l) => l.mine);
    const seen = new Set(mine.map((l) => `${l.lx.toFixed(2)},${l.lz.toFixed(2)}`));
    expect(seen.size).toBe(3);                             // distinct spots
    const room = p.rooms.find((r) => r.key === 'b0');
    mine.forEach((l) => {
      const back = MP.worldToRoomLocal(room, l.framePos.x, l.framePos.z);
      expect(Math.abs(back.lx)).toBeLessThan(400);
      expect(Math.abs(back.lz)).toBeLessThan(400);
    });
  });

  it('lets student loci carry own images and join the recall check', () => {
    const d = withExtras([], [{ id: 'xl1', room: 'b0', label: 'My own fact' }]);
    d.memoryPalace.myMnemonics = { xl1: 'A trumpet growing out of the floorboards' };
    const p = MP.buildPalace(d);
    expect(p.loci.find((l) => l.id === 'xl1').mnemonicSource).toBe('self');
    expect(MP.describeLocusForSR(p, 'xl1', null, {})).toContain('trumpet');
    expect(MP.buildRecallOrder(p, {})).toContain('xl1');
    expect(MP.buildRecallBank(p, 5).map((c) => c.id)).toContain('xl1');
    // and the recall announcement still never leaks the answer
    expect(MP.describeLocusForRecall(p, 'xl1', null, {})).not.toContain('My own fact');
  });

  it('exposes build mode on the handle as a safe no-op without WebGL', () => {
    const el = document.createElement('div');
    const h = MP.render(el, sampleData(), {});
    expect(typeof h.setBuildMode).toBe('function');
    expect(() => h.setBuildMode(true)).not.toThrow();
    h.destroy();
  });
});

describe('MemoryPalace view — build wiring', () => {
  const view = () => readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('turns a floor click into a named locus persisted in its own sub-store', () => {
    const v = view();
    expect(v).toContain('onFloorPlace: (spot) =>');
    expect(v).toContain('const saveNewSpot = () =>');
    expect(v).toContain('MP.nextExtraLocusId(mineLoci)');
    expect(v).toContain('persistPalace({ ...(mpRef.current || {}), extraLoci: next })');
    expect(v).toContain("t('memory_palace.build_toggle')");
    // build mode must not survive into a quiz or the presentation view
    expect(v).toContain('const on = buildMode && !recall && !presenting;');
  });

  it('rebuilds the scene for structural additions (unlike a rewritten image)', () => {
    const v = view();
    const mpv = v.slice(v.indexOf('const MemoryPalaceView = ('));
    const dataKey = mpv.slice(mpv.indexOf('const dataKey = JSON.stringify({'), mpv.indexOf('const nowISO'));
    expect(dataKey).toContain('extraRooms');
    expect(dataKey).toContain('extraLoci');
    expect(dataKey).not.toContain('myMnemonics');
  });

  it('removing a student spot also clears anything hung on it', () => {
    const v = view();
    const fn = v.slice(v.indexOf('const removeMineLocus'), v.indexOf('const removeMineLocus') + 900);
    ['images', 'depths', 'objects', 'stamps', 'myMnemonics', 'mastery'].forEach((k) => {
      expect(fn).toContain(k);
    });
  });
});

describe('Memory Palace generation prompt', () => {
  it('asks for a walkable palace of about 16 loci without padding', () => {
    const src = readFileSync(resolve(process.cwd(), 'generate_dispatcher_module.js'), 'utf8');
    const block = src.slice(src.indexOf("case 'Memory Palace':"), src.indexOf("case 'Memory Palace':") + 1400);
    expect(block).toContain('about 16 loci');
    expect(block).toContain('4 ROOMS of 4');
    expect(block).toMatch(/never pad/i);
  });
});

// ── The printed handout must match the walk ───────────────────────────────
// doc_pipeline's palace projection used to read b.mnemonics directly, so once a
// student replaced an image with their own, the paper copy showed them a DIFFERENT
// mnemonic from the one they had actually encoded — and student-built rooms and
// loci were missing from the handout entirely.
//
// These are source-contract assertions, not render assertions: the print path
// lives deep inside a very large render pipeline with no unit-test seam. They pin
// the wiring; they do not prove the emitted HTML.
describe('doc_pipeline — Memory Palace print projection', () => {
  const doc = () => readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

  it('projects the palace from the same store the walk uses', () => {
    const d = doc();
    expect(d).toContain('const _palaceStore = (item.data && item.data.memoryPalace) || {};');
    expect(d).toContain('const _palaceRooms = () => {');
    expect(d).toContain('_palaceStore.myMnemonics');
    // the student's own image outranks the generated one, exactly as buildPalace does
    expect(d).toContain('mnemonic: ownText || (mnems[k] != null ? String(mnems[k]) : \'\')');
  });

  it('prints student-built rooms and loci, re-homing orphans like buildPalace', () => {
    const d = doc();
    expect(d).toContain('_palaceStore.extraRooms');
    expect(d).toContain('_palaceStore.extraLoci');
    expect(d).toContain('byKey[String(e.room)] || rooms[0]');   // orphan re-home
  });

  it('labels a self-authored image as the student\'s own', () => {
    const d = doc();
    expect(d.match(/Your picture/g) || []).toHaveLength(2);      // room plan + text fallback
  });

  it('leaves no path still reading the raw mnemonics array for the palace', () => {
    const d = doc();
    const palaceBlocks = d.split("type === 'Memory Palace'").slice(1);
    expect(palaceBlocks).toHaveLength(2);                        // room plan + text fallback
    palaceBlocks.forEach((block) => {
      const scoped = block.slice(0, 3000);
      expect(scoped).toContain('_palaceRooms()');
      expect(scoped).not.toContain('b.mnemonics');
    });
  });
});

// ── The assessment spine ──────────────────────────────────────────────────
// Four defects that between them let a student mark a whole palace "mastered
// until October" in about two minutes, with no retrieval at all. Each is pinned
// here because each was invisible from the UI.
describe('MemoryPalace — assessment spine', () => {
  const T0 = '2026-07-26T10:00:00.000Z';
  const sameDayLater = '2026-07-26T10:05:00.000Z';
  const nextDay = '2026-07-27T10:00:00.000Z';
  const dayMs = 86400000;
  const inDays = (iso, from) => Math.round((Date.parse(iso) - Date.parse(from)) / dayMs);

  it('massed practice cannot buy a longer interval', () => {
    let m = MP.updateMastery({}, { a: { attempts: 1, correct: true } }, T0);
    const firstDue = m.a.dueAt;
    for (let i = 0; i < 5; i++) {
      m = MP.updateMastery(m, { a: { attempts: 1, correct: true } }, sameDayLater);
    }
    expect(m.a.reps).toBe(1);            // was 6
    expect(m.a.dueAt).toBe(firstDue);    // was pushed to +75 days
    expect(inDays(m.a.dueAt, T0)).toBe(1);
  });

  it('still advances on a genuinely later day', () => {
    let m = MP.updateMastery({}, { a: { attempts: 1, correct: true } }, T0);
    m = MP.updateMastery(m, { a: { attempts: 1, correct: true } }, nextDay);
    expect(m.a.reps).toBe(2);
    expect(inDays(m.a.dueAt, nextDay)).toBe(3);
  });

  it('a same-day FAILURE still demotes — forgetting is news whenever it happens', () => {
    let m = MP.updateMastery({}, { a: { attempts: 1, correct: true } }, T0);
    m = MP.updateMastery(m, { a: { attempts: 1, correct: true } }, nextDay);   // reps 2
    const slipped = MP.updateMastery(m, { a: { attempts: 2, correct: false } }, nextDay);
    expect(slipped.a.reps).toBe(1);
    expect(slipped.a.strength).toBe(0);
    expect(inDays(slipped.a.dueAt, nextDay)).toBe(1);
  });

  it('guessing through the options earns no ladder advance', () => {
    const brute = MP.updateMastery({}, { a: { attempts: 4, correct: true } }, T0);
    expect(brute.a.strength).toBe(0.2);
    expect(brute.a.reps).toBe(0);                     // was 0.6 / reps 1
    expect(inDays(brute.a.dueAt, T0)).toBe(1);
    const second = MP.updateMastery({}, { a: { attempts: 2, correct: true } }, T0);
    expect(second.a.strength).toBe(0.6);              // a near miss still counts
    expect(second.a.reps).toBe(1);
  });

  it('a self-rated recall is never scored as a verified first-try one', () => {
    const self = MP.updateMastery({}, { a: { attempts: 1, correct: true, selfRated: true } }, T0);
    const real = MP.updateMastery({}, { a: { attempts: 1, correct: true } }, T0);
    expect(self.a.strength).toBe(0.6);
    expect(real.a.strength).toBe(1);
    const score = MP.scoreRecall({ a: { attempts: 1, correct: true, selfRated: true } });
    expect(score.selfRated).toBe(1);
    expect(score.firstTry).toBe(0);      // not presented as a measured first-try recall
    expect(score.eventual).toBe(1);
  });

  it('a review can be narrowed to the loci that are actually due', () => {
    const p = MP.buildPalace(sampleData());
    const all = MP.buildRecallOrder(p, {});
    const due = [all[0], all[2]];
    expect(MP.buildRecallOrder(p, { only: due })).toEqual(due);
    // direction still applies inside the narrowed set
    expect(MP.buildRecallOrder(p, { only: due, direction: 'backward' })).toEqual(due.slice().reverse());
    // a stale/unknown due list must never produce an empty quiz
    expect(MP.buildRecallOrder(p, { only: ['gone_1', 'gone_2'] })).toEqual(all);
    expect(MP.buildRecallOrder(p, { only: [] })).toEqual(all);
  });

  it('the choice set stays a real question at every locus', () => {
    const p = MP.buildPalace(sampleData());
    const ids = p.route.filter((id) => id !== '__entry');
    ids.forEach((id) => {
      const choices = MP.buildLocusChoices(p, id, { seed: 11 });
      expect(choices.length).toBeGreaterThan(1);            // never a forced single choice
      expect(choices.some((c) => c.id === id)).toBe(true);  // the answer is present
      const labels = choices.map((c) => c.label);
      expect(new Set(labels).size).toBe(labels.length);     // no duplicate-label ambiguity
    });
  });

  it('choices are stable for a locus but differ between loci and runs', () => {
    const p = MP.buildPalace(sampleData());
    const a1 = MP.buildLocusChoices(p, 'b0_i0', { seed: 5 });
    const a2 = MP.buildLocusChoices(p, 'b0_i0', { seed: 5 });
    expect(a2).toEqual(a1);
    expect(MP.buildLocusChoices(p, 'b0_i1', { seed: 5 })).not.toEqual(a1);
    expect(MP.buildLocusChoices(p, 'b0_i0', { seed: 6 })).not.toEqual(a1);
    expect(MP.buildLocusChoices(p, 'no_such_locus', { seed: 5 })).toEqual([]);
  });

  it('caps the choice set without ever dropping the answer', () => {
    const p = MP.buildPalace(sampleData());
    const small = MP.buildLocusChoices(p, 'b0_i0', { seed: 3, size: 2 });
    expect(small).toHaveLength(2);
    expect(small.some((c) => c.id === 'b0_i0')).toBe(true);
  });
});

describe('MemoryPalace view — assessment spine wiring', () => {
  const view = () => readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('Review now starts a focused walk, unlike the plain recall button', () => {
    const v = view();
    expect(v).toContain("startRecall('bank', false, 'forward', (dueInfo.due || []).concat(dueInfo.newIds || []))");
    // and the plain button still walks everything
    expect(v).toContain("startRecall('bank', false)");
  });

  it('a focused walk only scores what it actually covered', () => {
    const v = view();
    const fn = v.slice(v.indexOf('const finishRecall'), v.indexOf('const finishRecall') + 1200);
    expect(fn).toContain('recallOrderRef.current');
    expect(fn).not.toMatch(/const targets = palaceRef\.current\.route\.filter/);
  });

  it('renders per-locus choices rather than a bank that empties as you go', () => {
    const v = view();
    expect(v).toContain('MP.buildLocusChoices(palaceRef.current, current.id, { seed: recall.seed })');
    expect(v).toContain('{recallChoices.map((chip) => (');
    // the two splices that used to consume the bank are gone
    expect(v).not.toContain('const nb = bank.slice(); nb.splice(j, 1); return nb;');
    expect(v).not.toContain('nb.splice(i, 1); return nb; });');
  });

  it('marks a self-check result as self-reported for everything downstream', () => {
    const v = view();
    expect(v).toContain('selfChecked: true, selfRated: true');
  });
});

// ── Content drift, answer leaks and announcements ─────────────────────────
describe('MemoryPalace — student work never re-attaches to different content', () => {
  const withWork = () => {
    const d = sampleData();
    d.memoryPalace = {
      myMnemonics: { b1_i0: 'MY image for the ORIGINAL fact' },
      mastery: { b1_i0: { reps: 5, strength: 1, dueAt: '2026-12-01T00:00:00.000Z' } },
      locusFor: { b1_i0: MP.fingerprintLabel('Precipitation') },
    };
    return d;
  };

  it('fingerprints are language-neutral and stable', () => {
    expect(MP.fingerprintLabel('Evaporation')).toBe(MP.fingerprintLabel('  evaporation  '));
    expect(MP.fingerprintLabel('蒸発')).toBe(MP.fingerprintLabel('蒸発'));
    expect(MP.fingerprintLabel('蒸発')).not.toBe(MP.fingerprintLabel('凝結'));
    expect(MP.fingerprintLabel('')).toBe('');
  });

  it('withholds a self-authored image once its locus holds a different fact', () => {
    const d = withWork();
    expect(MP.buildPalace(d).loci.find((l) => l.id === 'b1_i0').mnemonicSource).toBe('self');
    d.branches[1].items[0] = 'Something else entirely';        // the outline was edited
    const l = MP.buildPalace(d).loci.find((x) => x.id === 'b1_i0');
    expect(l.contentChanged).toBe(true);
    expect(l.mnemonicSource).not.toBe('self');
    expect(l.mnemonic).not.toContain('ORIGINAL');
  });

  it('reports drift when an id survives but now holds another fact', () => {
    // three rooms, work filed against room 2 — delete room 1 and the id b1_i0
    // still exists, but the fact standing there is a different one.
    const d = sampleData();
    d.branches.push({ title: 'Ocean Room', items: ['Runoff', 'Infiltration'], mnemonics: ['x', 'y'] });
    d.memoryPalace = {
      myMnemonics: { b1_i0: 'MY image for Precipitation' },
      locusFor: { b1_i0: MP.fingerprintLabel('Precipitation') },
    };
    expect(MP.staleLocusIds(MP.buildPalace(d), d.memoryPalace)).toEqual([]);
    d.branches.splice(0, 1);
    const p = MP.buildPalace(d);
    expect(p.loci.find((l) => l.id === 'b1_i0').label).toBe('Runoff');   // a DIFFERENT fact
    expect(MP.staleLocusIds(p, d.memoryPalace)).toEqual(['b1_i0']);
  });

  it('reports work orphaned by a deleted locus, and leaves legacy stores alone', () => {
    const d = withWork();
    d.branches.splice(0, 1);                                   // b1_* no longer exists at all
    const p = MP.buildPalace(d);
    expect(p.loci.some((l) => l.id === 'b1_i0')).toBe(false);
    expect(MP.staleLocusIds(p, d.memoryPalace)).toEqual(['b1_i0']);   // orphaned, not silently kept
    expect(MP.staleLocusIds(p, { myMnemonics: { b1_i0: 'x' } })).toEqual([]);   // legacy store
    expect(MP.staleLocusIds(p, {})).toEqual([]);
  });

  it('a matching fingerprint keeps the work attached', () => {
    const d = withWork();
    d.branches[1].title = 'Renamed room';                      // room name is not the locus content
    const p = MP.buildPalace(d);
    expect(MP.staleLocusIds(p, d.memoryPalace)).toEqual([]);
    expect(p.loci.find((l) => l.id === 'b1_i0').mnemonicSource).toBe('self');
  });
});

describe('MemoryPalace — recall answer leaks and announcements', () => {
  const view = () => readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('an AI sculpture name is not spoken as the cue during a quiz', () => {
    const v = view();
    expect(v).toContain("out[id] = recall\n                    ? (t('memory_palace.decor_sculpture')");
    // and the decor map recomputes when a quiz starts or ends
    expect(v).toContain("q: !!recall });");
  });

  it('answers are announced, not only coloured and beeped', () => {
    const v = view();
    expect(v).toContain("t('memory_palace.answer_wrong')");
    expect(v).toContain("t('memory_palace.answer_right')");
    expect(v).toContain('aria-live="assertive"');
  });

  it('progress-rail numerals no longer sit at 1.49:1', () => {
    const v = view();
    expect(v).not.toContain('text-[11px] font-black text-white');
    expect(v).toContain('text-[11px] font-black text-slate-900');
  });
});

// ── Degradation, keyboard access, and not destroying work ─────────────────
describe('MemoryPalace — graceful degradation and reachability', () => {
  const view = () => readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');
  const mod = () => readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8');

  it('the engine tells the host every time it falls back to the route list', () => {
    expect(mod()).toContain("if (typeof opts.onFallback === 'function')");
    // fires from showFallback, which covers no-WebGL, load failure and mount throw
    const src = mod();
    const fn = src.slice(src.indexOf('function showFallback'), src.indexOf('function showFallback') + 700);
    expect(fn).toContain('opts.onFallback');
  });

  it('controls that need the 3D walk are withdrawn, not left inert', () => {
    const v = view();
    expect(v).toContain('onFallback: () => setNoWalk(true)');
    expect(v).toContain("t('memory_palace.no_walk_notice')");
    expect(v).toContain('{hasContent && !failed && !noWalk && recallEligible && (');
    expect(v).toContain('{hasContent && !failed && !noWalk && persist && (');
  });

  it('build mode has a keyboard path, not just a floor click', () => {
    const v = view();
    expect(v).toContain('const addSpotHere = () =>');
    expect(v).toContain('MP.extraSpotFor(used)');
    expect(v).toContain("t('memory_palace.build_here')");
  });

  it('a decorative stamp no longer destroys the illustration underneath it', () => {
    const v = view();
    expect(v).toContain('const prevImg =');
    expect(v).toContain('nx.covered =');
    expect(v).toContain("t('memory_palace.decorate_restored')");
    // restamping must not bury the original twice
    expect(v).toContain('if (prevImg && !alreadyStamped)');
  });

  it('the covered artwork is stripped from BOTH the cloud and local quota paths', () => {
    const sync = readFileSync(resolve(process.cwd(), 'firestore_sync_module.js'), 'utf8');
    expect(sync).toContain('const { images, depths, covered, ...keep } = palace;');
    // the local IndexedDB retry is the only durable store a student has
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('const { images, depths, covered, ...keepPalace } = mp;');
    // and the generated twin must carry the same fix
    const app = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');
    expect(app).toContain('const { images, depths, covered, ...keepPalace } = mp;');
  });
});
