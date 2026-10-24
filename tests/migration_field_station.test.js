import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function flight(seed = {}, overrides = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('migration', { migration: { tab: 'flight3d', ...seed } }, overrides);
  return host;
}

function metric(host, label) {
  const card = [...host.querySelectorAll('.migration-flight-stat')]
    .find(node => node.querySelector('span')?.textContent === label);
  expect(card, 'Missing flight metric: ' + label).toBeTruthy();
  return card.querySelector('strong').textContent;
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_migration.js', 'migration');
});

describe('Migration field station model feedback', () => {
  it.each([
    ['canada_goose', 'species_canada_goose_formation', 'Formación en V', 'Vuelo en V', '~22% less drag'],
    ['ruby_hummingbird', 'species_ruby_hummingbird_formation', 'En solitario', 'Vuelo solitario', 'No drafting credit']
  ])('preserves the natural flight pattern for %s when species descriptions are translated', (species, key, translatedDescription, resolvedLabel, credit) => {
    const translations = {
      ['stem.migration.' + key]: translatedDescription,
      'stem.migration.fmt_v': 'Vuelo en V',
      'stem.migration.fmt_solo': 'Vuelo solitario'
    };
    const host = flight({ flightSpecies: species, flightFormation: 'natural' }, {
      t: (key, fallback) => translations[key] ?? fallback ?? key
    });
    // Confirm the translated description reached the rendered catalog. The
    // scene summary and benefit must still use the species' canonical model.
    expect(host.querySelector('select[aria-label="3D migration flight pattern"] option[value="natural"]').textContent)
      .toContain(translatedDescription);
    expect(host.querySelector('.migration-flight-badge small').textContent).toContain(resolvedLabel);
    expect(host.querySelector('.migration-flight-stage').getAttribute('aria-label')).toContain(resolvedLabel);
    expect(metric(host, 'Pattern benefit')).toBe(credit);
  });

  it.each(['natural', 'v', 'loose', 'swarm', 'solo'])('gives Monarchs no drafting credit with the %s flight pattern', (flightFormation) => {
    const host = flight({ flightSpecies: 'monarch', flightFormation });
    expect(host.querySelector('[data-monarch-simulation="active"]')).toBeTruthy();
    expect(metric(host, 'Pattern benefit')).toBe('No drafting credit');
    expect(host.querySelector('.migration-monarch-note').textContent).toContain('multiple generations');
  });

  it('reports zero ground progress when a Monarch cannot overcome the headwind', () => {
    const host = flight({ flightSpecies: 'monarch', flightWind: -15 });
    expect(metric(host, 'Ground speed')).toBe('0 mph');
    expect(host.querySelector('.migration-flight-badge small').textContent).toContain('0 mph over ground');
    expect(host.querySelector('.migration-flight-stage').getAttribute('aria-label'))
      .toContain('0 miles per hour ground speed');
  });

  it.each([
    ['fall', false, 'Fall migration', 'Northern Canada & Alaska', 'Southern US & Mexico'],
    ['spring', false, 'Spring migration', 'Southern US & Mexico', 'Northern Canada & Alaska'],
    ['spring', true, 'Flight paused', 'Southern US & Mexico', 'Northern Canada & Alaska']
  ])('shows the %s route with paused=%s and the correct origin/destination', (flightSeason, flightPaused, label, origin, destination) => {
    const host = flight({ flightSpecies: 'canada_goose', flightSeason, flightPaused });
    const route = host.querySelector('.migration-flight-route');
    expect(route.getAttribute('data-paused')).toBe(String(flightPaused));
    expect(route.querySelector('.migration-flight-route-label').textContent).toBe(label);
    expect([...route.querySelectorAll('.migration-flight-route-places span')].map(node => node.textContent))
      .toEqual([origin, destination]);
    const pauseButton = [...host.querySelectorAll('.migration-flight-actions button')]
      .find(node => /^(Pause|Resume) flight$/.test(node.textContent));
    expect(pauseButton.getAttribute('aria-pressed')).toBe(String(flightPaused));
    expect(pauseButton.textContent).toBe(flightPaused ? 'Resume flight' : 'Pause flight');
  });
});
