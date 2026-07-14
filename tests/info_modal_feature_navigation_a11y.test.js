import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_info_modal_source.jsx', 'utf8');

describe('Info modal feature-guide navigation', () => {
  it('uses native feature-card buttons without redundant keyboard emulation', () => {
    expect(source).toContain('onClick={(event) => openFeatureDetails(feature, categoryTitle, event.currentTarget)}');
    expect(source).not.toContain('role="button"');
    expect(source).not.toContain("onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ')");
    expect(source).toContain('<IconComponent size={16} aria-hidden="true"/>');
  });

  it('moves focus into feature details and restores the exact originating card', () => {
    expect(source).toContain('const featureBackRef = React.useRef(null)');
    expect(source).toContain('featureReturnFocusRef.current = trigger');
    expect(source).toContain('featureBackRef.current?.focus()');
    expect(source).toContain("if (trigger?.isConnected && typeof trigger.focus === 'function') trigger.focus()");
    expect(source).toContain('ref={featureBackRef}');
    expect(source).toContain('onClick={closeFeatureDetails}');
  });

  it('provides large native targets and strong visible focus', () => {
    expect(source).toContain('w-full min-h-11 p-3 rounded-lg');
    expect(source).toContain('min-h-11 flex items-center gap-2');
    expect(source.match(/focus-visible:ring-indigo-600/g)?.length)
      .toBeGreaterThanOrEqual(2);
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(readFileSync('prismflow-deploy/public/view_info_modal_module.js', 'utf8'))
      .toBe(readFileSync('view_info_modal_module.js', 'utf8'));
  });
});