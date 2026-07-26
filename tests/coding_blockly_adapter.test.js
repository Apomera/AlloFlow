import { afterEach, describe, expect, it } from 'vitest';
import {
  createHeadlessWorkspace,
  programHash,
  readProgram,
  restoreWorkspaceState,
  saveWorkspaceState,
  setMessages,
  WORKSPACE_STATE_VERSION
} from '../stem_lab/blockly_runtime_entry.mjs';

const workspaces = [];

afterEach(() => {
  while (workspaces.length) workspaces.pop().dispose();
  setMessages(null);
});

describe('Coding Playground Blockly adapter', () => {
  it('round-trips turtle programs with nested branches', () => {
    const program = [
      { type: 'setVar', varName: 'size', varValue: 75 },
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

  it('round-trips composable math, state, comparison, and Boolean expressions', () => {
    const program = [
      { type: 'setVar', varName: 'size', varValue: '20 + 5' },
      { type: 'changeVar', varName: 'size', varDelta: '$size / 5' },
      { type: 'forward', distance: '$size * 2' },
      { type: 'goto', x: 'x + 10', y: '250 - 25' },
      {
        type: 'ifelse',
        condition: '$size >= 30 and not (y < 200)',
        children: [{ type: 'right', degrees: 90 }],
        elseChildren: [{ type: 'left', degrees: 90 }]
      }
    ];
    const workspace = createHeadlessWorkspace('turtle', program);
    workspaces.push(workspace);

    expect(readProgram(workspace, 'turtle')).toEqual(program);
    const blockTypes = workspace.getAllBlocks(false).map((block) => block.type);
    expect(blockTypes).toContain('allo_value_arithmetic');
    expect(blockTypes).toContain('allo_value_variable');
    expect(blockTypes).toContain('allo_value_state');
    expect(blockTypes).toContain('allo_value_compare');
    expect(blockTypes).toContain('allo_value_logic');
    expect(blockTypes).toContain('allo_value_not');
  });

  it('upgrades legacy visual variable aliases to the canonical schema', () => {
    const workspace = createHeadlessWorkspace('turtle', [
      { type: 'setVar', varName: 'score', value: 10 },
      { type: 'changeVar', varName: 'score', amount: 2 }
    ]);
    workspaces.push(workspace);
    expect(readProgram(workspace, 'turtle')).toEqual([
      { type: 'setVar', varName: 'score', varValue: 10 },
      { type: 'changeVar', varName: 'score', varDelta: 2 }
    ]);
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

  it('persists layout, comments, collapsed state, and disabled state', () => {
    const program = [
      {
        type: 'repeat',
        times: 4,
        children: [{ type: 'forward', distance: 80 }]
      }
    ];
    const source = createHeadlessWorkspace('turtle', program);
    workspaces.push(source);
    const sourceBlock = source.getTopBlocks(true)[0];
    sourceBlock.moveBy(113, 67);
    sourceBlock.setCommentText('Keep this loop together');
    sourceBlock.setCollapsed(true);
    sourceBlock.setDisabledReason(true, 'persistence-test');

    const serialized = JSON.parse(JSON.stringify(
      saveWorkspaceState(source, 'turtle', program)
    ));
    expect(serialized.version).toBe(WORKSPACE_STATE_VERSION);
    expect(serialized.programHash).toBe(programHash(program));

    const target = createHeadlessWorkspace('turtle', []);
    workspaces.push(target);
    const result = restoreWorkspaceState(target, 'turtle', program, serialized);
    const restoredBlock = target.getTopBlocks(true)[0];

    expect(result).toEqual({ restored: true, reason: 'restored' });
    expect(readProgram(target, 'turtle')).toEqual(program);
    expect(restoredBlock.getRelativeToSurfaceXY()).toEqual(
      sourceBlock.getRelativeToSurfaceXY()
    );
    expect(restoredBlock.getCommentText()).toBe('Keep this loop together');
    expect(restoredBlock.isCollapsed()).toBe(true);
    expect(restoredBlock.isEnabled()).toBe(false);
  });

  it('rejects stale state and safely rebuilds from the canonical program', () => {
    const oldProgram = [{ type: 'forward', distance: 20 }];
    const nextProgram = [{ type: 'backward', distance: 45 }];
    const source = createHeadlessWorkspace('turtle', oldProgram);
    workspaces.push(source);
    const staleState = saveWorkspaceState(source, 'turtle', oldProgram);
    const target = createHeadlessWorkspace('turtle', []);
    workspaces.push(target);

    const result = restoreWorkspaceState(target, 'turtle', nextProgram, staleState);

    expect(result).toEqual({ restored: false, reason: 'program_mismatch' });
    expect(readProgram(target, 'turtle')).toEqual(nextProgram);
  });

  it('rejects v1 workspace state without losing the canonical program', () => {
    const program = [{ type: 'turnRight' }];
    const source = createHeadlessWorkspace('robot', []);
    workspaces.push(source);
    const legacyState = saveWorkspaceState(source, 'robot', []);
    legacyState.version = 1;
    const target = createHeadlessWorkspace('robot', []);
    workspaces.push(target);

    const result = restoreWorkspaceState(target, 'robot', program, legacyState);

    expect(result).toEqual({ restored: false, reason: 'version_mismatch' });
    expect(readProgram(target, 'robot')).toEqual(program);
  });

  it('uses translated labels for newly created blocks', () => {
    setMessages({
      'block.turtle.forward': 'Avanzar',
      codingBlock: 'bloque de codigo'
    });
    const workspace = createHeadlessWorkspace('turtle', [
      { type: 'forward', distance: 50 }
    ]);
    workspaces.push(workspace);
    const label = workspace.getTopBlocks(true)[0].inputList[0].fieldRow[0];

    expect(label.getText()).toBe('Avanzar');
    expect(workspace.getTopBlocks(true)[0].getTooltip()).toBe(
      'Avanzar bloque de codigo'
    );
  });
});
