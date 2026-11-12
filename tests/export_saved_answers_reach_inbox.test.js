// Typed answers in the resource pack export reach the teacher (2026-11-11).
//
// Types into the student on-screen copy (Cornell note template + DBQ), presses
// "Save my answers", captures the file it writes and reads it with the
// Submission Inbox's own parser. A new response field that the save step or the
// inbox drops fails here, not in a classroom.

import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let pipeline, inboxMeta;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('view_submission_inbox_module.js');
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
}, 60000);

const items = [
  { id: 'nt', type: 'note-taking', title: 'Cornell notes', data: { templateType: 'cornell-notes', cues: [{ text: 'What is erosion?' }], notes: [{ text: '' }], summary: '' } },
  { type: 'dbq', id: 'dbq', title: 'Sources', data: {
    documents: [{ id: 'A', title: 'Card A', excerpt: 'Text', sourcingQuestions: ['Who wrote it?'], analysisQuestions: ['What does it claim?'] }],
    synthesisPrompt: 'Write your conclusion.' } },
];

async function saveTypedAnswers(type) {
  const html = pipeline.generateFullPackHTML(items, 'Round trip', false, {}, { annotations: [] });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/pack.html', virtualConsole: new VirtualConsole() });
  const win = dom.window;
  const blobs = [];
  win.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:captured'; };
  win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  await new Promise((done) => (win.document.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
  await new Promise((done) => win.setTimeout(done, 50));
  // The page first asks who is working; a shared device picks "Use once".
  const once = Array.from(win.document.querySelectorAll('[role="dialog"] button')).find((button) => /use once/i.test(button.textContent));
  if (once) { once.click(); await new Promise((done) => win.setTimeout(done, 50)); }
  const fields = Array.from(win.document.querySelectorAll('textarea[data-allo-response-key]'));
  fields.forEach((field) => type(field, win));
  win.document.getElementById('alloflow-savejson-btn').click();
  // The name prompt opens first; answer it like a student would.
  for (let i = 0; i < 40 && !win.document.querySelector('[role="dialog"] input'); i++) await new Promise((done) => win.setTimeout(done, 25));
  const name = win.document.querySelector('[role="dialog"] input');
  name.value = 'Sam'; name.dispatchEvent(new win.Event('input', { bubbles: true }));
  const buttons = Array.from(win.document.querySelectorAll('[role="dialog"] button'));
  const confirm = buttons.find((button) => !/cancel/i.test(button.textContent));
  if (!confirm) throw new Error('prompt buttons: ' + buttons.map((button) => button.textContent).join(' | '));
  confirm.click();
  for (let i = 0; i < 40 && !blobs.length; i++) await new Promise((done) => win.setTimeout(done, 25));
  const payload = blobs.length ? JSON.parse(await blobs[0].text()) : null;
  const keys = fields.map((field) => field.getAttribute('data-allo-response-key'));
  win.close();
  return { payload, keys };
}

describe('typed export answers reach the Submission Inbox', () => {
  it('carries every typed note and DBQ answer, with its question, into the inbox view', async () => {
    const typed = (key) => 'Answer for ' + key;
    const { payload, keys } = await saveTypedAnswers((field, win) => {
      field.value = typed(field.getAttribute('data-allo-response-key'));
      field.dispatchEvent(new win.Event('input', { bubbles: true }));
    });
    expect(payload && payload.kind).toBe('alloflow-student-submission');
    expect(payload.nickname).toBe('Sam');
    expect(keys.some((key) => key.includes(':note:'))).toBe(true);
    expect(keys).toEqual(expect.arrayContaining(['dbq:dbq:0:sourcing:0:free-response', 'dbq:dbq:0:analysis:0:free-response', 'dbq:dbq:essay:free-response']));
    const entries = inboxMeta.responseEntryModels(payload);
    for (const key of keys) {
      const entry = entries.find((row) => row.displayValue === typed(key));
      expect(entry, key).toBeTruthy();
      expect(String(entry.question || '').length > 0, key).toBe(true);
    }
    const row = (key) => entries.find((entry) => entry.displayValue === typed(key));
    // DBQ answers are written responses the teacher may AI-grade; study notes stay teacher review only.
    expect(row('dbq:dbq:essay:free-response')).toMatchObject({ question: 'Write your conclusion.', partLabel: 'Essay', aiGradable: true });
    expect(row('dbq:dbq:0:sourcing:0:free-response')).toMatchObject({ question: 'Who wrote it?', partLabel: 'Answer', aiGradable: true });
    expect(row('nt:note:summary')).toMatchObject({ partLabel: 'Notes', aiGradable: false });
  });
});
