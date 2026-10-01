// Behavior Lens: opening a tool is not a change to the student's data (pass 9).
//
// WHY: until 2026-09-24 every tool opened rewrote the whole workspace to browser storage (and,
// outside Gemini Canvas, saved it to the cloud 2 seconds later): the visit time and a
// diagnostics line changed, and the visited-tools set was rebuilt even when the tool had been
// visited before. At a school year of data that is about 1.6 MB per click. It also lit the
// "Download backup" reminder after only looking around, and a second tab open on the same
// student was told another tab had changed it.
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let root, host, writes, realSetItem;
const settle = ms => React.act(async () => { await new Promise(done => setTimeout(done, ms)); });
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text);
// The ones that show the reminder (💾, or 🔴 when there are changes since the last backup).
const backupButtons = () => [...document.querySelectorAll('button')].filter(el => /^(💾|🔴) Download backup/.test(el.textContent.trim()));
const saved = () => JSON.parse(localStorage.getItem('behaviorLens_workspace_nav-a'));
const entries = Array.from({ length: 30 }, (_, i) => ({ id: 'e' + i, antecedent: 'Math', behavior: 'Yelling', consequence: 'Break', intensity: 2, timestamp: new Date(2026, 8, 1 + (i % 20), 9 + (i % 6)).toISOString() }));
async function openAndLeave(name) {
  await React.act(async () => button(name).click());
  await settle(600);
  await React.act(async () => document.querySelector('[aria-label="Back to BehaviorLens tools"]').click());
  await settle(600);
}
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(async () => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'nav-a', name: 'Student A' }]));
  localStorage.setItem('behaviorLens_workspace_nav-a', JSON.stringify({ version: 2, student: 'Student A', studentId: 'nav-a', abcEntries: entries, observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }] }))));
  await settle(1200);
  writes = 0;
  realSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) { if (key === 'behaviorLens_workspace_nav-a') writes += 1; return realSetItem.call(this, key, value); };
});
afterEach(async () => {
  Storage.prototype.setItem = realSetItem;
  if (root) await React.act(async () => root.unmount());
  host?.remove(); root = null; host = null;
});

describe('opening tools', () => {
  it('a tool opened again writes nothing; only a first visit is saved', async () => {
    await openAndLeave('Define a target');
    expect(writes).toBe(1);                                                // the first visit
    await openAndLeave('Define a target');
    await openAndLeave('Define a target');
    expect(writes).toBe(1);                                                // was 3: every open rewrote it
  });
  it('does not light the backup reminder', async () => {
    await openAndLeave('Define a target');
    await openAndLeave('Define a target');
    await React.act(async () => button('All tools').click());
    const reminders = backupButtons();
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.filter(el => el.textContent.includes('🔴'))).toHaveLength(0);   // was lit by browsing
  });
  it('the visits are still saved with the next real change', async () => {
    await openAndLeave('Define a target');
    await openAndLeave('Define a target');
    await React.act(async () => button('All tools').click());
    const toggle = [...host.querySelectorAll('button[aria-expanded]')].find(el => el.textContent.includes('Student Profile'));
    await React.act(async () => toggle.click());
    const interests = toggle.parentElement.querySelector('textarea');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(interests, 'Dinosaurs');
      interests.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await settle(800);
    expect(saved().studentProfile.interests).toBe('Dinosaurs');
    expect(saved().activityRegistry.opdef.visitCount).toBe(2);
  });
});

describe('a second tab', () => {
  it('does not count a difference in visits or diagnostics as a change', () => {
    const R = window.AlloModules.BehaviorLensWorkspace;
    const base = { abcEntries: entries, targetBehaviors: [], savedAt: 'a', snapshotId: 'x:1' };
    expect(R.sameWorkspaceContent(base, Object.assign({}, base, { savedAt: 'b', activityRegistry: { opdef: { visitCount: 4 } }, workflowDiagnostics: [{ action: 'panel-open' }] }))).toBe(true);
    expect(R.sameWorkspaceContent(base, Object.assign({}, base, { abcEntries: entries.slice(1) }))).toBe(false);
  });
});
