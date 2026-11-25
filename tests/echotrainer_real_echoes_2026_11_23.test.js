import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Echo Navigator, 2026-11-23 "make it accurate" pass. Three things changed, each from a source:
//   1. Echo timing: an echo fuses with the click under about 5 ms (Brown, Stecker & Tollin 2015,
//      PMC4310855: "echo thresholds on the order of 5-6 ms" for lead-lag transients), not 30 ms;
//      and listeners detect a reflecting object best within 2 m (Schenkman & Nilsson 2010).
//   2. Materials: each surface sends back (1 - absorption) of the energy, from Hall's absorption
//      table (HyperPhysics revmod.html) at 1 kHz. Hard surfaces all send back 90% or more, so the
//      material quiz now asks the hearable question, hard or soft, and the rooms got curtains.
//   3. Scale: the sound used 1 map unit = 0.1 m while the 3D picture used 0.05 m. Both are 0.05 m now.
// Run with ECHO_TOOL_FILE=<copy> to see which of these fail on an older copy.

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const { renderToStaticMarkup } = require(resolve(MODULES_DIR, 'react-dom/server'));

const FILE = process.env.ECHO_TOOL_FILE || 'stem_lab/stem_tool_echotrainer.js';
const SRC = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const box = { console }; box.window = box;
vm.runInNewContext(SRC, box);
const M = box.__alloEchoNavModel;
const ENVS = ['simple_room', 'cave', 'corridor', 'forest', 'urban', 'school', 'grocery', 'park', 'challenge'];

function render(state) {
  const cfg = box.StemLab._registry.echoTrainer;
  const ctx = { React, toolData: { echoTrainer: state || {} }, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {},
    t: (k, fb) => (fb != null ? fb : k), icons: {}, isDark: false, isContrast: false };
  return renderToStaticMarkup(React.createElement(function Host() { return cfg.render(ctx); }));
}

describe('echo timing follows the research', () => {
  it('fuses under 5 ms, is "close" up to 2 m, separate beyond', () => {
    expect(M.FUSE_MS).toBe(5);
    expect(M.NEAR_M).toBe(2);
    expect(M.NEAR_MS).toBeCloseTo((2 * 2 / 343) * 1000, 9);
    expect(M.timingState(M.delaySec(0.5) * 1000)).toBe('tooFast');   // 2.9 ms
    expect(M.timingState(M.delaySec(1) * 1000)).toBe('crisp');       // 5.8 ms
    expect(M.timingState(M.delaySec(2) * 1000)).toBe('crisp');       // 11.7 ms
    expect(M.timingState(M.delaySec(2.1) * 1000)).toBe('distinct');
    expect(M.timingState(M.delaySec(48) * 1000)).toBe('distinct');
  });

  it('the Echo timing panel says what the research says, not "easiest range in this sim"', () => {
    const at = (distance) => render({ disclaimerDismissed: true, tutStep: 4, _echoHunt: { distance, speed: 343, surface: 98 } });
    expect(at(0.5)).toContain('Blends into the click');
    expect(at(0.5)).toContain('its pitch and loudness change');
    expect(at(2)).toContain('Close echo (2 m or nearer)');
    expect(at(2)).toContain('2 m away or closer');
    expect(at(12)).toContain('Separate echo');
    expect(SRC).not.toContain('easiest range');
    expect(SRC).not.toContain('Too fast (no echo detect)');
    // a preset for each state, and the soft one uses the curtain's real share
    expect(SRC).toContain("{ id: 'touch', lbl: t('stem.echotrainer.preset_touch', 'Very close wall (0.5m)'), d: 0.5, s: 343, sr: 98 }");
    expect(SRC).toContain("{ id: 'curtain', lbl: t('stem.echotrainer.preset_curtain', 'Curtain (2m)'), d: 2, s: 343, sr: 30 }");
    expect(SRC).not.toContain('Faint Glass');
  });

  it('every distance challenge in all nine places stays solvable, and only a hugged wall is "too close"', () => {
    for (const env of ENVS) {
      const room = M.world.generateEnvironment(env, 42);
      let poses = 0, blocked = 0;
      for (let x = 40; x <= 760; x += 40) for (let y = 40; y <= 760; y += 40) for (let k = 0; k < 8; k++) {
        if (!M.world.canMoveTo(x, y, room)) continue;
        const hit = M.castRay(room, null, x, y, k * Math.PI / 4, true);
        if (!(hit.px < M.RANGE_PX)) continue;
        const actual = Math.round(M.metersFromPx(hit.px) * 10) / 10;
        if (M.delaySec(actual) * 1000 < M.FUSE_MS) { blocked++; expect(actual).toBeLessThan(0.9); continue; }
        poses++;
        const c = M.distanceChoices(actual, poses % 4);
        expect(c[poses % 4]).toBe(actual);
        expect(c.filter((v) => M.judgeDistance(actual, v).correct).length).toBe(1);
      }
      expect(poses, env).toBeGreaterThan(200);
      expect(blocked, env).toBeLessThan(poses / 20);
    }
    // close up, the ladder stays one doubling apart (rounding to 0.1 m made 0.1, 0.3, 0.5, 1)
    expect(M.distanceChoices(1, 3)).toEqual([0.13, 0.25, 0.5, 1]);
    expect(M.distanceChoices(0.9, 0)).toEqual([0.9, 1.8, 3.6, 7.2]);
  });
});

