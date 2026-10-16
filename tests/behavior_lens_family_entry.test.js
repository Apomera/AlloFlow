import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let host;
let root;
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === text);
const click = async element => {
  expect(element).toBeTruthy();
  await React.act(async () => element.click());
};
const mount = async props => {
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({
    studentNickname: 'Learner A', isCanvasEnv: true, isTeacherMode: true, familyOnly: true,
    dashboardData: [{ studentNickname: 'Other learner' }],
    ...props,
  }))));
  await React.act(async () => { await new Promise(resolveTick => setTimeout(resolveTick, 350)); });
};

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setupBehaviorLens();
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete window.__alloFirebase;
  localStorage.setItem('bl_staff_role', 'bcba');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await React.act(async () => root.unmount());
  host.remove();
});

describe('Family entry stays in family supports', () => {
  it('ignores remembered staff role and does not offer role switching', async () => {
    await mount();
    expect(button('Add home observation')).toBeTruthy();
    expect(button('Download backup')).toBeFalsy();
    expect(host.querySelector('[aria-label="Family Mode"]')).toBeNull();
    await click(button('Student settings'));
    expect(host.querySelector('[aria-label="Use teacher view"], [aria-label="Use specialist view"]')).toBeNull();
    expect(host.textContent).not.toContain('Other learner');
    expect(localStorage.getItem('bl_staff_role')).toBe('bcba');
    await click(button('All tools'));
    expect(host.querySelector('[aria-label="Use teacher view"], [aria-label="Use specialist view"], [aria-label="Family Mode"]')).toBeNull();
    expect(host.querySelector('[aria-label="Open ABC Data"]')).toBeNull();
  });

  it('does not list staff dashboard learners when no family learner is selected', async () => {
    await mount({ studentNickname: '' });
    expect(host.textContent).not.toContain('Other learner');
    expect(host.querySelector('select[aria-label="Choose a student"]')).toBeNull();
    expect(host.querySelector('[aria-label="Use teacher view"], [aria-label="Use specialist view"]')).toBeNull();
  });

  it('leaves the existing staff role controls available outside the Family entry', async () => {
    await mount({ familyOnly: false });
    expect(host.querySelector('[aria-label="Family Mode"]')).not.toBeNull();
    await click(button('Student and role settings'));
    const specialist = host.querySelector('[aria-label="Use specialist view"]');
    expect(specialist).not.toBeNull();
    expect(specialist.getAttribute('aria-pressed')).toBe('true');
  });
});
