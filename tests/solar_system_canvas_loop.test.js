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

  it('defines drone display scale before drawing POI distance labels', () => {
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
      expect(source).toContain('roverGroup.rotation.x = Math.max(-0.22');
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
