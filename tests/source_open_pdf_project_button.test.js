// Source Material's project button opens only PDF Accessibility work, so it
// says so ("Open PDF project"), and a lesson project picked there (which
// opens from Class & Materials) gets directions instead of "not a valid
// AlloFlow project". Runs the real file-check code from the source panel.
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const strings = new Function('return (' + fs.readFileSync('ui_strings.js', 'utf8').replace(/^\s*/, '') + '\n)')();
const start = source.indexOf('const _savedProject = JSON.parse(ev.target.result);');
const end = source.indexOf('// Ignore any serialized runtime snapshot', start);

function check(fileValue, { crypto = null, translate = {} } = {}) {
  const addToast = vi.fn();
  const t = key => (key in translate ? translate[key] : key);
  const run = new Function('ev', 't', 'addToast', 'window', source.slice(start, end) + '\nreturn "opens";');
  const result = run({ target: { result: JSON.stringify(fileValue) } }, t, addToast, { AlloModules: crypto ? { AlloCrypto: crypto } : {} });
  return { result: result || 'stopped', toasts: addToast.mock.calls };
}

describe('Open PDF project (Source Material)', () => {
  it('is labelled for what it opens, with every string registered', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("t('input.open_pdf_project') || 'Open PDF project'");
    expect(source).toContain("t('input.open_pdf_project_tooltip')");
    expect(source).not.toContain("t('input.load_project')");
    expect(strings.input.open_pdf_project).toBe('Open PDF project');
    expect(strings.input.open_pdf_project_tooltip).toMatch(/Class & Materials/);
    expect(strings.toasts.lesson_project_wrong_button).toContain('{tab}');
  });

  it('still opens a PDF Accessibility project', () => {
    expect(check({ version: 3, accessibleHtml: '<main>Fixed</main>' }).result).toBe('opens');
    expect(check({ version: 3, incomplete: true }).result).toBe('opens');
  });

  it('points a lesson project to Class & Materials, using the real button names', () => {
    const names = { 'sidebar.class_materials_tab': 'Class & Materials', 'history.more_actions': 'More', 'history.load_project': 'Load Project', 'toasts.lesson_project_wrong_button': strings.toasts.lesson_project_wrong_button };
    for (const lesson of [[{ id: 'r1', type: 'simplified' }], { history: [{ id: 'r1' }], version: 2 }]) {
      const { result, toasts } = check(lesson, { translate: names });
      expect(result).toBe('stopped');
      expect(toasts).toEqual([['This is a lesson project file. Open it from Class & Materials: choose More, then Load Project.', 'info']]);
    }
    // An encrypted save can only be a lesson project.
    const crypto = { isEncryptedEnvelope: v => !!(v && v.ciphertext) };
    expect(check({ ciphertext: 'x', iv: 'y' }, { crypto, translate: names }).toasts[0][1]).toBe('info');
    // Untranslated names fall back to English.
    expect(check([{ id: 'r1' }]).toasts[0][0]).toBe('This is a lesson project file. Open it from Class & Materials: choose More, then Load Project.');
  });

  it('shares one loader with the Educator tools card once Source Material has shown', () => {
    expect(source).toContain('const openPdfProjectFile = (file) => {');
    // Registered on render: these views stay hook-free (sidebar_shell_extraction).
    expect(source).toContain("if (typeof window !== 'undefined') window.__alloOpenPdfProjectFile = openPdfProjectFile;");
    // The button itself goes through the same function.
    const button = source.slice(source.indexOf('data-source-open-pdf-project="true"'), source.indexOf('</label>', source.indexOf('data-source-open-pdf-project="true"')));
    expect(button).toContain('openPdfProjectFile(file);');
  });

  it('keeps the "not valid" message for anything else', () => {
    for (const junk of [{ hello: 'world' }, { version: 1 }, null]) {
      const { result, toasts } = check(junk);
      expect(result).toBe('stopped');
      expect(toasts).toEqual([['toasts.not_valid_alloflow_project', 'error']]);
    }
  });
});

describe('Document accessibility card (Educator tools)', () => {
  const hub = fs.readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
  const from = hub.indexOf('const isProjectFile = (file) =>');
  const to = hub.indexOf('const pdfFiles = files.filter(', from);
  // The card's real branch, up to where single files go to the upload handler.
  const singleAt = hub.indexOf('if (files.length === 1) {', from);
  function pick(files, opener) {
    const addToast = vi.fn(), setShowEducatorHub = vi.fn(), handleFileUpload = vi.fn();
    const win = opener ? { __alloOpenPdfProjectFile: opener } : {};
    const run = new Function('files', 't', 'addToast', 'setShowEducatorHub', 'handleFileUpload', 'window',
      hub.slice(from, singleAt) + '\nreturn "to-upload";');
    const result = run(files, key => key, addToast, setShowEducatorHub, handleFileUpload, win);
    return { result: result || 'handled', toasts: addToast.mock.calls, closed: setShowEducatorHub.mock.calls.length > 0 };
  }
  const json = { name: 'Biology-unit.json', type: 'application/json' };

  it('lets the picker choose a saved PDF project and says so on the card', () => {
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    expect(hub).toContain("input.accept = 'application/pdf,.pdf,.docx,.pptx,.json,application/json';");
    expect(hub).toContain("t('educator_hub.document_accessibility_resume')");
    expect(strings.educator_hub.document_accessibility_resume).toMatch(/PDF project file/);
  });

  it('opens a saved PDF project through the shared loader and closes Educator tools', () => {
    const opener = vi.fn();
    const { result, closed } = pick([json], opener);
    expect(result).toBe('handled');
    expect(opener).toHaveBeenCalledWith(json);
    expect(closed).toBe(true);
  });

  it('points to Create > Source Material when that panel is not open, and takes one project at a time', () => {
    const away = pick([json], null);
    expect(away.result).toBe('handled');
    expect(away.closed).toBe(false);
    expect(away.toasts).toEqual([['educator_hub.pdf_project_open_from_create', 'info']]);
    expect(strings.educator_hub.pdf_project_open_from_create).toMatch(/Create tab.*Source Material.*Open PDF project/);
    const opener = vi.fn();
    const two = pick([json, { name: 'a.pdf', type: 'application/pdf' }], opener);
    expect(opener).not.toHaveBeenCalled();
    expect(two.toasts[0][1]).toBe('warning');
  });

  it('leaves documents to the normal upload path', () => {
    expect(pick([{ name: 'unit.pdf', type: 'application/pdf' }], vi.fn()).result).toBe('to-upload');
  });
});
