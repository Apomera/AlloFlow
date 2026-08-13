import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOLAR_SYSTEM_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

describe('solar system main 3D canvas loop', () => {
  it('awards gas-sample XP through the module-scoped helper', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("if (typeof awardStemXP === 'function') awardStemXP('solarSystem', sd.xp);");
      expect(source).not.toContain("awardXP(sd.xp, 'Gas sample: ' + sd.name);");
    });
  });

  it('cleans up the main 3D loop, visibility listener, resize observer, and labels', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("const labelContainer = canvas.parentElement ? canvas.parentElement.querySelector('.solar-labels') : null;");
      expect(source).toContain('let solarAlive = true;');
      expect(source).toContain('let resizeObserver = null;');
      expect(source).toContain('function isSolarHidden()');
      expect(source).toContain('function cancelSolarFrame()');
      expect(source).toContain('function scheduleSolarFrame()');
      expect(source).toContain('if (!solarAlive || animId || isSolarHidden()) return;');
      expect(source).toContain('animId = requestAnimationFrame(animate);');
      expect(source).toContain('function clearSolarLabels()');
      expect(source).toContain('function cleanupSolarCanvas()');
      expect(source).toContain("document.addEventListener('visibilitychange', onSolarVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onSolarVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupSolarCanvas(); return; }');
      expect(source).toContain('if (isSolarHidden()) { cancelSolarFrame(); return; }');
      expect(source).toContain('if (isSolarHidden()) { cancelSolarFrame(); clearSolarLabels(); }');
      expect(source).toContain('resizeObserver = new ResizeObserver(function ()');
      expect(source).toContain('if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }');
      expect(source).toContain('canvas._solarCleanup = null;');
      expect(source).toContain('canvas._solarInit = false;');
      expect(source).toContain('cleanupSolarCanvas();');
      expect(source).not.toContain('const resizeObserver = new ResizeObserver(function ()');
    });
  });

  it('uses high-contrast pill labels for planet names', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("font-weight:800;letter-spacing:0.02em");
      expect(source).toContain("color:' + (isSelected ? '#111827' : '#0f172a')");
      expect(source).toContain("background:' + (isSelected ? 'rgba(254,240,138,0.96)' : 'rgba(248,250,252,0.92)')");
      expect(source).toContain("border-radius:999px;padding:3px 7px");
      expect(source).toContain('box-shadow:0 2px 8px rgba(2,6,23,0.45)');
      expect(source).not.toContain('font-weight:700;letter-spacing:0.05em;pointer-events:none;text-shadow:0 1px 3px');
    });
  });

  it('exposes elapsed Earth time and hover target cues in the Orrery', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function orbitCalendarLabel(time)');
      expect(source).toContain('var phasePos = orbitalPos(body.a, body.e, M);');
      expect(source).toContain('var radialPhase = (phasePos.r - perihelion) / orbitalSpan;');
      expect(source).toContain('var wholeYears = Math.floor(safeTime);');
      expect(source).toContain('var dayOfYear = Math.min(364, Math.floor(yearFraction * daysPerYear)) + 1;');
      expect(source).toContain('var timeLabel = "Elapsed " + fmt(t, 2) + " Earth yr";');
      expect(source).toContain('var calendarLabel = orbitCalendarLabel(t);');
      expect(source).toContain('orbitCalendarLabel(timeRef.current)');
      expect(source).toContain('orbitCalendarLabel(t));');
      expect(source).toContain('var isHoveredBody =');
      expect(source).toContain('if ((showLabels && labelVisible) || isHoveredBody)');
      expect(source).toContain('A dashed halo makes the hovered target legible');
      expect(source).toContain('var tooltipContentHeight = 0;');
      expect(source).toContain('var measureLineCount = 1;');
      expect(source).toContain('var tipH = padV * 2 + tooltipContentHeight + 2;');
      expect(source).toContain('hover for details');
      expect(source).toContain('.orr-stage-hud>div:last-child{justify-content:flex-start!important}');
      expect(source).toContain('.orr-stage-tip{left:10px;right:10px;bottom:10px;max-width:none;text-align:left;line-height:1.35}');
    });
  });
  it('offers honest body-size modes and collision-safe Orrery labels', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var scaleMode = d.orr_scale_mode === "relative" ? "relative" : "teaching";');
      expect(source).toContain('function placeOrbitLabel(sx, sy, dotR, pillW, pillH)');
      expect(source).toContain('var relativeDotR =');
      expect(source).toContain('Body size:');
      expect(source).toContain('Use relative body sizes with a visibility floor');
      expect(source).toContain('Relative body sizes');
    });
  });
  it('adds labeled orbit timeline landmarks and a live phase context', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var timelineMilestones = scrubBody ? [');
      expect(source).toContain('{ phase: scrubPeriod * 0.5, label: "Aphelion" }');
      expect(source).toContain('var scrubPhaseAt = function(time)');
      expect(source).toContain('var isExactEndpoint = scrubBody && time > 0');
      expect(source).toContain('var liveScrubPhase = scrubPhaseAt(t);');
      expect(source).toContain('orbit timeline landmarks');
      expect(source).toContain('scrubTimelineValue');
      expect(source).toContain('role: "status", "aria-live": paused ? "polite" : "off"');
      expect(source).toContain('"aria-valuetext": scrubBody ? fmt(scrubPhase, scrubPrecision) + " years into " + scrubBody.name + "\'s orbit; "');
    });
  });
  it('keeps DOM orbit readouts synchronized without remounting the canvas', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Keep the compact DOM readout synchronized without triggering a React tree');
      expect(source).toContain('liveNow - cv._orreryLiveDomLast >= 180');
      expect(source).toContain('orrery-live-distance');
      expect(source).toContain('orrery-live-speed');
      expect(source).toContain('orrery-live-phase');
      expect(source).toContain('id: "orrery-live-selected-summary"');
      expect(source).toContain('setLiveText("orrery-live-selected-summary"');
      expect(source).toContain('orrery-live-kepler-cue');
      expect(source).toContain('var radialPositionRatio = clamp((pos.r - peri) / Math.max(0.000001, aph - peri), 0, 1);');
      expect(source).toContain('id: "orrery-live-orbit-position-meter"');
      expect(source).toContain('id: "orrery-live-orbit-position-marker"');
      expect(source).toContain('id: "orrery-live-orbit-position"');
      expect(source).toContain('var liveRadialPositionRatio = clamp((livePos.r - livePerihelion) / Math.max(0.000001, liveAphelion - livePerihelion), 0, 1);');
      expect(source).toContain('livePositionMarker.style.left = (liveRadialPositionRatio * 100) + "%";');
      expect(source).toContain('ariaDescribedBy: "orrery-canvas-help orrery-model-scale-note orrery-hover-summary orrery-stage-key orrery-stage-tip" + (canvasSelectedBody ? " orrery-stage-readout" : "")');
      expect(source).toContain('id: "orrery-stage-key"');
      expect(source).toContain('id: "orrery-stage-tip"');
      expect(source).toContain('orrery-live-compare-secondary-speed');
      expect(source).toContain('id: "orrery-stage-readout"');
      expect(source).toContain('setLiveText("orrery-stage-readout-values"');
      expect(source).toContain('orrery-live-compare-primary-distance');
      expect(source).toContain('orrery-live-compare-secondary-distance');
      expect(source).toContain('compareMetric("Current distance"');
      expect(source).toContain('var describeComparison = function(primary, primaryPos, primarySpeed, secondary, secondaryPos, secondarySpeed)');
      expect(source).toContain('setLiveText("orrery-compare-interpretation", describeComparison(');
      expect(source).toContain('id: "orrery-compare-interpretation"');
      expect(source).toContain('orrery-live-timeline-value');
      expect(source).toContain('phaseInput.value = String(liveScrubPhase);');
      expect(source).toContain('id: liveId || undefined');
      expect(source).toContain('var timelineMarkIsActiveAt = function(mark, phase)');
      expect(source).toContain('if (mark.phase >= scrubPeriod) return scrubPeriod - phase <= tolerance;');
      expect(source).toContain('if (mark.phase === 0) return phase <= tolerance;');
      expect(source).toContain('id: "orrery-timeline-mark-" + idx');
      expect(source).toContain('"data-orrery-timeline-jump": idx');
      expect(source).toContain('setLiveTimelineState(liveMarkIdx, timelineMarkIsActiveAt(timelineMilestones[liveMarkIdx], liveScrubPhase));');
    });
  });  it('makes every orbit timeline landmark keyboard- and pointer-actionable', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var timelineJumpLabel = function(mark)');
      expect(source).toContain('timelineMilestones.map(function(mark, idx)');
      expect(source).toContain('setScrubPhase(mark.phase)');
      expect(source).toContain('"aria-label": "Jump to " + mark.label.toLowerCase() + " for " + scrubBody.name');
      expect(source).toContain('var timelineMarkIsActive = function(mark)');
      expect(source).toContain('timelineMarkIsActive(mark), function()');
      expect(source).toContain('btn("Reset view"');
      expect(source).toContain('orr_follow: null, orr_compare: null');
    });
  });  it('adds A/B orbital evidence snapshots and a live speed gauge', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var snapshotStore = d.orr_snapshots || {};');
      expect(source).toContain('var captureTime = timeRef.current;');
      expect(source).toContain('Save A');
      expect(source).toContain('Save B');
      expect(source).toContain('B minus A');
      expect(source).toContain('var snapshotEntries =');
      expect(source).toContain('live speed gauge');
      expect(source).toContain('var orbitalSpeedLabel =');
      expect(source).toContain('if (slot === "b" && !snapshotA) return;');
      expect(source).toContain('disabled: !snapshotA');
      expect(source).toContain('after saving snapshot A');
      expect(source).toContain('var evidenceStepLabel = !snapshotA');
      expect(source).toContain('Next: predict B');
      expect(source).toContain('Ready to record');
      expect(source).toContain('.orr-btn:disabled{cursor:not-allowed');
    });
  });
  it('turns A/B evidence into a prediction, explanation, and mission-log observation', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var predictionChoice = bodySnapshotState.prediction || "";');

      expect(source).toContain('var saveBDisabled = !snapshotA || !predictionChoice;');
      expect(source).toContain('snapshotA && (!snapshotB || !predictionChoice)');
      expect(source).toContain('after choosing a prediction');      expect(source).toContain('var buildPredictionResult = function(state)');
      expect(source).toContain('Predict B: will orbital speed be faster, slower, or about the same as A?');
      expect(source).toContain('value: "about the same"');
      expect(source).toContain('nearly the same distance can mean about the same speed');
      expect(source).toContain('Prediction supported');
      expect(source).toContain('Prediction revised');
      expect(source).toContain('Record observation');
      expect(source).toContain('addMissionEntry("🔮 Orrery observation: " + sb.name');
    });
  });  it('exports readable A/B orbital evidence for review', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var exportEvidence = function()');
      expect(source).toContain('Export evidence');
      expect(source).toContain('evidenceLines.join("\\n")');
      expect(source).toContain('orbital_evidence.txt');
      expect(source).toContain('Exported orbital evidence for');
    });
  });  it('announces core Orrery toggle states to assistive technology', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"aria-pressed": paused');
      expect(source).toContain('"aria-pressed": timelineMarkIsActive(mark)');
      expect(source).toContain('"aria-pressed": scaleMode === "teaching"');
      expect(source).toContain('"aria-pressed": zoomMode === "inner"');
      expect(source).toContain('"aria-pressed": showComets');
    });
});  it('explains playback speed in selected-world time', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var playbackBody = selBody ? OB.filter(function(body) { return body.id === selBody; })[0] : null;');
      expect(source).toContain('var formatPlaybackDuration = function(seconds)');
      expect(source).toContain('id: "orrery-playback-context"');
      expect(source).toContain('Select a world to see its real-time orbit length.');
    });
  });  it('honors reduced-motion preferences without removing orbital interaction', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var reduceMotion = false;');
      expect(source).toContain('reduceMotion: reduceMotion');
      expect(source).toContain('var visualTime = reduceMotion ? 0 : (timestamp || 0);');
      expect(source).toContain('var hoverPulse = reduceMotion ? 0 : Math.sin((timestamp || 0) * 0.004) * 1.5;');
      expect(source).toContain('if (props.reduceMotion) { cancelInertia(); return; }');
      expect(source).toContain('Reduced motion on · pulses and camera glides off');
      expect(source).toContain('reduced-motion mode keeps decorative effects still');
    });
  });
  it('keeps canvas hit testing and selection state aligned with optional-body visibility filters', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var isBodyVisibleInCanvas = function(body)');
      expect(source).toContain('if (body.type === "comet") return showComets;');
      expect(source).toContain('if (body.type === "dwarf") return showDwarfs;');
      expect(source).toContain('if (!isBodyVisibleInCanvas(b)) continue;');
      expect(source).toContain('var alreadySelected = (selBody === b.id);');
      expect(source).not.toContain('var alreadySelected = (st._selBodyId === b.id);');
      expect(source).toContain('var resetRequest = Number(d.orr_view_reset || 0);');
      expect(source).toContain('if (props.resetKey != null && st._resetKey !== props.resetKey)');
      expect(source).toContain('resetKey: resetRequest');
      expect(source).toContain('redrawKey: zoomMode + ":" + scaleMode + ":" + (reduceMotion ? "reduced" : "motion") + ":" + resetRequest');
      expect(source).toContain('function cancelCameraGlide()');
      expect(source).toContain('var cameraInputRef = React.useRef(props.onCameraInput);');
      expect(source).toContain('function interruptFollow()');
      expect(source).toContain('interruptFollow();');
      expect(source).toContain('onCameraInput: function() { if (followBodyId) upd("orr_follow", null); }');
      expect(source).toContain('cancelCameraGlide();');
      expect(source).toContain('var f = ev.deltaY');
      expect(source).toContain('cancelCameraGlide(); interruptFollow(); st.cx -= step;');
      expect(source).toContain('var nextVisible = !showComets;');
      expect(source).toContain('var nextVisible = !showDwarfs;');
      expect(source).toContain('var patch = { orr_showComets: nextVisible };');
      expect(source).toContain('var patch = { orr_showDwarfs: nextVisible };');
      expect(source).toContain('patch.orr_sel = null; patch.orr_follow = null; patch.orr_focus_body = null;');
      expect(source).toContain('patch.orr_compare = null;');
    });
  });

  it('keeps Orrery section-tab focus synchronized with keyboard navigation', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var focusTab = function(index)');
      expect(source).toContain('document.getElementById("orrery-tab-" + index)');
      expect(source).toContain('id: "orrery-tab-" + i');
      expect(source).toContain('var TAB_ARIA_LABELS = [');
      expect(source).toContain('"aria-label": TAB_ARIA_LABELS[i]');
      expect(source).toContain('var nextTab = null;');
      expect(source).toContain('if (nextTab !== null) { ev.preventDefault(); focusTab(nextTab); }');
      expect(source).toContain('var _activeKeplerLaw =');
      expect(source).toContain('upd("orreryKeplerSeen", seen.concat([_activeKeplerLaw]))');
      expect(source).toContain('function keplerLawIdForTab(index)');
      expect(source).toContain('function mergeKeplerLawSeen(current, lawId)');
      expect(source).toContain('"data-kepler-visited": lawVisited ? "true" : "false"');
      expect(source).toContain('var _challengeScore = Object.keys(d.orr_chc || {})');
      expect(source).toContain('var _liveSolvedKeys = Object.keys(d.orr_clc || {})');
      expect(source).toContain('upd("_chalScore", _challengeScore)');
      expect(source).toContain('upd("_liveSolved", solved)');
    });
  });
  it('prevents drag-release clicks and exposes canvas keyboard shortcuts', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('st.dragDistance = 0;');
      expect(source).toContain('if (st.dragDistance > 6) {');
      expect(source).toContain('if (st.suppressClick) { st.suppressClick = false; return; }');
      expect(source).toContain('function onCancel()');
      expect(source).toContain('window.addEventListener("pointercancel", onCancel);');
      expect(source).toContain('function cancelInertia()');
      expect(source).toContain('if (st.inertiaRaf) cancelAnimationFrame(st.inertiaRaf);');
      expect(source).toContain('st.inertiaRaf = requestAnimationFrame(inertiaStep);');
      expect(source).toContain('st.inertiaRaf = null;');
      expect(source).toContain('var keyboardInteractive = !!props.panZoom || !!props.onKeyboardInteract;');
      expect(source).toContain("'aria-keyshortcuts': keyboardInteractive ? (props.panZoom ? 'ArrowLeft ArrowRight ArrowUp ArrowDown + - Home 0 Enter Space Escape' : 'Enter Space Escape') : undefined");
      expect(source).toContain("if (key === 'Escape' && props.onEscape)");
      expect(source).toContain('onEscape: function() { updMulti({ orr_sel: null, orr_follow: null, orr_compare: null, orr_focus_body: null }); }');
      expect(source).toContain('Escape clears selection');
      expect(source).toContain('if (!nextBody) {');
      expect(source).toContain('Keyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selection');
      expect(source).toContain('type: "button",');
      expect(source).toContain('var ch_feedback = d.orr_chf || {};');
      expect(source).toContain('var liveFeedback = d.orr_clf || {};');
      expect(source).toContain('var liveSimulationTime = function()');
      expect(source).toContain('var currentOrbitalState = function(bodyId)');
      expect(source).toContain('var refTime = typeof orrTimeRef !== "undefined"');
      expect(source).toContain('speed: visViva(position.r, body.a)');
      expect(source).toContain('var liveClockStatus = paused');
      expect(source).toContain('id: "orrery-live-challenge-status"');
      expect(source).toContain('disabled: !paused');
      expect(source).toContain('Open Full Orrery focused on ');
      expect(source).toContain('var ORRERY_GUIDED_MISSION_IDS = [');
      expect(source).toContain("id: 'orrery_guided_3'");
      expect(source).toContain('d.orrery_explored_once === true');
      expect(source).toContain('id: "orrery-challenge-feedback"');
      expect(source).toContain('id: "orrery-live-challenge-feedback"');
      expect(source).toContain('"aria-invalid": !!ch_feedback[idx]');
      expect(source).toContain('"aria-invalid": !!liveFeedback[liveIdx]');
      expect(source).toContain('Choose faster, slower, or about the same...');
      expect(source).toContain('if (!paused) { if (addToast) addToast("Pause the clock before predicting."); return; }');
      expect(source).toContain('"aria-disabled": !paused, disabled: !paused');
      expect(source).toContain('id: "orrery-guided-objective"');
      expect(source).toContain('id: "orrery-guided-feedback"');
      expect(source).toContain('orrery-guided-objective" + (guidedRecord.correct === false ? " orrery-guided-feedback" : "")');
      expect(source).toContain('var canvasSelectionCue =');
      expect(source).toContain('var canvasViewLabel = zoomMode === "inner"');
      expect(source).toContain('viewPresetKey: zoomMode');
      expect(source).toContain('orr_zoom: "full"');
      expect(source).toContain('if (props.viewPresetKey != null && st._viewPresetKey !== props.viewPresetKey)');
      expect(source).toContain("'data-view-preset': props.viewPresetKey || undefined");
      expect(source).toContain('Current view is " + canvasViewLabel');
      expect(source).toContain('role: "status", "aria-live": "polite", "aria-atomic": "true"');
      expect(source).toContain('ariaDescribedBy: "orrery-canvas-help orrery-model-scale-note orrery-hover-summary orrery-stage-key orrery-stage-tip" + (canvasSelectedBody ? " orrery-stage-readout" : "")');
      expect(source).toContain('id: "orrery-canvas-help"');
      expect(source).toContain('var modelScaleNote = scaleMode === "relative"');
      expect(source).toContain('id: "orrery-model-scale-note"');
      expect(source).toContain('id: "orrery-hover-summary"');
      expect(source).toContain('cv._orreryHoverSummaryKey');
      expect(source).toContain('var bufferChanged = cv._dpr !== dpr');
      expect(source).toContain('var keyboardInteractRef = React.useRef(props.onKeyboardInteract);');
      expect(source).toContain('if (keyboardInteractRef.current) keyboardInteractRef.current(st);');
      expect(source).toContain('var homeRef = React.useRef(props.onHome);');
      expect(source).toContain('st._zoomAnim = false; st._followBody = null;');
      expect(source).toContain('onHome: function() { upd("orr_follow", null); }');
      expect(source).toContain('var keyboardSelectNextBody = function()');
      expect(source).toContain('onKeyboardInteract: keyboardSelectNextBody');
      expect(source).toContain('key: "toggle-follow"');
      expect(source).toContain('"aria-pressed": followBodyId === sb.id');
      expect(source).toContain('"Follow " + sb.name + " with the camera"');
      expect(source).toContain('use the Follow camera toggle in the selected-world card');
      expect(source).toContain('use Follow camera to keep it centered');
      expect(source).toContain('select a world, then use Follow camera');
      expect(source).toContain('Enter or Space selects the next world');
      expect(source).toContain('cv._logicalWidth = props.width;');
      expect(source).toContain('cv._nebulaCache = null;');
      expect(source).toContain('function touchDistance(ids)');
      expect(source).toContain('st.pinchActive = true;');
      expect(source).toContain('var nextPinchDistance = touchDistance(pinchIds);');
      expect(source).toContain('touchAction: props.panZoom ? "none" : "auto"');
      expect(source).toContain('if (!isFinite(st.cx) || !isFinite(st.cy) || !isFinite(st.scale))');
      expect(source).toContain('function scheduleFrame()');
      expect(source).toContain('if (!running || document.hidden || raf.current) return;');
      expect(source).toContain('function onCanvasVisibilityChange()');
      expect(source).toContain('document.addEventListener("visibilitychange", onCanvasVisibilityChange);');
      expect(source).toContain('document.removeEventListener("visibilitychange", onCanvasVisibilityChange);');
      expect(source).toContain('var insideCanvas = ev.clientX >= rect.left');
      expect(source).toContain('if (insideCanvas) {');
      expect(source).toContain('st.hoverX = null;');
    });
  });  it('defines drone display scale before drawing POI distance labels', () => {

    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const scaleIndex = source.indexOf('var scaleFactor = isOcean ? 100 : isGas ? 100 : 50;');
      const labelIndex = source.indexOf("var distLabel = Math.round(Math.sqrt(poi.x * poi.x + poi.z * poi.z) * scaleFactor) + 'm from origin';");

      expect(scaleIndex, `${filePath} should define scaleFactor`).toBeGreaterThan(-1);
      expect(labelIndex, `${filePath} should draw POI distance labels`).toBeGreaterThan(-1);
      expect(scaleIndex, `${filePath} must initialize scaleFactor before POI labels to avoid NaNm`).toBeLessThan(labelIndex);
    });
  });

  it('wires drone mode mission pedagogy and vehicle feedback', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Drone Field Journal');
      expect(source).toContain('function buildDroneCER');
      expect(source).toContain('function recordSampleEvidence');
      expect(source).toContain('Signal triangulation');
      expect(source).toContain('function updatePlotterRouteProgress');
      expect(source).toContain("recordDroneJournal('Scan'");
      expect(source).toContain("recordDroneJournal('Photo'");
      expect(source).toContain("recordDroneJournal('Navigation'");
      expect(source).toContain("recordDroneJournal('Route'");
      expect(source).toContain('route: false');
      expect(source).toContain('var thrustTrailMesh = null;');
      expect(source).toContain('currentHeadingLabel = dirLabel;');
      expect(source).toContain('J journal');
      expect(source).toContain('P plot');
      expect(source).toMatch(/(?:roverGroup\.rotation\.x|var targetRoverPitch) = Math\.max\(-0\.22/);
    });
  });

  it('provides accessible pointer controls for the core drone science workflow', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const shortcutListener = "canvasEl.addEventListener('keydown', onDroneShortcutKeydown);";
      const shortcutCleanup = "canvasEl.removeEventListener('keydown', onDroneShortcutKeydown);";

      expect(source).toContain('"data-drone-vehicle-mode":');
      expect(source).toContain('role: "application"');
      expect(source).toContain('tabIndex: 0');
      expect(source).toContain('"aria-label": ((sel &&');
      expect(source).toContain("actionDock.setAttribute('data-drone-action-dock', 'true');");
      expect(source).toContain("actionDock.setAttribute('role', 'group');");
      expect(source).toContain("button.type = 'button';");
      expect(source).toContain("button.setAttribute('data-drone-command', action.key);");
      expect(source).toContain("button.setAttribute('aria-keyshortcuts', action.key.toUpperCase());");
      expect(source).toContain('function dispatchDroneCommand(action)');
      expect(source).toContain("{ key: 'g', label: 'Scan'");
      expect(source).toContain("{ key: 'f', label: isFluid ? 'Sample' : 'Collect'");
      expect(source).toContain("{ key: 'j', label: 'Journal'");
      expect(source).toContain("{ key: 'n', label: 'Navigate'");
      expect(source).toContain(shortcutListener);
      expect(source).toContain(shortcutCleanup);
      expect(source).toContain('if (actionDock.parentElement) actionDock.parentElement.removeChild(actionDock);');
      expect(source.indexOf(shortcutListener)).toBeLessThan(source.indexOf(shortcutCleanup));
    });
  });

  it('shows mode-specific live science relationships without covering the altitude gauge', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const focusDefinition = source.indexOf('function updateDroneScienceFocus(altitude)');
      const focusUpdate = source.indexOf('updateDroneScienceFocus(altitude);');

      expect(source).toContain('"aria-describedby": "hud-science-focus"');
      expect(source).toContain("var scienceQuestion = isOcean ? 'How do pressure and light change as depth increases?'");
      expect(source).toContain('id="hud-science-focus" role="note"');
      expect(source).toContain('id="hud-science-reading"');
      expect(source).toContain("scienceReadingEl.textContent = 'Depth '");
      expect(source).toContain('oceanScienceZone.lightLevel');
      expect(source).toContain("scienceReadingEl.textContent = 'Relative altitude '");
      expect(source).toContain('gasScienceZone.windSpeed');
      expect(source).toContain("scienceReadingEl.textContent = 'Elevation '");
      expect(source).toContain('var slopeDegrees = roverGroup');
      expect(source).toContain("announceToSR('Entered ' + curOceanZone");
      expect(source).toContain("announceToSR('Entered ' + curZoneName");
      expect(source).toContain("top:62px;right:48px");
      expect(source).toContain("width:min(204px,calc(100% - 64px))");
      expect(source).not.toContain("top:62px;right:8px;z-index:14");
      expect(focusDefinition, filePath + ' should define the science updater').toBeGreaterThan(-1);
      expect(focusUpdate, filePath + ' should update the science reading').toBeGreaterThan(-1);
      expect(focusDefinition).toBeLessThan(focusUpdate);
    });
  });

  it('turns consecutive environment scans into comparative evidence', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const comparisonDefinition = source.indexOf('function buildScanComparison(previous, current)');
      const comparisonUse = source.indexOf('buildScanComparison(previousScanSnapshot, scanSnapshot)');

      expect(source).toContain('var previousScanSnapshot = null;');
      expect(source).toContain("return 'Baseline saved. ' + nextStep;");
      expect(source).toContain("current.mode === 'ocean'");
      expect(source).toContain("current.mode === 'gas'");
      expect(source).toContain('Compared with the prior terrain site');
      expect(source).toContain("scanSnapshot = { mode: 'ocean'");
      expect(source).toContain("scanSnapshot = { mode: 'gas'");
      expect(source).toContain("scanSnapshot = { mode: 'surface'");
      expect(source).toContain('Comparison evidence');
      expect(source).toContain("scanEvidence += (scanEvidence ? ' Comparison: ' : '') + scanComparison;");
      expect(source).toContain('previousScanSnapshot = scanSnapshot;');
      expect(source).toContain("announceToSR('Scan complete. ' + scanComparison");
      expect(source).toContain('var scanDismissTimer = null;');
      expect(source).toContain('var scanAnnounceTimer = null;');
      expect(source).toContain('if (scanDismissTimer) clearTimeout(scanDismissTimer);');
      expect(source).toContain('if (scanAnnounceTimer) clearTimeout(scanAnnounceTimer);');
      expect(comparisonDefinition, filePath + ' should define scan comparisons').toBeGreaterThan(-1);
      expect(comparisonUse, filePath + ' should use scan comparisons').toBeGreaterThan(-1);
      expect(comparisonDefinition).toBeLessThan(comparisonUse);
    });
  });

  it('requires a distinct second scan for mission credit and updates the Scan action', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('compared: false');
      expect(source).toContain('var completedScanComparisons = 0;');
      expect(source).toContain('missionStats.compared,');
      expect(source).toContain("'Compare two environment scans'");
      expect(source).toContain("'Press G to save a baseline sensor reading'");
      expect(source).toContain("'Baseline saved; move to a different site or layer and press G again'");
      expect(source).toContain('var hasDistinctScanSite = hasComparableBaseline');
      expect(source).toContain('Math.abs(scanSnapshot.level - previousScanSnapshot.level) >= 10');
      expect(source).toContain('Math.abs(scanSnapshot.slope - previousScanSnapshot.slope) >= 0.2');
      expect(source).toContain('if (hasDistinctScanSite)');
      expect(source).toContain("markMissionStat('compared');");
      expect(source).toContain('completedScanComparisons += 1;');
      expect(source).toContain('Comparative scan completed:');
      expect(source).toContain('Mission objective complete: two environments compared');
      expect(source).toContain("if (action.key === 'g')");
      expect(source).toContain("scanActionLabel.textContent = 'Compare';");
      expect(source).toContain("'Compare with previous scan, keyboard shortcut G'");
    });
  });
  it('keeps a bounded accessible evidence trail across recent scans', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const historyDefinition = source.indexOf('function buildScanHistoryHTML(history)');
      const historyUse = source.indexOf('scanHTML += buildScanHistoryHTML(scanHistory);');
      const reviewDelay = source.indexOf('Auto-dismiss after 7 seconds so students can review the evidence trail');

      const reviewTimeout = source.indexOf('}, 7000);', reviewDelay);
      expect(source).toContain('var scanHistory = [];');
      expect(source).toContain('var scanSequence = 0;');
      expect(source).toContain('scanSnapshot.scanNumber = scanSequence;');
      expect(source).toContain('scanHistory.push(Object.assign({}, scanSnapshot));');
      expect(source).toContain('if (scanHistory.length > 4) scanHistory.shift();');
      expect(source).toContain('data-scan-evidence-trail="true"');
      expect(source).toContain('<table aria-label="');
      expect(source).toContain('<th scope="col"');
      expect(source).toContain("['Scan', 'Depth', 'Pressure', 'Light']");
      expect(source).toContain("['Scan', 'Altitude', 'Pressure', 'Wind']");
      expect(source).toContain("['Scan', 'Elevation', 'Slope', 'Landmark']");
      expect(source).toContain('max-height:82%;overflow-y:auto;pointer-events:auto');
      expect(reviewTimeout).toBeGreaterThan(reviewDelay);
      expect(reviewTimeout - reviewDelay).toBeLessThan(1000);
      expect(historyDefinition).toBeGreaterThan(-1);
      expect(historyUse).toBeGreaterThan(-1);
      expect(reviewDelay).toBeGreaterThan(-1);
      expect(historyDefinition).toBeLessThan(historyUse);
    });
  });

  it('defers every canvas resize out of ResizeObserver delivery to avoid loop errors', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Each observer coalesces into a single rAF instead of resizing synchronously.
      expect(source).toContain('let solarResizePending = false;');
      expect(source).toContain('var planetResizePending = false;');
      expect(source).toContain('var droneResizePending = false;');
      // Drone resize skips no-op notifications and never lets Three.js write
      // inline px styles (which would re-trigger the observer).
      expect(source).toContain('function resizeDroneCanvas(forceResize)');
      expect(source).toContain('if (!forceResize && w === _lastDroneSizeW && h2 === _lastDroneSizeH && isFS === _lastDroneSizeFS) return;');
      expect(source).toContain('renderer.setSize(w, h2, false);');
      // Fullscreen transitions force a resize through a named, removable handler.
      expect(source).toContain('function onDroneFullscreenChange() { resizeDroneCanvas(true); }');
      // The duplicate drone observer is gone; cleanup targets the surviving one.
      expect(source).not.toContain('var ro3d = new ResizeObserver');
      expect(source).toContain('canvasEl._droneRO = droneRO;');
    });
  });

  it('keeps photo evidence with journal entries and offers a journal export', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // The captured thumbnail reaches the journal entry (session-local copy only,
      // so persisted state stays text-sized).
      expect(source).toContain('function recordDroneJournal(kind, title, observation, cer, silent, photoThumb)');
      expect(source).toContain('droneJournalEntries.unshift(photoThumb ? Object.assign({ photoThumb: photoThumb }, entry) : entry);');
      expect(source).toContain('true, thumbDataUrl);');
      expect(source).toContain("entry.photoThumb ? '<img src=");
      // Export button downloads a standalone HTML evidence log.
      expect(source).toContain('data-journal-export="true"');
      expect(source).toContain('function exportDroneJournal()');
      expect(source).toContain("_field_journal_' + new Date().toISOString().slice(0, 10) + '.html'");
      expect(source).toContain("addMissionEntry('\\uD83D\\uDCD3 Exported field journal for ' + sel.name);");
    });
  });

  it('adds drone visual polish gated by prefers-reduced-motion', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var droneReduceMotion = false;');
      // Twinkling star layers on dark-sky worlds, static when motion is reduced.
      expect(source).toContain('var twinkleLayers = [];');
      expect(source).toContain('twMesh._twPhase = tl * Math.PI * 0.5;');
      expect(source).toContain('if (!droneReduceMotion && twinkleLayers.length)');
      // Falling frost on ice worlds, skipped entirely when motion is reduced.
      expect(source).toContain("sel.terrainType === 'iceworld' && !isOcean && !droneReduceMotion");
      expect(source).toContain('frostFall.geometry.attributes.position.needsUpdate = true;');
      // Sun glare overlay tracks the sun's screen position on rover worlds.
      expect(source).toContain('id="drone-sun-glare"');
      expect(source).toContain("var sunGlareEl = screenFx.querySelector('#drone-sun-glare');");
      expect(source).toContain('camera.getWorldDirection(_glareCamDir);');
    });
  });

  it('runs a predict-observe-explain loop through the scanner and keeps science claims calibrated', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // POE loop: per-mode prediction variable, offer UI, outcome block, journal record.
      expect(source).toContain('function predictionVariableFor(mode)');
      expect(source).toContain('data-scan-predict="true"');
      expect(source).toContain('data-scan-prediction-outcome="true"');
      expect(source).toContain("recordDroneJournal('Prediction'");
      // Wrong predictions are framed as model revision, and XP rewards testing, not guessing right.
      expect(source).toContain('revising a model when new evidence disagrees is exactly how science works');
      expect(source).toContain('XP for testing it');
      expect(source).toContain("'A prediction tested against a new measurement shows whether my model of this world works.'");
      // Science accuracy: apparent sun size ~ 1/AU; hedged diamond rain; Venus acid virga; modern trench depth.
      expect(source).toContain('Mercury: 2.6');
      expect(source).toContain('Neptune: 0.033');
      expect(source).toContain('Lab experiments suggest diamond rain falls inside Uranus and Neptune.');
      expect(source).toContain('never survives to this scorching surface');
      expect(source).toContain('about 10,935 m');
      expect(source).not.toContain('Diamond rain is real');
      expect(source).not.toContain('11,034 m');
      expect(source).not.toContain('sizzle on the hull');
    });
  });

  it('detects mode-specific patterns after three readings and adds them to the evidence', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const patternDefinition = source.indexOf('function buildScanPattern(history)');
      const patternUse = source.indexOf('var scanPattern = buildScanPattern(scanHistory);');

      expect(source).toContain('function scanMeasurementDirection(startValue, endValue, tolerance)');
      expect(source).toContain('if (!history || history.length < 3) return null;');
      expect(source).toContain("title: 'Depth pattern'");
      expect(source).toContain("title: 'Atmosphere pattern'");
      expect(source).toContain("title: 'Terrain pattern'");
      expect(source).toContain('data-scan-pattern="true" role="note" aria-label="Pattern analysis"');
      expect(source).toContain('This describes the sampled readings; it does not by itself prove cause.');
      expect(source).toContain("if (scanPattern) scanEvidence += ' Pattern analysis: ' + scanPattern.summary;");
      expect(source).toContain("announceToSR('Scan complete. ' + scanComparison + (scanPattern ? ' ' + scanPattern.summary : ''))");
      expect(patternDefinition).toBeGreaterThan(-1);
      expect(patternUse).toBeGreaterThan(-1);
      expect(patternDefinition).toBeLessThan(patternUse);
    });
  });
});
