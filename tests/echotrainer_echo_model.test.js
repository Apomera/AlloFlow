import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// React lives with the web app in this repo (same resolution the other render tests use).
const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const { renderToStaticMarkup } = require(resolve(MODULES_DIR, 'react-dom/server'));

// Echo Navigator, 2026-11-23 pass. One model (window.__alloEchoNavModel) now feeds
// the sound, the echo read-out, the distance challenge, the corner map and the Echo
// timing panel. These tests run that model on the real rooms, and pin the bugs it
// replaced:
//   - moving things and landmarks were panned 90 degrees off (ahead sounded hard right)
//   - the left arrow and the mouse turned RIGHT in 3D
//   - the corner map drew the beacon and every wall in every mode, Audio Only included
//   - Echo Vision lit a surface only if its centre was within about 11 m
//   - the distance challenge offered 0.5 to 20 m for surfaces that are up to 50 m away
//   - an "audio win" was scored after mapping the room with the picture on
//   - quiz XP could be farmed from one spot
// Set ECHO_TOOL_FILE to another copy of the tool to see which of these fail there.

const FILE = process.env.ECHO_TOOL_FILE || 'stem_lab/stem_tool_echotrainer.js';
const SRC = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

function load() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.runInNewContext(SRC, sandbox);
  return sandbox;
}
const box = load();
const M = box.__alloEchoNavModel;
const NORTH = -Math.PI / 2, EAST = 0, SOUTH = Math.PI / 2, WEST = Math.PI;

