// "Award from an AlloFlow file" (2026-10-13), both halves:
//  - AlloFlow side: the recognition worksheet exports only tokens not yet in an earlier file.
//  - Store side: the real Portal.html (jsdom) over the in-memory repository matches codenames
//    only through reviewed class links, awards once after review, and a second upload of the
//    same file replays instead of awarding again.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, ADMIN, STAFF, DOMAIN } from './helpers/school_rewards_repository.js';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));

// ── AlloFlow side ─────────────────────────────────────────────────────────────
let sr;
beforeAll(() => {
  const React = createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SchoolRewards;
  new Function(readFileSync('school_rewards_module.js', 'utf8'))();
  sr = window.AlloModules.SchoolRewards._testing;
});
beforeEach(() => localStorage.clear());
const LOG = { sessions: {
  ABC123: { updatedAt: 1, rows: { 'Silver Fox': { ids: ['r1', 'r2'], reasons: { Collaboration: 2 }, lastAt: 1 }, 'Quiet Owl': { ids: ['r3'], reasons: { 'Ready to learn': 1 }, lastAt: 1 } } },
  'daily-goal-2026-10-13': { updatedAt: 2, rows: { 'Silver Fox': { ids: ['daily-goal:CLS:LRN:2026-10-13'], reasons: { 'Individual goal progress': 1 }, lastAt: 2 } } }
} };

describe('AlloFlow worksheet: Store award file', () => {
  it('lists codenames and token counts only, and leaves handed-off tokens out of the next file', () => {
    const first = sr.srPendingAwards(LOG, sr.srReadHandoff());
    expect(first.rows).toEqual([{ codename: 'Quiet Owl', tokens: 1 }, { codename: 'Silver Fox', tokens: 3 }]);
    expect(first.total).toBe(4);
    const file = sr.srBuildAwardFile(first, 'af0123456789abcdef', Date.UTC(2026, 9, 13));
    expect(file).toEqual({ format: 'alloflow-store-award-file', version: 1, fileId: 'af0123456789abcdef', createdAt: '2026-10-13T00:00:00.000Z', rows: first.rows });
    expect(JSON.stringify(file)).not.toMatch(/Collaboration|Ready|goal|reason|LRN|CLS|session/i);
    sr.srMarkHandedOff(first.ids, file.fileId, Date.now());
    expect(sr.srPendingAwards(LOG, sr.srReadHandoff()).total).toBe(0);
    const later = { sessions: { ...LOG.sessions, XYZ789: { updatedAt: 3, rows: { 'Quiet Owl': { ids: ['r9'], reasons: {}, lastAt: 3 } } } } };
    expect(sr.srPendingAwards(later, sr.srReadHandoff()).rows).toEqual([{ codename: 'Quiet Owl', tokens: 1 }]);
  });

  it('can put the last file\'s tokens back once', () => {
    const pending = sr.srPendingAwards(LOG, sr.srReadHandoff());
    sr.srMarkHandedOff(pending.ids, 'af-first-file', Date.now());
    expect(sr.srUndoLastHandoff()).toBe(4);
    expect(sr.srPendingAwards(LOG, sr.srReadHandoff()).total).toBe(4);
    expect(sr.srUndoLastHandoff()).toBe(0);
  });
});

describe('AlloFlow worksheet: download button in the real panel', () => {
  it('downloads the file, marks its tokens, and offers to put them back', async () => {
    const React = window.React, { createRoot } = createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.setItem('allo_school_rewards_recognition_log_v1', JSON.stringify(LOG));
    const blobs = [], downloads = [], toasts = [];
    const realBlob = window.Blob, realCreate = URL.createObjectURL, realClick = HTMLAnchorElement.prototype.click;
    window.Blob = class { constructor(parts) { blobs.push(parts.join('')); } };
    URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(window.AlloModules.SchoolRewards.SchoolRewardsPanel, { isOpen: true, onClose() {}, t: () => null, addToast: (m, k) => toasts.push([m, k]), initialPath: 'setup', portalUrl: 'https://script.google.com/macros/s/AKfycbFICTIONAL/exec', recognition: { sessionCode: '', rows: [{ codename: 'Silver Fox', total: 3, sessions: 2, reasons: [], lastAt: 1 }, { codename: 'Quiet Owl', total: 1, sessions: 1, reasons: [], lastAt: 1 }] } })));
      const box = () => host.querySelector('[data-store-award-file]');
      const button = text => [...box().querySelectorAll('button')].find(b => b.textContent === text);
      expect(box().textContent).toContain('4 tokens for 2 codenames are not yet in a Store award file.');
      await React.act(async () => button('Download Store award file').click());
      expect(downloads).toEqual(['class.alloflow-store-awards.json']);
      expect(JSON.parse(blobs[0]).rows).toEqual([{ codename: 'Quiet Owl', tokens: 1 }, { codename: 'Silver Fox', tokens: 3 }]);
      expect(box().textContent).toContain('Every token here is already in a Store award file.');
      expect(button('Download Store award file').disabled).toBe(true);
      await React.act(async () => button("Put the last file's tokens back").click());
      expect(box().textContent).toContain('4 tokens for 2 codenames');
      expect(toasts.map(t => t[1])).toEqual(['success', 'info']);
    } finally {
      await React.act(async () => root.unmount()); host.remove();
      window.Blob = realBlob; URL.createObjectURL = realCreate; HTMLAnchorElement.prototype.click = realClick;
    }
  });
});

