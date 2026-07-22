import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
});

describe('Unit Converter physical temperature boundaries', () => {
  it('accepts absolute zero but rejects temperatures below it on every scale', () => {
    const validate = window.__UnitConvertCore.validateTemperatureValue;
    const convert = window.__UnitConvertCore.convertUnitValue;

    expect(validate(-273.15, '°C')).toMatchObject({ valid: true });
    expect(validate(-459.67, '°F')).toMatchObject({ valid: true });
    expect(validate(0, 'K')).toMatchObject({ valid: true });

    expect(validate(-273.16, '°C').message).toContain('absolute zero');
    expect(convert(-273.16, '°C', 'K', 'temperature')).toBeNaN();
    expect(convert(-459.68, '°F', 'K', 'temperature')).toBeNaN();
    expect(convert(-0.01, 'K', '°C', 'temperature')).toBeNaN();
  });

  it('builds explicit offset-and-scale reasoning for compound conversions', () => {
    const describe = window.__UnitConvertCore.describeTemperatureConversion;
    const reasoning = describe(32, '°F', 'K');

    expect(reasoning.valid).toBe(true);
    expect(reasoning.result).toBeCloseTo(273.15, 12);
    expect(reasoning.steps).toEqual([
      '(32 °F − 32) × 5/9 = 0 °C',
      '0 °C + 273.15 = 273.15 K',
    ]);
    expect(reasoning.message).toContain('different zero points');
  });
});

describe('Unit Converter temperature learning UI', () => {
  it('renders a student-readable warning and no NaN output below absolute zero', () => {
    const html = renderTool('unitConvert', {
      unitConvert: {
        tab: 'convert',
        category: 'temperature',
        value: -300,
        fromUnit: '°C',
        toUnit: 'K',
      },
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Temperatures cannot be below absolute zero');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Temperature conversion steps');
    expect(html).toMatch(/aria-label="Save"[^>]*disabled/);
  });

  it('shows an accessible, numbered explanation for valid temperature conversions', () => {
    const html = renderTool('unitConvert', {
      unitConvert: {
        tab: 'convert',
        category: 'temperature',
        value: 32,
        fromUnit: '°F',
        toUnit: 'K',
      },
    });

    expect(html).toContain('role="region"');
    expect(html).toContain('Why temperature is different');
    expect(html).toContain('aria-label="Temperature conversion steps"');
    expect(html).toContain('different zero points');
    expect(html).toContain('273.15 K');
    expect(html).not.toContain('role="alert"');
  });

  it('guards the all-units table from impossible temperature rows', () => {
    const html = renderTool('unitConvert', {
      unitConvert: {
        tab: 'table',
        category: 'temperature',
        value: -1,
        fromUnit: 'K',
        toUnit: '°C',
      },
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('absolute zero');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('<table');
  });
});