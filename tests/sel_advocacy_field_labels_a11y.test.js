import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Advocacy field labeling accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('separates DOM field attributes from visual style overrides', () => {
    const text = source();
    expect(text).toContain("if (key === 'id' || key === 'name' || key === 'required'");
    expect(text).toContain("key.indexOf('aria-') === 0");
    expect(text).toContain('else styleProps[key] = extra[key]');
    expect(text).toContain('}, config.props));');
  });

  it('names placeholder-only shared inputs and textareas', () => {
    const text = source();
    expect(text).toContain("if (!fieldProps.id && !fieldProps['aria-label'] && fallbackLabel)");
    expect(text).toContain("return hh('input', Object.assign({ 'aria-label': config.props['aria-label'] || undefined");
    expect(text).toContain("return hh('textarea', Object.assign({ 'aria-label': config.props['aria-label'] || undefined");
  });

  it('preserves id-based visible-label relationships', () => {
    const text = source();
    expect(text).toContain("hh('label', { htmlFor: dId");
    expect(text).toContain("advTextarea(n[d.id], function(v) { update(d.id, v); }, '', 3, { id: dId })");
    expect(text).toContain("hh('label', { htmlFor: fId");
    expect(text).toContain("advTextarea(p[f.id], function(v) { update(f.id, v); }, '', 3, { id: fId })");
  });

  it('provides precise names for directly rendered controls', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Champion role'");
    expect(text).toContain("'aria-label': 'How did it feel?'");
    expect(text).toContain("'aria-valuetext': form.felt + ' out of 10'");
    expect(text).toContain("'aria-label': 'Search advocacy phrases'");
    expect(text).toContain("'aria-label': 'Search accommodations'");
    expect(text).toContain("'aria-label': 'Editable ' + lt.title + ' letter template'");
    expect(text).toContain("h('input', { 'aria-label': currentQ.q");
  });
});
