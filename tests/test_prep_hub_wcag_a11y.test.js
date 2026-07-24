import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = read('test_prep_hub_source.jsx');
const built = read('test_prep_hub_module.js');
const deployed = read('desktop/web-app/public/test_prep_hub_module.js');

describe('Test Prep Hub WCAG focus and timing safeguards', () => {
  it('keeps generated artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });

  it('preserves native focus indicators alongside custom rings', () => {
    expect(source).not.toContain('outline-none');
    expect(source).toContain('focus:ring-2');
  });

  it('contains keyboard focus across all modal form controls', () => {
    expect(source).toContain("select:not([disabled]), textarea:not([disabled])");
    expect(source).toContain('.filter((element) => element.getClientRects().length > 0)');
    expect(source).toContain('document.activeElement === dialogRef.current');
    expect(source).toContain('(event.shiftKey ? last : first).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (prior && typeof prior.focus === 'function') prior.focus()");
  });

  it('lets users repeatedly extend a timed simulation before it expires', () => {
    expect(source).toContain('function extendSimulationTime()');
    expect(source).toContain('setTimeRemainingSeconds((seconds) => seconds + 600)');
    expect(source).toContain('onClick={extendSimulationTime}');
    expect(source).toContain('Add 10 minutes');
    expect(source).toContain('as often as needed');
  });

  it('warns with at least one minute remaining without making the timer live', () => {
    expect(source).toContain('timeRemainingSeconds <= 60');
    expect(source).toContain('One minute or less remains. Use Add 10 minutes now if you need more time.');
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain('role="timer"');
    expect(source).not.toMatch(/role="timer"[^>]*aria-live/);
  });
});
