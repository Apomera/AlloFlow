// Math Fluency has a door (fleet wave 2, W3, C5).
//
// Before this, Math Fluency and Fluency Maze had ZERO command palette entries and
// exactly one door each: the 5th and 6th <option> of the Mode <select> inside the
// collapsed Math accordion. A <select> option is not searchable, carries no
// description, and does not appear in the palette, chat or voice. A 6,000-line CBM
// probe instrument was reachable only by someone who already knew where it was.
//
// Registering a command is the easy half. This repo has a standing lesson about the
// other half: a command can exist, look correct, and do nothing, because the ctx
// function it calls was never defined or the state it sets is not what the view
// tests. So every link in the chain is asserted here:
//
//   command -> c.openMathFluency() -> host ctx defines it -> it sets mathMode
//   -> the sidebar renders on that exact string -> the module registers that export
//   -> the host actually loads the module.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const commands = read('allo_commands_source.jsx');
const commandsModule = read('allo_commands_module.js');
const commandsMirror = read('desktop/web-app/public/allo_commands_module.js');
const anti = read('AlloFlowANTI.txt');
const sidebar = read('view_sidebar_panels_source.jsx');
const fluency = read('math_fluency_module.js');

const commandBlock = (id) => {
  const at = commands.indexOf(`{ id: '${id}'`);
  expect(at, `command ${id} is registered`).toBeGreaterThan(-1);
  return commands.slice(at, commands.indexOf('\n', at));
};

describe('the commands exist', () => {
  it('registers open_math_fluency and open_fluency_maze', () => {
    expect(commandBlock('open_math_fluency')).toContain("label: t('cmd.open_math_fluency'");
    expect(commandBlock('open_fluency_maze')).toContain("label: t('cmd.open_fluency_maze'");
  });

  it('carries the aliases people actually say', () => {
    const probe = commandBlock('open_math_fluency');
    for (const alias of ['fluency probe', 'timed math', 'math minute', 'cbm probe']) {
      expect(probe, `alias ${alias}`).toContain(`'${alias}'`);
    }
    expect(commandBlock('open_fluency_maze')).toContain("'fluency maze'");
  });

  it('excludes the student audience, whose view has no create sidebar to open', () => {
    for (const id of ['open_math_fluency', 'open_fluency_maze']) {
      const block = commandBlock(id);
      expect(block).toContain("roles: ['teacher', 'independent', 'parent']");
      expect(block).not.toContain("'student'");
    }
  });

  it('is grouped, or the palette lists it without a heading', () => {
    // tests/allo_commands.test.js enforces this for the whole registry; pinned
    // here too because it is the half of "add a command" that is easy to miss.
    const groups = commands.slice(commands.indexOf('const CMD_GROUP = {'));
    expect(groups.slice(0, groups.indexOf('\n};'))).toContain("open_math_fluency:'tools'");
    expect(groups.slice(0, groups.indexOf('\n};'))).toContain("open_fluency_maze:'tools'");
  });

  it('offers before acting, because both ids start with open_', () => {
    // L7's policy: commandChangesScreen() returns true for /^open_/, so these are
    // confirmed rather than executed on the spot. That is correct for a timed probe.
    const re = anti.length && commands.slice(commands.indexOf('const SCREEN_CHANGING_COMMAND_RE'), commands.indexOf('const SCREEN_CHANGING_COMMAND_RE') + 200);
    expect(re).toContain('^(?:open_');
    const pattern = /^(?:open_|go_|generate_)/;
    expect(pattern.test('open_math_fluency')).toBe(true);
    expect(pattern.test('open_fluency_maze')).toBe(true);
  });
});

describe('the commands actually reach the panel', () => {
  it('each run() calls a ctx function rather than poking state directly', () => {
    expect(commandBlock('open_math_fluency')).toContain('c.openMathFluency()');
    expect(commandBlock('open_fluency_maze')).toContain('c.openFluencyMaze()');
  });

  it('and the host defines both on the command context', () => {
    // Not just "the string appears": it must be inside _alloCmdCtx, the object the
    // palette, chat and voice all read.
    const ctxStart = anti.indexOf('const _alloCmdCtx = () => {');
    expect(ctxStart).toBeGreaterThan(-1);
    const ctxEnd = anti.indexOf('_alloCmdCtxRef.current = ctx;', ctxStart);
    expect(ctxEnd).toBeGreaterThan(ctxStart);
    const ctx = anti.slice(ctxStart, ctxEnd);
    expect(ctx).toContain('openMathFluency: () => {');
    expect(ctx).toContain('openFluencyMaze: () => {');
  });

  it('sets the exact mathMode strings the sidebar tests for', () => {
    const at = anti.indexOf('openMathFluency: () => {');
    const probe = anti.slice(at, anti.indexOf('openHistory:', at));
    expect(probe).toContain("setMathMode('Fluency Probes')");
    expect(probe).toContain("setMathMode('Fluency Maze')");
    // The other side of that contract. If either string drifts, the command opens
    // the Math tool onto a mode that renders nothing.
    expect(sidebar).toContain("mathMode === 'Fluency Probes'");
    expect(sidebar).toContain("mathMode === 'Fluency Maze'");
  });

  it('expands the Math accordion, or the panel stays collapsed and invisible', () => {
    const at = anti.indexOf('openMathFluency: () => {');
    const probe = anti.slice(at, anti.indexOf('openHistory:', at));
    expect(probe).toContain("setExpandedTools(prev => prev.includes('math') ? prev : ['math', ...prev])");
    expect(probe).toContain("setActiveSidebarTab('create')");
    // The accordion really is driven by expandedTools, and the scroll target exists.
    expect(anti).toContain("expandedTools.includes('math')");
    expect(anti).toContain('id="tour-tool-math"');
  });

  it('renders a module that is registered and loaded', () => {
    // The probe panel mounts inline in the sidebar accordion.
    expect(sidebar).toContain('window.AlloModules.MathFluency');
    // The maze does NOT. mathMode === 'Fluency Maze' renders a launch card, and the
    // maze itself is a full standalone view in the host, one click further on. So
    // open_fluency_maze opens the door to the maze, not the maze. That is the honest
    // reading of "open", and it keeps a voice command from writing a history entry.
    expect(sidebar).toContain("t('fluency_maze.open_button')");
    expect(anti).toContain("activeView === 'math-fluency-maze'");
    expect(anti).toContain('window.AlloModules.FluencyMaze');

    expect(fluency).toContain('window.AlloModules.MathFluency = MathFluencyPanel;');
    expect(fluency).toContain('window.AlloModules.FluencyMaze = FluencyMazePanel;');
    // loadModule's contract: the loader key must match the AlloModules key.
    expect(anti).toContain("loadModule('MathFluency', 'https://alloflow-cdn.pages.dev/math_fluency_module.js");
  });
});

describe('the built artifact carries the commands', () => {
  it('compiles both into the module and its deploy mirror', () => {
    for (const id of ['open_math_fluency', 'open_fluency_maze']) {
      expect(commandsModule).toContain(id);
      expect(commandsMirror).toContain(id);
    }
  });
});
