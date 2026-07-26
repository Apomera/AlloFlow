import { afterEach, describe, expect, it } from 'vitest';
import {
  createHeadlessWorkspace,
  readProgram
} from '../stem_lab/blockly_runtime_entry.mjs';

const workspaces = [];

afterEach(() => {
  while (workspaces.length) workspaces.pop().dispose();
});

describe('Coding Playground Blockly adapter', () => {
  it('round-trips turtle programs with nested branches', () => {
    const program = [
      { type: 'setVar', varName: 'size', value: 75 },
      {
        type: 'repeat',
        times: 4,
        children: [
          { type: 'forward', distance: '$size' },
          { type: 'right', degrees: 90 }
        ]
      },
      {
        type: 'ifelse',
        condition: 'x > 250',
        children: [{ type: 'color', color: '#22c55e' }],
        elseChildren: [{ type: 'color', color: '#ec4899' }]
      }
    ];
    const workspace = createHeadlessWorkspace('turtle', program);
    workspaces.push(workspace);
    expect(readProgram(workspace, 'turtle')).toEqual(program);
  });

  it('round-trips robot control flow', () => {
    const program = [
      {
        type: 'whileNotGoal',
        children: [
          {
            type: 'ifWall',
            children: [{ type: 'turnRight' }],
            elseChildren: [{ type: 'moveForward' }]
          },
          { type: 'collectGem' }
        ]
      }
    ];
    const workspace = createHeadlessWorkspace('robot', program);
    workspaces.push(workspace);
    expect(readProgram(workspace, 'robot')).toEqual(program);
  });
});
