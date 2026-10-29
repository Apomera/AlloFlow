// Bug reports must be safe for students to send, and a student can end up in
// teacher mode, so safety cannot depend on the view. Since 2026-10-28:
// - every report, in any view, carries technical facts only, never text the app
//   logged (console.error arguments can hold an answer, a roster entry, a prompt);
// - the full technical log is a teacher-view opt-in, off by default;
// - everything sent, typed or captured, is scrubbed of personal details.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync(process.env.REPORTER_SOURCE || 'error_reporter_module.js', 'utf8');
const redaction = createRequire(import.meta.url)('../identifier_redaction_module.js');
const windows = [];
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const el = (w, id) => w.document.getElementById(id);
const PRIVATE = 'Saving the answer for Jordan Reyes jordan.reyes@school.example 207-555-0142';

function boot({ teacher = false, url = 'https://alloflow.example/app/?lesson=water&student=jordan#step-3' } = {}) {
  vi.useFakeTimers();
  const w = new JSDOM('<html><body></body></html>', { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() }).window;
  windows.push(w);
  w.setTimeout = globalThis.setTimeout;
  w.clearTimeout = globalThis.clearTimeout;
  w.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, id: 'receipt-1' }) }));
  if (teacher) w.__alloPendingCoachPosture = 'educator';
  w.eval(source);
  return w;
}
function open(w) { w.AlloModules.ErrorReporter.openPanel('errors'); }
function send(w) {
  for (let i = 0; i < 3 && !el(w, 'aer-review-confirm').checked; i++) el(w, 'aer-review-confirm').click();
  expect(el(w, 'aer-send').disabled).toBe(false);
  el(w, 'aer-send').click();
  return JSON.parse(w.fetch.mock.calls.at(-1)[1].body);
}
function describeAs(w, text) {
  el(w, 'aer-description').value = text;
  el(w, 'aer-description').dispatchEvent(new w.Event('input', { bubbles: true }));
}

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('the default report carries no captured text, in any view', () => {
  it('leaves what the app logged on the device and says so', async () => {
    const w = boot();
    w.console.error(PRIVATE, { answer: 'My grandmother lives on 12 Elm Street' });
    open(w);
    expect(el(w, 'aer-include-log'), 'students are not offered the full log').toBeNull();
    const sent = JSON.stringify(send(w));
    await flush();
    for (const leak of ['Jordan', 'jordan.reyes', '555-0142', 'Elm Street', 'grandmother', 'student=jordan', 'step-3']) {
      expect(sent.includes(leak), leak).toBe(false);
    }
    expect(sent).toContain('message text from the app is not included');
    expect(sent).toContain('View: student mode');
  });

  it('keeps an app diagnostic tag and the module it names, not the rest', () => {
    const w = boot();
    w.console.error('[CDN-FAIL] MiscModals network error, trying an approved immutable fallback:', { for: 'Jordan Reyes' });
    open(w);
    const sent = JSON.stringify(send(w));
    expect(sent).toContain('[CDN-FAIL] MiscModals');
    expect(sent).not.toContain('approved immutable');
    expect(sent).not.toContain('Jordan');
  });

  it('keeps an engine exception with its file and line, eliding long quoted values', () => {
    const w = boot();
    const error = new w.Error("Cannot read properties of undefined (reading 'name')");
    w.dispatchEvent(new w.ErrorEvent('error', { message: "Uncaught TypeError: Cannot read properties of undefined (reading 'name')", filename: 'https://alloflow-cdn.pages.dev/view_misc_modals_module.js?v=abc', lineno: 42, colno: 7, error }));
    w.console.error("Uncaught Error: no match for 'a much longer quoted value that holds data'");
    open(w);
    const sent = JSON.stringify(send(w));
    expect(sent).toContain("Cannot read properties of undefined (reading 'name')");
    expect(sent).toContain('view_misc_modals_module.js:42');
    expect(sent).not.toContain('a much longer quoted value');
  });

  it('is also the default in teacher view; the full log needs an explicit opt-in', () => {
    const w = boot({ teacher: true });
    w.console.error(PRIVATE);
    open(w);
    expect(el(w, 'aer-include-log').checked).toBe(false);
    const sent = JSON.stringify(send(w));
    expect(sent).not.toContain('Jordan');
    expect(sent).toContain('View: teacher mode');
  });
});

describe('the rare cases: names inside error messages', () => {
  it('masks a likely name in an engine message and keeps its wording', () => {
    const w = boot();
    w.dispatchEvent(new w.ErrorEvent('error', { message: 'Uncaught Error: Could not find Jordan in the class list', filename: 'https://alloflow-cdn.pages.dev/teacher_module.js', lineno: 9, colno: 1, error: new w.Error('x') }));
    open(w);
    const sent = JSON.stringify(send(w));
    expect(sent).not.toContain('Jordan');
    expect(sent).toContain('Could not find […] in the class list');
    expect(sent).toContain('teacher_module.js:9');
  });

  it("removes the text Chrome quotes from a failed JSON parse, in both reports", () => {
    const snippet = `SyntaxError: Unexpected token 'J', "Jordan wro"... is not valid JSON`;
    const w = boot();
    w.dispatchEvent(new w.ErrorEvent('error', { message: 'Uncaught ' + snippet, filename: 'https://x.test/quiz_module.js', lineno: 3, colno: 1, error: new w.Error('x') }));
    open(w);
    const sent = JSON.stringify(send(w));
    expect(sent).not.toContain('Jordan');
    expect(sent).toContain('is not valid JSON');

    const t = boot({ teacher: true });
    t.console.error('[Quiz] parse failed:', snippet);
    open(t);
    el(t, 'aer-include-log').click();
    const full = JSON.stringify(send(t));
    expect(full).not.toContain('Jordan wro');
    expect(full).toContain('is not valid JSON');
  });
});

