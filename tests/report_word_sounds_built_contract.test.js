import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const read = file => readFileSync(file, 'utf8');
const core = read('word_sounds_core.js').trim();
const block = '// BEGIN GENERATED WORD SOUNDS CORE\n' + core + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
const marker = /\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
describe('Built Word Sounds content guard contract', () => {
  it.each(['word_sounds_module.js', 'word_sounds_setup_source.jsx'])('embeds the current canonical core in %s', file => {
    expect(read(file).match(marker)?.[0]).toBe(block);
  });
  it.each(['word_sounds_module.js', 'word_sounds_setup_module.js'])('ships the syntax-valid %s identically in the public mirror', file => {
    const built = read(file);
    expect(read('desktop/web-app/public/' + file)).toBe(built);
    expect(() => new Script(built)).not.toThrow();
  });
});
