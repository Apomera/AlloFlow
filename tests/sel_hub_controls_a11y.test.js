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

  it('wraps a registered tool without a SEL_TOOL_GUIDANCE scope error', () => {
    const windowStub = {
      AlloModules: {},
      addEventListener() {},
      dispatchEvent() {},
    };
    const documentStub = {
      hidden: false,
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById(id) { return id === 'sel-a11y-css' ? {} : null; },
    };
    const loadModule = new Function(
      'window', 'document', 'console', 'setTimeout', 'clearTimeout', 'CustomEvent',
      source(),
    );
    loadModule(
      windowStub,
      documentStub,
      { log() {}, warn() {}, error() {} },
      setTimeout,
      clearTimeout,
      class CustomEventStub {},
    );

    const ReactStub = {
      createElement(type, props, ...children) {
        return { type, props: props || {}, children };
      },
    };
    let shell;
    expect(() => {
      shell = windowStub.SelHub._wrapStandardToolShell(
        'conflict',
        { label: 'Conflict Practice', category: 'relationships' },
        { type: 'content' },
        { React: ReactStub },
      );
    }).not.toThrow();
    expect(shell.type).toBe('section');
    expect(shell.props['data-sel-standard-shell']).toBe('conflict');
    expect(JSON.stringify(shell)).toContain('If there are threats, coercion, bullying, abuse');
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

  it('keeps overlapping tools differentiated and safety boundaries accessible', () => {
    const text = source();
    expect(text).toContain("var SEL_TOOL_GUIDANCE = {");
    expect(text.match(/var SEL_TOOL_GUIDANCE = \{/g)).toHaveLength(1);
    expect(text.indexOf('var SEL_TOOL_GUIDANCE = {')).toBeLessThan(text.indexOf('if (!window.SelHub) {'));
    expect(text).not.toContain('Object.assign(SEL_TOOL_GUIDANCE');
    expect(text).toContain("conflict: { mode: 'Practice repair'");
    expect(text).toContain("crisiscompanion: { mode: 'Urgent support'");
    expect(text).toContain("label: 'Self-Advocacy Studio'");
    expect(text).toContain("label: 'Advocacy Practice'");
    expect(text).toContain("'aria-label': tool.label + (tool.recommendedRange");
    expect(text).toContain("traumaPsychoed: { time: '8-15 min'");
    expect(text).toContain("{ key: 'crisis', icon:");
    expect(text).toContain("{ key: 'schoolSupport', icon:");
    expect(text).toContain("Preview first");
  });
});
