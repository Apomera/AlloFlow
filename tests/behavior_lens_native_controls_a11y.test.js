import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens remaining native control accessibility', () => {
  const source = read('behavior_lens_module.js');

  it('uses native named controls for hotspot counts and scenario complexity', () => {
    expect(source).toContain('Increment ');
    expect(source).toContain('hotspot count, currently');
    expect(source).toContain('Decrease ');
    expect(source).toContain("'aria-pressed': isComplex ? 'true' : 'false'");
    expect(source).toContain("Use complex scenario complexity");
  });

  it('keeps the drag target non-interactive and provides a keyboard file chooser', () => {
    expect(source).toContain("'aria-label': 'Snapshot JSON drop zone'");
    expect(source).toContain("'aria-label': 'Choose a BehaviorLens snapshot JSON file'");
    expect(source).toContain("Choose snapshot file");
    expect(source).not.toContain("h('div', { role: 'button', tabIndex: 0");
  });

  it('uses native step controls and separates roster switch from removal', () => {
    expect(source).toContain("'aria-current': groundingStep === i ? 'step' : undefined");
    expect(source).toContain('Switch to student');
    expect(source).toContain('Remove student');
    expect(source).toContain('from quick switch');
    expect(source).not.toContain("h('span', { role: 'button', tabIndex: 0");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/behavior_lens_module.js'));
  });
});
