import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
});

describe('Unit Converter word-problem core', () => {
  it('builds the student problem, hints, answer, and explanation from verified metadata', () => {
    const parse = window.__UnitConvertCore.parseWordProblemResponse;
    const response = [
      'CONTEXT: <b>A cycling team</b> **plans** a training route.',
      'INPUT_VALUE: 5',
      'FROM_UNIT: km',
      'TO_UNIT: m',
      'ANSWER_VALUE: 5000',
      'ANSWER_UNIT: m',
    ].join(String.fromCharCode(10));

    expect(parse(response, 'length', ['m', 'km'])).toEqual({
      source: 'ai',
      verified: true,
      context: 'A cycling team plans a training route.',
      inputValue: 5,
      fromUnit: 'km',
      toUnit: 'm',
      problem: 'A cycling team plans a training route. The measurement is 5 km. What is this value in m?',
      hints: [
        'Arrange a conversion factor so km cancels and m remains.',
        'Compare each unit to the category base unit, then multiply the two conversion ratios.',
      ],
      answer: 5000,
      unit: 'm',
      explanation: '5 km × 1000 = 5000 m.',
    });
  });

  it('rejects incomplete, non-finite, unauthorized, same-unit, and mismatched-unit metadata', () => {
    const parse = window.__UnitConvertCore.parseWordProblemResponse;
    const base = [
      'CONTEXT: A carpenter prepares material for a project.',
      'INPUT_VALUE: 1',
      'FROM_UNIT: ft',
      'TO_UNIT: in',
      'ANSWER_VALUE: 12',
      'ANSWER_UNIT: in',
    ];

    expect(parse(base.slice(0, 4).join(String.fromCharCode(10)), 'length', ['ft', 'in'])).toBeNull();
    expect(parse(base.map((line) => line.replace('ANSWER_VALUE: 12', 'ANSWER_VALUE: Infinity')).join(String.fromCharCode(10)), 'length', ['ft', 'in'])).toBeNull();
    expect(parse(base.join(String.fromCharCode(10)), 'length', ['m'])).toBeNull();
    expect(parse(base.map((line) => line.replace('ANSWER_UNIT: in', 'ANSWER_UNIT: ft')).join(String.fromCharCode(10)), 'length', ['ft', 'in'])).toBeNull();
    expect(parse(base.map((line) => line.replace('TO_UNIT: in', 'TO_UNIT: ft').replace('ANSWER_UNIT: in', 'ANSWER_UNIT: ft')).join(String.fromCharCode(10)), 'length', ['ft', 'in'])).toBeNull();
    expect(parse(base.map((line) => line.replace('CONTEXT: A carpenter', 'CONTEXT: A carpenter with 12 boards')).join(String.fromCharCode(10)), 'length', ['ft', 'in'])).toBeNull();
  });

  it('rejects mathematically wrong answers and impossible temperatures', () => {
    const parse = window.__UnitConvertCore.parseWordProblemResponse;
    const wrongMath = [
      'CONTEXT: A carpenter prepares material for a project.',
      'INPUT_VALUE: 1',
      'FROM_UNIT: ft',
      'TO_UNIT: in',
      'ANSWER_VALUE: 13',
      'ANSWER_UNIT: in',
    ].join(String.fromCharCode(10));
    const impossibleTemperature = [
      'CONTEXT: A weather station compares two temperature scales.',
      'INPUT_VALUE: -500',
      'FROM_UNIT: °F',
      'TO_UNIT: K',
      'ANSWER_VALUE: 0',
      'ANSWER_UNIT: K',
    ].join(String.fromCharCode(10));

    expect(parse(wrongMath, 'length', ['ft', 'in'])).toBeNull();
    expect(parse(impossibleTemperature, 'temperature', ['°F', 'K'])).toBeNull();
  });

  it('accepts reasonable reported rounding but stores the locally recomputed answer', () => {
    const parse = window.__UnitConvertCore.parseWordProblemResponse;
    const response = [
      'CONTEXT: An engineering club measures a prototype.',
      'INPUT_VALUE: 1',
      'FROM_UNIT: m',
      'TO_UNIT: ft',
      'ANSWER_VALUE: 3.281',
      'ANSWER_UNIT: ft',
    ].join(String.fromCharCode(10));

    const parsed = parse(response, 'length', ['m', 'ft']);
    expect(parsed.answer).toBeCloseTo(3.280839895, 9);
    expect(parsed.answer).not.toBe(3.281);
    expect(parsed.explanation).toContain('3.28084 ft');
  });

  it('creates valid offline practice for linear and temperature conversions', () => {
    const offline = window.__UnitConvertCore.makeOfflineWordProblem;
    const length = offline('length', 'm', 'cm');
    const temperature = offline('temperature', '°F', 'K');

    expect(length).toMatchObject({
      source: 'offline', verified: true, inputValue: 3,
      fromUnit: 'm', toUnit: 'cm', unit: 'cm', answer: 300,
    });
    expect(length.hints).toHaveLength(2);
    expect(length.problem).not.toContain('300');
    expect(temperature.answer).toBeCloseTo(293.15, 10);
    expect(temperature.explanation).toContain('+ 273.15');
    expect(temperature.explanation).toContain('293.15 K');
  });

  it('formats significant figures without changing the underlying value', () => {
    const format = window.__UnitConvertCore.formatUnitNumber;
    expect(format(1234.567, 'auto')).toBe('1234.567');
    expect(format(1234.567, '3')).toBe('1.23e+3');
    expect(format(12, '4')).toBe('12.00');
    expect(format(Number.NaN, '3')).toBe('—');
  });

  it('diagnoses likely mistakes without revealing the answer', () => {
    const diagnose = window.__UnitConvertCore.diagnosePracticeAnswer;
    expect(diagnose(1 / 12, 12, 'in')).toContain('ratio may be reversed');
    expect(diagnose(120, 12, 'in')).toContain('decimal place');
    expect(diagnose(20, 32, '°F')).toContain('offset');
    expect(diagnose(7, 12, 'in')).not.toContain('12');
  });
});
describe('Unit Converter word-problem learning flow', () => {
  const problem = {
    source: 'offline',
    verified: true,
    problem: 'A model bridge is measured in yards. Convert its length to feet.',
    hints: ['Start by finding feet per yard.', 'Multiply the yard measurement by 3.'],
    answer: 321.987,
    unit: 'ft',
    explanation: 'Multiply using the exact yards-to-feet conversion factor.',
  };

  it('hides the answer and explanation until the learner solves or reveals it', () => {
    const html = renderTool('unitConvert', {
      unitConvert: { tab: 'wordproblem', category: 'length', wordProblem: problem },
    });

    expect(html).toContain('Practice first, then reveal');
    expect(html).toContain('Offline practice');
    expect(html).toContain('✓ Math verified locally');
    expect(html).toContain('The app independently calculated the answer, hints, and explanation.');
    expect(html).toContain('Check attempt');
    expect(html).toContain('Show Hint 1');
    expect(html).toContain('Reveal Answer');
    expect(html).not.toContain('321.987 ft');
    expect(html).not.toContain(problem.explanation);
  });

  it('reveals hints progressively and shows the worked answer deliberately', () => {
    const hintHtml = renderTool('unitConvert', {
      unitConvert: {
        tab: 'wordproblem',
        category: 'length',
        wordProblem: problem,
        wordProblemHintLevel: 1,
      },
    });
    expect(hintHtml).toContain(problem.hints[0]);
    expect(hintHtml).not.toContain(problem.hints[1]);

    const revealHtml = renderTool('unitConvert', {
      unitConvert: {
        tab: 'wordproblem',
        category: 'length',
        wordProblem: problem,
        wordProblemHintLevel: 2,
        wordProblemRevealed: true,
      },
    });
    expect(revealHtml).toContain('Worked answer');
    expect(revealHtml).toContain('321.987 ft');
    expect(revealHtml).toContain(problem.explanation);
  });

  it('renders the significant-figures selector and applies the selected precision', () => {
    const html = renderTool('unitConvert', {
      unitConvert: {
        tab: 'convert',
        category: 'length',
        value: 1234.567,
        fromUnit: 'm',
        toUnit: 'm',
        significantFigures: '3',
      },
    });

    expect(html).toContain('aria-label="Significant figures"');
    expect(html).toContain('3 sig figs');
    expect(html).toContain('Converted result: 1.23e+3 m');
  });

  it('ignores stale AI responses and invalidates pending work on category changes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_unitconvert.js', 'utf8');
    expect(source).toContain('var _unitConvertWordProblemRequestId = 0;');
    expect(source).toContain('id: ++_unitConvertWordProblemRequestId');
    expect(source).toContain('if (request.id !== _unitConvertWordProblemRequestId) return;');
    expect(source).toContain('_unitConvertWordProblemRequestId += 1;');
    expect(source).toContain('loadingWP: false');
    expect(source).toContain('wordProblem: null');
  });

  it('uses one shared generator instead of duplicated AI request blocks', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_unitconvert.js', 'utf8');
    expect(source.match(/Create one safe, engaging grade 5-8/g)).toHaveLength(1);
    expect(source).toContain('onClick: generateWordProblem');
    expect(source).toContain('parseWordProblemResponse(raw, request.category, request.unitList)');
    expect(source).toContain('useOfflineWordProblem');
  });
});