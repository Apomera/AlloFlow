// Communications Studio drafting behaviour, driven through the SHIPPED module
// with real React and a mocked model (2026-09-23).
//
// Each block pins a defect found by running the tool, not by reading it:
//   - every call used JSON mode, so letters and translations came back as JSON;
//   - a 120-student grid sent 40 students and nothing said the rest were gone,
//     and a reply that skipped or renamed a student was not noticed;
//   - a Spanish translation was copied under a "Somali" heading after the
//     language changed, and a translation of an older draft was still copied;
//   - peeking at another template erased the draft, and closing discarded
//     everything with no question asked (nothing in the studio is saved).

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Each test drives many React commits; on a loaded shared machine one has
// taken 9 s against 0.4 s alone, so the 5 s default reads load as failure.
vi.setConfig({ testTimeout: 30000 });

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Panel;
let root;
let host;
let calls;
let copied;

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.CommunicationsStudio;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'communications_studio_module.js'), 'utf8'))();
  Panel = window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel;
});

const PROSE = 'Dear families, this week we learned fractions.';
const SPANISH = 'Estimadas familias: esta semana aprendimos fracciones.';
const BACK = 'Dear families: this week we learned fractions.';
const codenamesIn = (prompt) => Array.from(prompt.matchAll(/^(S\d+) \|/gm), (m) => m[1]);

function mockModel(respond) {
  calls = [];
  window.callGemini = vi.fn(async (prompt, jsonMode, _search, _temp, _query, signal) => { calls.push({ prompt, json: jsonMode, signal }); return respond(prompt, jsonMode, signal); });
}
const plainModel = () => mockModel((prompt, json) => {
  if (json) return JSON.stringify(codenamesIn(prompt).map((c) => ({ codename: c, comment: prompt.startsWith('Translate each') ? `${c} en español` : `${c} comment` })));
  if (prompt.includes('back into English')) return BACK;
  return prompt.startsWith('Translate') ? SPANISH : PROSE;
});
// A model call that only ends when the studio aborts it.
const hangUntilAborted = (signal) => new Promise((_, reject) => {
  signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
});

beforeEach(() => {
  copied = [];
  window.alloCopyText = vi.fn(async (text) => { copied.push(text); return true; });
  window.__alloAddToast = vi.fn();
  plainModel();
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  window.__alloFocusTrapStack = [];
  delete window.callGemini;
  vi.restoreAllMocks();
  localStorage.clear();
});

function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Panel, { isOpen: true, t: (k) => k, onClose: () => {}, ...props })));
}

const dialog = () => host.querySelector('[role="dialog"]');
const q = (sel) => dialog().querySelector(sel);
const control = (label) => {
  const el = Array.from(dialog().querySelectorAll('label')).find((l) => l.textContent.trim().startsWith(label));
  if (!el) throw new Error(`no field labelled ${label}`);
  return el.querySelector('textarea, select');
};
const button = (text) => {
  const el = Array.from(dialog().querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(text));
  if (!el) throw new Error(`no button ${text}`);
  return el;
};
const tab = (name) => Array.from(dialog().querySelectorAll('[role="tab"]')).find((b) => b.textContent === name);
const click = (el) => act(async () => { el.click(); });
const setValue = (el, value) => act(async () => {
  const proto = { SELECT: window.HTMLSelectElement, INPUT: window.HTMLInputElement }[el.tagName] || window.HTMLTextAreaElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
const escape = () => act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
const key = (el, k) => act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const draftBox = () => q('[data-comms-output]');
const rowBoxes = () => Array.from(dialog().querySelectorAll('[data-comms-row] > textarea'));
const rowTranslations = () => Array.from(dialog().querySelectorAll('[data-comms-row-translation]'), (b) => b.value);
const rowComments = () => rowBoxes().map((b) => b.value);
const rowCodenames = () => Array.from(dialog().querySelectorAll('[data-comms-row]'), (li) => li.getAttribute('data-comms-row'));
const toasts = () => window.__alloAddToast.mock.calls.map((c) => c[0]).join(' | ');
const grid = (n) => Array.from({ length: n }, (_, i) => `S${i + 1} | reads carefully | fractions | Perseverance 3`).join('\n');

async function draftFamilyUpdate() {
  await setValue(control('What we learned'), 'Fractions on a number line.');
  await click(button('Draft from my notes'));
}

describe('JSON mode', () => {
  it('is used only for the report-card batch; letters, replies and translations ask for plain text', async () => {
    mount();
    await draftFamilyUpdate();
    expect(draftBox().value).toBe(PROSE);
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await click(tab('Recommendation letter'));
    await click(button('Draft from my notes'));
    await click(tab('Reply to a family message'));
    await click(button('Draft from my notes'));
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), 'S1 | reads | rushing | Perseverance 3');
    await click(button('Draft from my notes'));
    expect(calls.map((c) => c.json)).toEqual([false, false, false, false, true]);
    expect(rowComments()).toEqual(['S1 comment']);
  });
});

