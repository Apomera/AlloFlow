// Submission Inbox: teacher score + comment for Persona "Role Swap" (2026-11-04).
//
// A Role Swap is a learner-authored 'persona-reflection' with config.kind
// 'role-swap' (no AI: the student answers as the historical figure, with
// evidence). The inbox used to show it only as text, and its manual score form
// worked for typed responses alone, so a teacher could not score it. The item
// is now rendered readably and scored through the SAME manual-score form,
// grades[idx] state, Save to gradebook record and CSV path as a response.
// The Role Swap item is produced by the REAL personas module save handler.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
const built = readFileSync('view_submission_inbox_module.js', 'utf8');
const React = require(resolve(modulesDir, 'react'));
const { createRoot } = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React;

const passage = 'In 1863 the president said that the nation was conceived in liberty and dedicated to the proposition that all men are created equal.';
const persona = { id: 'role-swap-resource', type: 'persona', data: [{ name: 'Lincoln' }], config: { personaSource: { kind: 'input', topic: 'Address', fingerprint: 'fp-1', excerpt: passage } } };
const timerTick = () => new Promise(r => setTimeout(r, 10));

// Slice the real pure helpers (same technique as submission_inbox_work_evidence).
const helpers = new Function(source.slice(source.indexOf('function siWorkEvidence('), source.indexOf('function SubmissionInbox('))
  + '\nreturn { siWorkEvidence, siRoleSwapItems, siResponsesWithRoleSwaps };')();

let SubmissionInbox, roleSwapItem, root, host;

function makeRoleSwapItem() {
  window.AlloModules = window.AlloModules || {};
  new Function(readFileSync('personas_module.js', 'utf8'))();
  const box = { items: [] };
  const liveRef = { current: {} };
  Object.assign(liveRef.current, {
    setHistory: updater => { box.items = typeof updater === 'function' ? updater(box.items) : updater; liveRef.current.history = box.items; },
    handleScoreUpdate: vi.fn(), generatedContent: persona, history: box.items,
  });
  const api = window.AlloModules.createPersonas({ liveRef, warnLog: () => {}, debugLog: () => {} });
  const saved = api.handleSavePersonaRoleSwap({
    mode: 'single',
    entries: [
      { speaker: 'Lincoln', question: 'Why did you speak at Gettysburg?', answer: 'To honor the fallen and renew our purpose.', evidence: 'conceived in liberty and dedicated to the proposition' },
      { speaker: 'Lincoln', question: 'What did you believe?', answer: 'That all are equal.', evidence: 'a quote that is nowhere in the passage at all' },
    ],
    checks: { inCharacter: true, usesEvidence: true, accurate: false },
  });
  expect(saved && saved.count).toBe(2);
  return box.items[0];
}

const submission = (content, responses = {}) => ({
  kind: 'alloflow-student-submission', schemaVersion: 2, nickname: 'Learner1', studentName: 'Learner1',
  docTitle: 'Gettysburg', timestamp: '2026-11-04T10:00:00.000Z', content, responses, answers: responses,
});

async function mountAndView(payload, history = [persona]) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(SubmissionInbox, {
      isOpen: true, onClose: vi.fn(), rosterKey: '', t: (k, f) => f || k, addToast: vi.fn(), onOpenAlloSheet: vi.fn(), history,
    }));
    await timerTick();
  });
  const text = JSON.stringify(payload);
  const file = new File([text], 'learner.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  const input = host.querySelector('input[aria-label="Submission files"]');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await timerTick(); await timerTick(); });
  const view = Array.from(host.querySelectorAll('button')).find(b => b.textContent.trim() === 'View');
  await act(async () => view.click());
}

const button = (scope, label) => Array.from(scope.querySelectorAll('button')).find(b => b.textContent.replace(/\s+/g, ' ').trim().includes(label));
function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.React = window.React = React;
  roleSwapItem = makeRoleSwapItem();
  delete window.AlloModules.SubmissionInbox;
  new Function(built)();
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.removeItem('alloflow_offline_grades');
});

describe('Role Swap model (untrusted file, teacher copy re-check)', () => {
  it('reads the real saved item into question/answer/evidence/self-check and keeps it out of plain text reflections', () => {
    const ev = helpers.siWorkEvidence(submission([roleSwapItem]), [persona]);
    expect(ev.interviews).toEqual([]);
    expect(ev.roleSwaps).toHaveLength(1);
    const rs = ev.roleSwaps[0];
    expect(rs.key).toBe('role-swap:' + roleSwapItem.config.roleSwapKey);
    expect(rs.entries.map(e => [e.question, e.evidenceInSource])).toEqual([['Why did you speak at Gettysburg?', true], ['What did you believe?', false]]);
    expect(rs.selfCheck).toEqual({ inCharacter: true, usesEvidence: true, accurate: false });
    expect(rs.checkedAgainstTeacherCopy).toBe(true);
  });

  it('does not trust a forged "found in source" flag when the teacher copy disagrees', () => {
    const forged = structuredClone(roleSwapItem);
    forged.config.roleSwap.entries[1].evidenceInSource = true;
    expect(helpers.siRoleSwapItems(submission([forged]), [persona])[0].entries[1].evidenceInSource).toBe(false);
    // Without a teacher copy the device's own check is shown as-is.
    expect(helpers.siRoleSwapItems(submission([forged]), [])[0].entries[1].evidenceInSource).toBe(true);
  });

  it('leaves ordinary reflections and malformed role swaps as text', () => {
    const broken = { ...roleSwapItem, config: { kind: 'role-swap', roleSwap: { entries: 'nope' } } };
    const plain = { id: 'r', type: 'persona-reflection', title: 'Reflection: Ada', data: 'I learned.' };
    const ev = helpers.siWorkEvidence(submission([plain, broken]), []);
    expect(ev.roleSwaps).toEqual([]);
    expect(ev.interviews.map(e => e.title)).toEqual(['Reflection: Ada', roleSwapItem.title]);
  });

  it('adds the readable text of scored role swaps to saved responses only', () => {
    const payload = submission([roleSwapItem], { q1: 'typed' });
    expect(helpers.siResponsesWithRoleSwaps(payload, {}, [persona])).toBe(payload.responses);
    const key = 'role-swap:' + roleSwapItem.config.roleSwapKey;
    const out = helpers.siResponsesWithRoleSwaps(payload, { [key]: { score: 70 } }, [persona]);
    expect(out.q1).toBe('typed');
    expect(out[key]).toContain('To honor the fallen and renew our purpose.');
    expect(out[key]).toContain('(found in source)');
    expect(payload.responses[key]).toBeUndefined();
  });
});

