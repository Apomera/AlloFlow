import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sleep.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sleep.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Sleep and Rest Lab experiment review', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('summarizes repeated personal experiments without diagnosing', () => {
    const text = source();
    expect(text).toContain('var experimentGroups = {}');
    expect(text).toContain('var experimentSummary = Object.keys(experimentGroups)');
    expect(text).toContain("'aria-label': 'Sleep experiment review'");
    expect(text).toContain("'aria-label': 'Logged sleep experiments'");
    expect(text).toContain('Small experiment review');
    expect(text).toContain('This does not prove what caused a change, and it is not a diagnosis.');
    expect(text).toContain('experiment.count === 1');
  });

  it('adds labelled keyboard-accessible tab panels', () => {
    const text = source();
    expect(text).toContain("id: 'sleep-tab-' + t.id");
    expect(text).toContain("'aria-controls': 'sleep-panel-' + t.id");
    expect(text).toContain('tabIndex: active ? 0 : -1');
    expect(text).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(text).toContain("event.key === 'Home'");
    expect(text).toContain("role: 'tabpanel', 'aria-labelledby': 'sleep-tab-' + view");
  });

  it('preserves the existing diary experiment field and safety framing', () => {
    const text = source();
    expect(text).toContain("id: 'sl-experiment'");
    expect(text).toContain('experiment: experiment');
    expect(text).toContain("'Tried: ' + e.experiment");
    expect(text).toContain('Persistent sleep problems are not a willpower test.');
  });
});