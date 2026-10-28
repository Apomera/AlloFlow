// The desktop build strips baked Google API keys from every shipped file, then
// verifies delivery assets byte-for-byte. A loose pattern (AIza + 20 or more)
// matched inside Test Prep's base64 data, rewrote the module and failed every
// desktop build. The pattern must catch real key shapes and nothing else.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(ROOT, 'desktop/scripts/build-desktop-web.cjs'), 'utf8');
const literal = script.match(/const GOOGLE_API_KEY_PATTERN = (\/.+\/g);/);
const pattern = () => {
  const src = literal[1];
  return new RegExp(src.slice(1, src.lastIndexOf('/')), 'g');
};
// A synthetic key with the real shape: AIza + 35 key characters.
const fakeKey = 'AIza' + 'Sy' + 'Q7x_-'.repeat(6) + 'abc';

describe('desktop baked-key pattern', () => {
  it('is declared where the build script can be read', () => {
    expect(literal, 'GOOGLE_API_KEY_PATTERN literal not found').toBeTruthy();
    expect(fakeKey.length).toBe(39);
  });

  it('catches a real-shaped key wherever a build would bake one', () => {
    for (const text of [
      `"${fakeKey}"`,
      `apiKey:'${fakeKey}',`,
      `https://example.test/v1?key=${fakeKey}&x=1`,
      `REACT_APP_KEY=${fakeKey}\n`,
    ]) {
      expect(text.match(pattern()), text).toEqual([fakeKey]);
    }
  });

  it('ignores AIza runs inside base64 or longer tokens', () => {
    for (const text of [
      'G4qCj+' + fakeKey + '+eC6h',
      'ab/' + fakeKey + '/cd',
      'x' + fakeKey,
      fakeKey + 'Z',
      '"AIzaShort123456789012345678"',
    ]) {
      expect(pattern().test(text), text).toBe(false);
    }
  });

  it('leaves every delivery module untouched (Test Prep carried the false match)', () => {
    const hits = [];
    for (const name of fs.readdirSync(ROOT)) {
      if (!/_module\.js$/.test(name)) continue;
      const found = fs.readFileSync(path.join(ROOT, name), 'utf8').match(pattern());
      if (found) hits.push(name + ' x' + found.length);
    }
    expect(hits).toEqual([]);
  });
});
