// Titration Lab v3 visual/motion regressions. These deliberately inspect the
// rendered contracts rather than snapshotting the whole tool: the important
// guarantees are finite feedback, redundant curve encoding, graphical contrast,
// narrow-screen legibility, and predictable disclosure focus.

import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_titration.js';
const SOURCE = fs.readFileSync(SOURCE_PATH, 'utf8');

let tool;
let mountedHost;
let mountedRoot;

function renderState(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
  return host;
}

function classes(node) {
  return String(node?.getAttribute('class') || '').split(/\s+/).filter(Boolean);
}

function additionMotionNodes(root) {
  return [...root.querySelectorAll('[style]')].filter((node) =>
    /(?:titrationDrip|bubbleRise|stirSpin)/.test(node.getAttribute('style') || ''));
}

function parseColor(value) {
  const raw = String(value || '').trim();
  let match = raw.match(/^#([0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  match = raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!match) throw new Error('Unsupported rendered color: ' + raw);
  return {
    r: Number(match[1]), g: Number(match[2]), b: Number(match[3]),
    a: match[4] == null ? 1 : Number(match[4]),
  };
}

function composite(foreground, background) {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function luminance(color) {
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function minWidthPx(node) {
  if (!node) return 0;
  const classMatch = String(node.getAttribute('class') || '')
    .match(/min-w-\[(\d+(?:\.\d+)?)(px|rem)\]/);
  if (classMatch) return Number(classMatch[1]) * (classMatch[2] === 'rem' ? 16 : 1);
  const styleMatch = String(node.getAttribute('style') || '')
    .match(/min-width:\s*(\d+(?:\.\d+)?)(px|rem)/i);
  return styleMatch ? Number(styleMatch[1]) * (styleMatch[2] === 'rem' ? 16 : 1) : 0;
}

async function mountTwoLabInstances() {
  mountedHost = document.createElement('div');
  document.body.appendChild(mountedHost);

  function LabInstance({ instanceId }) {
    const [toolData, setToolData] = React.useState({
      titrationLab: {
        safetyChecked: true, labTab: 'titrate', volumeAdded: 0,
        titrationReduceMotion: false, titrationAnimPaused: false,
      },
    });
    const ctx = makeCtx({
      toolData,
      updateMulti(toolId, patch) {
        setToolData((previous) => Object.assign({}, previous, {
          [toolId]: Object.assign({}, previous[toolId] || {}, patch || {}),
        }));
      },
    });
    return React.createElement('section', { 'data-test-mounted-lab': instanceId }, tool.render(ctx));
  }

  function App() {
    return React.createElement(React.Fragment, null,
      React.createElement(LabInstance, { key: 'first', instanceId: 'first' }),
      React.createElement(LabInstance, { key: 'second', instanceId: 'second' }));
  }

  mountedRoot = ReactDOMClient.createRoot(mountedHost);
  await React.act(async () => {
    mountedRoot.render(React.createElement(App));
    await Promise.resolve();
  });
  return mountedHost;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(SOURCE_PATH, 'titrationLab');
  window._titrationXPFlags = {};
});

afterEach(async () => {
  if (mountedRoot) {
    await React.act(async () => mountedRoot.unmount());
    mountedRoot = null;
  }
  mountedHost?.remove();
  mountedHost = null;
  if (window.__alloTitrationAnimCleanup) {
    window.__alloTitrationAnimCleanup();
    window.__alloTitrationAnimCleanup = null;
  }
  vi.restoreAllMocks();
});

describe('finite addition feedback and explicit motion control', () => {
  it('does not keep dripping after a non-zero reading has settled', () => {
    const settled = renderState({ volumeAdded: 8, _prevVolume: 8 });
    expect(additionMotionNodes(settled)).toHaveLength(0);
  });

  it('uses a finite animation when an addition has just occurred', () => {
    const adding = renderState({ volumeAdded: 8, _prevVolume: 7.5 });
    const moving = additionMotionNodes(adding);
    expect(moving.length).toBeGreaterThan(0);
    for (const node of moving) {
      expect(node.getAttribute('style'), node.outerHTML).not.toMatch(/\binfinite\b/i);
    }
  });

  it('offers a persistent pressed-state pause/play control for the reference animation', () => {
    const playing = renderState({ titrationAnimPaused: false });
    const pause = playing.querySelector('button[aria-label="Pause reference curve animation"]');
    const playingCanvas = playing.querySelector('canvas[data-titration-anim="true"]');
    expect(pause).not.toBeNull();
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    expect(classes(pause)).toContain('min-h-[44px]');
    expect(playingCanvas.getAttribute('data-titration-paused')).toBe('false');

    const paused = renderState({ titrationAnimPaused: true });
    const play = paused.querySelector('button[aria-label="Play reference curve animation"]');
    const pausedCanvas = paused.querySelector('canvas[data-titration-anim="true"]');
    expect(play).not.toBeNull();
    expect(play.getAttribute('aria-pressed')).toBe('true');
    expect(pausedCanvas.getAttribute('data-titration-paused')).toBe('true');
  });

  it('immediately pauses only the reference canvas inside the owning lab instance', async () => {
    const host = await mountTwoLabInstances();
    const labs = [...host.querySelectorAll('[data-titration-instance="lab"]')];
    expect(labs).toHaveLength(2);

    const reduceButtons = labs.map((lab) =>
      lab.querySelector('button[aria-label="Reduce nonessential lab motion"]'));
    const canvases = labs.map((lab) =>
      lab.querySelector('canvas[data-titration-anim="true"]'));
    expect(reduceButtons.every(Boolean)).toBe(true);
    expect(reduceButtons[0].textContent.trim()).toBe('Reduce motion');
    expect(canvases.every(Boolean)).toBe(true);

    const owningPause = vi.fn();
    const otherPause = vi.fn();
    canvases[0]._ttSetPaused = owningPause;
    canvases[1]._ttSetPaused = otherPause;

    await React.act(async () => {
      reduceButtons[0].click();
      await Promise.resolve();
    });

    expect(owningPause).toHaveBeenCalledTimes(1);
    expect(owningPause).toHaveBeenCalledWith(true);
    expect(otherPause).not.toHaveBeenCalled();
    const updatedButton = labs[0].querySelector('button[aria-label="Motion reduced. Restore lab motion"]');
    expect(updatedButton).not.toBeNull();
    expect(updatedButton.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('full-curve preview is visible without relying on color', () => {
  it('pairs the dashed preview path with a dashed swatch and explicit dashed text', () => {
    const root = renderState({ presetId: 'wa_sb', volumeAdded: 8 });
    const curve = root.querySelector('svg[aria-label^="Titration curve"]');
    const preview = [...curve.querySelectorAll('path')].find((path) =>
      path.getAttribute('stroke-dasharray'));
    const legend = root.querySelector('[aria-label="Titration curve legend"]');
    const previewItem = [...legend.querySelectorAll(':scope > span')].find((item) =>
      /full-curve preview/i.test(item.textContent));
    const swatch = previewItem?.querySelector('[aria-hidden="true"]');

    expect(preview).not.toBeUndefined();
    expect(preview.getAttribute('stroke-dasharray')).not.toBe('');
    expect(previewItem).not.toBeUndefined();
    expect(previewItem.textContent).toMatch(/dashed.*preview|preview.*dashed/i);
    expect(classes(swatch)).toContain('border-dashed');
    expect(root.querySelector('#titration-curve-caption').textContent)
      .toMatch(/solid[^.]*observed[^.]*dashed[^.]*preview/i);
  });

  it('keeps the preview stroke at 3:1 against the plot background', () => {
    const root = renderState({ presetId: 'sa_sb', volumeAdded: 8 });
    const curve = root.querySelector('svg[aria-label^="Titration curve"]');
    const preview = [...curve.querySelectorAll('path')].find((path) =>
      path.getAttribute('stroke-dasharray'));

    expect(preview).not.toBeUndefined();
    const plotBackground = parseColor('#0f172a');
    const renderedStroke = composite(parseColor(preview.getAttribute('stroke')), plotBackground);
    expect(contrastRatio(renderedStroke, plotBackground)).toBeGreaterThanOrEqual(3);
  });
});

describe('curve remains legible on a narrow viewport', () => {
  it('uses a named keyboard-scroll region with a readable minimum width, or a mobile summary', () => {
    const root = renderState({ presetId: 'poly_h3po4', volumeAdded: 25 });
    const curve = root.querySelector('svg[aria-label^="Titration curve"]');
    const scrollRegion = curve.closest('.overflow-x-auto');
    const namedKeyboardScroll = !!scrollRegion
      && scrollRegion.getAttribute('role') === 'region'
      && /titration curve|graph/i.test(scrollRegion.getAttribute('aria-label') || '')
      && scrollRegion.getAttribute('tabindex') === '0';
    const readableWidth = Math.max(
      minWidthPx(curve),
      minWidthPx(curve.parentElement),
      minWidthPx(scrollRegion),
    ) >= 600;
    const mobileSummary = root.querySelector(
      '[data-titration-mobile-summary], [aria-label="Mobile titration curve summary"]',
    );
    const usefulMobileSummary = !!mobileSummary
      && /equivalence|endpoint/i.test(mobileSummary.textContent)
      && /volume|mL/i.test(mobileSummary.textContent);

    expect(
      (namedKeyboardScroll && readableWidth) || usefulMobileSummary,
      JSON.stringify({ namedKeyboardScroll, readableWidth, usefulMobileSummary }),
    ).toBe(true);
  });
});

describe('equipment disclosure target and focus relationship', () => {
  it('uses deterministic aria-controls targets that are labelled and focusable', () => {
    for (const id of ['burette', 'erlenmeyer', 'pipette', 'indicator', 'washbottle']) {
      const root = renderState({ labTab: 'equipment', selectedEquip: id });
      const button = root.querySelector('#titration-equipment-button-' + id);
      const targetId = 'titration-equipment-detail-' + id;
      const panel = root.querySelector('#' + targetId);

      expect(button, id).not.toBeNull();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(button.getAttribute('aria-controls')).toBe(targetId);
      expect(panel, id + ' detail').not.toBeNull();
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-labelledby')).toBe(button.getAttribute('aria-labelledby'));
      expect(panel.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('hands focus to the newly opened equipment detail without losing the button relationship', () => {
    expect(SOURCE).toMatch(
      /focusTitrationRegion\(\s*['"]titration-equipment-detail-['"]\s*\+\s*eq\.id\s*\)/,
    );
  });
});