describe('Echo Navigator model: one source for every echo number', () => {
  it('is exposed, and the tool still registers', () => {
    expect(M, 'window.__alloEchoNavModel').toBeTruthy();
    expect(box.StemLab.isRegistered('echoTrainer')).toBe(true);
  });

  it('echo delay is 2 x distance / speed of sound', () => {
    expect(M.SPEED_OF_SOUND).toBe(343);
    expect(M.delaySec(34.3)).toBeCloseTo(0.2, 12);
    expect(M.delaySec(10, 200)).toBeCloseTo(0.1, 12);
    expect(M.metersFromDelay(M.delaySec(17.5))).toBeCloseTo(17.5, 12);
    // twice as far = twice the wait
    expect(M.delaySec(40) / M.delaySec(20)).toBeCloseTo(2, 12);
    // the room's own echo: 320 map units = 16 m (1 unit = 0.05 m, the scale the 3D picture is drawn at)
    expect(M.M_PER_PX).toBe(0.05);
    expect(M.metersFromPx(320)).toBeCloseTo(16, 12);
    expect(M.delaySecFromPx(320)).toBeCloseTo((2 * 16) / 343, 12);
  });

  it('loudness falls with distance and scales with how much the surface reflects', () => {
    expect(M.gainFromPx(100, 0.9)).toBeGreaterThan(M.gainFromPx(200, 0.9));
    expect(M.gainFromPx(200, 0.9)).toBeGreaterThan(M.gainFromPx(400, 0.9));
    expect(M.gainFromPx(200, 0.95)).toBeGreaterThan(M.gainFromPx(200, 0.3));
    // ref is an ENERGY share; speaker gain is amplitude, its square root: twice the energy = 1.41x the gain
    expect(M.gainFromPx(200, 0.6) / M.gainFromPx(200, 0.3)).toBeCloseTo(Math.SQRT2, 12);
    expect(M.gainFromPx(200, 0)).toBe(0);
    expect(M.gainFromMeters(10, 0.5)).toBeCloseTo(M.gainFromPx(200, 0.5), 12);
  });

  it('the sound, the Echo timing panel and the challenge all call the model', () => {
    const emitAt = SRC.indexOf('function emitClick()');
    const emit = SRC.slice(emitAt, SRC.indexOf('// ── Distance estimation challenge ──', emitAt));
    expect(emit).toContain('EchoModel.castFan(');
    expect(emit).toContain('var delaySec = EchoModel.delaySecFromPx(minDist);');
    expect(emit).toContain('var atten = EchoModel.gainFromPx(minDist, hitRef);');
    // no second copy of the arithmetic anywhere
    expect(SRC).not.toMatch(/minDist \* 2 \* 0\.1/);
    expect(SRC).not.toMatch(/iq\.distance \* 2 \/ iq\.speed/);
    expect(SRC).toContain('var echoMs = EchoModel.delaySec(iq.distance, iq.speed) * 1000;');
    expect(SRC).toContain('playSingleEcho(iq.distance, iq.speed, EchoModel.gainFromMeters(iq.distance, iq.surface / 100))');
    // the timing words use the model's sourced thresholds: fused under 5 ms, close up to 2 m (11.7 ms), separate beyond
    expect(M.FUSE_MS).toBe(5);
    expect(M.NEAR_MS).toBeCloseTo(11.6618, 3);
    expect(M.timingState(4.9)).toBe('tooFast');
    expect(M.timingState(5)).toBe('crisp');
    expect(M.timingState(M.delaySec(2) * 1000)).toBe('crisp');
    expect(M.timingState(11.7)).toBe('distinct');
    expect(M.timingState(250)).toBe('distinct');
    expect(SRC).toContain('var fusionX = 48 + (EchoModel.FUSE_MS / maxMs) * 476;');
    expect(SRC).toContain('var crispX = 48 + (EchoModel.NEAR_MS / maxMs) * 476;');
  });

  it('sends no click, and awards no XP, for merely pressing Click', () => {
    const emitAt = SRC.indexOf('function emitClick()');
    const emit = SRC.slice(emitAt, SRC.indexOf('// ── Distance estimation challenge ──', emitAt));
    expect(emit).not.toMatch(/awardXP\s*\(/);
    // nothing happens before the safety notice is acknowledged
    expect(emit).toMatch(/if \(!curData\.disclaimerDismissed\) return;/);
  });
});

describe('Echo Navigator model: left and right', () => {
  it('ahead is ahead and right is right, whichever way the player faces', () => {
    // Web Audio listens along -z with +x to the right.
    let hr = M.headRelative(0, -100, NORTH);            // thing to the north, facing north
    expect(hr.forward).toBeCloseTo(100, 9); expect(hr.right).toBeCloseTo(0, 9);
    expect(hr.x).toBeCloseTo(0, 9); expect(hr.z).toBeCloseTo(-100, 9);
    hr = M.headRelative(100, 0, NORTH);                 // thing to the east, facing north = on the right
    expect(hr.x).toBeCloseTo(100, 9); expect(hr.z).toBeCloseTo(0, 9);
    hr = M.headRelative(-100, 0, NORTH);                // west = on the left
    expect(hr.x).toBeCloseTo(-100, 9);
    hr = M.headRelative(0, 100, EAST);                  // facing east, thing to the south = on the right
    expect(hr.x).toBeCloseTo(100, 9); expect(hr.forward).toBeCloseTo(0, 9);
    hr = M.headRelative(0, 100, NORTH);                 // behind
    expect(hr.forward).toBeCloseTo(-100, 9); expect(hr.z).toBeCloseTo(100, 9);
  });

  it('bearing and stereo balance agree with it', () => {
    expect(M.bearingDeg(0, -50, NORTH)).toBeCloseTo(0, 9);
    expect(M.bearingDeg(50, 0, NORTH)).toBeCloseTo(90, 9);
    expect(M.bearingDeg(-50, 0, NORTH)).toBeCloseTo(-90, 9);
    expect(M.stereoPan(50, 0, NORTH)).toBeCloseTo(1, 9);
    expect(M.stereoPan(-50, 0, NORTH)).toBeCloseTo(-1, 9);
    expect(M.stereoPan(0, -50, NORTH)).toBeCloseTo(0, 9);
    expect(M.stereoPan(50, -50, NORTH)).toBeGreaterThan(0);
    expect(M.stereoPan(0, 0, NORTH)).toBe(0);
  });

  it('every moving sound and landmark is placed with headRelative (the old rotation is gone)', () => {
    // The old code rotated by -angle and wrote the result straight into x and z,
    // which put a thing straight ahead at +x: hard right.
    expect(SRC).not.toMatch(/Math\.cos\(-player\.angle\)/);
    expect(SRC).not.toMatch(/relX \* cosP - relZ \* sinP/);
    const uses = (SRC.match(/EchoModel\.headRelative\(\(/g) || []).length;
    expect(uses).toBeGreaterThanOrEqual(5); // moving things, drip, fountain, two kinds of landmark
    expect(SRC).toContain('var pingPan = EchoModel.stereoPan(o.x - player.x, o.y - player.y, player.angle);');
  });

  it('the left arrow turns left', () => {
    expect(M.turnDelta(true, false, 2, 0.5)).toBeCloseTo(-1, 12);
    expect(M.turnDelta(false, true, 2, 0.5)).toBeCloseTo(1, 12);
    expect(M.turnDelta(true, true, 2, 0.5)).toBe(0);
    expect(M.turnDelta(false, false, 2, 0.5)).toBe(0);
    // facing north, a quarter turn to the left faces west; what was ahead is now on the right
    const a = NORTH + M.turnDelta(true, false, Math.PI / 2, 1);
    expect(Math.cos(a)).toBeCloseTo(-1, 9); expect(Math.sin(a)).toBeCloseTo(0, 9);
    expect(M.bearingDeg(0, -100, a)).toBeCloseTo(90, 6);
    expect(M.compass8(NORTH)).toBe(0); expect(M.compass8(EAST)).toBe(2); expect(M.compass8(SOUTH)).toBe(4); expect(M.compass8(WEST)).toBe(6);
    expect(M.compass8(a)).toBe(6);
    // the 3D loop and the mouse use it
    expect(SRC).toContain("yawRef.current += EchoModel.turnDelta(keys['ArrowLeft'], keys['ArrowRight'], turnSpeed, dt);");
    expect(SRC).toContain('yawRef.current += e.movementX * sensitivity;');
    expect(SRC).not.toMatch(/if \(keys\['ArrowLeft'\]\) yawRef\.current \+= turnSpeed \* dt/);
  });

  it('a multi-bounce echo is heard from the surface it comes home from', () => {
    expect(SRC).toContain('var bP = binPannerFor(ra);');
    expect(SRC).not.toContain('binPannerFor(bounceAngle)');
  });
});

describe('Echo Navigator model on the real first room', () => {
  const room = M && M.world.generateEnvironment('simple_room', 42);
  const START = { x: 400, y: 700 };

  it('the start pose faces the pillar: 16 m, 93 ms', () => {
    const hit = M.castRay(room, null, START.x, START.y, NORTH, true);
    expect(hit.px).toBeCloseTo(320, 6);
    expect(hit.mat).toBe('concrete');
    expect(hit.key).toBe('o0');
    expect(Math.round(M.metersFromPx(hit.px) * 10) / 10).toBe(16);
    expect(Math.round(M.delaySecFromPx(hit.px) * 1000)).toBe(93);
  });

  it('walking closer shortens the wait (what the first-room steps teach)', () => {
    const far = M.fanSummary(M.castFan(room, [], START.x, START.y, NORTH)).ahead;
    const near = M.fanSummary(M.castFan(room, [], START.x, START.y - 150, NORTH)).ahead;
    expect(near.ms).toBeLessThan(far.ms - 15);
    expect(near.gain).toBeGreaterThan(far.gain);
    expect(near.px).toBeLessThan(far.px - 100);
  });

  it('the read-out is a caption of the rays that were played', () => {
    const hits = M.castFan(room, [], START.x, START.y, NORTH);
    expect(hits.length).toBe(M.RAYS);
    expect(hits[0].rel).toBeCloseTo(-M.FAN / 2, 9);
    expect(hits[hits.length - 1].rel).toBeCloseTo(M.FAN / 2, 9);
    const sum = M.fanSummary(hits);
    for (const side of ['left', 'ahead', 'right']) {
      const inSide = hits.filter((h) => h.px < M.RANGE_PX && (side === 'left' ? h.rel < -M.FAN / 6 : side === 'right' ? h.rel > M.FAN / 6 : Math.abs(h.rel) <= M.FAN / 6));
      if (!inSide.length) { expect(sum[side]).toBeNull(); continue; }
      const nearest = Math.min(...inSide.map((h) => h.px));
      expect(sum[side].px).toBeCloseTo(nearest, 9);
      expect(sum[side].ms).toBe(Math.round(M.delaySecFromPx(nearest) * 1000));
      expect(['strong', 'medium', 'faint']).toContain(sum[side].strength);
    }
    // facing a far corner there may be no echo on a side; a wall right beside you is strong
    const beside = M.fanSummary(M.castFan(room, [], 60, 400, WEST)).ahead;
    expect(beside.strength).toBe('strong');
  });

  it('Echo Vision lights the surfaces a click touched, including far ones', () => {
    const hits = M.castFan(room, [], START.x, START.y, NORTH);
    const lit = M.surfacesHit(hits, START.x, START.y);
    const keys = lit.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('o0');                                  // the pillar, 16 m away
    expect(lit.some((s) => s.px > 114)).toBe(true);                // the old pulse died at 114 map units
    for (let i = 1; i < lit.length; i++) expect(lit[i].px).toBeGreaterThanOrEqual(lit[i - 1].px);
    for (const s of lit) {
      expect(M.glowFor(s.gain)).toBeGreaterThanOrEqual(0.75);
      expect(M.glowFor(s.gain)).toBeLessThanOrEqual(1);
      // the touch point is on the ray, at the hit distance
      expect(Math.hypot(s.x - START.x, s.y - START.y)).toBeCloseTo(s.px, 6);
    }
    // nothing behind the player is lit: the click spreads ahead only
    expect(keys).not.toContain('w2');                              // the south wall
    // the ring is in slow motion by a fixed, stated factor
    expect(M.RING_SLOWDOWN).toBe(40);
    expect(M.SPEED_OF_SOUND / (M.ringRadiusPx(1) * M.M_PER_PX)).toBeCloseTo(M.RING_SLOWDOWN, 9);
    // the 3D loop lights from these hits, not from the distance to a mesh centre
    expect(SRC).toContain('if (ph.lit || !(etReduced || pulseRadiusPx >= ph.px)) continue;');
    expect(SRC).not.toMatch(/Math\.abs\(mDist - pulseRadiusPx\) < band/);
  });

  it('the corner map shows only what clicks have touched, and nothing in Audio Only', () => {
    expect(M.mapMode('audio', true)).toBe('none');
    expect(M.mapMode('audio', false)).toBe('none');
    expect(M.mapMode('echo', true)).toBe('sonar');
    expect(M.mapMode('echo', false)).toBe('none');
    expect(M.mapMode('reveal', true)).toBe('full');
    expect(M.mapMode('reveal', false)).toBe('full');
    const seen = []; for (let i = 0; i < 40; i++) { seen[i] = []; for (let j = 0; j < 40; j++) seen[i][j] = 0; }
    const keys = {};
    // before any click nothing is known, the beacon included
    const goal = room.objects.find((o) => o.isGoal);
    expect(M.isSeen(seen, goal.x, goal.y)).toBe(false);
    expect(M.isSeen(seen, 400, 350)).toBe(false);
    M.markSeen(seen, M.castFan(room, [], START.x, START.y, SOUTH), START.x, START.y, keys);
    // facing south: the wall behind the start spot is touched, the pillar to the north is not
    expect(M.isSeen(seen, 400, 780)).toBe(true);
    expect(keys.o0).toBeUndefined();
    expect(M.isSeen(seen, 400, 20)).toBe(false);
    M.markSeen(seen, M.castFan(room, [], START.x, START.y, NORTH), START.x, START.y, keys);
    expect(keys.o0).toBe(true);
    // the drawing code asks the model
    expect(SRC).toContain('var mapMode = EchoModel.mapMode(currentViewMode2d, isMinimap);');
    expect(SRC).not.toMatch(/var showMap = isMinimap \|\| currentViewMode2d === 'reveal'/);
    expect(SRC).toContain("if (!fullMap && !seenKeys2d['o' + oIdx2d]) return;");
  });
});

describe('Echo Navigator distance challenge: listen, guess, then see the working', () => {
  const room = M && M.world.generateEnvironment('simple_room', 42);

  it('the true distance is always one of four choices, at every rank', () => {
    const ranks = [0, 0, 0, 0];
    let poses = 0;
    for (let x = 60; x <= 740; x += 40) for (let y = 60; y <= 740; y += 40) for (let k = 0; k < 8; k++) {
      if (!M.world.canMoveTo(x, y, room)) continue;
      const hit = M.castRay(room, null, x, y, k * Math.PI / 4, true);
      if (!(hit.px < M.RANGE_PX)) continue;
      const actual = Math.round(M.metersFromPx(hit.px) * 10) / 10;
      if (M.delaySec(actual) * 1000 < M.FUSE_MS) continue;       // too close: the tool asks the student to step back
      const rank = poses % 4; poses++;
      const choices = M.distanceChoices(actual, rank);
      expect(choices.length).toBe(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices[rank]).toBe(actual);
      expect(choices.filter((c) => M.judgeDistance(actual, c).correct).length).toBe(1);
      for (let i = 1; i < 4; i++) expect(choices[i] / choices[i - 1]).toBeGreaterThan(1.8);
      ranks[rank]++;
    }
    expect(poses).toBeGreaterThan(1000);
    for (const n of ranks) expect(n).toBeGreaterThan(poses / 5);  // every position is used
    // the start pose (16 m): the right answer can sit at either end of the ladder
    expect(M.distanceChoices(16, 0)).toEqual([16, 32, 64, 128]);
    expect(M.distanceChoices(16, 3)).toEqual([2, 4, 8, 16]);
  });

  it('names the mistake', () => {
    expect(M.judgeDistance(32, 32).kind).toBe('right');
    expect(M.judgeDistance(32, 64).kind).toBe('roundTrip');       // the whole trip, not half of it
    expect(M.judgeDistance(32, 128).kind).toBe('tooFar');
    expect(M.judgeDistance(32, 16).kind).toBe('tooNear');
    const v = M.judgeDistance(32, 16);
    expect(v.actualMs).toBe(187); expect(v.guessMs).toBe(93);
    expect(v.guessMs).toBeLessThan(v.actualMs);                   // "would answer sooner" is true
    expect(M.judgeDistance(32, 128).guessMs).toBeGreaterThan(187);
  });

  it('the working shown after the guess reproduces the answer from its own numbers', () => {
    // "343 x sec / 2 = actual": sec is the delay printed to 0.1 ms.
    // from the closest a challenge can be (0.9 m: the echo must not fuse with the click) to the 25 m echo range
    for (let tenths = 9; tenths <= 250; tenths++) {
      const actual = tenths / 10;
      const msShown = Math.round(M.delaySec(actual) * 10000) / 10;
      const back = Math.round((M.SPEED_OF_SOUND * (msShown / 1000) / 2) * 10) / 10;
      expect(back, actual + ' m').toBe(actual);
    }
    expect(SRC).toContain("var msShown = Math.round(EchoModel.delaySec(actual) * 10000) / 10;");
  });

  it('scores a target once, so XP cannot be farmed from one spot', () => {
    expect(M.targetKey(400, 700, NORTH)).toBe(M.targetKey(404, 697, NORTH + 0.05));
    expect(M.targetKey(400, 700, NORTH)).not.toBe(M.targetKey(400, 700, NORTH + Math.PI / 4));
    expect(M.targetKey(400, 700, NORTH)).not.toBe(M.targetKey(440, 700, NORTH));
    expect(SRC).toContain("if (isRight && isNew && awardXP) awardXP('echoTrainer', 5,");
    expect(SRC).toContain("if (correct && mqNew && awardXP) awardXP('echoTrainer', 5,");
    expect(SRC).not.toMatch(/if \(pct < 15 && awardXP\)/);
    expect(SRC).not.toMatch(/if \(correct && awardXP\)/);
  });
});

describe('Echo Navigator: wins and the path between them', () => {
  it('an audio win needs the whole run in Audio Only', () => {
    expect(M.winMode('audio', 0, false)).toBe('audio');
    expect(M.winMode('audio', undefined, undefined)).toBe('audio');
    expect(M.winMode('audio', 3, false)).toBe('echo');     // mapped the room with the picture on first
    expect(M.winMode('audio', 0, true)).toBe('reveal');    // looked at the whole room first
    expect(M.winMode('echo', 5, false)).toBe('echo');
    expect(M.winMode('echo', 5, true)).toBe('reveal');
    expect(M.winMode('reveal', 0, false)).toBe('reveal');
    expect(SRC).toContain('var winMode = EchoModel.winMode(currentViewMode, d.sightClicks, d.hasRevealed);');
    expect(SRC).not.toMatch(/var isAudioOnly = \(currentViewMode === 'audio'\);/);
  });

  it('the next step rises: first beacon, then by ear, then new places', () => {
    expect(M.nextStep({}).id).toBe('first_goal');
    expect(M.nextStep({ goalsFound: 1 }).id).toBe('try_audio');
    expect(M.nextStep({ goalsFound: 1, blindWins: 1 })).toEqual({ id: 'unlock', env: 'forest', more: 1 });
    expect(M.nextStep({ goalsFound: 3, blindWins: 1 })).toEqual({ id: 'unlock', env: 'grocery', more: 2 });
    expect(M.nextStep({ goalsFound: 7, blindWins: 2 })).toEqual({ id: 'unlock', env: 'challenge', more: 1 });
    expect(M.nextStep({ goalsFound: 8, blindWins: 2 }).id).toBe('bat_master');
    expect(M.nextStep({ goalsFound: 9, blindWins: 2, batMasterWin: true }).id).toBe('all_done');
    expect(M.nextStep({ goalsFound: 'x', blindWins: null }).id).toBe('first_goal');
  });

  it('beacon closeness is put into words as well as beeps', () => {
    expect(M.beaconZone(250)).toBe('none');
    expect(M.beaconZone(199)).toBe('far');
    expect(M.beaconZone(119)).toBe('near');
    expect(M.beaconZone(59)).toBe('veryNear');
  });

  it('settings read inside the 3D loop are live, and a view change does not rebuild the scene', () => {
    expect(SRC).toContain('if (d.waypointMode && WAYPOINT_ROUTES[envType] && !goalFoundRef.current) {');
    expect(SRC).not.toMatch(/if \(waypointMode && WAYPOINT_ROUTES\[envType\] && !goalFoundRef\.current\)/);
    expect(SRC).toContain('if (multiBounceNow && minDist < 400) {');
    const deps = SRC.match(/\}, \[seed, envType, has3D,[^\]]*\]\);/g) || [];
    expect(deps.length).toBe(2);
    expect(deps[0]).toBe('}, [seed, envType, has3D, diffId, isContrast]);');
  });
});

