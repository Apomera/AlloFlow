// Present to class (2026-11-08): the revealed picture is described by what it shows. A word answer
// ("hat" in Rhyme Time) is the picture; a number or sounds answer ("3", "/k/") shows the item's word.
// Checked in the app and in the offline player, which is shipped as a string and needs its own escaping.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const regexAfter = (text, marker) => {
  const at = text.indexOf(marker);
  expect(at, marker).toBeGreaterThan(0);
  const start = text.indexOf('/', at + marker.length - 1);
  return new Function('return ' + text.slice(start, text.indexOf('.test(', start)))();
};
const player = () => {
  const a = MODULE.indexOf('const WS_PRESENT_OFFLINE_PLAYER = ');
  const line = MODULE.slice(a, MODULE.indexOf('\n', a));
  return new Function('return ' + line.replace('const WS_PRESENT_OFFLINE_PLAYER = ', '').replace(/;\s*$/, ''))();
};
const check = (re) => {
  expect(re.test('hat')).toBe(true);
  expect(re.test('ice cream')).toBe(true);
  expect(re.test('café')).toBe(true);
  expect(re.test('3')).toBe(false);
  expect(re.test('/k/')).toBe(false);
  expect(re.test('/k/ /a/ /t/')).toBe(false);
  expect(re.test('6+')).toBe(false);
};

describe('revealed picture description', () => {
  it('in the app', () => check(regexAfter(MODULE, '"Picture of {word}", { word: /')));
  it('in the offline player as it ships', () => check(regexAfter(player(), 'fill(S.pictureOf, { word: /')));
});
