import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import {
  React,
  ReactDOMServer,
  extractReactSsrStyles,
  loadTool,
  prepareStemBrowserRender,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');

if (!(window.AlloModules && window.AlloModules.AppStyles)) {
  Function('window', appStylesSource)(window);
}

const appStylesMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
);
const runtimeAppCssSheets = extractReactSsrStyles(appStylesMarkup).cssSheets;
const captureVisuals = process.env.MOLECULE_VISUAL_CAPTURE === '1';
const captureDirectory = path.join(root, 'test-results', 'molecule-lab-visual');

const stemThemeCss = `
  :root, .theme-default {
    --allo-stem-canvas: #ffffff;
    --allo-stem-panel: #f8fafc;
    --allo-stem-deeper: #e2e8f0;
    --allo-stem-text: #0f172a;
    --allo-stem-text-soft: #475569;
    --allo-stem-border: #cbd5e1;
    --allo-stem-button-bg: #f1f5f9;
    --allo-stem-button-text: #0f172a;
    --allo-stem-button-border: #cbd5e1;
  }
  body { margin: 0; background: #eef2f7; }
  #tool-root {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 20px;
    background: var(--allo-stem-canvas);
    color: var(--allo-stem-text);
  }
  @media (max-width: 480px) {
    #tool-root { padding: 10px; }
  }
`;

function renderMolecule(state) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
  return prepareStemBrowserRender(renderTool('molecule', { molecule: state }));
}

async function createPage(browser, state, viewport) {
  const rendered = renderMolecule(state);
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent(
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body><main id="tool-root" class="theme-default">' + rendered.html + '</main></body></html>',
    { waitUntil: 'domcontentloaded' },
  );
  await page.addStyleTag({ content: appCss });
  for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: stemThemeCss });
  for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.cancel();
  });
  return page;
}

async function assertNoHorizontalOverflow(page) {
  const reflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
}

async function capture(page, name) {
  if (!captureVisuals) return;
  fs.mkdirSync(captureDirectory, { recursive: true });
  await page.screenshot({ path: path.join(captureDirectory, name), fullPage: true });
}

