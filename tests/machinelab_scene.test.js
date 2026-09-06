import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The Siege Field: the same siege as the Target Wall, staged as a place. These
// pin the contract the view rests on rather than its pixels (the pixels are
// checked by screenshot, dev-tools/ml_scene_shots.cjs): it is reachable, it
// shares the wall and the shot with the Target Wall, its text alternatives
// exist, and the pure pieces of the scene (terrain, sky presets) behave.

const FILE = 'stem_lab/stem_tool_machinelab.js';
const source = () => fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
const BANDS = ['k2', 'g35', 'g68', 'g912'];

function state(o = {}) {
  return { machineLab: Object.assign({ view: 'scene', bandOverride: 'g68' }, o) };
}

let cfg;
beforeEach(() => {
  resetStemLab();
  cfg = loadTool(FILE, 'machineLab');
});

describe('Siege Field: reachable and rendered', () => {
  it('is a tab in the view navigation, between the Target Wall and Compare', () => {
    const html = renderTool('machineLab', state({ view: 'machines' }));
    const i = html.indexOf('Target Wall'), j = html.indexOf('Siege Field'), k = html.indexOf('>Compare<');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(k).toBeGreaterThan(j);
  });

  for (const band of BANDS) {
    it(`renders at ${band} with no undefined, NaN or Infinity`, () => {
      const html = renderTool('machineLab', state({ bandOverride: band }));
      expect(html).toContain('Siege Field');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
    });
  }

  it('offers every camera mode, every hour and the ambient toggle as real buttons', () => {
    const html = renderTool('machineLab', state());
    for (const label of ['Cinematic', 'Follow the stone', 'Engine', 'Castle', 'Whole field', 'Free look', 'Dawn', 'Noon', 'Dusk', 'Night', 'Storm', 'Ambient motion']) {
      expect(html, label).toMatch(new RegExp('<button[^>]*aria-pressed="(true|false)"[^>]*>[^<]*' + label));
    }
  });

  it('marks the current camera, hour and ambient state as pressed', () => {
    const html = renderTool('machineLab', state({ sceneCam: 'castle', sceneTime: 'night', sceneAmbient: false }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>[^<]*Castle/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[^<]*Night/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>[^<]*Ambient motion/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>[^<]*Cinematic/);
  });
});

describe('Siege Field: shares the siege with the Target Wall', () => {
  it('shows the same wall presets, standoff and crosswind, and the same Loose button', () => {
    const html = renderTool('machineLab', state());
    for (const s of ['Curtain wall', 'Gatehouse', 'Keep', 'Motte and tower', 'Standoff from the wall', 'Crosswind', 'Loose!', 'Rebuild the wall']) {
      expect(html).toContain(s);
    }
  });

  it('reports the shared wall state in text, not only in the 3D bay', () => {
    const html = renderTool('machineLab', state({ wallPreset: 'curtain' }));
    expect(html).toContain('intact 72');
    expect(html).toContain('Shots loosed');
  });

  it('disables Loose while a stone is in the air and once the wall is breached', () => {
    const flying = renderTool('machineLab', state({ siegeFlight: { id: 1, path: [{ x: 0, y: 2, z: 0, t: 0 }, { x: 10, y: 1, z: 0, t: 1 }], seconds: 1, before: [] } }));
    expect(flying).toMatch(/<button[^>]*disabled[^>]*>[^<]*In flight/);
    const M = cfg._math;
    let blocks = M.buildWall('curtain');
    for (let i = 0; i < 40 && !M.isBreached(blocks); i++) {
      const res = M.applyDamage(blocks, { status: 'hit', y: (i % 3) + 0.5, z: ((i * 7) % 9) - 4, v: 120, t: 1 }, { projMass: 120, projDiameter: 0.5 });
      if (res && res.blocks) blocks = res.blocks;
    }
    expect(M.isBreached(blocks)).toBe(true);
    const done = renderTool('machineLab', state({ wallBlocks: blocks }));
    expect(done).toMatch(/<button[^>]*disabled[^>]*>[^<]*Breached/);
  });

  it('carries the shot feedback as a status line', () => {
    const html = renderTool('machineLab', state({ siegeFeedback: { ok: true, message: 'Struck the stone at course 2, delivering 9000 J.' } }));
    expect(html).toMatch(/role="status"[^>]*>Struck the stone at course 2/);
  });

  it('shows the energy ledger, so the picture is never the only carrier', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Work you do at the crank');
    expect(html).toContain('Kinetic energy at impact');
  });
});

describe('Siege Field: text alternatives and the live HUD', () => {
  it('labels the 3D bay with the hour and points at the text below it', () => {
    const html = renderTool('machineLab', state({ sceneTime: 'dawn' }));
    expect(html).toMatch(/role="img"[^>]*aria-label="Immersive three-dimensional siege field[^"]*Dawn\.[^"]*in text\."/);
  });

  it('hides the sixty-times-a-second readouts from assistive tech', () => {
    // The HUD is written by the render loop, not by React. A screen reader
    // must not be asked to follow it; the status line and ledger carry the
    // result instead.
    const html = renderTool('machineLab', state());
    const hud = html.match(/<div[^>]*aria-hidden="true"[^>]*>[\s\S]*?Downrange/);
    expect(hud).toBeTruthy();
  });

  it('states the energy story before a shot: stored, delivered to the stone, and the share', () => {
    const html = renderTool('machineLab', state());
    expect(html).toMatch(/Stored \d+(\.\d+)? kJ\s+→\s+stone gets \d+(\.\d+)? kJ \(\d+%\)/);
  });
});