describe('batch report cards', () => {
  it('drafts a 120-student grid in chunks, reports the skipped and renamed students, and retries only those', async () => {
    mockModel((prompt) => {
      const names = codenamesIn(prompt);
      const firstPass = calls.length <= 3;
      return JSON.stringify(names
        .filter((c) => !(firstPass && c === 'S57'))
        .map((c) => ({ codename: firstPass && c === 'S80' ? 'Student S80' : c, comment: `${c} comment` })));
    });
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(120));
    await click(button('Draft from my notes'));
    expect(calls.map((c) => [c.json, codenamesIn(c.prompt).length])).toEqual([[true, 40], [true, 40], [true, 40]]);
    const report = q('[data-comms-batch-report]');
    expect(report.textContent).toContain('118 of 120');
    expect(report.textContent).toContain('No comment came back for: S57, S80');
    expect(report.textContent).toContain('Student S80');
    expect(rowComments()).toHaveLength(118);
    expect(rowCodenames()).not.toContain('S57');

    await click(q('[data-comms-retry-missing]'));
    expect(calls).toHaveLength(4);
    expect(codenamesIn(calls[3].prompt)).toEqual(['S57', 'S80']);
    expect(q('[data-comms-batch-report]').textContent).toContain('120 of 120');
    expect(q('[data-comms-retry-missing]')).toBeNull();
    expect(rowCodenames()).toEqual(Array.from({ length: 120 }, (_, i) => 'S' + (i + 1)));
    expect(rowComments()[56]).toBe('S57 comment');
  });

  it('Stop keeps what came back, lists the rest as missing, and leaves them retryable', async () => {
    mockModel((prompt, json, signal) => (calls.length === 2
      ? hangUntilAborted(signal)
      : JSON.stringify(codenamesIn(prompt).map((c) => ({ codename: c, comment: `${c} comment` })))));
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(120));
    q('[data-comms-draft]').focus();
    await click(q('[data-comms-draft]'));
    expect(calls).toHaveLength(2);
    // Screen readers hear progress through the module's live region.
    expect(document.getElementById('allo-live-commstudio').textContent).toBe('Drafting comments 41 to 80 of 120.');
    const stopButton = q('[data-comms-stop]');
    expect(document.activeElement).toBe(stopButton);
    await click(stopButton);
    expect(calls).toHaveLength(2);
    expect(calls[1].signal.aborted).toBe(true);
    expect(q('[data-comms-batch-report]').textContent).toContain('40 of 120');
    expect(rowComments()).toHaveLength(40);
    expect(toasts()).toContain('Stopped. 80 students still need a comment.');
    expect(q('[data-comms-stop]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-comms-draft]'));
    await click(q('[data-comms-retry-missing]'));
    expect(calls.slice(2).map((c) => codenamesIn(c.prompt).length)).toEqual([40, 40]);
    expect(rowComments()).toHaveLength(120);
  });

  it('closing the studio mid-batch cancels the request instead of leaving it running', async () => {
    mockModel((prompt, json, signal) => hangUntilAborted(signal));
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(1);
    expect(calls[0].signal.aborted).toBe(false);
    act(() => root.unmount());
    root = null;
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('shows each comment with its length, reading level and the character limit, which also reaches the prompt', async () => {
    mockModel((prompt) => JSON.stringify(codenamesIn(prompt).map((c) => ({
      codename: c,
      comment: c === 'S2' ? 'The student demonstrates considerable metacognitive sophistication, articulating interdisciplinary connections and consistently evaluating alternative representational strategies before committing.' : `${c} reads with care. Ask about fractions.`,
    }))));
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(q('[data-comms-char-limit]'), '100');
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    expect(calls[0].prompt).toContain('at most 100 characters including spaces');
    expect(q('[data-comms-row="S2"] [data-comms-row-chars]').textContent).toMatch(/^\d+\/100 characters$/);
    expect(q('[data-comms-row="S2"]').textContent).toContain('grade 12+');
    const summary = q('[data-comms-batch-summary]').textContent;
    expect(summary).toContain('3 comments.');
    expect(summary).toContain('1 over 100 characters: S2.');
    expect(summary).toContain('1 above the family reading target: S2.');
    expect(JSON.parse(localStorage.getItem('alloflow_comms_studio_prefs')).charLimit).toBe(100);
  });

  it('edits, copies and redoes one student without touching the others', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    await setValue(rowBoxes()[1], 'S2 my own words.');
    expect(q('[data-comms-row="S2"]').textContent).toContain('edited');
    await click(q('[data-comms-row="S2"] button'));
    expect(copied.pop()).toBe('S2 my own words.');

    await click(q('[data-comms-redo="S3"]'));
    expect(calls).toHaveLength(2);
    expect(calls[1].json).toBe(true);
    expect(codenamesIn(calls[1].prompt)).toEqual(['S3']);
    expect(rowComments()).toEqual(['S1 comment', 'S2 my own words.', 'S3 comment']);

    await click(q('[data-comms-redo="S2"]'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]').textContent).toContain('Replace your edited comment for S2?');
    await click(button('Replace it'));
    expect(calls).toHaveLength(3);
    expect(rowComments()[1]).toBe('S2 comment');
  });

  it('copies the batch as a table for a spreadsheet, which counts as sent', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(2));
    await click(button('Draft from my notes'));
    await click(q('[data-comms-copy-table]'));
    expect(copied.pop()).toBe('Codename\tComment\nS1\tS1 comment\nS2\tS2 comment');
    await click(button('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a reply cut off at the output limit keeps the complete comments and leaves the rest to retry', async () => {
    mockModel((prompt) => {
      const names = codenamesIn(prompt);
      const full = JSON.stringify(names.map((c) => ({ codename: c, comment: `${c} comment` })));
      return calls.length === 1 ? full.slice(0, full.indexOf('"S3"') + 8) : full;
    });
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(4));
    await click(button('Draft from my notes'));
    expect(rowCodenames()).toEqual(['S1', 'S2']);
    expect(q('[data-comms-batch-report]').textContent).toContain('No comment came back for: S3, S4');
    await click(q('[data-comms-retry-missing]'));
    expect(codenamesIn(calls[1].prompt)).toEqual(['S3', 'S4']);
    expect(rowCodenames()).toEqual(['S1', 'S2', 'S3', 'S4']);
  });

  it('refuses a grid over the limit instead of drafting part of it', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(251));
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(0);
    expect(window.__alloAddToast.mock.calls.map((c) => c[0]).join(' ')).toContain('251');
  });
});

