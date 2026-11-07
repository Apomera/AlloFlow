// AlloFlow's maker line and dedication (2026-11-03) are the owner's words, not product
// copy. These checks keep cleanup and copy passes from dropping or rewording them
// unnoticed: the About tab renders them from the shipped module, both string copies
// carry them, and the README says it.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween, expectAnchorCount, indexOfOrThrow } from './helpers/anchored_slice.js';

const NAME = 'Dr. Robert Pomeranz';
const MAKER = 'Made by Dr. Aaron Pomeranz, a school psychologist in Portland, Maine.';
const LINE = 'For my father, Dr. Robert Pomeranz: teacher, doctor, and sci-fi nerd. He set out to repair the world, and in his own way, he did.';
const aboutStrings = file => JSON.parse(readFileSync(file, 'utf8')).about;

describe('the dedication', () => {
  it('renders at the foot of the About tab in the shipped module and its public copy', () => {
    for (const file of ['view_info_modal_module.js', 'desktop/web-app/public/view_info_modal_module.js']) {
      const mod = readFileSync(file, 'utf8');
      expectAnchorCount(mod, '"data-dedication": true', 1, { file });
      // The About tab ends with the accessibility note; the Atlas tab follows it.
      const tail = sliceBetween(mod, 'React.createElement(AccessibilityNote, { t })', 'React.createElement(AtlasTab, { t, onRequestClose', { file });
      expect(tail).toContain('"data-dedication": true');
      expect(tail).toContain('t("about.maker") || "' + MAKER + '"');
      expect(tail).toContain('t("about.dedication") || "' + LINE + '"');
    }
  });

  it('both ui_strings copies carry the same words', () => {
    const root = aboutStrings('ui_strings.js');
    expect([root.maker, root.dedication]).toEqual([MAKER, LINE]);
    const pub = aboutStrings('desktop/web-app/public/ui_strings.js');
    expect([pub.maker, pub.dedication]).toEqual([MAKER, LINE]);
  });

  it('the README credits him next to the copyright', () => {
    const readme = readFileSync('README.md', 'utf8');
    const credit = indexOfOrThrow(readme, '© 2026 Aaron Pomeranz, PsyD', { file: 'README.md' });
    expect(indexOfOrThrow(readme, NAME, { file: 'README.md', from: credit }) - credit).toBeLessThan(200);
  });
});