describe('materials come from an absorption table', () => {
  it('holds Hall\'s 250 Hz / 1 kHz / 4 kHz coefficients', () => {
    const T = M.MATERIALS;
    expect(T.concrete).toEqual([0.01, 0.02, 0.03]);   // poured concrete
    expect(T.glass).toEqual([0.2, 0.1, 0.04]);        // ordinary window glass
    expect(T.wood).toEqual([0.3, 0.1, 0.1]);          // plywood sheet on studs
    expect(T.curtain).toEqual([0.3, 0.7, 0.6]);       // medium velour draperies
    expect(T.rock).toEqual([0.03, 0.04, 0.07]);       // no rock row: brick
    expect(T.metal).toEqual(T.concrete);              // no metal row: poured concrete
    expect(T.flesh).toEqual([0.4, 0.7, 0.7]);         // wooden pews, occupied
    expect(M.reflectPct('concrete')).toBe(98);
    expect(M.reflectPct('glass')).toBe(90);
    expect(M.reflectPct('curtain')).toBe(30);
    expect(M.absorbPct('curtain')).toBe(70);
  });

  it('every surface and moving thing in every place uses that table (urban glass used a second random number)', () => {
    for (const env of ENVS) for (const seed of [1, 42, 777]) {
      const room = M.world.generateEnvironment(env, seed);
      for (const s of room.walls.concat(room.objects)) expect(s.ref, env + ' ' + s.mat).toBe(M.matRef(s.mat));
      for (const a of M.world.generateAgents(env, seed, room)) expect(a.ref, env + ' ' + a.kind).toBe(M.matRef(a.mat));
    }
    expect(SRC).not.toMatch(/ref: rng\(\) > 0\.5 \? 0\.3 : 0\.92/);
  });

  it('hard surfaces sound almost alike; a curtain is much quieter and duller', () => {
    for (const m of ['concrete', 'rock', 'metal', 'glass', 'wood']) {
      expect(M.soundGroup(m), m).toBe('hard');
      const t = M.echoTilt(m);
      expect(Math.abs(t.lowDb), m).toBeLessThan(1.2);
      expect(Math.abs(t.highDb), m).toBeLessThan(1.2);
    }
    expect(M.soundGroup('curtain')).toBe('soft');
    expect(M.soundGroup('flesh')).toBe('soft');
    const c = M.echoTilt('curtain');
    expect(c.lowDb - c.highDb).toBeGreaterThan(2);    // highs fall away against the lows
    const ratioDb = 20 * Math.log10(M.gainFromMeters(3, M.matRef('curtain')) / M.gainFromMeters(3, M.matRef('concrete')));
    expect(ratioDb).toBeCloseTo(10 * Math.log10(0.3 / 0.98), 6);   // about -5.1 dB at the same distance
  });

  it('the room plays that timbre: shelf filters from echoTilt, no made-up low-pass per material', () => {
    const emitAt = SRC.indexOf('function emitClick()');
    const emit = SRC.slice(emitAt, SRC.indexOf('// ── Distance estimation challenge ──', emitAt));
    expect(emit).toContain('var tilt = EchoModel.echoTilt(hitMat);');
    expect(emit).toContain('filter.gain.value = tilt.lowDb;');
    expect(emit).toContain('filterHi.gain.value = tilt.highDb;');
    expect(emit).not.toMatch(/var filterHz = hitMat === 'metal'/);
    expect(emit).toContain('Math.sqrt(hitRef * bRef2 * hitRef)');
    expect(SRC).toContain('function playSingleEcho(meters, speed, gainAmt, mat, startAt) {');
  });

  it('the Materials panel teaches the real numbers and no longer says the sim turns surfaces down', () => {
    const html = render({ disclaimerDismissed: true, tutStep: 4 });
    expect(html).toContain('Poured concrete soaks up about 2% of the sound at 1,000 Hz, so about 98% comes back.');
    expect(html).toContain('A heavy velour curtain soaks up about 70% at 1,000 Hz, so only about 30% comes back');
    expect(html).toContain('Hall, Musical Acoustics');
    expect(SRC).not.toMatch(/this sim sends back about/);
    expect(SRC).not.toContain('deceptively quiet');
  });
});

