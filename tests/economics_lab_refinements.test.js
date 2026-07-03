import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_economicslab.js';
const TOOL_ID = 'economicsLab';
const TABS = ['supplyDemand', 'personalFinance', 'stockMarket', 'entrepreneur', 'macro', 'inquiry'];

function loadEconomicsLab() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderEconomicsLab(state) {
  loadEconomicsLab();
  return renderTool(TOOL_ID, state || {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Economics Lab refinements', () => {
  it('keeps its theme-responsive shell and canvas summary contract', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('allo-economicslab-refine-css');
    expect(source).toContain('--allo-stem-canvas');
    expect(source).toContain('--allo-stem-text');
    expect(source).toContain('--allo-stem-border');
    expect(source).toContain('.theme-dark .economicslab-tool-shell');
    expect(source).toContain('.theme-contrast .economicslab-tool-shell');
    expect(source).toContain('.economicslab-canvas-summary');
    expect(source).toContain('.economicslab-reference-shelf');
    expect(source).toContain("key: 'policy-bar-' + key");
    expect(source).toContain("bar('gdp'");
  });

  it('renders semantic topic tabs and a selected tab panel', () => {
    const html = renderEconomicsLab({ econTab: 'personalFinance' });

    expect(html).toContain('data-economicslab-tool="true"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Economics Lab topics"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="economicslab-panel-personalFinance"');
    expect(html).toContain('data-economicslab-topic-card="true"');
    expect(html).toContain('role="tabpanel"');
  });

  it('gives every economics topic canvas a text equivalent and teacher prompt', () => {
    for (const tab of TABS) {
      const html = renderEconomicsLab({ econTab: tab });

      expect(html).toContain('data-economicslab-canvas-shell="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-describedby="economicslab-canvas-summary"');
      expect(html).toContain('data-economicslab-canvas-summary="true"');
      expect(html).toContain('Canvas summary');
      expect(html).toContain('data-economicslab-teacher-prompt="true"');
      expect(html).toContain('Teacher move');
    }
  });

  it('keeps optional reference material behind a compact shelf by default', () => {
    const defaultHtml = renderEconomicsLab({});

    expect(defaultHtml).toContain('data-economicslab-reference-shelf="true"');
    expect(defaultHtml).toContain('Reference tools');
    expect(defaultHtml).toContain('Optional support');
    expect(defaultHtml).toContain('Challenge');
    expect(defaultHtml).toContain('Quick ref');
    expect(defaultHtml).not.toContain('Economics Scenarios');
    expect(defaultHtml).not.toContain('Economic History Timeline');
    expect(defaultHtml).not.toContain('Quick Reference Cards');

    const openHtml = renderEconomicsLab({
      showScenarioChallenge: true,
      showEconQuickRef: true,
    });

    expect(openHtml).toContain('Open: 2');
    expect(openHtml).toContain('aria-pressed="true"');
    expect(openHtml).toContain('Economics Scenarios');
    expect(openHtml).toContain('Quick Reference Cards');
  });

  it('does not warn about missing keys in policy inquiry SVG bars', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderEconomicsLab({ econTab: 'inquiry' });

    const messages = err.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });
});
