// SEL Hub — when the AI is unreachable, the student must be told.
//
// Twenty-four catch handlers cleared their loading flag and did nothing else: the
// spinner stopped, the screen returned to exactly how it was, and there was no way
// to tell "the AI is down" from "my click did not register". Several of these tools
// announced SUCCESS to a screen reader and had no failure counterpart at all.
//
// Asserted as a CONTRACT over every catch that clears a loading flag, not as a list
// of the sites that happened to be wrong — the failure mode here is a copy-paste of
// the bare shape into a new tool.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SEL = resolve(process.cwd(), 'sel_hub');

// Walk from the '(' of `.catch(` to its matching ')'.
function balancedFrom(src, openIdx) {
  let d = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '(') d++;
    else if (c === ')') { d--; if (d === 0) return src.slice(openIdx, i + 1); }
  }
  return null;
}

const CLEARS = /['"]?(\w*[Ll]oading\w*)['"]?\s*:\s*false|upd\(\s*'(\w*[Ll]oading\w*)'\s*,\s*false|set\w*Loading\(\s*false/;
// Either an explicit message, or substitute CONTENT written into state (a coach
// line, a reflection). Both leave the student knowing what happened; a bare flag
// clear does not.
const TOAST = /addToast\(|announceToSR\(/;

function catchesThatClearLoading() {
  const out = [];
  for (const f of readdirSync(SEL).filter((n) => /^sel_tool_.*\.js$/.test(n))) {
    const src = readFileSync(join(SEL, f), 'utf8');
    const re = /\.catch\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      const body = balancedFrom(src, m.index + m[0].length - 1);
      if (!body || !CLEARS.test(body)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      const toast = TOAST.test(body);
      // substitute content: a quoted sentence (has an internal space) that is not
      // just an identifier-ish token
      const fallback = (body.match(/'((?:\\.|[^'\\]){12,})'/g) || []).some((s) => /[a-z] [a-z]/i.test(s));
      out.push({ file: f, line, toast, fallback, body: body.replace(/\s+/g, ' ').slice(0, 100) });
    }
  }
  return out;
}

describe('SEL Hub · an AI failure is never silent', () => {
  const sites = catchesThatClearLoading();

  it('the probe finds the handlers it is meant to police', () => {
    expect(sites.length, 'no loading-clearing catch handlers found — this suite would pass vacuously').toBeGreaterThan(50);
  });

  it('every catch that stops a spinner also tells the student something', () => {
    const bare = sites.filter((s) => !s.toast && !s.fallback)
      .map((s) => s.file.replace('sel_tool_', '').replace('.js', '') + ':' + s.line + '  ' + s.body);
    expect(bare, 'these clear the loading flag and say nothing: the screen silently reverts and a failed AI call looks like a dead button').toEqual([]);
  });

  it('the tools fixed in this pass announce the failure, not just toast it', () => {
    // The announcer is spelled announceToSR in most tools and announceSR in
    // selfadvocacy; assert the behaviour, accepting either name.
    const announcing = ['ethicalreasoning', 'cultureexplorer', 'civicaction', 'coping', 'restorativecircle', 'friendship', 'upstander', 'selfadvocacy'];
    for (const tool of announcing) {
      const src = readFileSync(join(SEL, 'sel_tool_' + tool + '.js'), 'utf8');
      const failureAnnounces = (src.match(/announceToSR\(\s*'[^']*(could not|not be)|announceSR\(\s*(msg|'[^']*(could not|not be))/g) || []).length;
      expect(failureAnnounces, tool + ': no failure is announced to a screen reader').toBeGreaterThan(0);
    }
  });
});
