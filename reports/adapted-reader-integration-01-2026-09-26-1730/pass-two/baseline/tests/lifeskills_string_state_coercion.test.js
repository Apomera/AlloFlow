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
function loadAsText(file) {
  const body = bodyOf(read(file), 'asText');
  if (!body) throw new Error('asText not found in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function(body + '; return asText;')();
}

describe('Life Skills Lab — persisted string state', () => {
  it('turns a persisted object into text instead of crashing the render', () => {
    // THE BUG, found by an exhaustive hostile-state sweep (33 tabs x every
    // persisted key x 8 malformed values). `d.chalFeedback || ''` only replaces
    // FALSY values, so a persisted {} sailed through into a React child and threw
    // "Objects are not valid as a React child" — blanking the entire lab, not just
    // the one message. `|| ''` is not a type guard.
    const asText = loadAsText(SOURCE);
    expect(asText({})).toBe('');
    expect(asText({ a: { b: 1 } })).toBe('');
    expect(asText([1, 2])).toBe('');
    expect(asText(function () {})).toBe('');
  });

  it('keeps real strings exactly as they are', () => {
    const asText = loadAsText(SOURCE);
    expect(asText('hello')).toBe('hello');
    expect(asText('')).toBe('');
    expect(asText('0')).toBe('0');
  });

  it('renders a primitive rather than dropping it', () => {
    // A number or boolean is safe to show; only structures are not.
    const asText = loadAsText(SOURCE);
    expect(asText(7)).toBe('7');
    expect(asText(true)).toBe('true');
  });

  it('treats null and undefined as empty', () => {
    const asText = loadAsText(SOURCE);
    expect(asText(null)).toBe('');
    expect(asText(undefined)).toBe('');
  });

  it('leaves no `d.X || \'\'` string reads behind', () => {
    // The whole class, not just the key the sweep happened to hit: there were 100
    // of these, any of which would crash the same way.
    const src = read(SOURCE);
    const leftovers = src.match(/= d\.[a-zA-Z0-9_]+ \|\| '';/g) || [];
    expect(leftovers, 'unguarded string reads: ' + leftovers.slice(0, 5).join(', ')).toHaveLength(0);
  });

  it('routes a good number of keys through the guard', () => {
    // Guards the premise of the test above: if asText stopped being used, the
    // "no leftovers" check would still pass while nothing was protected.
    const src = read(SOURCE);
    const used = src.match(/= asText\(d\.[a-zA-Z0-9_]+\);/g) || [];
    expect(used.length).toBeGreaterThan(90);
  });

  it('ships the same coercion in the desktop mirror', () => {
    expect(bodyOf(read(MIRROR), 'asText')).toBe(bodyOf(read(SOURCE), 'asText'));
  });
});
