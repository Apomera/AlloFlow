// Leadership Hub SHELL accessibility (2026-08-17).
//
// The four tabbed admin panels earned an axe-clean pass in August; the hub
// CONTAINER never had one, and this pass added about a dozen interactive
// controls to it (backup export/restore, the guide link, the Drive setup form
// with a URL and a token field, connect, save-now, disconnect, and a status
// line that changes after a save). New interactive UI in a suite that claims a
// clean scan is exactly the kind of claim that rots quietly, so the shell gets
// its own permanent scan here — in BOTH Drive states, because the configured
// state renders a different control set than the unconfigured one.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let AdminHubPanel;
let root;
let host;
let opener;

const SERIOUS = (results) => results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
// color-contrast is disabled the way every axe test in this repo disables it:
// jsdom computes no real colours. The suite's contrast is covered by the
// dedicated theme-contrast gates.
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require2(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AdminHub;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'admin_hub_module.js'), 'utf8'))();
  AdminHubPanel = window.AlloModules.AdminHub.AdminHubPanel;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  for (const node of [host, opener]) node?.remove();
  host = opener = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
  localStorage.clear();
});

async function mountHub() {
  opener = document.createElement('button');
  opener.type = 'button';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(AdminHubPanel, {
      isOpen: true, onClose: () => {}, t: () => null, openTool: () => {}, addToast: () => {},
    }));
    await new Promise((res) => setTimeout(res, 20));
  });
  return host.querySelector('[role="dialog"]');
}

describe('the hub shell passes axe in both Drive states', () => {
  it('unconfigured (backup buttons, guide link, setup opener)', async () => {
    const dialog = await mountHub();
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('[data-help-key="adminhub_drive_setup_open"]')).toBeTruthy();
    expect(SERIOUS(await axe.run(dialog, AXE_OPTS))).toEqual([]);
  });

  it('setup form open (URL + token fields, connect)', async () => {
    const dialog = await mountHub();
    await act(async () => { dialog.querySelector('[data-help-key="adminhub_drive_setup_open"]').click(); });
    const url = dialog.querySelector('input[type="url"]');
    const token = dialog.querySelector('input[type="password"]');
    expect(url).toBeTruthy();
    expect(token).toBeTruthy();
    expect(SERIOUS(await axe.run(dialog, AXE_OPTS))).toEqual([]);
  });

  it('connected (status line, save-now, disconnect)', async () => {
    localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({
      url: 'https://script.google.com/x/exec', token: 't', folder: 'AlloFlow Leadership Hub Backups',
      lastSavedAt: '2026-08-17T15:00:00Z', lastHash: 'h',
    }));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ json: async () => ({ ok: true }) }));
    const dialog = await mountHub();
    expect(dialog.querySelector('[data-help-key="adminhub_drive_status"]')).toBeTruthy();
    expect(dialog.querySelector('[data-help-key="adminhub_drive_save_now"]')).toBeTruthy();
    expect(SERIOUS(await axe.run(dialog, AXE_OPTS))).toEqual([]);
  });
});

describe('the specific affordances a leader needs (beyond what axe can see)', () => {
  it('both Drive fields have real labels, not placeholder-only naming', async () => {
    const dialog = await mountHub();
    await act(async () => { dialog.querySelector('[data-help-key="adminhub_drive_setup_open"]').click(); });
    for (const sel of ['input[type="url"]', 'input[type="password"]']) {
      const field = dialog.querySelector(sel);
      const id = field.getAttribute('id');
      const labelled = id && dialog.querySelector('label[for="' + id + '"]');
      expect(labelled, sel + ' must have a <label for> (placeholder text is not a name)').toBeTruthy();
      expect(labelled.textContent.trim().length).toBeGreaterThan(2);
    }
  });

  it('the backup status is a polite live region, so a save is ANNOUNCED not just shown', async () => {
    localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({
      url: 'https://x/exec', token: 't', folder: 'F', lastSavedAt: '2026-08-17T15:00:00Z', lastHash: 'h',
    }));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ json: async () => ({ ok: true }) }));
    const dialog = await mountHub();
    const status = dialog.querySelector('[data-help-key="adminhub_drive_status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('role')).toBe('status');
  });

  it('the guide link warns that it opens a new tab (target=_blank naming)', async () => {
    const dialog = await mountHub();
    const link = dialog.querySelector('[data-help-key="adminhub_guide_link"]');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    const name = (link.getAttribute('aria-label') || link.textContent || '').toLowerCase();
    expect(name, 'a new-tab link must say so in its accessible name').toMatch(/new tab|opens in/);
  });

  it('every control in the backup area is keyboard-reachable and named', async () => {
    localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({ url: 'https://x/exec', token: 't', folder: 'F', lastSavedAt: null, lastHash: null }));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ json: async () => ({ ok: true }) }));
    const dialog = await mountHub();
    const section = dialog.querySelector('[data-help-key="adminhub_backup_section"]');
    // Assert the controls by identity, not by a magic count (my first draft
    // guessed 5 and the honest number is 4 — the guide link sits outside this
    // section, beneath the covenant).
    for (const key of ['adminhub_backup_export', 'adminhub_backup_restore', 'adminhub_drive_save_now', 'adminhub_drive_disconnect']) {
      expect(section.querySelector('[data-help-key="' + key + '"]'), key + ' must be present').toBeTruthy();
    }
    const controls = Array.from(section.querySelectorAll('button, a[href], input'));
    expect(controls.length).toBeGreaterThanOrEqual(4);
    for (const el of controls) {
      expect(el.getAttribute('tabindex'), 'nothing here may be removed from the tab order').not.toBe('-1');
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
      expect(name.length, (el.getAttribute('data-help-key') || el.tagName) + ' needs an accessible name').toBeGreaterThan(1);
    }
  });
});
