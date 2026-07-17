import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { setupDinoLab, renderTab } from './helpers/dino_lab_harness.js';

// Full WCAG axe scans over the larger DinoLab panels are CPU-heavy. They pass
// in well under this budget in isolation, but need headroom under full-suite
// parallel load so a slow worker does not turn a clean audit into a timeout.
const AXE_AUDIT_TIMEOUT_MS = 60000;

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
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Fossil assembly progress'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Claim strength'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Reconstruction challenge progress'");
    expect(source).toContain("scanStatusText = 'Evidence log '");
    expect(source).toContain("assemblyProgressText = 'Assembly '");
    expect(source).toContain("claimReadinessText = 'Claim strength '");
    expect(source).toContain("'aria-label': target.label + ' scan anchor");
    expect(source).toContain("'aria-label': piece.label + ' fossil");
  });

  it('keeps the Dig Site cells and guesses screen-reader reviewable', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("digStatusText = 'Site #'");
    expect(source).toContain("digGridDesc = 'Dig grid with '");
    expect(source).toContain("'aria-disabled': isDug ? 'true' : 'false'");
    expect(source).toContain("var cellLabel = 'Cell ' + (cellIdx + 1)");
    expect(source).toContain("'aria-label': 'Identify the find choices'");
    expect(source).toContain("'aria-pressed': (picked || isAnswer) ? 'true' : 'false'");
    expect(source).not.toContain("disabled: isDug");
  });

  it('exposes visual chart scale semantics outside the 3D lab', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("periodSummary = p.name + ' lasted about '");
    expect(source).toContain("'aria-label': p.name + ' duration on the Mesozoic timeline'");
    expect(source).toContain("deepTimeSummary = 'Compressed Earth history timeline");
    expect(source).toContain("role: 'img', 'aria-label': deepTimeSummary");
    expect(source).toContain("'aria-label': label + ' comparison value'");
    expect(source).toContain("'aria-valuetext': valueText");
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
  }, AXE_AUDIT_TIMEOUT_MS);

  it('renders the Dig Site without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('dig');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, AXE_AUDIT_TIMEOUT_MS);
});
