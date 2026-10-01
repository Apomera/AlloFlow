import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_project_settings_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let ProjectSettingsView;
let root;
let host;
let opener;

const translations = {
  'project_settings.title': 'Student Project Settings',
  'project_settings.enable_dictation': 'Enable Dictation in Student Mode',
  'project_settings.dictation_desc': 'Allow students to use voice-to-text input.',
  'project_settings.enable_socratic': 'Enable Socratic Tutor',
  'project_settings.socratic_desc': 'Allow students to ask AI for hints.',
  'project_settings.socratic_instructions_label': 'Socratic Tutor Guidance',
  'project_settings.socratic_instructions_desc': 'Optional lesson guidance.',
  'project_settings.socratic_instructions_placeholder': 'Tutor guidance',
  'project_settings.enable_free_response': 'Allow Adventure Free Response',
  'project_settings.free_response_desc': 'Allow typed actions.',
  'project_settings.enable_persona_free': 'Allow Interview Free Response',
  'project_settings.persona_free_desc': 'Allow typed questions.',
  'project_settings.unlock_xp': 'Global XP to Unlock Adventure',
  'project_settings.unlock_xp_desc': 'Required XP.',
  'project_settings.base_xp': 'Base XP Per Level',
  'project_settings.base_xp_desc': 'Difficulty curve.',
  'project_settings.storybook_xp': 'Adventure XP to Unlock Storybook',
  'project_settings.storybook_xp_desc': 'Required Adventure XP.',
  'project_settings.permissions_header': 'Adventure Permissions',
  'project_settings.perm_difficulty': 'Allow Difficulty Change',
  'project_settings.perm_mode': 'Allow Mode Switching',
  'project_settings.perm_custom': 'Allow Custom Prompting',
  'project_settings.perm_visuals': 'Allow Visuals Toggle',
  'project_settings.perm_lock_all': 'Lock All Adventure Settings',
  'project_settings.portal_qr_aria': 'Educator Evaluation district portal QR code',
  'project_settings.portal_qr_label': 'Portal QR code',
  'project_settings.portal_qr_title': 'Open the district evaluation portal on another device',
  'common.close': 'Close',
  'a11y.report_problem': 'Report a problem',
};

const defaultSettings = {
  hideStudentAiFeatures: false,
  allowStudentByokAi: false,
  allowDictation: true,
  allowSocraticTutor: true,
  allowFreeResponse: true,
  allowPersonaFreeResponse: true,
  nickname: '',
  baseXP: 100,
  adventureUnlockXP: 0,
  adventureMinXP: 0,
  adventurePermissions: {
    allowDifficultySwitch: true,
    allowModeSwitch: false,
    allowCustomInstructions: false,
    allowLanguageSwitch: true,
    allowVisualsToggle: true,
    allowCloudImageStorage: false,
    lockAllSettings: false,
  },
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('view_project_settings_module.js');
  ProjectSettingsView = window.AlloModules.ProjectSettingsView;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  if (opener) opener.remove();
  opener = null;
  window.__alloFocusTrapStack = [];
  delete window.__alloMakeQrSvg;
  vi.restoreAllMocks();
});

async function renderDialog({ connected = false } = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open Project Settings';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const close = vi.fn();
  const portalUrl = connected
    ? 'https://script.google.com/macros/s/AKfycb-example/exec'
    : '';

  function Fixture() {
    const [open, setOpen] = React.useState(true);
    const [settings, setSettings] = React.useState(defaultSettings);
    if (!open) return null;
    return React.createElement(ProjectSettingsView, {
      t: (key) => translations[key] || key,
      studentProjectSettings: settings,
      setStudentProjectSettings: setSettings,
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      handleSetIsProjectSettingsOpenToFalse: () => {
        close();
        setOpen(false);
      },
      onOpenPrincipalEvaluation: vi.fn(),
      evaluationPortalUrl: portalUrl,
      isEvaluationPortalConnected: connected,
      onSaveEvaluationPortalUrl: vi.fn(() => ({ ok: true, url: portalUrl })),
      rewardsPortalUrl: portalUrl,
      isRewardsPortalConnected: connected,
      onSaveRewardsPortalUrl: vi.fn(() => ({ ok: true, url: portalUrl })),
      onOpenSchoolRewards: vi.fn(),
    });
  }

  await act(async () => {
    root.render(React.createElement(Fixture));
  });
  return { close, dialog: host.querySelector('[role="dialog"]') };
}

describe('Project Settings accessibility', () => {
  it('moves focus inside, wraps Tab, closes on Escape, and restores its opener', async () => {
    const { close, dialog } = await renderDialog();
    expect(document.activeElement).toBe(dialog);

    const focusables = Array.from(dialog.querySelectorAll(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])'
    ));
    const first = focusables[0];
    const last = focusables.at(-1);
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    await act(async () => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('gives the generated QR image a valid role and keeps pending output live', async () => {
    window.__alloMakeQrSvg = vi.fn(async () => (
      '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'
    ));
    const { dialog } = await renderDialog({ connected: true });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const qr = dialog.querySelector('[role="img"]');
    expect(qr?.getAttribute('aria-label')).toBe('Educator Evaluation district portal QR code');
    expect(source).toContain("role={state.status === 'error' ? 'alert' : 'status'}");
    expect(source).toContain('aria-live="polite"');
  });

  it('uses the full visible feedback label and allows the long setup path to wrap', async () => {
    const { dialog } = await renderDialog();
    const feedback = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Report a problem or send feedback'));
    expect(feedback).toBeTruthy();
    expect(feedback.hasAttribute('aria-label')).toBe(false);
    expect(source).toContain('<code className="break-all">apps_script/educator_evaluation/README.md</code>');
    expect(source).toContain('className="allo-docsuite flex max-h-[92vh]');
  });
});
