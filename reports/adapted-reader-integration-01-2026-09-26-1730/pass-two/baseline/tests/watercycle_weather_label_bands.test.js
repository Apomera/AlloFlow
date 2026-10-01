import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

// The scenario chip in the 3D journey HUD names the condition the climate
// sliders describe. Two defects lived here:
//
//  1. The 2-18 C band was labelled 'Fog and rain'. Surface temperature alone
//     cannot produce fog or rain -- both need moisture and a dewpoint spread
//     that this teaching model never carries -- and the DEFAULT climTemp is 15,
//     so every student opened the tool to a chip forecasting precipitation over
//     a clear scene that showed none.
//  2. The band boundaries left holes. 0, 1 and 2 C reported 'Balanced cycle'
//     while -1 C reported cold, so sweeping the slider through water's freezing
//     point moved the label AWAY from cold. 18 C fell through the same way.
//
// This pins the BANDS by running the shipped expression across the slider's
// real -20..45 range, not the wording of any one label, so a future rewording
// stays free while the science stays pinned.

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

const TEMP_MIN = -20; // matches the climTemp range input
const TEMP_MAX = 45;

function weatherLabelFor(filePath) {
  const source = readFileSync(filePath, 'utf8');
  // sliceBetween INCLUDES the start anchor, so this is the whole
  // `var weatherLabel = ...` statement, up to but not including its semicolon.
  const statement = sliceBetween(
    source,
    'var weatherLabel = ',
    ";\n",
    { label: 'weatherLabel statement' },
  );
  // Exercises the SHIPPED statement rather than a copy of it.
  return new Function(
    'currentTemp',
    'currentSolar',
    `${statement}; return weatherLabel;`,
  );
}

describe('water cycle scenario chip', () => {
  WATER_CYCLE_PATHS.forEach((filePath) => {
    describe(filePath, () => {
      it('never claims a weather outcome the model does not compute', () => {
        const label = weatherLabelFor(filePath);
        for (let temp = TEMP_MIN; temp <= TEMP_MAX; temp += 1) {
          for (const solar of [0.1, 0.3, 1.0, 1.6]) {
            const text = label(temp, solar).toLowerCase();
            // Precipitation, fog and storms are outcomes, not surface states.
            expect(text).not.toMatch(/\b(rain|fog|snow|storm|drizzle|forecast)\b/);
          }
        }
      });

      it('labels the freezing point as cold, not balanced', () => {
        const label = weatherLabelFor(filePath);
        for (const temp of [-1, 0, 1, 2]) {
          expect(label(temp, 1.0)).toBe('Cold-surface scenario');
        }
        expect(label(3, 1.0)).not.toBe('Cold-surface scenario');
      });

      it('covers the whole slider range with no fall-through holes', () => {
        const label = weatherLabelFor(filePath);
        // Walking the daylight range must never revisit a band it has left:
        // a hole shows up as the label returning to an earlier value.
        const seen = [];
        for (let temp = TEMP_MIN; temp <= TEMP_MAX; temp += 1) {
          const value = label(temp, 1.0);
          expect(value).toBeTruthy();
          if (seen[seen.length - 1] !== value) {
            expect(seen).not.toContain(value);
            seen.push(value);
          }
        }
        expect(seen).toEqual([
          'Cold-surface scenario',
          'Mild-surface scenario',
          'Balanced cycle',
          'Hot-surface scenario',
        ]);
      });

      it('still reports the night cycle when the sun is down', () => {
        const label = weatherLabelFor(filePath);
        expect(label(15, 0.1)).toBe('Night cycle');
        // Freezing and scorching surfaces outrank darkness: they change what
        // water can physically do, where darkness only changes the energy input.
        expect(label(-10, 0.1)).toBe('Cold-surface scenario');
        expect(label(40, 0.1)).toBe('Hot-surface scenario');
      });
    });
  });
});
