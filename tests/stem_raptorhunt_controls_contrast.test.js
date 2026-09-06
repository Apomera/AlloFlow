import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CANONICAL = 'stem_lab/stem_tool_raptorhunt.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js';

// 3.26 MB per read; every gate below calls this. Read each file once so the
// shared worker does not spend its budget on repeat OneDrive I/O.
const sourceCache = new Map();
function source(file = CANONICAL) {
  if (!sourceCache.has(file)) sourceCache.set(file, readFileSync(file, 'utf8'));
  return sourceCache.get(file);
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

  it('keeps the guided-mode key chips readable over any sky the scene can render', () => {
    const text = source();

    // The chips float over the WebGL canvas, so their translucent panel composites
    // against rendered pixels, not against any CSS ancestor. Worst case is a white
    // sky; a night ground is the easy end. Measured in a browser at 12.13:1 and
    // 18.24:1 respectively, so this gate protects a real margin.
    const chipRule = text.match(/\.rh-flight-key\{[^}]*\}/);
    expect(chipRule).not.toBeNull();
    const panel = chipRule[0].match(/background:rgba\((\d+),(\d+),(\d+),([.\d]+)\)/);
    expect(panel).not.toBeNull();

    const layer = {
      r: Number(panel[1]), g: Number(panel[2]), b: Number(panel[3]), a: Number(panel[4]),
    };
    const composite = (base) => {
      const channels = [layer.r, layer.g, layer.b].map((channel, index) => (
        (channel * layer.a) + (base[index] * (1 - layer.a))
      ));
      return '#' + channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
    };
    const overWhite = composite([255, 255, 255]);
    const overBlack = composite([0, 0, 0]);

    // Chip label, the amber primary variant, and the key cap. All are under 18.66px
    // bold, so every one needs the 4.5:1 small-text ratio, not 3:1.
    const chipText = chipRule[0].match(/color:(#[0-9a-f]{6})/)[1];
    const primaryText = text.match(/\.rh-flight-key\[data-primary="true"\]\{[^}]*color:(#[0-9a-f]{6})/)[1];
    [chipText, primaryText].forEach((foreground) => {
      expect(contrast(foreground, overWhite)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(foreground, overBlack)).toBeGreaterThanOrEqual(4.5);
    });

    // The key cap paints its own opaque ground, so it does not depend on the sky.
    // relativeLuminance() slices two characters per channel, so #fff must be expanded
    // first or it silently yields NaN and the assertion passes nothing.
    const expand = (hex) => (hex.length === 4
      ? '#' + hex.slice(1).split('').map((channel) => channel + channel).join('')
      : hex);
    const cap = text.match(/\.rh-flight-key kbd\{[^}]*\}/)[0];
    expect(contrast(expand(cap.match(/color:(#[0-9a-f]{3,6})/)[1]), cap.match(/background:(#[0-9a-f]{6})/)[1]))
      .toBeGreaterThanOrEqual(4.5);
  });

  it('rings a cued control without relying on an opacity animation', () => {
    const text = source();
    // A pulse would fight reduced motion; the cue is a static ring instead.
    const cueRule = text.match(/\.rh-flight-btn\[data-raptor-cue="primary"\]\{[^}]*\}/);
    expect(cueRule).not.toBeNull();
    expect(cueRule[0]).toContain('box-shadow');
    expect(cueRule[0]).not.toContain('animation');
    expect(cueRule[0]).not.toContain('opacity');

    // Non-text UI boundaries need 3:1 against what they sit on (the button face).
    const buttonFace = text.match(/\.rh-flight-btn\{[^}]*background:(#[0-9a-f]{6})/)[1];
    ['primary', 'secondary'].forEach((state) => {
      const rule = text.match(new RegExp('\\.rh-flight-btn\\[data-raptor-cue="' + state + '"\\]\\{[^}]*\\}'))[0];
      const border = rule.match(/border-color:(#[0-9a-f]{6}|rgba\([^)]+\))/)[1];
      const hex = border.startsWith('#')
        ? border
        : (() => {
          const parts = border.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\)/);
          const alpha = Number(parts[4]);
          const base = [23, 32, 51]; // #172033, the button face the ring sits on
          return '#' + [1, 2, 3].map((index) => Math.round(
            (Number(parts[index]) * alpha) + (base[index - 1] * (1 - alpha)),
          ).toString(16).padStart(2, '0')).join('');
        })();
      expect(contrast(hex, buttonFace)).toBeGreaterThanOrEqual(3);
    });
  });

  it('keeps the deploy mirror byte-identical to the canonical source', () => {
    expect(source(MIRROR)).toBe(source());
  });
});
