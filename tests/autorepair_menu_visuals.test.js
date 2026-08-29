// Auto Repair Shop — visual dashboard structure and accessibility.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('Auto Repair menu visual dashboard', () => {
  it('renders semantic quick starts, category bands, and module cards', () => {
    const host = hostFor(renderTool(ID, {}));
    const dashboard = host.querySelector('[data-ar-menu-dashboard]');

    expect(dashboard).toBeTruthy();
    expect(dashboard.getAttribute('role')).toBe('main');
    expect(host.querySelector('[data-ar-menu-hero]')).toBeTruthy();

    const quickStarts = [...host.querySelectorAll('[data-ar-quick-start]')];
    const categories = [...host.querySelectorAll('[data-ar-category]')];
    const toggles = [...host.querySelectorAll('[data-ar-category-toggle]')];
    const moduleCards = [...host.querySelectorAll('[data-ar-module-card]')];

    expect(quickStarts.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
    expect(moduleCards.length).toBeGreaterThan(0);
    expect(quickStarts.every((node) => node.tagName === 'BUTTON')).toBe(true);
    expect(moduleCards.every((node) => node.tagName === 'BUTTON')).toBe(true);
    expect(toggles.every((node) => ['true', 'false'].includes(node.getAttribute('aria-expanded')))).toBe(true);
    expect(toggles.every((node) => node.hasAttribute('aria-controls'))).toBe(true);

    const decorativeIcons = [
      ...host.querySelectorAll('[data-ar-quick-start] .ar-menu-icon-well'),
      ...host.querySelectorAll('[data-ar-category] > button .ar-menu-icon-well'),
      ...host.querySelectorAll('[data-ar-module-card] .ar-menu-icon-well')
    ];
    expect(decorativeIcons.length).toBeGreaterThan(0);
    expect(decorativeIcons.every((node) => node.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('shows seeded progress numerically and with valid progressbar semantics', () => {
    const html = renderTool(ID, {
      autoRepair: {
        uhSeen: { battery: true, alternator: true },
        rbDone: { seeded_case: { verdict: 'incorrect' } },
        tcDone: ['secure_car', 'retrieve_tools'],
        badges: { starter: { label: 'Starter', when: 1 } }
      }
    });
    const host = hostFor(html);
    const progressBars = [...host.querySelectorAll('[data-ar-progress][role="progressbar"]')];

    expect(progressBars.length).toBeGreaterThan(0);
    for (const bar of progressBars) {
      const minimum = Number(bar.getAttribute('aria-valuemin'));
      const maximum = Number(bar.getAttribute('aria-valuemax'));
      const current = Number(bar.getAttribute('aria-valuenow'));
      const valueText = bar.getAttribute('aria-valuetext') || '';

      expect(Number.isFinite(minimum)).toBe(true);
      expect(Number.isFinite(maximum)).toBe(true);
      expect(Number.isFinite(current)).toBe(true);
      expect(current).toBeGreaterThanOrEqual(minimum);
      expect(current).toBeLessThanOrEqual(maximum);
      expect(valueText).toMatch(/\d+ of \d+/);
      expect(bar.parentElement.textContent).toMatch(/\d+ of \d+/);
    }
    expect(host.querySelector('[data-ar-primary-action="underhood"]')).toBeTruthy();
  });

  it('keeps the dashboard safe across themes and responsive interaction modes', () => {
    const themes = [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ];

    for (const theme of themes) {
      const html = renderTool(ID, {}, theme);
      const host = hostFor(html);
      expect(host.querySelector('[data-ar-menu-dashboard]')).toBeTruthy();
      expect(host.querySelector('[data-ar-module-card]')).toBeTruthy();
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }

    const flair = document.getElementById('allo-ar-flair-css');
    const focus = document.getElementById('allo-ar-focus-css');
    const reducedMotion = document.getElementById('allo-stem-motion-reduce-css');

    expect(flair).toBeTruthy();
    expect(flair.textContent).toContain('@media (max-width: 480px)');
    expect(flair.textContent).toContain('.ar-menu-module-grid { grid-template-columns: 1fr; }');
    expect(flair.textContent).toContain('@media (hover: hover) and (pointer: fine)');
    expect(flair.textContent).toContain(':not(:disabled):not([aria-disabled="true"]):hover');
    expect(flair.textContent).toContain('[data-ar-print-hide="true"]');
    expect(flair.textContent).not.toContain('button[data-ar-focusable] { display: none');
    expect(focus.textContent).toContain('outline:3px solid #fbbf24');
    expect(reducedMotion.textContent).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps the canonical source and desktop bundle mirror byte-identical', () => {
    const canonical = readFileSync(resolve(process.cwd(), FILE));
    const mirror = readFileSync(resolve(process.cwd(), MIRROR));
    expect(Buffer.compare(canonical, mirror)).toBe(0);
  });
});

