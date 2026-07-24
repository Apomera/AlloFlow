import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure standard and immersive toolbar accessibility', () => {
  it('bounds and exposes every persistent meter as a named progressbar', () => {
    expect(source).toContain('var xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1)');
    expect(source).toContain('var xpProgressPercent = Math.max(0, Math.min(100, (xpValue / xpMax) * 100))');
    expect(source).toContain('var energyValue = Math.max(0, Math.min(100, Number(adventureState.energy) || 0))');
    expect(source).toContain('var debateMomentumValue = Math.max(0, Math.min(100, Number(adventureState.debateMomentum) || 0))');
    expect(source.match(/role="progressbar"/g)).toHaveLength(5);
    expect(source.match(/aria-valuenow=\{xpValue\}/g)).toHaveLength(2);
    expect(source.match(/aria-valuenow=\{energyValue\}/g)).toHaveLength(2);
    expect(source).toContain('aria-valuenow={debateMomentumValue}');
    expect(source).toContain("style={{ width: xpProgressPercent + '%' }}");
    expect(source).toContain("style={{ width: energyValue + '%' }}");
    expect(source).toContain("style={{ width: debateMomentumValue + '%' }}");
  });

  it('exposes standard and immersive toggle state with accurate action names', () => {
    expect(source).toContain('aria-pressed={!!sessionData?.democracy?.isActive}');
    expect(source).toContain('aria-pressed={adventureState.isImmersiveMode}');
    expect(source.match(/aria-pressed=\{adventureAutoRead\}/g)).toHaveLength(2);
    expect(source).toContain('aria-pressed={immersiveHideUI}');
    expect(source).toContain("aria-label={adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')}");
    expect(source).toContain("aria-label={adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')}");
    expect(source).not.toContain("aria-label={t('common.volume')}");
    expect(source).toContain('<button type="button" data-help-key="adventure_choice_btn"');
    expect(source).toContain("aria-label={(t('common.listen') || 'Listen') + ': '");
    expect(source).not.toContain('<span className="flex items-center gap-3 flex-grow">');
  });

  it('provides larger visible-focus targets and hides toolbar decoration', () => {
    expect(source.match(/min-w-11 min-h-11/g)?.length).toBeGreaterThanOrEqual(10);
    expect(source.match(/focus-visible:ring-2 focus-visible:ring-yellow-300/g)?.length).toBeGreaterThanOrEqual(10);
    expect(source).toContain('<MapIcon size={18} className="text-yellow-300" aria-hidden="true"/>');
    expect(source).toContain('<Pencil size={14} aria-hidden="true" />');
    expect(source).toContain('<Minimize size={16} aria-hidden="true" />');
    expect(source).toContain('w-11 h-11 bg-white/10');
  });

  it('announces dynamic level, XP, energy, and game-over feedback with reduced motion', () => {
    expect(source.match(/role="status"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('aria-live="assertive" aria-atomic="true"');
    expect(source.match(/aria-live="polite" aria-atomic="true"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transform-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source.match(/<div aria-hidden="true"><ConfettiExplosion \/><\/div>/g)).toHaveLength(2);
  });

  it('exposes immersive inventory as a controlled named region and semantic item buttons', () => {
    expect(source).toContain('aria-expanded={showImmersiveInventory}');
    expect(source).toContain('aria-controls="adventure-immersive-inventory"');
    expect(source).toContain('id="adventure-immersive-inventory" role="region"');
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-label={item.name}');
    expect(source).toContain('src={item.image} alt=""');
  });

  it('keeps the generated deployment module synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('role: "progressbar"');
    expect(rootModule).toContain('"aria-pressed": adventureAutoRead');
    expect(rootModule).toContain('"aria-controls": "adventure-immersive-inventory"');
  });
});
