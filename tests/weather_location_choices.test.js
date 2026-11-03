import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function place(changes = {}) {
  return {
    name: 'Springfield', admin1: 'Illinois', country: 'United States', country_code: 'US',
    latitude: 39.7817, longitude: -89.6501, feature_code: 'PPLA2', postcodes: ['62701'],
    ...changes,
  };
}

describe('Weather location choices', () => {
  it('keeps distinct same-name places and ranks the existing structured match first', () => {
    const choices = kernel.normalizeLiveLocationChoices([
      place(),
      place({ admin1: 'Massachusetts', latitude: 42.1015, longitude: -72.5898 }),
      place({ country: 'United Kingdom', country_code: 'GB', admin1: 'Scotland', latitude: 56.3, longitude: -3.0 }),
    ], { city: 'Springfield', region: 'Massachusetts', country: 'United States' });
    expect(choices).toHaveLength(3);
    expect(choices[0]).toMatchObject({ label: 'Springfield, Massachusetts, United States', latitude: 42.1015, longitude: -72.5898 });
    expect(choices[1].label).toBe('Springfield, Illinois, United States');
    expect(choices[2].label).toBe('Springfield, Scotland, United Kingdom');
  });

  it('filters malformed places and deduplicates the same place without rejecting zero coordinates', () => {
    const entries = [null, [], {}, place({ name: '' }), place({ latitude: null }), place({ latitude: 91 }), place({ longitude: -181 }), place({ latitude: false }), place(), place()];
    expect(kernel.normalizeLiveLocationChoices(entries)).toHaveLength(1);
    expect(kernel.normalizeLiveLocationChoices([place({ name: 'Zero', latitude: 0, longitude: 0 })])[0]).toMatchObject({ latitude: 0, longitude: 0 });
    expect(kernel.normalizeLiveLocationChoices(null)).toEqual([]);
    const aliases = kernel.normalizeLiveLocationChoices([place({ admin1: 'Historic county' }), place()], { region: 'Illinois' });
    expect(aliases).toHaveLength(1);
    expect(aliases[0].admin1).toBe('Illinois');
    expect(kernel.normalizeLiveLocationChoices([place({ longitude: 180 }), place({ longitude: -180 })])).toHaveLength(1);
  });

  it('clones only display and geography metadata so later provider mutations cannot alter a pending choice', () => {
    const source = place({ elevation: 181.5, timezone: 'America/Chicago', arbitrary: 'provider-private-data' });
    const original = structuredClone(source);
    const [choice] = kernel.normalizeLiveLocationChoices([source]);
    expect(source).toEqual(original);
    source.name = 'Changed';
    source.postcodes[0] = 'changed';
    expect(choice).toMatchObject({ name: 'Springfield', elevation: 181.5, timezone: 'America/Chicago', postcodes: ['62701'] });
    expect(choice.arbitrary).toBeUndefined();
  });

  it('bounds result lists and display fields while retaining useful geographic distinctions', () => {
    const entries = Array.from({ length: 30 }, (_, index) => place({ name: `Place ${index}`, latitude: index }));
    expect(kernel.normalizeLiveLocationChoices(entries)).toHaveLength(10);
    const [choice] = kernel.normalizeLiveLocationChoices([place({ name: '  Springfield\n', admin1: 'x'.repeat(300), postcodes: Array(30).fill('p'.repeat(90)) })]);
    expect(choice.name).toBe('Springfield');
    expect(choice.admin1).toHaveLength(120);
    expect(choice.postcodes).toHaveLength(10);
    expect(choice.postcodes[0]).toHaveLength(30);
  });
});
