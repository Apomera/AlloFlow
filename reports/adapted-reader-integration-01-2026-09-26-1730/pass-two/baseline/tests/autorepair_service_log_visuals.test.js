// Auto Repair Shop — service-log workspace visual and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';

const ENTRIES = [
  {
    id: 'oil-1',
    date: '2026-08-20',
    odo: 85432,
    service: 'Oil + filter change',
    cost: 45.5,
    notes: 'Synthetic 0W-20'
  },
  {
    id: 'brakes-1',
    date: '2026-05-04',
    odo: 81000,
    service: 'Front brake pads',
    cost: 420,
    notes: ''
  }
];

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function log(extra, theme) {
  return hostFor(renderTool(ID, {
    autoRepair: Object.assign({ view: 'log' }, extra || {})
  }, theme));
}

function expectLabelled(host, selector) {
  const region = host.querySelector(selector);
  expect(region, selector + ' missing').toBeTruthy();
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId, selector + ' is not labelled').toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
  return region;
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('service-log visual workspace', () => {
  it('renders a labelled, form-first workspace with a designed empty state', () => {
    const host = log();
    const shell = host.querySelector('.ar-log-shell[data-ar-service-log][data-ar-log-shell]');
    const summary = expectLabelled(host, '[data-ar-service-hero]');
    const form = expectLabelled(host, 'form[data-ar-log-form]');
    const ledger = expectLabelled(host, '[data-ar-service-ledger]');

    expect(shell).toBeTruthy();
    expect(shell.querySelector('[data-ar-service-layout]')).toBeTruthy();
    expect(form.compareDocumentPosition(ledger) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.getAttribute('data-ar-log-form-state')).toBe('ready');

    const stats = [...summary.querySelectorAll('[data-ar-service-stat]')];
    expect(stats.map((node) => node.dataset.arServiceStat)).toEqual([
      'entries', 'cost', 'latest', 'odometer'
    ]);
    expect(summary.textContent).toContain('Entries: 0');
    expect(summary.textContent).toContain('Total cost: —');

    const empty = ledger.querySelector('[data-ar-service-empty][data-ar-log-empty]');
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.textContent).toContain('No service records yet');
    expect(empty.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(ledger.querySelector('[data-ar-log-timeline]')).toBeNull();
    expect(ledger.querySelector('[data-ar-log-export]')).toBeNull();
  });

  it('turns saved records into one semantic timeline with grounded summary values', () => {
    const host = log({ serviceLog: ENTRIES });
    const dashboard = host.querySelector('[data-ar-log-dashboard]');
    const timeline = host.querySelector('ol.ar-log-timeline[data-ar-service-list][role="list"]');
    const entries = [...timeline.querySelectorAll(':scope > li[data-ar-log-entry][role="listitem"]')];

    expect(dashboard.textContent).toContain('Entries: 2');
    expect(dashboard.textContent).toContain('Total cost: $465.50');
    expect(dashboard.textContent).toContain('Latest service: 2026-08-20');
    expect(dashboard.textContent).toContain('Latest odometer: 85,432');
    expect(entries).toHaveLength(2);

    for (const entry of entries) {
      expect(entry.getAttribute('data-ar-log-entry-state')).toBe('normal');
      expect(entry.querySelector('article[data-ar-service-entry]')).toBeTruthy();
      expect(entry.querySelector('dl.ar-log-meta')).toBeTruthy();
      const marker = entry.querySelector('[data-ar-log-marker]');
      expect(marker).toBeTruthy();
      expect(marker.getAttribute('aria-hidden')).toBe('true');
    }

    expect(host.querySelector('[data-ar-service-export-action="download"]')).toBeTruthy();
    expect(host.querySelector('[data-ar-service-export-action="copy"]')).toBeTruthy();
  });

  it('distinguishes invalid, duplicate, confirming-delete, and undo states', () => {
    const invalid = log({
      logDraft: { date: '2026-12-31', odo: '-1', service: '', cost: '-5', notes: '' },
      logFormErrors: {
        date: 'Service date cannot be in the future.',
        service: 'Describe the service that was performed.',
        odo: 'Odometer must be a whole number.',
        cost: 'Cost must be zero or greater.'
      }
    });
    const invalidForm = invalid.querySelector('[data-ar-log-form]');
    expect(invalidForm.dataset.arLogFormState).toBe('invalid');
    expect(invalidForm.querySelector('[data-ar-service-error-summary="invalid"][role="alert"]')).toBeTruthy();

    const duplicate = log({
      logFormErrors: { duplicate: 'An identical service record already exists.' }
    });
    const duplicateForm = duplicate.querySelector('[data-ar-log-form]');
    expect(duplicateForm.dataset.arLogFormState).toBe('duplicate');
    expect(duplicateForm.querySelector('[data-ar-service-error-summary="duplicate"]')).toBeTruthy();
    expect(duplicateForm.textContent).toContain('Possible duplicate:');

    const confirming = log({ serviceLog: ENTRIES, logPendingDelete: 'oil-1' });
    const confirmingEntry = confirming.querySelector('[data-ar-log-entry="oil-1"]');
    expect(confirmingEntry.dataset.arLogEntryState).toBe('confirming');
    expect(confirmingEntry.querySelector('article').dataset.arLogEntryState).toBe('confirming');
    expect(confirmingEntry.querySelector('[data-ar-log-delete-confirm="oil-1"][role="group"]')).toBeTruthy();

    const undo = log({ serviceLog: [], logUndoEntry: ENTRIES[0], logUndoIndex: 0 });
    const undoStatus = undo.querySelector('[data-ar-service-undo-toast="oil-1"]');
    expect(undoStatus.getAttribute('role')).toBe('status');
    expect(undoStatus.getAttribute('aria-live')).toBe('polite');
    expect(undoStatus.getAttribute('aria-atomic')).toBe('true');
    expect(undoStatus.textContent).toContain('Undo');
  });

  it('keeps responsive, print, forced-color, theme, and long-content contracts', () => {
    const longText = 'shop-and-receipt-'.repeat(30);
    for (const theme of [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ]) {
      const html = renderTool(ID, {
        autoRepair: {
          view: 'log',
          serviceLog: [{ ...ENTRIES[0], service: longText.slice(0, 120), notes: longText.slice(0, 500) }]
        }
      }, theme);
      expect(html).toContain('data-ar-service-log="true"');
      expect(html).toContain(longText.slice(0, 120));
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }

    const css = document.getElementById('allo-ar-flair-css').textContent;
    expect(css).toContain('.ar-log-layout { display: grid;');
    expect(css).toContain('@media (max-width: 860px)');
    expect(css).toContain('.ar-log-layout { grid-template-columns: 1fr; }');
    expect(css).toContain('@media (max-width: 520px)');
    expect(css).toContain('.ar-log-stats, .ar-log-form-grid, .ar-log-meta { grid-template-columns: 1fr; }');
    expect(css).toContain('.ar-log-shell button { min-height: 44px; }');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('.ar-log-entry[data-ar-log-entry-state="confirming"]');
    expect(css).toContain('@media print');
    expect(css).toContain('.ar-log-entry { break-inside: avoid; page-break-inside: avoid; }');
  });

  it('keeps the canonical source and desktop mirror byte-identical', () => {
    const canonical = readFileSync(resolve(process.cwd(), FILE));
    const mirror = readFileSync(resolve(process.cwd(), MIRROR));
    expect(Buffer.compare(canonical, mirror)).toBe(0);
  });
});
