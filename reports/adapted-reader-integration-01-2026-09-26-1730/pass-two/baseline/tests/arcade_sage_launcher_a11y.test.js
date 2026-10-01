import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('arcade_mode_sage_launcher.js', 'utf8');

describe('AlloBot Sage arcade launcher accessibility', () => {
  it('uses a semantic heading to identify the launcher card', () => {
    expect(source).toContain("'aria-labelledby': 'sage-launcher-title'");
    expect(source).toContain("h('h4', {");
    expect(source).toContain("id: 'sage-launcher-title'");
  });

  it('programmatically associates the visible Minutes label and select', () => {
    expect(source).toContain("htmlFor: 'sage-launcher-minutes'");
    expect(source).toContain("id: 'sage-launcher-minutes'");
    expect(source).toContain("className: 'ah-prominent-input'");
  });

  it('provides 44 by 44 CSS-pixel targets for the picker and launch action', () => {
    expect(source.match(/minHeight: '44px'/g)?.length).toBe(2);
    expect(source.match(/minWidth: '44px'/g)?.length).toBe(2);
  });

  it('directs users to the shared pause and resume controls', () => {
    expect(source).toContain(
      'Reopen Arcade to pause or resume your session timer.'
    );
    expect(source).not.toContain(
      "The arcade timer ticks even while you're in STEM Lab."
    );
  });
});
