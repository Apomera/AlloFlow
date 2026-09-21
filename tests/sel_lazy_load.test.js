// The SEL Hub must load tool modules on demand, not all at once.
//
// Until 2026-09-20 opening the hub fetched every SEL tool in one batch. After
// the manifest repair that was 16.5 MB before a student could touch anything —
// roughly 11s on school wifi and 41s on a weak connection — to open one tool.
// STEM had already solved this (catalog eager, each lab on selection); SEL kept
// the batch because its grid looked like it needed every module. It does not:
// the card catalog lives in sel_hub_module.js, independent of the tool files.
//
// A regression is invisible in the UI. Batch and lazy look identical once
// everything has arrived; only the wait changes, and only for the connections
// least able to afford it. So this is asserted by driving the REAL
// makeEnsureLoader closure out of the generated App.jsx, not by pinning source
// text that a refactor would quietly reword.
//
// The gate also covers the failure path: before this, a SEL module that failed
// to download left no error, no retry and no diagnostic — the tool just never
// appeared. Canvas has no reachable console, so that gave a teacher nothing to
// report.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_lazy_load.cjs');
const HUB = resolve(process.cwd(), 'sel_hub/sel_hub_module.js');

function runGate(args = []) {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [GATE, ...args], {
        cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      }),
    };
  } catch (err) {
    if (err.stdout != null) return { code: err.status ?? 1, out: err.stdout };
    throw err;
  }
}

describe('SEL lazy loading', () => {
  const report = JSON.parse(runGate(['--json']).out);

  it('defers the tools and keeps only the support files eager', () => {
    // Vacuity guard: a parser that returned nothing would make the rest pass.
    expect(report.toolCount).toBeGreaterThan(60);
    expect(report.supportCount).toBeGreaterThan(0);
    expect(report.supportCount).toBeLessThan(5);
  });

  it('every behavioural check passes', () => {
    const failed = report.results.filter((r) => !r.ok);
    const detail = failed.map((r) => `${r.name} — ${r.detail}`).join('\n');
    expect(failed, detail).toHaveLength(0);
  });

  it('opening a tool actually requests its module', () => {
    // The loader can be perfect and the hub still dead: before this change
    // openSelToolById() toasted "is loading..." at a file nothing had asked
    // for. The request is what makes a card openable.
    const src = readFileSync(HUB, 'utf8');
    expect(src).toMatch(/__alloEnsureSelPluginLoaded/);
    const open = src.slice(src.indexOf('function openSelToolById'));
    const body = open.slice(0, open.indexOf('\n      }'));
    expect(body, 'openSelToolById must request the module it needs')
      .toMatch(/__alloEnsureSelPluginLoaded/);
  });

  it('a student in crisis is still offered Crisis Companion', () => {
    // The crisis-search support panel renders its route into Crisis Companion
    // CONDITIONALLY. Gated on isRegistered, that button disappears entirely on a
    // lazily-loaded hub — a student who searched crisis vocabulary would get the
    // support text and no way through. This is the single most important
    // consequence of the batch-to-lazy change.
    const src = readFileSync(HUB, 'utf8');
    expect(src).toMatch(/_selToolIsOpenable\('crisiscompanion'\)/);
    expect(src, 'the crisis button must not gate on the module already being loaded')
      .not.toMatch(/isRegistered\('crisiscompanion'\)\s*&&\s*h\('button'/);
  });

  it('openability is decided by the catalog, not by what has loaded', () => {
    const src = readFileSync(HUB, 'utf8');
    const at = src.indexOf('function _selToolIsOpenable');
    expect(at, '_selToolIsOpenable is missing').toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf('\n      }', at));
    // Registered tools stay openable even with no loader, so an older host that
    // still batch-loads is unaffected.
    expect(body).toMatch(/isRegistered\(toolId\)\)\s*return true/);
    // And a tool with no card is never openable, loader or not.
    expect(body).toMatch(/_selToolById\(toolId\)/);
  });

  it('does not promise a load it never started', () => {
    // If the loader is missing, saying "loading..." is a lie the student waits
    // on. The failure branch must say the tool could not be opened.
    const src = readFileSync(HUB, 'utf8');
    const open = src.slice(src.indexOf('function openSelToolById'));
    const body = open.slice(0, open.indexOf('\n      }'));
    expect(body).toMatch(/could not be opened/);
  });
});
