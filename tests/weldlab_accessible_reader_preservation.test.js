import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { stripWeldlabReaderContrastFixes } from './helpers/weldlab_accessible_reader_contrast_restore.js';

it('restores every previous lesson byte after reversing only the recorded reader and contrast repairs', () => {
  const raw = readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
  expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
  expect([...raw.subarray(0, 3)]).toEqual([239, 187, 191]);
  expect(raw.toString('utf8').replace(/\r\n/g, '')).not.toContain('\n');
  const restored = stripWeldlabReaderContrastFixes(raw.toString('utf8'));
  const previous = Buffer.from(restored.replace(/\n/g, '\r\n'), 'utf8');
  expect(createHash('sha256').update(previous).digest('hex')).toBe('4677b82f2d25dc7a183a332d3adac7e735f712b0019da75add63bfa5688aced0');
  expect(stripWeldlabReaderContrastFixes(restored)).toBe(restored);
});
