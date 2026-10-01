// open_stem_tool — the generic STEM launcher.
//
// Before this command, 55 hand-written open_* commands named exactly three of
// the 139 STEM tools, so the agent simply could not launch the other 136.
// Adding 136 commands would bloat every prompt that lists the palette, so the
// command resolves free text against the capability index instead.
//
// What is worth pinning: it opens the RIGHT tool (a resolver that silently
// opens the wrong one is worse than a miss, because the agent cannot see what
// appeared on screen), and it degrades instead of throwing when the index, the
// host method, or the match is absent.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const idx = JSON.parse(readFileSync('tool_index.json', 'utf8'));

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});

function harness(indexValue = idx, withHostMethod = true) {
  window.ALLO_TOOL_INDEX = indexValue;
  const seen = { opened: null, lab: false };
  const ctx = {
    t: (k, fb) => (fb === undefined ? k : fb),
    isTeacherMode: true,
    openStemLab: () => { seen.lab = true; },
    openLumen: () => {},
    openFreeForms: () => {},
  };
  if (withHostMethod) ctx.openStemTool = (id) => { seen.opened = id; return true; };
  const cmd = AC.buildAlloCommands(ctx, {}).find((c) => c.id === 'open_stem_tool');
  return { cmd, ctx, seen, run: (params) => { seen.opened = null; seen.lab = false; return cmd.run(ctx, params); } };
}

describe('open_stem_tool is registered', () => {
  it('is a real, panel-tagged command available to every role', () => {
    const { cmd } = harness();
    expect(cmd, 'command missing from the registry').toBeTruthy();
    // opensPanel drives closeOtherPanels, so an untagged launcher stacks overlays.
    expect(cmd.opensPanel).toBe('stemLab');
    expect(cmd.roles).toBe('all');
  });
});

describe('resolution picks the right tool', () => {
  it('matches an exact id or label, case-insensitively', () => {
    const h = harness();
    h.run({ tool: 'beehive' });
    expect(h.seen.opened).toBe('beehive');
    h.run({ tool: 'Beehive Simulator' });
    expect(h.seen.opened).toBe('beehive');
    h.run({ tool: 'BEEHIVE' });
    expect(h.seen.opened).toBe('beehive');
  });

  it('matches a natural phrase the agent is likely to say', () => {
    const h = harness();
    h.run({ tool: 'law navigator' });
    expect(h.seen.opened).toBe('lawNavigator');
    h.run({ tool: 'parenting' });
    expect(h.seen.opened).toBe('parentingLab');
  });

  it('accepts tool, query or raw as the parameter name', () => {
    const h = harness();
    h.run({ query: 'paper trail' });
    expect(h.seen.opened).toBe('paperTrail');
    h.run({ raw: 'paper trail' });
    expect(h.seen.opened).toBe('paperTrail');
  });

  it('prefers a phrase found INSIDE a tool over a stray label word', () => {
    // The regression this guards: "periodic table" scored Multiplication Table
    // above molecule, because one generic label word ("table") outweighed the
    // exact phrase sitting in molecule's indexed content. Seeing inside tools is
    // the entire reason the capability index exists.
    const h = harness();
    h.run({ tool: 'periodic table' });
    expect(h.seen.opened).toBe('molecule');
  });
});

describe('it degrades instead of misfiring', () => {
  it('opens the lab, and no tool, when nothing matches', () => {
    const h = harness();
    const msg = h.run({ tool: 'zzzzqqq nonexistent' });
    expect(h.seen.opened).toBeNull();
    expect(h.seen.lab).toBe(true);
    expect(msg).toMatch(/no stem tool matched/i);
  });

  it('opens the lab when given no argument at all', () => {
    const h = harness();
    h.run({});
    expect(h.seen.opened).toBeNull();
    expect(h.seen.lab).toBe(true);
  });

  it('falls back to the live registry when the index is missing', () => {
    // The index is fetched at boot; an older build or a failed fetch must not
    // make the command dead.
    const h = harness(null);
    window.STEM_TOOL_REGISTRY = [{ id: 'beehive', name: 'Beehive Simulator' }];
    h.run({ tool: 'beehive' });
    expect(h.seen.opened).toBe('beehive');
    delete window.STEM_TOOL_REGISTRY;
  });

  it('does not throw on a host that lacks openStemTool', () => {
    const h = harness(idx, false);
    const msg = h.run({ tool: 'beehive' });
    expect(h.seen.lab).toBe(true);
    expect(msg).toMatch(/cannot jump/i);
  });
});
