import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';

const FILE = 'stem_lab/stem_tool_bridgelab.js';

function bridge(overrides = {}) {
  return {
    bridgeLab: Object.assign({
      tab: 'build',
      span: 30,
      height: 6,
      nBays: 4,
      loadPerJoint: 50,
      materialId: 'steel',
      crossSectionMm2: 5000,
      trussStyle: 'warren',
      loadMode: 'uniform'
    }, overrides)
  };
}

describe('Bridge Lab governing-member buckling', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'bridgeLab');
  });

  it('evaluates exact Method-of-Joints compression members individually', () => {
    const html = renderTool('bridgeLab', bridge({ trussStyle: 'pratt' }));

    expect(html).toContain('Governing member');
    expect(html).toContain('Governing compression member');
    expect(html).toContain('pinned ends K=1');
    expect(html).not.toContain('top chord (approx.)');
    expect(html).not.toContain('NaN');
  });

  it('labels the K-truss top-chord buckling check as approximate', () => {
    const html = renderTool('bridgeLab', bridge({ trussStyle: 'ktruss' }));

    expect(html).toContain('top chord (approx.)');
    expect(html).toContain('Deep-beam approximation');
    expect(html).not.toContain('NaN');
  });

  it('announces updated safety results as one atomic status', () => {
    const html = renderTool('bridgeLab', bridge());

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  it('uses the same per-member buckling cases in the cost optimizer', () => {
    const source = readFileSync(FILE, 'utf8');

    expect(source).toContain('compressionCases.forEach(function(memberCase)');
    expect(source).toContain('memberCase.lengthMm * memberCase.lengthMm');
    expect(source).toContain('memberSF = pcrCandidate / Math.max(0.001, memberCase.forceKN)');
    expect(source).not.toContain('sfBuck = Pcr / Math.max(0.001, analysis.maxChord)');
  });
});
