import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let EducatorHubModal;
let root;
let host;
let opener;
let outside;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_educator_hub_modal_module.js');
  EducatorHubModal = window.AlloModules.EducatorHubModal.EducatorHubModal;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('Educator Hub modal runtime accessibility', () => {
  it('renders every action, separates interactive results from status, contains focus, and passes axe', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open educator tools';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const setter = vi.fn();

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(EducatorHubModal, {
        handleFileUpload: setter,
        openExportPreview: setter,
        pdfAuditResult: null,
        pdfFixLoading: false,
        pdfFixResult: { finalText: 'remediated' },
        setIsAccessibilityLabOpen: setter,
        setIsCommunityCatalogOpen: setter,
        setIsSymbolStudioOpen: setter,
        setPdfAuditResult: setter,
        setPdfBatchMode: setter,
        setPendingPdfBase64: setter,
        setPendingPdfFile: setter,
        setShowBehaviorLens: setter,
        setShowEducatorHub: setOpen,
        setShowReportWriter: setter,
        setIsVideoStudioOpen: setter,
        setIsAlloStudioOpen: setter,
        setPdfBatchQueue: setter,
        setIsDynamicAssessmentOpen: setter,
        setShowStemLab: setter,
        setStemLabTool: setter,
        setLabToolData: setter,
        startLessonFlow: setter,
        openWhiteboard: setter,
        t: () => null,
      }) : null;
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });

    const dialog = host.querySelector('[role="dialog"]');
    let buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons).toHaveLength(18);
    expect(document.activeElement).toBe(buttons[0]);
    expect(dialog.getAttribute('aria-labelledby')).toBe('educator-hub-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('educator-hub-subtitle');

    const dialogProbe = buttons.find((button) => button.textContent.includes('dialog test'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await act(async () => { dialogProbe.click(); await Promise.resolve(); });
    const resultsRegion = dialog.querySelector('[role="region"]');
    const completionStatus = dialog.querySelector('[role="status"]');
    expect(resultsRegion.getAttribute('aria-labelledby')).toBe('educator-platform-results-title');
    expect(resultsRegion.querySelector('button').textContent).toContain('Copy report');
    expect(completionStatus.textContent).toMatch(/Platform check complete\. 1 results available\./);
    expect(completionStatus.querySelector('button')).toBeNull();
    buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons).toHaveLength(19);

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    const first = buttons[0];
    const last = buttons.at(-1);
    first.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);
    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    window.__alloFocusTrapStack.push({ root: document.createElement('div') });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    window.__alloFocusTrapStack.pop();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
