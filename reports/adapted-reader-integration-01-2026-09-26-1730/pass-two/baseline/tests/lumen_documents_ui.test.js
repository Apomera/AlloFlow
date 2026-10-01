import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';
import * as DocumentsMod from '../stem_lab/stem_lumen_documents.js';
import * as StudyMod from '../stem_lab/stem_lumen_study.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));
const Study = StudyMod.default || StudyMod;
const Documents = DocumentsMod.default || DocumentsMod;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonNamed(container, name) {
  return [...container.querySelectorAll('button')].find(button => button.textContent.trim() === name);
}
async function settle() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('Lumen local-document import UI', () => {
  let container;
  let root;
  let originalExtract;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.body.innerHTML = '<main><div id="root"></div></main>';
    container = document.getElementById('root');
    originalExtract = window.LumenDocuments.extractLocalDocument;
  });

  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    root = null;
    window.LumenDocuments = Documents;
  });

  it('imports a selected local file, exposes provenance, and opens its exact page passage accessibly', async () => {
    const extractLocalDocument = vi.fn(async file => ({
      id: 'src_file_fixture', stableKey: 'local-file|' + file.name.toLowerCase(), title: file.name,
      locator: 'Local file · ' + file.name, type: 'pdf', importMethod: 'local-file',
      fileName: file.name, fileFormat: 'pdf', fileSize: file.size, fileLastModified: file.lastModified,
      fileContentHash: 'fixture-bytes', extractionMethod: 'pdf-text-layer', documentPartCount: 2,
      content: '# Page 1\n\nThe imported document contains enough detailed local evidence about morphology, roots, and affixes to support retrieval.\n\n# Page 2\n\nA second page supplies surrounding context for exact stored-passage inspection.'
    }));
    window.LumenDocuments = Object.assign({}, Documents, { extractLocalDocument });

    const ctx = {
      React, update: () => {}, announceToSR: () => {},
      storageDB: { get: async () => null, set: async () => true, del: async () => {} },
      studentNickname: 'Document import audit'
    };
    root = ReactDOMClient.createRoot(container);
    await act(async () => { root.render(React.createElement(Study.Component, { ctx })); await settle(); });

    await act(async () => { buttonNamed(container, 'Import files').click(); await settle(); });
    const panel = container.querySelector('#lumen-file-panel');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('document contents stay on this device');

    const fakeFile = { name: 'Morphology Guide.pdf', size: 4096, lastModified: 1721174400000 };
    const input = container.querySelector('#lumen-local-files');
    Object.defineProperty(input, 'files', { configurable: true, value: [fakeFile] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await settle(); });
    expect(panel.textContent).toContain('Morphology Guide.pdf');

    await act(async () => { buttonNamed(container, 'Import selected documents').click(); await settle(); });
    expect(extractLocalDocument).toHaveBeenCalledWith(fakeFile, expect.objectContaining({ evidence: expect.anything() }));
    expect(container.textContent).toContain('Imported as evidence');
    expect(container.textContent).toContain('PDF · 2 document parts · extracted locally');
    expect(container.textContent).toContain('Local file · Morphology Guide.pdf');

    await act(async () => { buttonNamed(container, 'View source snapshot').click(); await settle(); });
    const viewer = container.querySelector('#lumen-source-viewer');
    expect(viewer.textContent).toContain('Page 1');
    expect(viewer.querySelector('mark').textContent).toContain('morphology');
    expect(viewer.querySelector('a')).toBeNull();
    expect(document.activeElement).toBe(viewer);

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    });
    expect(results.violations.map(v => v.id + ': ' + v.help).join('\n')).toBe('');
  });
});
