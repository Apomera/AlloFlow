// Word Sounds contrast across the app themes (2026-11-08), found with axe on each screen inside the real app root
// (theme-light / theme-dark / theme-contrast + AppStyles CSS). Two theme rules drive these choices:
// - high contrast turns text-slate-700 and darker yellow on black, but leaves text-slate-600 grey (2.77:1);
// - dark remaps amber text to a light amber but keeps bg-amber-200 / bg-amber-400 pale (1.15:1).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const WS = readFileSync('word_sounds_module.js', 'utf8');
const SETUP = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const MISC = readFileSync('misc_components_source.jsx', 'utf8');

describe('Word Sounds stays readable in light, dark and high contrast', () => {
  it('Present Teacher controls: not-ready chips and their note', () => {
    expect(WS).toContain('h("p", { className: "mb-1 text-sm text-slate-700" }, note),');
    expect(WS).toContain('"rounded-lg border border-dashed border-slate-300 px-2 py-1 text-sm text-slate-700" }, activityLabel(a.id))');
  });
  it('practice: activity group labels, the teacher note and the anchor sound chip', () => {
    expect(WS).toContain('"text-[0.625rem] font-bold uppercase tracking-wide text-slate-700 px-1 self-center whitespace-nowrap"');
    expect(WS).toContain('"mx-auto mb-4 max-w-2xl text-center text-xs text-slate-700"');
    expect(WS).toContain('rounded-full bg-amber-100 hover:ring-2 hover:ring-amber-400 text-amber-800');
    expect(WS).not.toContain('rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800');
  });
  it('end screen: the two amber buttons keep dark-safe colours', () => {
    expect(WS.split('"w-full py-4 bg-amber-100 text-amber-900 ring-4 ring-amber-400 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"').length - 1).toBe(2);
    expect(WS).not.toContain('"w-full py-4 bg-amber-400 text-amber-900');
  });
  it('setup and review panel labels', () => {
    expect(SETUP).toContain('<span className="block text-[11px] text-slate-600">{tf(\'word_sounds.voice_pack_cta_hint\'');
    for (const cls of ['text-orange-700 uppercase tracking-wider mb-2 block">{t(\'word_sounds.rhyme_options\')',
      'text-violet-700 uppercase tracking-wider mb-2 block">{t(\'word_sounds.blend_options\')',
      'text-amber-700 uppercase tracking-wider block">{t(\'word_sounds.sound_swap_label\')',
      'text-indigo-700 uppercase tracking-wider mb-2 block flex items-center gap-2">']) expect(MISC).toContain(cls);
  });
  it('Word Sounds own a11y CSS no longer overrides the dark and high-contrast themes', () => {
    expect(WS).toContain("'.word-sounds-root:not(.theme-dark *):not(.theme-contrast *) .text-gray-400 { color: #6b7280 !important; }',");
    expect(WS).toContain("'.word-sounds-root:not(.theme-dark *):not(.theme-contrast *) .text-slate-600 { color: #475569 !important; }',");
    expect(WS).not.toContain("'.word-sounds-root .text-slate-600 { color: #475569 !important; }'");
  });
  it('the Spelling card switched off by the lesson plan stays readable (no fade) and is translatable', () => {
    expect(SETUP).toContain("includeLessonPlan ? 'cursor-not-allowed border-dashed border-slate-300 bg-slate-50'");
    expect(SETUP).not.toContain("'opacity-50 cursor-not-allowed border-slate-200'");
    expect(SETUP).toContain("tf('word_sounds.ortho_controlled_by_plan', 'Set by the lesson plan below.')");
    expect(SETUP).toContain("{orthoSessionGoal || tf('word_sounds.ortho_off', 'Off')}");
  });
});