describe('Submission Inbox: teacher scores a Role Swap', () => {
  it('renders it readably and scores it through the manual score form into the gradebook', async () => {
    await mountAndView(submission([roleSwapItem]));
    const block = host.querySelector('[data-role-swap-key]');
    expect(block, host.textContent).toBeTruthy();
    expect(host.textContent).toContain('Interview reflections (1)');
    expect(block.textContent).toContain('Why did you speak at Gettysburg?');
    expect(block.textContent).toContain('Answer as Lincoln');
    expect(block.textContent).toContain('To honor the fallen and renew our purpose.');
    expect(block.querySelectorAll('blockquote')).toHaveLength(2);
    expect(block.querySelectorAll('[data-role-swap-evidence-found]')).toHaveLength(1);
    expect(block.querySelectorAll('[data-role-swap-entry]')[0].querySelector('[data-role-swap-evidence-found]')).toBeTruthy();
    const checks = Array.from(block.querySelectorAll('input[type="checkbox"]'));
    expect(checks.map(c => [c.checked, c.disabled])).toEqual([[true, true], [true, true], [false, true]]);
    expect(checks[2].closest('label').textContent).toContain('Historically accurate to the source');
    // No typed responses: the AI rubric grader is not offered for this row.
    expect(button(host, 'Grade responses')).toBeUndefined();

    await act(async () => button(block, 'Score manually').click());
    const dialog = host.querySelector('[role="dialog"][aria-labelledby="anchor-dialog-title"]');
    expect(dialog.textContent).toContain('Score this response');
    expect(dialog.textContent).toContain('What did you believe?');
    await act(async () => {
      setValue(dialog.querySelector('input[type="number"]'), '80');
      setValue(dialog.querySelector('textarea'), 'Strong voice; check the second quote.');
    });
    await act(async () => button(dialog, 'Save score').click());

    const scored = host.querySelector('[data-role-swap-key]');
    expect(scored.textContent).toContain('80/100');
    expect(scored.textContent).toContain('Strong voice; check the second quote.');
    expect(button(scored, 'Edit score')).toBeTruthy();
    expect(host.textContent).toContain('1 of 1 expected responses scored');

    await act(async () => button(host, 'Mark human reviewed').click());
    expect(button(host, 'Human reviewed').getAttribute('aria-pressed')).toBe('true');
    await act(async () => button(host, 'Save to gradebook').click());
    const saved = Object.values(JSON.parse(localStorage.getItem('alloflow_offline_grades')));
    expect(saved).toHaveLength(1);
    const key = 'role-swap:' + roleSwapItem.config.roleSwapKey;
    expect(saved[0].grades[key]).toMatchObject({ score: 80, status: 'partially-correct', feedback: 'Strong voice; check the second quote.', origin: 'teacher-edit', reviewState: 'reviewed' });
    expect(saved[0].review).toMatchObject({ state: 'reviewed', expectedResponseCount: 1, scoredResponseCount: 1 });
    expect(saved[0].responses[key]).toContain('Why did you speak at Gettysburg?');
  });

  it('counts a role swap beside typed responses and keeps the shared row actions', async () => {
    await mountAndView(submission([roleSwapItem], { 'allo-ta:one': 'typed answer' }));
    expect(button(host, 'Grade responses')).toBeTruthy();
    await act(async () => button(host.querySelector('[data-role-swap-key]'), 'Score manually').click());
    const dialog = host.querySelector('[role="dialog"][aria-labelledby="anchor-dialog-title"]');
    await act(async () => setValue(dialog.querySelector('input[type="number"]'), '90'));
    await act(async () => button(dialog, 'Save score').click());
    expect(host.textContent).toContain('1 of 2 captured responses scored');
    expect(Array.from(host.querySelectorAll('button')).filter(b => b.textContent.includes('Save to gradebook'))).toHaveLength(1);
  });

  it('ships the change in the built module and every mirror', () => {
    for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      expect(readFileSync(resolve(mirror, 'view_submission_inbox_module.js'), 'utf8') === built, mirror).toBe(true);
    }
    expect(built.includes('function siRoleSwapItems('), 'built module').toBe(true);
  });
});
