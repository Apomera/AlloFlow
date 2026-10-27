import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { stripWeldlabDiagramFixes } from './helpers/weldlab_accessible_diagram_restore.js';

it('recovers the complete prior source after reversing only the recorded diagram accessibility repairs', () => {
  const raw = readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
  expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
  expect([...raw.subarray(0, 3)]).toEqual([239, 187, 191]);
  expect(raw.toString('utf8').replace(/\r\n/g, '\n')).not.toContain('\r');
  const restored = stripWeldlabDiagramFixes(raw.toString('utf8'));
  const previous = Buffer.from(restored.replace(/\n/g, '\r\n'), 'utf8');
  expect(createHash('sha256').update(previous).digest('hex')).toBe('2ecfb46849d0baee819d4b3fd85d8a5cc1c13b32b09a08a3cc0754e556e2fcd3');
  expect(stripWeldlabDiagramFixes(restored)).toBe(restored);
});
