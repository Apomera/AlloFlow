// Nuclear Lab — a corrupted save must degrade, never blank the tool.
//
// Saved tool state round-trips through storage and sync, so any field can come
// back the wrong type. A throw in the RENDER path is not a degraded feature —
// it is a blank lab, with the student's whole session gone.
//
// This sweep found one: `(d.nkQuery || '').trim()` threw for a saved number,
// object, array or true, because `||` only catches falsy values and every one
// of those is truthy. nkQuery is persisted by upd(), so it was reachable. The
// same shape had already bought 19 of 25 quests through
// `(d.x || []).length` in questHooks, and Art Studio shipped two saved-state
// crashes of this class the same week.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

// Values a corrupted or hand-edited save can realistically hold. `null` and
// `undefined` are deliberately included: those ARE caught by `||`, so a test
// that used only them would pass against the broken code.
const HOSTILE = [
  ['a string', 'xxxxxxxxxx'],
  ['a number', 7],
  ['an object', { a: 1 }],
  ['an array', [1, 2, 3]],
  ['true', true],
  ['null', null],
];

describe('no saved value can blank the lab', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  });

  // Every `d.<key>` the tool reads, taken from source so a new field is swept
  // automatically rather than needing to be remembered here.
  const keys = [...new Set(
    [...SRC.matchAll(/\bd\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
  )].sort();

  it('reads enough saved keys for this sweep to mean something', () => {
    expect(keys.length, 'no d.<key> reads found — did the state shape change?')
      .toBeGreaterThan(50);
  });

  it('renders a full document for every key at every hostile type', () => {
    const failures = [];
    for (const key of keys) {
      for (const [label, value] of HOSTILE) {
        let html;
        try {
          html = renderTool('nuclearLab', { _nuclearLab: { [key]: value } });
        } catch (err) {
          failures.push(`${key} = ${label}: THREW ${String(err.message).slice(0, 80)}`);
          continue;
        }
        // A tool that renders a stub instead of throwing is still broken: the
        // student loses the section. Require a real document.
        if (!html || html.length < 5000) {
          failures.push(`${key} = ${label}: rendered only ${html ? html.length : 0} bytes`);
        }
      }
    }
    expect(failures, 'a malformed save broke the render:\n  ' + failures.join('\n  ')).toEqual([]);
    // ~560 full renders of a 450 KB tool. Comfortably fast on its own, but
    // vitest runs FILES in parallel and the 5 s default tipped this over on a
    // busy machine — which reads as a saved-state crash and is not one.
  }, 120000);

  it('never calls a string method on a saved value without checking the type', () => {
    // The static form of the crash above, so a new one is caught before the
    // sweep has to find it.
    // Strip line comments first. The fix for this very bug DOCUMENTS the broken
    // idiom in a comment, and a scan that cannot tell code from prose fires on
    // the explanation of the thing it is preventing.
    const code = SRC.split('\n')
      .map((line) => line.replace(/^\s*\/\/.*$/, ''))
      .join('\n');
    const bad = [...code.matchAll(/\(d\.([A-Za-z0-9_]+) \|\| ''\)\.(\w+)/g)]
      .map((m) => `d.${m[1]} || '' then .${m[2]}()`);
    expect(bad, 'a saved value is being treated as a string without a typeof check').toEqual([]);
  });

  it('still searches normally with a real string', () => {
    // The guard must not be so blunt that search stops working.
    const html = renderTool('nuclearLab', { _nuclearLab: { nkQuery: 'radon', nkOpen: true } });
    expect(html.length).toBeGreaterThan(5000);
    expect(html).toContain('radon');
  });
});
