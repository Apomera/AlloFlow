import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_hub_module.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_hub_module.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('SEL Hub control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides a visible keyboard focus indicator for all hub form controls', () => {
    const text = source();
    expect(text).toContain('.fixed.inset-0 textarea:focus-visible');
    expect(text).not.toContain('.fixed.inset-0 :focus:not(:focus-visible) { outline: none');
  });

  it('does not suppress native focus outlines in the station builder', () => {
    const text = source();
    expect(text).not.toContain("fontSize: 12, outline: 'none', boxSizing: 'border-box'");
    expect(text).not.toContain("resize: 'vertical', outline: 'none', boxSizing: 'border-box'");
  });

  it('names both hub textareas at their definitions', () => {
    const text = source();
    expect(text).toContain("h('textarea', { 'aria-label': 'Reflection for ' + q.label,");
    expect(text).toContain("h('textarea', { 'aria-label': 'Teacher note',");
  });
});
