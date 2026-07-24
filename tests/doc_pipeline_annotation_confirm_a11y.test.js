import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
let html;
let dom;

const waitForRuntime = (win) => new Promise((resolve) => {
  const done = () => win.setTimeout(resolve, 0);
  if (win.document.readyState === 'complete' || win.document.readyState === 'interactive') done();
  else win.document.addEventListener('DOMContentLoaded', done, { once: true });
});

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
  html = pipeline.generateFullPackHTML([
    { type: 'simplified', id: 's1', title: 'Reading', data: 'Learner annotation test content.' },
  ], 'Annotation Test', false, {}, {
    annotations: [],
    annotationsByResource: {
      s1: [{ id: 'teacher-note-s1', kind: 'note', x: 40, y: 60, content: 'Teacher feedback stays.', color: 'yellow', author: 'teacher', createdAt: '2026-07-01T12:00:00.000Z' }],
    },
  });
});

afterEach(() => {
  dom?.window?.close();
  dom = null;
});

describe('exported learner annotation clear confirmation', () => {
  it('ships a named safe-default dialog without native confirmation and keeps module parity', () => {
    expect(source).not.toContain("window.confirm('Remove all your notes and highlights?");
    expect(source).toContain('function askAnnotationConfirmation(options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
    expect(source).toContain("entry.el.setAttribute('aria-hidden', 'true')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('.alloflow-anno-confirm-btn { min-height: 44px;');
    expect(source).toContain("document.addEventListener('click', async function (e) {");
    expect(source).toContain('var shouldClear = await askAnnotationConfirmation({');
    expect(readFileSync('desktop/web-app/public/doc_pipeline_module.js', 'utf8'))
      .toBe(readFileSync('doc_pipeline_module.js', 'utf8'));
  });

  it('preserves learner work on Escape and deletes only learner annotations after explicit confirmation', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      const message = String(error?.stack || error?.message || error || '');
      if (/SyntaxError|Uncaught/i.test(message)) runtimeErrors.push(message);
    });
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/annotation-export.html',
      virtualConsole,
    });
    await waitForRuntime(dom.window);
    expect(runtimeErrors).toEqual([]);
    const doc = dom.window.document;
    const noteButton = doc.querySelector('[data-rt-anno="note"]');
    const clearButton = doc.querySelector('[data-rt-anno-clear="mine"]');
    const host = doc.getElementById('main-export-content');
    expect(noteButton).toBeTruthy();
    expect(clearButton).toBeTruthy();
    expect(host).toBeTruthy();

    noteButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    host.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 80, clientY: 120 }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    const textarea = doc.querySelector('.alloflow-note-editor textarea');
    expect(textarea).toBeTruthy();
    textarea.value = 'My learner note';
    doc.querySelector('.alloflow-note-editor [aria-label="Save note"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    expect(doc.querySelectorAll('.alloflow-anno-note')).toHaveLength(2);

    clearButton.focus();
    clearButton.click();
    const dialog = doc.querySelector('[role="alertdialog"]');
    const [cancel, confirm] = Array.from(dialog.querySelectorAll('button'));
    expect(dialog.getAttribute('aria-labelledby')).toBe('alloflow-anno-confirm-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('alloflow-anno-confirm-description');
    expect(dialog.textContent).toContain('Teacher annotations will stay.');
    expect(doc.activeElement).toBe(cancel);
    expect(host.hasAttribute('inert')).toBe(true);
    expect(host.getAttribute('aria-hidden')).toBe('true');

    dom.window.eval(axe.source);
    const results = await dom.window.axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(doc.activeElement).toBe(confirm);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(doc.activeElement).toBe(cancel);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    expect(doc.querySelector('[role="alertdialog"]')).toBeNull();
    expect(doc.querySelectorAll('.alloflow-anno-note')).toHaveLength(2);
    expect(host.hasAttribute('inert')).toBe(false);
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    expect(doc.activeElement).toBe(clearButton);

    clearButton.click();
    doc.querySelector('[role="alertdialog"] .alloflow-anno-confirm-delete').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    const remaining = Array.from(doc.querySelectorAll('.alloflow-anno-note'));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].getAttribute('aria-label')).toContain('Teacher feedback stays.');
    expect(doc.activeElement).toBe(clearButton);
  });
});