describe('Molecule Lab visual layout regression', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  it('keeps the complete periodic explorer composed at desktop width', async () => {
    const page = await createPage(browser, {
      moleculeMode: 'table',
      tutorialDismissed: true,
      selectedElement: { name: 'Oganesson', s: 'Og', n: 118, cat: 'noble', c: '#c084fc' },
      elementDetailsOpen: true,
      elementCompareOpen: true,
      elementCompareA: 'Na',
      elementCompareB: 'Cl',
      elScore: 3,
      elAttempts: 4,
      elStreak: 2,
      elQuiz: {
        text: 'Which periodic-table block contains Oganesson (Og)?',
        answer: 'p-block',
        chosen: 'p-block',
        answered: true,
        explanation: 'Oganesson is in the p-block (Group 18).',
      },
    }, { width: 1280, height: 1000 });

    await assertNoHorizontalOverflow(page);
    expect(await page.locator('body').textContent()).not.toContain('stem.periodic.');
    expect(await page.locator('[data-element-explorer-controls="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-comparison="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-workspace="true"]').count()).toBe(1);
    expect(await page.locator('[data-selected-element-card="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-details-panel="true"]').count()).toBe(1);
    expect(await page.locator('[data-stable-bohr-panel="true"]').count()).toBe(1);
    expect(await page.locator('[data-molecule-periodic-grid="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-quiz-catalog="118"]').count()).toBe(1);
    expect(await page.locator('[data-reference-library-launcher="true"]').count()).toBe(1);
    expect(await page.locator('[data-reference-library-browser="true"]').count()).toBe(0);
    expect(await page.locator('[data-periodic-map-viewport-controls="true"]').evaluate((element) => getComputedStyle(element).display)).toBe('none');
    expect(await page.locator('[data-molecule-command-state="compact"]').count()).toBe(1);
    expect(await page.locator('[data-molecule-mode-grid="true"]').count()).toBe(0);
    const desktopCommandBox = await page.locator('[data-molecule-command="true"]').boundingBox();
    expect(desktopCommandBox.height).toBeLessThanOrEqual(180);
    const desktopWorkspaceColumns = await page.locator('[data-element-workspace="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(desktopWorkspaceColumns).toBe(2);
    const mapPrecedesInspector = await page.locator('[data-element-workspace="true"]').evaluate((workspace) => {
      const map = workspace.querySelector('[data-molecule-periodic-grid="true"]');
      const inspector = workspace.querySelector('[data-selected-element-card="true"]');
      return Boolean(map && inspector && (map.compareDocumentPosition(inspector) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(mapPrecedesInspector).toBe(true);
    const desktopMapBox = await page.locator('[data-molecule-periodic-grid="true"]').boundingBox();
    const desktopInspectorBox = await page.locator('[data-selected-element-card="true"]').boundingBox();
    expect(desktopMapBox.x).toBeLessThan(desktopInspectorBox.x);
    expect(desktopMapBox.width).toBeGreaterThan(desktopInspectorBox.width);
    expect(desktopInspectorBox.height).toBeLessThanOrEqual(761);
    expect(await page.locator('[data-selected-element-card="true"]').evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
    await capture(page, 'periodic-explorer-desktop.png');
    await page.close();
  }, 30000);

  it('stacks the selected element and practice areas without mobile overflow', async () => {
    const page = await createPage(browser, {
      moleculeMode: 'table',
      tutorialDismissed: true,
      selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
      elQuizScope: 'filtered',
      elementCategory: 'nonmetal',
      elScore: 2,
      elAttempts: 3,
      elStreak: 1,
    }, { width: 390, height: 844 });

    await assertNoHorizontalOverflow(page);
    expect(await page.locator('[data-molecule-command-state="compact"]').count()).toBe(1);
    expect(await page.locator('[data-molecule-mode-grid="true"]').count()).toBe(0);
    const mobileCommandBox = await page.locator('[data-molecule-command="true"]').boundingBox();
    expect(mobileCommandBox.height).toBeLessThanOrEqual(240);
    expect(await page.locator('[data-element-explorer-controls="true"] label').count()).toBe(4);
    expect(await page.locator('[data-matching-elements-tray="true"]').count()).toBe(1);
    expect(await page.locator('[data-matching-element]').count()).toBeGreaterThan(0);
    expect(await page.locator('[data-matching-element="C"]').textContent()).toContain('Carbon');
    expect(await page.locator('[data-selected-element-card="true"]').textContent()).toContain('Carbon forms the backbone of all known life');
    expect(await page.locator('body').textContent()).not.toContain('stem.periodic.');
    expect(await page.locator('[data-molecule-periodic-grid="true"] [aria-label="Scrollable periodic table map"]').count()).toBe(1);
    expect(await page.locator('[data-periodic-map-viewport-controls="true"]').count()).toBe(1);
    expect(await page.locator('[data-periodic-map-viewport-controls="true"]').evaluate((element) => getComputedStyle(element).display)).toBe('flex');
    expect(await page.locator('[data-periodic-map-visible-groups="1-9"]').count()).toBe(1);
    expect(await page.locator('[data-periodic-map-move="earlier"]').isDisabled()).toBe(true);
    expect(await page.locator('[data-periodic-map-move="later"]').isDisabled()).toBe(false);
    expect(await page.locator('[data-periodic-map-overflow-cue="right"]').count()).toBe(1);
    expect(await page.locator('[data-periodic-map-overflow-cue="left"]').count()).toBe(0);
    expect(await page.locator('[data-element-details-panel="true"]').count()).toBe(0);
    expect(await page.locator('[data-stable-bohr-panel="true"]').count()).toBe(0);
    expect(await page.locator('[data-reference-library-launcher="true"]').count()).toBe(1);
    expect(await page.locator('[data-reference-library-browser="true"]').count()).toBe(0);
    const selected = page.locator('[aria-labelledby="molecule-selected-element-title"]');
    expect(await selected.count()).toBe(1);
    const selectedBox = await selected.boundingBox();
    expect(selectedBox.width).toBeLessThanOrEqual(370);
    const mobileWorkspaceColumns = await page.locator('[data-element-workspace="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(mobileWorkspaceColumns).toBe(1);
    const mobileMapBox = await page.locator('[data-molecule-periodic-grid="true"]').boundingBox();
    expect(mobileMapBox.y).toBeLessThan(selectedBox.y);
    await capture(page, 'periodic-explorer-mobile.png');
    await page.close();
  }, 30000);

  it('keeps the optional mode guide stable at desktop and mobile widths', async () => {
    const state = {
      moleculeMode: 'viewer',
      tutorialDismissed: true,
      modeDeckOpen: true,
    };
    const desktopPage = await createPage(browser, state, { width: 1280, height: 1000 });
    const mobilePage = await createPage(browser, state, { width: 390, height: 844 });

    await assertNoHorizontalOverflow(desktopPage);
    await assertNoHorizontalOverflow(mobilePage);
    expect(await desktopPage.locator('[data-molecule-route]').count()).toBe(6);
    expect(await mobilePage.locator('[data-molecule-route]').count()).toBe(6);
    const desktopModeColumns = await desktopPage.locator('[data-molecule-mode-grid="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    const mobileModeColumns = await mobilePage.locator('[data-molecule-mode-grid="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(desktopModeColumns).toBe(6);
    expect(mobileModeColumns).toBe(2);

    await capture(desktopPage, 'mode-guide-desktop.png');
    await capture(mobilePage, 'mode-guide-mobile.png');

    await desktopPage.close();
    await mobilePage.close();
  }, 30000);

  it('keeps element coordinates unchanged when filters hide surrounding tiles', async () => {
    const unfilteredPage = await createPage(browser, {
      moleculeMode: 'table',
      tutorialDismissed: true,
    }, { width: 390, height: 844 });
    const filteredPage = await createPage(browser, {
      moleculeMode: 'table',
      tutorialDismissed: true,
      elementCategory: 'nonmetal',
    }, { width: 390, height: 844 });

    async function elementMapPosition(page, symbol) {
      return page.locator('[data-element-symbol="' + symbol + '"]').evaluate((tile) => {
        const scroller = tile.closest('[data-molecule-periodic-scroll="true"]');
        const tileRect = tile.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        return {
          x: tileRect.left - scrollerRect.left,
          y: tileRect.top - scrollerRect.top,
          width: tileRect.width,
          height: tileRect.height,
          scrollWidth: scroller.scrollWidth,
        };
      });
    }

    const unfilteredCarbon = await elementMapPosition(unfilteredPage, 'C');
    const filteredCarbon = await elementMapPosition(filteredPage, 'C');
    expect(filteredCarbon.x).toBeCloseTo(unfilteredCarbon.x, 2);
    expect(filteredCarbon.y).toBeCloseTo(unfilteredCarbon.y, 2);
    expect(filteredCarbon.width).toBeCloseTo(unfilteredCarbon.width, 2);
    expect(filteredCarbon.height).toBeCloseTo(unfilteredCarbon.height, 2);
    expect(filteredCarbon.scrollWidth).toBe(unfilteredCarbon.scrollWidth);

    const navigationResult = await unfilteredPage.locator('[data-molecule-periodic-scroll="true"]').evaluate((scroller) => {
      const track = scroller.querySelector('[data-periodic-map-track="true"]');
      const lastGroup = scroller.querySelector('[data-periodic-group="18"]');
      const carbon = scroller.querySelector('[data-element-symbol="C"]');
      const initialTrackWidth = track.scrollWidth;
      const initialCarbonOffset = carbon.offsetLeft;
      const initialScrollerRect = scroller.getBoundingClientRect();
      const initialLastGroupRect = lastGroup.getBoundingClientRect();
      const initialEndVisible = initialLastGroupRect.left < initialScrollerRect.right && initialLastGroupRect.right > initialScrollerRect.left;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = maxScroll;
      const finalScrollerRect = scroller.getBoundingClientRect();
      const finalLastGroupRect = lastGroup.getBoundingClientRect();
      return {
        maxScroll,
        initialEndVisible,
        initialTrackWidth,
        initialCarbonOffset,
        finalEndVisible: finalLastGroupRect.left < finalScrollerRect.right && finalLastGroupRect.right > finalScrollerRect.left,
        finalTrackWidth: track.scrollWidth,
        finalCarbonOffset: carbon.offsetLeft,
      };
    });
    expect(navigationResult.maxScroll).toBeGreaterThan(0);
    expect(navigationResult.initialEndVisible).toBe(false);
    expect(navigationResult.finalEndVisible).toBe(true);
    expect(navigationResult.finalTrackWidth).toBe(navigationResult.initialTrackWidth);
    expect(navigationResult.finalCarbonOffset).toBe(navigationResult.initialCarbonOffset);

    await unfilteredPage.close();
    await filteredPage.close();
  }, 30000);

  it('keeps one reference domain compact and horizontally contained on mobile', async () => {
    const page = await createPage(browser, {
      moleculeMode: 'table',
      tutorialDismissed: true,
      referenceLibraryOpen: true,
      referenceLibraryGroup: 'applications',
    }, { width: 390, height: 844 });

    await assertNoHorizontalOverflow(page);
    const browserPanel = page.locator('[data-reference-library-browser="true"]');
    expect(await browserPanel.count()).toBe(1);
    expect(await browserPanel.getAttribute('data-reference-library-count')).toBe('53');
    expect(await browserPanel.locator('[data-reference-group]').count()).toBe(7);
    expect(await browserPanel.locator('[data-reference-domain-select="true"]').count()).toBe(1);
    expect(await browserPanel.locator('[data-reference-topic]').count()).toBe(12);
    const browserBox = await browserPanel.boundingBox();
    expect(browserBox.width).toBeLessThanOrEqual(370);
    expect(browserBox.height).toBeLessThan(650);
    await capture(page, 'reference-library-mobile.png');
    await page.close();
  }, 30000);
});
