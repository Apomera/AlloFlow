import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_careconstellations.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_careconstellations.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Care Constellations Care Pulse', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('adds a descriptive pulse view without turning care into a score', () => {
    const text = source();
    expect(text).toContain("{ id: 'pulse', label: 'Care Pulse'");
    expect(text).toContain('function renderPulse()');
    expect(text).toContain("'aria-label': 'Care Pulse summary'");
    expect(text).toContain("'aria-label': 'Care flow summary'");
    expect(text).toContain("'aria-label': 'Mapped care categories'");
    expect(text).toContain('It is not a wellness score, and there is no ideal shape.');
    expect(text).toContain("'aria-label': 'Add a connection from Care Pulse'");
    expect(text).toContain("'aria-label': 'Open reflections from Care Pulse'");
  });

  it('gives the section tabs roving keyboard semantics and a labelled panel', () => {
    const text = source();
    expect(text).toContain("id: 'cc-tab-' + t.id");
    expect(text).toContain("'aria-controls': 'cc-panel-' + t.id");
    expect(text).toContain('tabIndex: active ? 0 : -1');
    expect(text).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(text).toContain("event.key === 'Home'");
    expect(text).toContain("role: 'tabpanel', 'aria-labelledby': 'cc-tab-' + view");
  });

  it('preserves the existing constellation map and reflection labels', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Care constellation map.");
    expect(text).toContain("h('label', { htmlFor: 'cc-reflection-' + p.id");
    expect(text).toContain("h('textarea', { id: 'cc-reflection-' + p.id");
  });
});