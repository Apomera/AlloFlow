// Throw Lab mode banner titles (2026-11-23 decisions pass).
// Four banner titles used keys that are registered in ui_strings.js with OLDER text, and a registered
// value wins over the code's English, so the app showed e.g. "Free Throw — 15 ft from line to hoop" for a
// mode that now has passes and longer shots. Each title now has a new _v2 key (unregistered), so the
// accurate English shows, and the sizes in each title are checked against the model here.
// THROWLAB_FILE=C:/tmp/sports_labs_1123/throwlab/start_r8.js runs the checks against the earlier copy.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.THROWLAB_FILE || 'stem_lab/stem_tool_throwlab.js';
const source = readFileSync(FILE, 'utf8');
const ui = readFileSync('ui_strings.js', 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = { getElementById: () => null, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }), head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {} };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(source, ctx, { filename: 'stem_tool_throwlab.js' });
  return win.StemLab && win.StemLab.ThrowLabModel;
}
const M = loadModel();

function titleOf(key) {
  const m = source.match(new RegExp("title: __alloT\\('stem\\.throwlab\\." + key + "', (['\"])(.*?)\\1\\)"));
  return m ? m[2] : null;
}
const isRegistered = (key) => new RegExp('"' + key + '":').test(ui);

describe('Throw Lab banner titles show the accurate English', () => {
  const KEYS = ['free_throw_15_ft_from_line_to_hoop', 'free_kick_22m_a_4_defender_wall', 'golf_tee_shot_driver_to_wedge', 'server_s_line_over_a_2_43m_net_in_9_9m'];

  it('every banner title uses an unregistered _v2 key, so its English is what students see', () => {
    for (const k of KEYS) {
      expect(titleOf(k), k + ' (old key still used)').toBeNull();
      expect(titleOf(k + '_v2'), k + '_v2').not.toBeNull();
      expect(isRegistered(k + '_v2'), k + '_v2 must not be registered with other text').toBe(false);
    }
  });

  it('each title agrees with the model it names', () => {
    expect(titleOf('free_throw_15_ft_from_line_to_hoop_v2')).toBe('Basketball \\u2014 shots and passes');
    const bb = M.MODES.freethrow.presets.map((p) => p.id);
    expect(bb).toEqual(expect.arrayContaining(['freethrow', 'three', 'halfcourt', 'bouncepass', 'chestpass']));
    const fk = M.MODES.freekick;
    expect(fk.targetZ).toBe(22);
    expect(fk.wallZ).toBeCloseTo(9.15, 9);
    expect(titleOf('free_kick_22m_a_4_defender_wall_v2')).toBe('Free Kick \\u2014 22 m plus a defender wall');
    const vb = M.MODES.volleyball;
    expect(vb.netHeight).toBe(2.43);
    expect(vb.courtHalfWidth * 2).toBe(9);
    expect(vb.netZ).toBe(9);
    expect(vb.targetZ - vb.netZ).toBe(9);           // the receiving court is 9 m deep
    expect(titleOf('server_s_line_over_a_2_43m_net_in_9_9m_v2')).toBe("Server's Line \\u2014 over a 2.43 m net, into a 9 × 9 m court");
    expect(titleOf('golf_tee_shot_driver_to_wedge_v2')).toBe('Golf Flight \\u2014 driver to wedge');
    const golfIds = M.MODES.golf.presets.map((p) => p.id);
    expect(golfIds).toContain('driver');
    expect(golfIds.some((id) => /wedge/.test(id))).toBe(true);
  });
});
