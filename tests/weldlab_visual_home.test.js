import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const page = (data = {}, ctx = {}) => {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weldLab', { weldLab: data }, ctx);
  return root;
};
const tile = (root, key) => root.querySelector('[data-weld-portfolio-tile="' + key + '"]');

beforeEach(() => {
  localStorage.clear();
  delete window.__alloflowWeldLab;
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

describe('WeldLab visual navigation', () => {
  it.each(['path', 'all'])('gives each %s module a static specimen without changing its accessible name', (mode) => {
    const root = page({ menu_mode: mode });
    const cards = mode === 'path'
      ? [...root.querySelectorAll('ol[aria-label="WeldLab learning path"] section ul button')]
      : [...root.querySelectorAll('button[aria-disabled]')];
    expect(cards).toHaveLength(24);
    cards.forEach((card) => {
      const preview = card.querySelector('svg[data-weld-preview]');
      expect(preview, card.getAttribute('aria-label')).toBeTruthy();
      expect(preview.getAttribute('aria-hidden')).toBe('true');
      expect(preview.getAttribute('focusable')).toBe('false');
      expect(card.getAttribute('aria-label')).toBeTruthy();
      expect(preview.querySelector('image, animate, animateTransform')).toBeNull();
    });
    expect(new Set(cards.map((card) => card.querySelector('svg').dataset.weldPreview)).size).toBeGreaterThan(7);
  });

  it('keeps the portfolio preview legible in contrast mode', () => {
    const root = page({}, { isContrast: true });
    const preview = tile(root, 'bead').querySelector('svg');
    expect(preview.style.background).toBe('rgb(0, 0, 0)');
    expect(preview.querySelector('[stroke="#ffff00"]')).toBeTruthy();
  });
});

describe('WeldLab practice portfolio', () => {
  it('starts empty instead of inventing scores, beads or mastery', () => {
    const root = page();
    expect(tile(root, 'bead').textContent).toContain('Your first pass awaits');
    expect(tile(root, 'missions').textContent).toContain('0 / 6');
    expect(tile(root, 'run').textContent).toContain('No scored run yet');
    expect(tile(root, 'mastery').textContent).toContain('0 / 6');
    expect(tile(root, 'mastery').textContent).toContain('0 identified · 0 diagnosed');
  });

  it('uses the saved pass model and reports partial passes honestly', () => {
    const root = page({
      arc_run: [11, 12, 13, 14], bl_V: 22, bl_A: 180, bl_TS: 12,
      bl_process: 'mig', bl_material: 'steel', bl_thickness: 0.25,
    });
    const report = window.__WeldLabCore.arc.beadReport(22, 180, 12, 'mig', 'steel', 0.25, [11, 12, 13, 14]);
    expect(tile(root, 'bead').textContent).toContain(report.overall + ' / 100');
    expect(tile(root, 'bead').textContent).toContain('Saved pass · 4 of 32 segments');
  });

  it('falls back to the pinned bead when there is no saved pass', () => {
    const root = page({ arc_pin: { V: 22, A: 180, TS: 12, TH: 0.25, P: 'mig', M: 'steel' } });
    expect(tile(root, 'bead').textContent).toContain('Pinned bead');
    expect(tile(root, 'bead').textContent).toMatch(/\d+ \/ 100/);
  });

  it('counts valid missions and chooses the best current scoring tier', () => {
    const root = page({
      arc_missions: { thinAl: { done: true }, lowHeat: { done: true }, invented: { done: true } },
      speedBest: { apprentice: 100, apprentice_v2: 62, pro_v2: 81, biw_v2: 70, invented_v2: 100 },
    });
    expect(tile(root, 'missions').textContent).toContain('2 / 6');
    expect(tile(root, 'run').textContent).toContain('81%');
    expect(tile(root, 'run').textContent).toContain('Pro · bead length in spec');
  });

  it('does not compare old scores with the current scoring system, and keeps a valid zero', () => {
    expect(tile(page({ speedBest: { apprentice: 100 } }), 'run').textContent).toContain('No scored run yet');
    expect(tile(page({ speedBest: { apprentice_v2: 0 } }), 'run').textContent).toContain('0%');
  });

  it('distinguishes finding, correct identification, diagnosis and complete review', () => {
    const root = page({
      defectCatalog: { porosity: { foundCount: 2, classifiedCount: 1 }, undercut: { foundCount: 1 } },
      dh2_diag: { 1: { best: 0.75 }, 2: { best: 0.5 } },
      dh2_review: { porosity: { named: 1, cause: 1, fix: 1 }, undercut: { named: 1, cause: 1, fix: 0 } },
    });
    expect(tile(root, 'mastery').textContent).toContain('1 / 6');
    expect(tile(root, 'mastery').textContent).toContain('1 identified · 1 diagnosed');
  });

  it('survives malformed or obsolete saved portfolio fields', () => {
    const root = page({
      arc_run: [null, 'fast'], arc_pin: { V: 'bad' }, arc_missions: ['thinAl'],
      speedBest: { pro_v2: Infinity }, defectCatalog: { porosity: null }, dh2_diag: [], dh2_review: true,
    });
    const portfolio = root.querySelector('[data-weld-portfolio]');
    expect(portfolio).toBeTruthy();
    expect(portfolio.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(tile(root, 'bead').textContent).toContain('Your first pass awaits');
  });
});
