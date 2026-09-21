import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('tests/vacuous_fixture_1789959274937/fixture_source.js', 'utf8');
describe('healthy pin', () => {
  it('pins something that exists', () => {
    expect(source).toContain('function pinnedFunction()');
  });
});