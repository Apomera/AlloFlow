import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Student Analytics probe confirmations accessibility', () => {
  const source = read('student_analytics_module.js');

  it('uses accessible confirmations for all six embedded probe panels', () => {
    expect(source.match(/onClick: async \(\) => \{\n        if \(await askStudentAnalyticsConfirmation\("End/g)).toHaveLength(6);
    for (const title of ['End NWF probe', 'End LNF probe', 'End RAN probe', 'End ORF probe', 'End missing number probe', 'End quantity discrimination probe']) {
      expect(source).toContain(`title: '${title}'`);
    }
  });

  it('uses the same service for all three full-screen probe overlays', () => {
    expect(source.match(/onEndEarly: async function\(\) \{\n        if \(await askStudentAnalyticsConfirmation/g)).toHaveLength(3);
  });

  it('contains no remaining native confirm calls', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?confirm\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/student_analytics_module.js'));
  });
});