describe('Echo Navigator first screen (server render of the real tool)', () => {
  function render(state, extra) {
    const cfg = box.StemLab._registry.echoTrainer;
    const ctx = Object.assign({
      React, toolData: { echoTrainer: state || {} },
      update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {},
      t: (k, fb) => (fb != null ? fb : k), icons: {}, isDark: false, isContrast: false
    }, extra || {});
    return renderToStaticMarkup(React.createElement(function Host() { return cfg.render(ctx); }));
  }
  const order = (html, marks) => marks.map((m) => html.indexOf(m));

  it('puts the goal, the play surface, the actions and the read-out first, and the rest behind one disclosure', () => {
    const html = render({ disclaimerDismissed: true, tutStep: 4 });
    const at = order(html, ['<header', 'data-echotrainer-goal', 'data-echotrainer-play', 'data-echotrainer-actions', 'data-echotrainer-readout', 'data-echotrainer-more']);
    for (const i of at) expect(i).toBeGreaterThan(-1);
    for (let i = 1; i < at.length; i++) expect(at[i], 'order ' + i).toBeGreaterThan(at[i - 1]);
    // exactly one top-level disclosure, closed until asked for
    const more = html.slice(at[5]);
    expect(html.indexOf('<details'), 'the first disclosure on the page is the More one').toBe(html.indexOf('<details data-echotrainer-more'));
    expect(html).not.toMatch(/<details[^>]*data-echotrainer-more[^>]*\sopen/);
    // nothing was removed: every earlier capability is still on the page, inside it
    for (const text of ['Simple Room', 'Cave System', 'Corridor Maze', 'Forest Path', 'Urban Street', 'School Hallway', 'Grocery Store', 'City Park', 'Random Challenge',
      'Explorer', 'Navigator', 'Echolocator', 'Bat Master', 'Material Quiz', 'New Layout', 'Multi-bounce', 'tongue click',
      'Sonar Briefing', 'Performance Stats', 'Who Is This For', 'How Echolocation Works', 'How Materials Sound', 'Echo timing discovery', 'Play this echo', 'Stuck']) {
      expect(more, text).toContain(text);
    }
    expect(html).toContain('Do not rely on simulation experience for real-world navigation');
    expect(render({ disclaimerDismissed: true, tutStep: 4, moreOpen: true })).toMatch(/<details[^>]*\sopen/);
  });

  it('holds play behind the safety notice, then folds it to one line', () => {
    const before = render({});
    expect(before).toContain('data-echotrainer-safety="true"');
    expect(before).toContain('role="alert"');
    expect(before).toContain('It does NOT replace training with a qualified Orientation &amp; Mobility (O&amp;M) specialist.');
    expect(before).toContain('I Understand');
    expect(before).not.toContain('data-echotrainer-safety-chip');
    expect(before).toMatch(/<button[^>]*data-echotrainer-click="true"[^>]*disabled/);
    const after = render({ disclaimerDismissed: true });
    expect(after).not.toContain('data-echotrainer-safety="true"');
    expect(after).toContain('data-echotrainer-safety-chip');
    expect(after).not.toMatch(/<button[^>]*data-echotrainer-click="true"[^>]*disabled/);
    // while the notice is up, nothing underneath it can take focus (Tab must not land behind it)
    expect(before).toMatch(/<div inert=""[^>]*><canvas/);
    expect(after).not.toContain('inert=');
    box.THREE = {};
    expect(render({})).toMatch(/data-allo-fs-stage="true" inert=""/);
    expect(render({ disclaimerDismissed: true })).not.toContain('inert=');
    delete box.THREE;
    // and it can be read again
    expect(render({ disclaimerDismissed: true, safetyOpen: true })).toContain('data-echotrainer-safety="true"');
  });

  it('gives a way to move and click without a keyboard, each with a name', () => {
    const html = render({ disclaimerDismissed: true });
    for (const name of ['Turn left (hold)', 'Walk forward (hold)', 'Turn right (hold)', 'Walk backward (hold)', 'Send a click', 'Read the last echo aloud']) {
      expect(html).toContain('aria-label="' + name + '"');
    }
    expect((html.match(/data-echotrainer-pad=/g) || []).length).toBe(6);
  });

  it('shows the echo as words and numbers in Echo Vision, and withholds them in Audio Only and during a guess', () => {
    const echo = { left: { px: 410, ms: 239, gain: 0.09, strength: 'faint' }, ahead: { px: 320, ms: 187, gain: 0.11, strength: 'medium' }, right: null, a: -1.57, t: 1 };
    const shown = render({ disclaimerDismissed: true, tutStep: 4, lastEcho: echo });
    expect(shown).toContain('data-echotrainer-readout="shown"');
    expect(shown).toContain('Ahead: echo after 187 ms, medium. Left: echo after 239 ms, faint. Right: no echo.');
    expect(shown).toContain('A longer wait means the surface is farther away.');
    // with three.js present the 3D stage (and its corner map) is what renders
    box.THREE = {};
    const audio = render({ disclaimerDismissed: true, tutStep: 4, lastEcho: echo, viewMode: 'audio' });
    delete box.THREE;
    expect(audio).toContain('data-echotrainer-readout="hidden"');
    expect(audio).not.toContain('187 ms');
    expect(audio).toContain('Audio Only: map off');
    const quiz = render({ disclaimerDismissed: true, tutStep: 4, lastEcho: echo, distChallenge: { active: true, targetDist: 32, targetMat: 'concrete', answer: null, result: null, choices: [16, 32, 64, 128], gain: 0.1, key: 'k' } });
    expect(quiz).toContain('data-echotrainer-readout="hidden"');
    expect(quiz).not.toContain('187 ms');
    // the guess comes first: four choices, the answer not marked, the working not shown yet
    for (const c of ['16 m', '32 m', '64 m', '128 m']) expect(quiz).toContain('>' + c + '<');
    expect(quiz).toContain('Play the echo again');
    expect(quiz).not.toContain('The working:');
    expect(quiz).not.toContain('Actual:');
  });

  it('walks a first-timer through four steps that are finished by doing', () => {
    const s0 = render({ disclaimerDismissed: true });
    expect(s0).toContain('Step 1 of 4');
    expect(s0).toContain('Click and listen');
    const s2 = render({ disclaimerDismissed: true, tutStep: 2, tutFirstMs: 187, tutNowMs: 99 });
    expect(s2).toContain('Turn and listen');
    expect(s2).toContain('Your first wait was 187 ms. Closer up it was 99 ms. A shorter wait means closer.');
    const done = render({ disclaimerDismissed: true, tutStep: 4 });
    expect(done).not.toContain('Step 1 of 4');
    expect(done).toContain('data-echotrainer-coach="first_goal"');
    expect(render({ disclaimerDismissed: true, tutStep: 4, goalsFound: 1 })).toContain('data-echotrainer-coach="try_audio"');
  });

  it('says what a found beacon counted as, and offers the next step', () => {
    const html = render({ disclaimerDismissed: true, tutStep: 4, goalsFound: 1, goalFoundThisRun: true,
      runHistory: [{ env: 'simple_room', mode: 'Echo Vision', win: 'echo', difficulty: 'Navigator', time: 41, clicks: 9, bumps: 0, xp: 20 }] });
    expect(html).toContain('data-echotrainer-success="true"');
    expect(html).toContain('Beacon found!');
    expect(html).toContain('Time: 41 seconds. Clicks: 9. Bumps: 0. Counted as Echo Vision: 20 XP.');
    expect(html).toContain('New place open: Cave System, Corridor Maze.');
    expect(html).toContain('Next place: Cave System');
    expect(html).toContain('New layout, same place');
  });

  it('shows the tests a student logs in the Echo timing panel', () => {
    const html = render({ disclaimerDismissed: true, tutStep: 4, _echoHunt: { distance: 12, speed: 343, surface: 90, log: [{ d: 2, s: 343, sr: 85, ms: '11.7', st: 'tooFast' }, { d: 48, s: 343, sr: 75, ms: '279.9', st: 'reverb' }] } });
    expect(html).toContain('data-echotrainer-iq-log="true"');
    expect(html).toContain('Your logged tests');
    expect(html).toContain('>11.7<');
    expect(html).toContain('>279.9<');
  });

  it('renders in dark and in high contrast without throwing', () => {
    expect(render({ disclaimerDismissed: true }, { isDark: true })).toContain('data-echotrainer-theme="dark"');
    expect(render({}, { isContrast: true })).toContain('data-echotrainer-theme="contrast"');
  });
});
