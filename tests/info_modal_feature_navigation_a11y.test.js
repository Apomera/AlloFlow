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
    expect(readFileSync('desktop/web-app/public/view_info_modal_module.js', 'utf8'))
      .toBe(readFileSync('view_info_modal_module.js', 'utf8'));
  });

  it('offers an accessible searchable catalog and complete-Atlas handoff', () => {
    expect(source).toContain('role="search" aria-label="Search the Feature Guide"');
    expect(source).toContain('id="feature-guide-search"');
    expect(source).toContain('value={featureQuery}');
    expect(source).toContain("if (event.key === 'Escape' && featureQuery)");
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain('Open complete Atlas');
    expect(source).toContain('featureCatalogItems.length} curated workflow guides');
  });

  it('can launch a selected feature through the shared command palette', () => {
    expect(source).toContain("openCommandPaletteFromInfo(selectedFeature.title, 'feature-guide')");
    expect(source).toContain('Find this in AlloFlow');
    expect(source).toContain("window.CustomEvent('alloflow:open-command-palette'");
    expect(source).toContain('detail: { query: safeQuery, source }');
  });

  it('derives Feature Guide data at component scope, not inside a focus effect', () => {
    const componentStart = source.indexOf('function InfoModal({');
    const focusEffectStart = source.indexOf('React.useEffect(() => {', componentStart);
    const focusEffectEnd = source.indexOf('}, [selectedFeature]);', focusEffectStart);
    const catalogDerivation = source.indexOf("  const featuresList = t('about.features_list'", componentStart);
    const rootRender = source.indexOf('  return (\n    <div role="presentation"', componentStart);

    expect(focusEffectStart).toBeGreaterThan(componentStart);
    expect(focusEffectEnd).toBeGreaterThan(focusEffectStart);
    expect(catalogDerivation).toBeGreaterThan(focusEffectEnd);
    expect(catalogDerivation).toBeLessThan(rootRender);
    expect(source.slice(focusEffectStart, focusEffectEnd)).not.toContain('rawFeatureItems');
  });
});