describe('material quiz: hard or soft', () => {
  it('two choices in both orders, judged by the surface\'s group', () => {
    expect(M.materialChoices(0.1)).toEqual(['hard', 'soft']);
    expect(M.materialChoices(0.9)).toEqual(['soft', 'hard']);
    expect(SRC).toContain('var options = EchoModel.materialChoices(Math.random());');
    expect(SRC).toContain("var correct = byGroup ? opt === EchoModel.soundGroup(matQuiz.correctMat) : opt === matQuiz.correctMat;");
  });

  it('both answers occur: the first room and the school have curtains', () => {
    for (const env of ['simple_room', 'school']) {
      const room = M.world.generateEnvironment(env, 42);
      let hard = 0, soft = 0;
      for (let x = 40; x <= 760; x += 20) for (let y = 40; y <= 760; y += 20) for (let k = 0; k < 8; k++) {
        if (!M.world.canMoveTo(x, y, room)) continue;
        const hit = M.castRay(room, null, x, y, k * Math.PI / 4, true);
        if (hit.px < 400 && hit.mat) { if (M.soundGroup(hit.mat) === 'soft') soft++; else hard++; }
      }
      expect(hard, env).toBeGreaterThan(0);
      expect(soft, env).toBeGreaterThan(100);
    }
  });

  it('asks first, then explains with the table\'s numbers', () => {
    const q = render({ disclaimerDismissed: true, tutStep: 4, matQuiz: { active: true, correctMat: 'curtain', options: ['soft', 'hard'], answer: null, result: null, key: 'k', dist: 2, gain: 0.49 } });
    expect(q).toContain('data-echotrainer-mat-choice="soft"');
    expect(q).toContain('data-echotrainer-mat-choice="hard"');
    expect(q).toContain('Play the echo again');
    const qa = q.indexOf('aria-label="Material identification quiz"');
    const quizBox = q.slice(qa, q.lastIndexOf('data-echotrainer-mat-choice') + 600);
    expect(qa).toBeGreaterThan(-1);
    expect(quizBox.toLowerCase()).not.toContain('curtain');   // the answer is not on screen before the guess
    expect(SRC).toContain("'Right: soft. It was {material}, {m} m away. It soaks up about {abs}% of the sound at 1,000 Hz, so only about {ref}% comes back.");
    expect(SRC).toContain("'Not quite: it was hard ({material}, {m} m away). Hard surfaces send back almost all of the sound. A far wall can sound quiet, but that is the distance, not softness.");
    const r = render({ disclaimerDismissed: true, tutStep: 4, matQuiz: { active: true, correctMat: 'curtain', options: ['soft', 'hard'], answer: 'soft', ok: true, result: 'x', dist: 2 } });
    expect(r).toContain('data-echotrainer-mat-result="right"');
    expect(r).toContain('Compare at 2 m: hard, then soft');
  });
});

describe('the sound and the picture use one scale', () => {
  it('1 map unit = 0.05 m for both', () => {
    expect(M.M_PER_PX).toBe(0.05);
    expect(SRC).toContain('var SCALE = 0.05;');
    // walking 15 ms closer is the same 2.5 m walk the first-room step always asked for
    expect(SRC).toContain('le.ahead.ms <= d.tutFirstMs - 15)');
    // the read-out axis fits the longest echo the room returns (25 m = 146 ms)
    expect(M.delaySecFromPx(M.RANGE_PX) * 1000).toBeLessThan(150);
    expect(SRC).toContain('var laneX = function(ms) { return 64 + (Math.min(150, Math.max(0, ms)) / 150) * 280; };');
  });
});
