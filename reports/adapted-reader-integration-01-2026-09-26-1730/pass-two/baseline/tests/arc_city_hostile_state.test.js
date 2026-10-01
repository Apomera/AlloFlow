// Arc City — a malformed saved project must not break the board.
//
// A saved project is INPUT: a student can save it, copy it, hand-edit it, or carry it
// across tool versions. The lab-wide hostile-toolData sweep (2026-09-07) probed tools
// that read `d.<key>` and found 6 of 143 crash — but Arc City keeps its whole state
// under ONE nested object (`toolData._arccity`), so that sweep could only throw junk
// at the outer key, which migrateArcState already rejects. The fields INSIDE it,
// including several added in the 09-07 pass (city3d, battle3d, calm, view, battle),
// had never been fed junk.
//
// Arc City wraps its render in try/catch and shows "Arc City could not render" instead
// of throwing, so a crash does not blank the whole lab — but it still leaves the
// student with no board. That fallback text is the detector here.
//
// The sweep note's hard-won rule: calibrate the detector against a known failure
// EVERY time, or a green run may mean the instrument tested nothing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;
const FALLBACK = /Arc City could not render/;

// Every hostile shape the sweep used, plus a few this tool's arithmetic invites.
const JUNK = ['abc', 9999, -1, 0, null, undefined, [], {}, true, NaN, 1e308, '', { nested: 'abc' }, [1, 2, 3]];

function good() {
  return {
    schemaVersion: 2, levelId: 'L3', fired: true, tier: 'practice', badges: ['first-light'], view: 'play',
    byLevel: { L1: { solved: true, independent: true, shots: 2, misses: 0 }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 3 }, shots: 1, misses: 1, lastShot: { a: -0.4, h: 4, k: 3 }, prevShot: { a: -0.3, h: 4, k: 2 } } },
    battle: arc.createBattleState('cpu'), battle3d: false, city3d: true, calm: false, muted: true, keysOpen: false, exportEnabled: false,
    gauntlet: { order: ['L1', 'L3'], idx: 0 }, touch: { names: ['h'], n: 1 }, introSeen: true
  };
}

function survives(state, label) {
  let r;
  try { r = render(state); } catch (e) {
    // The harness itself threw (outside the tool's try/catch) — that IS a crash.
    throw new Error(label + ': render threw ' + (e && e.message));
  }
  expect(r.text, label).not.toMatch(FALLBACK);
  return r;
}

