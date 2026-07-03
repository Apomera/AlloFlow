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
});
