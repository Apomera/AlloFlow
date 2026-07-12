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
      expect(html).toContain('data-economicslab-canvas-summary="true"');
      expect(html).toContain('Canvas summary');
      expect(html).toContain('data-economicslab-teacher-prompt="true"');
      expect(html).toContain('Teacher move');

      if (tab === 'inquiry') {
        // The inquiry tab uses its own SVG widget — no empty canvas above it.
        expect(html).not.toContain('<canvas');
      } else {
        expect(html).toContain('role="img"');
        expect(html).toContain('aria-describedby="economicslab-canvas-summary"');
      }
    }
  });

  it('ships a working National Economy policy cockpit (was a dead-end tab)', () => {
    const html = renderEconomicsLab({ econTab: 'macro' });

    expect(html).toContain('data-economicslab-macro-controls="true"');
    expect(html).toContain('Advance One Year');
    expect(html).toContain('Central Bank');
    expect(html).toContain('Fiscal Policy');
    expect(html).toContain('Reset Economy');
    // Scientific-integrity framing: the model is labeled a contested heuristic.
    expect(html).toContain('Toy model');

    const reportHtml = renderEconomicsLab({
      econTab: 'macro',
      macroReport: { year: 2025, shock: null, lines: ['Okun test line'] },
    });
    expect(reportHtml).toContain('in Review');
    expect(reportHtml).toContain('Okun test line');
  });

  it('drives the Business Sim canvas summary from live enBiz state, not the legacy lemonade vars', () => {
    const emptyHtml = renderEconomicsLab({ econTab: 'entrepreneur' });
    expect(emptyHtml).toContain('Launch a business below');

    const bizHtml = renderEconomicsLab({
      econTab: 'entrepreneur',
      enBusiness: { businessName: 'Test Tacos', unitName: 'taco', suggestedPrice: 8, unitCost: 3, dailyFixedCosts: 40 },
      enBizDay: 7,
      enBizCash: 1234,
    });
    expect(bizHtml).toContain('Test Tacos');
    expect(bizHtml).toContain('day');

    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).not.toContain('LEMONADE');
  });

  it('warns when life-sim or business cash goes negative', () => {
    const pfHtml = renderEconomicsLab({ econTab: 'personalFinance', pfCash: -500 });
    expect(pfHtml).toContain('cash is negative');

    const bizHtml = renderEconomicsLab({
      econTab: 'entrepreneur',
      enBusiness: { businessName: 'Test Tacos', unitName: 'taco', suggestedPrice: 8, unitCost: 3, dailyFixedCosts: 40 },
      enBizCash: -50,
    });
    expect(bizHtml).toContain('losing money');
  });

  it('uses roving tabindex + keyboard handlers on the topic tablist', () => {
    const html = renderEconomicsLab({ econTab: 'personalFinance' });

    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');

    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain('econSelectTab(next, true)');
  });

  it('keeps the contrast + money-flow fixes pinned in source', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    // Contrast: slate-200 text on light backgrounds was unreadable.
    expect(source).not.toContain('text-slate-200');
    // Life sim: single computed cash write + tracked investment portfolio.
    expect(source).toContain("upd('pfCash', finalCash)");
    expect(source).toContain("upd('pfInvested'");
    // Net worth counts equity + investments.
    expect(source).toContain('var pfNetWorth');
  });

  it('offers macro policy goals and grades them in the year report', () => {
    const html = renderEconomicsLab({ econTab: 'macro' });
    expect(html).toContain('Policy goal');
    expect(html).toContain('Cool inflation');

    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain('Goal check');
    expect(source).toContain("upd('macroGoal'");
  });

  it('benchmarks trading against a buy-and-hold index', () => {
    const html = renderEconomicsLab({
      econTab: 'stockMarket',
      smDay: 3,
      smCash: 5000,
      smPortfolio: {},
      smBaseline: { AAA: 100 },
      smCompanies: [{ name: 'Alpha', ticker: 'AAA', price: 110, history: [100, 105, 110], sector: 'Tech', color: '#3b82f6' }],
    });

    expect(html).toContain('Index (hold)');
    expect(html).toContain('+10.0%');
    // Portfolio (-50%) badly trails the index (+10%) → the index-fund lesson shows.
    expect(html).toContain('buy-and-hold index is beating your trading');
  });

  it('teaches debt cost and emergency-fund runway in the life sim', () => {
    const html = renderEconomicsLab({ econTab: 'personalFinance', pfDebt: 5000 });

    expect(html).toContain('Debt +10%/yr APR');
    expect(html).toContain('Emergency fund');

    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain('var debtInterest');
  });

  it('warns when a business prices below unit cost', () => {
    const html = renderEconomicsLab({
      econTab: 'entrepreneur',
      enBusiness: { businessName: 'Test Tacos', unitName: 'taco', suggestedPrice: 8, unitCost: 5, dailyFixedCosts: 40 },
      enBizPrice: 3,
    });

    expect(html).toContain('below unit cost');
  });

  it('lets students copy the glossary and shows a real tax wedge with deadweight loss', () => {
    const html = renderEconomicsLab({
      showGlossary: true,
      econGlossary: [{ tab: 'S&D', concept: 'Elasticity', explanation: 'test' }],
    });
    expect(html).toContain('Copy');

    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain('Buyers pay $');
    expect(source).toContain('Sellers get $');
    expect(source).toContain("'DWL'");
  });

  it('counts investments and home equity toward net-worth achievements', () => {
    const html = renderEconomicsLab({ econTab: 'personalFinance', pfCash: 500000, pfEquity: 300000, pfInvested: 300000 });

    expect(html).toContain('achievements');
    expect(html).toContain('Net Worth: $1,100,000');
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
