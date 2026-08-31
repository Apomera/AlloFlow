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
    expect(await page.locator('[data-element-explorer-controls="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-comparison="true"]').count()).toBe(1);
    expect(await page.locator('[data-selected-element-card="true"]').count()).toBe(1);
    expect(await page.locator('[data-stable-bohr-panel="true"]').count()).toBe(1);
    expect(await page.locator('[data-molecule-periodic-grid="true"]').count()).toBe(1);
    expect(await page.locator('[data-element-quiz-catalog="118"]').count()).toBe(1);
    const desktopModeColumns = await page.locator('[data-molecule-mode-grid="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(desktopModeColumns).toBe(6);
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
    const mobileModeColumns = await page.locator('[data-molecule-mode-grid="true"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(mobileModeColumns).toBe(2);
    expect(await page.locator('[data-element-explorer-controls="true"] label').count()).toBe(4);
    expect(await page.locator('[data-molecule-periodic-grid="true"] [aria-label="Scrollable periodic table map"]').count()).toBe(1);
    const selected = page.locator('[aria-labelledby="molecule-selected-element-title"]');
    expect(await selected.count()).toBe(1);
    const selectedBox = await selected.boundingBox();
    expect(selectedBox.width).toBeLessThanOrEqual(370);
    await capture(page, 'periodic-explorer-mobile.png');
    await page.close();
  }, 30000);
});
