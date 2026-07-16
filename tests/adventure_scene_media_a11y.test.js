import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure scene, artwork, and playback accessibility', () => {
  it('separates read-aloud actions from formatted sentence content', () => {
    expect(source.match(/<React\.Fragment key=\{sIdx\}>/g)).toHaveLength(2);
    expect(source.match(/aria-controls=\{`sentence-\$\{currentGlobalIdx\}`\}/g)).toHaveLength(2);
    expect(source.match(/aria-pressed=\{isActive\}/g)).toHaveLength(2);
    expect(source.match(/id=\{`sentence-\$\{currentGlobalIdx\}`\}/g)).toHaveLength(2);
    expect(source.match(/min-w-8 min-h-8 mr-1 inline-flex/g)).toHaveLength(2);
    expect(source).not.toContain("'cursor-pointer hover:bg-yellow-100'");
    expect(source).not.toContain("'cursor-pointer hover:bg-white/10'");
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
    expect(source).toContain('src={adventureState.sceneImage}\n                                                        alt=""');
    expect(source).toContain('src={adventureState.sceneImage}\n                                        className={`absolute');
    expect(source.match(/alt=""/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source.match(/role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0/g)).toHaveLength(2);
    expect(source).toContain('animate-ken-burns motion-reduce:animate-none motion-reduce:transition-none');
    expect(source).toContain('aria-hidden="true" className="absolute inset-0 bg-gradient-to-t');
  });

  it('provides a named larger image-size slider and robust completion actions', () => {
    expect(source).toContain("aria-label={t('common.adjust_image_size')} aria-valuetext={adventureImageSize + ' px'}");
    expect(source).toContain('className="w-24 h-11');
    expect(source).not.toContain("aria-label={t('common.range_slider')}");
    expect(source).toContain('<button type="button"\n                                            onClick={handleSetShowStorybookExportModalToTrue}');
    expect(source).toContain("aria-label={t('adventure.start_sequel')}");
    expect(source).not.toContain("aria-label={t('common.start_sequel')}");
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transform-none');
  });

  it('keeps generated Adventure modules synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('prismflow-deploy/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('"aria-controls"');
    expect(rootModule).toContain('"aria-pressed": isActive');
    expect(rootModule).toContain('"aria-valuetext": adventureImageSize + \' px\'');
  });
});