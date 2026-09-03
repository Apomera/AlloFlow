// School Rewards & Store panel (2026-09-02).
//
// School Rewards used to be the only Leadership Hub tool with no in-app
// surface: the card was a launcher and the connect form lived in Project
// Settings. This panel follows the Educator Evaluation pattern (launcher +
// deployment check when connected, a resumable setup checklist otherwise).
// These tests mount the built module both ways, drive the copy-source and
// connect flows, scan both states with axe, and pin the host wiring and the
// CDN package mirror the copy controls fetch from.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Simulate;
let axe;
let SchoolRewardsPanel;
let testing;
let root;
let host;

const PORTAL = 'https://script.google.com/macros/s/AKfycbxyz_123-abc/exec';
const PACKAGE = {};
for (const name of ['Code.gs', 'Portal.html', 'Index.html', 'appsscript.json']) {
  PACKAGE[name] = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards', name), 'utf8');
}
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };
const SERIOUS = (results) => results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act, Simulate } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require2(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SchoolRewards;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'school_rewards_module.js'), 'utf8'))();
  SchoolRewardsPanel = window.AlloModules.SchoolRewards.SchoolRewardsPanel;
  testing = window.AlloModules.SchoolRewards._testing;
});

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const name = String(url).split('/').pop();
    if (PACKAGE[name]) return { ok: true, text: async () => PACKAGE[name] };
    return { ok: false, text: async () => '' };
  });
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  delete window.alloCopyText;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
  localStorage.clear();
});

async function mountPanel(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(SchoolRewardsPanel, { isOpen: true, onClose: () => {}, t: () => null, addToast: () => {}, ...props }));
    await new Promise((res) => setTimeout(res, 30));
  });
  return host.querySelector('[role="dialog"]');
}

async function settle(fn) {
  await act(async () => { fn(); await new Promise((res) => setTimeout(res, 40)); });
}

