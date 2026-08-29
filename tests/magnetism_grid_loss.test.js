import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function transformerSeed(extra = {}) {
  return Object.assign({
    tab: 'transformer', learningMode: 'guided',
    xfmrN1: 100, xfmrN2: 200, xfmrAC: true,
    xfmrLoad: 120, xfmrEfficiency: 94, xfmrMission: 0,
    xfmrChecked: false, xfmrMissionWins: {}, xfmrGridUsed: false,
    notebookOpen: false,
  }, extra);
}

function mountInteractive(cfg, seed, callbacks = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: callbacks.addToast || (() => {}),
      announceToSR: callbacks.announceToSR || (() => {}),
      awardXP: callbacks.awardXP || (() => {}),
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
      t: (key, fallback) => fallback || key,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    close() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

function withTransformerHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: transformerSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    return callback(host, html);
  } finally {
    host.remove();
  }
}

describe('magnetism transformer grid-loss lens', () => {
  it('models fixed-power transmission with inverse current and inverse-square wire heat', () => {
    const reference = physics.transformerGridLossState(120, true, 1000, 1);
    expect(reference).toMatchObject({ active: true, status: 'same', voltageRatio: 1, currentRatio: 1, lossRatio: 1 });
    expect(reference.live.current).toBeCloseTo(8.333333, 5);
    expect(reference.live.loss).toBeCloseTo(69.444444, 5);

    const doubled = physics.transformerGridLossState(240, true, 1000, 1);
    expect(doubled).toMatchObject({ status: 'cooler', voltageRatio: 2, currentRatio: 0.5, lossRatio: 0.25 });
    expect(doubled.live.sourcePower).toBeCloseTo(1017.361111, 5);

    const quadrupled = physics.transformerGridLossState(480, true, 1000, 1);
    expect(quadrupled).toMatchObject({ voltageRatio: 4, currentRatio: 0.25, lossRatio: 0.0625 });

    const halved = physics.transformerGridLossState(60, true, 1000, 1);
    expect(halved).toMatchObject({ status: 'hotter', voltageRatio: 0.5, currentRatio: 2, lossRatio: 4 });

    const dc = physics.transformerGridLossState(240, false, 1000, 1);
    expect(dc).toMatchObject({ active: false, status: 'inactive', voltageRatio: null, currentRatio: null, lossRatio: null });
    expect(dc.comparison).toContain('paused');

    const defensive = physics.transformerGridLossState(-240, true, Number.NaN, 0);
    expect(defensive).toMatchObject({ active: true, payloadPower: 1000, wireResistance: 1, voltageRatio: 2 });
  });

  it('renders a shared-scale, same-payload visual comparison without adding challenge meters', () => {
    withTransformerHost({}, (host, html) => {
      const lens = host.querySelector('[data-transformer-grid-lens="true"]');
      expect(lens).toBeTruthy();
      expect(lens.getAttribute('data-status')).toBe('cooler');
      expect(lens.querySelectorAll('.mag-grid-lane')).toHaveLength(2);
      expect(lens.querySelectorAll('.mag-grid-factor')).toHaveLength(3);
      expect(lens.querySelectorAll('.mag-grid-presets button')).toHaveLength(4);
      expect(lens.querySelectorAll('.mag-grid-heat[role="img"]')).toHaveLength(2);
      expect(lens.querySelector('button[aria-pressed="true"]').textContent).toContain('240 V');
      expect(lens.textContent).toContain('Higher voltage, cooler wire');
      expect(lens.textContent).toContain('4.17 A');
      expect(lens.textContent).toContain('17.4 W');
      expect(lens.textContent).toContain('inverse square');
      expect((html.match(/role="meter"/g) || [])).toHaveLength(3);
    });
  });

  it('turns voltage presets into immediate visual evidence and resumes from DC', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, transformerSeed({ xfmrAC: false }), {
      announceToSR: (message) => announcements.push(message),
    });
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const button = (text) => [...live.host.querySelectorAll('button')].find((item) => item.textContent.includes(text));
    try {
      expect(live.host.querySelector('.mag-grid-lens').getAttribute('data-status')).toBe('inactive');
      expect(live.host.textContent).toContain('Transmission lens paused');

      click(button('4× · 480 V'));
      expect(live.host.querySelector('.mag-grid-lens').getAttribute('data-status')).toBe('cooler');
      expect(button('4× · 480 V').getAttribute('aria-pressed')).toBe('true');
      expect(live.host.textContent).toContain('2.08 A');
      expect(live.host.textContent).toContain('4.3 W');

      click(button('0.5× · 60 V'));
      expect(live.host.querySelector('.mag-grid-lens').getAttribute('data-status')).toBe('hotter');
      expect(live.host.textContent).toContain('Lower voltage, hotter wire');
      expect(live.host.textContent).toContain('16.67 A');
      expect(live.host.textContent).toContain('277.8 W');
      expect(announcements).toHaveLength(2);
      expect(announcements[0]).toContain('480 volts');
      expect(announcements[1]).toContain('60 volts');
    } finally {
      live.close();
    }
  });

  it('records grid evidence in notebook metrics and restored-session text', () => {
    const active = transformerSeed({ notebookOpen: true });
    const metrics = physics.notebookMetricSnapshot({ magnetism: active });
    expect(metrics.find((metric) => metric.key === 'grid_line_voltage')).toMatchObject({ value: 240, display: '240 V' });
    expect(metrics.find((metric) => metric.key === 'grid_line_current')).toMatchObject({ display: '4.17 A' });
    expect(metrics.find((metric) => metric.key === 'grid_wire_loss')).toMatchObject({ display: '17.4 W' });
    expect(metrics.find((metric) => metric.key === 'grid_loss_factor')).toMatchObject({ value: 0.25, display: '0.25 x' });

    const dcMetrics = physics.notebookMetricSnapshot({ magnetism: transformerSeed({ xfmrAC: false }) });
    expect(dcMetrics.some((metric) => metric.key.startsWith('grid_'))).toBe(false);

    withTransformerHost(active, (_host, html) => {
      expect(html).toContain('grid lens 240 V line, 4.17 A, 17.4 W wire heat (0.25× baseline)');
    });
  });

  it('keeps the lens responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:560px){.mag-root .mag-grid-compare{grid-template-columns:1fr}');
    expect(source).toContain('.mag-grid-factors{grid-template-columns:1fr 1fr}');
    expect(source).toContain('.mag-grid-readings{grid-template-columns:1fr}');

    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: transformerSeed() });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      expect(host.querySelector('.mag-grid-feedback[role="status"][aria-live="polite"]')).toBeTruthy();
      expect(host.querySelector('.mag-grid-presets[role="group"]')).toBeTruthy();
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 15000);
});
