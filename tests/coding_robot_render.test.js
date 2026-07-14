// B4 regression net: Robot Commander's recursive node renderer must render a
// conditional nested inside a loop (the structure r5/r7 require) without
// throwing. Robot mode is playgroundMode-gated and absent from the default SSR
// golden, so this is the only thing pinning the new recursive renderer.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_coding.js';

// whileNotGoal { ifWall { turnRight } else { moveForward } } — depth 2, the
// previously-unbuildable shape.
function nestedRobotProgram() {
  return {
    playgroundMode: 'robot',
    robotChallengeIdx: 4,
    robotBlocks: [
      {
        type: 'whileNotGoal',
        children: [
          {
            type: 'ifWall',
            children: [{ type: 'turnRight' }],
            elseChildren: [{ type: 'moveForward' }],
          },
        ],
      },
    ],
  };
}

describe('Robot Commander recursive renderer (B4)', () => {
  beforeEach(() => resetStemLab());
  beforeAll(() => resetStemLab());

  it('registers codingPlayground', () => {
    loadTool(FILE, 'codingPlayground');
    expect(window.StemLab._registry.codingPlayground).toBeTruthy();
  });

  it('renders a conditional nested inside a loop without throwing', () => {
    loadTool(FILE, 'codingPlayground');
    let html = '';
    expect(() => { html = renderTool('codingPlayground', { _codingPlayground: nestedRobotProgram() }); }).not.toThrow();
    // the whole nested chain is present -> the recursive renderer walked depth 2
    expect(html).toContain('While Not At Goal');
    expect(html).toContain('If Wall Ahead');
    expect(html).toContain('Turn Right');
    expect(html).toContain('Move Forward');
    expect(html).toContain('ELSE:');
  });

  it('offers conditional blocks inside a top-level loop (the filter widening)', () => {
    loadTool(FILE, 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: { playgroundMode: 'robot', robotChallengeIdx: 4, robotBlocks: [{ type: 'whileNotGoal', children: [] }] },
    });
    // the add-toolbox inside the loop exposes "Add ... If Wall Ahead"
    expect(html).toMatch(/Add .*If Wall Ahead/);
  });

  it('does NOT offer conditionals inside a nested conditional (depth-2 cap)', () => {
    loadTool(FILE, 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        playgroundMode: 'robot', robotChallengeIdx: 4,
        robotBlocks: [{ type: 'whileNotGoal', children: [{ type: 'ifWall', children: [], elseChildren: [] }] }],
      },
    });
    // The add-button TEXT (emoji stripped) reads "+ If Wall Ahead". It must
    // appear exactly once — in the top-level loop's toolbox. The nested ifWall
    // (depth 1) is leaf-only, so it must NOT offer another conditional add.
    const addIfWall = (html.match(/\+ If Wall Ahead/g) || []).length;
    expect(addIfWall).toBe(1);
  });
});

describe('Canvas text alternatives (C2)', () => {
  beforeEach(() => resetStemLab());

  it('the turtle canvas has role=img + a descriptive aria-label', () => {
    loadTool(FILE, 'codingPlayground');
    const html = renderTool('codingPlayground', {});
    expect(html).toMatch(/role="img"[^>]*aria-label="Turtle drawing canvas, currently empty[^"]*"|aria-label="Turtle drawing canvas, currently empty[^"]*"[^>]*role="img"/);
  });

  it('the robot grid canvas describes the robot, goal, and gems', () => {
    loadTool(FILE, 'codingPlayground');
    const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ wall: false, gem: false, goal: false, painted: false, start: false })));
    grid[2][3].goal = true; grid[1][1].gem = true; grid[0][0].wall = true;
    const html = renderTool('codingPlayground', {
      _codingPlayground: { playgroundMode: 'robot', robotChallengeIdx: 4, robotGrid: grid, robotPos: { x: 0, y: 2, dir: 1 }, robotBlocks: [] },
    });
    expect(html).toContain('Robot grid, 5 by 5');
    expect(html).toContain('facing right');
    expect(html).toContain('Goal at row 3, column 4');
    expect(html).toContain('1 gem remaining');
  });
});
