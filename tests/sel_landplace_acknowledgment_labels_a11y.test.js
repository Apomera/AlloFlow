import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_landplace.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_landplace.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Land and Place acknowledgment field accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('associates all four visible titles with their textareas', () => {
    const text = source();
    for (const field of ['where', 'whose', 'honesty', 'commit']) {
      expect(text).toContain(`htmlFor: 'land-ack-${field}'`);
      expect(text).toContain(`id: 'land-ack-${field}'`);
    }
  });

  it('connects each field to its detailed guidance', () => {
    const text = source();
    for (const field of ['where', 'whose', 'honesty', 'commit']) {
      expect(text).toContain(`id: 'land-ack-${field}-help'`);
      expect(text).toContain(`'aria-describedby': 'land-ack-${field}-help'`);
    }
  });
});
