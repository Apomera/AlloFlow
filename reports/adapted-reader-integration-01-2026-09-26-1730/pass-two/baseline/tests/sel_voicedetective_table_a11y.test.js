import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_voicedetective.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_voicedetective.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Voice Detective confusion matrix accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the table and exposes column and row header relationships', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Emotion confusion matrix: target emotion by picked emotion'");
    expect(text).toContain("h('th', { scope: 'col'");
    expect(text).toContain("scope: 'col', 'aria-label': 'Picked ' + em.label");
    expect(text).toContain("h('th', { scope: 'row'");
  });
});
