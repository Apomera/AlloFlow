import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let FS;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});
it.each(['United States (Hawaii)', 'United States (Alaska)', 'United States'])('treats %s as one country', value => {
  expect(FS.flightQuizCountry(value)).toBe('United States');
});
it.each(['International', 'Africa', 'Arctic', 'Atlantic Ocean', 'Pacific Ocean', 'US/Canada', 'Nepal/China', '', null])('excludes non-country or shared labels: %s', value => {
  expect(FS.flightQuizCountry(value)).toBeNull();
});
it('preserves ordinary country labels and trims incidental whitespace', () => {
  expect(FS.flightQuizCountry('  Canada  ')).toBe('Canada');
  expect(FS.flightQuizCountry('Japan')).toBe('Japan');
  expect(FS.flightQuizCountry('South Africa')).toBe('South Africa');
});