describe('Arc City — hostile saved state', () => {
  it('CALIBRATION: the detector sees a real render failure', () => {
    // Every hostile shape found while writing this file has since been fixed, so no
    // saved-state shape is KNOWN to reach the fallback any more. Calibrate the
    // detector by forcing a throw inside the render instead: a createElement that
    // fails on the board's <svg> must surface as the fallback text. If it does not,
    // every green assertion below is meaningless.
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js'), 'utf8');
    const captured = {};
    const saved = window.StemLab;
    window.StemLab = { registerTool: (id, cfg) => { captured.cfg = cfg; } };
    try { new Function(src)(); } finally { window.StemLab = saved; }
    const throwingH = (type, props, ...children) => {
      if (type === 'svg') throw new Error('calibration throw');
      return { type, props: props || {}, children };
    };
    const ctx = { React: { createElement: throwingH }, toolData: { _arccity: good() }, setToolData() {}, t: (k, d) => d, announceToSR() {}, icons: {} };
    const tree = captured.cfg.render(ctx);
    const txt = [];
    (function w(n) { if (n == null || n === false || n === true) return; if (typeof n === 'string' || typeof n === 'number') { txt.push(String(n)); return; } if (Array.isArray(n)) { n.forEach(w); return; } if (n.children) n.children.forEach(w); })(tree);
    expect(txt.join(' '), 'the fallback must be what a render failure looks like').toMatch(FALLBACK);
  });

  it('the exact shapes that used to hang or crash the LIVE tool now render', () => {
    // b < 0 on a sine level made the crest-handle walk loop forever — an infinite
    // loop in render is the one failure try/catch cannot catch; it froze the whole
    // lab tab. And a trails array of non-objects crashed the battle board. Both are
    // reachable only from a hand-edited or corrupted save, which is precisely the
    // input class this file exists for.
    const solved = { L1: { solved: true, independent: true }, L3: { solved: true, independent: true }, L4: { solved: true, independent: true } };
    for (const b of [-1, -0.5, 9999, 1e308, NaN, 0]) {
      const s = Object.assign(good(), { levelId: 'L5', fired: false, byLevel: Object.assign({}, solved, { L5: { params: { a: 2.5, b, c: 1, k: 4 } } }) });
      survives(s, 'L5 sine with b = ' + b);
    }
    const s = good(); s.view = 'battle'; s.battle = Object.assign({}, arc.createBattleState('cpu'), { trails: [1, 2, 3] });
    survives(s, 'battle.trails = [1,2,3]');
    // A trail RECORD with no lane/seat/samples — the very shape arc_city_battle's
    // normalisation test seeds — must render too, not just normalise. The crash was
    // never the missing samples (every consumer guards those); it was the missing
    // lane reaching the lane-colour lookup.
    const s2 = good(); s2.view = 'battle'; s2.battle = Object.assign({}, arc.createBattleState('cpu'), { trails: [{ id: 't0' }, { id: 't1', lane: 99 }, { id: 't2', lane: 'abc', seat: 'x' }] });
    survives(s2, 'battle.trails = records with no/invalid lane');
    // ...and a WON match replays the selected trail, which reads it hardest.
    const s3 = good(); s3.view = 'battle'; s3.battle = Object.assign({}, arc.createBattleState('cpu'), { status: 'won', winner: 0, shields: [[true, true, true], [false, false, false]], trails: [{ id: 't0' }, { lane: 99, seat: 0, samples: 'abc' }] });
    survives(s3, 'won match replaying malformed trails');
  });

  it('a well-formed state renders the board (control)', () => {
    const r = survives(good(), 'control');
    expect(r.find('svg'), 'the board is on screen').not.toBeNull();
  });

  it('junk in every top-level field', () => {
    const keys = Object.keys(good());
    let probes = 0;
    for (const k of keys) {
      for (const j of JUNK) {
        const s = good(); s[k] = j; probes++;
        survives(s, `_arccity.${k} = ${JSON.stringify(j) ?? String(j)}`);
      }
    }
    expect(probes).toBeGreaterThan(150);
  });

  it('junk inside a level record', () => {
    const fields = ['params', 'shots', 'misses', 'solved', 'independent', 'flawless', 'lastShot', 'prevShot', 'hintDismissedAt'];
    for (const f of fields) {
      for (const j of JUNK) {
        const s = good(); s.byLevel.L3[f] = j;
        survives(s, `byLevel.L3.${f} = ${JSON.stringify(j) ?? String(j)}`);
      }
    }
  });

  it('junk inside the current level params, on every family', () => {
    // Each family has its own evaluator; a non-numeric parameter feeds fnY directly.
    const solvedAll = { L1: { solved: true, independent: true }, L3: { solved: true, independent: true }, L4: { solved: true, independent: true }, L5: { solved: true, independent: true }, L7: { solved: true, independent: true }, L8: { solved: true, independent: true }, L9: { solved: true, independent: true } };
    for (const id of ['L1', 'L3', 'L4', 'L5', 'L7', 'L8', 'L9', 'L11', 'L13']) {
      const lvl = arc.levelById(id);
      for (const p of lvl.paramOrder) {
        for (const j of ['abc', null, NaN, 1e308, [], {}]) {
          const params = Object.assign(arc.defaultParams(lvl), { [p]: j });
          const s = Object.assign(good(), { levelId: id, byLevel: Object.assign({}, solvedAll, { [id]: { params } }) });
          survives(s, `${id}.params.${p} = ${JSON.stringify(j) ?? String(j)}`);
          survives(Object.assign(s, { fired: true }), `${id}.params.${p} = ${JSON.stringify(j) ?? String(j)} (fired)`);
        }
      }
    }
  });

  it('junk inside the battle record, on the battle view', () => {
    const fields = ['mode', 'status', 'turn', 'round', 'winner', 'shields', 'trails', 'drafts', 'selectedLane', 'arena', 'assist', 'trailRule', 'cpuLevel', 'handoff', 'log', 'stats', 'replayIndex', 'phaseCharges', 'weapon'];
    for (const f of fields) {
      for (const j of JUNK) {
        const s = good(); s.view = 'battle'; s.battle = Object.assign({}, arc.createBattleState('cpu'), { [f]: j });
        survives(s, `battle.${f} = ${JSON.stringify(j) ?? String(j)}`);
      }
    }
  });

  it('junk on the teacher view and the gauntlet', () => {
    for (const j of JUNK) {
      survives(Object.assign(good(), { view: 'teacher', byLevel: j }), `teacher byLevel = ${JSON.stringify(j) ?? String(j)}`);
      survives(Object.assign(good(), { levelId: 'L10', gauntlet: j }), `gauntlet = ${JSON.stringify(j) ?? String(j)}`);
      survives(Object.assign(good(), { levelId: 'L10', gauntlet: { order: j, idx: 0 } }), `gauntlet.order = ${JSON.stringify(j) ?? String(j)}`);
      survives(Object.assign(good(), { levelId: 'L10', gauntlet: { order: ['L1'], idx: j } }), `gauntlet.idx = ${JSON.stringify(j) ?? String(j)}`);
    }
  });
});
