// B5: the Launch Pad coach must describe the doors the Launch Pad actually shows.
// Renders the REAL Launch Pad source with the coach  as
// its companion, exactly as AlloFlowANTI.txt wires it (embedded: true).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(REPO + '/package.json');
const WEB = REPO + '/desktop/web-app/node_modules';
let React, createRoot, act, LaunchPad, Coach;
const mounts = [];
const t = (key) => '\u00ab' + key + '\u00bb';

function compile(path, name) {
  const { transformSync } = require('@babel/core');
  const code = transformSync(readFileSync(path, 'utf8'), {
    babelrc: false, configFile: false,
    plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { useBuiltIns: false }]],
  }).code;
  return new Function('React', 'Unplug', code + '\nreturn ' + name + ';');
}

beforeAll(() => {
  React = require(WEB + '/react');
  ({ createRoot } = require(WEB + '/react-dom/client'));
  ({ act } = require(WEB + '/react-dom/test-utils'));
  LaunchPad = compile(REPO + '/view_launch_pad_source.jsx', 'LaunchPadView')(React, () => null);
  Coach = compile(REPO + '/onboarding_coach_source.jsx', 'OnboardingCoach')(React);
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  localStorage.clear();
  window.React = React;
  window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English' });
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); }
  delete window.AlloOnboarding;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function render(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  mounts.push({ root, host });
  act(() => root.render(element));
  return host;
}

function launchPadWithCoach(coachProps = {}) {
  const pickMode = vi.fn();
  const setRunTour = vi.fn();
  const companion = React.createElement(Coach, { t, setRunTour, embedded: true, pickMode, ...coachProps });
  const host = render(React.createElement(LaunchPad, {
    t, APP_CONFIG: {}, onChooseRole: vi.fn(), setHasSelectedMode: vi.fn(), setGuidedMode: vi.fn(),
    setHasSelectedRole: vi.fn(), setShowWizard: vi.fn(), setIsTeacherMode: vi.fn(), setShowLearningHub: vi.fn(),
    setShowEducatorHub: vi.fn(), setPendingRole: vi.fn(), setIsGateOpen: vi.fn(), setShowAIBackendModal: vi.fn(),
    companion,
  }));
  return { host, pickMode, setRunTour };
}

function openCoach(host) {
  const launcher = host.querySelector('[data-help-key="onboarding_ask_allobot_button"]');
  expect(launcher).not.toBeNull();
  act(() => { launcher.click(); });
  const panel = document.querySelector('[data-help-key="onboarding_panel"] [role="dialog"]');
  expect(panel).not.toBeNull();
  return panel;
}

const coachTitles = (panel) => Array.from(panel.querySelectorAll('[data-help-key^="onboarding_mode_"] h3')).map((h) => h.textContent.trim());

function launchPadDoorTitles(host) {
  const doors = Array.from(host.querySelectorAll('.lp-role-grid .lp-card-title')).map((n) => n.textContent.trim());
  const adult = host.querySelector('[data-pathway="adult"]');
  if (adult) doors.push(adult.textContent.trim());
  return doors;
}

