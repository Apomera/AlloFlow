import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const english = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'ui_strings.js'), 'utf8'));
const translatedEnglish = (key, fallback) => key.split('.').reduce((value, part) => value && value[part], english) || fallback;
const mathStart = source.indexOf('  var MATH_CHALLENGES = [');
const mathEnd = source.indexOf('  // ── EDUCATIONAL LESSONS ──', mathStart);
if (mathStart < 0 || mathEnd < 0) throw new Error('ATC math production helpers are missing');

function mathTools(randomValues = []) {
  let index = 0;
  let seed = 29;
  const controlledMath = Object.create(Math);
  controlledMath.random = () => {
    if (index < randomValues.length) return randomValues[index++];
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return new Function('Math', 'toRad', source.slice(mathStart, mathEnd) +
    '\nreturn { templates: MATH_CHALLENGES, question: mathQuestion, correct: mathAnswerCorrect };')(
    controlledMath, (degrees) => degrees * Math.PI / 180
  );
}

describe('ATC math uses units, exact arrival ordering, and bounded rounding', () => {
  it('recognizes simultaneous arrivals instead of awarding B a tie', () => {
    const { templates, correct, question } = mathTools([0, 0, 0.15, 0.25]);
    const challenge = { ...templates[0].generate(), type: 'arrival_order' };
    expect(challenge).toMatchObject({ d1: 20, s1: 120, d2: 20, s2: 120, answer: 'TIE' });
    expect(correct(challenge, 'TIE')).toBe(true);
    expect(correct(challenge, 'B')).toBe(false);
    expect(challenge.explanation).toContain('× 60');
    expect(question(challenge)).toContain('both at the same time');
  });

  it('sequences by travel time when the farther aircraft is faster', () => {
    const { templates } = mathTools([0.98, 0.999, 0.72, 0]);
    const challenge = templates[0].generate();
    expect(challenge.d1).toBeGreaterThan(challenge.d2);
    expect(challenge.answer).toBe('A');
  });

  it('accepts fractional-minute answers and exact zero crosswind', () => {
    const { correct } = mathTools();
    expect(correct({ type: 'separation', answer: 2.7 }, '2.7')).toBe(true);
    expect(correct({ type: 'separation', answer: 2.7 }, '2.74')).toBe(true);
    expect(correct({ type: 'separation', answer: 2.7 }, '2')).toBe(false);
    expect(correct({ type: 'wind_correction', answer: 0 }, '0')).toBe(true);
    expect(correct({ type: 'wind_correction', answer: 0 }, '1')).toBe(false);
  });

  it('rejects malformed values and large errors formerly accepted by 15% tolerance', () => {
    const { correct } = mathTools();
    const descent = { type: 'descent', answer: 1000 };
    expect(correct(descent, '1100')).toBe(false);
    expect(correct(descent, '1000.25')).toBe(true);
    for (const value of ['', ' ', '1000abc', '0x3e8', 'Infinity', 'NaN', '-1000', null]) {
      expect(correct(descent, value), String(value)).toBe(false);
    }
  });

  it('generates consistent rate answers and prompts across varied setups', () => {
    const { templates, question, correct } = mathTools();
    for (let n = 0; n < 100; n += 1) {
      for (const template of templates) {
        const challenge = { ...template.generate(), type: template.type };
        expect(correct(challenge, challenge.answer)).toBe(true);
        expect(question(challenge)).not.toMatch(/\{\w+\}/);
        if (challenge.type === 'separation') {
          const exact = (challenge.d - challenge.sep) / challenge.rate * 60;
          expect(Math.abs(challenge.answer - exact)).toBeLessThanOrEqual(0.050000001);
          expect(question(challenge)).toContain('reaches');
        }
        if (challenge.type === 'descent') {
          const exact = (challenge.altitude - challenge.target) / (challenge.dist / challenge.speed * 60);
          expect(Math.abs(challenge.answer - exact)).toBeLessThanOrEqual(0.500000001);
          expect(question(challenge)).toContain('groundspeed');
          expect(question(challenge)).not.toContain('FL');
        }
        if (challenge.type === 'wind_correction') {
          const exact = Math.abs(challenge.windSpd * Math.sin((challenge.windDir - challenge.rwyHdg) * Math.PI / 180));
          expect(Math.abs(challenge.answer - exact)).toBeLessThanOrEqual(0.500000001);
          expect(challenge.explanation).not.toContain('Within limits');
        }
      }
    }
  });
});

describe('ATC lessons distinguish the classroom model from aviation procedures', () => {
  beforeEach(() => resetStemLab());

  it('renders the model separation boundary with an FAA source', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'lesson', selectedLesson: 'separation' } }, { t: translatedEnglish });
    expect(html).toContain('Real separation rules depend');
    expect(html).toContain('classroom model');
    expect(html).toContain('https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap5_section_5.html');
    expect(html).not.toContain('5nm (non-radar)');
  });

  it('teaches aircraft-specific crosswind guidance instead of a universal limit', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'lesson', selectedLesson: 'weather' } }, { t: translatedEnglish });
    expect(html).toContain('specific aircraft flight manual');
    expect(html).toContain('Negative headwind means tailwind');
    expect(html).not.toContain('25kt is the limit');
  });
});
