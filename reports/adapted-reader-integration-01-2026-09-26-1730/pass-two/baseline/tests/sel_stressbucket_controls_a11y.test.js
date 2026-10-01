import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_stressbucket.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_stressbucket.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Stress Bucket control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names each dynamic remove action with the item it changes', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Remove stressor: ' + s.label");
    expect(text).toContain("'aria-label': 'Remove tap: ' + t.label");
    expect(text).toContain("'aria-label': 'Remove overflow sign: ' + s");
    expect((text.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('announces balance changes and labels new-entry controls', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Stress bucket balance'");
    expect(text).toContain("'aria-live': 'polite'");
    expect(text).toContain("'aria-label': 'Weight for new stressor'");
    expect(text).toContain("'aria-label': 'Capacity for new tap'");
  });

  it('summarizes capacity with a semantic meter and scan-friendly totals', () => {
    const text = source();
    expect(text).toContain("role: 'progressbar', 'aria-label': 'Stress bucket capacity used'");
    expect(text).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': capacityUsed");
    expect(text).toContain("'aria-valuetext': capacityUsed + ' percent used. ' + balanceTone.title + '.'");
    expect(text).toContain("'aria-label': 'Stress bucket totals'");
    expect(text).toContain("balanceStat('Inflow'");
    expect(text).toContain("balanceStat('Outflow'");
    expect(text).toContain("balanceStat('Net balance'");
    expect(text).toContain("}, 'Next move: '), nextAction");
  });

  it('gives each balance state a distinct visual message and richer bucket fill', () => {
    const text = source();
    expect(text).toContain("label: 'Overflowing', title: 'Your bucket is at capacity'");
    expect(text).toContain("label: 'High load', title: 'More is coming in than going out'");
    expect(text).toContain("label: 'Watch the balance', title: 'Your bucket is gradually filling'");
    expect(text).toContain("label: 'Balanced', title: 'Inflow and outflow are balanced'");
    expect(text).toContain("label: 'More room', title: 'Your supports are creating room'");
    expect(text).toContain("id: 'stressbucket-fill-gradient'");
    expect(text).toContain("fill: 'url(#stressbucket-fill-gradient)', opacity: 1");
    expect(text).toContain("fill > 0 ? h('ellipse'");
  });
});
