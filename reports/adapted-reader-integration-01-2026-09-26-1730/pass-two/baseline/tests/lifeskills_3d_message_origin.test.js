import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

function bodyOf(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

/** Run the real predicate against a stubbed host origin. */
function loadOriginCheck(file, hostOrigin) {
  const body = bodyOf(read(file), 'lifeSkills3dOriginAllowed');
  if (!body) throw new Error('lifeSkills3dOriginAllowed not found in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function('window', body + '; return lifeSkills3dOriginAllowed;')(
    { location: { origin: hostOrigin } });
}

describe('Life Skills Lab — 3D bridge message origin', () => {
  it('rejects a message from a page that is not one of ours', () => {
    // THE BUG. The listener filtered only on `data.source` matching
    // /^alloflow-life-...-3d$/ and never looked at event.origin. That string is
    // attacker-controlled: any page — another tab, an embedded ad frame — could
    // post a matching object and the handler would award badges, XP and passport
    // progress for work the student never did. event.origin is set by the browser
    // and cannot be spoofed, so it is the only usable check.
    const allowed = loadOriginCheck(SOURCE, 'https://school.example.org');
    expect(allowed('https://evil.example.com')).toBe(false);
  });

  it('accepts the CDN and the page own origin', () => {
    const allowed = loadOriginCheck(SOURCE, 'https://school.example.org');
    expect(allowed('https://alloflow-cdn.pages.dev')).toBe(true);
    expect(allowed('https://school.example.org')).toBe(true);
  });

  it('is not fooled by a lookalike origin or an http downgrade', () => {
    // A prefix/suffix test would accept both of these. Compare exactly.
    const allowed = loadOriginCheck(SOURCE, 'https://school.example.org');
    expect(allowed('https://alloflow-cdn.pages.dev.evil.com')).toBe(false);
    expect(allowed('https://school.example.org.evil.com')).toBe(false);
    expect(allowed('http://alloflow-cdn.pages.dev')).toBe(false);
  });

  it('rejects an opaque or missing origin', () => {
    // A sandboxed iframe posts origin "null"; treating that as same-origin would
    // reopen the hole for any attacker who can embed us in a sandboxed frame.
    const allowed = loadOriginCheck(SOURCE, 'https://school.example.org');
    for (const o of ['null', '', undefined, null, 0]) {
      expect(allowed(o), `accepted opaque origin ${JSON.stringify(o)}`).toBe(false);
    }
  });

  it('checks the origin before handing the message to the handler', () => {
    // The guard has to sit in the listener, ahead of bridge.handle — validating
    // after dispatch would be no validation at all.
    const src = read(SOURCE);
    const i = src.indexOf("window.addEventListener('message'");
    const j = src.indexOf('bridge.handle(data)', i);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    const between = src.slice(i, j);
    expect(between).toContain('lifeSkills3dOriginAllowed(event.origin)');
  });

  it('ships the same origin check in the desktop mirror', () => {
    expect(bodyOf(read(MIRROR), 'lifeSkills3dOriginAllowed'))
      .toBe(bodyOf(read(SOURCE), 'lifeSkills3dOriginAllowed'));
  });
});
