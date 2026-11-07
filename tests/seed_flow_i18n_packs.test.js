// The experimental starts (topic / word list / blank, the "Two roads" fork, fact check, lesson path) were
// translated into every language pack on 2026-11-03. Before that, all of it showed in English for every
// language. These checks keep a later edit from dropping a key, breaking a placeholder, or adding an English
// string to ui_strings without a translation. Held packs (no machine translation by policy) are skipped.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const HELD = new Set(['acholi', 'chin_falam', 'chin_hakha', 'karen', 'lingala', 'maay_maay', 'marshallese']);
const OURS = [/^sidebar\.(needs_source|start_blank|start_word_list|other_ways_to_start|path_fork_)/, /^source_start\./,
  /^common\.(blank_draft_notice|topic_seed_notice|word_list_seed_notice|word_list_sort_notice|word_list_topic|word_list_scaffolds_notice|word_list_unused|seed_)/, /^about\.(maker|dedication)$/,
  /^toasts\.blank_created/, /^quiz\.(add_reflection|remove_reflection)$/, /^glossary\.add_term_as_typed$/,
  /^concept_sort\.(add_category|new_category_placeholder|new_category_label|delete_category|delete_category_hint)$/, /^anchor_chart\.layout$/,
  /^scaffolds\.(empty_resource|tier_emerging|tier_expanding|tier_bridging|save_failed|feedback_purpose|get_draft_feedback|word_bank|draft_feedback_error|discussion_placeholder|self_checklist|regenerate_self_checklist|regenerate_rubric|generate_self_checklist|generate_rubric)$/];
const flatten = (obj, prefix = '', out = new Map()) => {
  for (const [key, value] of Object.entries(obj || {})) {
    const id = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, id, out); else out.set(id, value);
  }
  return out;
};
const english = flatten(JSON.parse(readFileSync('ui_strings.js', 'utf8')));
const ids = [...english.keys()].filter(id => typeof english.get(id) === 'string' && OURS.some(re => re.test(id)));
const placeholders = text => (String(text).match(/\{\w+\}/g) || []).sort().join(',');
const slugs = readdirSync('lang').filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(slug => !HELD.has(slug));

describe('experimental-start strings in every language pack', () => {
  it('covers the whole feature', () => { expect(ids.length).toBeGreaterThanOrEqual(98); expect(slugs.length).toBeGreaterThanOrEqual(56); });

  it.each(slugs)('%s has every key, translated, with its placeholders', slug => {
    const pack = flatten(JSON.parse(readFileSync('lang/' + slug + '.js', 'utf8')));
    const missing = ids.filter(id => typeof pack.get(id) !== 'string' || !pack.get(id).trim());
    expect(missing, 'missing').toEqual([]);
    const broken = ids.filter(id => placeholders(pack.get(id)) !== placeholders(english.get(id)));
    expect(broken, 'placeholders differ').toEqual([]);
    const sameAsEnglish = ids.filter(id => pack.get(id) === english.get(id) && id !== 'source_start.glossary');
    expect(sameAsEnglish.length, 'left in English: ' + sameAsEnglish.join(', ')).toBeLessThanOrEqual(3);
  });

  // Machine translation once left values like "लेखन Scaffolds" and "शब्द Bank". "Bank" is a real word in these three.
  const BANK_IS_A_WORD = new Set(['polish', 'haitian_creole', 'indonesian']);
  it.each(slugs)('%s names the tool and the word bank without leftover English', slug => {
    const pack = flatten(JSON.parse(readFileSync('lang/' + slug + '.js', 'utf8')));
    expect(pack.get('sidebar.tool_scaffolds')).not.toMatch(/Scaffolds/);
    if (!BANK_IS_A_WORD.has(slug)) expect(pack.get('simplified.word_bank')).not.toMatch(/\bBank\b/);
  });
});
