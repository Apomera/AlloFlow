import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOOL_PATHS = [
  'stem_lab/stem_tool_particlelab3d.js',
  'prismflow-deploy/public/stem_lab/stem_tool_particlelab3d.js',
];

describe('Particle Lab 3D interaction surface accessibility contract', () => {
  it('provides a focusable, described chamber with visible focus and shortcut metadata', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D particle chamber'");
    expect(source).toContain("'aria-keyshortcuts': 'Space R T V E M G C L F H'");
    expect(source).toContain('Click a particle to trace it, drag to orbit');
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain('focus-visible:outline-cyan-200');
    expect(source).toContain("role: 'img', 'aria-label': preset + ' particle simulation");
    expect(source).toContain("window.addEventListener('keydown', onLabKey)");
    expect(source).toContain("window.removeEventListener('keydown', onLabKey)");
  });

  it('fullscreen always works: native API with webkit prefixes plus a CSS immersive fallback', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      // vendor-prefixed API coverage (Safari/iPad)
      expect(source).toContain('stage.requestFullscreen || stage.webkitRequestFullscreen');
      expect(source).toContain('document.exitFullscreen || document.webkitExitFullscreen');
      expect(source).toContain('document.fullscreenElement || document.webkitFullscreenElement');
      expect(source).toContain("document.addEventListener('webkitfullscreenchange', onFullscreenChange)");
      // the fallback engages when the API is missing, disabled, or rejects
      expect(source).toContain('function enterCssFullscreen()');
      expect(source).toContain('.catch(function () { enterCssFullscreen(); })');
      expect(source).toContain('document.fullscreenEnabled !== false');
      // css mode: fixed-position stage + body scroll lock, restored on exit
      expect(source).toContain("zIndex: 99990");
      expect(source).toContain("document.body.style.overflow = 'hidden'");
      expect(source).toContain('document.body.style.overflow = previousOverflow');
      // the stale always-fails toast is gone
      expect(source).not.toContain('Fullscreen is not available in this browser.');
    });
  });

  it('the HUD can be hidden and recovered three ways (H key, button, floating pill)', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');
    expect(source).toContain("event.key === 'h' || event.key === 'H'");
    expect(source).toContain("'aria-label': 'Hide the simulation controls. Press H to show them again.'");
    expect(source).toContain("'Show controls (H)'");
    // hiding gates the preset row, chamber-controls overlay, and control bar
    const gated = (source.match(/showHud && h\('div'/g) || []).length;
    expect(gated).toBeGreaterThanOrEqual(3);
    // announcements for screen-reader users
    expect(source).toContain('Simulation controls hidden. Press H');
  });

  it('a keyboard-shortcuts panel documents every shortcut and closes on Escape', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');
    expect(source).toContain("'aria-label': 'Keyboard shortcuts'");
    expect(source).toContain("'aria-modal': 'true'");
    // ? opens it; Esc closes it (before Esc exits immersive view)
    expect(source).toContain("event.key === '?'");
    expect(source).toContain("event.key === 'Escape' && (showKeysRef.current || cssFsRef.current)");
    // every registered shortcut is explained in the panel
    ['Run or pause the simulation', 'Reset the chamber', 'Velocity vector arrows',
     'Diffusion membrane', 'Gravity field', 'Follow the traced particle',
     'immersive view where fullscreen is blocked', 'Hide or show the simulation controls',
     'Open or close this panel', 'exit the immersive view'].forEach((desc) => {
      expect(source).toContain(desc);
    });
  });

  it('the deploy mirror matches the root tool byte-for-byte', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});
