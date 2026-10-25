import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { stripWeldlabPhaseFixes } from './helpers/weldlab_accessible_phase_restore.js';

it('recovers the complete prior source after reversing only the recorded phase and probe accessibility repairs', () => {
  const raw = readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
  expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
  expect([...raw.subarray(0, 3)]).toEqual([239, 187, 191]);
  expect(raw.toString('utf8').replace(/\r\n/g, '')).not.toContain('\n');
  const restored = stripWeldlabPhaseFixes(raw.toString('utf8'));
  const previous = Buffer.from(restored.replace(/\n/g, '\r\n'), 'utf8');
  expect(createHash('sha256').update(previous).digest('hex')).toBe('f198b571893cc022c5784bbe1db32a2c1cfe17e0b19425b43af1f7f0169c7b59');
  expect(stripWeldlabPhaseFixes(restored)).toBe(restored);
});
