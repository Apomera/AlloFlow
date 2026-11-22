import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let StorybookExportModal;
let FamilyAnnouncementsPanel;
let SpedTimelinesPanel;
let MtssTriagePanel;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setInputValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

function setSelectValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('change', { bubbles: true })); });
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  loadAlloModule('view_storybook_export_modal_module.js');
  StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;

  delete window.AlloModules.FamilyAnnouncements;
  new Function(readFileSync(resolve(process.cwd(), 'family_announcements_module.js'), 'utf8'))();
  FamilyAnnouncementsPanel = window.AlloModules.FamilyAnnouncements.FamilyAnnouncementsPanel;

  delete window.AlloModules.SpedTimelines;
  new Function(readFileSync(resolve(process.cwd(), 'sped_timelines_module.js'), 'utf8'))();
  SpedTimelinesPanel = window.AlloModules.SpedTimelines.SpedTimelinesPanel;

  delete window.AlloModules.MtssTriage;
  new Function(readFileSync(resolve(process.cwd(), 'mtss_triage_module.js'), 'utf8'))();
  MtssTriagePanel = window.AlloModules.MtssTriage.MtssTriagePanel;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 8 polish: Storybook Export, Family Announcements, SpEd Timelines, MTSS Triage', () => {
  it('StorybookExportModal previews included download files, shows Narration ON badge + percentage progress, and passes axe', async () => {
    let finish;
    let capturedOptions;
    const handleExportStorybook = vi.fn((opts) => {
      capturedOptions = opts;
      return new Promise((resolveExport) => { finish = resolveExport; });
    });

    const host = mountEl(React.createElement(StorybookExportModal, {
      handleExportStorybook,
      handleSetShowStorybookExportModalToFalse: vi.fn(),
      setShowStorybookExportModal: vi.fn(),
      isProcessing: false,
      t: (k) => ({
        'adventure.storybook': 'Export Storybook',
        'adventure.export_options': 'Export Options',
        'adventure.storybook_export_description': 'Choose how to save your journey.',
        'adventure.include_images': 'Include Images',
        'adventure.text_only': 'Text Only',
        'adventure.storybook_image_warning': 'Images increase file size.',
        'common.cancel': 'Cancel',
      }[k] || k),
    }));

    const summary = host.querySelector('[data-storybook-export-summary="true"]');
    expect(summary.textContent).toContain('Print-ready Storybook');
    expect(host.querySelector('[data-storybook-narration-badge="true"]')).toBeNull();

    const checkbox = host.querySelector('#storybook-include-narration');
    await act(async () => { checkbox.click(); });
    expect(host.querySelector('[data-storybook-narration-badge="true"]').textContent).toContain('Narration ON');
    expect(summary.textContent).toContain('Offline HTML + JSON');
    expect(summary.textContent).toContain('Embedded TTS audio');

    const imgBtn = host.querySelector('[data-help-key="export_storybook_images"]');
    await act(async () => { imgBtn.click(); await Promise.resolve(); });
    await act(async () => {
      capturedOptions.onProgress({ phase: 'narration', completed: 3, total: 5, message: 'Narrating scenes…' });
    });
    const meta = host.querySelector('[data-storybook-progress-meta="true"]');
    expect(meta.textContent).toContain('3 of 5 segments');
    expect(meta.textContent).toContain('60%');

    const axeRes = await axe.run(host.querySelector('[role="dialog"]'), {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(axeRes.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

    await act(async () => { finish(true); await Promise.resolve(); });
  });

  it('FamilyAnnouncementsPanel shows live word count, readiness summary, single-language translate, and copy with disclosure in Compose + Saved', async () => {
    localStorage.setItem('allo_famann_config_v1', JSON.stringify({ langTags: ['es', 'ar'] }));
    const copiedTexts = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((txt) => { copiedTexts.push(txt); return Promise.resolve(); }) },
    });
    const callGemini = vi.fn(async (prompt) => (prompt.includes('Español') ? 'Hola familias.' : 'مرحبا بالعائلات.'));

    const host = mountEl(React.createElement(FamilyAnnouncementsPanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
      callGemini,
    }));

    const ta = host.querySelector('#famann-text');
    setInputValue(ta, 'School closes early on Friday at 11:30 AM for staff learning.');
    expect(host.querySelector('[data-famann-word-count="true"]').textContent).toContain('11 words');
    expect(host.querySelector('[data-famann-readiness="true"]').textContent).toContain('0/2 ready');

    // Single-language translate just Spanish
    const singleEs = host.querySelector('[data-famann-single-translate="es"]');
    expect(singleEs).toBeTruthy();
    await act(async () => { singleEs.click(); await Promise.resolve(); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-famann-readiness="true"]').textContent).toContain('1/2 ready');

    // Copy Spanish from Compose — must include the official translation disclosure
    const copyEs = host.querySelector('[data-famann-copy-lang="es"]');
    await act(async () => { copyEs.click(); await Promise.resolve(); });
    expect(copiedTexts[0]).toContain('Hola familias.');
    expect(copiedTexts[0]).toContain('machine-assisted and reviewed by school staff');
    expect(copyEs.textContent).toContain('Copied');

    // Save announcement and verify per-language Copy also works in Saved detail view
    const saveBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Save announcement'));
    await act(async () => { saveBtn.click(); });
    const savedCopyEs = host.querySelector('[data-famann-saved-copy="es"]');
    expect(savedCopyEs).toBeTruthy();
    await act(async () => { savedCopyEs.click(); await Promise.resolve(); });
    expect(copiedTexts.length).toBe(2);
    expect(copiedTexts[1]).toContain('Hola familias.');
  });

  it('SpedTimelinesPanel supports interactive Dashboard band/provider filters and Timelines search/status filters', async () => {
    const today = new Date();
    const fmt = (offsetDays) => {
      const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays));
      return d.toISOString().slice(0, 10);
    };
    localStorage.setItem('allo_sped_cases_v1', JSON.stringify([
      { id: 'c1', code: 'A-OV', type: 'initial_eval', provider: 'AP', keyDate: fmt(-70), dueDate: fmt(-5), completedAt: null },
      { id: 'c2', code: 'B-UR', type: 'annual', provider: 'JB', keyDate: fmt(-355), dueDate: fmt(7), completedAt: null },
      { id: 'c3', code: 'C-OK', type: 'triennial', provider: 'AP', keyDate: fmt(-1000), dueDate: fmt(60), completedAt: null },
      { id: 'c4', code: 'D-DN', type: 'annual', provider: 'JB', keyDate: fmt(-365), dueDate: fmt(-10), completedAt: fmt(-12) },
    ]));

    const host = mountEl(React.createElement(SpedTimelinesPanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
    }));

    // Default Dashboard shows all 3 open cases without filter bar
    expect(host.querySelector('[data-spedtl-dash-filter-bar="true"]')).toBeNull();
    expect(host.querySelectorAll('tbody tr').length).toBe(3);

    // Click Overdue urgency card to isolate A-OV
    const overdueBtn = host.querySelector('[data-spedtl-band-filter="overdue"]');
    await act(async () => { overdueBtn.click(); });
    expect(overdueBtn.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-spedtl-dash-filter-bar="true"]').textContent).toContain('Showing 1 of 3 open');
    expect(host.querySelectorAll('tbody tr').length).toBe(1);
    expect(host.querySelector('tbody').textContent).toContain('A-OV');

    // Clear filter and click provider JB chip to isolate B-UR
    await act(async () => { host.querySelector('[data-spedtl-dash-clear="true"]').click(); });
    const jbBtn = host.querySelector('[data-spedtl-provider-filter="JB"]');
    await act(async () => { jbBtn.click(); });
    expect(jbBtn.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('tbody tr').length).toBe(1);
    expect(host.querySelector('tbody').textContent).toContain('B-UR');

    // Switch to Timelines tab (4 cases >= 4 -> search & status filter strip visible)
    await act(async () => { host.querySelector('#spedtl-tab-cases').click(); });
    expect(host.querySelector('[data-spedtl-cases-filter="true"]')).toBeTruthy();
    await act(async () => { host.querySelector('[data-spedtl-status-filter="done"]').click(); });
    expect(host.querySelector('ul').textContent).toContain('D-DN');
    expect(host.querySelector('ul').textContent).not.toContain('A-OV');

    await act(async () => { host.querySelector('[data-spedtl-status-filter="all"]').click(); });
    setInputValue(host.querySelector('#spedtl-cases-search'), 'C-OK');
    expect(host.querySelector('ul').textContent).toContain('C-OK');
    expect(host.querySelector('ul').textContent).not.toContain('B-UR');
  });

  it('MtssTriagePanel renders tier distribution bar, one-click tier bulk-select, board code search, and Progress movement filters', async () => {
    const cuts = { higherBetter: true, tier2Cut: 40, tier3Cut: 20 };
    localStorage.setItem('allo_mtss_datasets_v1', JSON.stringify([
      {
        id: 'w2', label: 'ORF g3', window: '2027 Winter', cutpoints: cuts, savedAt: 2,
        rows: [
          { code: 'S1', score: 25 }, // T3 -> T2 (less_intensive)
          { code: 'S2', score: 15 }, // T2 -> T3 (more_intensive)
          { code: 'S3', score: 50 }, // T1 -> T1 (same)
          { code: 'S4', score: 12 }, // T3
          { code: 'S5', score: 30 }, // T2
          { code: 'S6', score: 65 }, // T1
        ],
      },
      {
        id: 'w1', label: 'ORF g3', window: '2026 Fall', cutpoints: cuts, savedAt: 1,
        rows: [
          { code: 'S1', score: 14 }, // T3
          { code: 'S2', score: 28 }, // T2
          { code: 'S3', score: 48 }, // T1
          { code: 'S4', score: 10 }, // T3
          { code: 'S5', score: 32 }, // T2
          { code: 'S6', score: 60 }, // T1
        ],
      },
    ]));

    const host = mountEl(React.createElement(MtssTriagePanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
    }));

    const fallBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('ORF g3 · 2026 Fall'));
    await act(async () => { fallBtn.click(); });

    // Distribution bar shows 33% per tier for 2/2/2 split
    const dist = host.querySelector('[data-mtss-tier-distribution="true"]');
    expect(dist.textContent).toContain('T1: 33% (2)');
    expect(dist.textContent).toContain('T2: 33% (2)');
    expect(dist.textContent).toContain('T3: 33% (2)');

    // One-click Tier 3 bulk-select checks S1 and S4 and updates live selected count
    const selectT3 = host.querySelector('[data-mtss-select-tier="3"]');
    await act(async () => { selectT3.click(); });
    expect(selectT3.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-mtss-selected-bar="true"]').textContent).toContain('2 selected');

    // Board search (shown at >= 6 students) filters codes
    const search = host.querySelector('#mtss-board-search');
    expect(search).toBeTruthy();
    setInputValue(search, 'S4');
    expect(host.textContent).toContain('S4');
    expect(host.textContent).toContain('no match');

    // Clear selected works
    await act(async () => { host.querySelector('[data-mtss-clear-selected="true"]').click(); });
    expect(host.querySelector('[data-mtss-selected-bar="true"]')).toBeNull();

    // Progress tab movement filter isolates More intensive (S2)
    await act(async () => { host.querySelector('#mtss-tab-progress').click(); });
    setSelectValue(host.querySelector('#mtss-prog-A'), 'w1');
    setSelectValue(host.querySelector('#mtss-prog-B'), 'w2');
    expect(host.querySelector('[data-mtss-progress-filter="true"]')).toBeTruthy();
    await act(async () => { host.querySelector('[data-mtss-prog-filter="more_intensive"]').click(); });
    const rows = host.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('S2');
  });
});
