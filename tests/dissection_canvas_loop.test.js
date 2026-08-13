import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
];

describe('dissection canvas animation loop', () => {
  it('preserves canvas state updates while cleaning up the heavyweight redraw loop', () => {
    DISSECTION_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var canvasRefNode = null;');
      expect(source).toContain('var detachedCanvas = canvasRefNode;');
      expect(source).toContain('if (!detachedCanvas.isConnected && detachedCanvas._dissCleanup) detachedCanvas._dissCleanup();');
      expect(source).toContain('key: specimen,');
      expect(source).toContain('var nextCanvasMotionReduced = !!d.reducedMotion || !!storedAccessibilityPreferences.reducedMotion;');
      expect(source).toContain('if (canvas._dissCleanup) {');
      expect(source).toContain('var canvasMotionChanged = canvas._dissMotionReduced !== nextCanvasMotionReduced;');
      expect(source).toContain('if ((nextCanvasMotionReduced || canvasMotionChanged) && canvas._drawDissectionNow) canvas._drawDissectionNow();');
      expect(source).toContain('var frameMotionReduced = !!drawState.reducedMotion || !!storedAccessibilityPreferences.reducedMotion;');
      expect(source).not.toContain('if (canvas._dissCleanup) return;');
      expect(source).not.toContain('if (canvas._dissAnim && canvas._dissCleanup) return;');
      expect(source).toContain('function cleanupDissectionCanvas()');
      expect(source).toContain('function isDissectionHidden()');
      expect(source).toContain('function isDissectionOffscreen()');
      expect(source).toContain('function cancelActiveCanvasGesture(reason, canvas, sourceEvent)');
      expect(source).toContain('function cancelCanvasPointerInteraction(e)');
      expect(source).toContain('onPointerCancel: cancelCanvasPointerInteraction');
      expect(source).toContain('onLostPointerCapture: cancelCanvasPointerInteraction');
      expect(source).toContain('function timedProcedureScenarioExpired()');
      expect(source).toContain("return { ok: false, reason: 'scenario-expired' };");
      expect(source).toContain('context.scenarioStartedAt === (Number(d.scenarioStartedAt) || 0) && !timedProcedureScenarioExpired()');
      expect(source).toContain('function displayedSpecimenPoint(org)');
      expect(source).toContain('x: (point.x - 0.5) * factors.x + 0.5');
      expect(source).toContain('var displayed = displayedSpecimenPoint(org);');
      expect(source).toContain('lightIntensity: Math.max(20, Math.min(100, Number(d.lightIntensity) || 68))');
      expect(source).toContain('&& context.lightIntensity === Math.max(20, Math.min(100, Number(d.lightIntensity) || 68))');
      expect(source).toMatch(/if \(remaining === 0\) \{\s*setProcedureFeedback\('Timed practical expired\.[^']*', 'caution'\);\s*cancelActiveCanvasGesture\('Timed practical expired;[^']*', canvas\);\s*\}/);
      expect(source).toContain('var frameDeltaMs = rawFrameDeltaMs > 180 ? 0 : Math.min(100, rawFrameDeltaMs);');
      expect(source).toContain("cancelActiveCanvasGesture('Specimen contact canceled when the lab moved to the background; no action was recorded.', canvas);");
      expect(source).toContain("cancelActiveCanvasGesture('Specimen contact canceled when the window lost focus; no action was recorded.', canvas);");
      expect(source).toContain("cancelActiveCanvasGesture('Specimen contact canceled when the canvas moved offscreen; no action was recorded.', canvas);");
      expect(source).toContain('if (isDissectionHidden()) {');
      expect((source.match(/canvas\._livingFunctionLastAt = null;/g) || []).length).toBeGreaterThanOrEqual(4);
      expect(source).toContain('function cancelDissectionFrame()');
      expect(source).toContain('function scheduleDissectionFrame()');
      expect(source).toContain('if (!dissAlive || dissMotionReduced || canvas._dissAnim || isDissectionHidden() || isDissectionOffscreen()) return;');
      expect(source).toContain('var dissIntersectionObserver = null;');
      expect(source).toContain('var dissResizeObserver = null;');
      expect(source).toContain('new window.IntersectionObserver(onDissectionIntersection');
      expect(source).toContain('new window.ResizeObserver(onDissectionResize)');
      expect(source).toContain('if (dissIntersectionObserver) { dissIntersectionObserver.disconnect(); dissIntersectionObserver = null; }');
      expect(source).toContain('if (dissResizeObserver) { dissResizeObserver.disconnect(); dissResizeObserver = null; }');
      const canvasDrawStart = source.indexOf('function drawDissectionFrame()');
      expect(canvasDrawStart).toBeGreaterThan(-1);
      expect(source.indexOf('new window.IntersectionObserver(onDissectionIntersection')).toBeLessThan(canvasDrawStart);
      expect(source.indexOf('new window.ResizeObserver(onDissectionResize')).toBeLessThan(canvasDrawStart);
      expect(source).toContain('canvas._dissMotionReduced = dissMotionReduced;');
      expect(source).toContain('canvas._drawDissectionNow = function ()');
      expect(source).toContain('canvas._dissKeyHandler = null; canvas._drawDissectionNow = null; canvas._dissMotionReduced = null;');
      expect(source).toContain('canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain("var liveRenderQuality = drawState.renderQuality || 'auto';");
      expect(source).toContain("var autoBalanced = liveRenderQuality === 'auto'");
      expect(source).toContain("var minFrameMs = Math.max(adaptiveFrameFloor, liveRenderQuality === 'high' ? 16");
      expect(source).toContain('if (!dissMotionReduced) { dissLastDrawAt = arguments[0] || Date.now(); dissTick++; }');
      expect(source).toContain('All anatomy and interaction math stays in logical CSS pixels');
      expect(source).toContain('var canvasDisplayRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;');
      expect(source).toContain('var canvasDisplayRatio = Math.max(W / Math.max(1, canvasDisplayWidth), H / Math.max(1, canvasDisplayHeight));');
      expect(source).toContain('var canvasUiScale = Math.max(1, Math.min(2.6, canvasDisplayRatio));');
      expect(source).toContain("window.matchMedia('(pointer: coarse)').matches");
      expect(source).toContain('if (canvasCoarsePointer) canvasUiScale = Math.max(1.2, Math.min(2.6, canvasDisplayRatio * 1.25));');
      expect(source).toContain('else if (canvasDisplayRatio > 1) canvasUiScale = Math.min(2.3, canvasDisplayRatio * 1.1);');
      expect(source).toContain('var canvasTextPreferenceScale = (!!drawState.largeText || !!storedAccessibilityPreferences.largeText) ? 1.18 : 1;');
      expect(source).toContain('canvasUiScale = Math.min(2.8, canvasUiScale * canvasTextPreferenceScale);');
      expect(source).toContain('var canvasHudScale = Math.max(1, Math.min(2.15, canvasDisplayRatio * canvasTextPreferenceScale));');
      expect(source).toContain('canvas._canvasHudScale = canvasHudScale;');
      expect(source).toContain('Rehydrate every canvas presentation input from the latest React state.');
      expect(source).toContain("visualRealism = d.visualRealism || 'guided';");
      expect(source).toContain('sceneDetail = d.sceneDetail !== false;');
      expect(source).toContain('depthAtlasEnabled = d.depthAtlas !== false;');
      expect(source).toContain('tissueReliefEnabled = d.tissueRelief !== false;');
      expect(source).toContain('relationshipMotion = d.relationshipMotion !== false;');
      expect(source).toContain('focusMode = d.focusMode !== false;');
      expect(source).toContain('parallaxDepth = d.parallaxDepth !== false;');
      expect(source).toContain('var surfaceMaterialLayer = currentLayerIdx === 0;');
      expect(source).toContain("if (liveVisualMode !== 'accessible' && sceneDetail && surfaceMaterialLayer) {");
      const tissueWashStart = source.indexOf('// Tissue-state visualization makes accumulated moisture, clarity, tension, and trauma visible on the specimen.');
      const tissueWashEnd = source.indexOf('if (focusMode && d.selectedOrgan)', tissueWashStart);
      const tissueWashSource = source.slice(tissueWashStart, tissueWashEnd);
      expect(tissueWashStart).toBeGreaterThan(-1);
      expect(tissueWashEnd).toBeGreaterThan(tissueWashStart);
      expect(tissueWashSource.indexOf('if (surfaceMaterialLayer) {')).toBeLessThan(tissueWashSource.indexOf('if (liveTissueState.clarity < 76)'));
      expect(tissueWashSource.indexOf('if (surfaceMaterialLayer) {')).toBeLessThan(tissueWashSource.indexOf('if (liveTissueState.moisture < 58)'));
      expect(tissueWashSource).toContain('drawLocalizedTechniqueEvidence(liveProcedureState, liveTissueState);');
      expect(source).toContain('function fillReadableSpecimenText(text, x, y)');
      expect(source).toContain('ctx.scale(1 / (specimenScale.x || 1), 1 / (specimenScale.y || 1));');
      expect(source).toContain('var guidedCallout = currentGuided && currentGuided.organId === org.id;');
      expect(source).toContain('fillReadableSpecimenText(layout.displayLabel');
      expect(source).toContain("var screenLayerLabel = screenLayerDef.icon + ' ' + screenLayerDef.name + ' Layer';");
      expect(source).toContain('ctx.fillText(screenLayerLabel, 25, layerPillY + 18 * screenGuideScale);');
      expect(source).toContain("canvasCoarsePointer ? 'select to expand' : 'hover to expand'");
      expect(source).toContain('var fullLabel = !d.quizMode &&');
      expect(source).toContain('if (!d.quizMode && screenCompactCount > 0) {');
      expect(source).toContain('} else if (!d.quizMode) {');
      expect(source).toMatch(/if \(!d\.quizMode\) \{\s*var leaderStartX/);
      expect(source).toContain('!d.quizMode && React.createElement("button", { type: "button", tabIndex: d.toolbarToolsOpen');
      expect(source).toContain('!d.quizMode && React.createElement(React.Fragment, null,');
      expect(source).toContain("touchAction: (d.canvasZoom || 1) <= 1.01 && (d.quizMode || guidedMode || currentLearningGate.required || !currentToolReadiness.safeToAct || procedureNext.action === 'complete') ? 'pan-y'");
      expect(source).toContain('function canvasPointerModeData(canvas, hit)');
      expect(source).toContain('function syncCanvasPointerPresentation(canvas, hit)');
      expect(source).toContain('canvas.style.cursor = pointerMode.cursor;');
      expect(source).toContain('"data-diss-pointer-guide": true');
      expect(source).toContain("'data-cursor-mode': pointerGuideData.mode");
      expect(source).toContain('cursor: pointerGuideData.cursor');
      expect(source).not.toContain("canvas.style.cursor = 'none'");
      expect(source).not.toContain('canvas.style.cursor = "none"');
      expect(source).not.toContain('if (denseHotspotView && compactHotspotCount > 0) {');
      expect(source).toContain('var clickDisplayMin = Math.max(1, Math.min(rect.width || 1, rect.height || 1));');
      expect(source).toContain('var minimumCssHitRadius = (clickPointerCoarse ? 22 : 14) / clickDisplayMin / Math.max(1, _z);');
      expect(source).toContain('var clickHitRadius = Math.max(minimumCssHitRadius, 0.028');
      expect(source).toContain('var directoryMarkerNumber = Math.max(1, organs.indexOf(org) + 1);');
      expect(source).toContain('String(directoryMarkerNumber)');
      expect(source).toContain('!sel && !d.quizMode && React.createElement("section", { className: "diss-structure-list');
      expect(source).toContain('mappedX -= (Number(canvas._parallaxX) || 0) / logicalWidth;');
      expect(source).toContain('mappedY -= (Number(canvas._parallaxY) || 0) / logicalHeight;');
      expect(source.match(/mx -= \(Number\(canvas\._parallaxX\) \|\| 0\) \/ (?:click|hover)LogicalWidth;/g) || []).toHaveLength(2);
      expect(source.match(/my -= \(Number\(canvas\._parallaxY\) \|\| 0\) \/ (?:click|hover)LogicalHeight;/g) || []).toHaveLength(2);
      expect(source).toMatch(/var nextHoveredOrgan = hit \? hit\.id : null;\s*if \(nextHoveredOrgan !== d\.hoveredOrgan\) upd\('hoveredOrgan', nextHoveredOrgan\);/);
      expect(source).not.toContain("upd('hoveredOrgan', hit ? hit.id : null);");
      const assessmentOverlayFlags = ['showEndocrine', 'traceNervous', 'traceCirculation', 'traceDigestion', 'traceRespiration', 'traceExcretory', 'livingFunctionEnabled'];
      assessmentOverlayFlags.forEach((flag) => expect(source).toContain(`if (!d.quizMode && d.${flag}`));
      expect(source).toContain('!d.quizMode && React.createElement("details", { className: "diss-overlay-actions"');
      expect(source).toContain('if (!d.quizMode) drawOpticalFocusPlaneMap();');
      expect(source).toContain('if (!opticalPlaneMapActive) return;');
      expect(source).toContain('if (!d.quizMode && d.inspectionLens && lensTargetInFrame && lensCtx) {');
      expect(source).toContain('if (!d.quizMode && macroInset && lensTargetInFrame && lensCtx) {');
      expect(source).toContain('if (!d.quizMode && _incisionAnim && _incisionAnim.active) {');
      expect(source).toContain('if (!d.quizMode && liveDemo && liveDemo.layer === activeLayer');
      expect(source).toContain('if (!d.quizMode && liveReplay && liveReplay.layer === activeLayer');
      expect(source).toContain('var heartMotionActive = livingFunctionEnabled && !dissMotionReduced;');
      expect(source).toContain('var heartScale = heartMotionActive ? 1 + livingWave * 0.018 : 1;');
      expect(source).toContain("if (!d.quizMode && (activeLayer === 'nervous' || activeLayer === 'conduction'");

      const assessmentResetFields = ['traceNervous', 'traceCirculation', 'traceDigestion', 'traceRespiration', 'traceExcretory', 'showEndocrine', 'livingFunctionEnabled', 'livingFunctionPaused'];
      const quizEntryStart = source.indexOf("} else if (route === 'quiz')");
      const quizEntrySource = source.slice(quizEntryStart, source.indexOf('} else {', quizEntryStart));
      const practicalEntryStart = source.indexOf("var previousLabelMode = d.labelMode || 'show';");
      const practicalEntrySource = source.slice(practicalEntryStart, source.indexOf('var remaining = 120;', practicalEntryStart));
      expect(quizEntryStart).toBeGreaterThan(-1);
      expect(practicalEntryStart).toBeGreaterThan(-1);
      assessmentResetFields.forEach((field) => {
        expect(quizEntrySource).toContain(`${field}: false`);
        expect(practicalEntrySource).toContain(`${field}: false`);
      });
      const assessmentVisualResetFields = ['inspectionLens', 'lensPinned', 'macroInset'];
      assessmentVisualResetFields.forEach((field) => {
        expect(quizEntrySource).toContain(`${field}: false`);
        expect(practicalEntrySource).toContain(`${field}: false`);
      });
      for (const field of ['rulerMode', 'annotateMode', 'compareTechniqueAttempts', 'compareReplayPlaying', 'splitComparison', 'beforeTechniqueView']) {
        expect(quizEntrySource).toContain(`${field}: false`);
        expect(practicalEntrySource).toContain(`${field}: false`);
      }
      for (const field of ['rulerStart', 'rulerEnd']) {
        expect(quizEntrySource).toContain(`${field}: null`);
        expect(practicalEntrySource).toContain(`${field}: null`);
      }
      for (const field of ['lensPinnedPoint', 'lensPinnedOrganId', '_procedureDemo', '_procedureReplay']) {
        expect(quizEntrySource).toContain(`${field}: null`);
        expect(practicalEntrySource).toContain(`${field}: null`);
      }
      expect(quizEntrySource).toContain('clearAssessmentTeachingTimers();');
      expect(source.slice(source.lastIndexOf('clearAssessmentTeachingTimers();', practicalEntryStart), practicalEntryStart)).toContain('clearAssessmentTeachingTimers();');

      expect(source).toContain('function scheduleReducedCanvasPulseClear(canvasEl, field, duration)');
      expect(source).toContain("var timerKey = field === '_toolContactPulse' ? '_dissReducedContactTimer' : '_dissReducedOutcomeTimer';");
      expect(source).toContain('if (canvasEl[field] === queuedPulse) canvasEl[field] = null;');
      expect(source).toContain("scheduleReducedCanvasPulseClear(replayCanvas, '_toolContactPulse'");
      expect(source).toContain("scheduleReducedCanvasPulseClear(outcomeCanvas, '_toolOutcomePulse'");
      expect(source).toContain('if (canvas._dissReducedContactTimer) { clearTimeout(canvas._dissReducedContactTimer); canvas._dissReducedContactTimer = null; }');
      expect(source).toContain('if (canvas._dissReducedOutcomeTimer) { clearTimeout(canvas._dissReducedOutcomeTimer); canvas._dissReducedOutcomeTimer = null; }');
      expect(source).toContain("var frogBreath = (!livingFunctionEnabled || dissMotionReduced) ? 1 : breathScale;");
      expect(source).toContain("var adaptiveHotspotLayout = organs.filter(function (org) { return !d.quizMode || structureExposureState(org, currentProcedure) === 'visible'; })");
      expect(source).toContain('opticalPlaneMapActive = inspectionLens || lensPinned;');
      expect(source).toMatch(/ctx\.save\(\);\s*ctx\.beginPath\(\); ctx\.ellipse\(materialCX, materialCY, materialRX \* 1\.08, materialRY \* 1\.08,[^\n]+\n\s*\/\/ Keep adjustable specimen lighting on anatomy/);
      const lightingStart = source.indexOf('// Keep adjustable specimen lighting on anatomy');
      const finalGuidanceHelper = source.indexOf('function drawFinalSpecimenGuidanceOverlay()', lightingStart);
      const finalGuidanceInvocation = source.indexOf('drawFinalSpecimenGuidanceOverlay();', finalGuidanceHelper + 1);
      const lastLightingFill = source.lastIndexOf('ctx.fillRect', finalGuidanceHelper);
      const finalGuidanceSource = source.slice(finalGuidanceHelper, finalGuidanceInvocation);
      expect(lightingStart).toBeGreaterThan(-1);
      expect(lastLightingFill).toBeGreaterThan(lightingStart);
      expect(lastLightingFill).toBeLessThan(finalGuidanceInvocation);
      expect(finalGuidanceSource).toContain('drawAdaptiveHotspotGuidance();');
      expect(finalGuidanceSource).toContain('drawGuidedSpecimenPrompt();');
      const zoomRestore = source.indexOf('ctx.restore(); // End zoom transform', finalGuidanceInvocation);
      const finalScreenHelper = source.indexOf('function drawFinalScreenGuidanceOverlay()', zoomRestore);
      const finalScreenInvocation = source.indexOf('drawFinalScreenGuidanceOverlay();', finalScreenHelper + 1);
      const finalScreenSource = source.slice(finalScreenHelper, finalScreenInvocation);
      expect(zoomRestore).toBeGreaterThan(finalGuidanceInvocation);
      expect(finalScreenHelper).toBeGreaterThan(zoomRestore);
      expect(finalScreenInvocation).toBeGreaterThan(finalScreenHelper);
      expect(finalScreenSource).toContain('screenPromptText');
      expect(finalScreenSource).toContain('screenLayerLabel');
      expect(finalScreenSource).toContain('screenDeclutter');
      expect(source).toContain("var screenPhysiologyHudReserve = !d.quizMode && (d.livingFunctionEnabled || (activeCanvasTraceKey && activeLayer === 'organs')) ? 76 : 0;");
      expect(finalScreenSource).toContain('H - guidedScreenHeight - 14 - screenPhysiologyHudReserve');
      expect(finalGuidanceSource).not.toContain('screenPromptText');
      expect(source).toMatch(/if \(!d\.quizMode\) \{\s*ctx\.font='6px Inter, system-ui';ctx\.fillStyle='rgba\(254,226,226,0\.58\)';ctx\.fillText\('thorax'/);
      expect(source).toMatch(/if \(!d\.quizMode\) \{\s*ctx\.font = '6px Inter, system-ui'; ctx\.fillStyle = 'rgba\(254,240,138,0\.58\)';\s*ctx\.fillText\('Area centralis'/);
      expect(source).toMatch(/if \(!d\.quizMode\) \{\s*ctx\.font = '7px Inter, system-ui'; ctx\.fillStyle = '#fbbf24'; ctx\.fillText\('Refracted light'/);
      expect(source).toMatch(/if \(!d\.quizMode\) \{\s*ctx\.font = 'bold 10px Inter, system-ui'; ctx\.fillStyle = '#22c55e'; ctx\.fillText\(bpm \+ ' BPM'/);
      expect(source).toMatch(/Compact labels remain inside the specimen[\s\S]{0,180}if \(!d\.quizMode\) \{/);
      expect(source).toContain('W = canvas._logicalW || canvas.width;');
      expect(source).toContain('H = canvas._logicalH || canvas.height;');
      expect(source).toContain('if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);');
      expect(source).toContain("canvas.style.width = '';");
      expect(source).toContain("canvas.style.height = '';");
      expect(source).toContain('var logicalWidth = canvas._logicalW || canvas.width || 500');
      expect(source).toContain('var clickLogicalWidth = canvas._logicalW || canvas.width || 500');
      expect(source).toContain('var hoverLogicalWidth = canvas._logicalW || canvas.width || 500');
      expect(source).toContain('var lensSourceScale = Number(canvas._dpr) || 1;');
      expect(source).toContain('sourceRadius * 2 * lensSourceScale');
      expect(source).toContain('macroSourceWidth * lensSourceScale');
      expect(source).not.toContain('W = canvas.width; H = canvas.height;');
      expect(source).toContain('var dissTimeTimer = setInterval(function ()');
      expect(source).toContain('if (dissTimeTimer) { clearInterval(dissTimeTimer); dissTimeTimer = null; }');
      expect(source).toContain("document.addEventListener('visibilitychange', onDissectionVisibilityChange);");
      expect(source).toContain("window.addEventListener('blur', onDissectionWindowBlur);");
      expect(source).toContain("window.removeEventListener('blur', onDissectionWindowBlur);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onDissectionVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupDissectionCanvas(); return; }');
      expect(source).toContain('scheduleDissectionFrame();');
      expect(source).not.toContain('if (canvas._dissAnim) return;');
      expect(source).not.toContain('canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);\\n\\n                return;');
    });
  }, 15000);
  it('keeps one paused canvas lifecycle across rerenders and clears owned globals on detach', async () => {
    resetStemLab();
    localStorage.removeItem('dissection_accessibility_preferences');
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const previousMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    const previousIntersectionObserver = window.IntersectionObserver;
    const previousResizeObserver = window.ResizeObserver;
    const intersectionObservers = [];
    const resizeObservers = [];
    window.IntersectionObserver = vi.fn(function (callback, options) {
      this.callback = callback;
      this.options = options;
      this.observe = vi.fn();
      this.disconnect = vi.fn();
      intersectionObservers.push(this);
    });
    window.ResizeObserver = vi.fn(function (callback) {
      this.callback = callback;
      this.observe = vi.fn();
      this.disconnect = vi.fn();
      resizeObservers.push(this);
    });
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    let root;
    let host;
    let updateToolData;
    let compareTimer;
    let contactTimer;
    let outcomeTimer;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          canvasZoom: 1,
          _dissLoadedSpec: 'frog',
        },
      });
      updateToolData = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      let canvas = host.querySelector('#diss-canvas');
      const initialCleanup = canvas._dissCleanup;
      expect(initialCleanup).toEqual(expect.any(Function));
      expect(canvas._dissKeyHandler).toBe(window._dissectionKeyHandler);
      expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(window.ResizeObserver).toHaveBeenCalledTimes(1);
      expect(intersectionObservers[0].callback).toEqual(expect.any(Function));
      expect(intersectionObservers[0].options).toMatchObject({ rootMargin: '180px 0px', threshold: 0.01 });
      expect(intersectionObservers[0].observe).toHaveBeenCalledWith(canvas);
      expect(resizeObservers[0].callback).toEqual(expect.any(Function));
      expect(resizeObservers[0].observe).toHaveBeenCalledWith(canvas);

      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, canvasZoom: 1.25 },
        }));
        await Promise.resolve();
      });

      expect(canvas._dissCleanup).toBe(initialCleanup);
      expect(canvas._zoom).toBe(1.25);
      expect(canvas._drawD.canvasZoom).toBe(1.25);
      expect(window._dissectionKeyHandler).toEqual(expect.any(Function));
      expect(canvas._dissKeyHandler).toBe(window._dissectionKeyHandler);
      expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(window.ResizeObserver).toHaveBeenCalledTimes(1);

      const redrawWhilePaused = vi.fn(canvas._drawDissectionNow);
      canvas._drawDissectionNow = redrawWhilePaused;
      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, reducedMotion: true },
        }));
        await Promise.resolve();
      });
      expect(canvas._dissMotionReduced).toBe(true);
      expect(redrawWhilePaused).toHaveBeenCalledTimes(1);

      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, reducedMotion: false },
        }));
        await Promise.resolve();
      });
      expect(canvas._dissMotionReduced).toBe(false);
      expect(redrawWhilePaused).toHaveBeenCalledTimes(2);

      const frogCanvas = canvas;
      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: {
            ...previous.dissection,
            specimen: 'earthworm',
            activeLayer: 'skin',
            _dissLoadedSpec: 'earthworm',
          },
        }));
        await Promise.resolve();
      });
      canvas = host.querySelector('#diss-canvas');
      expect(canvas).not.toBe(frogCanvas);
      expect(frogCanvas._dissCleanup).toBeNull();
      expect(canvas._drawSpecimen).toBe('earthworm');
      expect(canvas._dissCleanup).toEqual(expect.any(Function));
      expect(window.IntersectionObserver).toHaveBeenCalledTimes(2);
      expect(window.ResizeObserver).toHaveBeenCalledTimes(2);
      expect(intersectionObservers[0].disconnect).toHaveBeenCalledTimes(1);
      expect(resizeObservers[0].disconnect).toHaveBeenCalledTimes(1);
      expect(intersectionObservers[1].observe).toHaveBeenCalledWith(canvas);
      expect(resizeObservers[1].observe).toHaveBeenCalledWith(canvas);

      contactTimer = setTimeout(() => {}, 60000);
      outcomeTimer = setTimeout(() => {}, 60000);
      canvas._dissReducedContactTimer = contactTimer;
      canvas._dissReducedOutcomeTimer = outcomeTimer;
      canvas._toolContactPulse = { replay: true };
      canvas._toolOutcomePulse = { tone: 'success' };
      compareTimer = setTimeout(() => {}, 60000);
      window.__alloDissectionCompareReplayTimer = compareTimer;

      await act(async () => {
        root.unmount();
        root = null;
        await Promise.resolve();
      });

      expect(clearTimeoutSpy).toHaveBeenCalledWith(compareTimer);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(contactTimer);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(outcomeTimer);
      expect(canvas._dissReducedContactTimer).toBeNull();
      expect(canvas._dissReducedOutcomeTimer).toBeNull();
      expect(canvas._toolContactPulse).toBeNull();
      expect(canvas._toolOutcomePulse).toBeNull();
      expect(window.__alloDissectionCompareReplayTimer).toBeNull();
      expect(window.__alloDissectionCanvasCleanup).toBeNull();
      expect(window._dissectionKeyHandler).toBeNull();
      expect(canvas._dissCleanup).toBeNull();
      expect(canvas._dissKeyHandler).toBeNull();
      expect(intersectionObservers[1].disconnect).toHaveBeenCalledTimes(1);
      expect(resizeObservers[1].disconnect).toHaveBeenCalledTimes(1);
    } finally {
      if (root) {
        await act(async () => {
          root.unmount();
          await Promise.resolve();
        });
      }
      if (window.__alloDissectionCompareReplayTimer) {
        clearTimeout(window.__alloDissectionCompareReplayTimer);
        window.__alloDissectionCompareReplayTimer = null;
      }
      if (window.__alloDissectionCanvasCleanup) window.__alloDissectionCanvasCleanup();
      window._dissectionKeyHandler = null;
      if (host) host.remove();
      document.getElementById('allo-live-dissection')?.remove();
      window.matchMedia = previousMatchMedia;
      window.IntersectionObserver = previousIntersectionObserver;
      window.ResizeObserver = previousResizeObserver;
      hiddenSpy.mockRestore();
      contextSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    }
  }, 15000);

  it('cancels only the owning pointer context on lost capture or pointer cancellation', async () => {
    resetStemLab();
    localStorage.removeItem('dissection_accessibility_preferences');
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          activeInstrument: 'scalpel',
          hoveredOrgan: 'dorsal_skin',
          procedureByLayer: { skin: { history: ['inspect'], actionLog: [] } },
          _dissLoadedSpec: 'frog',
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    function seedGesture(canvas, pointerId) {
      canvas._isPanning = true;
      canvas._wasPanning = true;
      canvas._panPointerId = pointerId;
      canvas._panStartX = 12;
      canvas._panStartY = 18;
      canvas._panOrigX = 2;
      canvas._panOrigY = 3;
      canvas._toolDrawing = true;
      canvas._toolStroke = [{ x: 0.4, y: 0.3 }, { x: 0.5, y: 0.45 }];
      canvas._toolSamples = [{ pressure: 0.5, at: Date.now(), pointerType: 'touch' }];
      canvas._toolInputType = 'touch';
      canvas._toolGestureContext = { tool: 'scalpel', specimen: 'frog', layer: 'skin', view: 'dorsal', pointerId };
      canvas._toolResistance = { level: 'low', value: 0.1 };
      canvas._lastResistanceLevel = 'low';
      canvas._cuttingSafetyState = 'clear';
      canvas._toolPointer = { x: 0.5, y: 0.45 };
      canvas._toolIntentState = { tool: 'scalpel' };
      canvas._toolVector = { x: 0.1, y: 0.15 };
      canvas._toolPressure = 0.5;
      canvas._suppressToolClick = true;
      canvas._parallaxTargetX = 8;
      canvas._parallaxTargetY = 6;
    }

    async function dispatchPointerLifecycle(canvas, type, pointerId) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      await act(async () => {
        canvas.dispatchEvent(event);
        await Promise.resolve();
      });
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      let canvas = host.querySelector('#diss-canvas');
      canvas.hasPointerCapture = vi.fn(() => true);
      canvas.releasePointerCapture = vi.fn();
      canvas._drawDissectionNow = vi.fn();
      seedGesture(canvas, 17);

      await dispatchPointerLifecycle(canvas, 'lostpointercapture', 99);
      expect(canvas._toolDrawing).toBe(true);
      expect(canvas._panPointerId).toBe(17);
      expect(canvas.releasePointerCapture).not.toHaveBeenCalled();

      await dispatchPointerLifecycle(canvas, 'lostpointercapture', 17);
      for (const field of ['_panPointerId', '_panStartX', '_panStartY', '_panOrigX', '_panOrigY', '_toolStroke', '_toolSamples', '_toolInputType', '_toolGestureContext', '_toolResistance', '_lastResistanceLevel', '_cuttingSafetyState', '_toolPointer', '_toolIntentState', '_toolVector', '_toolPressure']) {
        expect(canvas[field]).toBeNull();
      }
      expect(canvas._isPanning).toBe(false);
      expect(canvas._wasPanning).toBe(false);
      expect(canvas._toolDrawing).toBe(false);
      expect(canvas._suppressToolClick).toBe(false);
      expect(canvas._parallaxTargetX).toBe(0);
      expect(canvas._parallaxTargetY).toBe(0);
      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(17);
      expect(latestToolData.dissection.hoveredOrgan).toBeNull();
      expect(latestToolData.dissection.procedureByLayer.skin.history).toEqual(['inspect']);
      expect(latestToolData.dissection.procedureByLayer.skin.actionLog).toEqual([]);
      expect(latestToolData.dissection.procedureFeedback.message).toMatch(/canceled|no action/i);

      canvas = host.querySelector('#diss-canvas');
      seedGesture(canvas, 18);
      await dispatchPointerLifecycle(canvas, 'pointercancel', 18);
      expect(canvas._toolDrawing).toBe(false);
      expect(canvas._toolGestureContext).toBeNull();
      expect(canvas._panPointerId).toBeNull();
      expect(latestToolData.dissection.procedureByLayer.skin.history).toEqual(['inspect']);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

});
