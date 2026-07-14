import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_conflicttheater.js');
const publicPath = resolve(process.cwd(), 'prismflow-deploy/public/sel_hub/sel_tool_conflicttheater.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Conflict Theater control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the message field at its definition', () => {
    expect(source()).toContain("h('textarea', { 'aria-label': 'Your message',");
  });

  it('keeps the compact memory reset target at least 24 CSS pixels high', () => {
    expect(source()).toContain("style: { padding: '4px 10px', minHeight: 24");
  });

  it('requires an informative confirmation before irreversible memory deletion', () => {
    const text = source();
    expect(text).toContain("window.confirm('Make all characters forget your past conversations? This cannot be undone.')");
    expect(text).toContain("if (ok) { upd('memory', {});");
  });
});
