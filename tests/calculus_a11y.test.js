import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_calculus.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_calculus.js';

describe('Calculus Lab inquiry and chart semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the error chart and both evidence-explanation textareas', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain(`role: 'img', 'aria-label': __alloT('stem.calculus.a11y_calculus_error_versus_rectangle_count_chart', 'Calculus error versus rectangle count chart')`);
    expect(source).toContain(`'aria-label': __alloT('stem.calculus.a11y_working_explanation_from_live_derivative_eviden', 'Working explanation from live derivative evidence')`);
    expect(source).toContain(`'aria-label': __alloT('stem.calculus.a11y_evidence_based_derivative_behavior_explanation', 'Evidence-based derivative behavior explanation')`);
  });
});
