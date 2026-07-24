import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Affirmation Library accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAffirmations(props) {');
  const end = source.indexOf('  function PersonalRoleModels(props) {', start);
  const affirmations = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(affirmations).toContain("onSubmit: function(event) { event.preventDefault(); addCustom(); }");
    expect(affirmations).toContain("'aria-labelledby': 'learning-lab-affirmation-form-heading'");
    expect(affirmations).toContain("id: 'learning-lab-affirmation-form-heading'");
    expect(affirmations).toContain("type: 'submit'");
  });

  it('associates a visible required label with the custom field', () => {
    expect(affirmations).toContain("htmlFor: 'learning-lab-affirmation-new'");
    expect(affirmations).toContain("'Custom affirmation (required)'");
    expect(affirmations).toContain("id: 'learning-lab-affirmation-new', value: newOne, rows: 3, required: true, maxLength: 1000");
  });

  it('reports and focuses an empty custom entry inline', () => {
    expect(affirmations).toContain("setEntryError('Enter words you want to add to your library.')");
    expect(affirmations).toContain("focusById('learning-lab-affirmation-new')");
    expect(affirmations).toContain("id: 'learning-lab-affirmation-new-error', role: 'alert'");
    expect(affirmations).toContain("'aria-invalid': entryError ? 'true' : undefined");
  });

  it('stores new custom entries with stable IDs', () => {
    expect(affirmations).toContain("var entry = { id: tkId(), text: text };");
    expect(affirmations).toContain("custom: custom.concat([entry])");
    expect(affirmations).not.toContain("id: 'c-' + i");
  });

  it('normalizes legacy string entries and positional favorite IDs', () => {
    expect(affirmations).toContain('function legacyTextId(text, index)');
    expect(affirmations).toContain("var match = /^c-(\\d+)$/.exec(String(id));");
    expect(affirmations).toContain('customEntries[parseInt(match[1], 10)].id');
  });

  it('preserves unrelated section data when adding and favoriting', () => {
    expect(affirmations).toContain("setData(Object.assign({}, data, { custom: custom.concat([entry]), favorites: normalizedFavorites }))");
    expect(affirmations).toContain("setData(Object.assign({}, data, { favorites: nextFavorites }))");
  });

  it('announces additions and restores focus for another entry', () => {
    expect(affirmations).toContain("llAnnounce('Custom affirmation added: ' + text)");
    expect(affirmations).toContain("focusById('learning-lab-affirmation-new')");
  });

  it('frames statements as optional prompts rather than guaranteed effects', () => {
    expect(affirmations).toContain('Choose words that feel true or useful to you');
    expect(affirmations).toContain('These are optional reflection prompts, not promises or treatment.');
    expect(affirmations).not.toContain('buffers against threats to identity');
    expect(affirmations).not.toContain('improves performance');
  });

  it('uses a named daily section and blockquote', () => {
    expect(affirmations).toContain("'aria-labelledby': 'learning-lab-affirmation-daily-heading'");
    expect(affirmations).toContain("id: 'learning-lab-affirmation-daily-heading'");
    expect(affirmations).toContain("hh('blockquote'");
  });

  it('uses normalized favorites for the daily pool', () => {
    expect(affirmations).toContain('var favoritePool = all.filter(function(entry) { return normalizedFavorites.indexOf(entry.id) >= 0; });');
    expect(affirmations).toContain('var pool = favoritePool.length > 0 ? favoritePool : all;');
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(affirmations).toContain('Custom statements and favorites save in this browser only; saving does not send them to or notify anyone.');
    expect(affirmations).toContain('Avoid private details if other people use this device.');
    expect(affirmations).toContain("'aria-describedby': 'learning-lab-affirmation-privacy-note'");
  });

  it('uses a named live favorite count', () => {
    expect(affirmations).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(affirmations).toContain("normalizedFavorites.length === 1 ? ' favorite.' : ' favorites.'");
  });

  it('uses a named semantic list with labeled articles', () => {
    expect(affirmations).toContain("'aria-labelledby': 'learning-lab-affirmation-library-heading'");
    expect(affirmations).toContain("hh('ul', { 'aria-label': all.length + ' affirmations'");
    expect(affirmations).toContain("return hh('li', { key: 'af-' + entry.id }");
    expect(affirmations).toContain("hh('article', { 'aria-labelledby': textId");
  });

  it('exposes favorite state through the changing label instead of aria-pressed', () => {
    expect(affirmations).not.toContain("'aria-pressed'");
    expect(affirmations).toContain("'aria-label': (favorite ? 'Remove from favorites: ' : 'Add to favorites: ') + entry.text");
    expect(affirmations).toContain("favorite ? 'Favorited' : 'Add favorite'");
  });

  it('handles malformed legacy library data without crashing', () => {
    expect(affirmations).toContain('var custom = Array.isArray(data.custom) ? data.custom : [];');
    expect(affirmations).toContain('var favorites = Array.isArray(data.favorites) ? data.favorites : [];');
    expect(source).toContain("stat: (Array.isArray((data.mytkAffirm || {}).favorites) ? (data.mytkAffirm || {}).favorites.length : 0) + ' favorites'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(affirmations).toContain('if (!pendingFocusId) return;');
    expect(affirmations).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(affirmations).not.toContain('setTimeout');
  });

  it('announces favorite changes', () => {
    expect(affirmations).toContain("llAnnounce((favorite ? 'Removed from favorites: ' : 'Added to favorites: ') + entry.text)");
  });

  it('confirms custom deletion through the accessible app dialog', () => {
    expect(affirmations).toContain("title: 'Remove this affirmation?', confirmText: 'Remove affirmation'");
    expect(affirmations).toContain('This cannot be undone.');
    expect(affirmations).not.toContain('confirm(');
  });

  it('removes associated favorites, announces deletion, and restores focus', () => {
    expect(affirmations).toContain("var nextFavorites = normalizedFavorites.filter(function(id) { return id !== entry.id; });");
    expect(affirmations).toContain("setData(Object.assign({}, data, { custom: nextCustom, favorites: nextFavorites }))");
    expect(affirmations).toContain("llAnnounce('Custom affirmation removed.')");
    expect(affirmations).toContain("focusById('learning-lab-affirmation-library-heading')");
  });

  it('names custom removal controls', () => {
    expect(affirmations).toContain("'aria-label': 'Remove custom affirmation: ' + entry.text");
    expect(affirmations).toContain("'Remove'");
  });

  it('provides 44-pixel fields and control targets', () => {
    expect(affirmations).toContain("width: '100%', minHeight: 88");
    expect(affirmations).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
