import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const tree = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const component = tree.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'ExportPreviewView');
const api = new Function(source.slice(0, component.start) + '\nreturn { _builderCollectToolTargets, _builderFilterTools, _builderSelectedImage, _builderSaveStatusLabel };')();
function callback(name, bindings) {
  const declaration = component.body.body.flatMap(node => node.declarations || []).find(node => node.id.name === name);
  const fn = declaration.init.arguments[0];
  return new Function(...Object.keys(bindings), 'return (' + source.slice(fn.start, fn.end) + ');')(...Object.values(bindings));
}
function fixture() {
  const root = document.createElement('div');
  root.innerHTML = '<button id="builder-ribbon-tab-layout">Layout</button><button id="builder-ribbon-tab-insert">Insert</button>'
    + '<div id="builder-ribbon-panel-layout" hidden><fieldset><legend>Page setup</legend><label>Page margins <select><option>Normal</option><option>Wide</option></select></label>'
    + '<button title="Set page orientation">Orientation</button><button disabled>Unavailable action</button><input type="hidden" value="private"></fieldset></div>'
    + '<div id="builder-ribbon-panel-insert" hidden><button aria-label="Insert image with alternative text">Image</button><button>Insert table</button></div>'
    + '<div id="builder-settings-panel"><label>Font <select><option>Arial</option></select></label></div>';
  return root;
}

describe('Builder tool discovery', () => {
  it('indexes existing controls inside closed panels without invoking any action', () => {
    const root = fixture();
    const click = vi.fn(); root.addEventListener('click', click);
    const entries = api._builderCollectToolTargets(root);
    expect(entries.map(entry => entry.label)).toEqual(['Page margins', 'Set page orientation', 'Unavailable action', 'Insert image with alternative text', 'Insert table', 'Font']);
    expect(entries[0]).toMatchObject({ tab: 'layout', section: 'Layout', target: root.querySelector('select') });
    expect(click).not.toHaveBeenCalled();
    expect(root.querySelector('[hidden]').hidden).toBe(true);
  });
  it('matches combined words and group names without exposing select values', () => {
    const entries = api._builderCollectToolTargets(fixture());
    expect(api._builderFilterTools(entries, 'page margins').map(entry => entry.label)).toEqual(['Page margins']);
    expect(api._builderFilterTools(entries, 'insert image')).toHaveLength(1);
    expect(api._builderFilterTools(entries, 'settings font')).toHaveLength(1);
    expect(api._builderFilterTools(entries, 'Arial')).toEqual([]);
    expect(api._builderFilterTools(entries, 'not-a-tool')).toEqual([]);
  });
  it('keeps results bounded and does not mutate the catalog', () => {
    const entries = Array.from({ length: 60 }, (_, id) => ({ id, label: 'Tool', keywords: 'Tool' }));
    expect(api._builderFilterTools(entries, '')).toHaveLength(24);
    expect(entries).toHaveLength(60);
  });
  it('deduplicates identical controls within a section', () => {
    const root = fixture(); root.querySelector('#builder-ribbon-panel-insert').insertAdjacentHTML('beforeend', '<button>Insert table</button>');
    expect(api._builderFilterTools(api._builderCollectToolTargets(root), 'insert table')).toHaveLength(1);
  });
  it('supports keyboard image selections and rejects stale or foreign image nodes', () => {
    const host = document.createElement('div'); host.innerHTML = '<img alt="Diagram"><p>Text</p>'; document.body.appendChild(host);
    const image = host.querySelector('img');
    const range = document.createRange(); range.selectNode(image); document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
    expect(api._builderSelectedImage(document)).toBe(image);
    expect(api._builderSelectedImage(document, image)).toBe(image);
    host.remove(); document.getSelection().removeAllRanges();
    expect(api._builderSelectedImage(document, image)).toBeNull();
    const other = document.implementation.createHTMLDocument('Other'); other.body.innerHTML = '<img alt="Other">';
    expect(api._builderSelectedImage(document, other.querySelector('img'))).toBeNull();
  });
});

describe('Builder save feedback and backup', () => {
  it('distinguishes persistent storage from session-only recovery', () => {
    expect(api._builderSaveStatusLabel('saved', 0)).toBe('Saved on this device');
    expect(api._builderSaveStatusLabel('captured', 0)).toContain('Session only');
    expect(api._builderSaveStatusLabel('captured', 0)).toContain('backup');
    expect(api._builderSaveStatusLabel('error', 0)).toContain('not captured');
  });
  it('downloads the live clean document without claiming the device save succeeded', async () => {
    const html = '<!DOCTYPE html><html><body><p>Current edits</p></body></html>';
    const getCleanBuilderDocument = vi.fn(() => ({ html })), downloadBuilderBlob = vi.fn(), addToast = vi.fn();
    callback('downloadBuilderBackup', { getCleanBuilderDocument, downloadBuilderBlob, addToast })();
    expect(getCleanBuilderDocument).toHaveBeenCalledWith();
    const [blob, options] = downloadBuilderBlob.mock.calls[0];
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(options).toEqual({ extension: 'html', suffix: '-backup', notifySuccess: false });
    const content = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); });
    expect(content).toBe(html);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Keep it before closing'), 'success');
  });
  it('reports unavailable documents and failed downloads without claiming success', () => {
    for (const getCleanBuilderDocument of [() => null, () => ({ html: '<p>Current</p>' })]) {
      const addToast = vi.fn();
      callback('downloadBuilderBackup', { getCleanBuilderDocument, downloadBuilderBlob: () => { throw new Error('Download blocked'); }, addToast })();
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Keep this document open'), 'error');
    }
  });
});

describe('Contextual image descriptions', () => {
  function setup() {
    const doc = document.implementation.createHTMLDocument('Lesson'); doc.body.innerHTML = '<img alt="Before">';
    const image = doc.querySelector('img');
    const bindings = { exportPreviewRef: { current: { contentDocument: doc } }, selectedBuilderImageRef: { current: image },
      promptForBuilderText: vi.fn(async () => 'After'), resumeTrackedEditingView: vi.fn(), commitTrackedChangeMutation: vi.fn(), addToast: vi.fn(),
      _builderCaptureElementRevision: vi.fn(() => ({ original: true })), _builderRecordElementRevision: vi.fn() };
    return { doc, image, bindings, edit: callback('editSelectedImageAlt', bindings) };
  }
  it('edits the selected image and records tracked formatting when enabled', async () => {
    const f = setup(); f.doc.body.setAttribute('data-allo-track-changes', '1');
    await f.edit();
    expect(f.image.alt).toBe('After');
    expect(f.bindings._builderRecordElementRevision).toHaveBeenCalledWith(f.image, { original: true }, 'format', 'Image alternative text changed');
    expect(f.bindings.commitTrackedChangeMutation).toHaveBeenCalledTimes(1);
  });
  it.each(['document', 'image', 'description'])('refuses a stale %s after the prompt returns', async kind => {
    const f = setup();
    f.bindings.promptForBuilderText.mockImplementation(async () => {
      if (kind === 'document') f.bindings.exportPreviewRef.current.contentDocument = document.implementation.createHTMLDocument('Replacement');
      if (kind === 'image') f.image.remove();
      if (kind === 'description') f.image.alt = 'Newer description';
      return 'Stale edit';
    });
    await f.edit();
    expect(f.image.alt).not.toBe('Stale edit');
    expect(f.bindings.commitTrackedChangeMutation).not.toHaveBeenCalled();
  });
});
