import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'acorn';

/**
 * Unreachable mode/tab bodies.
 *
 * The Aquarium tool shipped with five whole tabs — Learn, Quiz, Water Lab,
 * Designer and Stress Lab — that could never render. Their `mode === 'learn'`
 * guards were nested INSIDE the `mode === 'marine'` element, so they were only
 * ever evaluated while mode was 'marine' and could never be true. Money Lab had
 * the same defect hiding its Word Problems tab inside the Grocery Store tab.
 *
 * Indentation looked correct in both files, and neither `node --check` nor any
 * render smoke test can see it: the tool renders fine, it just silently omits
 * whole features. Parsing is the only way to catch it, so this guards the class
 * across every STEM tool rather than the two that happened to be found.
 */

const STEM_DIR = 'stem_lab';

/** `X === 'literal' && <rhs>` → { name, value }, else null. */
function guardOf(node) {
  if (!node || node.type !== 'LogicalExpression' || node.operator !== '&&') return null;
  const left = node.left;
  if (!left || left.type !== 'BinaryExpression' || left.operator !== '===') return null;
  const id = left.left;
  const lit = left.right;
  if (!id || id.type !== 'Identifier') return null;
  if (!lit || lit.type !== 'Literal' || typeof lit.value !== 'string') return null;
  return { name: id.name, value: lit.value };
}

function unreachableGuards(source) {
  const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', locations: true });
  const hits = [];
  const seen = new Set();

  (function walk(node, stack) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(n => walk(n, stack));
    if (typeof node.type !== 'string') return;

    const guard = guardOf(node);
    if (guard) {
      const clash = stack.find(s => s.name === guard.name && s.value !== guard.value);
      if (clash) {
        const key = `${node.loc.start.line}:${guard.name}=${guard.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          hits.push(
            `line ${node.loc.start.line}: ${guard.name} === '${guard.value}' is nested inside ` +
            `${clash.name} === '${clash.value}' (line ${clash.line}) and can never be true`
          );
        }
      }
      // Only the right-hand side runs under the guard.
      walk(node.left, stack);
      walk(node.right, stack.concat([{ ...guard, line: node.loc.start.line }]));
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
      walk(node[key], stack);
    }
  })(ast, []);

  return hits;
}

const files = fs.readdirSync(STEM_DIR)
  .filter(f => f.endsWith('.js') && !f.endsWith('.bak'))
  .map(f => path.join(STEM_DIR, f));

describe('STEM tools have no unreachable mode or tab bodies', () => {
  it('finds tool files to check', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files)('%s', file => {
    const source = fs.readFileSync(file, 'utf8');
    let hits;
    try {
      hits = unreachableGuards(source);
    } catch (err) {
      // A file this parser cannot read would be silently "clean", which is the
      // failure mode this whole check exists to avoid. Fail loudly instead.
      throw new Error(`${file} could not be parsed: ${err.message}`);
    }
    expect(hits, `${file} has branches that can never render`).toEqual([]);
  });
});
