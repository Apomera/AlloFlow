// "Lock after reveal" (10-20) keeps a map of items whose answer a checker has shown, so retyping
// the shown answer earns nothing. The lock only holds across a reload if the hub's math-progress
// autosave keeps those maps. Volume's map was missing from the whitelist at first; this pins all
// three tools that lock: Volume, Coordinate Grid and Money.
import { describe, expect, it } from 'vitest';
import { loadHub, saveAndRestore } from './helpers/math_review3_autosave_fixtures.js';

const LOCKS = [
  ['_volume', 'revealedItems', { 'slider:2x3x4': true, 'word:ctx:3x3x3': true }],
  ['_coordGrid', 'revealedItems', { 'slope:0,0>3,4': true, 'distance:1,1>4,5': true }],
  ['_moneyMath', 'moneyAnswerShown', { 'change:USD|365|1000': true }],
];

describe('reveal locks survive a reload', () => {
  it.each(LOCKS)('%s.%s is saved and restored', (bucket, field, map) => {
    const hub = loadHub();
    const { encoded, next } = saveAndRestore(hub, { [bucket]: { [field]: map } }, { [bucket]: {} });
    expect(JSON.parse(encoded)[bucket] && JSON.parse(encoded)[bucket][field], bucket + '.' + field + ' saved').toEqual(map);
    expect(next[bucket][field], bucket + '.' + field + ' restored').toEqual(map);
  });

  it('a hostile lock map keeps only true flags', () => {
    const hub = loadHub();
    const { next } = saveAndRestore(hub, { _volume: { revealedItems: { 'slider:1x1x1': true, 'slider:2x2x2': 'yes', __proto__: { x: true } } } }, { _volume: {} });
    expect(next._volume.revealedItems).toEqual({ 'slider:1x1x1': true });
  });
});
