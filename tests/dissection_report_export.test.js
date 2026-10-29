import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, setState, current, feedback, clipboardDescriptor;
const base = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced',
  toolbarToolsOpen: true, _labReportPreviewOpen: true, reducedMotion: true,
  exploredOrgans: { 'frog|dorsal_skin': true },
  organNotes: { 'frog|dorsal_skin': 'A moist surface.\n<script>not markup</script>', 'frog|heart': 'A saved note awaiting inspection.', 'pig|heart_p': 'Other specimen private note' },
  organConfidence: { 'frog|dorsal_skin': 2 },
};
async function mount(extra = {}) {
  const config = window.StemLab._registry.dissection;
  function Lab() {
    const [toolData, setter] = React.useState({ dissection: { ...base, ...extra } });
    setState = setter; current = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData: setter, announceToSR: feedback }));
  }
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Lab)));
}
const button = name => [...host.querySelectorAll('button')].find(node => node.textContent === name);
async function click(name) { await act(async () => { button(name).click(); await Promise.resolve(); }); }
beforeEach(() => {
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => ({ writeText: vi.fn().mockResolvedValue(undefined) }) });
  localStorage.clear(); resetStemLab(); loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  feedback = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = null;
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
});

describe('dissection portable lab report', () => {
  it('previews the same specimen-specific text copied to the clipboard, including unfinished evidence', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText });
    await mount();
    const report = host.querySelector('#diss-lab-report-preview').value;
    expect(report).toContain('A moist surface.\n<script>not markup</script>');
    expect(report).toContain('A saved note awaiting inspection.');
    expect(report).toContain('Not yet inspected; saved record only');
    expect(report).toContain('Reference function (not student evidence)');
    expect(report).toContain('Confidence self-rating: Not recorded');
    expect(report).toContain('Learning objectives');
    expect(report).toContain('cannot restore a saved lab session');
    expect(report).not.toContain('Other specimen private note');
    expect(host.querySelector('script')).toBeNull();
    await click('Copy lab report');
    expect(writeText).toHaveBeenCalledWith(report);
    expect(current.exploredOrgans).toEqual(base.exploredOrgans);
  });

  it('downloads the preview as plain text and releases its object URL', async () => {
    await mount();
    let downloadedBlob;
    vi.stubGlobal('Blob', NodeBlob);
    const create = vi.fn(blob => { downloadedBlob = blob; return 'blob:lab-report'; });
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: revoke }));
    let filename, href;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download; href = this.href; });
    vi.useFakeTimers();
    try {
      const preview = host.querySelector('#diss-lab-report-preview').value;
      await click('Download report');
      expect(filename).toBe('frog_lab_report.txt'); expect(href).toBe('blob:lab-report');
      expect(downloadedBlob.type).toBe('text/plain;charset=utf-8');
      const text = await downloadedBlob.text();
      expect(text).toBe(preview);
      expect(host.querySelector('a[download]')).toBeNull();
      await act(async () => vi.advanceTimersByTime(1001));
      expect(revoke).toHaveBeenCalledWith('blob:lab-report');
    } finally { vi.useRealTimers(); }
  });

  it('keeps a manual copy path after clipboard and download failures', async () => {
    const writeText = vi.fn().mockRejectedValue(Error('denied'));
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText });
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: () => { throw Error('blocked'); } }));
    await mount();
    await click('Copy lab report');
    expect(feedback.mock.calls.flat().join(' ')).toContain('Select report');
    await click('Download report');
    expect(feedback.mock.calls.flat().join(' ')).toContain('download could not start');
    await click('Select report');
    const field = host.querySelector('#diss-lab-report-preview');
    expect(document.activeElement).toBe(field);
    expect(field.selectionEnd - field.selectionStart).toBe(field.value.length);
    expect(current.organNotes).toEqual(base.organNotes);
  });

  it('updates preview with edits and hides reference-bearing exports during assessment', async () => {
    await mount();
    await act(async () => setState(previous => ({ dissection: { ...previous.dissection, organNotes: { 'frog|dorsal_skin': 'Revised evidence' } } })));
    expect(host.querySelector('#diss-lab-report-preview').value).toContain('Revised evidence');
    expect(host.querySelector('#diss-lab-report-preview').value).not.toContain('A moist surface.');
    await act(async () => setState(previous => ({ dissection: { ...previous.dissection, quizMode: true } })));
    expect(host.querySelector('#diss-lab-report-preview')).toBeNull();
    expect(!button('Copy lab report') || button('Copy lab report').disabled).toBe(true);
    expect(button('Download report')).toBeUndefined();
  });

  it('opens a visible recovery report from Essentials without replacing a protected save', async () => {
    localStorage.setItem('dissection_progress_frog', '{unreadable saved work');
    await mount({ workspaceMode: 'essentials', toolbarToolsOpen: false, _labReportPreviewOpen: false });
    await click('Export current session report');
    expect(current.workspaceMode).toBe('advanced');
    expect(host.querySelector('#diss-lab-report-preview').value).toContain('A moist surface.');
    expect(localStorage.getItem('dissection_progress_frog')).toBe('{unreadable saved work');
  });
});
