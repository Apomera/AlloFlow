// @vitest-environment jsdom
// Error Reporter — what a student in a live session sees (2026-09-23).
//
// Field report: a student joining a live session got "⚠ 15 errors". Every
// entry was weeks old (CDN timeouts from 08-16, AI 403s from builds that no
// longer exist): the buffer persists in localStorage, and the only pruning
// was by build tag, which on the web is always 'web'. The report also sent
// the live-session join secret (?allo_mb=) because entries and reports kept
// the full URL.
//
// Each scenario boots the REAL module in a fresh window with a seeded buffer.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(process.env.REPORTER_SOURCE || path.join(ROOT, 'error_reporter_module.js'), 'utf8');

const SECRET = 'eyJ1IjoiaHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J6IiwiYyI6IkFCQ0RFIiwiayI6Inp6enp6enp6enp6enp6enp6enp6enoifQ';
// Any fragment is a leak: trace lines are cut at 110 chars, so check a prefix.
const SECRET_HEAD = SECRET.slice(0, 16);
const LIVE_URL = 'https://alloflow.example/app/?allo_mb=' + SECRET + '&allo_ai=off';
const HOUR = 60 * 60 * 1000;

function boot({ url = LIVE_URL, seed = null, before = null } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  if (seed) w.localStorage.setItem('alloflow_error_log', JSON.stringify(seed));
  w.console.log = () => {};
  w.__sent = [];
  w.fetch = (u, opts) => { w.__sent.push(JSON.parse(opts.body)); return new Promise(() => {}); };
  if (before) before(w);
  w.eval(SRC);
  return w;
}

const badgeText = (w) => {
  const b = w.document.getElementById('allo-err-badge');
  return b && b.style.display !== 'none' ? b.textContent : '';
};

const oldEntry = (ageMs, message, extra = {}) => ({
  ts: new Date(Date.now() - ageMs).toISOString(), level: 'error', message,
  stack: '', source: '', line: 0, column: 0, url: LIVE_URL, count: 1, v: 'web', ...extra,
});

function reportOf(w) {
  w.AlloModules.ErrorReporter.openPanel('errors');
  w.document.getElementById('aer-send').click();
  return w.__sent[w.__sent.length - 1];
}

describe('stale entries do not reach the badge', () => {
  it('weeks-old entries are dropped on load and removed from storage', () => {
    const seed = [];
    for (let i = 0; i < 13; i++) seed.push(oldEntry(38 * 24 * HOUR, '[CDN-TIMEOUT] Mod' + i + ' did not settle within 30 seconds'));
    seed.push(oldEntry(35 * 24 * HOUR, '[AIProvider] Fallback also failed: HTTP 403:'));
    const w = boot({ seed });
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(0);
    expect(badgeText(w)).toBe('');
    expect(JSON.parse(w.localStorage.getItem('alloflow_error_log'))).toHaveLength(0);
  });

  it('an earlier page load within 24 h stays in the log, labelled, but not on the badge', () => {
    const w = boot({ seed: [oldEntry(2 * HOUR, 'earlier failure A'), oldEntry(HOUR, 'earlier failure B')] });
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(2);
    expect(badgeText(w)).toBe('');
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(w.document.getElementById('allo-err-panel').textContent).toContain('earlier page load');
    const r = reportOf(w);
    expect(r.what).toContain('This page load: 0 unresolved errors');
    expect(r.what).toContain('[earlier page load]');
  });

  it('an error in THIS page load shows the badge', () => {
    const w = boot({ seed: [oldEntry(HOUR, 'earlier failure')] });
    w.console.error('now failure');
    expect(badgeText(w)).toContain('1 error');
  });

  it('a repeat of an earlier load\'s message is a new entry, not a silent ×2', () => {
    const w = boot({ seed: [oldEntry(HOUR, 'same failure')] });
    w.console.error('same failure');
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(2);
    expect(badgeText(w)).toContain('1 error');
  });
});

describe('module timeouts that recovered', () => {
  it('drops out of the count when the module arrives', () => {
    const w = boot();
    w.console.error('[CDN-TIMEOUT] SlowMod did not settle within 30 seconds');
    w.console.error('[CDN-TIMEOUT] GoneMod did not settle within 30 seconds');
    expect(badgeText(w)).toContain('2 errors');
    w.AlloModules.SlowMod = {};
    w.dispatchEvent(new w.CustomEvent('alloflow:module-registry-changed'));
    expect(badgeText(w)).toContain('1 error');
    const r = reportOf(w);
    expect(r.what).toContain('recovered: SlowMod loaded later');
    expect(r.what).toContain('This page load: 1 unresolved error.');
  });

  it('a registry status of loaded also counts as recovered', () => {
    const w = boot({ before: (win) => { win.__alloModuleRegistry = {}; } });
    w.console.error('[CDN-TIMEOUT] RegMod did not settle within 30 seconds');
    expect(badgeText(w)).toContain('1 error');
    w.__alloModuleRegistry.RegMod = { status: 'loaded' };
    w.dispatchEvent(new w.CustomEvent('alloflow:module-registry-changed'));
    expect(badgeText(w)).toBe('');
  });
});

describe('the live-session join secret never leaves the page', () => {
  it('is scrubbed from new entries, the report, and the worker payload', () => {
    const w = boot();
    w.console.error('fetch failed for https://x.example/api?key=AIzaSECRETKEY&v=1');
    const entry = w.AlloModules.ErrorReporter.getBuffer()[0];
    expect(entry.url).toContain('allo_mb=[redacted]');
    expect(entry.url).toContain('allo_ai=off');
    expect(entry.message).toContain('key=[redacted]');
    const r = reportOf(w);
    const all = JSON.stringify(r);
    expect(all).not.toContain(SECRET_HEAD);
    expect(all).not.toContain('AIzaSECRETKEY');
    expect(r.steps).toContain('allo_mb=[redacted]');
    expect(r.url).toContain('allo_mb=[redacted]');
  });

  it('is scrubbed from entries already sitting in storage', () => {
    const w = boot({ seed: [oldEntry(HOUR, 'x', { stack: 'at ' + LIVE_URL })] });
    expect(w.localStorage.getItem('alloflow_error_log')).not.toContain(SECRET_HEAD);
  });

  it('is scrubbed from trace tails, which other modules write unscrubbed', () => {
    const w = boot({ before: (win) => {
      win.__alloSessionSyncTrace = [{ at: Date.now(), event: 'mailbox:entry', detail: { href: LIVE_URL } }];
    } });
    w.console.error('x');
    const r = reportOf(w);
    expect(r.what).toContain('mailbox:entry');
    expect(r.what).not.toContain(SECRET_HEAD);
  });

  it('also covers the homework link (?allo_mbp=)', () => {
    const w = boot({ url: 'https://alloflow.example/app/?allo_mbp=' + SECRET });
    w.console.error('x');
    expect(JSON.stringify(reportOf(w))).not.toContain(SECRET_HEAD);
  });
});

describe('session trace lines in reports', () => {
  it('prints the fields of entries that keep them at the top level', () => {
    const w = boot({ before: (win) => {
      win.__alloSessionSyncTrace = [{ at: new Date().toISOString(), event: 'mailbox:call-failed', a: 'poll', ms: 20013, code: 'allo/mailbox-timeout' }];
    } });
    w.console.error('x');
    expect(reportOf(w).what).toMatch(/mailbox:call-failed \{.*"code":"allo\/mailbox-timeout"/);
  });
});
