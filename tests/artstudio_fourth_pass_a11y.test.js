import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Art Studio fourth-pass accessibility', () => {
  let host;
  let root;

  beforeEach(() => {
    resetStemLab();
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    vi.restoreAllMocks();
  });

  it('gives the active workspace tabpanel a visible keyboard focus indicator', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', { artStudio: { tab: 'colorWheel' } });
    const container = document.createElement('div');
    container.innerHTML = html;

    const workspace = container.querySelector('#artstudio-panel-colorWheel');
    expect(workspace).not.toBeNull();
    expect(workspace.tabIndex).toBe(0);
    expect(workspace.className).toContain('focus-visible:ring-4');
    expect(workspace.className).toContain('focus-visible:ring-pink-600');
    expect(workspace.className).toContain('focus-visible:ring-offset-4');
  });

  it('focuses and reveals selected artist details without traversing the remaining profile grid', async () => {
    const config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const announce = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'artistExplorer', artistProfileId: 'alma-thomas' },
      });
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const detail = host.querySelector('#artist-selected-detail');
    const hokusaiButton = host.querySelector('#artist-profile-button-hokusai');
    const reveal = vi.fn();
    Object.defineProperty(detail, 'scrollIntoView', { configurable: true, value: reveal });

    expect(hokusaiButton.getAttribute('aria-controls')).toBe('artist-selected-detail');
    expect(detail.getAttribute('aria-labelledby')).toBe('artist-selected-detail-title');
    expect(detail.tabIndex).toBe(-1);

    await act(async () => {
      hokusaiButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(detail);
    expect(detail.querySelector('#artist-selected-detail-title').textContent).toBe('Katsushika Hokusai');
    expect(reveal).toHaveBeenCalledWith({ block: 'nearest' });
    expect(announce).toHaveBeenCalledWith('Selected Katsushika Hokusai in Artists and Traditions Explorer');
  });

  it('chooses Harmony Hunt swatch text from relative luminance contrast', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'harmonyHunt',
        _harmonyHunt: {
          baseHue: 60,
          satBlend: 100,
          litVar: 0,
          rotation: 0,
          paletteSize: 2,
          hypothesis: '',
          stuckRevealed: false,
          understood: false,
          explanation: '',
          log: [],
        },
      },
    });
    const container = document.createElement('div');
    container.innerHTML = html;
    const brightYellow = container.querySelector('[data-harmony-swatch="0"]');
    const darkBlue = container.querySelector('[data-harmony-swatch="1"]');

    // Both swatches have HSL lightness 40. Relative luminance correctly gives
    // the bright yellow black text and the dark blue white text.
    expect(brightYellow.style.color).toBe('rgb(0, 0, 0)');
    expect(darkBlue.style.color).toBe('rgb(255, 255, 255)');
  });

  it('renders Harmony Hunt prompts as one valid list of list items', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'harmonyHunt',
        _harmonyHunt: {
          baseHue: 200,
          satBlend: 70,
          litVar: 50,
          rotation: 0,
          paletteSize: 6,
          hypothesis: '',
          stuckRevealed: true,
          understood: false,
          explanation: '',
          log: [],
        },
      },
    });
    const container = document.createElement('div');
    container.innerHTML = html;
    const promptList = Array.from(container.querySelectorAll('ul')).find((list) =>
      list.textContent.includes('Find the smallest palette'),
    );

    expect(promptList).not.toBeUndefined();
    expect(promptList.querySelector('ul')).toBeNull();
    expect(Array.from(promptList.children).map((child) => child.tagName)).toEqual([
      'LI', 'LI', 'LI', 'LI',
    ]);
  });

  it('keeps the Symmetry learning region mounted and correctly linked while collapsed', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const collapsedHtml = renderTool('artStudio', {
      artStudio: { tab: 'symmetry', showSymInfo: false },
    });
    const collapsed = document.createElement('div');
    collapsed.innerHTML = collapsedHtml;
    const trigger = collapsed.querySelector('#artstudio-symmetry-info-toggle');
    const region = collapsed.querySelector('#artstudio-symmetry-info');

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('artstudio-symmetry-info');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe('artstudio-symmetry-info-toggle');
    expect(region.hidden).toBe(true);
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toBeNull();

    const expandedHtml = renderTool('artStudio', {
      artStudio: { tab: 'symmetry', showSymInfo: true },
    });
    const expanded = document.createElement('div');
    expanded.innerHTML = expandedHtml;
    expect(expanded.querySelector('#artstudio-symmetry-info-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(expanded.querySelector('#artstudio-symmetry-info').hidden).toBe(false);
  });
});
