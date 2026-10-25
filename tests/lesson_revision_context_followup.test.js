import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const source = fs.readFileSync('allo_command_context_source.js', 'utf8');
const ast = parser.parse(source, { sourceType: 'script' });
let callback;
function walk(node) {
  if (!node || !node.type) return;
  if (node.type === 'ObjectProperty' && node.key?.name === 'discardLessonRevision' && node.value?.type === 'ArrowFunctionExpression') callback = node.value;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value?.type) walk(value);
  }
}
walk(ast);
if (!callback) throw Error('Native revision discard capability missing');
const forward = host => vm.runInNewContext('(' + source.slice(callback.start, callback.end) + ')', { discardLessonRevision: host });

describe('revision draft and explicit-close context forwarding', () => {
  it('forwards explicit close separately from discarding a pending proposal', () => {
    const host = vi.fn(() => true), options = { close: true };
    expect(forward(host)('review-1', options)).toBe(true);
    expect(host).toHaveBeenCalledWith('review-1', options);
    expect(host.mock.calls[0][1]).toBe(options);
  });
  it('keeps ordinary draft discard on the default Undo-preserving host path', () => {
    const host = vi.fn(() => true);
    forward(host)('review-1');
    expect(host).toHaveBeenCalledWith('review-1', undefined);
  });
  it('keeps cached shells without the discard capability usable', () => {
    expect(forward(undefined)('review-1', { close: true })).toBe(false);
  });
});