describe('the teacher-view full log is scrubbed of personal details', () => {
  it('removes identifiers and keeps the timestamps and build numbers a log needs', () => {
    const w = boot({ teacher: true });
    w.console.error('Ask Ms. Rivera (rivera@school.example, (207) 555-0142) about student id 88231, DOB: 05/12/2014, SSN 123-45-6789, 12 Elm Street; build 1793223021 at 2026-10-28 20:52:40');
    open(w);
    el(w, 'aer-include-log').click();
    expect(el(w, 'aer-include-log').checked).toBe(true);
    const sent = JSON.stringify(send(w));
    for (const leak of ['Rivera', 'rivera@', '555-0142', '88231', '05/12/2014', '123-45-6789', 'Elm Street']) {
      expect(sent.includes(leak), leak).toBe(false);
    }
    for (const kept of ['Ms. [name]', '[email]', '[phone]', 'student id [id]', 'DOB: [id]', '[ssn]', '[address]', '1793223021', '2026-10-28 20:52:40']) {
      expect(sent.includes(kept), kept).toBe(true);
    }
  });
});

describe('roster names on a teacher device', () => {
  const roster = JSON.stringify({ students: { 'Jordan Reyes': {}, 'Brave Otter': {} }, groups: {} });
  const LINE = 'Grading failed for Jordan Reyes, then Brave Otter; Reyes, Jordan retried; Reyes retried alone; be brave';

  it('removes every full codename, in either order, from the full log and the description', () => {
    const w = boot({ teacher: true });
    w.localStorage.setItem('alloflow_roster_key', roster);
    w.console.error(LINE);
    open(w);
    el(w, 'aer-include-log').click();
    describeAs(w, 'Jordan Reyes could not open the quiz');
    const sent = JSON.stringify(send(w));
    expect(sent).not.toContain('Jordan Reyes');
    expect(sent).not.toContain('Brave Otter');
    expect(sent).not.toContain('Reyes, Jordan');
    expect(sent).toContain('[student] could not open the quiz');
    // Without IdentifierRedaction's common-word guard, single parts and plain words stay.
    expect(sent).toContain('be brave');
  });

  it('also removes single name parts when IdentifierRedaction is loaded, but not common words', () => {
    const w = boot({ teacher: true });
    w.eval(readFileSync('identifier_redaction_module.js', 'utf8'));
    w.localStorage.setItem('alloflow_roster_key', roster);
    w.console.error(LINE);
    open(w);
    el(w, 'aer-include-log').click();
    const sent = JSON.stringify(send(w));
    expect(sent).not.toContain('Reyes');
    expect(sent).not.toContain('Jordan');
    expect(sent).toContain('be brave');
  });

  it('does nothing on a device with no roster', () => {
    const w = boot({ teacher: true });
    w.console.error('Grading failed for Jordan Reyes');
    open(w);
    el(w, 'aer-include-log').click();
    expect(JSON.stringify(send(w))).toContain('Jordan Reyes');
  });
});

describe('what the reporter types is scrubbed too', () => {
  it('scrubs the description and leads with the chosen problem', () => {
    const w = boot();
    open(w);
    el(w, 'aer-category').value = 'audio';
    el(w, 'aer-category').dispatchEvent(new w.Event('change', { bubbles: true }));
    describeAs(w, 'Read-aloud stopped. My mom is jordan.mom@family.example, call 207-555-0199.');
    const sent = send(w);
    expect(sent.what).toContain('Problem: Read-aloud or audio did not work');
    expect(sent.what).toContain('Read-aloud stopped.');
    expect(sent.what).not.toContain('jordan.mom');
    expect(sent.what).not.toContain('555-0199');
    expect(el(w, 'aer-description').value).toContain('[email]');
  });
});

describe('parity with IdentifierRedaction on the identifiers both remove', () => {
  it.each([
    ['email', 'Write to pat.lee@school.example today', 'pat.lee@school.example'],
    ['SSN', 'SSN 123-45-6789 on file', '123-45-6789'],
    ['phone', 'Call (207) 555-0142 after school', '555-0142'],
    ['labeled id', 'student id 88231 enrolled', '88231'],
    ['street address', 'Lives at 12 Elm Street now', '12 Elm Street'],
  ])('%s', (_, text, value) => {
    expect(redaction.scrubIdentifiers(text, {})).not.toContain(value);
    const w = boot();
    open(w);
    describeAs(w, text);
    expect(JSON.stringify(send(w))).not.toContain(value);
  });
});
