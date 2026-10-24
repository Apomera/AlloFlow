// Screening and RTI CSV exports from the Student Data tab (2026-10-20).
//
// The screening CSV had no BOM (Excel misread accented names) and no formula
// guard. The RTI CSV joined raw values with commas: a name with a comma shifted
// every column, nothing was quoted or guarded, the file was dated in UTC
// (tomorrow after ~8 pm Eastern) and the link was revoked straight after the
// click. Both now go through the panel's shared CSV writer. This mounts the real
// Assessment Center, opens Student Data and reads the bytes that would download.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const STORE_KEY = 'alloflow_ac_imported_students';
let React, client, Panel, root = null, host = null, blobs, downloads, revoked, saved;

const stats = { quizAvg: 90, wsAccuracy: 80, wsWordsCompleted: 12, wsBestStreak: 3, fluencyWCPM: 40, gamesPlayed: 2, totalActivities: 5, labelChallengeAvg: 0, adventureXP: 0 };
const student = (id, name, extra = {}) => ({ id, name, stats, safetyFlags: [], screeningHistory: [], data: {}, ...extra });
const STUDENTS = [
  student('s1', 'Ana, "Jo"', { screeningHistory: [{ activity: 'lnf', correct: 8, total: 10, accuracy: 80, date: new Date(2026, 9, 20, 21, 30).getTime() }] }),
  student('s2', '=HYPERLINK("x")', { screeningHistory: [{ activity: 'psf', correct: 3, total: 10, accuracy: 30, date: new Date(2026, 9, 19, 9).getTime() }] }),
];

beforeAll(() => {
  React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
  client = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React;
  globalThis.X = window.X = () => null;
  window.ReactDOM = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(process.env.STUDENT_ANALYTICS_MODULE || 'student_analytics_module.js', 'utf8'))();
  Panel = window.AlloModules.StudentAnalytics;
});
beforeEach(() => {
  blobs = []; downloads = []; revoked = [];
  saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  URL.createObjectURL = vi.fn((blob) => { blobs.push(blob); return 'blob:csv-' + blobs.length; });
  URL.revokeObjectURL = vi.fn((u) => revoked.push(u));
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { downloads.push(this.download); });
  localStorage.setItem(STORE_KEY, JSON.stringify(STUDENTS));
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); root = null; host = null;
  localStorage.clear();
  URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  vi.restoreAllMocks(); vi.useRealTimers();
});

const press = async (el) => { await React.act(async () => { el.click(); await Promise.resolve(); }); };
const buttonText = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(label));
async function openStudentData() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = client.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(Panel, { isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, addToast: vi.fn(), loadProbeBanks: () => Promise.resolve() }));
    await Promise.resolve();
  });
  await press(buttonText('Student Data'));
}
const read = async (blob) => new Uint8Array(await blob.arrayBuffer());
const decode = (bytes) => new TextDecoder().decode(bytes);
const localStamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

describe('Student Report for an imported student', () => {
  it('lists the sounds mastered in its Word Sounds data, dated locally, link kept past the click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    // Imported students keep Word Sounds under data.wordSoundsState, not at the top level.
    const mastery = { k: { total: 6, correct: 5, independentAttempts: 5, independentAccuracy: 80 }, sh: { total: 3, correct: 1, independentAttempts: 6, independentAccuracy: 50 } };
    localStorage.setItem(STORE_KEY, JSON.stringify([student('s3', 'Falcon', { data: { wordSoundsState: { phonemeMastery: mastery, history: [{ correct: true, activity: 'isolation' }] } } })]));
    host = document.createElement('div'); document.body.appendChild(host);
    root = client.createRoot(host);
    await React.act(async () => {
      // The host always passes these maps; the detail view reads them by student name.
      root.render(React.createElement(Panel, { isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, addToast: vi.fn(), loadProbeBanks: () => Promise.resolve(), rtiGoals: {}, interventionLogs: {}, probeHistory: {} }));
      await Promise.resolve();
    });
    await press(document.querySelector('[aria-label="View details for Falcon"]'));
    await press(buttonText('Student Report'));
    expect(blobs).toHaveLength(1);
    const html = decode(await read(blobs[0]));
    expect(html.includes('#f0fdf4'), 'the strengths section (only rendered when sounds are mastered)').toBe(true);
    expect(downloads[0]).toBe('my_learning_journey_' + localStamp() + '.html');
    expect(revoked, 'revoked during the click').toEqual([]);
    vi.advanceTimersByTime(2000);
    expect(revoked).toEqual(['blob:csv-1']);
  });
});

describe('Student Data exports', () => {
  it('Screening CSV: BOM, quoted names, formula guard', async () => {
    await openStudentData();
    await press(buttonText('Screening CSV'));
    expect(blobs).toHaveLength(1);
    const bytes = await read(blobs[0]);
    expect([...bytes.slice(0, 3)], 'UTF-8 BOM').toEqual([0xef, 0xbb, 0xbf]);
    const text = decode(bytes);
    expect(text.includes('"Ana, ""Jo"""'), 'name with a comma and quotes stays one quoted cell').toBe(true);
    expect(text.includes('"\'=HYPERLINK(""x"")"'), 'a leading = is made text').toBe(true);
    expect(downloads[0]).toBe('screening_results_' + localStamp() + '.csv');
  });

  it('RTI Report CSV: quoted, guarded, local date, link kept alive past the click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await openStudentData();
    await press(buttonText('RTI Report'));
    const confirm = [...document.querySelectorAll('[role="alertdialog"] button')].at(-1);
    expect(confirm, 'the FERPA confirmation').toBeTruthy();
    await press(confirm);
    await React.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
    expect(blobs).toHaveLength(1);
    const text = decode(await read(blobs[0]));
    const lines = text.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[1].startsWith('"Ana, ""Jo"""'), lines[1]).toBe(true);
    expect(lines[2].startsWith('"\'=HYPERLINK'), lines[2]).toBe(true);
    expect(downloads[0]).toBe('RTI_Report_CONFIDENTIAL_' + localStamp() + '.csv');
    expect(revoked, 'revoked during the click').toEqual([]);
    vi.advanceTimersByTime(2000);
    expect(revoked).toEqual(['blob:csv-1']);
  });
});
