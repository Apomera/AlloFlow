import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Art Studio Contrast Checker accessibility', () => {
  let host;
  let root;
  let config;
  let latest;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'contrast', ...initial } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('reflows controls and exposes groups, labels, swatches, guidance, and live results', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'contrast', fgH: 0, fgS: 0, fgL: 100, bgH: 0, bgS: 0, bgL: 0 },
    });

    expect(html).toContain('grid grid-cols-1 md:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-contrast-fg-heading"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-contrast-bg-heading"');
    expect(html).toContain('aria-label="Foreground (Text) color preview: HSL 0 degrees, 0 percent saturation, 100 percent lightness."');
    expect(html).toContain('aria-label="Background color preview: HSL 0 degrees, 0 percent saturation, 0 percent lightness."');
    expect(html).toContain('for="artstudio-contrast-fgH"');
    expect(html).toContain('id="artstudio-contrast-fgH"');
    expect(html).toContain('aria-valuetext="100 percent"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('WCAG 2.2 contrast result');
    expect(html).toContain('21.00:1');
    expect(html).toContain('✅ Pass AA Normal');
    expect(html).toContain('WCAG 2.2 AA requires 4.5:1');
  });

  it('preserves zero lightness and updates the keyboard-controlled result', async () => {
    await mount({ fgH: 0, fgS: 0, fgL: 100, bgH: 0, bgS: 0, bgL: 100 });
    const backgroundLightness = host.querySelector('#artstudio-contrast-bgL');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(backgroundLightness, '0');
      backgroundLightness.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.bgL).toBe(0);
    expect(host.querySelector('#artstudio-contrast-bgL').value).toBe('0');
    expect(host.querySelector('[role="status"]').textContent).toContain('21.00:1');
    expect(host.querySelector('[role="status"]').textContent).toContain('Pass AA Normal');
  });

  it('uses explicit fail text rather than color alone', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'contrast', fgH: 0, fgS: 0, fgL: 50, bgH: 0, bgS: 0, bgL: 50 },
    });
    expect(html).toContain('1.00:1');
    expect(html).toContain('❌ Fail AA Large');
    expect(html).toContain('❌ Fail AA Normal');
    expect(html).toContain('❌ Fail AAA Normal');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
