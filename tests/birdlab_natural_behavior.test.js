import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const model = new Function('BIRDS', source.slice(source.indexOf('  var SCENE_BIRD_MOTION_OVERRIDES'), source.indexOf('  function sceneAppearanceCycleAllowed')) + '\nreturn sceneBirdBehaviorState;')({ robin: {}, nuthatch: {}, greatBlueHeron: {} });
const cases = [
  ['robin', 'forest', 'run-watch-probe', 'robin-forage', ['scan', 'scan', 'run', 'scan', 'probe', 'scan', 'alert']],
  ['robin', 'backyard', 'run-watch-probe', 'robin-forage', ['scan', 'scan', 'run', 'scan', 'probe', 'scan', 'alert']],
  ['nuthatch', 'forest', 'hitch-scan-probe', 'nuthatch-head-down', ['scan', 'scan', 'hitch', 'scan', 'probe', 'probe', 'scan']],
  ['greatBlueHeron', 'marsh', 'wait-stalk-strike', 'heron-strike', ['watch', 'watch', 'watch', 'stalk', 'watch', 'strike', 'recover']],
];

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); });

describe('Natural foraging sequences', () => {
  it.each(cases)('%s in %s reaches every action on the live scene clock', (species, habitat, script, pose, expected) => {
    const states = expected.map((_, tick) => model({ species }, 0, { phase: 'visible', localMs: 2000 + tick * 1000, trackable: true }, habitat));
    expect(states.map(s => s.state)).toEqual(expected);
    expect(states.every(s => s.script === script && s.pose === pose && s.trackable)).toBe(true);
  });

  it.each(cases)('%s in %s preserves the acquired action, with a legible static fallback', (species, habitat, script, pose, expected) => {
    const action = { script, pose, state: expected[4] };
    const frozen = model({ species }, 0, { phase: 'visible', localMs: 8300, pinned: true }, habitat, null, action);
    expect(frozen).toMatchObject({ ...action, trackable: true, frozen: true });
    const reduced = model({ species }, 0, { phase: 'visible', static: true }, habitat, null, action);
    expect(reduced.state).toBe(expected[0]);
    expect(reduced.frozen).toBeUndefined();
    for (const phase of ['entering', 'arriving', 'exiting', 'cooldown']) {
      expect(model({ species }, 0, { phase, localMs: 2000 }, habitat).trackable).toBe(false);
    }
  });

  it.each(cases)('%s in %s shares behavior and route styling with the binocular target', (species, habitat, script) => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', { birdLab: { view: 'ispy', activeHabitat: habitat, blSceneMotion: false } });
    const matches = [...host.querySelectorAll('[data-birdlab-behavior="' + script + '"][data-birdlab-species="' + species + '"]')];
    const actor = matches.find(el => el.querySelector('.birdlab-scene-actor'));
    const target = matches.find(el => el.querySelector('[data-birdlab-kind="bird"]'));
    expect(actor).toBeTruthy();
    expect(target).toBeTruthy();
    expect(actor.dataset.birdlabBehaviorState).toBe(target.dataset.birdlabBehaviorState);
    expect(actor.querySelector('.birdlab-motion-subject').getAttribute('style')).toBe(target.querySelector('.birdlab-motion-subject').getAttribute('style'));
  });
});
