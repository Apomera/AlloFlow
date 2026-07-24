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

  it('styles the real target instead of rendering a detached fixed overlay', () => {
    expect(component).toContain(':where(.allo-guided-target,[data-allo-guided-target="true"]){outline:3px solid');
    expect(component).toContain(':where(.allo-guided-target,[data-allo-guided-target="true"]){animation:none !important}');
    expect(component).not.toContain('className="allo-guided-ring"');
    expect(component).not.toContain("position: 'fixed', top: guidedRect.top");
  });

  it('reports one-based progress and distinguishes skipped steps', () => {
    expect(component).toContain('aria-valuenow={Math.min(guidedStep + 1, GUIDED_STEPS.length)}');
    expect(component).toContain('aria-valuemin={1}');
    expect(component).toContain("(t('guided.step_of') || 'Step {current} of {total}').replace");
    expect(component).toContain('guidedSkippedIds.includes(s.id)');
    expect(component).toContain("repeating-linear-gradient(135deg");
  });

  it('allows the action controls to wrap in narrow or translated layouts', () => {
    expect(component).toContain("display: 'flex', gap: '8px', flexWrap: 'wrap'");
  });
  it('names phase context and delivery choices and preserves required milestones', () => {
    expect(component).toContain('aria-label={t(\'guided.phase_context\')');
    expect(component).toContain("'Phase {current} of {total}'");
    expect(component).toContain('role="region" aria-labelledby="guided-delivery-title"');
    expect(component).toContain("aria-label={t('guided.delivery_options_label')");
    expect(component).toContain("const locked = s.id === 'source-input' || s.id === 'package-deliver' || s.id === '_final'");
    expect(component).toContain('role="heading" aria-level={3}');
  });
});

describe('Guided Mode banner follow-up safeguards', () => {
  it('declares localization keys for every Guided step and localizes non-English success state', () => {
    expect(component).toContain('const GUIDED_STEP_I18N_KEYS = {');
    expect(component).toContain("'directions': ['directions.title', 'directions.subtitle']");
    expect(component).toContain("'package-deliver': ['tour.fullpack_title', 'tour.fullpack_text']");
    expect(component).toContain("'_final': ['tour.fullpack_title', 'tour.fullpack_text']");
    expect(component).toContain("return localizeStep(sourceStep, 'label') + ' ✓'");
  });

  it('provides a named completion summary and a progress-preserving Resume later action', () => {
    expect(component).toContain('role="list" aria-label={t(\'guided.summary_label\')');
    expect(component).toContain('completedCount');
    expect(component).toContain('skippedCount');
    expect(component).toContain("t('guided.resume_later') || 'Resume later'");
  });
});
describe('Guided Mode resilience and responsive safeguards', () => {
  it('suspends its target highlight behind modal surfaces and supports forced colors', () => {
    expect(component).toContain('body:has([aria-modal="true"]) :where(.allo-guided-target,[data-allo-guided-target="true"])');
    expect(component).toContain('animation-play-state:paused!important');
    expect(component).toContain('@media (forced-colors:active)');
    expect(component).toContain('outline:3px solid Highlight!important');
  });

  it('exposes a persistent compact disclosure and step estimates', () => {
    expect(component).toContain('aria-expanded={!isCollapsed} aria-controls="guided-banner-details"');
    expect(component).toContain('id="guided-banner-details"');
    expect(component).toContain('allo_guided_ui_state');
    expect(component).toContain("aria-label={t('guided.estimate_label') || 'Step estimate'}");
  });

  it('provides direct step navigation and comfortable touch targets', () => {
    expect(component).toContain('id="guided-step-jump"');
    expect(component).toContain('.allo-guided-banner button,.allo-guided-banner select{min-height:40px}');
    expect(component).toContain('disabled={guidedBusy}');
  });
  it('announces recoverable errors and source changes', () => {
    expect(component).toContain('{guidedStepError && (');
    expect(component).toContain('<div role="alert"');
    expect(component).toContain('onClick={retryGuidedStep}');
    expect(component).toContain('{sourceStale && (');
  });
});