import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure scene, artwork, and playback accessibility', () => {
  it('sentence text is the accessible read-aloud control (no inline speaker buttons)', () => {
    // 2026-07-16 (Aaron): the inline per-sentence speaker buttons (52c353dea) were
    // removed from adventure narrative text as redundant with click-to-karaoke.
    // The sentence span itself now carries the SAME keyboard/SR semantics:
    // focusable button-role, Enter/Space activation, pressed state, visible focus ring.
    expect(source.match(/aria-controls=\{`sentence-\$\{currentGlobalIdx\}`\}/g)).toBeNull(); // button signature gone
    expect(source.match(/min-w-8 min-h-8 mr-1 inline-flex/g)).toBeNull();                    // button chrome gone
    expect(source.match(/id=\{`sentence-\$\{currentGlobalIdx\}`\}/g)).toHaveLength(2);       // both renderers
    expect(source.match(/aria-pressed=\{isActive\}/g)).toHaveLength(2);
    const spanControls = source.match(/role="button"[\s\S]{0,120}?tabIndex=\{0\}/g) || [];
    expect(spanControls.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/e\.key === 'Enter' \|\| e\.key === ' '/g)).toHaveLength(2);         // keyboard activation
    expect(source.match(/cursor-pointer focus-visible:outline-none focus-visible:ring-2/g)).toHaveLength(2); // visible focus
  });

  it('names scene regions without creating playback announcement conflicts', () => {
    expect(source).toContain('role="region" aria-labelledby="adventure-current-scene-heading"');
    expect(source).toContain('id="adventure-current-scene-heading"');
    expect(source).toContain('role="region" aria-label={t(\'adventure.current_scene\')}');
    expect(source).not.toContain('aria-labelledby="adventure-current-scene-heading" aria-live');
    expect(source).not.toContain("aria-label={t('adventure.current_scene')} aria-live");
    expect(source).toContain('<div role="status" aria-live="polite" aria-atomic="true" className="text-yellow-300');
  });

  it('treats redundant artwork as decorative and announces image availability', () => {
    expect(source).toContain('src={adventureState.sceneImage || adventureState.sceneImagePreview}\n                                                        alt=""');
    expect(source).toContain('src={adventureState.sceneImage || adventureState.sceneImagePreview}\n                                        className={`absolute');
    expect(source.match(/alt=""/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source.match(/role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0/g)).toHaveLength(2);
    expect(source).toContain('animate-ken-burns motion-reduce:animate-none motion-reduce:transition-none');
    expect(source).toContain('aria-hidden="true" className="absolute inset-0 bg-gradient-to-t');
  });

  it('provides a named larger image-size slider and robust completion actions', () => {
    expect(source).toContain("aria-label={t('common.adjust_image_size')} aria-valuetext={adventureImageSize + ' px'}");
    expect(source).toContain('className="w-24 h-11');
    expect(source).not.toContain("aria-label={t('common.range_slider')}");
    expect(source).toMatch(/<button type="button"\s+onClick=\{handleSetShowStorybookExportModalToTrue\}/);
    expect(source).toContain("aria-label={t('adventure.start_sequel')}");
    expect(source).not.toContain("aria-label={t('common.start_sequel')}");
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transform-none');
  });

  it('keeps generated Adventure modules synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('role: "button"');
    expect(rootModule).toContain('"aria-pressed": isActive');
    expect(rootModule).not.toContain('"aria-controls": `sentence-'); // inline speaker buttons removed 2026-07-16 (other aria-controls, e.g. the inventory disclosure, are legit)
    expect(rootModule).toContain('"aria-valuetext": adventureImageSize + \' px\'');
  });
});