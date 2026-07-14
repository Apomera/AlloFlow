import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOLAR_SYSTEM_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'prismflow-deploy/public/stem_lab/stem_tool_solarsystem.js',
];

describe('solar system main 3D canvas loop', () => {
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
});
