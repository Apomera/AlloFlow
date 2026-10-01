import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_behavioralactivation.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_behavioralactivation.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Behavioral Activation energy-aware action loop', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('offers four neutral capacity choices with accessible pressed feedback', () => {
    const text = source();
    expect(text).toContain("{ id: 'tiny', label: 'Very low'");
    expect(text).toContain("{ id: 'low', label: 'Low'");
    expect(text).toContain("{ id: 'some', label: 'Some energy'");
    expect(text).toContain("{ id: 'ready', label: 'More available'");
    expect(text).toContain("role: 'group', 'aria-label': 'Available energy'");
    expect(text).toContain("'aria-pressed': selected");
    expect(text).toContain('This is a capacity check, not a score.');
  });

  it('narrows the activity bank to one category-balanced next action', () => {
    const text = source();
    expect(text).toContain('var ENERGY_STARTERS = {');
    expect(text).toContain("'One-action loop'");
    expect(text).toContain("'Behavioral activation action loop'");
    expect(text).toContain('One matched idea per category. Choose only one for now.');
    expect(text).toContain('focusActivityId: null');
    expect(text).toContain("'Activity added and set as your next action.'");
  });

  it('connects the chosen action to recheck and keeps the full library optional', () => {
    const text = source();
    expect(text).toContain("'I did this — recheck →'");
    expect(text).toContain("setBA({ plannedActivities: nx, focusActivityId: null, view: 'log' })");
    expect(text).toContain("'Set ' + a.label + ' as next action'");
    expect(text).toContain("return h('details', { key: catId");
    expect(text).toContain("'Open options'");
  });
});
