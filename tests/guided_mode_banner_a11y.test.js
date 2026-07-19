import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_guided_mode_banner_source.jsx', 'utf8');
const component = source.slice(source.indexOf('function GuidedModeBanner'));

describe('Guided Mode banner accessibility', () => {
  it('names the persistent banner region and uses non-submitting controls', () => {
    expect(component).toContain('className="allo-guided-banner" role="region" aria-label=');
    expect(component.match(/<button\b/g)?.length).toBeGreaterThan(10);
    expect(component).not.toMatch(/<button(?![^>]*\btype=)/);
  });

  it('represents collapsible detail panels as disclosures rather than tabs', () => {
    expect(component).toContain('role="group" aria-label={t(\'guided.detail_tablist\')');
    expect(component).toContain('id="gd-detail-how" aria-expanded={infoTab === \'how\'} aria-controls="gd-panel-how"');
    expect(component).toContain('id="gd-detail-example" aria-expanded={infoTab === \'example\'} aria-controls="gd-panel-example"');
    expect(component).toContain('role="region" id="gd-panel-how" aria-labelledby="gd-detail-how"');
    expect(component).toContain('role="region" id="gd-panel-example" aria-labelledby="gd-detail-example"');
    expect(component).not.toContain('role="tablist"');
    expect(component).not.toContain('role="tab"');
    expect(component).not.toContain('role="tabpanel"');
  });

  it('exposes expanded state and control relationships for auxiliary panels', () => {
    expect(component).toContain('aria-expanded={showPicker} aria-controls="guided-step-picker"');
    expect(component).toContain('id="guided-step-picker" role="group"');
    expect(component).toContain('aria-expanded={showGuidedTip} aria-controls="guided-about-panel"');
    expect(component).toContain('id="guided-about-panel" role="region" aria-label=');
  });

  it('reduces all banner and dialog animation when requested', () => {
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
    expect(component).toContain('.allo-guided-banner *,.allo-guided-dialog *');
    expect(component).toContain('transition-duration:.01ms !important');
  });

  it('keeps the decorative step ring below modal layers', () => {
    expect(component).toContain("borderRadius: '18px', pointerEvents: 'none', zIndex: 1");
    expect(component).not.toMatch(/allo-guided-ring[\s\S]{0,500}zIndex:\s*9000/);
  });
});
