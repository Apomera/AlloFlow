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
  ...['shape', 'science', 'traditions', 'kiln', 'performance', 'journal'].map((view) => ({
    name: 'wheel and fire ' + view + ' view', file: 'stem_lab/stem_tool_wheelandfire.js', id: 'wheelAndFire', state: { wheelAndFire: { view } },
  })),
  { name: 'physics high contrast', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsBase }, overrides: { isContrast: true } },
  { name: 'physics dark theme quiz', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'learn', quizActive: true, quizAngle: 45, quizVel: 25, quizGrav: 9.8, quizAnswer: 63.8, quizOptions: [45.0, 63.8, 72.1, 88.5], quizHint: 'Formula: R = v² sin(2θ) / g' } }, overrides: { isDark: true } },
  { name: 'physics dark theme analyze and drag profiles', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'analyze', showGraphs: true, dragProfileId: 'shuttlecock' } }, overrides: { isDark: true } },
  { name: 'physics obstacle and artillery duel missions', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'missions', obstacleMode: true, obstacleId: 'wall', obstacleFeedback: { type: 'miss', id: 'wall', msg: 'Blocked by barrier at x=50m' } } } },
  { name: 'physics wave 2 tape moon drag atmosphere bridges light', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'all', showTapeMeasure: true, gravity: 1.6, airResist: true, atmoPlanet: 'titan', windSpeed: -10, duelWins: 1 } } },
  { name: 'physics wave 2 tape moon drag atmosphere bridges dark', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, workspaceTab: 'all', showTapeMeasure: true, gravity: 1.6, airResist: true, atmoPlanet: 'titan', windSpeed: -10, duelWins: 1 } }, overrides: { isDark: true } },
  { name: 'wave dark theme', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing' } }, overrides: { isDark: true } },
  { name: 'wave all workspace probe reflection light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'all', probeEnabled: true, waveMode: 'reflection', reflectivity: 0.5, medium2Ratio: 0.5 } } },
  { name: 'wave all workspace probe doppler mach dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'all', probeEnabled: true, waveMode: 'doppler', sourceSpeed: 1.3 } }, overrides: { isDark: true } },
  { name: 'wave high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'all', probeEnabled: true, waveMode: 'ripple' } }, overrides: { isContrast: true } },
  { name: 'wave standing fixedFree dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', standingBoundary: 'fixedFree', harmonic: 2 } }, overrides: { isDark: true } },
  { name: 'wave ripple doubleSlit intensity light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'doubleSlit', slitWidth: 0.08, showIntensityScreen: true, probeEnabled: true } } },
  { name: 'wave custom fourier light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', waveType: 'custom', harmonicWeights: [1, 0, 0.33, 0, 0.2, 0] } } },
  { name: 'wave reflection TIR light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', reflectivity: 0.4, medium2Ratio: 1.5, incidentAngleDeg: 55 } } },
  { name: 'wave reflection TIR dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', reflectivity: 0.4, medium2Ratio: 1.5, incidentAngleDeg: 55 } }, overrides: { isDark: true } },
  { name: 'wave reflection TIR contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', reflectivity: 0.4, medium2Ratio: 1.5, incidentAngleDeg: 55 } }, overrides: { isContrast: true } },
  { name: 'wave packet dispersion probe oscilloscope light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5, probeEnabled: true } } },
  { name: 'wave packet dispersion probe oscilloscope dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5, probeEnabled: true } }, overrides: { isDark: true } },
  { name: 'wave longitudinal kundt standing light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 3, showDisplacementCurve: true, probeEnabled: true } } },
  { name: 'wave longitudinal kundt standing contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 3, showDisplacementCurve: true, probeEnabled: true } }, overrides: { isContrast: true } },
  { name: 'wave doppler moving observer all analyze dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', workspaceTab: 'all', sourceSpeed: 0.4, observerSpeed: 0.4, dataStudioPlot: 'dopplerMach', probeEnabled: true } }, overrides: { isDark: true } },
  { name: 'wave ripple phased array light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleSources: 2, ripplePhaseDiff: 1.5708, showIntensityScreen: true, probeEnabled: true } } },
  { name: 'wave reflection impedance AR coating dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', waveSpeed: 343, waveSpeed2: 1480, impedanceCoupled: true, antiReflectionCoating: true, incidentAngleDeg: 0, probeEnabled: true } }, overrides: { isDark: true } },
  { name: 'wave probe lissajous light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, probeEnabled: true, probeScopeMode: 'lissajous' } } },
  { name: 'wave probe lissajous high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, probeEnabled: true, probeScopeMode: 'lissajous' } }, overrides: { isContrast: true } },
  { name: 'wave library discover inquiry light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'library', expSection: 'discoverWave' } } },
  { name: 'wave lambda caliper doppler flyby light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', sourceSpeed: 0.6, showRuler: true, probeEnabled: true } } },
  { name: 'wave analyze inline plot dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'analyze', dataStudioPlot: 'dopplerMach', experimentLog: [{ n: 1, mode: 'doppler', waveType: 'sine', frequency: 2, amplitude: 50, waveSpeed: 343, wavelength: 171.5, period: 0.5, energy: 2500, sourceSpeed: 0.2, approachingFreq: 2.5 }, { n: 2, mode: 'doppler', waveType: 'sine', frequency: 2, amplitude: 50, waveSpeed: 343, wavelength: 171.5, period: 0.5, energy: 2500, sourceSpeed: 0.6, approachingFreq: 5.0 }] } }, overrides: { isDark: true } },
  { name: 'wave analyze inline plot high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, workspaceTab: 'analyze', showRuler: true, experimentLog: [{ n: 1, mode: 'free', waveType: 'sine', frequency: 2, amplitude: 50, waveSpeed: 343, wavelength: 171.5, period: 0.5, energy: 2500 }, { n: 2, mode: 'free', waveType: 'sine', frequency: 4, amplitude: 50, waveSpeed: 343, wavelength: 85.75, period: 0.25, energy: 2500 }] } }, overrides: { isContrast: true } },
  { name: 'wave standing string mersenne bench light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: 180, stringDensityGm: 2.5 } } },
  { name: 'wave standing string mersenne bench dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: 180, stringDensityGm: 2.5 } }, overrides: { isDark: true } },
  { name: 'wave ripple grating phased array light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 5, ripplePhaseDiff: 0.7854, showIntensityScreen: true, probeEnabled: true } } },
  { name: 'wave spectrum filter bench dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', waveType: 'sawtooth', spectrumFilter: 'lowpass', filterCutoffHarmonic: 3 } }, overrides: { isDark: true } },
  { name: 'wave free pulse collision and snapshot tray light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'collide', collidePolarity: 'same', savedSnapshots: [{ id: 's1', label: '[free] f=2Hz, A=50, v=343m/s', timestamp: 1000, statePatch: { waveMode: 'free', frequency: 2, amplitude: 50, waveSpeed: 343 } }] } } },
  { name: 'wave free pulse collision and snapshot tray high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'collide', collidePolarity: 'opposite', savedSnapshots: [{ id: 's1', label: '[free] f=2Hz, A=50, v=343m/s', timestamp: 1000, statePatch: { waveMode: 'free', frequency: 2, amplitude: 50, waveSpeed: 343 } }] } }, overrides: { isContrast: true } },
  { name: 'wave reflection fresnel brewster light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 'p', medium2Ratio: 0.6, incidentAngleDeg: 59 } } },
  { name: 'wave reflection fresnel brewster dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 'p', medium2Ratio: 0.6, incidentAngleDeg: 59 } }, overrides: { isDark: true } },
  { name: 'wave doppler relativistic spectrograph light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, frequency: 4 } } },
  { name: 'wave doppler relativistic spectrograph dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, frequency: 4 } }, overrides: { isDark: true } },
  { name: 'wave doppler relativistic spectrograph high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, frequency: 4 } }, overrides: { isContrast: true } },
  { name: 'wave spectrum pluck sculptor light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', waveType: 'custom', pluckPosition: 0.5, harmonicWeights: [1, 0, 0.11, 0, 0.04, 0] } } },
  { name: 'wave longitudinal thermal air speed light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', airTempCoupled: true, airTempC: 30, harmonic: 2 } } },
  { name: 'wave longitudinal thermal air speed high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'standing', airTempCoupled: true, airTempC: 30, harmonic: 2 } }, overrides: { isContrast: true } },
  { name: 'wave standing resonator bode dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', harmonic: 2, resonatorDriven: true, driveFreqRatio: 2.0, resonatorQ: 30 } }, overrides: { isDark: true } },
  { name: 'wave reflection ftir tunneling light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, medium2Ratio: 1.5, incidentAngleDeg: 55, ftirEnabled: true, ftirGapLambda: 0.25 } } },
  { name: 'wave reflection ftir tunneling high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'reflection', impedanceCoupled: true, medium2Ratio: 1.5, incidentAngleDeg: 55, ftirEnabled: true, ftirGapLambda: 0.25 } }, overrides: { isContrast: true } },
  { name: 'wave free ocean depth damping dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', packetMode: 'packet', oceanDepthCoupled: true, waterDepthRatio: 0.18, damping: true, dampingAlpha: 1.5 } }, overrides: { isDark: true } },
  { name: 'wave free consonance beat envelope light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, intervalLock: '3:2', showBeatEnvelope: true, amplitude: 50, amplitude2: 50 } } },
  { name: 'wave free consonance beat envelope high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'free', showSecond: true, intervalLock: '3:2', showBeatEnvelope: true, amplitude: 50, amplitude2: 50 } }, overrides: { isContrast: true } },
  { name: 'wave longitudinal distance attenuation dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: 8, spreadingLaw: 'spherical' } }, overrides: { isDark: true } },
  { name: 'wave ripple nodal hyperbolas light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'ripple', rippleBarrier: 'doubleSlit', showNodalLines: true, showIntensityScreen: true } } },
  { name: 'wave spectrum nyquist adc light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', digitalSampling: true, sampleRateRatio: 1.25, adcBitDepth: 4 } } },
  { name: 'wave spectrum nyquist adc dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', digitalSampling: true, sampleRateRatio: 1.25, adcBitDepth: 4 } }, overrides: { isDark: true } },
  { name: 'wave spectrum nyquist adc high contrast', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'spectrum', digitalSampling: true, sampleRateRatio: 1.25, adcBitDepth: 4 } }, overrides: { isContrast: true } },
  { name: 'wave standing traveling decomposition light', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing', showTravelingComponents: true, harmonic: 2 } } },
  { name: 'wave doppler off-axis relativistic dark', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.75, dopplerOffsetAngleDeg: 90 } }, overrides: { isDark: true } },
  { name: 'heat dark theme', file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode: 'conduction' } }, overrides: { theme: 'dark' } },
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

describe('Physical science tools WCAG regression in a real browser', () => {
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

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const offenders = scrollWidth > clientWidth
          ? [...document.querySelectorAll('#tool-root, #tool-root *')]
              .map((element) => {
                const box = element.getBoundingClientRect();
                const styles = getComputedStyle(element);
                return {
                  element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
                    (typeof element.className === 'string' && element.className ? '.' + element.className.trim().replace(/\s+/g, '.') : ''),
                  html: element.outerHTML.slice(0, 280),
                  left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
                  scrollWidth: element.scrollWidth, display: styles.display,
                  gridTemplateColumns: styles.gridTemplateColumns, flexWrap: styles.flexWrap,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      expect.soft(compactViolations(audit.violations)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 20000);
  }
});
