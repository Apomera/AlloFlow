// The Student Data and Research tabs show their content (2026-10-20).
//
// Both tab bodies were passed as extra children of the selected-student
// "no transcript" box, inside the detail overlay, while the main content area
// is display:none on exactly those two tabs. So both tabs rendered nothing:
// roster import, the screening CSV, the RTI report and the research suite were
// unreachable. This mounts the real Assessment Center and opens each tab.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
let React, client, Panel, root = null, host = null;

beforeAll(() => {
  React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
  client = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React;
  globalThis.X = window.X = () => null;
  window.ReactDOM = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // STUDENT_ANALYTICS_MODULE lets a reviewer point this file at an older build.
  new Function(readFileSync(process.env.STUDENT_ANALYTICS_MODULE || 'student_analytics_module.js', 'utf8'))();
  Panel = window.AlloModules.StudentAnalytics;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove();
  root = null; host = null;
  localStorage.clear();
});

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = client.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(Panel, { isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, loadProbeBanks: () => Promise.resolve(), ...props }));
    await Promise.resolve();
  });
}
const tabButton = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(label));
const open = async (label) => { const b = tabButton(label); expect(b, label + ' tab').toBeTruthy(); await React.act(async () => { b.click(); await Promise.resolve(); }); };
const shown = (el) => { for (let n = el; n; n = n.parentElement) { if (n.hidden || (n.style && n.style.display === 'none')) return false; } return true; };

describe('Assessment Center tabs', () => {
  it('Student Data shows the roster import', async () => {
    await mount();
    await open('Student Data');
    // The file input itself is hidden; its label is the visible control. (The Administer
    // tab has a .json import too, inside the main area that is hidden on this tab.)
    const imports = [...document.querySelectorAll('input[type="file"][multiple]')].filter((i) => i.accept === '.json');
    expect(imports.length, 'roster import input').toBeGreaterThan(0);
    expect(imports.some((i) => shown(i.closest('label') || i.parentElement)), 'every import sits under a hidden ancestor').toBe(true);
  });

  it('Research shows the research overview', async () => {
    await mount();
    await open('Research');
    const heading = [...document.querySelectorAll('h3')].find((h) => h.textContent.includes('Research & Insights'));
    expect(heading, 'research heading').toBeTruthy();
    expect(shown(heading)).toBe(true);
  });

  it('neither tab body appears on the Administer tab', async () => {
    await mount();
    await open('Administer');
    expect([...document.querySelectorAll('h3')].some((h) => h.textContent.includes('Research & Insights'))).toBe(false);
  });
});
