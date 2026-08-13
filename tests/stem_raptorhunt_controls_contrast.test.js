import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CANONICAL = 'stem_lab/stem_tool_raptorhunt.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js';

function source(file = CANONICAL) {
  return readFileSync(file, 'utf8');
}

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function flightForward(yaw) {
  return { x: Math.sin(yaw), z: -Math.cos(yaw) };
}

function modelForward(yaw) {
  const modelYaw = Math.PI - yaw;
  return { x: Math.sin(modelYaw), z: Math.cos(modelYaw) };
}

describe('Raptor Hunt steering and model heading regressions', () => {
  it('keeps the authored +Z model nose aligned with the flight vector', () => {
    const text = source();
    expect(text).toContain('var RAPTOR_MODEL_FORWARD_OFFSET = Math.PI;');
    expect(text).toContain('return RAPTOR_MODEL_FORWARD_OFFSET - yaw;');
    expect(text).toContain('modelYawForFlightHeading(raptor.yaw)');

    [0, Math.PI / 4, Math.PI, Math.PI * 1.75].forEach((yaw) => {
      const flight = flightForward(yaw);
      const model = modelForward(yaw);
      expect((flight.x * model.x) + (flight.z * model.z)).toBeCloseTo(1, 10);
    });
  });

  it('maps A/left to negative yaw and D/right to positive yaw', () => {
    const text = source();
    expect(text).toContain("var turnInput = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);");
    expect(text).toContain('raptor.yaw += turnInput * 1.5 * dt;');
    expect(text).toContain('raptor.yaw += dx * touchYawSensitivity;');
    expect(text).not.toContain("if (keys['a']) raptor.yaw += 1.5 * dt;");
    expect(text).not.toContain("if (keys['d']) raptor.yaw -= 1.5 * dt;");

    const turn = (a, d) => (d ? 1 : 0) - (a ? 1 : 0);
    expect(turn(true, false)).toBe(-1);
    expect(turn(false, true)).toBe(1);
    expect(turn(true, true)).toBe(0);

    const initialYaw = Math.PI;
    expect(flightForward(initialYaw - 0.1).x).toBeGreaterThan(0);
    expect(flightForward(initialYaw + 0.1).x).toBeLessThan(0);
  });

  it('adds directional depth cues with species-aware, dive-safe chase framing', () => {
    const text = source();
    expect(text).toContain('new THREE.HemisphereLight');
    expect(text).toContain('var rimLight = new THREE.DirectionalLight');
    expect(text).toMatch(/var raptorVisualRadius\s*=/);
    expect(text).toMatch(/var currentChaseDistance\s*=/);
    expect(text).toMatch(/function flightForwardVector\(reuseTarget\)/);
    expect(text).toContain('flightForwardVector(flightForward)');
    expect(text).toMatch(/camTargetX\s*=\s*raptor\.x\s*-\s*flightForward\.x\s*\*\s*camDist/);
    expect(text).toMatch(/camTargetY\s*=\s*raptor\.y\s*-\s*flightForward\.y\s*\*\s*camDist\s*\+\s*camHeight/);
    expect(text).toMatch(/camTargetZ\s*=\s*raptor\.z\s*-\s*flightForward\.z\s*\*\s*camDist/);
    expect(text).toContain('visualBank: 0');
    expect(text).toContain('var bankTarget =');
    expect(text).toMatch(/var visualTurnRate\s*=/);
    expect(text).toContain('speedLines.quaternion.copy(camera.quaternion)');
  });
});

describe('Raptor Hunt contrast regressions', () => {
  it('uses AA secondary and alert text on fixed dark and light surfaces', () => {
    expect(contrast('#94a3b8', '#1e293b')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#475569', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#fca5a5', '#0f172a')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#64748b', '#1e293b')).toBeGreaterThanOrEqual(3);

    const text = source();
    expect(text).toContain('[data-raptorhunt-root="true"] .text-slate-500 { color: #94a3b8 !important; }');
    expect(text).toContain('[data-raptorhunt-root="true"] .bg-white .text-slate-500 { color: #475569 !important; }');
    expect(text).toContain('[class*="border-slate-700"]');
    expect(text).toContain('border-color: #64748b !important;');
    expect(text).toContain("'data-raptorhunt-root': 'true'");
    expect(text).not.toContain('border border- active:scale');
    expect(text).not.toContain("activeCategory.color + 'transition-colors");
    expect(text).not.toContain('border border-slate-700/40 opacity-40');
  });

  it('keeps every category selected state above 4.5:1 with white text', () => {
    const selectedStops = [
      '#b45309', '#92400e',
      '#0e7490', '#155e75',
      '#047857', '#065f46',
      '#0f766e', '#115e59',
      '#4d7c0f', '#3f6212',
      '#7e22ce', '#6b21a8',
      '#4338ca', '#3730a3',
      '#1d4ed8', '#1e40af',
      '#be123c', '#9f1239',
    ];
    selectedStops.forEach((background) => {
      expect(contrast('#ffffff', background)).toBeGreaterThanOrEqual(4.5);
    });

    const cardBorders = [
      '#fbbf24', '#22d3ee', '#34d399', '#2dd4bf', '#a3e635',
      '#c084fc', '#818cf8', '#60a5fa', '#fb7185',
    ];
    cardBorders.forEach((border) => {
      expect(contrast(border, '#1e293b')).toBeGreaterThanOrEqual(3);
    });

    const text = source();
    ['amber', 'cyan', 'emerald', 'teal', 'lime', 'purple', 'indigo', 'blue', 'rose'].forEach((color) => {
      expect(text).toContain(`from-${color}-700 to-${color}-800 text-white shadow`);
      expect(text).toContain(`border-${color}-400 hover:border-${color}-300`);
    });
  });

  it('keeps the deploy mirror byte-identical to the canonical source', () => {
    expect(source(MIRROR)).toBe(source());
  });
});
