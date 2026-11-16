import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditTargetSize } from './helpers/stem_wcag_browser_checks.js';

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

const physicsBase = {
  angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false,
  showLearn: false, showFlightData: false, showEnergy: false, showVectors: false,
  challengeTier: 0, challengeActive: false, launchCount: 0, targetsHit: 0,
  showFormulas: false, predictedRange: '', showOverlay: false, simSpeed: 1,
  showGraphs: false, targetMode: false, targetRound: 0, targetScore: 0,
  targetAttempts: 0, targetList: null, targetConstraint: null,
};

const waveBase = {
  frequency: 2, amplitude: 50, waveType: 'sine', waveMode: 'free', waveSpeed: 343,
  showSecond: false, amplitude2: 30, frequency2: 3, phase2: 0, harmonic: 1,
  damping: false, dampingAlpha: 0.5, paused: true, tourStep: -1,
};

const CASES = [
  { name: 'physics projectile lab', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsBase } },
  { name: 'physics target mission', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, targetMode: true, targetRound: 1, targetList: [{ x: 80, y: 0, radius: 10, destroyed: false, id: 0 }], targetConstraint: { type: 'fixedAngle', value: 45 } } } },
  ...['free', 'standing', 'ripple', 'reflection', 'longitudinal', 'doppler', 'spectrum'].map((mode) => ({
    name: `wave ${mode} mode`, file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: mode } },
  })),
  ...['conduction', 'convection', 'radiation'].map((mode) => ({
    name: `heat ${mode} mode`, file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode } }, overrides: { theme: 'light' },
  })),
  ...['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].map((tab) => ({
    name: `magnetism ${tab} tab`, file: 'stem_lab/stem_tool_magnetism.js', id: 'magnetism', state: { magnetism: { tab } },
  })),
  ...['home', 'reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization', 'quiz', 'mastery', 'inquiry'].map((mode) => ({
    name: `optics ${mode} mode`, file: 'stem_lab/stem_tool_optics.js', id: 'opticsLab', state: { opticsLab: { mode } },
  })),
  { name: 'physics high contrast', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsBase }, overrides: { isContrast: true } },
  { name: 'physics wave 2 tape moon atmosphere bridges', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'all', showTapeMeasure: true, gravity: 1.6, airResist: true, atmoPlanet: 'mars', windSpeed: 8 } } },
  { name: 'wave dark theme', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing' } }, overrides: { isDark: true } },
  { name: 'wave all workspace probe reflection missions', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'all', probeEnabled: true, waveMode: 'reflection', reflectivity: 0.5, medium2Ratio: 0.5 } } },
  { name: 'wave doppler mach cone controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', sourceSpeed: 1.3, probeEnabled: true } } },
  { name: 'wave standing fixedFree boundary', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', standingBoundary: 'fixedFree', harmonic: 2 } } },
  { name: 'wave ripple doubleSlit intensity screen', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'doubleSlit', slitWidth: 0.08, showIntensityScreen: true } } },
  { name: 'wave custom fourier builder controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', waveType: 'custom', harmonicWeights: [1, 0, 0.33, 0, 0.2, 0] } } },
  { name: 'wave reflection TIR controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', reflectivity: 0.4, medium2Ratio: 1.5, incidentAngleDeg: 55 } } },
  { name: 'wave packet dispersion controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5, probeEnabled: true } } },
  { name: 'wave longitudinal kundt standing controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 3, showDisplacementCurve: true } } },
  { name: 'wave doppler moving observer controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', sourceSpeed: 0.4, observerSpeed: 0.4 } } },
  { name: 'wave analyze multi-axis and sweep controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'analyze', dataStudioPlot: 'ampEnergy' } } },
  { name: 'wave ripple phased array controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleSources: 2, ripplePhaseDiff: 1.5708 } } },
  { name: 'wave reflection impedance AR controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: true, incidentAngleDeg: 0 } } },
  { name: 'wave probe lissajous controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, probeEnabled: true, probeScopeMode: 'lissajous' } } },
  { name: 'wave library discover inquiry controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'library', expSection: 'discoverWave' } } },
  { name: 'wave lambda caliper snap controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, showRuler: true, probeEnabled: true } } },
  { name: 'wave doppler flyby and analyze plot controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', workspaceTab: 'all', experimentLog: [{ n: 1, mode: 'doppler', waveType: 'sine', frequency: 2, amplitude: 50, waveSpeed: 343, wavelength: 171.5, period: 0.5, energy: 2500, sourceSpeed: 0.2, approachingFreq: 2.5 }, { n: 2, mode: 'doppler', waveType: 'sine', frequency: 2, amplitude: 50, waveSpeed: 343, wavelength: 171.5, period: 0.5, energy: 2500, sourceSpeed: 0.5, approachingFreq: 4.0 }] } } },
  { name: 'wave standing string mersenne bench controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: 180, stringDensityGm: 2.5 } } },
  { name: 'wave ripple grating 5 slits controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 5, ripplePhaseDiff: 0.7854, showIntensityScreen: true } } },
  { name: 'wave spectrum harmonic filter bench controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', waveType: 'sawtooth', spectrumFilter: 'lowpass', filterCutoffHarmonic: 3 } } },
  { name: 'wave free pulse collision and snapshot tray controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'collide', collidePolarity: 'same', savedSnapshots: [{ id: 's1', label: '[free] f=2Hz, A=50, v=343m/s', timestamp: 1000, statePatch: { waveMode: 'free', frequency: 2, amplitude: 50, waveSpeed: 343 } }] } } },
  { name: 'wave reflection fresnel brewster controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 'p', medium2Ratio: 0.6, incidentAngleDeg: 59 } } },
  { name: 'wave doppler relativistic spectrograph controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, frequency: 4 } } },
  { name: 'wave spectrum pluck sculptor controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', waveType: 'custom', pluckPosition: 0.5, harmonicWeights: [1, 0, 0.11, 0, 0.04, 0] } } },
  { name: 'wave longitudinal thermal air speed controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', airTempCoupled: true, airTempC: 30, harmonic: 2 } } },
  { name: 'wave standing resonator bode controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', harmonic: 2, resonatorDriven: true, driveFreqRatio: 2.0, resonatorQ: 25 } } },
  { name: 'wave reflection ftir tunneling controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, medium2Ratio: 1.5, incidentAngleDeg: 55, ftirEnabled: true, ftirGapLambda: 0.25 } } },
  { name: 'wave free ocean depth and damping controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'packet', oceanDepthCoupled: true, waterDepthRatio: 0.18, damping: true, dampingAlpha: 0.6 } } },
  { name: 'wave free consonance beat envelope controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, intervalLock: '3:2', showBeatEnvelope: true } } },
  { name: 'wave longitudinal distance attenuation controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: 8, spreadingLaw: 'spherical' } } },
  { name: 'wave ripple nodal hyperbola controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'doubleSlit', showNodalLines: true, showIntensityScreen: true } } },
  { name: 'wave spectrum nyquist adc controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', digitalSampling: true, sampleRateRatio: 1.25, adcBitDepth: 4 } } },
  { name: 'wave standing traveling decomposition controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', showTravelingComponents: true, harmonic: 2 } } },
  { name: 'wave doppler off-axis controls', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.75, dopplerOffsetAngleDeg: 60 } } },
  { name: 'heat dark theme', file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode: 'conduction' } }, overrides: { theme: 'dark' } },
];

function normalizedOverrides(testCase) {
  const requested = testCase.overrides || {};
  const theme = requested.isContrast || requested.theme === 'contrast'
    ? 'contrast'
    : (requested.isDark || requested.theme === 'dark' ? 'dark' : 'light');
  return { ...requested, theme, isDark: theme === 'dark', isContrast: theme === 'contrast' };
}

function themeClass(testCase) {
  const theme = normalizedOverrides(testCase).theme;
  return theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'theme-dark' : 'theme-default');
}

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  return prepareStemBrowserRender(renderTool(testCase.id, testCase.state, normalizedOverrides(testCase)));
}

describe('Physical science tools WCAG 2.2 target-size regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' has conforming pointer target size or spacing', async () => {
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
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const targetSize = await auditTargetSize(page);
      expect.soft(targetSize.failures, JSON.stringify(targetSize, null, 2)).toEqual([]);
      await page.close();
    }, 20000);
  }
});
