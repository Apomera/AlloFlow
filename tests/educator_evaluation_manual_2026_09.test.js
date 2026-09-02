// Educator Evaluation manual additions (2026-09-02): the first-minute path,
// the one-row status bar, the component heatmap, the phone walkthrough form,
// dark and high-contrast themes, and the blocked-clipboard fallback. Each
// claim is pinned to the code it describes so the manual cannot drift.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const MANUAL = read('educator-evaluation-manual.html');
const SOURCE = read('educator_evaluation_source.jsx');

describe('manual additions stay true to the tool', () => {
  it('describes the first-minute path the code implements', () => {
    expect(MANUAL).toContain('<h3>The first minute</h3>');
    expect(MANUAL).toContain('Add my first educator');
    expect(SOURCE).toContain('"Add my first educator"');
    expect(SOURCE).toContain('ae-onboarding-option ae-onboarding-option-primary');
    expect(MANUAL).toContain('<strong>Details</strong> toggle');
    expect(SOURCE).toContain('ae-banner-toggle');
  });

  it('documents the component heatmap, the phone form, and the themes with figures present in both trees', () => {
    expect(MANUAL).toContain('<h3>Documented evidence by component</h3>');
    expect(MANUAL).toContain('<h3>Recording a walkthrough on a phone</h3>');
    expect(MANUAL).toContain('<strong>Dark and high contrast.</strong>');
    expect(MANUAL).toContain('Clipboard is blocked in this window');
    for (const name of ['17-component-heat.jpg', '18-phone-walkthrough.jpg', '19-high-contrast.jpg']) {
      const src = 'educator-evaluation-manual-assets/' + name;
      expect(MANUAL).toContain('src="' + src + '"');
      const local = fs.readFileSync(path.join(ROOT, src));
      expect(fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', src)).equals(local)).toBe(true);
      expect(local.length).toBeGreaterThan(10240);
    }
    expect(SOURCE).toContain('data-help-key="ae_component_heat_cell"');
    expect(SOURCE).toContain('ae-walk-quick');
    expect(SOURCE).toContain('.theme-contrast .ae-shell,[data-ae-theme=contrast] .ae-shell');
  });

  it('keeps the review date current and the section count unchanged', () => {
    expect(MANUAL).toContain('<span>reviewed September 2, 2026</span>');
    expect(MANUAL).toContain('<span>21 sections</span>');
    expect(Array.from(MANUAL.matchAll(/<h2 id="[^"]+">\d+\. /g)).length).toBe(21);
    expect(read('desktop', 'web-app', 'public', 'educator-evaluation-manual.html')).toBe(MANUAL);
  });
});
