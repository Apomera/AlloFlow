import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// "Auto-Generate Smart Quests" built XP quests from selectedTools.slice(0, 2)
// and then kept hookQuests.slice(0, 3) off a list built two-per-tool in
// selection order. Both windows landed on the SAME first two tools, so a
// six-tool station produced six quests covering two tools — while the button's
// own label counted the hooks of all six.
//
// These tests run the SHIPPED handler body.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

function handlerBody() {
  const src = source();
  const at = src.indexOf("'aria-label': 'Auto-generate smart quests based on selected tools'");
  expect(at, 'auto-generate button moved').toBeGreaterThanOrEqual(0);
  const onClickAt = src.indexOf('onClick: function() {', at);
  return extractBalanced(src, src.indexOf('{', onClickAt + 19), '{', '}');
}

const hooks = (n) => Array.from({ length: n }, (_, i) => ({ id: 'h' + i, label: 'hook' + i }));

function generate(selectedTools, hooksByTool) {
  let quests = null, toast = null;
  const sandbox = {
    selectedTools,
    _getToolQuestHooks: (tid) => hooksByTool[tid] || [],
    _questAutoLabel: (type, tid) => type + ' in ' + tid,
    _setStationQuests: (q) => { quests = q; },
    addToast: (m) => { toast = m; },
    t: () => null,
    Object, Array
  };
  runInNewContext('(function() ' + handlerBody() + ')();', sandbox);
  return { quests, toast, covered: new Set(quests.map((q) => q.toolId).filter(Boolean)) };
}

describe('auto-generated quests spread across the selection', () => {
  it('covers EVERY selected tool that has hooks', () => {
    const tools = ['circuit', 'wave', 'dna', 'cell', 'molecule', 'physics'];
    const byTool = Object.fromEntries(tools.map((t) => [t, hooks(5)]));
    const { covered } = generate(tools, byTool);
    // The regression: this used to be 2.
    expect(covered.size).toBe(6);
    for (const t of tools) expect(covered.has(t)).toBe(true);
  });

  it('gives each tool a first hook before any tool gets a second', () => {
    const tools = ['a', 'b', 'c'];
    const byTool = Object.fromEntries(tools.map((t) => [t, hooks(5)]));
    const { quests } = generate(tools, byTool);
    const hookQuests = quests.filter((q) => q.type === 'toolQuest');
    const firstRound = hookQuests.slice(0, 3).map((q) => q.toolId);
    // Round-robin: three distinct tools before any repeat.
    expect(new Set(firstRound).size).toBe(3);
  });

  it('still works for a single tool', () => {
    const { quests, covered } = generate(['solo'], { solo: hooks(1) });
    expect(covered.has('solo')).toBe(true);
    expect(quests.length).toBeGreaterThan(0);
  });

  it('falls back to XP quests when no tool has hooks', () => {
    const { quests } = generate(['a', 'b', 'c'], {});
    expect(quests.some((q) => q.type === 'xpThreshold')).toBe(true);
    expect(quests.some((q) => q.type === 'toolQuest')).toBe(false);
  });

  it('reaches a tool whose hooks come last in the selection', () => {
    // Previously the slice window never got past the first two tools, so a
    // hook-bearing tool late in the list contributed nothing.
    const { covered } = generate(['a', 'b', 'c', 'd', 'e', 'zz'], { zz: hooks(5) });
    expect(covered.has('zz')).toBe(true);
  });

  it('always ends with a reflection prompt', () => {
    const { quests } = generate(['a'], { a: hooks(2) });
    const last = quests[quests.length - 1];
    expect(last.type).toBe('freeResponse');
    expect(last.toolId).toBeNull();
  });
});

describe('auto-generated quests are well formed', () => {
  it('never produces a blank label', () => {
    // A hook with no label would render an empty row in the Quest HUD.
    const { quests } = generate(['x'], { x: [{ id: 'h0' }] });
    for (const q of quests) {
      expect(typeof q.label).toBe('string');
      expect(q.label.length).toBeGreaterThan(0);
    }
  });

  it('skips a hook entry with no id', () => {
    // params.hookId is how the quest finds its hook again; without an id the
    // quest could never complete.
    const { quests } = generate(['x'], { x: [{ label: 'no id here' }, { id: 'h1', label: 'fine' }] });
    const toolQuests = quests.filter((q) => q.type === 'toolQuest');
    for (const q of toolQuests) expect(q.params.hookId).toBeTruthy();
  });

  it('gives every quest a type and params', () => {
    const { quests } = generate(['a', 'b'], { a: hooks(3), b: hooks(3) });
    for (const q of quests) {
      expect(q.type).toBeTruthy();
      expect(q.params).toBeTypeOf('object');
    }
  });

  it('caps the quest count so the HUD stays usable', () => {
    const tools = Array.from({ length: 12 }, (_, i) => 'tool' + i);
    const byTool = Object.fromEntries(tools.map((t) => [t, hooks(5)]));
    const { quests } = generate(tools, byTool);
    // 4 hook + 2 XP + 1 reflection at most.
    expect(quests.length).toBeLessThanOrEqual(7);
  });
});

describe('the toast tells the truth about coverage', () => {
  it('reports tools covered, not just quests made', () => {
    const tools = ['a', 'b', 'c', 'd', 'e', 'zz'];
    const { toast, covered } = generate(tools, { zz: hooks(5) });
    expect(toast).toContain(String(covered.size));
    expect(toast).toContain(String(tools.length));
    // The old wording claimed the quests were "based on your tools" while
    // ignoring most of them.
    expect(toast).not.toContain('based on your tools');
  });

  it('matches the quests actually produced', () => {
    const tools = ['circuit', 'wave', 'dna'];
    const byTool = Object.fromEntries(tools.map((t) => [t, hooks(4)]));
    const { toast, quests, covered } = generate(tools, byTool);
    expect(toast).toContain(String(quests.length) + ' quests');
    expect(toast).toContain('across ' + covered.size);
  });
});