describe('translations', () => {
  it('changing the language drops the old translation instead of relabelling it', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    expect(q('[data-comms-translation]').value).toBe(SPANISH);
    await setValue(control('Also in'), 'Somali');
    expect(q('[data-comms-translation]')).toBeNull();
    await click(button('Copy all'));
    expect(copied[0]).not.toContain('Somali');
    expect(copied[0]).not.toContain(SPANISH);
  });

  it('asks before discarding a translation the teacher edited', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await setValue(q('[data-comms-translation]'), `${SPANISH} (revisado)`);
    await setValue(control('Also in'), 'Somali');
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(q('[data-comms-translation]').value).toContain('(revisado)');
    await click(button('Keep editing'));
    expect(control('Also in').value).toBe('Spanish');
  });

  it('a translation of an older draft is left out of Copy until retranslated or confirmed', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await click(button('Copy all'));
    expect(copied[0]).toContain(`--- Spanish (machine draft; have a bilingual colleague check) ---\n${SPANISH}`);
    await setValue(draftBox(), `${PROSE} Next week: decimals.`);
    expect(q('[data-comms-translation-stale]')).not.toBeNull();
    await click(button('Copy all'));
    expect(copied[1]).not.toContain(SPANISH);
    await click(button('It still matches'));
    await click(button('Copy all'));
    expect(copied[2]).toContain(SPANISH);
  });
});

