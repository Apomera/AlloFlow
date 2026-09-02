// Leadership Hub -> "School Rewards & Store" card (2026-09-01).
//
// Before this pass the card, on a device with no saved portal URL, only
// toasted "Connect School Rewards in Project Settings first." and left the
// hub open. That toast sits under the hub dialog's own focus and reads as a
// card that does nothing (the report that opened this pass). The hub now
// hands the click to the host when the host declares it owns the routing
// (connected: Google-hosted portal; not connected: Project Settings scrolled
// to the connect form) and keeps the older inline behaviour for hosts that
// do not pass the prop. Both paths are pinned here, plus the shell-side
// contract the host's scroll-and-focus effect depends on.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let AdminHubPanel;
let root;
let host;

const REWARDS_KEY = 'allo_school_rewards_portal_url_v1';
const PORTAL = 'https://script.google.com/macros/s/AKfycbxyz_123-abc/exec';

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
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
  host?.remove();
  host = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
  localStorage.clear();
});

async function mountHub(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(AdminHubPanel, {
      isOpen: true, onClose: () => {}, t: () => null, openTool: () => {}, addToast: () => {}, ...props,
    }));
    await new Promise((res) => setTimeout(res, 20));
  });
  return host.querySelector('[role="dialog"]');
}

function rewardsCard(dialog) {
  const card = Array.from(dialog.querySelectorAll('[data-help-key="adminhub_tool_card"]'))
    .find((button) => /School Rewards/.test(button.textContent));
  expect(card, 'the School Rewards & Store card must render').toBeTruthy();
  return card;
}

describe('the School Rewards & Store card', () => {
  it('hands the click to the host when the host owns School Rewards routing', async () => {
    const onOpenSchoolRewards = vi.fn();
    const onClose = vi.fn();
    const openTool = vi.fn();
    const addToast = vi.fn();
    const dialog = await mountHub({ onOpenSchoolRewards, onClose, openTool, addToast });
    await act(async () => { rewardsCard(dialog).click(); });
    expect(onOpenSchoolRewards).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openTool).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });

  it('never routes the other cards through the rewards handler', async () => {
    const onOpenSchoolRewards = vi.fn();
    const openTool = vi.fn();
    const dialog = await mountHub({ onOpenSchoolRewards, openTool });
    const evaluation = Array.from(dialog.querySelectorAll('[data-help-key="adminhub_tool_card"]'))
      .find((button) => /Educator Evaluation/.test(button.textContent));
    await act(async () => { evaluation.click(); });
    expect(openTool).toHaveBeenCalledWith('evaluation');
    expect(onOpenSchoolRewards).not.toHaveBeenCalled();
  });

  it('without the host prop and no saved portal, says where to connect and opens nothing', async () => {
    const addToast = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const dialog = await mountHub({ addToast });
    await act(async () => { rewardsCard(dialog).click(); });
    expect(open).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][0]).toMatch(/Connect School Rewards in Project Settings first/);
    expect(addToast.mock.calls[0][1]).toBe('info');
  });

  it('without the host prop but with a saved portal, opens the Google-hosted portal', async () => {
    localStorage.setItem(REWARDS_KEY, PORTAL);
    const popup = {};
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    const onClose = vi.fn();
    const addToast = vi.fn();
    const dialog = await mountHub({ onClose, addToast });
    await act(async () => { rewardsCard(dialog).click(); });
    expect(open).toHaveBeenCalledWith(PORTAL, '_blank', 'noopener,noreferrer');
    expect(popup.opener).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(addToast).not.toHaveBeenCalled();
  });

  it('rejects a saved URL that is not an Apps Script /exec deployment', async () => {
    localStorage.setItem(REWARDS_KEY, 'https://example.com/macros/s/abc/exec');
    const addToast = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue({});
    const dialog = await mountHub({ addToast });
    await act(async () => { rewardsCard(dialog).click(); });
    expect(open).not.toHaveBeenCalled();
    expect(addToast.mock.calls[0][0]).toMatch(/Connect School Rewards in Project Settings first/);
  });
});

describe('the app shell wires the card to a real destination', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const settings = readFileSync(resolve(process.cwd(), 'view_project_settings_source.jsx'), 'utf8');

  it('passes the host handler to BOTH the hub card and the Project Settings button', () => {
    expect(anti.split('onOpenSchoolRewards: handleOpenSchoolRewards').length - 1).toBe(2);
    expect(anti).toContain('const handleOpenSchoolRewards = React.useCallback(');
    expect(anti).toContain("readAlloSchoolRewardsPortalUrl()");
  });

  it('reads the same storage key the settings view writes', () => {
    expect(anti).toContain("const ALLO_SCHOOL_REWARDS_PORTAL_URL_KEY = 'allo_school_rewards_portal_url_v1'");
    expect(settings).toContain("var rewardsStorageKey = 'allo_school_rewards_portal_url_v1'");
  });

  it('the host handler opens the School Rewards panel every time, like the other hub tools', () => {
    const start = anti.indexOf('const handleOpenSchoolRewards = React.useCallback(');
    const body = anti.slice(start, anti.indexOf('}, []);', start));
    expect(body).toContain('setIsAdminHubOpen(false)');
    expect(body).toContain('window.__alloLazySchoolRewards');
    expect(body).toContain('setIsSchoolRewardsOpen(true)');
    expect(anti).toContain('moduleKey="SchoolRewards.SchoolRewardsPanel"');
    expect(settings).toContain('id="school-rewards-portal-url"');
  });
});
