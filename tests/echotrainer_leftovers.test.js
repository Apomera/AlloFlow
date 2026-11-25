import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

// Echo Navigator, leftovers round (2026-11-23, late). Pins:
//   - the 2D fallback's Echo Vision lit every surface at ring distance, through walls (in School Hallway, 87 of the
//     137 wall points it lit from the start spot sit behind another wall); it now lights the points the click's rays
//     reached, the same rays the sound and the 3D view use
//   - "Find goals in 5 different environments" counted any 5 goals
//   - the material quiz could be answered by glow color
//   - holding a key against a wall added a bump every 0.3 s
//   - the beacon showed on the sonar map at every level (now only Explorer and Navigator)
//   - a saved last echo showed on return; a student's safety acknowledgement lasted forever
//   - the 2D HUD printed the raw id simple_room
// Set ECHO_TOOL_FILE to another copy of the tool to see which of these fail there.

const FILE = process.env.ECHO_TOOL_FILE || 'stem_lab/stem_tool_echotrainer.js';
const SRC = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const box = (() => { const b = { console: { log() {}, warn() {}, error() {} } }; b.window = b; vm.runInNewContext(SRC, b); return b; })();
const M = box.__alloEchoNavModel;
const NORTH = -Math.PI / 2;
const between = (from, to) => { const a = SRC.indexOf(from); const b = SRC.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('anchors missing: ' + from); return SRC.slice(a, b); };

describe('2D Echo Vision lights only what the click can reach', () => {
  it('every lit point is the first thing along its ray, and the old ring rule lit points behind walls', () => {
    expect(typeof M.rayPoints).toBe('function');
    const room = M.world.generateEnvironment('school', 42);
    const px = 400, py = 700;
    const hits = M.castFan(room, [], px, py, NORTH);
    const pts = M.rayPoints(hits, px, py);
    expect(pts.length).toBeGreaterThan(10);
    for (const p of pts) {
      const back = M.castRay(room, [], px, py, Math.atan2(p.y - py, p.x - px), false);
      expect(back.px, p.key).toBeGreaterThan(p.px - 0.5);          // nothing nearer stands in the way
      expect(p.px).toBeLessThan(M.RANGE_PX);
      expect(p.gain).toBeCloseTo(M.gainFromPx(p.px, p.ref), 12);
    }
    // what the old 2D rule lit: wall points at ring distance, wherever they were
    let hidden = 0;
    room.walls.forEach((w) => { for (let k = 0; k <= 6; k++) { const t = k / 6, x = w.x1 + (w.x2 - w.x1) * t, y = w.y1 + (w.y2 - w.y1) * t; const dd = Math.hypot(x - px, y - py); if (dd > M.RANGE_PX || dd < 1) continue; if (M.castRay(room, null, px, py, Math.atan2(y - py, x - px), false).px < dd - 3) hidden++; } });
    expect(hidden).toBeGreaterThan(20);
  });

  it('the 2D view draws from the click\'s ray points, not from distance to the ring', () => {
    expect(SRC).toContain('points: EchoModel.rayPoints(fanHits, player.x, player.y) });');
    const loop2d = between('function loop2d() {', 'loop2d();');
    expect(loop2d).toContain('(pulse.points || []).forEach(function(pt) {');
    expect(loop2d).toContain('if (!(etReduced2d || evRadius >= pt.px)) return;');
    expect(loop2d).not.toMatch(/Math\.abs\(dist2 - evRadius\) < 18/);
    expect(loop2d).not.toMatch(/Math\.abs\(odist - evRadius\) < o\.r \+ 14/);
  });
});

describe('Find goals in 5 different environments counts places', () => {
  const quest = () => box.StemLab._registry.echoTrainer.questHooks.find((q) => q.id === 'find_goal_5');
  it('five goals in one place is one place; five places is the quest', () => {
    const q = quest();
    expect(q.check({ goalsFound: 9, goalEnvs: ['simple_room'] })).toBe(false);
    expect(q.progress({ goalsFound: 9, goalEnvs: ['simple_room'] })).toBe('1/5');
    expect(q.check({ goalsFound: 5, goalEnvs: ['simple_room', 'corridor', 'cave', 'forest', 'school'] })).toBe(true);
    expect(q.progress({ goalEnvs: ['simple_room', 'corridor', 'cave', 'forest', 'school', 'park'] })).toBe('5/5');
    // duplicates and unknown ids do not count
    expect(q.check({ goalEnvs: ['cave', 'cave', 'cave', 'moon', 'simple_room', 'x'] })).toBe(false);
    // older saves: the run list (one row per beacon found) still counts its places
    expect(M.goalEnvList({ runHistory: [{ env: 'cave' }, { env: 'cave' }, { env: 'corridor' }, null, 'junk'] })).toEqual(['cave', 'corridor']);
  });
  it('a found beacon adds its place once, in 3D and in 2D, and the list is saved', () => {
    expect(M.addGoalEnv({ goalEnvs: ['cave'] }, 'cave')).toEqual(['cave']);
    expect(M.addGoalEnv({ goalEnvs: ['cave'] }, 'school')).toEqual(['cave', 'school']);
    expect(M.addGoalEnv({}, 'not_a_place')).toEqual([]);
    expect(SRC).toContain('var updateObj = { goalFoundThisRun: true, goalsFound: newGoals, blindWins: newBlinds, goalEnvs: EchoModel.addGoalEnv(d, envType) };');
    expect(SRC).toContain('goalEnvs: EchoModel.addGoalEnv(d, envType) };');
    expect(SRC.split('EchoModel.addGoalEnv(d, envType)').length - 1).toBe(2);
    expect(SRC).toMatch(/var ECHO_PERSIST_FIELDS = \[[^\]]*'goalEnvs'\]/);
  });
});

