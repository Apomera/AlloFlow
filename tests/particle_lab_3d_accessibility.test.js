import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOOL_PATHS = [
  'stem_lab/stem_tool_particlelab3d.js',
  'prismflow-deploy/public/stem_lab/stem_tool_particlelab3d.js',
];

describe('Particle Lab 3D interaction surface accessibility contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');

  it('puts focus and interactive semantics on the actual canvas', () => {
    expect(source).toContain("h('canvas', { ref: canvasRef, tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D particle chamber'");
    expect(source).toContain("'aria-describedby': 'particle-chamber-help'");
    expect(source).toContain("'aria-keyshortcuts': 'Space R T V E M G C L F H ? Escape'");
    expect(source).toContain('onKeyDown: onLabKey');
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain('focus-visible:outline-cyan-200');
    expect(source).not.toContain("h('div', { tabIndex: 0, role: 'application'");
  });

  it('scopes single-character shortcuts to the focused canvas', () => {
    expect(source).toContain('function onLabKey(event)');
    expect(source).toContain('onKeyDown: onLabKey');
    expect(source).not.toContain("window.addEventListener('keydown', onLabKey)");
    expect(source).not.toContain("window.removeEventListener('keydown', onLabKey)");
    expect(source).toContain('Shortcuts work only while the particle chamber has keyboard focus.');
  });

  it('provides keyboard alternatives for pointer particle selection and camera dragging', () => {
    expect(source).toContain('function selectParticle(nextValue)');
    expect(source).toContain("id: 'particle-trace-selector', type: 'number'");
    expect(source).toContain("htmlFor: 'particle-trace-selector'");
    expect(source).toContain('keyboard users can use the labeled particle selector, camera views, and chamber shortcuts.');
    expect(source).toContain("role: 'group', 'aria-label': 'Camera views'");
    expect(source).toContain("setCameraShot('hero')");
    expect(source).toContain("setCameraShot('top')");
    expect(source).toContain("setCameraShot('close')");
  });

  it('gives the shortcuts dialog complete focus lifecycle and safe dismissal', () => {
    expect(source).toContain("role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'particle-keys-title'");
    expect(source).toContain("'aria-describedby': 'particle-keys-description'");
    expect(source).toContain('if (closeButton) closeButton.focus()');
    expect(source).toContain("if (event.key === 'Escape' || event.key === '?')");
    expect(source).toContain("if (event.key !== 'Tab' || !dialog) return");
    expect(source).toContain('function onStageKeyDown(event)');
    expect(source).toContain('onKeyDown: onStageKeyDown');
    expect(source).toContain('restoreKeysFocus()');
    expect(source).toContain("'aria-haspopup': 'dialog'");
  });

  it('removes persistent 7, 8, and 9 pixel utility text and sizes compact buttons', () => {
    expect(source).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(source).toContain("min-h-6 rounded px-2 py-1 text-[10px]");
    expect(source).toContain("min-h-11 w-full rounded-lg");
  });

  it('fullscreen always works: native API with webkit prefixes plus a CSS immersive fallback', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(tool).toContain('stage.requestFullscreen || stage.webkitRequestFullscreen');
      expect(tool).toContain('document.exitFullscreen || document.webkitExitFullscreen');
      expect(tool).toContain('document.fullscreenElement || document.webkitFullscreenElement');
      expect(tool).toContain("document.addEventListener('webkitfullscreenchange', onFullscreenChange)");
      expect(tool).toContain('function enterCssFullscreen()');
      expect(tool).toContain('.catch(function () { enterCssFullscreen(); })');
      expect(tool).toContain('document.fullscreenEnabled !== false');
      expect(tool).toContain("zIndex: 99990");
      expect(tool).toContain("document.body.style.overflow = 'hidden'");
      expect(tool).toContain('document.body.style.overflow = previousOverflow');
      expect(tool).not.toContain('Fullscreen is not available in this browser.');
    });
  });

  it('the HUD remains recoverable by key, button, and floating control', () => {
    expect(source).toContain("event.key === 'h' || event.key === 'H'");
    expect(source).toContain("'aria-label': 'Hide the simulation controls. Press H to show them again.'");
    expect(source).toContain("'Show controls (H)'");
    expect((source.match(/showHud && h\('div'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('Simulation controls hidden. Press H');
  });

  it('documents every chamber shortcut', () => {
    ['Run or pause the simulation', 'Reset the chamber', 'Velocity vector arrows',
     'Diffusion membrane', 'Gravity field', 'Follow the traced particle',
     'immersive view where fullscreen is blocked', 'Hide or show the simulation controls',
     'Open or close this panel', 'exit the immersive view'].forEach((desc) => {
      expect(source).toContain(desc);
    });
  });

  it('loads its 3D engine through the shared resilient loader with error UI and Retry', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(tool).toContain('window.StemLab.ensureThree({ orbit: true, orbitRequired: true })');
      expect(tool).toContain("'3D engine unavailable'");
      expect(tool).toContain('setLoadAttempt(function (a) { return a + 1; })');
      expect(tool).toContain('School network filters sometimes block CDNs');
      expect(tool).not.toContain('script.onload = loadOrbit');
      expect(tool).not.toContain('three.min.js');
    });
  });

  it('keeps the deploy mirror byte-identical', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});

