import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens shared information tooltip accessibility', () => {
  const source = read('behavior_lens_module.js');
  const start = source.indexOf('const InfoTooltip = ({ text }) =>');
  const end = source.indexOf('* autoTip', start);
  const tooltip = source.slice(start, end);

  it('uses a native button with an accessible name and 24 CSS-pixel target', () => {
    expect(tooltip).toContain("h('button', {");
    expect(tooltip).toContain("type: 'button'");
    expect(tooltip).toContain("'aria-label': 'More information'");
    expect(tooltip).toContain("'aria-expanded': show ? 'true' : 'false'");
    expect(tooltip).toContain('w-6 h-6 min-w-6 min-h-6');
    expect(tooltip).toContain('focus-visible:outline');
  });

  it('associates visible help text through a unique tooltip id', () => {
    expect(tooltip).toContain('const tooltipIdRef = useRef(');
    expect(tooltip).toContain('bl-info-tooltip-');
    expect(tooltip).toContain("'aria-describedby': show ? tooltipId : undefined");
    expect(tooltip).toContain('id: tooltipId');
    expect(tooltip).toContain("role: 'tooltip'");
  });

  it('supports focus, touch activation, hover persistence, and Escape dismissal', () => {
    expect(tooltip).toContain('onMouseEnter: () => setShow(true)');
    expect(tooltip).toContain('onMouseLeave: () => setShow(false)');
    expect(tooltip).toContain('onFocus: () => setShow(true)');
    expect(tooltip).toContain('onClick: () => setShow(true)');
    expect(tooltip).toContain("if (event.key === 'Escape')");
    expect(tooltip).toContain("document.addEventListener('keydown', dismissOnEscape)");
    expect(tooltip).not.toContain('pointer-events-none');
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/behavior_lens_module.js'));
  });
});
