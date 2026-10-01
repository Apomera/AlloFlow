// Education Law Navigator: a document that fails to fetch must say so (2026-09-21).
//
// check_stem_a11y reported this tool as "placeholder-render" — audited on its
// loading screen and never on its real UI. Looking into why turned up a defect
// rather than a harness limitation.
//
// The tool has a careful load-failure screen. Its wording is the point of the
// tool: "it will not display anything from memory instead". But it renders only
// under `loadErr && !manifest` — the MANIFEST failing. A DOCUMENT failing wrote
// the same shared state, which that branch never reaches once a manifest is
// present, so the reader sat on "Loading the official text…" permanently, with
// no error, no retry, and no hint that anything had gone wrong.
//
// That is the worst available failure for this particular tool: a parent reading
// special-education law cannot tell "still loading" from "never going to load",
// and the tool's whole promise is that it shows only text it actually fetched.
//
// Failures are per-document, so the record is now per-slug (_docErr), and all
// four loading sites prefer the failure over the spinner.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const TOOL = 'stem_lab/stem_tool_lawnavigator.js';
const src = fs.readFileSync(path.join(ROOT, TOOL), 'utf8');

// Every place the tool can show the loading string. Each one is a place a
// reader can get stuck, so each must consult the failure state first.
const LOADING = /stem\.lawNav\.loading/g;

describe('a failed document fetch is recorded per document', () => {
  it('keeps a per-slug error map, not just the shared manifest error', () => {
    expect(src).toMatch(/var _docErr = \{\}/);
    // The shared setLoadErr is for the manifest; ensureDoc must not use it,
    // because that message has nowhere to render once a manifest exists.
    const ensure = src.slice(src.indexOf('function ensureDoc'), src.indexOf('function setLN'));
    expect(ensure).toContain('_docErr[slug]');
    expect(ensure, 'ensureDoc should not write the manifest-scoped error').not.toContain('setLoadErr');
  });

  it('stops re-requesting a document that already failed', () => {
    // ensureDoc is called from render. Without this, a dead corpus entry
    // re-fetches on every single render for as long as the view is open.
    const ensure = src.slice(src.indexOf('function ensureDoc'), src.indexOf('function setLN'));
    expect(ensure).toMatch(/if \(_docErr\[slug\] && !retry\) return;/);
  });

  it('clears the error when the reader explicitly retries', () => {
    const ensure = src.slice(src.indexOf('function ensureDoc'), src.indexOf('function setLN'));
    expect(ensure).toMatch(/delete _docErr\[slug\]/);
    expect(src).toMatch(/ensureDoc\(slug, true\)/);
  });
});

describe('the failure screen offers a way forward', () => {
  const helper = src.slice(src.indexOf('function docLoadFailure'), src.indexOf('function docLoadFailure') + 2200);

  it('is announced, not just drawn', () => {
    // A reader using a screen reader is the one most likely to be left waiting
    // on a spinner they cannot see.
    expect(helper).toMatch(/role: 'alert'/);
  });

  it('offers both a retry and the official source', () => {
    expect(helper).toContain('stem.lawNav.doc_err_retry');
    expect(helper).toMatch(/meta && meta\.sourceUrl/);
    expect(helper).toMatch(/rel: 'noopener noreferrer'/);
  });

  it('repeats the promise that nothing is shown from memory', () => {
    // This is the tool's central claim; the failure path is exactly where a
    // lesser tool would paraphrase a half-remembered rule.
    expect(helper).toMatch(/text recalled from memory/i);
  });

  it('renders nothing at all when there is no failure', () => {
    // Otherwise it would replace the legitimate loading state.
    expect(helper).toMatch(/if \(!why\) return null;/);
  });

  it('gives the retry control a real touch target', () => {
    expect(helper).toMatch(/minHeight: 32/);
  });
});

describe('every loading site consults the failure state', () => {
  it('no loading string is reachable without a failure check', () => {
    const lines = src.split('\n');
    const stuck = [];
    lines.forEach((line, i) => {
      if (!/stem\.lawNav\.loading/.test(line)) return;
      // The manifest spinner is covered by the separate `loadErr && !manifest`
      // screen above it, so it is the one legitimate bare spinner.
      const isManifestSpinner = lines.slice(Math.max(0, i - 6), i).some((l) => /if \(!manifest\) \{/.test(l));
      if (isManifestSpinner) return;
      if (!/docLoadFailure\(/.test(line)) stuck.push(i + 1);
    });
    expect(stuck, `these lines can strand a reader on a spinner: ${stuck.join(', ')}`).toEqual([]);
  });

  it('still has all the loading sites it started with', () => {
    // Guards the check above: deleting the spinners would also make it pass.
    expect((src.match(LOADING) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('the failure renderer only reads bindings that exist', () => {
  // The first version of this fix passed `fm` — a forEach callback parameter —
  // from a branch outside that callback. It parses fine and throws
  // ReferenceError at runtime, precisely when a fetch fails. node --check
  // cannot see it, so it is pinned here.
  it('does not reference the federal forEach parameter outside its callback', () => {
    const compare = src.slice(src.indexOf('var panels = []'), src.indexOf('var panels = []') + 3000);
    const callbackEnd = compare.indexOf('panels.length ?');
    const afterCallback = compare.slice(callbackEnd);
    expect(afterCallback, 'fm is out of scope here').not.toMatch(/\bfm\./);
  });

  it('captures the failed federal document while it is in scope', () => {
    expect(src).toMatch(/var failedFed = null;/);
    expect(src).toMatch(/if \(_docErr\[fm\.slug\] && !failedFed\) failedFed = fm;/);
    expect(src).toMatch(/failedFed && docLoadFailure\(failedFed\.slug, failedFed, true\)/);
  });

  it('passes a metadata object that actually carries sourceUrl at each site', () => {
    // sm, meta and smeta all come from manifest.documents, which is where
    // sourceUrl lives; failedFed is one of those same entries.
    expect(src).toMatch(/docLoadFailure\(sm\.slug, sm, true\)/);
    expect(src).toMatch(/docLoadFailure\(activeSlug, meta\)/);
    expect(src).toMatch(/docLoadFailure\(activeSlug, smeta\)/);
    expect(src).toMatch(/var smeta = docsMeta\.filter/);
  });
});

describe('the deployed copies carry the fix', () => {
  it('every mirror matches the source', () => {
    for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const mirror = path.join(ROOT, dir, 'stem_lab/stem_tool_lawnavigator.js');
      if (!fs.existsSync(mirror)) continue;
      expect(fs.readFileSync(mirror, 'utf8'), dir).toBe(src);
    }
  });
});
