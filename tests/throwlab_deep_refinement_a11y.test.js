import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const canonicalPath = 'stem_lab/stem_tool_throwlab.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_throwlab.js';
const source = readFileSync(canonicalPath, 'utf8');

describe('Throw Lab deep refinement contracts', () => {
  it('keeps the canonical and desktop sources identical', () => {
    expect(readFileSync(mirrorPath, 'utf8')).toBe(source);
  });

  it('scopes Space launching to the focusable trajectory', () => {
    expect(source).not.toContain("window.addEventListener('keydown', onKey)");
    expect(source).toContain("id: 'throwlab-canvas-help'");
    expect(source).toContain("role: 'application'");
    expect(source).toContain("'aria-keyshortcuts': 'Space'");
    expect(source).toContain("if (event.repeat || (event.key !== ' ' && event.code !== 'Space')) return;");
  });

  it('provides standard roving keyboard navigation for sport tabs', () => {
    expect(source).toContain("className: 'throwlab-mode-tabs'");
    expect(source).toContain("tabIndex: sel ? 0 : -1");
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'ArrowLeft'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
  });

  it('treats scenario briefings as modal dialogs with managed focus', () => {
    expect(source).toContain("ref: scenarioDialogRef");
    expect(source).toContain("'aria-describedby': 'tl-scenario-intro-description'");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab' || !dialog) return;");
    expect(source).toContain("closeScenarioIntro(false)");
  });

  it('limits replay rerenders and gives controlled-experiment feedback', () => {
    expect(source).toContain("progress - lastPaint >= 0.025");
    expect(source).toContain("result.fairTest");
    expect(source).toContain("'data-throwlab-fair-test': lr.fairTest.level");
    expect(source).toContain("label: 'Fair test'");
    expect(source).toContain("scheduleTl(function");
  });

  it('meets minimum touch-target and visible-focus contracts', () => {
    expect(source).toContain("button,[data-throwlab-root] summary{min-height:44px}");
    expect(source).toContain("input[type=range]{min-height:44px}");
    expect(source).toContain("button:focus-visible");
    expect(source).toContain("@media(forced-colors:active)");
  });

  it('describes every sport scene instead of falling back to basketball', () => {
    expect(source).toContain("'aria-label': canvasSceneDescription()");
    expect(source).toContain('Cricket pitch side view.');
    expect(source).toContain('Golf-hole side view.');
    expect(source).toContain('Volleyball court side view.');
    expect(source).toContain('Basketball passing side view.');
  });

  it('keeps comparison overlays scientifically compatible', () => {
    expect(source).toContain("referenceList: [], referenceResult: null, referenceLabel: ''");
    expect(source).toContain('mode: prev.throwlab.mode');
    expect(source).toContain('sport scales are not compatible');
  });

  it('shows a pre-launch fair-test check using the shared comparison rules', () => {
    expect(source).toContain("'data-throwlab-next-trial-check': nextTrialCheck.level");
    expect(source).toContain('buildFairTestFeedback(previousModeTrial, pendingTrialSnapshot');
    expect(source).toContain("pair[0] === 'windDirDeg'");
    expect(source).toContain('changed.slice(0, 3)');
  });

  it('reports correct per-sport session attempts and outcomes', () => {
    expect(source).toContain('modeThrowCounts: {}');
    expect(source).toContain('newModeThrowCounts[d.mode]');
    expect(source).toContain("var totalThrows = (d.modeThrowCounts && d.modeThrowCounts[d.mode]) || 0");
    expect(source).toContain("'Wickets: ' + (d.wicketCount || 0)");
    expect(source).toContain("'Greens: ' + (d.golfGreenCount || 0)");
    expect(source).toContain("'Aces: ' + (d.volleyAceCount || 0)");
    expect(source).toContain("'aria-label': 'Current Throw Lab session summary'");
  });

  it('locks background scrolling only while a scenario dialog is open', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain('document.body.style.overflow = previousBodyOverflow');
  });

  it('pins result-facing experiences to an immutable launch snapshot', () => {
    expect(source).toContain('result.trial = currentTrial');
    expect(source).toContain('currentTrial.launchedAt = Date.now()');
    expect(source).toContain("'data-throwlab-result-stale': 'true'");
    expect(source).toContain('resultTrial.speedMph');
    expect(source).toContain('var trial = lr.trial || buildTrialSnapshot(d, loc)');
    expect(source).toContain('buildRefLabel(d.lastResult)');
    expect(source).toContain('var coachTrial = d.lastResult.trial');
    expect(source).toContain('var displayTrial = d.lastResult && d.lastResult.trial');
    expect(source).toContain("'Launched parameters: speed '");
  });

  it('keeps motivational feedback stable while controls rerender', () => {
    expect(source).toContain('function pickHypePhrase(mode, attemptCount)');
    expect(source).toContain('attemptIndex + modeIndex * 3');
    expect(source).toContain("pickHypePhrase(d.mode, ((d.modeThrowCounts || {})[d.mode] || 0))");
    expect(source).not.toContain('Math.random() * HYPE_PHRASES.length');
  });

  it('exposes replay progress and prevents conflicting mid-replay actions', () => {
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuenow': Math.round");
    expect(source).toContain("'aria-label': d.replayActive ? 'Replay in progress; wait to launch another trial'");
    expect(source).toContain('disabled: !!d.replayActive');
    expect(source).toContain("tlAnnounce('Replay complete.')");
    expect(source).toContain('Replay shown without animation because reduced motion is enabled.');
  });

  it('uses native information relationships for controls and data comparisons', () => {
    expect(source).toContain("h('output', {");
    expect(source).toContain("'aria-labelledby': labelId");
    expect(source).toContain("h('table', {");
    expect(source).toContain("h('caption', {");
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("scope: 'row'");
    expect(source).toContain("'aria-label': 'Load ' + pt.label + ' preset'");
    expect(source).toContain("h('dl', {");
    expect(source).toContain("h('dt', {");
    expect(source).toContain("h('dd', {");
  });

  it('keeps narrow comparison tables scrollable and saved references structured', () => {
    expect(source).toContain('.throwlab-compendium-scroll{overflow-x:auto');
    expect(source).toContain('.throwlab-compendium-scroll:focus-visible{outline:3px solid Highlight');
    expect(source).toContain("'aria-label': 'Scrollable preset comparison for ' + modeMeta.label");
    expect(source).toContain("'aria-label': 'Saved comparison trajectories'");
    expect(source).toContain("role: 'listitem'");
    expect(source).toContain("'aria-labelledby': 'tl-preset-picker-heading'");
    expect(source).toContain("'aria-labelledby': 'tl-release-controls-heading'");
    expect(source).toContain("'aria-labelledby': 'tl-wind-controls-heading'");
  });

  it('links sport tabs to their workspace and preserves selected-sport state', () => {
    expect(source).toContain("if (!modeMeta || newMode === d.mode) return;");
    expect(source).toContain("'aria-orientation': 'horizontal'");
    expect(source).toContain("'aria-controls': 'throwlab-fs-workspace'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'throwlab-mode-tab-' + d.mode");
  });

  it('synchronizes fullscreen naming with browser and Escape-driven exits', () => {
    expect(source).toContain("var fullscreenState = React.useState(false)");
    expect(source).toContain("events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange']");
    expect(source).toContain("'aria-pressed': isWorkspaceFullscreen");
    expect(source).toContain('Exit fullscreen for the Throw Lab workspace');
    expect(source).toContain('Enter fullscreen for the Throw Lab workspace');
  });

  it('redraws every saved overlay and shares a complete sport outcome palette', () => {
    expect(source).toContain('d.referenceList, d.referenceResult, d.mode');
    expect(source).toContain('var trajColor = outcomeColor(lr.location)');
    expect(source).toContain("if (isBowling) {");
    expect(source).toContain("loc === 'wicket' || loc === 'shaved' ? '#10b981'");
    expect(source).toContain("if (isGolf) {");
    expect(source).toContain("loc === 'green' ? '#10b981'");
    expect(source).toContain("if (isVolleyball) {");
    expect(source).toContain("loc === 'ace' ? '#10b981'");
  });

  it('describes current and saved trajectory shapes without relying on color', () => {
    expect(source).toContain('function referenceComparisonDescription()');
    expect(source).toContain("' Saved comparison overlays. '");
    expect(source).toContain("'data-throwlab-current-line': 'true'");
    expect(source).toContain("borderTop: '3px solid '");
    expect(source).toContain("'data-throwlab-reference-line': 'true'");
    expect(source).toContain("borderTop: '3px dashed '");
    expect(source).toContain("'aria-label': referenceComparisonText(ref, idx)");
  });

  it('provides a dependency-free immersive projection with equivalent controls and descriptions', () => {
    expect(source).toContain('var immersiveCanvasRef = React.useRef(null)');
    expect(source).toContain("'aria-controls': 'throwlab-immersive-zone'");
    expect(source).toContain("'aria-label': '3D camera controls'");
    expect(source).toContain("role: 'img'");
    expect(source).toContain("'3D perspective view. ' + canvasSceneDescription()");
    expect(source).toContain('references.forEach(function(ref){ drawTrajectory');
    expect(source).toContain('if(current&&d.replayActive)');
    expect(source).toContain('3D view presets');
    expect(source).toContain('data-throwlab-spatial-readout');
    expect(source).toContain('function drawTargetLandmarks()');
    expect(source).toContain('STRIKE ZONE');
    expect(source).toContain('BACKBOARD + RIM');
    expect(source).toContain('UPRIGHTS');
    expect(source).toContain('TARGET GREEN');
    expect(source).toContain('WICKET');
    expect(source).toContain('NET');
    expect(source).toContain('var W = 640, H = 340');
    expect(source).toContain('3D learning overlays');
    expect(source).toContain('showImmersiveGuides');
    expect(source).toContain('showImmersiveTimeMarkers');
    expect(source).toContain('showImmersiveReferences');
    expect(source).toContain('function drawPhysicsAnnotations(result)');
    expect(source).toContain('APEX ');
    expect(source).toContain('Saved comparison overlays are hidden.');
    expect(source).toContain('trailLegend');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('SphereGeometry');
  });

  it('shares stable projection math and suspends hidden immersive rendering', () => {
    expect(source).toContain('var TL_PERSPECTIVE = Object.freeze({');
    expect(source).toContain('window.StemLab.ThrowLabProjection = TL_PERSPECTIVE;');
    expect(source).toContain('createProjector: function(camera');
    expect(source).toContain('TL_PERSPECTIVE.normalizeYaw');
    expect(source).toContain('TL_PERSPECTIVE.clampPitch');
    expect(source).toContain('new IntersectionObserver');
    expect(source).toContain('visibilitychange');
    expect(source).toContain('document.visibilityState');
    expect(source).toContain('!immersiveInView');
    expect(source).toContain('onPointerDown: function(event)');
    expect(source).toContain('onPointerMove: function(event)');
    expect(source).toContain('touchAction:');
  });

  it('provides replay analysis, physics overlays, quantitative deltas, and exports', () => {
    expect(source).toContain('function scrubReplay(progress)');
    expect(source).toContain('function stepReplay(direction)');
    expect(source).toContain('function finishReplayAnalysis()');
    expect(source).toContain('throwlab-replay-scrubber');
    expect(source).toContain('Replay speed');
    expect(source).toContain('[0.25, 0.5, 1]');
    expect(source).toContain('function drawPhysicsVectors(result)');
    expect(source).toContain('var immersiveVectorState = React.useState({');
    expect(source).toContain('magnus: false');
    expect(source).toContain('timeLabelPositions.some');
    expect(source).toContain('function immersiveComparisonRows()');
    expect(source).toContain('function immersiveObservationPrompts()');
    expect(source).toContain('function exportImmersivePng()');
    expect(source).toContain('function exportTrajectoryCsv()');
    expect(source).toContain('function resetImmersiveAnalysis()');
    expect(source).toContain('data-throwlab-analysis-details');
    expect(source).toContain('max-width:1100px');
    expect(source).toContain('window.matchMedia');
    expect(source).toContain('isWorkspaceFullscreen && !compactAnalysis');
  });
});