describe('work is not lost', () => {
  it('each template keeps its own draft while the studio is open', async () => {
    mount();
    await draftFamilyUpdate();
    await click(tab('Recommendation letter'));
    expect(draftBox().value).toBe('');
    await click(tab('Family update'));
    expect(draftBox().value).toBe(PROSE);
  });

  it('closing asks when something would be lost, and not after it was copied', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await setValue(control('What we learned'), 'Fractions.');
    await escape();
    expect(onClose).not.toHaveBeenCalled();
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(document.activeElement).toBe(button('Keep editing'));
    await escape();
    expect(q('[data-comms-confirm]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await click(button('Close'));
    await click(button('Discard and close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight away once the draft was copied, but asks about a parked draft on another template', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await draftFamilyUpdate();
    await click(button('Copy all'));
    await click(button('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await click(tab('Recommendation letter'));
    await click(button('Draft from my notes'));
    await click(tab('Family update'));
    await click(button('Close'));
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a prose redraft keeps the edited draft under Earlier drafts, and it can be brought back', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(draftBox(), `${PROSE} My own sentence.`);
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]')).toBeNull();
    expect(draftBox().value).toBe(PROSE);
    expect(q('[data-comms-versions]').textContent).toContain('Earlier drafts (1)');
    expect(q('[data-comms-versions]').textContent).toContain('My own sentence.');
    await click(q('[data-comms-use-version="0"]'));
    expect(draftBox().value).toBe(`${PROSE} My own sentence.`);
    // The draft it replaced is kept in turn.
    expect(q('[data-comms-versions] li').textContent).toContain(PROSE);
    expect(q('[data-comms-versions] li').textContent).not.toContain('My own sentence.');
  });

  it('a report-card redraft asks before replacing comments the teacher edited', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(2));
    await click(button('Draft from my notes'));
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]')).toBeNull();
    await setValue(rowBoxes()[0], 'S1 my own words.');
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]').textContent).toContain('Replace the comments you edited?');
    await click(button('Replace it'));
    expect(calls).toHaveLength(3);
    expect(rowComments()[0]).toBe('S1 comment');
  });

  it('asks before Fill from roster replaces a grid the teacher typed', async () => {
    mount({ roster: { students: { S1: '', S2: '' } } });
    await click(tab('Report-card comments (batch)'));
    const gridBox = () => control('One student per line');
    await setValue(gridBox(), 'X | typed by hand');
    await click(button('Fill from roster'));
    await click(button('Keep editing'));
    expect(gridBox().value).toBe('X | typed by hand');
    await click(button('Fill from roster'));
    await click(button('Replace it'));
    expect(gridBox().value).toMatch(/^S1 \|/);
    await click(button('Fill from roster'));
    expect(q('[data-comms-confirm]')).toBeNull();
  });
});

