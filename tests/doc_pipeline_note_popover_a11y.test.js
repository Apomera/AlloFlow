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
    { type: 'simplified', id: 's1', title: 'Reading', data: 'Learner note popover test content.' },
  ], 'Note Popover Test', false, {}, {
    annotations: [],
    annotationsByResource: {
      s1: [{
        id: 'teacher-note-s1',
        kind: 'note',
        x: 40,
        y: 60,
        content: 'Remember the key evidence.',
        color: 'yellow',
        author: 'teacher',
        createdAt: '2026-07-01T12:00:00.000Z',
      }],
    },
  });
});

afterEach(() => {
  dom?.window?.close();
  dom = null;
});

describe('exported annotation note popover accessibility', () => {
  it('ships native 44px note controls, named-dialog wiring, and generated-module parity', () => {
    expect(source).toContain("var note = document.createElement('button')");
    expect(source).toContain("note.type = 'button'");
    expect(source).not.toContain("note.setAttribute('role', 'button')");
    expect(source).not.toContain("note.setAttribute('tabindex', '0')");
    expect(source).toContain("note.setAttribute('aria-haspopup', 'dialog')");
    expect(source).toContain("note.setAttribute('aria-expanded', 'false')");
    expect(source).toContain("note.setAttribute('aria-controls', 'alloflow-annotation-note-popover')");
    expect(source).toContain("width:44px;height:44px");
    expect(source).toContain('.alloflow-note-popover-close { border: 0; background: transparent; color: #64748b; border-radius: 6px; padding: 4px; cursor: pointer; font-weight: 800; min-width: 44px; min-height: 44px;');
    expect(source).toContain('.alloflow-note-popover-close:focus-visible, .alloflow-anno-note:focus-visible');
    expect(source).toContain("pop.setAttribute('aria-labelledby', 'alloflow-annotation-note-title')");
    expect(source).toContain("pop.setAttribute('aria-describedby', 'alloflow-annotation-note-body')");
    expect(source).toContain("if (e.key === 'Escape' && notePopoverEl)");
    expect(source).toContain('closeNotePopover(true)');
    expect(readFileSync('desktop/web-app/public/doc_pipeline_module.js', 'utf8'))
      .toBe(readFileSync('doc_pipeline_module.js', 'utf8'));
  });

  it('opens a named dialog, passes axe, and restores pin focus after Escape and Close', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      const message = String(error?.stack || error?.message || error || '');
      if (/SyntaxError|Uncaught/i.test(message)) runtimeErrors.push(message);
    });
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/note-popover-export.html',
      virtualConsole,
    });
    await waitForRuntime(dom.window);
    expect(runtimeErrors).toEqual([]);

    const doc = dom.window.document;
    const note = doc.querySelector('#s1 button.alloflow-anno-note');
    expect(note).toBeTruthy();
    expect(note.type).toBe('button');
    expect(note.getAttribute('role')).toBeNull();
    expect(note.getAttribute('aria-haspopup')).toBe('dialog');
    expect(note.getAttribute('aria-expanded')).toBe('false');
    expect(note.getAttribute('aria-controls')).toBe('alloflow-annotation-note-popover');
    expect(note.style.width).toBe('44px');
    expect(note.style.height).toBe('44px');

    note.focus();
    note.click();
    let dialog = doc.getElementById('alloflow-annotation-note-popover');
    expect(dialog).toBeTruthy();
    expect(note.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('alloflow-annotation-note-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('alloflow-annotation-note-body');
    expect(doc.getElementById('alloflow-annotation-note-title').textContent).toBe('Teacher note');
    expect(doc.getElementById('alloflow-annotation-note-body').textContent).toBe('Remember the key evidence.');
    const close = dialog.querySelector('.alloflow-note-popover-close');
    expect(doc.activeElement).toBe(close);

    dom.window.eval(axe.source);
    const results = await dom.window.axe.run(dialog, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));
    expect(doc.getElementById('alloflow-annotation-note-popover')).toBeNull();
    expect(note.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(note);

    note.click();
    dialog = doc.getElementById('alloflow-annotation-note-popover');
    const closeAgain = dialog.querySelector('.alloflow-note-popover-close');
    closeAgain.click();
    expect(doc.getElementById('alloflow-annotation-note-popover')).toBeNull();
    expect(note.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(note);
  });
});
