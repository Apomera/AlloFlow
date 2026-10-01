import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');

describe('Calculus guided-mission input accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the inline numeric answer fields used by guided missions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    [
      "'aria-label':__alloT('stem.calculus.a11y_exact_integral_value', 'Exact integral value')",
      "'aria-label':__alloT('stem.calculus.a11y_riemann_sum_error_at_n_equals_4', 'Riemann-sum error at n equals 4')",
      "'aria-label':__alloT('stem.calculus.a11y_riemann_sum_error_at_n_equals_8', 'Riemann-sum error at n equals 8')",
      "'aria-label':__alloT('stem.calculus.a11y_estimated_error_at_n_equals_16', 'Estimated error at n equals 16')",
      "'aria-label':__alloT('stem.calculus.a11y_measured_error_at_n_equals_16', 'Measured error at n equals 16')",
      "'aria-label':'Derivative value at x '+item[0]",
      "'aria-label':__alloT('stem.calculus.a11y_derivative_at_x_equals_1_for_2x_squared', 'Derivative at x equals 1 for 2x squared')",
      "'aria-label':__alloT('stem.calculus.a11y_triangle_area_in_meters', 'Triangle area in meters')",
      "'aria-label':__alloT('stem.calculus.a11y_definite_integral_value_in_meters', 'Definite integral value in meters')",
      "'aria-label':__alloT('stem.calculus.a11y_estimated_distance_in_5_seconds_in_meters', 'Estimated distance in 5 seconds in meters')",
    ].forEach((label) => expect(source).toContain(label));
  });
});