describe('names and sensitive messages', () => {
  it('a grid filled from the roster raises no name warning; a typed name in the first column does', async () => {
    mount({ roster: { students: { 'Brave Falcon': '', 'Calm Otter': '' } } });
    await click(tab('Report-card comments (batch)'));
    await click(button('Fill from roster'));
    expect(control('One student per line').value).toContain('Brave Falcon |');
    expect(q('[data-comms-name-warning]')).toBeNull();
    await setValue(control('One student per line'), 'Brave Falcon | x\nMaria Lopez | y');
    expect(q('[data-comms-unknown-codenames]').textContent).toContain('Maria Lopez');
  });

  it('flags first names in a pasted family message and replaces them on request, before anything is sent', async () => {
    mount();
    await click(tab('Reply to a family message'));
    await setValue(control('Their message'), "Hi, this is Jayden's mom. My daughter Maria has been upset.\nThanks,\nRosa");
    expect(q('[data-comms-name-warning]').textContent).toContain('Jayden, Maria, Rosa');
    await click(q('[data-comms-replace-names]'));
    expect(control('Their message').value).toBe("Hi, this is [Name]'s mom. My daughter [Name] has been upset.\nThanks,\n[Name]");
    expect(q('[data-comms-name-warning]')).toBeNull();
    await setValue(control('What I want to say'), 'The retest is Friday.');
    await click(button('Draft from my notes'));
    expect(calls[0].prompt).not.toMatch(/Jayden|Maria|Rosa/);
  });

  it('replacing names in the grid never turns a codename column into [Name]', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), 'Maria Lopez | Maria Lopez helps her group | |\nS2 | reads | |');
    await click(q('[data-comms-replace-names]'));
    expect(control('One student per line').value).toBe('Maria Lopez | [Name] helps her group | |\nS2 | reads | |');
  });

  it('warns when the draft brings in a name the teacher did not type', async () => {
    mockModel(() => 'Dear families, Marcus Hale led our fraction talk this week.');
    mount();
    await draftFamilyUpdate();
    expect(q('[data-comms-draft-names]').textContent).toContain('Marcus Hale');
  });

  it('replaces a name the model brought in, in a letter and in only the batch comment that has it', async () => {
    mockModel(() => 'Dear families, Marcus Hale led our fraction talk this week.');
    mount();
    await draftFamilyUpdate();
    await click(q('[data-comms-replace-draft-names]'));
    expect(draftBox().value).toBe('Dear families, [Name] led our fraction talk this week.');
    expect(q('[data-comms-draft-names]')).toBeNull();

    mockModel((prompt) => JSON.stringify(codenamesIn(prompt).map((c) => ({ codename: c, comment: c === 'S2' ? 'S2 helped Marcus Hale with fractions.' : `${c} reads well.` }))));
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    expect(q('[data-comms-draft-names]').textContent).toContain('Marcus Hale');
    await click(q('[data-comms-replace-draft-names]'));
    expect(rowComments()).toEqual(['S1 reads well.', 'S2 helped [Name] with fractions.', 'S3 reads well.']);
    expect(q('[data-comms-row="S2"]').textContent).toContain('edited');
    expect(q('[data-comms-row="S1"]').textContent).not.toContain('edited');
    expect(q('[data-comms-draft-names]')).toBeNull();
  });

  it('does not repeat the warning in the draft for a name the teacher typed and was already warned about', async () => {
    mockModel(() => 'Dear families, Marcus Hale led our fraction talk this week.');
    mount();
    await setValue(control('What we learned'), 'Marcus Hale led the fraction talk.');
    await click(button('Draft from my notes'));
    expect(q('[data-comms-name-warning]').textContent).toContain('Marcus Hale');
    expect(q('[data-comms-draft-names]')).toBeNull();
  });

  it('flags safety and legal language in a family message without blocking the draft', async () => {
    mount();
    await click(tab('Reply to a family message'));
    await setValue(control('Their message'), 'He said he wants to hurt himself. We have also called our lawyer.');
    expect(q('[data-comms-sensitive-safety]').textContent).toContain('hurt himself');
    expect(q('[data-comms-sensitive-legal]').textContent).toContain('lawyer');
    await setValue(control('What I want to say'), 'The counselor will call today.');
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toContain('say who at school will follow up');
  });
});

describe('back-translation check', () => {
  it('translates the translation back to English, and drops the check once the translation is edited', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await click(q('[data-comms-back-translate]'));
    const last = calls[calls.length - 1];
    expect(last.json).toBe(false);
    expect(last.prompt).toContain('Translate the following Spanish text back into English');
    expect(last.prompt).toContain(SPANISH);
    expect(q('[data-comms-back-check]').textContent).toContain(BACK);
    await setValue(q('[data-comms-translation]'), `${SPANISH} Gracias.`);
    expect(q('[data-comms-back-check]')).toBeNull();
  });
});

