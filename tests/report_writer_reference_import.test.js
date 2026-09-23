// Adding a Report Writer reference from a file, through Lumen's document
// reader (window.LumenDocuments.extractLocalDocument). References used to be
// paste-only, and a regulation usually arrives as a PDF. The reader is replaced
// by a stand-in here so the test does not depend on pdf.js; the contract under
// test is what the Report Writer does with its result and its refusals.

import { afterEach, describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('stem_lab/stem_lumen_evidence.js');
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
});

let mounted = null;
afterEach(async () => {
  if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  delete window.LumenDocuments;
});

async function openBackgroundStep(extract) {
  window.LumenDocuments = { extractLocalDocument: extract };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const toasts = [];
  mounted = { host, root };
  await React.act(async () => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose() {}, callGemini: async () => '{}', addToast: (m, level) => toasts.push([level, String(m)]), t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  await React.act(async () => steps[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return { host, toasts };
}
async function chooseFile(host, file) {
  const input = host.querySelector('#rw-ref-file');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await React.act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  for (let i = 0; i < 100 && input.disabled; i++) await React.act(async () => new Promise(r => setTimeout(r, 10)));
}

describe('adding a reference from a file', () => {
  it('a readable file becomes a reference, labelled with its size', async () => {
    const text = 'VII.2.L. Specific Learning Disability\n\nThe team may determine that a child has a specific learning disability ...';
    const { host, toasts } = await openBackgroundStep(async (file) => ({ title: file.name, content: text, fileName: file.name, fileFormat: 'pdf' }));
    expect(host.querySelector('label[for="rw-ref-file"]').textContent).toMatch(/import a file/i);
    await chooseFile(host, new File(['%PDF'], 'MUSER-Ch101.pdf', { type: 'application/pdf' }));
    expect(host.textContent).toContain('MUSER-Ch101.pdf');
    expect(toasts.find(t => t[0] === 'success')[1]).toMatch(/Added "MUSER-Ch101\.pdf" \(\d[\d,]* characters\)/);
  });

  it('a scanned PDF is refused with the reader\'s own instruction, and nothing is added', async () => {
    const { host, toasts } = await openBackgroundStep(async () => { throw new Error('This PDF appears scanned and has no usable text layer. Run OCR in AlloFlow’s PDF workspace, then import the resulting text or PDF.'); });
    await chooseFile(host, new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' }));
    expect(host.textContent).not.toContain('scan.pdf');
    expect(toasts.find(t => t[0] === 'error')[1]).toMatch(/Run OCR/);
  });
});
