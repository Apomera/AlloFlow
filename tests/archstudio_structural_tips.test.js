import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The structural-analysis coach tip is the one place this tool tells a student something about
// physics rather than about the UI. These render REAL block layouts through the shipped analysis
// and read the tip back, because a grep can prove a string exists and nothing about when it fires.
// Material weights come from the tool's own palette: stone 2.3, wood 0.6, metal 7.8.

const block = (x, y, z, material) => ({ x, y, z, shape: 'block', material, color: '#94a3b8', rotation: 0 });

function tipFor(blocks) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_archstudio.js', 'archStudio');
  const html = renderTool('archStudio', {
    archStudio: { blocks, showAnalysis: true, editorView: '3d', mode: 'place', activeRotation: 0, undoStack: [], redoStack: [] },
  }, { t: (k, fb) => fb || k, gradeLevel: '10th Grade' });
  return html;
}

describe('ArchStudio structural tips say true things about the build', () => {
  it('a level floor is reported as a great structure, with no symmetry nagging', () => {
    const blocks = [];
    for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) blocks.push(block(x, 0, z, 'stone'));
    const html = tipFor(blocks);
    expect(html).toContain('Great structure');
    expect(html).not.toContain('Try mirroring');
  });

  it('a heavy metal column on one end is reported as off-centre, not as asymmetric', () => {
    // Centre of gravity lands at x ~2.5 over a footprint centred on 1.5: more than a third of the
    // half-width off. Stability stays above 40, so the older "widen the base" branch does not fire
    // first and mask this one.
    const html = tipFor([
      block(0, 0, 0, 'stone'), block(1, 0, 0, 'stone'), block(2, 0, 0, 'stone'),
      block(3, 0, 0, 'metal'), block(3, 1, 0, 'metal'), block(3, 2, 0, 'metal'),
    ]);
    expect(html).toContain('off-centre');
    expect(html).toContain('tips toward its heavy side');
    expect(html).not.toContain('Asymmetric structure');
  });

  it('metal stacked on a wooden base is reported as top-heavy, with the 13x weight ratio', () => {
    // Four wood blocks at y=0, four metal blocks at y=1-2 centred over them. Centre of gravity is
    // dead centre horizontally (so no off-centre tip) and sits at y ~1.4 of 3 (upper half).
    // Footprint 4 keeps stability at 50, above the widen-the-base branch.
    const html = tipFor([
      block(0, 0, 0, 'wood'), block(1, 0, 0, 'wood'), block(2, 0, 0, 'wood'), block(3, 0, 0, 'wood'),
      block(1, 1, 0, 'metal'), block(2, 1, 0, 'metal'), block(1, 2, 0, 'metal'), block(2, 2, 0, 'metal'),
    ]);
    expect(html).toContain('upper half');
    expect(html).toContain('13 times');
    expect(html).not.toContain('structural variety');
  });

  it('a block with nothing under it is reported as floating before anything else', () => {
    const html = tipFor([block(0, 0, 0, 'stone'), block(0, 3, 0, 'stone')]);
    expect(html).toContain('floating');
    expect(html).toContain('Add supports below');
  });

  it('a tall thin tower is told to widen its base, and labelled unstable through the translator', () => {
    const blocks = [];
    for (let y = 0; y < 8; y++) blocks.push(block(0, y, 0, 'stone'));
    const html = tipFor(blocks);
    expect(html).toContain('Widen the base');
    // The label reaches the DOM through t(); the harness t() returns the English fallback.
    expect(html).toContain('Unstable');
  });
});
