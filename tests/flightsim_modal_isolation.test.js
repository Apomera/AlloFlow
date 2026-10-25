import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, root, host, shell, topbar, shellAction, pageBranch, preservedBranch, latest, patchSaved, shellClicks;
const help = () => host.querySelector('[data-flightsim-help]');
const briefing = () => host.querySelector('#skyschool-drone-briefing');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const cockpit = () => host.querySelector('canvas[role="application"]');
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function patch(values) { await act(async () => patchSaved(values)); }
async function mutations(callback) {
  await act(async () => { callback?.(); await Promise.resolve(); await Promise.resolve(); });
}
async function mount() {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      menuSections: { challenges: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data.flightSim;
    patchSaved = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => setData(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function openHelp() {
  await click(host.querySelector('button[aria-label="Free Flight from Portland, ME"]'));
  await click(button('Controls and help'));
  expect(help()).toBeTruthy();
  return help();
}
async function openBriefing() {
  const opener = host.querySelector('[data-flight-challenge-id="drone_survey"]');
  await click(opener);
  expect(briefing()).toBeTruthy();
  expect(latest.droneBriefing).toBe(true);
  return opener;
}
function expectOutsideBlocked(dialog) {
  expect(topbar.hasAttribute('inert')).toBe(true);
  expect(pageBranch.hasAttribute('inert')).toBe(true);
  expect(host.hasAttribute('inert')).toBe(false);
  expect(shell.hasAttribute('inert')).toBe(false);
  expect(dialog.closest('[inert]')).toBeNull();
}
function expectRestored() {
  expect(topbar.hasAttribute('inert')).toBe(false);
  expect(pageBranch.hasAttribute('inert')).toBe(false);
  expect(preservedBranch.getAttribute('inert')).toBe('shell-owned');
  expect(preservedBranch.getAttribute('aria-hidden')).toBe('false');
}

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab(); window.__testHooks = {};
  tool = loadTool(process.env.SKYSCHOOL_MODAL_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } }));
  shell = document.createElement('section');
  shell.setAttribute('role', 'dialog'); shell.setAttribute('aria-label', 'STEAM Lab'); shell.setAttribute('aria-modal', 'true');
  topbar = document.createElement('header'); shellAction = document.createElement('button');
  shellAction.textContent = 'View XP'; shellClicks = vi.fn(); shellAction.addEventListener('click', shellClicks);
  topbar.appendChild(shellAction); shell.appendChild(topbar);
  host = document.createElement('main'); shell.appendChild(host); document.body.appendChild(shell);
  pageBranch = document.createElement('aside'); pageBranch.textContent = 'Application content behind the lab'; document.body.appendChild(pageBranch);
  preservedBranch = document.createElement('aside'); preservedBranch.setAttribute('inert', 'shell-owned');
  preservedBranch.setAttribute('aria-hidden', 'false'); document.body.appendChild(preservedBranch);
  root = ReactDOMClient.createRoot(host);
  await mount();
});

afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  shell?.remove(); pageBranch?.remove(); preservedBranch?.remove();
  delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School nested modal isolation', () => {
  it('isolates Help from shell and cockpit controls, including external focus and clicks', async () => {
    const dialog = await openHelp();
    expectOutsideBlocked(dialog);
    expect(cockpit().hasAttribute('inert')).toBe(true);
    await act(async () => { shellAction.focus(); shellAction.click(); });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(shellClicks).not.toHaveBeenCalled();
    expect(help()).toBe(dialog);
    expect(latest.view).toBe('flying');
  });

  it('isolates the drone briefing from app controls even when another script moves focus', async () => {
    await openBriefing();
    const dialog = briefing();
    expectOutsideBlocked(dialog);
    await act(async () => { shellAction.focus(); shellAction.click(); });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(shellClicks).not.toHaveBeenCalled();
    expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' });
  });

  it('prevents backdrop pointer actions from moving focus outside the drone briefing card', async () => {
    await openBriefing();
    const dialog = briefing(), backdrop = dialog.closest('[role="dialog"]');
    expect(backdrop === dialog).toBe(false);
    expect(backdrop.hasAttribute('inert')).toBe(false);
    const outsideHandler = vi.fn(() => shellAction.focus());
    backdrop.addEventListener('mousedown', outsideHandler); backdrop.addEventListener('click', outsideHandler);
    try {
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      await act(async () => { backdrop.dispatchEvent(down); backdrop.dispatchEvent(clickEvent); });
      expect(down.defaultPrevented).toBe(true); expect(clickEvent.defaultPrevented).toBe(true);
      expect(outsideHandler).not.toHaveBeenCalled();
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(briefing() === dialog).toBe(true);
      expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' });
    } finally {
      backdrop.removeEventListener('mousedown', outsideHandler); backdrop.removeEventListener('click', outsideHandler);
    }
  });

  it('releases Help isolation before restoring cockpit focus and ordinary shell input', async () => {
    await openHelp();
    expectOutsideBlocked(help());
    await click(button('Close help'));
    expect(help()).toBeNull(); expectRestored();
    expect(cockpit().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(cockpit());
    await click(shellAction);
    expect(shellClicks).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(shellAction);
  });

  it('restores the original mission opener after accepted cancellation and releases shell controls', async () => {
    const opener = await openBriefing();
    expectOutsideBlocked(briefing());
    await click(button('Cancel'));
    expect(briefing()).toBeNull(); expectRestored();
    expect(document.activeElement).toBe(opener);
    expect(latest).toMatchObject({ view: 'menu', droneBriefing: false, selectedChallenge: null });
    await click(shellAction); expect(shellClicks).toHaveBeenCalledOnce();
  });

  it('isolates a newly added app control for the remainder of the dialog visit', async () => {
    const dialog = await openHelp(), added = document.createElement('div'), action = document.createElement('button'), clicks = vi.fn();
    action.textContent = 'New app action'; action.addEventListener('click', clicks); added.appendChild(action);
    try {
      await mutations(() => document.body.appendChild(added));
      expect(added.hasAttribute('inert')).toBe(true);
      await click(action); expect(clicks).not.toHaveBeenCalled();
      expect(dialog.contains(document.activeElement)).toBe(true);
      await click(button('Close help'));
      expect(added.hasAttribute('inert')).toBe(false);
      await click(action); expect(clicks).toHaveBeenCalledOnce();
    } finally { added.remove(); }
  });

  it('releases a formerly external branch when it becomes dialog content', async () => {
    const branch = document.createElement('div'), action = document.createElement('button'), clicks = vi.fn();
    action.textContent = 'Moved into help'; action.addEventListener('click', clicks); branch.appendChild(action); document.body.appendChild(branch);
    try {
      const dialog = await openHelp();
      expect(branch.hasAttribute('inert')).toBe(true);
      await mutations(() => dialog.appendChild(branch));
      expect(branch.closest('[inert]')).toBeNull();
      await click(action); expect(clicks).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(action);
      await click(button('Close help')); expectRestored();
      expect(branch.hasAttribute('inert')).toBe(false);
    } finally { branch.remove(); }
  });

  it.each(['help', 'briefing'])('preserves a different owner’s inert attribute through the %s visit', async kind => {
    if (kind === 'help') await openHelp(); else await openBriefing();
    expectOutsideBlocked(kind === 'help' ? help() : briefing());
    expect(preservedBranch.getAttribute('inert')).toBe('shell-owned');
    expect(preservedBranch.getAttribute('aria-hidden')).toBe('false');
    await click(button(kind === 'help' ? 'Close help' : 'Cancel'));
    expectRestored();
  });

  it('cleans up Help isolation when navigation replaces the dialog without using Close', async () => {
    await openHelp(); expectOutsideBlocked(help());
    await patch({ view: 'lesson', selectedLesson: 'lift' });
    expect(help()).toBeNull(); expectRestored();
    expect(document.activeElement).toBe(host.querySelector('#skyschool-lesson-title'));
    await click(shellAction); expect(shellClicks).toHaveBeenCalledOnce();
  });

  it('releases briefing isolation on an accepted launch before the cockpit receives focus', async () => {
    await openBriefing(); expectOutsideBlocked(briefing());
    await click(button('✓ I Understand — Begin Flight'));
    expect(briefing()).toBeNull(); expectRestored();
    expect(latest.view).toBe('flying'); expect(cockpit()).toBeTruthy();
    expect(document.activeElement).toBe(cockpit());
    expect(cockpit().closest('[inert]')).toBeNull();
  });

  it.each(['help', 'briefing'])('releases every owned branch when an open %s tool unmounts', async kind => {
    if (kind === 'help') await openHelp(); else await openBriefing();
    expectOutsideBlocked(kind === 'help' ? help() : briefing());
    await act(async () => root.unmount()); root = null;
    expectRestored();
    await click(shellAction); expect(shellClicks).toHaveBeenCalledOnce();
  });

  it('keeps the same modal isolation and original opener while a briefing owner changes', async () => {
    const opener = await openBriefing();
    await patch({ selectedChallenge: 'drone_powerline' });
    expect(briefing()).toBeTruthy(); expectOutsideBlocked(briefing());
    await act(async () => shellAction.focus());
    expect(briefing().contains(document.activeElement)).toBe(true);
    await click(button('Cancel'));
    expect(briefing()).toBeNull(); expectRestored(); expect(document.activeElement).toBe(opener);
  });
});
