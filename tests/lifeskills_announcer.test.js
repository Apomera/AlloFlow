import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

/** The body of a top-level `function <name>(...) { ... }`, brace-matched. */
function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

describe('Life Skills Lab — the announcer actually announces', () => {
  it('reaches the DOM rather than parking a string in toolData', () => {
    // The tool built a polite live region (#allo-live-lifeskills) at load and never
    // wrote to it. announceToSR only did `upd('srMsg', msg)`, and nothing anywhere in
    // the repo renders srMsg, so all 67 announcements were silent — tab switches, 3D
    // scene changes, budget results, interview feedback, capstone progress.
    //
    // Nothing could catch this: dead state renders fine, the live region exists in the
    // DOM so an axe scan passes, and every test was written against what IS shown.
    const src = read(SOURCE);
    const body = bodyOf(src, 'announceToSR');
    expect(body, 'announceToSR not found').toBeTruthy();
    expect(body).toContain('allo-live-lifeskills');
    expect(body).toMatch(/textContent\s*=/);
  });

  it('clears before setting so a repeated message is still announced', () => {
    // A screen reader does not re-announce identical text. Two identical messages in a
    // row would otherwise be spoken once. Same shape as the epidemic fix.
    const body = bodyOf(read(SOURCE), 'announceToSR');
    const clearFirst = body.indexOf("textContent = ''");
    const setAfter = body.search(/textContent\s*=\s*String\(/);
    expect(clearFirst, 'no clear-first step').toBeGreaterThan(-1);
    expect(setAfter, 'no set step').toBeGreaterThan(-1);
    expect(clearFirst).toBeLessThan(setAfter);
    expect(body).toMatch(/setTimeout/);
  });

  it('survives having no DOM at all', () => {
    // The render smoke harness has no document. An announcer that throws there takes
    // the whole tool down, and renderTool() swallows the throw, so it would go blank
    // with nothing in the console.
    const body = bodyOf(read(SOURCE), 'announceToSR');
    expect(body).toMatch(/try\s*\{/);
    expect(body).toMatch(/catch\s*\(/);
  });

  it('still builds the live region it writes into', () => {
    const src = read(SOURCE);
    expect(src).toContain("lr.id = 'allo-live-lifeskills'");
    expect(src).toMatch(/setAttribute\(\s*'aria-live'\s*,\s*'polite'\s*\)/);
  });

  it('keeps the CDN and desktop copies byte-identical', () => {
    expect(read(MIRROR)).toBe(read(SOURCE));
  });
});
