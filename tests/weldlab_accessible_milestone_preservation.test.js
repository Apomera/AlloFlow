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
  expect(createHash('sha256').update(restored,'utf8').digest('hex')).toBe('e9997fd62e4933cd320503cc0469575c3f284fff40019adc44f34c3e8438d789');
  expect(stripWeldlabMilestoneFixes(restored)).toBe(restored);
});