describe('template tabs follow the ARIA tabs pattern', () => {
  it('arrow keys, Home and End move between templates, and only the selected tab is in the Tab order', async () => {
    mount();
    const tabs = () => Array.from(dialog().querySelectorAll('[role="tab"]'));
    expect(tabs().map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(tabs().every((b) => b.getAttribute('aria-controls') === 'comms-tabpanel')).toBe(true);
    expect(q('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tabs()[0].id);
    tabs()[0].focus();
    await key(tabs()[0], 'ArrowRight');
    expect(tab('Report-card comments (batch)').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Report-card comments (batch)'));
    expect(q('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('comms-tab-report-card');
    await key(document.activeElement, 'End');
    expect(document.activeElement).toBe(tab('Reply to a family message'));
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement).toBe(tab('Family update'));
    await key(document.activeElement, 'ArrowLeft');
    expect(document.activeElement).toBe(tab('Reply to a family message'));
    await key(document.activeElement, 'Home');
    expect(document.activeElement).toBe(tab('Family update'));
    expect(tabs().map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
  });
});

describe('simplify and shorten', () => {
  const HARD = 'The interdisciplinary curriculum emphasizes metacognitive strategies, collaborative inquiry, and sustained argumentation across multiple representational modalities.';
  const PLAIN = 'We practiced thinking about our thinking. We worked in groups.';

  it('rewrites a family draft above the reading target in plain text, and Undo brings back the original', async () => {
    mockModel((prompt) => (prompt.startsWith('Rewrite this') ? PLAIN : HARD));
    mount();
    await draftFamilyUpdate();
    expect(draftBox().value).toBe(HARD);
    await click(q('[data-comms-simplify]'));
    const last = calls[calls.length - 1];
    expect(last.json).toBe(false);
    expect(last.prompt).toContain('Rewrite this message to families in plainer words');
    expect(last.prompt).toContain('Keep every fact');
    expect(last.prompt).toContain(HARD);
    expect(draftBox().value).toBe(PLAIN);
    expect(q('[data-comms-simplify]')).toBeNull();
    await click(q('[data-comms-undo-simplify]'));
    expect(draftBox().value).toBe(HARD);
    // The restored text is the model's draft, not a teacher edit.
    await click(button('Draft from my notes'));
    expect(q('[data-comms-confirm]')).toBeNull();
  });

  it('shortens one comment over the character limit, with the limit in the prompt, and Undo restores it', async () => {
    const LONG = 'S2 reads with care and asks thoughtful questions about every chapter we read together in class this term.';
    mockModel((prompt, json) => (json
      ? JSON.stringify(codenamesIn(prompt).map((c) => ({ codename: c, comment: c === 'S2' ? LONG : `${c} reads well.` })))
      : 'S2 reads with care.'));
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(q('[data-comms-char-limit]'), '60');
    await setValue(control('One student per line'), grid(2));
    await click(button('Draft from my notes'));
    expect(q('[data-comms-simplify-row="S1"]')).toBeNull();
    expect(q('[data-comms-simplify-row="S2"]').textContent).toBe('Shorten');
    await click(q('[data-comms-simplify-row="S2"]'));
    const last = calls[calls.length - 1];
    expect(last.json).toBe(false);
    expect(last.prompt).toContain('Rewrite this report-card comment');
    expect(last.prompt).toContain('At most 60 characters including spaces.');
    expect(last.prompt).toContain(LONG);
    expect(rowComments()).toEqual(['S1 reads well.', 'S2 reads with care.']);
    expect(q('[data-comms-row="S2"]').textContent).not.toContain('edited');
    await click(q('[data-comms-undo-row="S2"]'));
    expect(rowComments()[1]).toBe(LONG);
    expect(q('[data-comms-row="S2"]').textContent).not.toContain('edited');
  });
});

describe('per-student translation of a batch', () => {
  it('translates each comment under its student, copies it as a column, and retranslates only a changed comment', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    await setValue(control('Also in'), 'Spanish');
    expect(q('[data-comms-translate-rows]').textContent).toBe('Draft in Spanish (3)');
    await click(q('[data-comms-translate-rows]'));
    const first = calls[calls.length - 1];
    expect(first.json).toBe(true);
    expect(first.prompt).toContain('Translate each report-card comment below into Spanish');
    expect(codenamesIn(first.prompt)).toEqual(['S1', 'S2', 'S3']);
    expect(rowTranslations()).toEqual(['S1 en español', 'S2 en español', 'S3 en español']);
    expect(q('[data-comms-translate-rows]')).toBeNull();
    expect(q('[data-comms-translated-count]').textContent).toContain('3 of 3 translated into Spanish');
    await click(q('[data-comms-copy-table]'));
    expect(copied.pop().split('\n').slice(0, 2)).toEqual(['Codename\tComment\tComment (Spanish)', 'S1\tS1 comment\tS1 en español']);

    await setValue(rowBoxes()[1], 'S2 new words.');
    expect(q('[data-comms-row-translation-stale="S2"]')).not.toBeNull();
    await click(q('[data-comms-copy-table]'));
    expect(copied.pop().split('\n')[2]).toBe('S2\tS2 new words.\t');
    await click(button('Copy all'));
    const all = copied.pop();
    expect(all).toContain('--- Spanish (machine draft; have a bilingual colleague check) ---\nS1: S1 en español\n\nS3: S3 en español');
    expect(all).not.toContain('S2 en español');

    expect(q('[data-comms-translate-rows]').textContent).toBe('Draft in Spanish (1)');
    await click(q('[data-comms-translate-rows]'));
    expect(codenamesIn(calls[calls.length - 1].prompt)).toEqual(['S2']);
    expect(q('[data-comms-row-translation-stale="S2"]')).toBeNull();
    expect(rowTranslations()[1]).toBe('S2 en español');
  });
});

describe('evidence check, notes and the attention filter', () => {
  const invented = (prompt) => JSON.stringify(codenamesIn(prompt).map((c) => ({
    codename: c,
    comment: c === 'S2' ? 'S2 scored 92% this term and she leads her group.' : `${c} reads well and likes math.`,
  })));

  it('flags a number and a pronoun that are not in that student\'s notes, and shows the notes', async () => {
    mockModel(invented);
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    const gaps = q('[data-comms-row-gaps="S2"]').textContent;
    expect(gaps).toContain('92%');
    expect(gaps).toContain('“she”, “her”');
    expect(q('[data-comms-row-gaps="S1"]')).toBeNull();
    const notes = q('[data-comms-row-notes="S2"]');
    expect(notes.tagName).toBe('DETAILS');
    expect(notes.textContent).toContain('Strengths: reads carefully');
    expect(notes.textContent).toContain('Habits: Perseverance 3');
  });

  it('can show only the comments that need a look', async () => {
    mockModel(invented);
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    const toggle = q('[data-comms-attention-toggle]');
    expect(toggle.textContent).toBe('Show only the ones to check (1)');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle);
    expect(rowCodenames()).toEqual(['S2']);
    expect(q('[data-comms-attention-toggle]').getAttribute('aria-pressed')).toBe('true');
    await setValue(rowBoxes()[0], 'S2 likes math a lot.');
    expect(rowCodenames()).toEqual([]);
    expect(q('[data-comms-attention-empty]')).not.toBeNull();
    await click(q('[data-comms-attention-toggle]'));
    expect(rowCodenames()).toEqual(['S1', 'S2', 'S3']);
  });

  it('flags a number and a pronoun in a prose draft that the notes do not have', async () => {
    mockModel(() => 'Dear families, 25 students finished the unit and he helped everyone.');
    mount();
    await setValue(control('What we learned'), 'Fractions on a number line.');
    await click(button('Draft from my notes'));
    const gaps = q('[data-comms-draft-gaps]').textContent;
    expect(gaps).toContain('25');
    expect(gaps).toContain('“he”');
    await setValue(control('What we learned'), 'Fractions on a number line; 25 students finished; he helped.');
    expect(q('[data-comms-draft-gaps]')).toBeNull();
  });
});

describe('print', () => {
  const printedHtml = () => {
    const frames = Array.from(document.querySelectorAll('iframe[data-comms-print-frame]'));
    return frames[frames.length - 1].getAttribute('srcdoc');
  };
  afterEach(() => { document.querySelectorAll('iframe[data-comms-print-frame]').forEach((f) => f.remove()); });

  it('prints a report-card batch one page per student with a blank name line and each current translation', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(3));
    await click(button('Draft from my notes'));
    await setValue(control('Also in'), 'Spanish');
    await click(q('[data-comms-translate-rows]'));
    await setValue(rowBoxes()[2], 'S3 new words.');
    await click(q('[data-comms-print]'));
    const html = printedHtml();
    expect(html.match(/<section class="page">/g)).toHaveLength(3);
    expect(html.match(/For the family of:/g)).toHaveLength(3);
    expect(html).toContain('S1 en español');
    expect(html).not.toContain('S3 en español');
    expect(html).toContain('S3 new words.');
    await click(button('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prints a prose draft as one page without a name line', async () => {
    mount();
    await draftFamilyUpdate();
    expect(q('[data-comms-print]').textContent).toBe('Print');
    await click(q('[data-comms-print]'));
    const html = printedHtml();
    expect(html.match(/<section class="page">/g)).toHaveLength(1);
    expect(html).toContain(PROSE);
    expect(html).not.toContain('For the family of');
  });
});
