import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
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

// These variables are normally injected by app_styles_module.js at runtime,
// rather than emitted into the compiled Tailwind stylesheet used by this
// isolated browser harness. Mirror the production theme contract so tools
// which consume --allo-stem-* variables are audited against their real colors.
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
  .theme-dark {
    --allo-stem-canvas: #0f172a;
    --allo-stem-panel: #1e293b;
    --allo-stem-deeper: #020617;
    --allo-stem-text: #e2e8f0;
    --allo-stem-text-soft: #94a3b8;
    --allo-stem-border: #334155;
    --allo-stem-button-bg: #1e293b;
    --allo-stem-button-text: #e2e8f0;
    --allo-stem-button-border: #334155;
  }
  .theme-contrast {
    --allo-stem-canvas: #000000;
    --allo-stem-panel: #000000;
    --allo-stem-deeper: #000000;
    --allo-stem-text: #ffff00;
    --allo-stem-text-soft: #ffff00;
    --allo-stem-border: #ffff00;
    --allo-stem-button-bg: #000000;
    --allo-stem-button-text: #00ff00;
    --allo-stem-button-border: #00ff00;
  }
  #tool-root {
    background: var(--allo-stem-canvas);
    color: var(--allo-stem-text);
    min-height: 100vh;
  }
`;

const CASES = [
  { name: 'AlphaFold Explorer overview', file: 'stem_lab/stem_tool_alphafold.js', id: 'alphaFoldExplorer', state: { alphaFoldExplorer: {} } },
  { name: 'anatomy lab overview', file: 'stem_lab/stem_tool_anatomy.js', id: 'anatomy', state: { anatomy: {} } },
  { name: 'beehive overview', file: 'stem_lab/stem_tool_beehive.js', id: 'beehive', state: { beehive: {} } },
  { name: 'cell explorer overview', file: 'stem_lab/stem_tool_cell.js', id: 'cell', state: { cell: {} } },
  { name: 'cellular lab overview', file: 'stem_lab/stem_tool_cellular.js', id: 'cellularLab', state: { cellularLab: {} } },
  { name: 'cephalopod lab overview', file: 'stem_lab/stem_tool_cephalopodlab.js', id: 'cephalopodLab', state: { cephalopodLab: {} } },
  { name: 'decomposer lab overview', file: 'stem_lab/stem_tool_decomposer.js', id: 'decomposer', state: { decomposer: {} } },
  { name: 'DNA lab overview', file: 'stem_lab/stem_tool_dna.js', id: 'dnaLab', state: { dnaLab: {} } },
  { name: 'ecosystem overview', file: 'stem_lab/stem_tool_ecosystem.js', id: 'ecosystem', state: { ecosystem: {} } },
  { name: 'epidemic simulator overview', file: 'stem_lab/stem_tool_epidemic.js', id: 'epidemicSim', state: { epidemicSim: {} } },
  { name: 'evolution lab overview', file: 'stem_lab/stem_tool_evolab.js', id: 'evoLab', state: { evoLab: {} } },
  {
    name: 'evolution Capstone evidence notebook',
    file: 'stem_lab/stem_tool_evolab.js',
    id: 'evoLab',
    state: {
      evoLab: {
        view: 'capstone',
        evoCapstone: {
          step: 2,
          scenarioId: 'island',
          scenarioTitle: 'The Stranded Island Population',
          predictions: [
            'Allele frequencies will drift in this small population.',
            'Repeated lineages will finish at different frequencies.',
            'The founder sample begins with limited diversity.'
          ],
          reflections: ['', '', ''],
          notebook: {
            baseline: 'Generation 0: N = 10 and p(A) = 0.500 in five lineages.',
            settings: 'Five independent lineages for 100 generations.',
            outcome: 'Final p(A) ranged from 0.000 to 1.000 across the lineages.',
            claim: 'Across repeated runs, mean final p(A) varied because genetic drift is stochastic.',
            surprise: 'Identical starting conditions produced different endpoints.'
          },
          trialPlan: { version: 1, strategy: 'repeat', factor: '', factorLabel: '', levelA: '', levelB: '', targetRuns: 2 },
          runs: [
            {
              id: 'run-1',
              moduleId: 'geneticDrift',
              moduleLabel: 'Genetic Drift Simulator',
              baseline: 'Generation 0: N = 10 and p(A) = 0.500 in five lineages.',
              settings: 'Five independent lineages for 100 generations.',
              outcome: 'Final p(A): 0.000, 0.250, 0.500, 0.750, 1.000.',
              comparison: { designKey: 'N=10|generations=100', designLabel: 'N = 10 for 100 generations', primaryLabel: 'mean absolute displacement from p(A) = 0.500', primaryValue: 0.2, precision: 3, unit: '', factors: [{ id: 'populationSize', label: 'Population size', value: 10 }, { id: 'generations', label: 'Generations', value: 100 }] },
              metrics: [
                { label: 'Population N', value: '10' },
                { label: 'Mean final p(A)', value: '0.400' }
              ]
            },
            {
              id: 'run-2',
              moduleId: 'geneticDrift',
              moduleLabel: 'Genetic Drift Simulator',
              baseline: 'Generation 0: N = 10 and p(A) = 0.500 in five lineages.',
              settings: 'Five independent lineages for 100 generations.',
              outcome: 'Final p(A): 0.100, 0.300, 0.500, 0.700, 0.900.',
              comparison: { designKey: 'N=10|generations=100', designLabel: 'N = 10 for 100 generations', primaryLabel: 'mean absolute displacement from p(A) = 0.500', primaryValue: 0.4, precision: 3, unit: '', factors: [{ id: 'populationSize', label: 'Population size', value: 10 }, { id: 'generations', label: 'Generations', value: 100 }] },
              metrics: [
                { label: 'Population N', value: '10' },
                { label: 'Mean final p(A)', value: '0.600' }
              ]
            }
          ],
          nextRunId: 3,
          evidenceVerdict: ''
        }
      }
    }
  },
  {
    name: 'evolution Capstone evidence evaluation',
    file: 'stem_lab/stem_tool_evolab.js',
    id: 'evoLab',
    state: {
      evoLab: {
        view: 'capstone',
        evoCapstone: {
          step: 3,
          scenarioId: 'island',
          scenarioTitle: 'The Stranded Island Population',
          predictions: [
            'Allele frequencies will drift toward fixation in several lineages.',
            'Repeated lineages will finish at different frequencies.',
            'The founder sample begins with limited diversity.'
          ],
          reflections: ['', '', ''],
          notebook: {
            baseline: 'N = 10 and p = 0.50 at generation 0.',
            settings: 'Five lineages ran for 100 generations.',
            outcome: 'Three lineages fixed while two retained both alleles.',
            surprise: 'Identical starting conditions produced different endpoints.'
          },
          evidenceVerdict: ''
        }
      }
    }
  },
  {
    name: 'evolution linked Capstone field mission',
    file: 'stem_lab/stem_tool_evolab.js',
    id: 'evoLab',
    state: {
      evoLab: {
        view: 'geneticDrift',
        evoCapstone: {
          step: 2,
          scenarioId: 'island',
          scenarioTitle: 'The Stranded Island Population',
          module: 'geneticDrift',
          moduleLabel: 'Genetic Drift Simulator',
          moduleHint: 'Use N=10 for 100 generations and compare several lineages.',
          dataMission: [
            'Confirm N = 10 and a starting allele frequency of 0.50.',
            'Run several lineages for the same number of generations.',
            'Record the range of final frequencies and how many lineages reached fixation or loss.'
          ],
          predictions: ['', '', ''],
          reflections: ['', '', ''],
          notebook: { baseline: '', settings: '', outcome: '', surprise: '' },
          evidenceVerdict: ''
        }
      }
    }
  },
  { name: 'microbiology overview', file: 'stem_lab/stem_tool_microbiology.js', id: 'microbiology', state: { microbiology: {} } },
  { name: 'migration lab overview', file: 'stem_lab/stem_tool_migration.js', id: 'migration', state: { migration: {} } },
  { name: 'organism identification overview', file: 'stem_lab/stem_tool_organismid.js', id: 'organismId', state: { organismId: {} } },
  { name: 'Punnett lab overview', file: 'stem_lab/stem_tool_punnett.js', id: 'punnett', state: { punnett: {} } },
  { name: 'stewardship hub overview', file: 'stem_lab/stem_tool_stewardship.js', id: 'stewardshipHub', state: { stewardshipHub: {} } },
  { name: 'tree lab overview', file: 'stem_lab/stem_tool_treelab.js', id: 'treeLab', state: { treeLab: {} } },
  { name: 'anatomy lab dark theme', file: 'stem_lab/stem_tool_anatomy.js', id: 'anatomy', state: { anatomy: {} }, overrides: { isDark: true } },
];

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  return prepareStemBrowserRender(renderTool(testCase.id, testCase.state, normalizedOverrides(testCase)));
}

function compactViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      contrast: node.any && node.any[0] && node.any[0].data
        ? {
            foreground: node.any[0].data.fgColor,
            background: node.any[0].data.bgColor,
            ratio: node.any[0].data.contrastRatio,
            expected: node.any[0].data.expectedContrastRatio,
          }
        : undefined,
    })),
  }));
}

function themeClass(testCase) {
  const theme = normalizedOverrides(testCase).theme;
  return theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'theme-dark' : 'theme-default');
}

function normalizedOverrides(testCase) {
  const requested = testCase.overrides || {};
  const theme = requested.isContrast || requested.theme === 'contrast'
    ? 'contrast'
    : (requested.isDark || requested.theme === 'dark' ? 'dark' : 'light');
  return { ...requested, theme, isDark: theme === 'dark', isContrast: theme === 'contrast' };
}

describe('Life-science tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, and text-spacing checks', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + rendered.html + '</main></body></html>',
        { waitUntil: 'domcontentloaded' },
      );
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const captureCase = process.env.ALLO_WCAG_CAPTURE_CASE;
      if (captureCase && testCase.name.toLowerCase().includes(captureCase.toLowerCase())) {
        const captureDirectory = path.resolve(root, process.env.ALLO_WCAG_CAPTURE_DIR || '.wcag-captures');
        const captureName = testCase.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
        fs.mkdirSync(captureDirectory, { recursive: true });
        await page.screenshot({
          path: path.join(captureDirectory, captureName + '.png'),
          fullPage: true,
        });
      }

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const describeElement = (element) => {
          const box = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          return {
            element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
              (typeof element.className === 'string' && element.className ? '.' + element.className.trim().replace(/\s+/g, '.') : ''),
            parent: element.parentElement ? element.parentElement.tagName.toLowerCase() +
              (element.parentElement.id ? '#' + element.parentElement.id : '') : null,
            html: element.outerHTML.slice(0, 280),
            left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
            scrollWidth: element.scrollWidth, display: styles.display,
            cssWidth: styles.width, minWidth: styles.minWidth, maxWidth: styles.maxWidth,
            overflowX: styles.overflowX, gridTemplateColumns: styles.gridTemplateColumns,
            flexWrap: styles.flexWrap,
          };
        };
        const offenders = scrollWidth > clientWidth
          ? [...document.querySelectorAll('#tool-root, #tool-root *')]
              .map(describeElement)
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        const layoutEdges = scrollWidth > clientWidth
          ? [...document.querySelectorAll('#tool-root, #tool-root *')]
              .map(describeElement)
              .filter((item) => item.right > clientWidth + 1 && item.right <= scrollWidth + 1)
              .sort((a, b) => b.width - a.width)
              .slice(0, 12)
          : [];
        return { scrollWidth, clientWidth, offenders, layoutEdges };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      expect.soft(compactViolations(audit.violations)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify({ offenders: reflow.offenders, layoutEdges: reflow.layoutEdges }, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 20000);
  }
});
