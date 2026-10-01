import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_allobotsage.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_allobotsage.js';

describe('AlloBot Sage workload chart', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the workload-learning-risk SVG chart', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': t('stem.allobotsage.workload_learning_risk_chart'");
  });
});
