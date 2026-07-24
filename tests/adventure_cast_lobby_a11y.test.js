import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');

describe('adventure cast lobby accessibility', () => {
  it('uses semantic controls for all inline-edit fields', () => {
    expect(source).not.toMatch(/<(h3|p) onClick=\{\(\) => startFieldEdit/);
    expect(source.match(/<button type="button" onClick=\{\(\) => startFieldEdit/g)?.length).toBe(3);
    expect(source).toContain('<h3><button type="button" onClick={() => startFieldEdit(i, \'name\')');
  });

  it('provides a visible-on-focus, named 24 pixel remove control', () => {
    expect(source).toContain('w-6 h-6 rounded-full bg-red-100');
    expect(source).toContain('group-focus-within/card:opacity-100 focus:opacity-100');
    expect(source).toContain("aria-label={(t('adventure.remove_character') || 'Remove character')");
  });

  it('synchronizes the semantic controls to both deployed module copies', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    const publicModule = fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8');
    expect(rootModule).toContain('Edit character appearance');
    expect(publicModule).toBe(rootModule);
  });
});
describe('adventure shop accessibility', () => {
  it('uses a named trapped dialog without a fake inner button', () => {
    expect(source).toContain('useFocusTrap(shopRef, true, onClose)');
    expect(source).not.toContain('<div role="button" tabIndex={0} className="bg-slate-900 border-4 border-indigo-500');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-label={t(\'adventure.shop\')}');
  });

  it('provides visible focus, larger targets, sufficient text contrast, and decorative icon hiding', () => {
    expect(source).toContain('min-w-11 min-h-11 bg-indigo-800');
    expect(source).toContain('min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300');
    expect(source.match(/text-\[11px\] text-slate-200 font-bold uppercase tracking-wider/g)).toHaveLength(2);
    expect(source).toContain('text-xs text-slate-300 italic text-right ml-auto');
    expect(source).toContain('<ShoppingBag size={24} aria-hidden="true" />');
  });

  it('keeps authoritative and deploy copies synchronized', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(shopRef, true, onClose)');
    expect(rootModule).not.toContain('role: "button", tabIndex: 0, className: "bg-slate-900 border-4 border-indigo-500');
  });
});
describe('adventure dice overlay accessibility', () => {
  it('uses a named modal and announces only the actual roll result', () => {
    expect(source).toContain('ref={diceRef}');
    expect(source).toContain('aria-labelledby="adventure-dice-result"');
    expect(source).toContain('role="status" aria-live="assertive"');
    expect(source).toContain("t('adventure.dice_roll_result', { result })");
    expect(source).toContain('className="dice-container" aria-hidden="true"');
    expect(source).not.toContain('<div role="button" tabIndex={0} className="dice-container"');
  });

  it('contains focus, supports Escape and skip, and shortens motion for reduced-motion users', () => {
    expect(source).toContain('useFocusTrap(diceRef, true, onComplete)');
    expect(source).toContain('data-alloflow-close-on-escape="true"');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source).toContain('reduceMotion ? 1000 : 3500');
  });

  it('ships the result label and synchronized source/module copies', () => {
    const strings = fs.readFileSync('ui_strings.js', 'utf8');
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(strings).toContain('"dice_roll_result": "Dice roll result: {result}"');
    expect(fs.readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).toBe(strings);
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(diceRef, true, onComplete)');
  });
});
describe('adventure mission report accessibility', () => {
  it('uses a named focus-trapped modal with focus return and Escape closure', () => {
    expect(source).toContain('const reportRef = useRef(null)');
    expect(source).toContain('useFocusTrap(reportRef, true, onClose)');
    expect(source).toContain('ref={reportRef} role="dialog" aria-modal="true" aria-labelledby="adventure-mission-report-title"');
    expect(source).toContain('id="adventure-mission-report-title"');
  });

  it('exposes proficiency as a named progressbar and correctly names every action', () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100} aria-valuenow={proficiency}');
    expect(source).toContain('Math.max(0, Math.min(100, Number(climax?.masteryScore) || 0))');
    expect(source).toContain('bg-green-700 text-white hover:bg-green-600');
    expect(source).toContain("<button aria-label={t('adventure.new_game') || \"New Game\"}");
    expect(source).not.toContain("<button aria-label={t('common.on_close')}");
  });

  it('provides larger visible-focus actions, sufficient contrast, and hidden decorative icons', () => {
    expect(source).toContain('w-full min-h-11 py-3 rounded-xl font-bold bg-indigo-600');
    expect(source).toContain('w-full min-h-11 py-2 text-sm font-bold text-slate-200');
    expect(source).toContain('text-[11px] text-slate-300 font-bold uppercase mb-2');
    expect(source).toContain('<Trophy size={32} aria-hidden="true" />');
    expect(source).toContain('<MapIcon size={18} aria-hidden="true" />');
  });

  it('keeps Mission Report source and deploy modules synchronized', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(reportRef, true, onClose)');
    expect(rootModule).toContain('role: "progressbar"');
  });
});
describe('adventure cast lobby modal accessibility', () => {
  it('uses a named focus-contained modal with deliberate heading focus and focus return', () => {
    expect(source).toContain('const castRef = useRef(null)');
    expect(source).toContain('useFocusTrap(castRef, true)');
    expect(source).toContain('ref={castRef} role="dialog" aria-modal="true" aria-labelledby="adventure-cast-lobby-title"');
    expect(source).toContain('ref={castTitleRef} id="adventure-cast-lobby-title" tabIndex={-1}');
    expect(source).toContain('requestAnimationFrame(() => castTitleRef.current?.focus())');
  });

  it('reflows at narrow widths and announces portrait generation', () => {
    expect(source).toContain('overflow-y-auto p-4 sm:p-8');
    expect(source).toContain('className="flex flex-wrap justify-center gap-3"');
    expect(source).toContain('role="status" aria-live="polite">');
    expect(source).toContain('Creating portrait…');
    expect(source).toContain('Waiting its turn…');
    expect(source).toContain('aria-label="Cast portraits ready"');
    expect(source).toContain('rounded-full" aria-hidden="true"');
  });

  it('deduplicates portrait work, caps concurrency, and exposes aggregate progress', () => {
    expect(source).toContain('activePortraitJobsRef.current.size < 2');
    expect(source).toContain('activePortraitJobsRef.current.has(key) || portraitQueueRef.current.some(job => job.key === key)');
    expect(source).toContain('prioritizedIndexes.forEach(index => enqueuePortrait(index))');
    expect(source).not.toContain('setTimeout(() => onGeneratePortrait(i), i * 600)');
    expect(source).toContain('Creating up to two portraits at a time');
    expect(source).toContain('aria-valuenow={portraitReadyCount}');
  });

  it('provides larger, contrasted, visibly focused main actions and hides decorative symbols', () => {
    expect(source).toContain('min-h-11 px-5 py-2.5 bg-violet-100 text-violet-700');
    expect(source).toContain('border border-violet-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none');
    expect(source.match(/border border-violet-600 rounded-lg focus:ring-2/g)).toHaveLength(4);
    expect(source).toContain('border-2 border-dashed border-violet-600');
    expect(source).toContain('min-h-11 px-6 py-2.5 bg-violet-700 text-white');
    expect(source.match(/<span aria-hidden="true">/g).length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('group-hover:scale-110 transition-transform" aria-hidden="true"');
  });

  it('keeps Cast Lobby source and deploy modules synchronized', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(castRef, true)');
    expect(rootModule).toContain('"aria-labelledby": "adventure-cast-lobby-title"');
  });
});
describe('adventure cast lobby secondary controls accessibility', () => {
  const castSource = source.slice(source.indexOf('const CastLobby = React.memo('));

  it('uses native button behavior and larger targets for secondary actions', () => {
    expect(castSource).not.toContain('<button onClick');
    expect(castSource).toContain('min-w-11 min-h-11 px-2 font-bold text-slate-800');
    expect(castSource).toContain('min-w-11 min-h-11 px-2 text-xs text-violet-700');
    expect(castSource.match(/min-h-11 px-3 py-2/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it('names glyph-only portrait refinement controls', () => {
    expect(castSource).toContain("aria-label={t('common.confirm') || 'Apply portrait refinement'}");
    expect(castSource).toContain("aria-label={t('common.cancel') || 'Cancel portrait refinement'}");
    expect(castSource).toContain("aria-label={(t('adventure.edit_nanobanana') || 'Refine portrait') + ': ' + char.name}");
  });

  it('strengthens secondary-action focus and small-text contrast', () => {
    expect(castSource).toContain('text-sky-700');
    expect(castSource).toContain('border border-sky-600');
    expect(castSource).toContain('text-emerald-700');
    expect(castSource).toContain('border border-emerald-600');
    expect(castSource.match(/focus-visible:outline-none focus-visible:ring-2/g)?.length).toBeGreaterThanOrEqual(14);
    expect(castSource).toContain('<span className="text-3xl" aria-hidden="true">');
  });

  it('keeps the second Cast Lobby pass synchronized to deployment artifacts', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('Apply portrait refinement');
    expect(rootModule).toContain('min-h-11 px-3 py-2 bg-sky-50 text-sky-700');
  });
});