describe('STEM Lab Three.js loading — single canonical path (sweep)', () => {
  const { readdirSync } = require('node:fs');

  it('no tool loads Three.js on its own: only the host module references the CDN', () => {
    const toolFiles = readdirSync(resolve(process.cwd(), 'stem_lab'))
      .filter((f) => f.startsWith('stem_tool_') && f.endsWith('.js'));
    expect(toolFiles.length).toBeGreaterThan(100); // the sweep really scanned the lab
    const offenders = toolFiles.filter((f) =>
      readFileSync(resolve(process.cwd(), 'stem_lab', f), 'utf8').includes('three.min.js'));
    expect(offenders).toEqual([]);
    // the host keeps exactly one canonical reference (inside ensureThree)
    const moduleSource = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
    expect((moduleSource.match(/three\.min\.js/g) || []).length).toBe(2); // cdnjs + jsDelivr fallback
    expect(moduleSource).toContain('ensureThree: function (opts)');
  });

  it('every converted tool calls the shared loader', () => {
    const converted = ['aquaculture', 'artstudio', 'cephalopodlab', 'coasterlab', 'dinolab',
      'fisherlab', 'flightsim', 'galaxy', 'geo', 'geosandbox', 'molecule', 'moonmission',
      'particlelab3d', 'raptorhunt', 'roadready', 'solarsystem', 'spacestation', 'weldlab'];
    converted.forEach((slug) => {
      const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_' + slug + '.js'), 'utf8');
      expect(source, slug + ' should use the shared loader').toContain('window.StemLab.ensureThree(');
    });
  });

  it('the test harness stubs the loader API so tool effects cannot crash under jsdom', () => {
    const harness = readFileSync(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js'), 'utf8');
    expect(harness).toContain('loadScriptResilient: function () { return new Promise(function () {}); }');
    expect(harness).toContain('ensureThree: function () { return new Promise(function () {}); }');
  });
});

describe('STEM Lab host 3D loader resilience (stem_lab_module.js)', () => {
  const MODULE_PATHS = [
    'stem_lab/stem_lab_module.js',
    'prismflow-deploy/public/stem_lab/stem_lab_module.js',
  ];

  it('exposes a shared resilient script loader on the StemLab registry', () => {
    MODULE_PATHS.forEach((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(source).toContain('loadScriptResilient: function (urls, opts)');
      expect(source).toContain('window.__stemScriptPromises');
      // cache cleared on total failure so a retry starts fresh
      expect(source).toContain('if (cacheKey) cache[cacheKey] = null; throw error;');
    });
  });

  it('the host Three.js path uses the helper with fallback CDNs and stays retryable', () => {
    const source = readFileSync(resolve(process.cwd(), MODULE_PATHS[0]), 'utf8');
    expect(source).toContain('window.StemLab.ensureThree({ orbit: true, failMessage:');
    expect(source).toContain('ensureThree: function (opts)');
    expect(source).toContain("cacheKey: 'three-core'");
    expect(source).toContain("cacheKey: 'three-orbit'");
    // OrbitControls failure stays non-fatal for host-driven tools
    expect(source).toContain('proceeding without orbit controls');
    // a retry lever exists in the effect deps
    expect(source).toContain('labToolData._threeAttempt');
    // success clears any stale error; failure names the school-network culprit
    expect(source).toContain('_threeLoaded: true, _threeLoadError: undefined');
    expect(source).toContain('School network filters sometimes block CDNs. The accessible 2D view remains available.');
  });

  it('the host module mirror matches root byte-for-byte', () => {
    const a = readFileSync(resolve(process.cwd(), MODULE_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), MODULE_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});
