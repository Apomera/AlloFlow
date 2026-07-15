import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Particle Lab 3D interaction surface accessibility contract', () => {
  it('provides a focusable, described chamber with visible focus and shortcut metadata', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D particle chamber'");
    expect(source).toContain("'aria-keyshortcuts': 'Space R T V E M G C F'");
    expect(source).toContain('Click a particle to trace it, drag to orbit');
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain('focus-visible:outline-cyan-200');
    expect(source).toContain("role: 'img', 'aria-label': preset + ' particle simulation");
    expect(source).toContain("window.addEventListener('keydown', onLabKey)");
    expect(source).toContain("window.removeEventListener('keydown', onLabKey)");
  });
});