describe('not connected: the setup checklist', () => {
  it('opens on the checklist with the first step next and no launcher buttons', async () => {
    const dialog = await mountPanel({ portalUrl: '' });
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('[data-help-key="schoolrewards_status"]').textContent).toMatch(/Not connected/);
    expect(dialog.querySelector('[data-help-key="schoolrewards_open_portal"]')).toBeNull();
    expect(dialog.querySelector('[data-help-key="schoolrewards_next_step"]').textContent).toMatch(/Confirm district review/);
    expect(dialog.querySelector('#schoolrewards-setup-body').hidden).toBe(false);
    expect(dialog.querySelectorAll('[data-help-key="schoolrewards_copy_source"]').length).toBe(4);
    expect(SERIOUS(await axe.run(dialog, AXE_OPTS))).toEqual([]);
  });

  it('copying a package file marks its step and advances the next-step banner', async () => {
    window.alloCopyText = vi.fn(async () => true);
    const dialog = await mountPanel({ portalUrl: '' });
    const buttons = Array.from(dialog.querySelectorAll('[data-help-key="schoolrewards_copy_source"]'));
    const codeButton = buttons.find((b) => /Code\.gs/.test(b.textContent));
    await settle(() => codeButton.click());
    expect(window.alloCopyText).toHaveBeenCalledTimes(1);
    expect(window.alloCopyText.mock.calls[0][0]).toContain('function setupSchoolRewardsRepository');
    expect(codeButton.textContent).toBe('Copied Code.gs');
    expect(dialog.querySelector('#sr-step-code').checked).toBe(true);
    expect(JSON.parse(localStorage.getItem(testing.SR_SETUP_KEY)).steps).toContain('code');
  });

  it('refuses a package file that fails its signature and copies nothing', async () => {
    globalThis.fetch.mockImplementation(async () => ({ ok: true, text: async () => '<html>404</html>' }));
    window.alloCopyText = vi.fn(async () => true);
    const dialog = await mountPanel({ portalUrl: '' });
    const manifestButton = Array.from(dialog.querySelectorAll('[data-help-key="schoolrewards_copy_source"]')).find((b) => /appsscript/.test(b.textContent));
    await settle(() => manifestButton.click());
    expect(window.alloCopyText).not.toHaveBeenCalled();
    expect(dialog.querySelector('#sr-step-manifest').checked).toBe(false);
    expect(dialog.textContent).toMatch(/Unexpected source received/);
  });

  it('when the clipboard is blocked, shows the source pre-selected and a manual copy completes the step', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true, writable: true });
    const originalExec = document.execCommand;
    document.execCommand = vi.fn(() => false);
    try {
      const dialog = await mountPanel({ portalUrl: '' });
      const portalButton = Array.from(dialog.querySelectorAll('[data-help-key="schoolrewards_copy_source"]')).find((b) => /Portal\.html/.test(b.textContent));
      await settle(() => portalButton.click());
      const textarea = dialog.querySelector('#sr-manual-portal-html');
      expect(textarea).toBeTruthy();
      expect(textarea.value.replace(/\r\n/g, '\n')).toBe(PACKAGE['Portal.html'].replace(/\r\n/g, '\n'));
      expect(document.activeElement).toBe(textarea);
      await settle(() => Simulate.copy(textarea));
      expect(dialog.querySelector('#sr-step-portal').checked).toBe(true);
      expect(dialog.querySelector('#sr-manual-portal-html')).toBeNull();
    } finally {
      document.execCommand = originalExec;
      delete navigator.clipboard;
    }
  });

  it('generates the one-time setup wrapper from the form and persists the form', async () => {
    const dialog = await mountPanel({ portalUrl: '' });
    const setValue = (el, value) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = Array.from(dialog.querySelectorAll('[data-help-key="schoolrewards_step_setup"] input[type="text"], [data-help-key="schoolrewards_step_setup"] input:not([type])'));
    await settle(() => {
      setValue(inputs[0], "St. Mary's Elementary");
      setValue(inputs[1], 'school.example');
      setValue(inputs[2], '2026-27');
      setValue(inputs[3], '10, 0, 50, 50');
    });
    const snippet = dialog.querySelector('#schoolrewards-setup-snippet').value;
    expect(snippet).toContain('function runInitialSchoolRewardsSetup()');
    expect(snippet).toContain("schoolName: 'St. Mary\\'s Elementary'");
    expect(snippet).toContain("allowedDomain: 'school.example'");
    expect(snippet).toContain('levelThresholds: [0, 10, 50]');
    expect(snippet).toContain('seedHowls: true');
    expect(JSON.parse(localStorage.getItem(testing.SR_SETUP_KEY)).form.allowedDomain).toBe('school.example');
  });

  it('the connect step validates the URL and reports through the host when one is present', async () => {
    const onSavePortalUrl = vi.fn((value) => value.startsWith('https://script.google.com') ? { ok: true, url: value, connected: true } : { ok: false, error: 'bad url' });
    const dialog = await mountPanel({ portalUrl: '', onSavePortalUrl });
    const input = dialog.querySelector('#schoolrewards-portal-url');
    const form = input.closest('form');
    const setValue = (value) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await settle(() => setValue('https://example.com/macros/s/abc/exec'));
    await settle(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onSavePortalUrl).toHaveBeenCalledWith('https://example.com/macros/s/abc/exec');
    expect(dialog.querySelector('#schoolrewards-portal-url-help').textContent).toBe('bad url');
    expect(dialog.querySelector('[data-help-key="schoolrewards_status"]').textContent).toMatch(/Not connected/);
    await settle(() => setValue(PORTAL));
    await settle(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(dialog.querySelector('[data-help-key="schoolrewards_status"]').textContent).toBe('Connected');
    expect(dialog.querySelector('#sr-step-connected').checked).toBe(true);
    expect(dialog.querySelector('[data-help-key="schoolrewards_open_portal"]')).toBeTruthy();
  });

  it('without a host, the connect step saves to the shared storage key the settings view reads', async () => {
    const dialog = await mountPanel({ portalUrl: '' });
    const input = dialog.querySelector('#schoolrewards-portal-url');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, PORTAL);
    await settle(() => input.dispatchEvent(new Event('input', { bubbles: true })));
    await settle(() => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(localStorage.getItem('allo_school_rewards_portal_url_v1')).toBe(PORTAL);
  });
});

