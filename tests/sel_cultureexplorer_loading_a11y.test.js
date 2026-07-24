import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_cultureexplorer.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_cultureexplorer.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Culture Explorer loading and journal accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('announces loading states without nonessential pulse animation', () => {
    const text = source();
    expect(text).not.toContain('animate-pulse');
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-busy': 'true'");
    expect(text).toContain("'aria-label': 'Generating cultural illustration'");
  });

  it('hides loading emoji and names each journal field from its prompt', () => {
    const text = source();
    expect(text).toContain("className: 'text-3xl mb-2', 'aria-hidden': 'true'");
    expect(text).toContain("h('textarea', { 'aria-label': jp.prompt, value: entryVal");
  });
});
