// Quest contract conformance battery (2026-07-27).
//
// Four engines grew their own progress vocabulary. This suite is the mechanism
// that keeps them speaking one language: every engine's native quest type must
// map onto a canonical kind in allo_quest_contract_module.js, and the shared
// engagement timeout must be identical in every copy.
//
// Manifest-driven on purpose (the idiom the STEM conformance battery already
// uses): adding a quest type to any engine is ONE row in ENGINES below. If an
// engine grows a type and nobody adds the mapping, this fails rather than
// silently letting a fourth definition of "5 minutes" ship.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const contract = require('../allo_quest_contract_module.js');

const anti = read('AlloFlowANTI.txt');
const stem = read('stem_lab/stem_lab_module.js');
const sel = read('sel_hub/sel_hub_module.js');

// ── The manifest ────────────────────────────────────────────────────────────────
// source        : file the engine's native type list lives in
// extract       : pulls the native type ids straight out of that source, so the
//                 battery reads REALITY rather than a list restated here
// map           : the contract's native → canonical map for that engine
// adapter       : the contract function that builds a descriptor
// timeoutLiteral: regex for the engine's engagement-timeout fallback literal
const ENGINES = [
  {
    name: 'directions',
    source: anti,
    map: contract.DIRECTIONS_KIND_MAP,
    adapter: contract.fromDirections,
    typeField: 'kind',
    refField: 'resourceRef',
    extract: (src) => {
      // the normalizer's accepted-kind whitelist is the authoritative list
      const m = src.match(/if \(!\[([^\]]+)\]\.includes\(o\.kind\)\) return false;/);
      if (!m) throw new Error('directions kind whitelist not found');
      return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    },
    timeoutLiteral: /: 180000; \/\/ must equal AlloQuestContract\.ENGAGEMENT_TIMEOUT_MS/,
  },
  {
    name: 'stem',
    source: stem,
    map: contract.STEM_KIND_MAP,
    adapter: contract.fromStem,
    typeField: 'type',
    refField: 'toolId',
    extract: (src) => {
      const block = src.slice(src.indexOf('var QUEST_TYPES = ['));
      return [...block.slice(0, block.indexOf('];')).matchAll(/\{ id: '([a-zA-Z]+)'/g)].map(m => m[1]);
    },
    timeoutLiteral: /var _STEM_ENGAGEMENT_TIMEOUT_MS = 180000; \/\/ must equal AlloQuestContract\.ENGAGEMENT_TIMEOUT_MS/,
  },
  {
    name: 'sel',
    source: sel,
    map: contract.SEL_KIND_MAP,
    adapter: contract.fromSel,
    typeField: 'type',
    refField: 'toolId',
    extract: (src) => {
      const block = src.slice(src.indexOf('var SEL_QUEST_TYPES = ['));
      return [...block.slice(0, block.indexOf('];')).matchAll(/\{ id: '([a-zA-Z]+)'/g)].map(m => m[1]);
    },
    timeoutLiteral: /var _SEL_ENGAGEMENT_TIMEOUT_MS = 180000; \/\/ must equal AlloQuestContract\.ENGAGEMENT_TIMEOUT_MS/,
  },
];

describe.each(ENGINES)('$name conforms to the quest contract', (engine) => {
  const nativeTypes = engine.extract(engine.source);

  it('declares at least one quest type (the extractor still finds the list)', () => {
    expect(nativeTypes.length).toBeGreaterThan(0);
  });

  it('every native type maps to a canonical kind', () => {
    const unmapped = nativeTypes.filter(t => !engine.map[t]);
    expect(unmapped, `${engine.name} types with no canonical kind: ${unmapped.join(', ')}`).toEqual([]);
  });

  it('every mapped canonical kind exists in the registry', () => {
    Object.values(engine.map).forEach(kind => {
      expect(contract.KINDS[kind], `canonical kind "${kind}" is not in KINDS`).toBeTruthy();
    });
  });

  it('the map has no entries for types the engine does not actually have', () => {
    // A stale mapping is how a vocabulary drifts out of sync with reality.
    const stale = Object.keys(engine.map).filter(t => !nativeTypes.includes(t));
    expect(stale, `${engine.name} map references missing types: ${stale.join(', ')}`).toEqual([]);
  });

  it('the adapter builds a valid descriptor for every native type', () => {
    nativeTypes.forEach(t => {
      const q = { [engine.typeField]: t, [engine.refField]: 'ref-1', label: 'A goal', params: {} };
      const d = engine.adapter(q);
      expect(d, `adapter returned null for ${t}`).toBeTruthy();
      expect(d.kind).toBe(engine.map[t]);
      expect(d.engine).toBe(engine.name);
      expect(d.ref).toBe('ref-1');
      // a kind with a target must resolve one (authored or default), never NaN
      const spec = contract.KINDS[d.kind];
      if (spec.target) expect(typeof d.target).toBe('number');
      else expect(d.target).toBe(null);
    });
  });

  it('shares the one engagement timeout', () => {
    expect(engine.source).toMatch(engine.timeoutLiteral);
    expect(contract.ENGAGEMENT_TIMEOUT_MS).toBe(180000);
  });
});

describe('deliberate non-merges stay distinct', () => {
  it('directions XP is a DELTA; STEM/SEL XP is an ABSOLUTE total', () => {
    expect(contract.DIRECTIONS_KIND_MAP.xp).toBe('xpDelta');
    expect(contract.STEM_KIND_MAP.xpThreshold).toBe('xpTotal');
    expect(contract.SEL_KIND_MAP.xpThreshold).toBe('xpTotal');
    expect(contract.DIRECTIONS_KIND_MAP.xp).not.toBe(contract.STEM_KIND_MAP.xpThreshold);
  });
  it('directions "responded" counts FIELDS; freeResponse counts CHARACTERS', () => {
    expect(contract.DIRECTIONS_KIND_MAP.responded).toBe('answered');
    expect(contract.STEM_KIND_MAP.freeResponse).toBe('written');
    expect(contract.KINDS.answered.target).toBe(null);      // derived from the resource
    expect(contract.KINDS.written.target).toBe('minLength'); // authored
  });
  it('all three engines DO agree that time means the same thing', () => {
    expect(contract.DIRECTIONS_KIND_MAP.time).toBe('time');
    expect(contract.STEM_KIND_MAP.timeSpent).toBe('time');
    expect(contract.SEL_KIND_MAP.timeSpent).toBe('time');
    expect(contract.KINDS.time.engagementGated).toBe(true);
  });
});

describe('every engine that offers time gates accrual on engagement', () => {
  it('STEM ticks only while engaged', () => {
    expect(stem).toContain('if (!_stemIsEngaged()) return;');
  });
  it('SEL ticks only while engaged (it had NO check at all)', () => {
    expect(sel).toContain('if (!_selIsEngaged()) return;');
    // the old unconditional accrual is gone
    expect(sel).not.toMatch(/setInterval\(function \(\) \{\s*setQuestProgress/);
  });
  it('directions credits only engaged minutes', () => {
    expect(anti).toContain('if (isEngaged && _openResourceRef.current) {');
  });
  it('each standalone fallback prefers the contract constant when loaded', () => {
    expect(stem).toContain('function _stemEngagementTimeout()');
    expect(sel).toContain('function _selEngagementTimeout()');
    expect(anti).toContain('window.AlloQuestContract.ENGAGEMENT_TIMEOUT_MS');
  });
});

describe('contract behavior', () => {
  it('formatProgress caps display at the target and carries the unit', () => {
    expect(contract.formatProgress('time', 14, 10)).toBe('10/10 min');
    expect(contract.formatProgress('time', 4, 10)).toBe('4/10 min');
    expect(contract.formatProgress('xpTotal', 10, 50)).toBe('10/50 XP');
    expect(contract.formatProgress('written', 5, 30)).toBe('5/30 chars');
  });
  it('boolean kinds render no progress text, and junk never throws', () => {
    expect(contract.formatProgress('visited', 1, 0)).toBe('');
    expect(contract.formatProgress('manual', 1, 1)).toBe('');
    expect(contract.formatProgress('no-such-kind', 1, 2)).toBe('');
    expect(contract.formatProgress('time', null, 0)).toBe('');
  });
  it('isComplete honours each measure', () => {
    expect(contract.isComplete('time', 10, 10)).toBe(true);
    expect(contract.isComplete('time', 9, 10)).toBe(false);
    expect(contract.isComplete('score', 5, 5)).toBe(true);
    expect(contract.isComplete('visited', true)).toBe(true);
    expect(contract.isComplete('visited', false)).toBe(false);
    expect(contract.isComplete('no-such-kind', 99, 1)).toBe(false);
  });
  it('manual is the ONLY self-reported kind (the teacher split depends on it)', () => {
    const selfReported = Object.keys(contract.KINDS).filter(k => contract.isSelfReported(k));
    expect(selfReported).toEqual(['manual']);
  });
  it('unmappable quests are dropped, not rendered as unsatisfiable', () => {
    expect(contract.fromStem({ type: 'teleport' })).toBe(null);
    expect(contract.fromDirections(null)).toBe(null);
    expect(contract.fromSel({ type: '' })).toBe(null);
    expect(contract.fromStem({ type: 'constructor' })).toBe(null); // prototype-chain guard
  });
  it('an authored target beats the default; a junk target falls back', () => {
    expect(contract.fromStem({ type: 'timeSpent', params: { minutes: 3 } }).target).toBe(3);
    expect(contract.fromStem({ type: 'timeSpent', params: {} }).target).toBe(10);
    expect(contract.fromStem({ type: 'timeSpent', params: { minutes: -5 } }).target).toBe(10);
    expect(contract.fromStem({ type: 'timeSpent', params: { minutes: 'lots' } }).target).toBe(10);
  });
});