describe('connected: the launcher', () => {
  it('shows the saved deployment, opens the portal through the host, and opens the health check', async () => {
    const onOpenPortal = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue({});
    const dialog = await mountPanel({ portalUrl: PORTAL, onOpenPortal });
    expect(dialog.querySelector('[data-help-key="schoolrewards_status"]').textContent).toBe('Connected');
    expect(dialog.querySelector('#schoolrewards-saved-url').value).toBe(PORTAL);
    expect(dialog.querySelector('#schoolrewards-setup-body').hidden).toBe(true);
    await settle(() => dialog.querySelector('[data-help-key="schoolrewards_open_portal"]').click());
    expect(onOpenPortal).toHaveBeenCalledTimes(1);
    await settle(() => dialog.querySelector('[data-help-key="schoolrewards_open_check"]').click());
    expect(open).toHaveBeenCalledWith(PORTAL + '?api=status', '_blank', 'noopener,noreferrer');
    expect(SERIOUS(await axe.run(dialog, AXE_OPTS))).toEqual([]);
  });

  it('the checklist can be reopened and the next step is verification', async () => {
    const dialog = await mountPanel({ portalUrl: PORTAL });
    await settle(() => dialog.querySelector('[data-help-key="schoolrewards_toggle_setup"]').click());
    expect(dialog.querySelector('#schoolrewards-setup-body').hidden).toBe(false);
    expect(dialog.querySelector('#sr-step-connected').checked).toBe(true);
    expect(dialog.querySelector('#sr-step-connected').disabled).toBe(true);
  });

  it('disconnecting on this device returns to the checklist', async () => {
    const onSavePortalUrl = vi.fn(() => ({ ok: true, url: '', connected: false }));
    const dialog = await mountPanel({ portalUrl: PORTAL, onSavePortalUrl });
    await settle(() => dialog.querySelector('[data-help-key="schoolrewards_disconnect"]').click());
    expect(onSavePortalUrl).toHaveBeenCalledWith('');
    expect(dialog.querySelector('[data-help-key="schoolrewards_status"]').textContent).toMatch(/Not connected/);
  });

  it('Escape closes and focus returns to the opener', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const dialog = await mountPanel({ portalUrl: PORTAL, onClose });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await settle(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); root = null;
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('helpers', () => {
  it('accepts only an Apps Script /exec deployment URL', () => {
    expect(testing.srNormalizePortalUrl(PORTAL + '?x=1')).toBe('');
    expect(testing.srNormalizePortalUrl('https://example.com/macros/s/abc/exec')).toBe('');
    expect(testing.srNormalizePortalUrl('http://script.google.com/macros/s/abc/exec')).toBe('');
    expect(testing.srNormalizePortalUrl(' ' + PORTAL + ' ')).toBe(PORTAL);
  });

  it('thresholds always start at zero, dedupe, and fall back to the defaults', () => {
    expect(testing.srParseThresholds('')).toEqual([0, 25, 75, 150, 300]);
    expect(testing.srParseThresholds('300 150 75')).toEqual([0, 75, 150, 300]);
  });
});

describe('host wiring and package mirror', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('the shell lazy-loads the module and renders the panel through a gate with the shared URL state', () => {
    expect(anti).toContain("loadModule('SchoolRewards', 'https://alloflow-cdn.pages.dev/school_rewards_module.js?v=");
    expect(anti).toContain('moduleKey="SchoolRewards.SchoolRewardsPanel"');
    expect(anti).toContain('portalUrl: schoolRewardsPortalUrl,');
    expect(anti).toContain('onSavePortalUrl: handleSaveSchoolRewardsPortalUrl,');
    expect(anti).toContain('onOpenPortal: handleOpenSchoolRewardsPortal,');
    // The hub card and the Project Settings button both open the panel.
    expect(anti.split('onOpenSchoolRewards: handleOpenSchoolRewards').length - 1).toBe(2);
    expect(anti).toContain('rewardsPortalUrl: schoolRewardsPortalUrl,');
    expect(anti).toContain('onSaveRewardsPortalUrl: handleSaveSchoolRewardsPortalUrl,');
  });

  it('the panel and the hub backup share the storage prefix', () => {
    const hub = readFileSync(resolve(process.cwd(), 'admin_hub_source.jsx'), 'utf8');
    expect(hub).toContain("{ prefix: 'allo_school_rewards_', tool: 'School Rewards & Store' }");
    expect(testing.SR_PORTAL_URL_KEY.startsWith('allo_school_rewards_')).toBe(true);
    expect(testing.SR_SETUP_KEY.startsWith('allo_school_rewards_')).toBe(true);
  });

  it('publishes every copyable package file to the CDN mirror byte-for-byte', () => {
    for (const name of ['Code.gs', 'Portal.html', 'Index.html', 'appsscript.json', 'README.md']) {
      expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/apps_script/school_rewards', name), 'utf8'))
        .toBe(readFileSync(resolve(process.cwd(), 'apps_script/school_rewards', name), 'utf8'));
    }
    expect(readFileSync(resolve(process.cwd(), 'build.js'), 'utf8')).toContain("'apps_script/school_rewards'");
  });

  it('every signature the copy controls check really exists in the package', () => {
    for (const file of testing.SR_FILES) {
      for (const token of file.signatures) expect(PACKAGE[file.name], file.name + ' must contain ' + token).toContain(token);
    }
  });
});

describe('IT handoff (2026-09-02)', () => {
  it('copies plain-language instructions with links to the sources and the generated setup function', async () => {
    window.alloCopyText = vi.fn(async () => true);
    localStorage.setItem('allo_school_rewards_setup_v1', JSON.stringify({ steps: [], form: { schoolName: 'Lincoln Elementary', allowedDomain: 'lincoln.k12.example' } }));
    const dialog = await mountPanel({ portalUrl: '' });
    const box = dialog.querySelector('[data-help-key="schoolrewards_handoff"]');
    expect(box.textContent).toMatch(/Not doing the editor steps yourself/);
    await settle(() => box.querySelector('[data-help-key="schoolrewards_handoff_copy"]').click());
    const text = window.alloCopyText.mock.calls[0][0];
    expect(text).toContain('Lincoln Elementary');
    expect(text).toContain('https://alloflow-cdn.pages.dev/apps_script/school_rewards/Code.gs');
    expect(text).toContain("allowedDomain: 'lincoln.k12.example'");
    expect(text).toContain('runInitialSchoolRewardsSetup');
    expect(text).toContain('dropdown beside Debug');
    expect(text).toContain('Go to AlloFlow School Rewards (unsafe)');
    expect(text).toContain('8. Send the link back');
    // The steps themselves never mention a technical format; only the pasted function's log line does.
    expect(text.slice(0, text.indexOf('Setup function to paste'))).not.toMatch(/JSON/);
    expect(box.textContent).toMatch(/Copied\. Paste it into an email/);
  });

  it('downloads a self-contained packet that embeds the verified sources with copy buttons', async () => {
    const created = [];
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob) => { created.push(blob); return 'blob:test'; });
    URL.revokeObjectURL = vi.fn();
    try {
      const dialog = await mountPanel({ portalUrl: '' });
      const box = dialog.querySelector('[data-help-key="schoolrewards_handoff"]');
      await settle(() => box.querySelector('[data-help-key="schoolrewards_handoff_download"]').click());
      await new Promise((res) => setTimeout(res, 60));
      expect(created.length).toBe(1);
      const html = await created[0].text();
      expect(html).toContain('<title>AlloFlow School Rewards: setup for IT</title>');
      expect(html).toContain('function setupSchoolRewardsRepository');
      expect(html).toContain('id=&quot;school-title&quot;');
      expect(html).toContain('data-copy="code-gs"');
      expect(html).toContain('data-copy="appsscript-json"');
      expect(html).toContain('function runInitialSchoolRewardsSetup()');
      expect(box.textContent).toMatch(/Downloaded school-rewards-setup-for-it\.html/);
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });

  it('links to the published sources when a file cannot be fetched, instead of shipping a partial file', () => {
    const html = testing.srHandoffHtml({ schoolName: 'Lincoln' }, 'function runInitialSchoolRewardsSetup() {}', { 'Code.gs': 'function setupSchoolRewardsRepository() {}' });
    expect(html).toContain('data-copy="code-gs"');
    expect(html).not.toContain('data-copy="portal-html"');
    expect(html).toContain('href="https://alloflow-cdn.pages.dev/apps_script/school_rewards/Portal.html"');
    expect(testing.srHandoffSteps({}).length).toBe(8);
  });
});

describe('share with staff (2026-09-02)', () => {
  it('shows the staff link and QR when connected and copies through the shell helper', async () => {
    window.__alloMakeQrSvg = vi.fn(async () => '<svg data-test="qr"></svg>');
    window.alloCopyText = vi.fn(async () => true);
    const dialog = await mountPanel({ portalUrl: PORTAL });
    const share = dialog.querySelector('[data-help-key="schoolrewards_share_staff"]');
    expect(share).toBeTruthy();
    expect(share.querySelector('#schoolrewards-share-link').value).toBe(PORTAL);
    expect(share.querySelector('svg[data-test="qr"]')).toBeTruthy();
    await settle(() => share.querySelector('[data-help-key="schoolrewards_share_copy"]').click());
    expect(window.alloCopyText).toHaveBeenCalledWith(PORTAL);
    expect(share.textContent).toMatch(/Link copied/);
    delete window.__alloMakeQrSvg;
  });

  it('is absent until a portal is connected', async () => {
    const dialog = await mountPanel({ portalUrl: '' });
    expect(dialog.querySelector('[data-help-key="schoolrewards_share_staff"]')).toBeNull();
  });
});

describe('classroom roster bridge (2026-09-02)', () => {
  const ROSTER_KEY = {
    classId: 'CLS-1',
    groups: { g1: { name: 'Period 2', color: '#123456' }, g2: { name: 'Period 5' } },
    students: { 'Blue Falcon': 'g1', 'Quiet Otter': 'g1', 'Red Comet': 'g2', 'Lone Heron': 'ghost-group' },
  };

  it('reads groups and codenames from the roster key and never invents names or emails', () => {
    localStorage.setItem('alloflow_roster_key', JSON.stringify(ROSTER_KEY));
    const roster = testing.srReadClassroomRoster();
    expect(roster.total).toBe(4);
    expect(roster.groups.map((group) => group.name)).toEqual(['Period 2', 'Period 5', 'Unassigned']);
    expect(roster.groups[0].codenames).toEqual(['Blue Falcon', 'Quiet Otter']);
    const csv = testing.srRosterTemplateCsv(roster, ['g1']);
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toBe('firstName,lastInitial,grade,homeroom,email,alloflowCodename,alloflowGroup');
    expect(lines.length).toBe(3);
    expect(lines[1]).toBe(',,,Period 2,,Blue Falcon,Period 2');
    expect(csv).not.toMatch(/@/);
  });

  it('offers the groups, counts learners, and downloads a template for the selection', async () => {
    localStorage.setItem('alloflow_roster_key', JSON.stringify(ROSTER_KEY));
    const created = [];
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob) => { created.push(blob); return 'blob:test'; });
    URL.revokeObjectURL = vi.fn();
    try {
      const dialog = await mountPanel({ portalUrl: PORTAL });
      const bridge = dialog.querySelector('[data-help-key="schoolrewards_roster_bridge"]');
      const boxes = bridge.querySelectorAll('[data-help-key="schoolrewards_roster_group"]');
      expect(boxes.length).toBe(3);
      const download = bridge.querySelector('[data-help-key="schoolrewards_roster_download"]');
      expect(download.disabled).toBe(true);
      await settle(() => boxes[0].click());
      expect(download.disabled).toBe(false);
      expect(download.textContent).toMatch(/\(2\)/);
      await settle(() => download.click());
      expect(created.length).toBe(1);
      expect(await created[0].text()).toContain('Quiet Otter');
      expect(bridge.textContent).toMatch(/Template downloaded/);
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });

  it('explains itself when no roster key exists on the device', async () => {
    const dialog = await mountPanel({ portalUrl: '' });
    expect(dialog.querySelector('[data-help-key="schoolrewards_roster_bridge"]').textContent).toMatch(/No classroom roster key/);
  });
});

