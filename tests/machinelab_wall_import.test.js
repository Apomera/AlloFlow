import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;

// archStudio stores {x, y, z, shape, material, color} on a grid, y up.
function archWall(cols, rows, depth, material = 'stone') {
  const out = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      for (let z = 0; z < depth; z++) {
        out.push({ x, y, z, shape: 'block', material, color: '#94a3b8' });
      }
    }
  }
  return out;
}

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

describe('Machine Lab: importing an archStudio build', () => {
  it('projects the build along the firing axis into one cell per column', () => {
    const res = M.importWall(archWall(4, 3, 2));
    expect(res.blocks).not.toBeNull();
    expect(res.blocks.length).toBe(12);          // 4 x 3, z collapsed
    expect(res.cells).toBe(12);
  });

  it('turns depth into strength rather than throwing it away', () => {
    const thin = M.importWall(archWall(3, 3, 1));
    const thick = M.importWall(archWall(3, 3, 4));
    expect(thin.blocks[0].budgetMul).toBe(1);
    expect(thick.blocks[0].budgetMul).toBe(4);
  });

  it('actually takes more energy to break a thicker imported wall', () => {
    // The budget multiplier has to reach the damage engine, not just sit in
    // the record.
    function hitsToBreak(depth) {
      let blocks = M.importWall(archWall(3, 3, depth)).blocks;
      const impact = { status: 'hit', y: 0.5, z: 0, v: 45, t: 1 };
      for (let i = 1; i <= 60; i++) {
        const res = M.applyDamage(blocks, impact, { projMass: 25, projDiameter: 0.24 });
        blocks = res.blocks;
        const b = blocks.find((x) => x.col === res.col && x.row === res.row);
        if (b && b.state === 'breached') return i;
      }
      return Infinity;
    }
    expect(hitsToBreak(3)).toBeGreaterThan(hitsToBreak(1));
  });

  it('normalises coordinates so a build far from the origin still works', () => {
    const shifted = archWall(3, 2, 1).map((b) => ({ ...b, x: b.x + 40, y: b.y + 7 }));
    const res = M.importWall(shifted);
    const ext = M.wallExtent(res.blocks);
    expect(ext.minCol).toBe(0);
    expect(res.blocks.some((b) => b.row === 0)).toBe(true);
  });

  it('maps archStudio materials onto the siege materials', () => {
    expect(M.importWall(archWall(1, 1, 1, 'marble')).blocks[0].mat).toBe('granite');
    expect(M.importWall(archWall(1, 1, 1, 'brick')).blocks[0].mat).toBe('limestone');
    expect(M.importWall(archWall(1, 1, 1, 'wood')).blocks[0].mat).toBe('earth');
    // An unknown material falls back rather than producing an undefined budget.
    expect(M.importWall([{ x: 0, y: 0, z: 0, material: 'unobtainium' }]).blocks[0].mat).toBe('limestone');
  });

  it('leaves out floating blocks instead of importing a phantom breach', () => {
    // archStudio allows floaters. Imported as-is they would collapse on the
    // first shot anywhere and hand the student a breach they did not earn.
    const build = archWall(3, 2, 1).concat([{ x: 1, y: 6, z: 0, material: 'stone' }]);
    const res = M.importWall(build);
    expect(res.dropped).toBe(1);
    expect(res.blocks.some((b) => b.row === 6)).toBe(false);
    expect(M.isBreached(res.blocks)).toBe(false);
  });

  it('drops a whole floating stack, not just its lowest block', () => {
    const build = archWall(2, 2, 1).concat([
      { x: 0, y: 5, z: 0, material: 'stone' },
      { x: 0, y: 6, z: 0, material: 'stone' },
      { x: 0, y: 7, z: 0, material: 'stone' }
    ]);
    expect(M.importWall(build).dropped).toBe(3);
  });

  it('refuses an empty or absurd build with a reason', () => {
    expect(M.importWall([]).error).toBe('empty');
    expect(M.importWall(null).error).toBe('empty');
    expect(M.importWall([{ x: 'a', y: null, z: 0 }]).error).toBe('empty');
    expect(M.importWall(archWall(40, 30, 1)).error).toBe('too-big');
  });

  it('drops a build made high above the grid down onto the ground', () => {
    // y is normalised, so a castle a student built at height is besieged as
    // the castle it is rather than rejected for floating. The floater sweep
    // then only removes blocks unsupported RELATIVE to the rest of the build.
    const res = M.importWall(archWall(3, 2, 1).map((b) => ({ ...b, y: b.y + 9 })));
    expect(res.error).toBeUndefined();
    expect(res.dropped).toBe(0);
    expect(M.wallExtent(res.blocks).maxRow).toBe(1);
  });

  it('is deterministic, including its material tie-breaking', () => {
    const build = [
      { x: 0, y: 0, z: 0, material: 'stone' },
      { x: 0, y: 0, z: 1, material: 'marble' }
    ];
    const first = JSON.stringify(M.importWall(build).blocks);
    for (let i = 0; i < 10; i++) {
      expect(JSON.stringify(M.importWall(build).blocks)).toBe(first);
    }
  });

  it('produces a wall the rest of the engine accepts', () => {
    const blocks = M.importWall(archWall(6, 4, 2)).blocks;
    expect(M.wallSummary(blocks).total).toBe(24);
    expect(M.isBreached(blocks)).toBe(false);
    const res = M.applyDamage(blocks, { status: 'hit', y: 0.5, z: 0, v: 60, t: 1 },
      { projMass: 25, projDiameter: 0.24 });
    expect(res.outcome).toBe('hit');
  });
});

describe('Machine Lab: the arch flag survives a damage pass', () => {
  it('does not drop the gateway arch when a shot lands elsewhere', () => {
    // applyDamage rebuilds the block list. If that copy loses `arch`, the
    // collapse sweep inside the very same call treats the arch as an ordinary
    // block with nothing beneath it and brings it down on the first shot.
    let blocks = M.buildWall('gatehouse');
    const far = { status: 'hit', y: 0.5, z: -4, v: 30, t: 1 };
    for (let i = 0; i < 3; i++) {
      blocks = M.applyDamage(blocks, far, { projMass: 10, projDiameter: 0.2 }).blocks;
    }
    const arch = blocks.filter((b) => b.arch);
    expect(arch.length).toBeGreaterThan(0);
    expect(arch.every((b) => b.state !== 'breached')).toBe(true);
  });
});

describe('Machine Lab: the import button', () => {
  const state = (o = {}) => ({ machineLab: Object.assign({ view: 'siege' }, o) });

  it('is hidden when there is no archStudio build to import', () => {
    const html = renderTool('machineLab', state());
    expect(html).not.toContain('Your own build');
  });

  it('appears once a build exists, alongside the four presets', () => {
    const html = renderTool('machineLab', {
      machineLab: { view: 'siege' },
      archStudio: { blocks: archWall(5, 3, 1) }
    });
    expect(html).toContain('Your own build');
    // The presets are not replaced by it: the tool works without the import.
    expect(html).toContain('Curtain wall');
    expect(html).toContain('Motte and tower');
  });

  it('describes an imported wall on its own terms', () => {
    const blocks = M.importWall(archWall(5, 3, 2)).blocks;
    const html = renderTool('machineLab', {
      machineLab: { view: 'siege', wallPreset: 'imported', wallBlocks: blocks },
      archStudio: { blocks: archWall(5, 3, 2) }
    });
    expect(html).toContain('the castle you built in Architecture Studio');
    expect(html).toContain('Depth counts as strength');
    expect(html).not.toContain('NaN');
  });
});
