import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const PUBLIC_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';

describe('Water Cycle Journey pathway explorer', () => {
  it('derives route receipts only after route shares are available', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const routeSharesIndex = source.indexOf('var wcRouteShares = estimateWcRouteShares');
    const routeReceiptIndex = source.indexOf('var journeyChosenRoute = journeyChosenRouteKey');

    expect(routeSharesIndex).toBeGreaterThan(-1);
    expect(routeReceiptIndex).toBeGreaterThan(routeSharesIndex);
    expect(source).toContain('// Keep route receipts and the pathway ledger downstream of the derived shares.');
  });

  it('shows pathway coverage with accessible progress and route detail', () => {
    [SOURCE_PATH, PUBLIC_PATH].forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var journeyPathDefinitions = [");
      expect(source).toContain('journeyPathDriverByKey.runoff');
      expect(source).toContain('journeyPathDriverByKey.infiltrate');
      expect(source).toContain('journeyPathDriverByKey.plant');
      expect(source).toContain('+ ". " + path.detail');
      expect(source).toContain("var journeyPathCoverageLabel = journeyPathCoverageCount === journeyPathDefinitions.length");
      expect(source).toContain('className: "wc-route-ledger"');
      expect(source).toContain('"aria-label": "Journey pathway coverage"');
      expect(source).toContain('"aria-valuetext": journeyPathCoverageLabel');
      expect(source).toContain('var isNext = !!journeyPathNext && journeyPathNext.key === path.key;');
      expect(source).toContain('className: "wc-route-ledger-item" + (explored ? " is-explored" : "") + (current ? " is-current" : "") + (isNext ? " is-next" : "")');
      expect(source).toContain('Suggested next pathway.');
      expect(source).toContain('Next up');
      expect(source).toContain('.wc-route-ledger-item.is-next{');
      expect(source).toContain("Try ' + journeyPathNext.label + ' next to compare residence time and return route.");
      expect(source).toContain('@media(forced-colors:active){.wc-route-ledger');
    });
  });

  it('keeps the source and public Water Cycle mirrors identical', () => {
    expect(readFileSync(SOURCE_PATH, 'utf8')).toBe(readFileSync(PUBLIC_PATH, 'utf8'));
  });
});
