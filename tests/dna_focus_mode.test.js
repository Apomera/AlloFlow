import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab Focus mode', () => {
  it('shows the five-station essentials view and hides advanced paths', () => {
    const html = renderDNA({ tab: 'build', dnaFocusMode: true });
    expect(html).toContain('data-dna-view-mode="focus"');
    expect(html).toContain('data-dna-focus-banner="true"');
    expect(html).toContain('Guided essentials');
    expect(html).toContain('Build');
    expect(html).toContain('Mutate');
    expect(html).not.toContain('dna-tab-crispr');
    expect(html).not.toContain('dna-tab-learn');
    expect(html).not.toContain('data-dna-routes="true"');
    expect(html).not.toContain('Achievements');
  });

  it('keeps the full Explore view available by default', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-view-mode="explore"');
    expect(html).toContain('data-dna-routes="true"');
    expect(html).toContain('CRISPR');
    expect(html).toContain('Learn');
    expect(html).toContain('Achievements');
  });

  it('falls back to the core workspace when Focus mode reopens an advanced tab', () => {
    const html = renderDNA({ tab: 'crispr', dnaFocusMode: true });
    expect(html).toContain('data-dna-active-tab="build"');
    expect(html).toContain('data-dna-workspace="build"');
    expect(html).not.toContain('data-dna-workspace="crispr"');
  });

  it('defines a reversible Focus/Explore state transition', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function setDnaFocusMode');
    expect(source).toContain('visibleDnaSubtools');
    expect(source).toContain('dnaFocusToolIds');
  });
});