describe('recognition worksheet (2026-09-02)', () => {
  const RECOGNITION = {
    sessionCode: 'ABC123',
    generatedAt: 1,
    rows: [
      { codename: 'Blue Falcon', total: 3, reasons: [{ label: 'Collaboration', count: 2 }, { label: 'Ready to learn', count: 1 }], lastAt: 1756800000000 },
      { codename: 'Quiet Otter', total: 1, reasons: [{ label: 'Self-regulation', count: 1 }], lastAt: 1756800100000 },
    ],
  };

  it('lists the live session recognition by codename and exports it without ever adding a name or email', async () => {
    const dialog = await mountPanel({ portalUrl: PORTAL, recognition: RECOGNITION });
    const sheet = dialog.querySelector('[data-help-key="schoolrewards_recognition_worksheet"]');
    const rows = sheet.querySelectorAll('[data-help-key="schoolrewards_worksheet_row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toMatch(/Blue Falcon/);
    expect(rows[0].textContent).toMatch(/Collaboration/);
    expect(sheet.textContent).toMatch(/Live session ABC123/);
    const csv = testing.srRecognitionCsv(RECOGNITION);
    expect(csv.split(/\r?\n/)[0]).toBe('alloflowCodename,tokens,sessions,reasons,lastRecognizedAt');
    expect(csv).toContain('Blue Falcon,3,1,Collaboration x2; Ready to learn x1,');
    expect(csv).not.toMatch(/@/);
    expect(testing.srRecognitionText(RECOGNITION)).toContain('Quiet Otter: 1 token (Self-regulation x1)');
  });

  it('copies the worksheet as text through the shell helper', async () => {
    window.alloCopyText = vi.fn(async () => true);
    const dialog = await mountPanel({ portalUrl: PORTAL, recognition: RECOGNITION });
    await settle(() => dialog.querySelector('[data-help-key="schoolrewards_worksheet_copy"]').click());
    expect(window.alloCopyText.mock.calls[0][0]).toContain('worksheet from AlloFlow session ABC123');
  });

  it('explains the two empty states: no session, and a session with nothing recorded yet', async () => {
    let dialog = await mountPanel({ portalUrl: '', recognition: null });
    expect(dialog.querySelector('[data-help-key="schoolrewards_recognition_worksheet"]').textContent).toMatch(/Start a class session/);
    act(() => root.unmount()); root = null; host.remove();
    dialog = await mountPanel({ portalUrl: '', recognition: { sessionCode: 'ABC123', rows: [] } });
    expect(dialog.querySelector('[data-help-key="schoolrewards_recognition_worksheet"]').textContent).toMatch(/No recognition has been recorded/);
  });

  it('shows a Sessions column and the number of sessions kept when the worksheet spans more than one', async () => {
    const dialog = await mountPanel({ portalUrl: PORTAL, recognition: { sessionCode: 'ABC123', generatedAt: 1, sessionCount: 3, rows: [{ codename: 'Blue Falcon', total: 5, sessions: 3, reasons: [{ label: 'Collaboration', count: 5 }], lastAt: 1 }, { codename: 'Quiet Otter', total: 1, reasons: [{ label: 'Kindness', count: 1 }], lastAt: 1 }] } });
    const sheet = dialog.querySelector('[data-help-key="schoolrewards_recognition_worksheet"]');
    expect(sheet.textContent).toMatch(/3 sessions kept on this device/);
    const cells = Array.from(sheet.querySelectorAll('[data-help-key="schoolrewards_worksheet_row"]')[0].querySelectorAll('td'), (td) => td.textContent);
    expect(cells.slice(0, 3)).toEqual(['Blue Falcon', '5', '3']);
    expect(Array.from(sheet.querySelectorAll('[data-help-key="schoolrewards_worksheet_row"]')[1].querySelectorAll('td'), (td) => td.textContent).slice(0, 3)).toEqual(['Quiet Otter', '1', '1']);
    expect(testing.srRecognitionCsv({ sessionCode: 'ABC123', rows: [{ codename: 'Blue Falcon', total: 5, sessions: 3, reasons: [{ label: 'Collaboration', count: 5 }], lastAt: 1 }] })).not.toMatch(/@/);
  });

  it('the host builds the worksheet from the live session roster and passes it to the panel', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('const buildSchoolRewardsRecognitionWorksheet = (roster, sessionCode, log) => {');
    expect(anti).toContain('buildSchoolRewardsRecognitionWorksheet(sessionData && sessionData.roster, activeSessionCode, readSchoolRewardsRecognitionLog())');
    // Past sessions are kept on the device by codename, pruned to forty sessions and ninety days, and never include a name or email.
    expect(anti).toContain("const ALLO_SCHOOL_REWARDS_RECOGNITION_LOG_KEY = 'allo_school_rewards_recognition_log_v1';");
    expect(anti).toContain('if (recordSchoolRewardsRecognition(sessionData && sessionData.roster, activeSessionCode)) setRecognitionLogVersion');
    const logStart = anti.indexOf('const recordSchoolRewardsRecognition');
    const logBody = anti.slice(logStart, anti.indexOf('const buildSchoolRewardsRecognitionWorksheet', logStart));
    expect(logBody).toContain('90 * 86400000');
    expect(logBody).toContain('.slice(40)');
    expect(logBody).not.toMatch(/email|displayName|rosterKey/);
    expect(anti).toContain('recognition: schoolRewardsRecognition,');
    // Codenames only: the helper reads entry.name (the session codename), never an identity map.
    const start = anti.indexOf('const buildSchoolRewardsRecognitionWorksheet');
    const body = anti.slice(start, anti.indexOf('const queueAlloHavenClassroomRewards', start));
    expect(body).toContain("codename: String(entry.name || 'Student').slice(0, 80)");
    expect(body).not.toMatch(/email|displayName|rosterKey/);
  });
});