// ── Store side ────────────────────────────────────────────────────────────────
const CLASS_ID = 'CLASS-FICTIONAL';
function seed() {
  const h = harness(), avery = setup(h);
  h.setActive(ADMIN);
  const blake = h.call('adminUpsertRewardsStudent', { firstName: 'Blake', lastInitial: 'S', grade: '5', homeroom: '5B', email: 'blake@' + DOMAIN }).student;
  h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true });
  const c = h.call('getSchoolRewardsAlloFlowLinkContext');
  const proposal = { roster: { format: 'alloflow-store-roster', version: 1, classId: CLASS_ID, learners: [{ learnerId: 'LRN-FICTIONAL-1', codename: 'Silver Fox' }, { learnerId: 'LRN-FICTIONAL-2', codename: 'Quiet Owl' }] },
    bindings: [{ learnerId: 'LRN-FICTIONAL-1', studentId: avery.id }, { learnerId: 'LRN-FICTIONAL-2', studentId: blake.id }], staffEmails: [STAFF], suspendedLearnerIds: [], expectedRepositoryId: c.repositoryId, expectedYearKey: c.yearKey };
  const preview = h.call('previewSchoolRewardsAlloFlowLinks', proposal);
  h.call('applySchoolRewardsAlloFlowLinks', { ...proposal, expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision, confirmed: true, idempotencyKey: 'fictional-class-links-award-file' });
  const category = h.call('getSchoolRewardsBootstrap').categories[0];
  return { h, avery, blake, category };
}
const awardFile = (rows = [{ codename: 'Silver Fox', tokens: 3 }, { codename: 'Quiet Owl', tokens: 1 }, { codename: 'Ghost Heron', tokens: 2 }], fileId = 'af0123456789abcdef01') =>
  ({ format: 'alloflow-store-award-file', version: 1, fileId, createdAt: '2026-10-13T15:00:00.000Z', rows });

async function open(repository, email = STAFF, options = {}) {
  const calls = [], dialogs = [], vc = new VirtualConsole();
  const dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = message => { dialogs.push(message); return options.confirm !== false; };
  w.prompt = () => 'Reviewed'; w.print = () => {};
  let pending = 0; const script = {};
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject; const runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => { const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input)); calls.push({ method, payload }); pending++;
        Promise.resolve().then(() => { repository.setActive(email); return repository.call(method, payload); }).then(r => resolve(JSON.parse(JSON.stringify(r))), e => reject(options.stripCodes ? new Error(e.message) : e)).finally(() => pending--); };
    } }); return runner;
  } }); w.google = { script };
  const app = { dom, calls, dialogs, $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)],
    set(selector, value) { const n = this.$(selector); n.value = value; n.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 600; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle'); },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async file(value, name = 'class.alloflow-store-awards.json') { const raw = typeof value === 'string' ? value : JSON.stringify(value), node = this.$('#afile-input'); Object.defineProperty(node, 'files', { configurable: true, value: [{ name, size: raw.length, text: async () => raw }] }); node.dispatchEvent(new w.Event('change')); await this.settle(); },
    async prepare(value = awardFile(), per = '2') { await this.file(value); await this.click('#afile-classes-load'); this.set('#afile-class', CLASS_ID); this.set('#afile-per', per); await this.click('#afile-review'); },
  };
  opened.push(app); w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}
const fileAwards = h => h.rows('Ledger').slice(1).filter(r => r[2] === 'EARN' && /^afile_/.test(String(r[11])));

