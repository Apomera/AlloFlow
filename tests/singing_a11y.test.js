import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_singing.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_singing.js';

describe('Singing Lab canvas and motion semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the interactive vocal-range keyboard canvas', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    // This used to assert the literal "h('canvas', { role: 'img'". That spelling
    // was the opening of a props object that declared role AND aria-label TWICE;
    // JavaScript keeps the last of a duplicated key, so the pair on the h('canvas'
    // line was dead and the generic label it carried never reached the DOM.
    // Removing the dead pair changed the spelling without changing anything the
    // canvas exposes, so assert the two things that actually matter instead: the
    // descriptive label, and a role="img" among the same element's props.
    const key = 'stem.singing.piano_keyboard_showing_vocal_range_use';
    expect(source).toContain(key);
    // Scope the search to THIS element — from its own h('canvas' opener up to the
    // label — so a neighbouring canvas's role cannot satisfy the assertion.
    const at = source.indexOf(key);
    const opener = source.lastIndexOf("h('canvas'", at);
    expect(opener, 'label should sit inside a canvas element').toBeGreaterThan(-1);
    const props = source.slice(opener, at);
    expect(props, 'vocal-range canvas should still declare role="img"').toMatch(/role:\s*'img'/);
  });

  it('gates listening pulse indicators for reduced-motion users', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var reducedMotion =');
    expect((source.match(/reducedMotion \? '' : ' animate-pulse'/g) || []).length).toBe(2);
  });
});
