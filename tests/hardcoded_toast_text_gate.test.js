import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const file = resolve('dev-tools/check_hardcoded_toast_text.cjs');
const source = readFileSync(file, 'utf8');
const entry = source.indexOf('\nconst files = argFiles.length');
if (entry < 0) throw new Error('Toast scanner entry point moved');
const require = createRequire(file);
const acorn = require('acorn');
const { unkeyedLiterals } = new Function('require', '__dirname', 'process',
  source.slice(source.indexOf('\n') + 1, entry) + '\nreturn { unkeyedLiterals };'
)(require, dirname(file), { argv: ['node', file] });
const scan = expression => unkeyedLiterals(acorn.parse(expression, {
  ecmaVersion: 'latest', locations: true,
}).body[0].expression);

describe('notification translation gate', () => {
  it.each(['_gxText', 'printTr', 'screenerLabel'])('recognizes the reviewed %s translator', helper => {
    expect(scan(`${helper}('notification.saved', 'Saved responses for {student}').replace('{student}', student)`)).toEqual([]);
  });

  it.each([
    "'Saved responses for a student.'",
    "condition ? _gxText('notification.saved', 'Saved responses.') : 'The response was lost.'",
    "unknownWrapper('notification.saved', 'The response was lost.')",
    "printTr('notification.saved', 'Saved responses.') + ' More unregistered instructions.'",
  ])('still rejects unkeyed prose: %s', expression => {
    expect(scan(expression).length).toBeGreaterThan(0);
  });

  it('excludes substitution tokens while retaining sentences containing one', () => {
    expect(scan("'{student}'")).toEqual([]);
    expect(scan("'{{student}}'")).toEqual([]);
    expect(scan("'Saved for {student}'")).toHaveLength(1);
  });
});
