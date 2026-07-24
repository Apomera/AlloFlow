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
    { type: 'simplified', id: 's1', title: 'Reading', data: 'Learner annotation sidebar test content.' },
  ], 'Annotation Sidebar Test', false, {}, {
    annotations: [],
    annotationsByResource: {
      s1: [{
        id: 'teacher-note-s1',
        kind: 'note',
        x: 40,
        y: 60,
        content: 'Teacher feedback stays.',
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

describe('exported annotation sidebar accessibility', () => {
  it('ships disclosure, list, focus, and target-size safeguards with generated-module parity', () => {
    expect(source).toContain('data-rt-anno-list aria-expanded="false" aria-controls="alloflow-annotation-sidebar"');
    expect(source).toContain("sidebarEl.setAttribute('role', 'region')");
    expect(source).toContain("sidebarEl.setAttribute('aria-labelledby', 'alloflow-annotation-sidebar-title')");
    expect(source).toContain('<ul class="alloflow-anno-sb-list" aria-label="Annotations">');
    expect(source).toContain('<li class="alloflow-anno-item ');
    expect(source).toContain('<button type="button" class="alloflow-anno-item-body" data-rt-anno-focus=');
    expect(source).not.toContain('data-rt-anno-focus="' + "' + attrEsc(a._focusKey || a.id) + '" + '" role="button"');
    expect(source).toContain('.alloflow-anno-sb-close { background: transparent; border: 0; cursor: pointer; padding: 4px 6px; border-radius: 50%; color: #64748b; font-size: 12px; min-width: 44px; min-height: 44px;');
    expect(source).toContain('.alloflow-anno-pill { min-height: 44px;');
    expect(source).toContain('.alloflow-anno-item-body { appearance: none; flex: 1; min-width: 0; min-height: 44px;');
    expect(source).toContain('.alloflow-anno-item-del { background: transparent; border: 0; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 6px; font-size: 11px; min-width: 44px; min-height: 44px;');
    expect(source).toContain('.alloflow-anno-item-body:focus-visible');
    expect(readFileSync('desktop/web-app/public/doc_pipeline_module.js', 'utf8'))
      .toBe(readFileSync('doc_pipeline_module.js', 'utf8'));
  });

  it('renders named sibling controls, passes axe, and restores focus when closed', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      const message = String(error?.stack || error?.message || error || '');
      if (/SyntaxError|Uncaught/i.test(message)) runtimeErrors.push(message);
    });
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/annotation-sidebar-export.html',
      virtualConsole,
    });
    await waitForRuntime(dom.window);
    expect(runtimeErrors).toEqual([]);

    const doc = dom.window.document;
    const noteButton = doc.querySelector('[data-rt-anno="note"]');
    const listButton = doc.querySelector('[data-rt-anno-list]');
    const host = doc.getElementById('main-export-content');
    expect(noteButton).toBeTruthy();
    expect(listButton).toBeTruthy();
    expect(listButton.getAttribute('aria-expanded')).toBe('false');
    expect(listButton.getAttribute('aria-controls')).toBe('alloflow-annotation-sidebar');

    noteButton.click();
    host.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 80, clientY: 120 }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    const textarea = doc.querySelector('.alloflow-note-editor textarea');
    expect(textarea).toBeTruthy();
    textarea.value = 'My learner sidebar note';
    doc.querySelector('.alloflow-note-editor [aria-label="Save note"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    listButton.click();
    const sidebar = doc.getElementById('alloflow-annotation-sidebar');
    expect(sidebar).toBeTruthy();
    expect(listButton.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.getAttribute('role')).toBe('region');
    expect(sidebar.getAttribute('aria-labelledby')).toBe('alloflow-annotation-sidebar-title');
    expect(sidebar.querySelector('[role="group"][aria-label="Filter annotations"]')).toBeTruthy();
    expect(sidebar.querySelector('ul.alloflow-anno-sb-list[aria-label="Annotations"]')).toBeTruthy();

    const rows = Array.from(sidebar.querySelectorAll('li.alloflow-anno-item'));
    expect(rows).toHaveLength(2);
    expect(sidebar.querySelector('[role="button"]')).toBeNull();
    rows.forEach((row) => {
      const jump = row.querySelector(':scope > button[data-rt-anno-focus]');
      expect(jump).toBeTruthy();
      expect(jump.type).toBe('button');
      expect(jump.getAttribute('aria-label')).toMatch(/^Jump to annotation: .+/);
      expect(jump.querySelector('button')).toBeNull();
    });
    const deleteButton = sidebar.querySelector('li.student > button[data-rt-anno-del]');
    expect(deleteButton).toBeTruthy();
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete your annotation: 📝 My learner sidebar note');
    expect(deleteButton.parentElement.querySelector(':scope > button[data-rt-anno-focus]')).toBeTruthy();

    dom.window.eval(axe.source);
    const results = await dom.window.axe.run(sidebar, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    const closeButton = sidebar.querySelector('[data-rt-anno-list-close]');
    closeButton.focus();
    expect(doc.activeElement).toBe(closeButton);
    closeButton.click();
    expect(doc.getElementById('alloflow-annotation-sidebar')).toBeNull();
    expect(listButton.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(listButton);
  });
});
