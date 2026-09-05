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
    for (const label of ['Cinematic', 'Follow the stone', 'Engine', 'Castle', 'Whole field', 'Free look', 'Dawn', 'Noon', 'Dusk', 'Night', 'Ambient motion']) {
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
    const dirs = new Set(['dawn', 'noon', 'dusk', 'night'].map((h) => skyPreset(h, false).sunDir.join(',')));
    expect(dirs.size).toBe(4);
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
