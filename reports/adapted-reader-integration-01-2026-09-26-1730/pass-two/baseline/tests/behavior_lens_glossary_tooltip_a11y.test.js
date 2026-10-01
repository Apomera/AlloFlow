import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens glossary tooltip accessibility', () => {
  const source = read('behavior_lens_module.js');
  const start = source.indexOf('const GlossaryTip = ({ term, children }) =>');
  const end = source.indexOf('* InfoTooltip', start);
  const tooltip = source.slice(start, end);

  it('uses a native inline button with label-in-name and visible focus', () => {
    expect(tooltip).toContain("h('button', {");
    expect(tooltip).toContain("type: 'button'");
    expect(tooltip).toContain('Definition of');
    expect(tooltip).toContain('aria-label');
    expect(tooltip).toContain('children || term');
    expect(tooltip).toContain('focus-visible:outline');
    expect(tooltip).not.toContain("role: 'button'");
    expect(tooltip).not.toContain('tabIndex: 0');
  });

  it('associates the definition through a unique tooltip id', () => {
    expect(tooltip).toContain('const tooltipIdRef = useRef(');
    expect(tooltip).toContain('bl-glossary-tooltip-');
    expect(tooltip).toContain("'aria-describedby': show ? tooltipId : undefined");
    expect(tooltip).toContain('id: tooltipId');
    expect(tooltip).toContain("role: 'tooltip'");
  });

  it('supports hover, focus, touch, and Escape dismissal without pointer traps', () => {
    expect(tooltip).toContain('onMouseEnter: () => setShow(true)');
    expect(tooltip).toContain('onMouseLeave: () => setShow(false)');
    expect(tooltip).toContain('onFocus: () => setShow(true)');
    expect(tooltip).toContain('onClick: () => setShow(true)');
    expect(tooltip).toContain("if (event.key === 'Escape')");
    expect(tooltip).toContain("document.addEventListener('keydown', dismissOnEscape)");
    expect(tooltip).not.toContain('pointer-events-none');
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/behavior_lens_module.js'));
  });
});