describe('the material quiz cannot be read from glow color', () => {
  it('hides hue only while a quiz waits for an answer', () => {
    expect(M.hideMaterialHue(null)).toBe(false);
    expect(M.hideMaterialHue({ active: true, correctMat: 'wood', answer: null, result: null })).toBe(true);
    expect(M.hideMaterialHue({ active: true, correctMat: 'wood', answer: 'wood', result: 'Correct!' })).toBe(false);
    expect(M.NEUTRAL_GLOW).toEqual([203, 213, 225]);
  });
  it('3D surfaces, their rims, edges and echo markers, and the 2D map and glow all take the neutral color', () => {
    expect(SRC).toContain("var hueC = (hideHue3d && cmUD.mat !== 'goal') ? neutral3 : cmUD.baseColor;");
    expect(SRC).toContain('cmMat.emissive.setRGB(hueC.r * effG * 0.92, hueC.g * effG * 0.92, hueC.b * effG * 0.92);');
    expect(SRC).not.toContain('cmMat.emissive.setRGB(cmUD.baseColor.r * effG * 0.92');
    expect(SRC).toContain('_rimUniform: rimColUni, _rimBase: rimColUni.value.clone()');
    expect(SRC).toContain("if (hideHue3d && elItem.owner.userData.mat !== 'goal') elItem.lines.material.color.setRGB(neutral3.r, neutral3.g, neutral3.b);");
    expect(SRC).toContain("if (hideHue3d && mData.mat !== 'goal') erSlot.mat.uniforms.uColor.value.setRGB(neutral3.r, neutral3.g, neutral3.b);");
    const loop2d = between('function loop2d() {', 'loop2d();');
    expect(loop2d).toContain('var hideHue2d = EchoModel.hideMaterialHue(d.matQuiz);');
    expect(loop2d).toContain("var wCol = hideHue2d ? '#cbd5e1' : w.mat === 'metal'");
    expect(loop2d).toContain("col = hideHue2d ? '203,213,225' : w.mat === 'metal'");
  });
});

describe('one bump per contact with a wall', () => {
  it('holding into a wall is one bump; moving free and touching again is the next', () => {
    let contact = false, bumps = 0;
    const frame = (blocked, moved) => { const r = M.contactBump(contact, blocked, moved); contact = r.inContact; if (r.bump) bumps++; };
    for (let i = 0; i < 120; i++) frame(true, false);    // two seconds pushing into the wall
    expect(bumps).toBe(1);
    for (let i = 0; i < 30; i++) frame(false, false);    // standing still, keys up: still at the wall
    frame(true, false);
    expect(bumps).toBe(1);
    frame(false, true);                                   // walked away
    frame(true, false);                                   // and into a wall again
    expect(bumps).toBe(2);
  });
  it('both the 3D and the 2D movement use it', () => {
    expect(SRC).toContain('var wallHit = EchoModel.contactBump(wallContact, true, false); wallContact = wallHit.inContact;');
    expect(SRC).toContain('if (wallHit.bump) updMulti({ bumps: (d.bumps || 0) + 1 });');
    expect(SRC.split('var wallHit2 = EchoModel.contactBump(player._wallContact, true, false);').length - 1).toBe(2);
    expect(SRC).not.toContain("player._bumpCooldown = 20; updMulti({ bumps: (d.bumps || 0) + 1 });");
    expect(SRC).not.toContain("bumpFlash = 0.3; updMulti({ bumps: (d.bumps || 0) + 1 });");
  });
});

describe('levels, return visits and the HUD', () => {
  it('the sonar map shows the beacon at Explorer and Navigator only', () => {
    expect(M.sonarShowsBeacon('easy')).toBe(true);
    expect(M.sonarShowsBeacon('normal')).toBe(true);
    expect(M.sonarShowsBeacon('hard')).toBe(false);
    expect(M.sonarShowsBeacon('master')).toBe(false);
    expect(between('function loop2d() {', 'loop2d();')).toContain("if (!fullMap && o.isGoal && !EchoModel.sonarShowsBeacon(diffId)) return;");
  });
  it('a saved echo read-out is cleared on mount, and a student acknowledges safety again in a new session', () => {
    expect(SRC).toMatch(/var ECHO_SESSION_ID = 's' \+ Date\.now\(\)\.toString\(36\)/);
    expect(SRC).toContain('if (d.lastEcho) { fresh.lastEcho = null; any = true; }');
    expect(SRC).toContain('if (d.disclaimerDismissed && !ctx.isTeacherMode && d.disclaimerSession !== ECHO_SESSION_ID) { fresh.disclaimerDismissed = false; fresh.safetyOpen = false; any = true; }');
    expect(SRC).toContain('updMulti({ disclaimerDismissed: true, safetyOpen: false, disclaimerSession: ECHO_SESSION_ID });');
  });
  it('the 2D HUD names the place', () => {
    expect(M.envName('simple_room')).toBe('Simple Room');
    expect(M.envName('nowhere')).toBe('nowhere');
    expect(SRC).toContain("env: t('stem.echotrainer.env_' + envType + '_name', EchoModel.envName(envType))");
  });
});