describe('Store: Award from an AlloFlow file', () => {
  it('matches through class links and awards nothing until staff confirm', async () => {
    const s = seed(); const app = await open(s.h);
    expect(app.$('#afile-card').hidden).toBe(false);
    await app.prepare();
    const rows = app.$$('[data-afile-row]').map(n => n.textContent);
    expect(rows[0]).toContain('Silver Fox'); expect(rows[0]).toContain('Avery R.'); expect(rows[0]).toContain('+6');
    expect(rows[1]).toContain('Quiet Owl'); expect(rows[1]).toContain('Blake S.'); expect(rows[1]).toContain('+2');
    expect(rows[2]).toContain('Ghost Heron'); expect(rows[2]).toContain('Not in this linked class');
    expect(app.$('#afile-award').hidden).toBe(false);
    expect(fileAwards(s.h)).toHaveLength(0);
  });

  it('awards each matched student once, and a second upload of the same file replays instead of repeating', async () => {
    const s = seed(); const app = await open(s.h);
    await app.prepare();
    await app.click('#afile-award');
    expect(app.dialogs.at(-1)).toMatch(/awarded once for this file/);
    const awards = fileAwards(s.h);
    expect(awards.map(r => [r[1], r[3], r[12]])).toEqual([[s.avery.id, 6, s.category.id], [s.blake.id, 2, s.category.id]]);
    expect(awards.every(r => r[4] === 'Recognized during AlloFlow class sessions' && r[9] === 'staff')).toBe(true);
    expect(app.$('#afile-award').hidden).toBe(true);
    expect(app.$('#notice').textContent).toContain('Awards from the AlloFlow file are recorded.');
    const again = await open(s.h);
    await again.prepare();
    await again.click('#afile-award');
    expect(fileAwards(s.h)).toHaveLength(2);
    const changed = await open(s.h);
    await changed.prepare(awardFile(), '5');
    await changed.click('#afile-award');
    expect(fileAwards(s.h)).toHaveLength(2);
    expect(changed.$$('[data-afile-row]').map(n => n.textContent).filter(t => /Already awarded from this file with different points or wording/.test(t))).toHaveLength(2);
    expect(changed.$('#afile-award').hidden).toBe(true);
    expect(changed.$('#notice').textContent).toContain('Nothing was awarded twice.');
  });

  it('recognizes the replay refusal from its message alone, as Apps Script delivers it', async () => {
    const s = seed(); const first = await open(s.h);
    await first.prepare(); await first.click('#afile-award');
    const app = await open(s.h, STAFF, { stripCodes: true });
    await app.prepare(awardFile(), '7'); await app.click('#afile-award');
    expect(fileAwards(s.h)).toHaveLength(2);
    expect(app.$('#afile-award').hidden).toBe(true);
    expect(app.$('#notice').textContent).toContain('Nothing was awarded twice.');
  });

  it('a new file awards again, and cancelling the confirmation awards nothing', async () => {
    const s = seed();
    const cancel = await open(s.h, STAFF, { confirm: false });
    await cancel.prepare();
    await cancel.click('#afile-award');
    expect(fileAwards(s.h)).toHaveLength(0);
    const app = await open(s.h);
    await app.prepare(awardFile([{ codename: 'Silver Fox', tokens: 1 }], 'af-second-file-0001'));
    await app.click('#afile-award');
    expect(fileAwards(s.h).map(r => r[3])).toEqual([2]);
  });

  it('reads in Spanish, including the review rows', async () => {
    const s = seed(); const app = await open(s.h);
    app.dom.window.srI18n.setLanguage('es');
    await app.prepare();
    await app.settle();
    expect(app.$('#afile-card summary').textContent).toBe('Otorgar desde un archivo de AlloFlow');
    expect(app.$('#afile-review').textContent).toBe('Revisar coincidencias');
    expect(app.$$('[data-afile-row]')[2].textContent).toContain('No está en esta clase vinculada');
  });

  it('rejects files that are not AlloFlow Store award files', async () => {
    const s = seed(); const app = await open(s.h);
    await app.file(awardFile(), 'notes.json');
    expect(app.$('#notice').textContent).toContain('.alloflow-store-awards.json');
    await app.file('{"format":"alloflow-store-roster","version":1}');
    expect(app.$('#notice').textContent).toContain('not an AlloFlow Store award file');
    await app.file(awardFile([{ codename: 'Silver Fox', tokens: 1 }, { codename: 'Silver Fox', tokens: 2 }]));
    expect(app.$('#notice').textContent).toContain('lists a codename twice');
    await app.file(awardFile([{ codename: 'Silver Fox', tokens: 0 }]));
    expect(app.$('#notice').textContent).toContain('invalid row');
    expect(fileAwards(s.h)).toHaveLength(0);
  });
});
