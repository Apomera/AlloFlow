import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'view_timeline_source.jsx');
const modulePath = resolve(process.cwd(), 'view_timeline_module.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/view_timeline_module.js');
const source = () => readFileSync(sourcePath, 'utf8');
const moduleText = () => readFileSync(modulePath, 'utf8');

describe('Timeline view accessibility', () => {
  it('keeps the deployed module identical to the generated module', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(moduleText());
  });

  it('announces asynchronous Timeline activity locally', () => {
    const text = source();
    expect(text).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(text).toContain('isRevisingTimeline ?');
    expect(text).toContain('isAutoFixingTimeline ?');
    expect(text).toContain('isVerifyingTimeline ?');
    expect(text).toContain('Object.values(isGeneratingTimelineImage || {}).some(Boolean)');
  });

  it('documents and retains the button-based dragging alternative', () => {
    const text = source();
    expect(text).toContain('draggable={true} data-keyboard-alternative="move-buttons" role="group"');
    expect(text).toContain('handleTimelineMove(idx, idx - 1)');
    expect(text).toContain('handleTimelineMove(idx, idx + 1)');
  });

  it('names the image-refinement field', () => {
    expect(source()).toContain("<input aria-label={t('timeline.visuals.refine_placeholder') || 'Describe image changes'} type=\"text\" value={timelineRefinementInputs[idx]");
  });

  it('honors reduced-motion preferences for spinners and entrance effects', () => {
    const text = source();
    expect(text).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(text.match(/className=\{reducedMotion \? '' : 'animate-spin'\}/g)).toHaveLength(7);
    expect(text).not.toContain('className="animate-spin"');
    expect(text.match(/motion-safe:animate-in/g)).toHaveLength(3);
  });
});
