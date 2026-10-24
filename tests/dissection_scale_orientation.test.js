import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const match = source.match(/^([ \t]*)function anatomicalOrientationData\(/m);
const start = match.index + match[1].length, ending = '\n' + match[1] + '}';
const profileSource = source.slice(start, source.indexOf(ending, start) + ending.length);
const scaleStart = source.indexOf('var scaleOrientation = anatomicalOrientationData();');
const scaleEnd = source.indexOf("var orientationSubheading = scaleFirstLandmark.toLowerCase() + '-' + scaleLastLandmark.toLowerCase();", scaleStart);
if (scaleStart < 0 || scaleEnd < 0) throw Error('Missing production scale orientation labels');
const scaleSource = source.slice(scaleStart, source.indexOf(';', scaleEnd) + 1);

describe('consistent specimen orientation in the scale card', () => {
  it.each([
    ['frog', 'internal', 'A ↑  ↓ P', 'anterior-posterior'],
    ['worm', 'dorsal', 'A ↑  ↓ P', 'anterior-posterior'],
    ['fish', 'lateral', 'A ←  → P', 'anterior-posterior'],
    ['fish', 'ventral', 'P ←  → A', 'posterior-anterior'],
    ['pig', 'lateral', 'Cr ←  → Cd', 'cranial-caudal'],
    ['pig', 'ventral', 'Cd ←  → Cr', 'caudal-cranial'],
    ['eye', 'internal', 'C ←  → ON', 'cornea-optic nerve'],
    ['eye', 'ventral', 'ON ←  → C', 'optic nerve-cornea'],
    ['heart', 'ventral', 'BASE ↑  ↓ APEX', 'base-apex'],
  ])('uses the same landmarks and screen order as the main compass for%s/%s', (shape, view, heading, subheading) => {
    const orientation = new Function('spec', 'd', 'anatomicalView', 'procedureProtocol', 'return (' + profileSource + ');')(
      { bodyShape: shape }, { anatomicalView: view }, 'dorsal', { recommendedView: 'ventral' });
    const labels = new Function('anatomicalOrientationData', scaleSource + '\nreturn { heading: orientationText, subheading: orientationSubheading };')(orientation);
    expect(labels).toEqual({ heading, subheading });
  });
});