describe('themes (2026-09-02)', () => {
  const luminance = (hex) => {
    const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const full = hex.length === 4 ? '#' + hex.slice(1).split('').map((c) => c + c).join('') : hex;
    const n = parseInt(full.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  };
  const ratio = (a, b) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

  it('scopes overrides to the app wrapper classes and keeps the Tailwind escapes intact', async () => {
    const css = testing.SR_THEME_STYLES;
    expect(css).toContain('.theme-dark .sr-root .bg-white{background:#162032!important}');
    expect(css).toContain('.theme-contrast .sr-root [class*="text-"]{color:#fff!important}');
    // The runtime CSS must carry a single backslash before / and : or the selector never matches.
    expect(css).toContain('.theme-dark .sr-root .bg-emerald-50\\/60{');
    expect(css).toContain('.theme-dark .sr-root .hover\\:bg-emerald-50:hover');
    expect(css).not.toContain('prefers-color-scheme');
    const dialog = await mountPanel({ portalUrl: PORTAL });
    expect(dialog.parentElement.classList.contains('sr-root')).toBe(true);
    expect(dialog.parentElement.querySelector('style').textContent).toBe(css);
  });

  it('dark and contrast pairs clear AA', () => {
    const pairs = [['#e6ebf5', '#162032'], ['#aab6c8', '#162032'], ['#e6ebf5', '#111a2b'], ['#cfe0ff', '#14233d'], ['#ffe9b8', '#3a2c08'], ['#ffb3c0', '#3d1520'], ['#e6ebf5', '#0f2a1f'], ['#fff', '#157347'], ['#8ab4ff', '#162032'], ['#000', '#fbbf24'], ['#fff', '#000']];
    for (const [fg, bg] of pairs) expect(ratio(fg, bg), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
  });
});

