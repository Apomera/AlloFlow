import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { setupDinoLab, renderTab } from './helpers/dino_lab_harness.js';

describe('Dino Lab 3D Field Station accessibility contract', () => {
  it('supports focused keyboard rotation with live status and cleanup', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D dinosaur reconstruction'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowLeft ArrowRight A D Home'");
    expect(source).toContain("key === 'ArrowLeft'");
    expect(source).toContain("key === 'ArrowRight'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("canvas.addEventListener('keydown', keyDown)");
    expect(source).toContain("canvas.removeEventListener('keydown', keyDown)");
    expect(source).toContain('try { canvas.focus(); }');
    expect(source).toContain("outline: canvasFocused ? '3px solid #5eead4' : 'none'");
    expect(source).toContain('Reconstruction returned to its starting view.');
    expect(source).toContain("ref: statusRef, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(source).toContain("'aria-describedby': viewerDescId + ' ' + statusId");
    expect(source).toContain("var viewerSummary = props.species.common + ' 3D model summary.");
    expect(source).toContain("Visible layers: ' + layerSummary");
    expect(source).toContain("Keyboard controls: Left and Right Arrow or A and D rotate the reconstruction; Home returns to the starting view.");
    expect(source).toContain("if (!reducedMotion && scanPulse)");
    expect(source).toContain("if (!reducedMotion && assemblyPulse)");
    expect(source).toContain("if (!reducedMotion && claimEvidencePulse)");
    expect(source).toContain("if (!reducedMotion) loggedRings.forEach");
  });

  it('renders the Field Station without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('field3d');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, 20000);
});
