import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { stripWeldlabMilestoneFixes } from './helpers/weldlab_accessible_milestone_restore.js';
it('restores the exact turn-start source, including unrelated work, after reversing the recorded repairs', () => {
  const raw=readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
  expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
  expect([...raw.subarray(0,3)]).toEqual([239,187,191]);
  expect(raw.toString('utf8')).not.toContain('\r');
  const restored=stripWeldlabMilestoneFixes(raw.toString('utf8'));
  expect(createHash('sha256').update(restored,'utf8').digest('hex')).toBe('b0b581c9b4d7778e7462c08b3c1f2c85f93d96ea629dbbe1ae516f467264062c');
  expect(stripWeldlabMilestoneFixes(restored)).toBe(restored);
});
