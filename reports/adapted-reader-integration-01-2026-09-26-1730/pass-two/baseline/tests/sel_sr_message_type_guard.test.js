// Live-region messages must survive a malformed save (2026-09-20).
//
// Every SEL tool renders its announcements into an aria-live region as
// `d._srMsg`. Ten of those sites guarded it with `d._srMsg || ''`, which is a
// TRUTHINESS check, not a type check: null and undefined fall back, but a
// string is not the only other option. A saved project file is INPUT, and a
// corrupted or hand-edited one can put an object there — at which point React
// throws "Objects are not valid as a React child" and the whole tool renders
// blank.
//
// Two gates were blind to this. check_sel_hostile_tooldata caught exactly ONE
// of the ten (teamwork), because only its fixture happened to seed _srMsg with
// an object. check_stem_hostile_tooldata caught none of the three STEM cases,
// because nothing in those tools WRITES _srMsg, so no fixture ever seeds it.
// Scanning the source finds what seeding cannot.
//
// The failure is worse than an ordinary blank screen: the crashing node is the
// accessibility announcement, so the first user to hit it is a screen-reader
// user.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SEL_DIR = path.join(ROOT, 'sel_hub');
const STEM_DIR = path.join(ROOT, 'stem_lab');
const DEPLOYED_SEL_DIR = path.join(ROOT, 'desktop/web-app/public/sel_hub');

// Read each file ONCE. The tool sources total ~115MB and this file sits on a
// network-backed drive; re-reading them per assertion intermittently blew the
// 5s default timeout, which surfaced as a flaky failure rather than an honest
// one. Load up front, assert against memory.
function loadTools(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, src: fs.readFileSync(path.join(dir, name), 'utf8') }));
}

const selTools = loadTools(SEL_DIR, /^sel_tool_[a-z0-9]+\.js$/);
const stemTools = loadTools(STEM_DIR, /^stem_tool_[a-z0-9]+\.js$/);
const deployedSelTools = loadTools(DEPLOYED_SEL_DIR, /^sel_tool_[a-z0-9]+\.js$/);

// Both quote styles appear in the codebase; molecule used the double-quoted form.
const hasBareFallback = (src) => src.includes("_srMsg || ''") || src.includes('_srMsg || ""');

const offendingLines = ({ name, src }) => {
  const hits = [];
  src.split(/\r?\n/).forEach((line, index) => {
    if (hasBareFallback(line)) hits.push(`${name}:${index + 1}`);
  });
  return hits;
};

describe('live-region messages are type-guarded, not truthiness-guarded', () => {
  it('finds the tools at all, so a green run is not vacuous', () => {
    expect(selTools.length).toBeGreaterThan(20);
    expect(stemTools.length).toBeGreaterThan(20);
    expect(selTools.some(({ src }) => src.includes('_srMsg'))).toBe(true);
  });

  it('no SEL tool renders _srMsg behind a bare `|| \'\'` fallback', () => {
    const offenders = selTools.filter(({ src }) => hasBareFallback(src)).flatMap(offendingLines);
    expect(offenders, 'use `typeof d._srMsg === "string" ? d._srMsg : ""`').toEqual([]);
  });

  it('no STEM tool does either', () => {
    // graphcalc, geosandbox and molecule each had one, and no hostile-save
    // fixture could have reached them.
    const offenders = stemTools.filter(({ src }) => hasBareFallback(src)).flatMap(offendingLines);
    expect(offenders).toEqual([]);
  });

  it('every SEL tool that renders _srMsg checks its type first', () => {
    const unguarded = selTools
      .filter(({ src }) => src.includes('_srMsg'))
      .filter(({ src }) => !/typeof\s+\w+\._srMsg\s*===\s*['"]string['"]/.test(src))
      .map(({ name }) => name);
    expect(unguarded).toEqual([]);
  });

  it('the deployed copies carry the same guards', () => {
    // A fixed source with an unfixed deployed copy still ships the crash.
    const drifted = deployedSelTools.filter(({ src }) => hasBareFallback(src)).map(({ name }) => name);
    expect(drifted).toEqual([]);
  });

  // _srMsg is the common case, not the only one: goals and journal each render
  // a save-backed *Notice string into an aria-live region the same way. Catch
  // the shape rather than a list of field names, so the next one is caught on
  // the day it lands instead of the day a fixture happens to seed it.
  it('no aria-live region renders a save-backed string behind bare truthiness', () => {
    const LIVE_REGION_FALLBACK = /'aria-live':\s*'polite'[^\n]*?\}\s*\},\s*\w+\.(\w+)\s*\|\|\s*(?:''|"")\s*\)/g;
    const offenders = [];
    for (const { name, src } of [...selTools, ...stemTools]) {
      if (!src.includes('aria-live')) continue;
      for (const match of src.matchAll(LIVE_REGION_FALLBACK)) {
        offenders.push(`${name} -> ${match[1]}`);
      }
    }
    expect(offenders, 'guard on type: `typeof d.x === "string" ? d.x : ""`').toEqual([]);
  });
});

describe('why truthiness is not enough', () => {
  // Pins the reasoning rather than restating it in prose: these are the values a
  // corrupted save can actually hold.
  const render = (value) => ({
    guarded: typeof value === 'string' ? value : '',
    truthy: value || '',
  });

  it('lets null and undefined through either way', () => {
    for (const value of [null, undefined]) {
      const { guarded, truthy } = render(value);
      expect(guarded).toBe('');
      expect(truthy).toBe('');
    }
  });

  it('only the type check stops a non-string reaching React', () => {
    for (const value of [{ parks: 1 }, 42, true, ['a']]) {
      const { guarded, truthy } = render(value);
      expect(guarded).toBe('');
      // The bug: the old guard passes the raw value straight through to React.
      expect(truthy).not.toBe('');
      expect(typeof truthy).not.toBe('string');
    }
  });
});
