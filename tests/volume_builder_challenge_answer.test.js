// Volume Builder Random Challenge (2026-11-18): the readout showed the volume, and the unit-cube count, the student
// was asked to find, the moment the challenge set the prism. It now shows the formula with "?" until the answer is
// right. And the check read the answer with parseInt, so "24.9" or "24abc" counted as 24.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let View, root, host;
beforeAll(() => {
  window.React = React;
  loadAlloModule('view_misc_panels_module.js');
  View = window.AlloModules.VolumeBuilderView;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host && host.remove(); root = null; });

// A small stateful host, so Check really updates the feedback the readout reads.
function Host({ challenge, answer }) {
  const [cubeAnswer, setCubeAnswer] = React.useState(answer);
  const [cubeFeedback, setCubeFeedback] = React.useState(null);
  const [cubeChallenge, setCubeChallenge] = React.useState(challenge);
  const noop = () => {};
  return React.createElement(View, {
    mathMode: 'Volume Builder', cubeAnswer, setCubeAnswer, cubeFeedback, setCubeFeedback, cubeChallenge, setCubeChallenge,
    cubeDims: { l: challenge.l, w: challenge.w, h: challenge.h }, cubeDragRef: { current: null }, cubeNotch: { l: 1, w: 1, h: 1 },
    cubeRotation: { x: -25, y: -35 }, cubeScale: 1, cubeShape: challenge.shape, cubeShowLayers: null, exploreDifficulty: 'medium',
    getAdaptiveDifficulty: () => 'medium', setCubeDims: noop, setCubeNotch: noop, setCubeRotation: noop, setCubeScale: noop,
    setCubeShape: noop, setCubeShowLayers: noop, setExploreDifficulty: noop, t: () => '',
  });
}
async function mount(challenge, answer) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, { challenge, answer })));
}
const readout = () => host.querySelector('[data-help-key="volume_builder_volume_readout"]').textContent;
const check = async () => { await act(async () => host.querySelector('[data-help-key="volume_builder_check_btn"]').click()); };
const feedback = () => (host.querySelector('p.text-sm.font-bold.mt-2') || {}).textContent || '';

describe('Volume Builder challenge keeps the answer back', () => {
  it('a rectangular challenge shows the formula with ? until it is answered right', async () => {
    await mount({ l: 4, w: 3, h: 2, shape: 'rect', answer: 24 }, '24');
    expect(readout()).toContain('V = 4 × 3 × 2 = ?');
    expect(readout()).not.toContain('24');
    expect(readout()).toContain('How many unit cubes?');
    await check();
    expect(feedback()).toContain('Correct');
    expect(readout()).toContain('= 24');
    expect(readout()).toContain('24 unit cubes');
  });
  it('an L-block keeps back both the subtraction and the result', async () => {
    await mount({ l: 4, w: 3, h: 2, shape: 'lblock', notch: { l: 1, w: 1, h: 1 }, answer: 23 }, '20');
    expect(readout()).toContain('(4×3×2) − (1×1×1) = ?');
    expect(readout()).not.toMatch(/24 − 1|= 23/);
    await check();
    expect(feedback()).toContain('Not quite');
    expect(readout()).toContain('?');
  });
  it('the number typed must be the answer: no rounding down, no trailing letters', async () => {
    for (const typed of ['24.9', '24abc', '2 4']) {
      await mount({ l: 4, w: 3, h: 2, shape: 'rect', answer: 24 }, typed);
      await check();
      expect(feedback(), typed).toContain('Not quite');
      await act(async () => root.unmount()); host.remove(); root = null;
    }
    for (const typed of ['24', ' 24 ', '24.0']) {
      await mount({ l: 4, w: 3, h: 2, shape: 'rect', answer: 24 }, typed);
      await check();
      expect(feedback(), typed).toContain('Correct');
      await act(async () => root.unmount()); host.remove(); root = null;
    }
  });
});