describe('Siege Field: the pure pieces', () => {
  function evalScene() {
    // Pull the pure helpers out of the module by name. They are inside the
    // tool's closure, so run them through the registered config's source: a
    // regex extraction keeps the test honest about which code it runs.
    const src = source();
    const grab = (name) => {
      const m = src.match(new RegExp('\\n  function ' + name + '\\(([^)]*)\\) \\{([\\s\\S]*?)\\n  \\}\\n'));
      if (!m) throw new Error('no function ' + name);
      return new Function(m[1], m[2]);
    };
    return { terrainHeight: grab('terrainHeight'), laneFactor: grab('laneFactor'), skyPreset: grab('skyPreset') };
  }

  it('keeps the firing lane flat at ground level, which is the ground the flight model assumes', () => {
    const { terrainHeight } = evalScene();
    for (const standoff of [20, 80, 200]) {
      for (let z = -standoff - 10; z <= 8; z += 4) {
        for (const x of [-6, 0, 6]) {
          expect(Math.abs(terrainHeight(x, z, standoff, 14)), `standoff ${standoff} x ${x} z ${z}`).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('raises hills away from the lane, so the flat lane is a choice and not a flat world', () => {
    const { terrainHeight } = evalScene();
    let maxAbs = 0;
    for (let x = -150; x <= 150; x += 7) for (let z = -150; z <= 150; z += 7) {
      maxAbs = Math.max(maxAbs, Math.abs(terrainHeight(x, z, 80, 14)));
    }
    expect(maxAbs).toBeGreaterThan(2);
  });

  it('is deterministic: the same valley every time', () => {
    const { terrainHeight } = evalScene();
    expect(terrainHeight(37.3, -61.2, 80, 14)).toBe(terrainHeight(37.3, -61.2, 80, 14));
  });

  it('paints the lane as dirt only along the lane', () => {
    const { laneFactor } = evalScene();
    expect(laneFactor(0, -40, 80, 14)).toBeGreaterThan(0.9);
    expect(laneFactor(60, -40, 80, 14)).toBe(0);
    expect(laneFactor(0, 60, 80, 14)).toBe(0);
  });

  it('has four hours, each with its own sun direction, and a high-contrast sky that is black', () => {
    const { skyPreset } = evalScene();
    const dirs = new Set(['dawn', 'noon', 'dusk', 'night', 'storm'].map((h) => skyPreset(h, false).sunDir.join(',')));
    expect(dirs.size).toBe(5);
    expect(skyPreset('night', false).stars).toBe(true);
    expect(skyPreset('noon', false).stars).toBe(false);
    const hc = skyPreset('noon', true);
    expect(hc.top).toBe(0);
    expect(hc.horizon).toBe(0);
    expect(hc.fog).toBe(null);
  });
});

describe('Shot animation preference', () => {
  it('offers the three choices in the Range and the Siege Field, tied to a label', () => {
    for (const view of ['range', 'scene']) {
      const html = renderTool('machineLab', state({ view }));
      expect(html, view).toContain('Shot animation');
      expect(html, view).toMatch(/<select[^>]*id="ml-motion-[a-z]+"[^>]*aria-label="Shot animation"/);
      expect(html, view).toContain('Always play the shot');
      expect(html, view).toContain('Never animate: show the arc as a strobe');
    }
  });

  it('reflects the stored preference as the selected option', () => {
    const html = renderTool('machineLab', state({ view: 'range', motionPref: 'on' }));
    expect(html).toMatch(/<select[^>]*id="ml-motion-rangemotion"[^>]*>[\s\S]*?<option[^>]*selected[^>]*value="on"|<option[^>]*value="on"[^>]*selected/);
  });

  it('derives reduced motion from the preference before the OS setting', () => {
    const src = source();
    expect(src).toContain("var reducedMotion = (d.motionPref === 'off') ? true : ((d.motionPref === 'on') ? false : !!osReducedMotion);");
    // And the range scene draws a strobe of the arc under reduced motion,
    // rather than a stone that simply appears at the end.
    expect(src).toContain('var strobe = !!(data.reduced && data.shotId && pts.length > 1);');
  });
});

describe('Siege Field: defaults and the mirror', () => {
  it('ships with the scene preferences in defaultState so a partial snapshot fills in', () => {
    const src = source();
    expect(src).toMatch(/sceneTime: 'dusk', sceneCam: 'cinematic', sceneAmbient: true,/);
    expect(src).toMatch(/motionPref: 'auto',/);
    expect(src).toMatch(/sceneRotY: \d+, sceneRotX: \d+, sceneZoom: 1,/);
  });

  it('exposes the scene camera through the same camFor helper as the other bays', () => {
    const src = source();
    expect(src).toContain("{ y: 'sceneRotY', x: 'sceneRotX', z: 'sceneZoom' }");
  });
});

describe('Siege Field wave 2: replay, arc, wind, start card', () => {
  it('offers a slow-motion replay in both siege bays, disabled until a shot exists', () => {
    for (const view of ['scene', 'siege']) {
      const none = renderTool('machineLab', state({ view }));
      expect(none, view).toMatch(/<button[^>]*disabled[^>]*>[^<]*Replay in slow motion/);
      const some = renderTool('machineLab', state({ view, lastFlight: { path: [{ x: 0, y: 2, z: 0, t: 0 }, { x: 20, y: 1, z: 0, t: 1 }], seconds: 1, before: [], outcome: 'hit' } }));
      expect(some, view).toMatch(/<button(?![^>]*disabled)[^>]*>[^<]*Replay in slow motion/);
    }
  });

  it('keeps the last flight on both a hit and a short shot, and marks a replay so it is not re-scored', () => {
    const src = source();
    expect(src).toContain("lastFlight: { path: flightPath, seconds: playSecs, before: blocks, outcome: res.outcome }");
    expect(src).toContain("lastFlight: shortPath.length > 1 ? { path: shortPath, seconds: shortPlay, before: blocks, outcome: 'short' } : null");
    expect(src).toContain("outcome: lf.outcome, replay: true, rate: REPLAY_RATE");
    // The swing stretches with the replay, so the arm is not done before the stone leaves.
    expect(src).toContain("var swingT = (data.flight && data.flight.replay) ? t / Math.max(1, data.flight.rate || 3) : t;");
  });

  it('offers the predicted arc as a pressed toggle, on by default, and pushes the arc without a rebuild', () => {
    const on = renderTool('machineLab', state());
    expect(on).toMatch(/aria-pressed="true"[^>]*>[^<]*Predicted arc/);
    const off = renderTool('machineLab', state({ scenePath: false }));
    expect(off).toMatch(/aria-pressed="false"[^>]*>[^<]*Predicted arc/);
    const src = source();
    // The prediction rides on the push and is compared by signature in the
    // tick; it must NOT be in the scene sig, or every slider tick rebuilds the valley.
    expect(src).toContain("if (showArc && S.arc.sig !== data.previewSig) {");
    const sig = src.match(/SCENE_GL\.push\(\{\n\s*sig: \[([^\]]*)\]/);
    expect(sig).toBeTruthy();
    expect(sig[1]).not.toContain('preview');
  });

  it('shows the wind hint only when there is wind', () => {
    expect(renderTool('machineLab', state({ windZ: 0 }))).not.toContain('Read the wind from the banner');
    expect(renderTool('machineLab', state({ windZ: 6 }))).toContain('Read the wind from the banner');
  });

  it('has a dismissible start-here card that stays dismissed', () => {
    const fresh = renderTool('machineLab', state());
    expect(fresh).toContain('Start here');
    expect(fresh).toMatch(/aria-label="Dismiss the start-here card"/);
    const gone = renderTool('machineLab', state({ sceneIntroDismissed: true }));
    expect(gone).not.toContain('Start here');
  });

  it('restates the HUD labels for the younger bands', () => {
    expect(renderTool('machineLab', state({ bandOverride: 'k2' }))).toContain('How fast');
    expect(renderTool('machineLab', state({ bandOverride: 'g35' }))).toContain('How far');
    expect(renderTool('machineLab', state({ bandOverride: 'g68' }))).toContain('Downrange');
    expect(renderTool('machineLab', state({ bandOverride: 'g912' }))).not.toContain('How fast');
  });

  it('tumbles only the blocks THIS shot knocked out, decided once when the stone lands', () => {
    const src = source();
    expect(src).toContain("if (flying && landed && S.tumbleId !== data.flight.id) {");
    expect(src).toContain("if (nb.state === 'breached' && !wasBreached[nb.col + '_' + nb.row]) S.tumble[nb.col + '_' + nb.row] = true;");
    // Under reduced motion the tumble is skipped, not slowed.
    expect(src).toContain("var tumbleK = (S.tumbleT0 != null && !red) ? Math.max(0, Math.min(1, (now - S.tumbleT0) / 1100)) : 1;");
  });
});

describe('Siege Field wave 3: winding, energy bar, traces, bests', () => {
  it('every flight carries the windup, and the clear timer waits for it too', () => {
    const src = source();
    expect(src).toContain('var WINDUP_SECS = 1.6;');
    expect(src).toContain("outcome: res.outcome, windup: WINDUP_SECS");
    expect(src).toContain("outcome: 'short', windup: WINDUP_SECS");
    expect(src).toContain("replay: true, rate: REPLAY_RATE, windup: WINDUP_SECS");
    expect(src).toContain('clearFlightLater(flightId, playSecs + WINDUP_SECS);');
    expect(src).toContain('clearFlightLater(shortId, shortPlay + WINDUP_SECS);');
    expect(src).toContain('clearFlightLater(rid, secs + WINDUP_SECS);');
  });

  it('both siege bays subtract the windup from the shared flight clock, so neither fires early', () => {
    const src = source();
    const hits = src.match(/t = Math\.max\(0, raw - windup\);/g) || [];
    expect(hits.length).toBe(2);
    // And both hand the engine its winding pose from the same exposed hook.
    const poses = src.match(/g\.mlPose\(winding \* winding\)/g) || [];
    expect(poses.length).toBe(2);
    expect(src).toContain('S.mlPose = function (k) { pose(1 - Math.max(0, Math.min(1, k))); };');
    expect(src).toMatch(/S\.mlPose = function \(k\) \{\n\s+var REST_DEG = 42;/);
  });

  it('reduced motion skips the haul rather than freezing on it', () => {
    const src = source();
    expect(src).toContain('if (red) { t = dur; winding = 0; }');
    expect(src).toContain('if (reduced) { t = dur; winding = 0; }');
  });

  it('draws the moving-versus-height bar as two spans the loop fills', () => {
    const html = renderTool('machineLab', state());
    expect(html).toMatch(/<span[^>]*style="[^"]*width:0%[^"]*background:#fbbf24/);
    expect(html).toMatch(/<span[^>]*style="[^"]*width:0%[^"]*background:#7dd3fc/);
    const src = source();
    expect(src).toContain("setBar((ke + pe) > 0 ? ke / (ke + pe) : 1, (ke + pe) > 0 ? pe / (ke + pe) : 0);");
  });

  it('keeps compact traces of the last three flights in state, on hits and short shots alike', () => {
    const src = source();
    expect(src).toContain("sceneTraces: (d.sceneTraces || []).slice(-2).concat([compactPath(flightPath)])");
    expect(src).toContain("sceneTraces: shortPath.length > 1 ? (d.sceneTraces || []).slice(-2).concat([compactPath(shortPath)]) : (d.sceneTraces || [])");
    expect(src).toMatch(/sceneTraces: \[\], siegeBests: \{\},/);
  });

  it('shows the best siege for the current target only once one exists', () => {
    const none = renderTool('machineLab', state());
    expect(none).not.toContain('Best here');
    const some = renderTool('machineLab', state({ wallPreset: 'keep', siegeBests: { keep: { shots: 4, work: 181000 }, curtain: { shots: 9, work: 400000 } } }));
    expect(some).toContain('Best here: 4 shots, 181 kJ');
    const other = renderTool('machineLab', state({ wallPreset: 'curtain', siegeBests: { keep: { shots: 4, work: 181000 } } }));
    expect(other).not.toContain('Best here');
  });

  it('records a best on a breach by fewest shots then least work, and toasts only when beating one', () => {
    const src = source();
    expect(src).toContain("var better = !prevBest || shots < prevBest.shots || (shots === prevBest.shots && work < prevBest.work);");
    expect(src).toContain("if (prevBest) addToast('🏆 '");
  });

  it('labels every stake with its distance', () => {
    const src = source();
    expect(src).toContain("g2.fillText(sd + ' m', n2 / 2, n2 / 2);");
  });
});

describe('Siege Field wave 4: sound, crew, record, quest', () => {
  it('sound is opt-in, a pressed toggle, and unlocked by the click that turns it on', () => {
    const off = renderTool('machineLab', state());
    expect(off).toMatch(/aria-pressed="false"[^>]*>[^<]*Sound/);
    const on = renderTool('machineLab', state({ sceneSound: true }));
    expect(on).toMatch(/aria-pressed="true"[^>]*>[^<]*Sound/);
    const src = source();
    expect(src).toMatch(/sceneSound: false,/);
    expect(src).toContain("if (!d.sceneSound) SCENE_AUDIO.unlock(); upd('sceneSound', !d.sceneSound);");
  });

  it('cues fire on the three transitions only, and never under reduced motion', () => {
    const src = source();
    expect(src).toContain("if (data.sound && !red && (Number(data.flight.windup) || 0) > 0) SCENE_AUDIO.haul(Number(data.flight.windup));");
    expect(src).toContain("if (data.sound && !red) SCENE_AUDIO.whoosh(speed);");
    expect(src).toContain("if (data.sound && !red) SCENE_AUDIO.thud(data.outcomeKind === 'hit', (Number(data.impactKJ) || 0));");
    // The release cue is latched per flight, so a slow replay cannot re-trigger it every frame.
    expect(src).toContain("if (t > 0.02 && S.releasedId !== data.flight.id) {");
  });

  it('every synthesised voice is wrapped so a missing AudioContext is silent, not fatal', () => {
    const src = source();
    const mod = src.slice(src.indexOf('var SCENE_AUDIO = (function () {'), src.indexOf('var SCENE_HUD = {};'));
    expect((mod.match(/try \{/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(mod).toContain("catch (e) { ctx = null; }");
  });

  it('puts the siege bests in the work record, and only when there are any', () => {
    const none = renderTool('machineLab', state({ view: 'learn', manualTopic: 'record' }));
    expect(none).not.toContain('Best sieges');
    const some = renderTool('machineLab', state({ view: 'learn', manualTopic: 'record', siegeBests: { keep: { shots: 4, work: 181000 } } }));
    expect(some).toContain('Best sieges: keep 4 shots (181 kJ)');
  });

  it('adds a quest for breaching two targets, keyed on the bests', () => {
    const hooks = cfg.questHooks;
    const q = hooks.filter((h) => h.id === 'breach_two_targets')[0];
    expect(q).toBeTruthy();
    expect(q.check({ siegeBests: { keep: { shots: 3, work: 1 } } })).toBe(false);
    expect(q.check({ siegeBests: { keep: { shots: 3, work: 1 }, curtain: { shots: 5, work: 2 } } })).toBe(true);
    expect(q.progress({})).toBe('0/2 targets');
  });

  it('the crew work the winch only during the haul', () => {
    const src = source();
    expect(src).toContain("var heave = (winding > 0 && !red) ? Math.sin(tSec * 7 * Math.PI / 1.0) : 0;");
  });
});

describe('Siege Field wave 5: dressing that follows the hour', () => {
  it('lights the tower windows and torches only after dark, from the same preset the sky uses', () => {
    const src = source();
    expect(src).toContain('var lit = P.fire >= 0.9;');
    expect(src).toContain('if (P.fire > 0.5) {');
    // Dusk and night burn; dawn glows faintly; noon is out. The thresholds
    // above sit between the presets' fire values.
    const grab = (name) => {
      const m = src.match(new RegExp('\\n  function ' + name + '\\(([^)]*)\\) \\{([\\s\\S]*?)\\n  \\}\\n'));
      return new Function(m[1], m[2]);
    };
    const skyPreset = grab('skyPreset');
    expect(skyPreset('noon', false).fire).toBe(0);
    expect(skyPreset('dawn', false).fire).toBeLessThan(0.5);
    expect(skyPreset('dusk', false).fire).toBeGreaterThan(0.5);
    expect(skyPreset('night', false).fire).toBeGreaterThanOrEqual(0.9);
  });

  it('keeps every new texture procedural and guarded, so a missing canvas is silent', () => {
    const src = source();
    for (const name of ['flareTex', 'cloudTex', 'grassTex', 'waterTex']) {
      expect(src, name).toMatch(new RegExp('var ' + name + ' = (contrast \\? null : )?makeCanvasTexture\\(THREE'));
    }
    expect(src).toContain('if (flareTex) {');
    expect(src).toContain('if (cloudTex) {');
    expect(src).toContain('if (grassTex) grassTex.repeat.set(groundSpan / 6, groundSpan / 6);');
    expect(src).toContain('if (waterTex) waterTex.repeat.set(Math.max(2, span / 4), 1.2);');
  });

  it('drifts the clouds with the wind and stills them with ambient motion off', () => {
    const src = source();
    expect(src).toContain("cl.position.x = u.x0 + (ambient ? (tSec * (u.speed + windAbs * 0.25) * (wind < 0 ? -1 : 1)) % 460 : 0);");
    expect(src).toContain("S.water.material.map.offset.x = ambient ? (tSec * 0.03) % 1 : 0;");
  });

  it('does not dress a high-contrast field with clouds, moat or windows', () => {
    const src = source();
    const start = src.indexOf('function buildFieldScene(');
    const body = src.slice(start, src.indexOf('var SCENE_GL = '));
    // Each dressing block sits under a !contrast guard.
    expect(body).toContain("if (!contrast && typeof THREE.Sprite === 'function') {");
    expect(body).toContain("var grassTex = contrast ? null : makeCanvasTexture(");
    expect(body).toContain('if (!contrast) {\n        // The moat:');
  });
});

describe('Siege Field wave 6: storm, landing marks, life', () => {
  function grab(name) {
    const src = source();
    const m = src.match(new RegExp('\\n  function ' + name + '\\(([^)]*)\\) \\{([\\s\\S]*?)\\n  \\}\\n'));
    return new Function(m[1], m[2]);
  }

  it('the storm is the only hour that rains, and it closes the fog in', () => {
    const skyPreset = grab('skyPreset');
    for (const h of ['dawn', 'noon', 'dusk', 'night']) expect(skyPreset(h, false).rain, h).toBeFalsy();
    expect(skyPreset('storm', false).rain).toBe(true);
    expect(skyPreset('storm', true).rain).toBeFalsy();
    const src = source();
    expect(src).toContain('new THREE.Fog(P.fog, P.rain ? 40 : 80, P.rain ? 240 : 360)');
  });

  it('rain, lightning and thunder are ambient-gated, and the rain changes nothing in the model', () => {
    const src = source();
    expect(src).toContain('if (ambient && S.nextBolt != null) {');
    expect(src).toContain("if (data.sound && !red) setTimeout(function () { SCENE_AUDIO.thud(false, 60); }, 700);");
    // The rain reads the wind slider for its lean; it never writes state.
    expect(src).toContain('rp.setX(rI, rp.getX(rI) + wind * 0.4 * dt);');
    expect(src).not.toMatch(/rain[^\n]*upd\(/);
  });

  it('scorches the ground only where a stone lands short, never on the wall', () => {
    const src = source();
    expect(src).toContain("if (S.scorch && data.outcomeKind !== 'hit') {");
    // Dust rises at every landing and dies within six seconds.
    expect(src).toContain('if (age > 6) { dsp.visible = false; return; }');
  });

  it('dresses only the trebuchet with braces and a winch, in the guest frame', () => {
    const src = source();
    expect(src).toContain("if (!contrast && guest.ml && m.kind !== 'ballista' && m.kind !== 'onager') {");
    expect(src).toContain('mg.add(drum);');
  });

  it('keeps the sheep off the lane', () => {
    const src = source();
    expect(src).toContain('var fx0 = laneHalf + 22 + hash01(2, 4, 91) * 20, fz0 = -standoff * 0.35;');
  });
});

describe('Siege Field wave 7: the coach, the map, the sock, the cracks', () => {
  it('offers a top-down map camera', () => {
    const html = renderTool('machineLab', state({ sceneCam: 'map' }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>[^<]*Map/);
    const src = source();
    expect(src).toContain("else if (mode === 'map') goal = { target: new THREE.Vector3(0, 0, -standoff * 0.5)");
  });

  it('the coach tries real flights through the same model, and reports honestly when none reaches', () => {
    const src = source();
    expect(src).toContain("var altShot = _machineMath.shot(Object.assign({}, shotInputs, cands[ci3].patch));");
    expect(src).toContain("if (altShot && altShot.range >= d.standoff) reached = cands[ci3];");
    expect(src).toContain("'Coach: no single small change reaches from here. Combine two, or move closer.'");
    // Trebuchets are coached on the counterweight, torsion engines on the bundle.
    expect(src).toContain("if (machineId === 'trebuchet') cands.push({ patch: { cwMass: d.cwMass * 1.25 }");
    expect(src).toContain("else cands.push({ patch: { bundleTurns: d.torsionTurns + 4 }");
  });

  it('the coach candidates the model reads are the keys the model takes', () => {
    // If inputsFor renames a key, the coach would patch a dead field and
    // silently coach nothing. Pin the four keys against inputsFor.
    const src = source();
    const inputs = src.slice(src.indexOf('function inputsFor(kind) {'), src.indexOf('var machineId = d.machine'));
    for (const key of ['releaseAngle', 'projMass', 'cwMass', 'bundleTurns']) {
      expect(inputs.includes(key + ':') || inputs.includes('base.' + key + ' = '), key).toBe(true);
    }
  });

  it('a coach candidate that reaches is one the model agrees reaches', () => {
    // Direct check through the exposed model: a heavier counterweight throws
    // further at the defaults, which is the coach's whole premise.
    const M = cfg._math;
    const base = {
      machine: 'trebuchet', g: 9.81, projMass: 25, projDiameter: 0.26, releaseAngle: 45, launchElevation: 2,
      winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true, windZ: 0,
      cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60
    };
    const a = M.shot(base), b = M.shot(Object.assign({}, base, { cwMass: 1500 }));
    expect(b.range).toBeGreaterThan(a.range);
  });

  it('lays cracks on cracked blocks only, from a pool, and hides the rest', () => {
    const src = source();
    expect(src).toContain("if (cb.state !== 'cracked') continue;");
    expect(src).toContain('for (; ci4 < S.cracks.length; ci4++) S.cracks[ci4].visible = false;');
  });

  it('the windsock hangs in calm air and lifts with the wind', () => {
    const src = source();
    expect(src).toContain('S.sock.rotation.z = -(Math.PI / 2) * (1 - Math.min(1, windAbs / 8))');
    expect(src).toContain('S.sock.rotation.y = wind < 0 ? Math.PI : 0;');
  });
});

describe('Siege Field wave 8: over-shots fly on, predict-then-loose, splash, hot trail', () => {
  it('a stone that clears or passes the wall flies to its real landing, not to the wall plane', () => {
    const src = source();
    expect(src).toContain("if (res.outcome === 'over' || res.outcome === 'miss') {\n          flightPath = (preview.path || []).slice();");
    // And a hit is still cut at the wall: the cut comes first, the extension only for over/miss.
    expect(src.indexOf('pt.x <= d.standoff + 1')).toBeLessThan(src.indexOf("if (res.outcome === 'over' || res.outcome === 'miss') {"));
  });

  it('offers four predictions as pressed chips before a shot, hidden in flight and after a breach', () => {
    const html = renderTool('machineLab', state());
    for (const label of ['fall short', 'hit the wall', 'go over', 'go wide']) {
      expect(html, label).toMatch(new RegExp('<button[^>]*aria-pressed="false"[^>]*>' + label));
    }
    const chosen = renderTool('machineLab', state({ fieldGuess: 'over' }));
    expect(chosen).toMatch(/aria-pressed="true"[^>]*>go over/);
    const flying = renderTool('machineLab', state({ siegeFlight: { id: 1, path: [{ x: 0, y: 2, z: 0, t: 0 }, { x: 10, y: 1, z: 0, t: 1 }], seconds: 1, before: [] } }));
    expect(flying).not.toContain('My guess');
  });

  it('judges the guess on both branches, resets it, and keeps a streak that a wrong call ends', () => {
    const src = source();
    expect(src).toContain("var shortGuess = judgeGuess('short');");
    expect(src).toContain("var hitGuess = judgeGuess(res.outcome === 'hit' ? 'hit' : (res.outcome === 'over' ? 'over' : 'wide'));");
    expect(src).toContain("patch: { fieldGuess: null, fieldStreak: right ? (d.fieldStreak || 0) + 1 : 0 }");
    expect(src).toContain("if (!g) return { line: '', patch: {} };");
    const html = renderTool('machineLab', state({ fieldStreak: 3 }));
    expect(html).toContain('guess streak 3');
  });

  it('speaks the coach line and the verdict to screen readers', () => {
    const src = source();
    expect(src).toContain("announceToSR(__alloT('stem.machinelab.sr_short', 'The shot fell short.') + coachLine + shortGuess.line");
  });

  it('splashes only in the moat, never on a wall hit, and cancels the scorch there', () => {
    const src = source();
    expect(src).toContain("if (S.splash && S.water && data.outcomeKind !== 'hit' && S.impactPos.z > 2 && S.impactPos.z < 6.2 && Math.abs(S.impactPos.x) < span / 2 + 3.5) {");
    expect(src).toContain('if (S.scorch) S.scorch.visible = false;   // no scorch on water');
  });

  it('tints the trail by speed, except in high contrast', () => {
    const src = source();
    expect(src).toContain('var hot = Math.max(0, Math.min(1, (speed - 10) / 35));');
    expect(src).toContain('if (!contrast && stonePos) S.trail[tt].material.emissive.setRGB(0.85, 0.72 - hot * 0.42, 0.42 - hot * 0.35);');
  });
});

describe('Siege Field wave 9: the apex marked, the landing flagged, chaff on the wind', () => {
  it('marks the summit of the arc it actually draws, with a drop line to the ground', () => {
    const src = source();
    expect(src).toContain('for (var ax = 1; ax < arcPts.length; ax++) if (arcPts[ax].y > arcPts[apI].y) apI = ax;');
    // Only a real summit: a monotonic climb cut at the wall has no apex to mark.
    expect(src).toContain('var apOk = apPt.y > 3 && apI > 0 && apI < arcPts.length - 1;');
    expect(src).toContain('S.apexMark.drop.geometry.setFromPoints([new THREE.Vector3(apPt.x, 0.06, apPt.z), new THREE.Vector3(apPt.x, apPt.y, apPt.z)]);');
  });

  it('shows and hides the apex mark with the predicted arc, never on its own', () => {
    const src = source();
    expect(src).toContain('var apVis = showArc && !!S.apexMark.show;');
    expect(src).toContain('if (S.apexMark.label) S.apexMark.label.sprite.visible = apVis;');
  });

  it('flags where a stone landed, with the distance on it, and never on a wall hit', () => {
    const src = source();
    expect(src).toContain("if (S.landFlag && data.outcomeKind !== 'hit') {");
    expect(src).toContain("S.landFlag.label.draw(Math.round(landM) + (L.metres || ' m'));");
    // A new flight clears the last flag, so two shots never both claim the ground.
    expect(src).toContain('if (S.landFlag) S.landFlag.group.visible = false;');
    expect(src.indexOf('if (S.landFlag) S.landFlag.group.visible = false;'))
      .toBeLessThan(src.indexOf("if (S.landFlag && data.outcomeKind !== 'hit') {"));
  });

  it('reletters a label in place rather than building a texture per slider drag', () => {
    const src = source();
    expect(src).toContain('function makeLabelSprite(THREE, scale, tint, through) {');
    expect(src).toContain('if (this.text === text) return;');
    expect(src).toContain('tex.needsUpdate = true;');
  });

  it('drifts chaff at the wind\'s own speed, off in contrast and with ambient off', () => {
    const src = source();
    expect(src).toContain("if (!contrast && typeof THREE.Points === 'function') {");
    expect(src).toContain('S.motes.points.visible = ambient;');
    expect(src).toContain('var mvx = wind * 0.5 + 0.4;');
    // It wraps rather than running out, so the air never empties.
    expect(src).toContain('if (mArr[mk] > mHalf) mArr[mk] -= S.motes.span;');
  });

  it('says apex and metres through the label pipe, not as hard-coded English', () => {
    const src = source();
    expect(src).toContain("apexMark: __alloT('stem.machinelab.scene_apex_mark', 'apex '),");
    expect(src).toContain("metres: __alloT('stem.machinelab.scene_metres', ' m'),");
    expect(src).toContain("(L.apexMark || 'apex ') + Math.round(apPt.y) + (L.metres || ' m')");
  });

  it('still gives the apex and the range as text, for anyone who cannot see the marks', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Apex');
  });
});

describe('Siege Field wave 10: seconds on the arc, the track on the ground', () => {
  it('beads the arc wherever the flight clock passes a whole second', () => {
    const src = source();
    expect(src).toContain('while (sec <= S.beads.marks.length && p1.t >= sec) {');
    // The fraction is clamped, so a coarse path cannot throw a bead off the arc.
    expect(src).toContain('var bf = Math.max(0, Math.min(1, (sec - p0.t) / Math.max(1e-6, p1.t - p0.t)));');
    // Beads stop where the drawn line stops.
    expect(src).toContain('if ((Number(p1.x) || 0) > standoff + 1) break;');
  });

  it('gives every bead a shadow on the ground and lays the whole arc flat as a track', () => {
    const src = source();
    expect(src).toContain('S.beads.shadows[bk].position.set(bpt.x, 0.07, bpt.z);');
    expect(src).toContain('S.beads.track.geometry.setFromPoints(arcPts.map(function (p) { return new THREE.Vector3(p.x, 0.07, p.z); }));');
  });

  it('shows the beads only with the arc, and only as many as the flight earned', () => {
    const src = source();
    expect(src).toContain('var bOn = showArc && bv < S.beads.count;');
    expect(src).toContain('S.beads.track.visible = showArc && S.beads.count > 0;');
  });

  it('shadows the flying stone, wider and fainter the higher it is, and clears it on landing', () => {
    const src = source();
    expect(src).toContain('S.stoneShadow.scale.setScalar(1 + shH * 0.035);');
    expect(src).toContain('S.stoneShadow.material.opacity = Math.max(0.07, 0.34 - shH * 0.006);');
    expect(src).toContain('if (S.stoneShadow) S.stoneShadow.visible = false;');
  });

  it('says in text what the marks on the arc mean, and only while the arc is drawn', () => {
    const html = renderTool('machineLab', state({ scenePath: true }));
    expect(html).toContain('beaded once per second of flight');
    const off = renderTool('machineLab', state({ scenePath: false }));
    expect(off).not.toContain('beaded once per second of flight');
    // The toggle's own tooltip lists what it draws.
    expect(html).toContain('a bead for every second of flight');
  });
});

describe('Siege Field wave 11: far ridges, grass and wildflowers', () => {
  it('rings the valley with three ridge bands, each hazed further toward the horizon', () => {
    const src = source();
    expect(src).toContain('[[236, 36, 0.5], [278, 54, 0.68], [318, 76, 0.84]].forEach(function (layer, li) {');
    expect(src).toContain('var rcol = ridgeNear.clone().lerp(new THREE.Color(P.horizon), haze);');
    // The tint is the haze, so the ridges must not take the scene fog as well.
    expect(src).toContain('color: rcol.getHex(), side: THREE.DoubleSide, fog: false');
  });

  it('sits the ridges outside the ground plane and never culls them', () => {
    const src = source();
    // groundSpan reaches at most standoff * 2.4 + 200, half of that from the
    // valley centre, so the nearest band at 236 is always past the rim.
    expect(src).toContain('var groundSpan = Math.max(320, standoff * 2.4 + 200);');
    expect(src).toContain('ridgeMesh.frustumCulled = false;');
  });

  it('grows grass off the lane, dry and sparse on it, and none at all in high contrast', () => {
    const src = source();
    expect(src).toContain("if (!contrast && typeof THREE.InstancedMesh === 'function') {\n      var td = new THREE.Object3D(), tc = new THREE.Color();");
    expect(src).toContain('if (lf2 > 0.35 && hash01(tt, 17, 123) > 0.05) continue;');
    expect(src).toContain('if (lf2 > 0.2) tc.lerp(new THREE.Color(0xa79256), Math.min(1, lf2 * 1.1));');
  });

  it('keeps wildflowers out of the lane entirely', () => {
    const src = source();
    expect(src).toContain('if (laneFactor(fx, fz, standoff, laneHalf) > 0.25) continue;');
  });

  it('places grass by the same terrain the physics uses, so nothing floats or sinks', () => {
    const src = source();
    expect(src).toContain('td.position.set(gx, terrainHeight(gx, gz, standoff, laneHalf) + 0.16 * gsc, gz);');
    expect(src).toContain('td.position.set(fx, terrainHeight(fx, fz, standoff, laneHalf) + 0.22, fz);');
  });

  it('scatters both from the deterministic hash, never Math.random', () => {
    const src = source();
    const scatter = src.slice(src.indexOf('// ── Tufts and wildflowers'), src.indexOf('// ── The castle ──'));
    expect(scatter).not.toContain('Math.random');
    expect(scatter).toContain('hash01(');
  });
});

describe('Siege Field wave 12: an inner ward and people on the rampart', () => {
  it('builds a keep, two halls and a well behind the wall', () => {
    const src = source();
    expect(src).toContain('var keepH = wallTop + 5.5;');
    expect(src).toContain('keep.position.set(0, keepH / 2, 11.5);');
    expect(src).toContain("// A well in the yard, because a besieged castle lives or dies by it.");
    // The keep clears the wall it stands behind, or it would not read as a keep.
    expect(src).toContain('var keepRoof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 3.1, 4), wardRoof);');
  });

  it('lights the ward windows on the same rule as the towers', () => {
    const src = source();
    expect(src).toContain('var wardLit = P.fire >= 0.9;');
    expect(src).toContain("emissive: wardLit ? 0xffa73a : 0x000000, emissiveIntensity: wardLit ? 0.9 : 0");
  });

  it('stands defenders on a walkway at the top of the wall, facing the field', () => {
    const src = source();
    expect(src).toContain('walkway.position.set(0, wallTop - 0.08, 1.5);');
    expect(src).toContain('var dfr = addFigure(THREE, S.model, dfx, 1.5, DEFENDER_TUNICS[dfi % DEFENDER_TUNICS.length], Math.PI);');
    expect(src).toContain('dfr.position.y = wallTop;');
  });

  it('ducks them when a stone lands and clears them off a wall that is mostly gone', () => {
    const src = source();
    expect(src).toContain('var held = !blk.length || (gone / blk.length) < 0.4;');
    expect(src).toContain('var duck = (S.impactAt != null) ? Math.max(0, 1 - (now - S.impactAt) / 1400) : 0;');
    expect(src).toContain('df.position.y = df.userData.y0 - duck * duck * 0.62;');
    // The sway is ambient life; reduced motion and ambient-off leave them still.
    expect(src).toContain('var sway = ambient ? Math.sin(tSec * 1.15 + df.userData.phase) * 0.05 : 0;');
  });

  it('builds neither the ward nor the rampart in high contrast or for an imported wall', () => {
    const src = source();
    const ward = src.indexOf('// ── The inner ward.');
    const rampart = src.indexOf('// ── The rampart, and the people on it.');
    expect(ward).toBeGreaterThan(0);
    expect(rampart).toBeGreaterThan(ward);
    expect(src.slice(ward, ward + 700)).toContain("if (!contrast && m.wallPreset !== 'imported') {");
    expect(src.slice(rampart, rampart + 400)).toContain("if (!contrast && m.wallPreset !== 'imported') {");
  });
});

describe('Siege Field wave 13: the camp, and a crew that watches its own shot', () => {
  it('pitches more of a camp: tents, a loaded cart, barrels, a stake screen, a standard', () => {
    const src = source();
    expect(src).toContain('// ── The camp. The castle got a ward it is defending; this is what the');
    expect(src).toContain('// The supply cart: the stones did not walk here.');
    expect(src).toContain('// Barrels, because a siege drinks.');
    expect(src).toContain("// A stake screen across the camp's front: the crew are within range of");
    expect(src).toContain("// The camp's standard, answering the castle's banner across the field.");
  });

  it('leaves the lane clear through the stake screen, so nothing stands in the shot', () => {
    const src = source();
    expect(src).toContain('if (Math.abs(pkx) < 2.6) continue;');
  });

  it('sits every camp prop on the terrain the physics uses', () => {
    const src = source();
    expect(src).toContain('var campGround = function (cx, cz) { return terrainHeight(cx, cz, standoff, laneHalf); };');
    expect(src).toContain('barrel.position.set(blx, campGround(blx, blz) + 0.4, blz);');
    expect(src).toContain('stake.position.set(pkx, campGround(pkx, pkz) + 0.85, pkz);');
  });

  it('flies the standard on the castle banner rules, still when ambient is off', () => {
    const src = source();
    expect(src).toContain('if (S.standard && S.standardBase) {');
    expect(src).toContain('sp2.setZ(sv, ambient ? Math.sin(sx2 * 2.6 + tSec * sfreq + sy2 * 1.5) * samp * (sx2 / 2.1 + 0.1) : 0);');
  });

  it('turns the crew to follow the stone, the short way round, and back to rest after', () => {
    const src = source();
    expect(src).toContain('var watchAt = stonePos || (S.impactAt != null && (now - S.impactAt) < 2600 ? S.impactPos : null);');
    expect(src).toContain('while (dY > Math.PI) dY -= Math.PI * 2;');
    expect(src).toContain('while (dY < -Math.PI) dY += Math.PI * 2;');
    // Each figure remembers the way it was first facing, so "no stone" is a place.
    expect(src).toContain('if (member.userData.rest0 == null) member.userData.rest0 = member.rotation.y;');
  });

  it('builds none of the camp in high contrast', () => {
    const src = source();
    const camp = src.indexOf('// ── The camp. The castle got a ward');
    const guard = src.lastIndexOf('if (!contrast) {', camp);
    const closes = src.slice(guard, camp);
    // No other contrast branch opens between the guard and the camp.
    expect(closes).not.toContain('if (contrast)');
    expect(guard).toBeGreaterThan(0);
  });
});

describe('Siege Field wave 14: the camera takes the hit, a moon, rain that lands', () => {
  it('shakes the camera on impact, scaled by the energy that arrived, and decays it away', () => {
    const src = source();
    expect(src).toContain('var shake = Math.max(0, 1 - (now - S.impactAt) / 700);');
    expect(src).toContain('var mag = shake * shake * Math.min(1.5, 0.2 + (Number(data.impactKJ) || 0) * 0.02);');
  });

  it('never shakes under reduced motion or on the static one-tick path', () => {
    const src = source();
    // A static bay gets one tick per push: a shake there would freeze part-way
    // through and leave the scene crooked for good.
    expect(src).toContain('if (!red && !data.static && S.impactAt != null) {');
  });

  it('shakes the look-at only after the fit points are set, so the framing does not pump', () => {
    const src = source();
    const fit = src.indexOf('S.fitPts = goal.pts ? goal.pts.slice() : boxPts(');
    const shake = src.indexOf('var shake = Math.max(0, 1 - (now - S.impactAt) / 700);');
    expect(fit).toBeGreaterThan(0);
    expect(shake).toBeGreaterThan(fit);
  });

  it('hangs a moon where the light comes from, and only at an hour that has stars', () => {
    const src = source();
    expect(src).toContain("if (P.stars && typeof THREE.Sprite === 'function') {");
    expect(src).toContain('moon.position.copy(fieldCentre).addScaledVector(new THREE.Vector3(P.sunDir[0], P.sunDir[1], P.sunDir[2]).normalize(), 320);');
  });

  it('gives the storm somewhere to land, on a fixed cycle with no spawner', () => {
    const src = source();
    expect(src).toContain('if (P.rain && !contrast) {');
    expect(src).toContain('var phase = (tSec * 0.9 + rk * 0.37);');
    expect(src).toContain('rrg.material.opacity = 0.7 * (1 - kk) * (1 - kk);');
    // Ambient life: with ambient off there is no splash, as with everything else.
    expect(src).toContain('rrg.visible = ambient;');
  });
});

describe('Siege Field wave 15: ranging by bracket', () => {
  it('keeps the best short and the best over, tightening rather than replacing', () => {
    const src = source();
    expect(src).toContain("if (kind === 'short') lo = (lo == null) ? at : Math.max(lo, at);");
    expect(src).toContain("else if (kind === 'over') hi = (hi == null) ? at : Math.min(hi, at);");
  });

  it('holds the bracket per standoff, because moving the engine asks another question', () => {
    const src = source();
    expect(src).toContain('var held = (d.bracket && d.bracket.at === d.standoff) ? d.bracket : { at: d.standoff, lo: null, hi: null };');
    expect(src).toContain('bracket: (d.bracket && d.bracket.at === d.standoff) ? d.bracket : null,');
  });

  it('only a long shot closes the far side: a wide miss and a hit leave it alone', () => {
    const src = source();
    expect(src).toContain("var overBracket = (res.outcome === 'over')");
    expect(src).toContain("{ line: '', patch: {} };");
  });

  it('says where the wall sits between the two shots, as a fraction, not as a midpoint', () => {
    const src = source();
    expect(src).toContain('var frac = Math.max(0, Math.min(1, (d.standoff - lo) / (hi - lo)));');
    expect(src).toContain("__alloT('stem.machinelab.bracket_l3', ' m. The wall is ') + Math.round(frac * 100) +");
    // Halfway between two landing distances is not the target; the wall is.
    expect(src).not.toContain('Halfway is ');
  });

  it('draws the band between the two shots and a bar on each edge', () => {
    const src = source();
    expect(src).toContain('S.bracketMark.band.scale.y = Math.max(0.5, bz1 - bz0);');
    expect(src).toContain('S.bracketMark.edges[0].position.z = bz0;');
    expect(src).toContain('S.bracketMark.edges[1].position.z = bz1;');
    // Shown only when both edges are known and they really do straddle.
    expect(src).toContain('var bkOn = !!(bk && bk.lo != null && bk.hi != null && bk.hi > bk.lo);');
  });

  it('starts with no bracket at all', () => {
    const src = source();
    expect(src).toContain('bracket: null,');
    const html = renderTool('machineLab', state());
    expect(html).not.toContain('Bracketed');
  });
});
