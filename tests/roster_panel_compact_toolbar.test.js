// Class Roster Key toolbar (2026-09-28): the toolbar used to fill most of the
// dialog (15 buttons plus notes), leaving little room for the roster itself.
// Everyday actions stay in one row; the rest sit behind "More roster tools".
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let api, React, createRoot, act, root, container;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('teacher_module.js');
  api = window.AlloModules.RosterIdentityInternals;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; container?.remove(); });

async function mount() {
  container = document.createElement('div'); document.body.appendChild(container);
  function Host() {
    const [value, setValue] = React.useState(() => api.ensureRosterIdentity({
      classId: 'CLS-fictional', className: 'Invented class', groups: {}, students: { 'Calm Otter': '' },
    }));
    return React.createElement(window.AlloModules.RosterKeyPanel, {
      isOpen: true, onClose() {}, rosterKey: value, setRosterKey: setValue, t: () => '',
      onOpenSeatingChart() {}, onOpenSubmissionInbox() {},
    });
  }
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
}
const button = text => [...container.querySelectorAll('button')].find(b => b.textContent.includes(text));
const shown = el => !el.closest('[hidden]');

describe('Class Roster Key toolbar', () => {
  it('shows one row of everyday actions and folds the rest', async () => {
    await mount();
    expect(shown(button('Update roster safely'))).toBe(true);
    expect(shown(button('Differentiate by Group'))).toBe(true);
    const toggle = button('More roster tools');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const more = container.querySelector('#roster-more-tools');
    expect(toggle.getAttribute('aria-controls')).toBe('roster-more-tools');
    expect(more.hidden).toBe(true);
    expect(more.className).toContain('hidden');
    for (const label of ['Import / replace roster', 'Export JSON', 'Store review file', 'Print worksheet', 'Worksheet options', 'Set up offline submissions', 'Import submissions', 'Seating Chart']) {
      expect(more.contains(button(label)), label).toBe(true);
    }
    expect(more.textContent).toContain('Store review shares only class/learner IDs and codenames');
  });

  it('opens and closes the folded tools', async () => {
    await mount();
    await act(async () => button('More roster tools').click());
    const more = container.querySelector('#roster-more-tools');
    expect(button('More roster tools').getAttribute('aria-expanded')).toBe('true');
    expect(more.hidden).toBe(false);
    expect(more.className).toContain('flex');
    expect(shown(button('Export JSON'))).toBe(true);
    await act(async () => button('More roster tools').click());
    expect(more.hidden).toBe(true);
  });
});
