import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_INQUIRY_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.inquiry = { valid: validEstimate, read: readInquiry, history: readInvestigations, difference: predictionDifference, fresh: freshInquiry, measurement: inquiryMeasurement, themes: INQUIRY_THEMES, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { valid, read, history, difference, fresh, measurement, themes, items } = sandbox.window.inquiry;
const by = Object.fromEntries(items.map(item => [item.id, item]));
const record = (suffix = 'a') => ({ id: 'inquiry-1-' + suffix, theme: 'home', small: { id: 'human', size: 1.2, you: true },
  big: { id: 'earth' }, guess: '5.5', revealed: true, reflection: 'My first anchor was my height.' });

describe('Scale Explorer investigations', () => {
  it('accepts complete finite predictions, including zero and fractions, within the stated range', () => {
    for (const [text, number] of [['0', 0], ['.5', .5], [' 2.25 ', 2.25], ['+3', 3], ['1e1', 10], [45, 45]]) expect(valid(text)).toBe(number);
    for (const value of ['', ' ', null, false, [], {}, '-1', '46', '2 years', '0x10', '1e999', Infinity, NaN]) expect(valid(value)).toBeNull();
  });

  it('reconstructs catalog dimensions, preserves a valid personal height and rejects forged targets', () => {
    const restored = read({ ...record(), big: { id: 'earth', size: 1, you: true }, source: 'javascript:bad()', title: 'Forged title' });
    expect(restored.small).toEqual({ id: 'human', size: 1.2, you: true });
    expect(restored.big).toEqual({ id: 'earth', size: by.earth.size, you: false });
    expect(restored.source).toBeUndefined(); expect(restored.title).toBeUndefined();
    expect(measurement({ id: 'human', size: 9, you: true })).toMatchObject({ size: 1.7, you: false });
    expect(read({ ...record(), small: { id: '__proto__' } })).toBeNull();
    expect(read({ ...record(), small: { id: 'earth' } })).toBeNull();
    expect(read({ ...record(), theme: 'cells' }).theme).toBe('mixed');
    expect(read(null)).toBeNull(); expect(read([])).toBeNull();
  });

  it('keeps plain reflections and valid completed predictions while bounding malformed persisted data', () => {
    expect(read({ ...record(), reflection: '<script>literal</script>' }).reflection).toBe('<script>literal</script>');
    expect(read({ ...record(), reflection: 'x'.repeat(1500) }).reflection).toHaveLength(1200);
    const corrupt = read({ ...record(), guess: '3m' });
    expect(corrupt.revealed).toBe(false); expect(corrupt.guess).toBe('');
    expect(history([record(), record(), { ...record('b'), revealed: false }, { ...record('c'), guess: 46 }, { ...record('d'), id: '<script>' }, record('e')]).map(entry => entry.id)).toEqual(['inquiry-1-a', 'inquiry-1-e']);
    expect(history(Array.from({ length: 30 }, (_, index) => record(String(index))))).toHaveLength(12);
    expect(history({})).toEqual([]);
  });

  it('explains the multiplicative error in the correct direction without confusing a decade with a percent', () => {
    expect(difference(2, 5)).toEqual({ delta: -3, off: 3, factor: 1000, direction: 'under' });
    expect(difference(7, 5)).toEqual({ delta: 2, off: 2, factor: 100, direction: 'over' });
    expect(difference(5, 5)).toEqual({ delta: 0, off: 0, factor: 1, direction: 'equal' });
    expect(difference(4.5, 5).factor).toBeCloseTo(Math.sqrt(10), 12);
    expect(Number.isFinite(difference(45, 0).factor)).toBe(true);
    expect(difference('bad', 5)).toBeNull(); expect(difference(3, Infinity)).toBeNull();
  });

  it('uses valid catalog pairs for every theme and captures independent measured references', () => {
    expect(themes).toHaveLength(6);
    for (const theme of themes) {
      const question = fresh(theme.id, by[theme.small], by[theme.big]);
      expect(read(question)).toMatchObject({ theme: theme.id, revealed: false, guess: '' });
      expect(question.id).toMatch(/^inquiry-[a-z0-9]+-[a-z0-9]+$/);
      expect(by[theme.big].size).toBeGreaterThan(by[theme.small].size);
    }
    const person = { ...by.human, size: 1.23, you: true }, question = fresh('home', person, by.earth);
    person.size = 2.2;
    expect(question.small.size).toBe(1.23);
    expect(read({ ...question, guess: 6, revealed: true }).small.size).toBe(1.23);
  });

  it('registers every themed title and reflection prompt in the available English catalogs', () => {
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'].filter(file => fs.existsSync(file))) {
      const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.scaleExplorer;
      for (const theme of themes) {
        expect(strings['atlas_inquiry_theme_' + theme.id], file + ' ' + theme.id).toBe(theme.title);
        expect(strings['atlas_inquiry_reflect_' + theme.id], file + ' ' + theme.id).toBe(theme.reflect);
      }
    }
  });
});
