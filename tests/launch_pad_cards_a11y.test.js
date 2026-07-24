import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_launch_pad_source.jsx', 'utf8');

describe('Launch-pad primary mode card accessibility', () => {
  it('uses native buttons instead of simulated card controls', () => {
    expect(source.match(/<button type="button" className="lp-card"/g)).toHaveLength(4);
    expect(source).not.toContain('<div className="lp-card"');
    expect(source).not.toContain('role="button"');
    expect(source).not.toContain("onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ')");
  });

  it('provides visible-title names and descriptions for every card', () => {
    expect(source).toContain('aria-labelledby="launch-pad-full-title" aria-describedby="launch-pad-full-desc"');
    expect(source).toContain('aria-labelledby="launch-pad-guided-title" aria-describedby="launch-pad-guided-badge launch-pad-guided-desc"');
    expect(source).toContain('aria-labelledby="launch-pad-learning-title" aria-describedby="launch-pad-learning-badge launch-pad-learning-desc"');
    expect(source).toContain('aria-labelledby="launch-pad-educator-title" aria-describedby="launch-pad-educator-badge launch-pad-educator-desc"');
    expect(source.match(/className="lp-card-icon"/g)).toHaveLength(4);
    expect(source.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('provides robust focus, target size, contrast, reflow, and reduced motion', () => {
    expect(source).toContain('.lp-card { appearance: none; width: 100%; min-height: 44px;');
    expect(source).toContain('.lp-card:focus-visible { outline: 3px solid #facc15; outline-offset: 4px;');
    expect(source).toContain("color: '#e0e7ff'");
    expect(source).toContain("linear-gradient(135deg, #047857, #065f46)");
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.lp-root, .lp-card, .lp-card:hover, .lp-card:active, .lp-card-icon, .lp-badge');
    expect(source).toContain('.lp-grid { grid-template-columns: 1fr !important;');
  });

  it('keeps generated launch-pad modules synchronized', () => {
    const rootModule = fs.readFileSync('view_launch_pad_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_launch_pad_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule.match(/type: "button",\n\s+className: "lp-card"/g)).toHaveLength(4);
    expect(rootModule).not.toContain('role: "button"');
    expect(rootModule).toContain('aria-labelledby');
  });
});