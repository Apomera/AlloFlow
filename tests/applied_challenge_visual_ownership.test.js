import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const MANUAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let React, ReactDOM, root, host, latest, setResource, setProfile, requests;

beforeAll(() => {
  React = require(resolve(modules, 'react'));
  ReactDOM = require(resolve(modules, 'react-dom/client'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('image_asset_editor_module.js');
  loadAlloModule('applied_challenge_module.js');
  const RealEditor = window.AlloModules.ImageAssetEditor;
  window.AlloModules.ImageAssetEditor = props => React.createElement(RealEditor, {
    ...props, renderImageAsset: async () => ({ dataUrl: MANUAL }),
  });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
});
async function click(label) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent === label);
  expect(button, label).toBeTruthy(); expect(button.disabled).toBe(false);
  await React.act(async () => button.click());
}
async function render() {
  requests = [];
  function App() {
    const [resource, updateResource] = React.useState({ id: 'visual-owner', type: 'applied-challenge', data: window.AlloModules.AppliedChallenge.normalize({
      title: 'Water decision', family: 'decide', agencyMode: 'ai-framed', scope: 'compact',
      brief: { context: 'A school garden considers watering choices.', drivingQuestion: 'Which method should we try?', lockedLessonFacts: ['Water can soak into soil.'], criteria: ['Use lesson facts.'], constraints: ['No invented measurements.'], factLocked: true, factVerified: true },
      visual: { image: PNG, alt: 'Two garden beds beside a watering can.', purpose: 'Show the setting without a solution.', source: 'uploaded', reviewed: true },
    }) });
    const [profile, updateProfile] = React.useState('teacher-a');
    latest = resource; setResource = updateResource; setProfile = updateProfile;
    return React.createElement(window.AlloModules.AppliedChallengeView, {
      generatedContent: resource, isTeacherMode: true, activeProfileId: profile, addToast: vi.fn(),
      handleNoteUpdate: (key, value) => updateResource(previous => ({ ...previous, data: { ...previous.data, [key]: typeof value === 'function' ? value(previous.data[key]) : value } })),
      callImagen: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOM.createRoot(host);
  await React.act(async () => root.render(React.createElement(App)));
  await click('Edit challenge brief');
  [...host.querySelectorAll('details')].forEach(details => { details.open = true; });
}
async function applyCrop() {
  const crop = [...host.querySelectorAll('input[type="radio"]')].find(input => input.parentElement.textContent.includes('Crop to frame'));
  expect(crop).toBeTruthy(); await React.act(async () => crop.click());
  await click('Use edited image');
}

describe('Applied illustration ownership', () => {
  it.each(['success', 'failure'])('keeps an applied crop when an older image request finishes with %s', async outcome => {
    await render(); await click('Fit or crop illustration'); await click('Generate optional illustration');
    await applyCrop(); expect(latest.data.visual.image).toBe(MANUAL);
    await React.act(async () => outcome === 'success' ? requests[0].resolve(PNG) : requests[0].reject(Error('Late failure')));
    expect(latest.data.visual.image).toBe(MANUAL);
    expect(latest.data.visual.reviewed).toBe(false);
    expect(host.textContent).not.toContain('The illustration could not be created.');
    expect([...host.querySelectorAll('button')].find(node => node.textContent === 'Generate optional illustration').disabled).toBe(false);
  });
  it('keeps the newer request active when the cancelled request resolves', async () => {
    await render(); await click('Fit or crop illustration'); await click('Generate optional illustration'); await applyCrop();
    await click('Generate optional illustration');
    await React.act(async () => requests[0].resolve(PNG));
    expect(latest.data.visual.image).toBe(MANUAL);
    expect(host.textContent).toContain('Creating illustration…');
    await React.act(async () => requests[1].resolve(PNG));
    expect(latest.data.visual).toMatchObject({ image: PNG, source: 'generated', alt: '', reviewed: false });
  });
  it.each(['profile', 'resource', 'pixels', 'purpose', 'context', 'remove'])('rejects a late illustration after changing %s', async change => {
    await render(); await click('Generate optional illustration');
    if (change === 'remove') await click('Remove illustration');
    else await React.act(async () => {
      if (change === 'profile') setProfile('teacher-b');
      else setResource(previous => change === 'resource' ? { ...previous, id: 'other-resource' } : { ...previous, data: { ...previous.data,
        ...(change === 'context' ? { brief: { ...previous.data.brief, context: 'A different setting.' } } : { visual: { ...previous.data.visual, ...(change === 'pixels' ? { image: MANUAL } : { purpose: 'A different purpose.' }) } }),
      } });
    });
    const saved = latest.data.visual;
    await React.act(async () => requests[0].resolve(MANUAL));
    expect(latest.data.visual).toEqual(saved);
  });
});
