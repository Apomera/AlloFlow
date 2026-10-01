import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Deselecting a tool in the station builder removed it from _stationTools but
// left its quests in _stationQuests. The saved station then listed tools
// WITHOUT that tool, and the station filter shows only the station's own
// tools, so the orphaned quests named something the student could not open
// from that station: they sat in the Quest HUD at 0% forever and the station
// could never read complete.
//
// These tests run the SHIPPED toggle and save handlers.

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

function toggleBody() {
  const src = source();
  const at = src.indexOf('var removing = !!next[tool.id];');
  expect(at, 'tool toggle moved').toBeGreaterThanOrEqual(0);
  const start = src.lastIndexOf('onClick: function() {', at);
  return extractBalanced(src, src.indexOf('{', start + 19), '{', '}');
}

function runToggle(stationTools, stationQuests, toolId, toolLabel) {
  let tools = null, quests = null;
  const toasts = [], announced = [];
  const sandbox = {
    _stationTools: stationTools,
    _stationQuests: stationQuests,
    tool: { id: toolId, label: toolLabel },
    _setStationTools: (v) => { tools = v; },
    _setStationQuests: (v) => { quests = v; },
    addToast: (m) => toasts.push(m),
    announceToSR: (m) => announced.push(m),
    Object, Array
  };
  runInNewContext('(function() ' + toggleBody() + ')();', sandbox);
  return {
    tools: tools || stationTools,
    quests: quests === null ? stationQuests : quests,
    toasts, announced
  };
}

const QUESTS = () => ([
  { type: 'xpThreshold', toolId: 'circuit', label: 'Earn 40 XP in circuit', params: { threshold: 40 } },
  { type: 'toolQuest', toolId: 'circuit', label: 'Build your first circuit', params: { hookId: 'firstCircuit' } },
  { type: 'xpThreshold', toolId: 'wave', label: 'Earn 40 XP in wave', params: { threshold: 40 } },
  { type: 'freeResponse', toolId: null, label: 'What did you learn?', params: { minLength: 30 } }
]);

describe('deselecting a tool removes its quests', () => {
  it('leaves no quest naming a tool the station does not carry', () => {
    const r = runToggle({ circuit: true, wave: true }, QUESTS(), 'circuit', 'Circuit Lab');
    const orphans = r.quests.filter((q) => q.toolId && !r.tools[q.toolId]);
    expect(orphans).toEqual([]);
  });

  it('removes exactly that tool\'s quests and no others', () => {
    const r = runToggle({ circuit: true, wave: true }, QUESTS(), 'circuit', 'Circuit Lab');
    expect(r.quests).toHaveLength(2);
    expect(r.quests.some((q) => q.toolId === 'wave')).toBe(true);
    expect(r.quests.some((q) => q.toolId === 'circuit')).toBe(false);
  });

  it('keeps reflection quests, which belong to no tool', () => {
    const r = runToggle({ circuit: true }, QUESTS(), 'circuit', 'Circuit Lab');
    expect(r.quests.some((q) => q.type === 'freeResponse')).toBe(true);
  });

  it('tells the teacher, on screen and to a screen reader', () => {
    const r = runToggle({ circuit: true, wave: true }, QUESTS(), 'circuit', 'Circuit Lab');
    expect(r.toasts).toHaveLength(1);
    expect(r.toasts[0]).toContain('2 quests');
    expect(r.toasts[0]).toContain('Circuit Lab');
    // Silently discarding a teacher's work is the thing to avoid.
    expect(r.announced).toHaveLength(1);
  });

  it('says nothing when the tool had no quests', () => {
    const r = runToggle({ circuit: true, wave: true }, QUESTS(), 'unused', 'Unused Tool');
    expect(r.toasts).toHaveLength(0);
    expect(r.quests).toHaveLength(4);
  });

  it('does not touch quests when ADDING a tool', () => {
    const r = runToggle({ wave: true }, QUESTS(), 'circuit', 'Circuit Lab');
    expect(r.quests).toHaveLength(4);
    expect(r.toasts).toHaveLength(0);
    expect(r.tools.circuit).toBe(true);
  });

  it('uses singular wording for a single quest', () => {
    const one = [{ type: 'xpThreshold', toolId: 'circuit', label: 'x', params: {} }];
    const r = runToggle({ circuit: true }, one, 'circuit', 'Circuit Lab');
    expect(r.toasts[0]).toContain('1 quest for');
    expect(r.toasts[0]).not.toContain('1 quests');
  });
});

describe('the save handler will not persist an orphan', () => {
  it('filters quests against the saved tool list', () => {
    const src = source();
    const at = src.indexOf('var _keptQuests = _stationQuests.filter(');
    expect(at, 'save-time orphan guard is gone').toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 300);
    // A quest with no toolId (a reflection) must survive the filter.
    expect(region).toContain('!q.toolId || _inStation[q.toolId]');
  });

  it('saves the filtered list, not the raw one', () => {
    const src = source();
    const at = src.indexOf("id: 'station_' + Date.now()");
    const region = src.slice(at, at + 700);
    expect(region).toContain('quests: _keptQuests.map(');
    expect(region).not.toContain('quests: _stationQuests.map(');
  });

  it('reports anything it dropped rather than discarding silently', () => {
    const src = source();
    expect(src).toContain('_droppedCount > 0');
    expect(src).toContain('dropped for unselected tools');
  });

  it('builds the membership set from the tools actually being saved', () => {
    const src = source();
    const at = src.indexOf('var _inStation = {};');
    expect(at).toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 200);
    // selectedIds is what lands in station.tools, so the check must use it.
    expect(region).toContain('selectedIds.forEach(');
  });
});
