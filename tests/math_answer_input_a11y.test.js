import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(process.cwd(), 'view_math_module.js'), 'utf8');

describe('math answer editor accessibility', () => {
  it('gives the teacher answer field a problem-specific accessible name', () => {
    const answerAnchor = "placeholder: t('common.placeholder_enter_answer')";
    const answerIndex = SOURCE.indexOf(answerAnchor);
    expect(answerIndex).toBeGreaterThan(-1);
    const preceding = SOURCE.slice(Math.max(0, answerIndex - 180), answerIndex);
    expect(preceding).toContain("\"aria-label\": t('math.edit_answer') || `Edit answer for problem ${pIdx + 1}`");
  });
});