describe('coach on the role-first Launch Pad', () => {
  it('lists exactly the doors the Launch Pad shows, with the same strings', () => {
    const { host } = launchPadWithCoach();
    const doors = launchPadDoorTitles(host);
    expect(doors).toEqual(['\u00abroles.teacher\u00bb', '\u00abroles.student\u00bb', '\u00ablaunch_pad.door_family\u00bb', '\u00ablaunch_pad.professional_tools\u00bb', '\u00ablaunch_pad.learn_independently\u00bb']);
    const panel = openCoach(host);
    expect(coachTitles(panel)).toEqual(doors);
  });

  it('does not describe the retired workspace cards', () => {
    const { host } = launchPadWithCoach();
    const text = openCoach(host).textContent;
    for (const gone of ['launch_pad.full_title', 'launch_pad.learning_tools_title', 'launch_pad.educator_tools_title', 'launch_pad.educator_tools_desc']) {
      expect(text.includes(gone), gone).toBe(false);
    }
  });

  it('reuses the Launch Pad door descriptions and names the full-workspace link', () => {
    const { host } = launchPadWithCoach();
    const panel = openCoach(host);
    const text = panel.textContent;
    for (const key of ['launch_pad.teacher_guided_desc', 'launch_pad.student_desc', 'launch_pad.door_family_desc', 'launch_pad.professional_tools_desc', 'launch_pad.teacher_full_link']) {
      expect(text.includes('\u00ab' + key + '\u00bb'), key).toBe(true);
      expect(host.textContent.includes('\u00ab' + key + '\u00bb'), 'Launch Pad also shows ' + key).toBe(true);
    }
  });

  it('follows the remembered teacher workspace the same way the Launch Pad does', () => {
    localStorage.setItem('alloflow_teacher_workspace', 'full');
    const { host } = launchPadWithCoach();
    const text = openCoach(host).textContent;
    expect(text.includes('\u00ablaunch_pad.teacher_return_full\u00bb')).toBe(true);
    expect(text.includes('\u00ablaunch_pad.teacher_guided_link\u00bb')).toBe(true);
    expect(host.textContent.includes('\u00ablaunch_pad.teacher_return_full\u00bb')).toBe(true);
  });

  it('announces the doors on open instead of the four retired modes', () => {
    const announce = vi.fn();
    window.AlloOnboarding = { announce };
    const { host } = launchPadWithCoach();
    openCoach(host);
    const msg = String(announce.mock.calls[0] && announce.mock.calls[0][0]);
    expect(msg.includes('Four mode options')).toBe(false);
    expect(msg.includes('onboarding.panel_open_announcement')).toBe(false);
    for (const door of ['roles.teacher', 'roles.student', 'launch_pad.door_family', 'launch_pad.professional_tools', 'launch_pad.learn_independently']) {
      expect(msg.includes(door), door).toBe(true);
    }
  });

  it('labels and dispatches AI door chips with the Launch Pad door names', async () => {
    const askCoach = vi.fn(() => Promise.resolve({ answer: 'Try Family.', actions: [{ kind: 'pick_mode', key: 'family', label: '' }, { kind: 'pick_mode', key: 'adult', label: '' }] }));
    window.AlloOnboarding = { askCoach, isCoachAvailable: () => true, hasCoachConsent: () => true, getCoachBuffer: () => [], getCoachUsage: () => ({ remaining: 20, cap: 20, used: 0 }), announce: vi.fn() };
    const { host, pickMode } = launchPadWithCoach();
    const panel = openCoach(host);
    const input = panel.querySelector('textarea, input[type="text"]');
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
    act(() => { setter.call(input, 'I help my son read'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    const send = Array.from(panel.querySelectorAll('button')).find((b) => /coach_send|Send/.test(b.getAttribute('aria-label') || b.textContent));
    expect(send).toBeTruthy();
    await act(async () => { send.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(askCoach).toHaveBeenCalledTimes(1);
    expect(askCoach.mock.calls[0][0].layout).toBe('roles');
    const chips = Array.from(panel.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(chips.includes('\u00ablaunch_pad.door_family\u00bb')).toBe(true);
    expect(chips.includes('\u00ablaunch_pad.learn_independently\u00bb')).toBe(true);
    const family = Array.from(panel.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === '\u00ablaunch_pad.door_family\u00bb');
    act(() => { family.click(); });
    expect(pickMode).toHaveBeenCalledWith('family');
  });
});

describe('coach on an older host without role doors', () => {
  it('still describes the four workspace cards that host shows', () => {
    const host = render(React.createElement(Coach, { t, setRunTour: vi.fn() }));
    const panel = openCoach(host);
    expect(coachTitles(panel)).toEqual(['\u00ablaunch_pad.full_title\u00bb', '\u00ablaunch_pad.guided_title\u00bb', '\u00ablaunch_pad.learning_tools_title\u00bb', '\u00ablaunch_pad.educator_tools_title\u00bb']);
  });
});
