import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab optional appreciation notes accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalGratitudeLog(props) {');
  const end = source.indexOf('  function PersonalReadingTracker(props) {', start);
  const gratitude = source.slice(start, end);

  it('makes participation and item count optional without forced positivity', () => {
    expect(gratitude).toContain('Use this only when an appreciation reflection fits.');
    expect(gratitude).toContain('You may skip any day, write one item instead of three');
    expect(gratitude).toContain('Difficult feelings and experiences do not need to be minimized');
    expect(gratitude).toContain('There is no daily requirement or streak.');
  });

  it('qualifies research and removes universal efficacy claims', () => {
    expect(gratitude).toContain('mixed average results across studies and populations');
    expect(gratitude).toContain('does not promise better mood, sleep, optimism, physical health');
    expect(gratitude).not.toContain('Why this works');
    expect(gratitude).not.toContain('Emmons and McCullough');
    expect(gratitude).not.toContain('Day streak');
    expect(gratitude).not.toContain('function streak()');
  });

  it('explains sensitive-data storage, sharing, and device privacy', () => {
    expect(gratitude).toContain('Notes may contain sensitive information');
    expect(gratitude).toContain('does not itself notify a teacher, school, family member, or clinician');
    expect(gratitude).toContain('privacy procedures on managed devices or accounts');
  });

  it('uses a bounded native form with conditional errors and post-render focus', () => {
    expect(gratitude).toContain("onSubmit: save, 'aria-labelledby': 'learning-lab-gratitude-form-heading'");
    expect(gratitude).toContain('maxLength: 300');
    expect(gratitude).toContain("gratitudeError ? hh('div', { id: 'learning-lab-gratitude-error', role: 'alert'");
    expect(gratitude).toContain('var pendingFocusRef = R.useRef(null);');
    expect(gratitude).toContain('R.useLayoutEffect(function()');
    expect(gratitude).toContain("requestFocus('learning-lab-gratitude-1')");
    expect(gratitude).not.toContain('setTimeout(function()');
  });

  it('uses semantic summary, today status, complete history, and robust dates', () => {
    expect(gratitude).toContain("hh('dl'");
    expect(gratitude).toContain("role: 'status', 'aria-labelledby': 'learning-lab-gratitude-today-heading'");
    expect(gratitude).toContain("'aria-label': 'All optional appreciation entries'");
    expect(gratitude).toContain('entries.map(function(entry, index)');
    expect(gratitude).not.toContain('entries.slice(0, 30)');
    expect(gratitude).toContain("hh('time', { dateTime: safeDateTime(entry) }");
  });

  it('supports confirmed deletion of legacy entries and restores focus', () => {
    expect(gratitude).toContain('async function remove(id, legacyEntry)');
    expect(gratitude).toContain('item !== legacyEntry');
    expect(gratitude).toContain("title: 'Delete this appreciation entry?', confirmText: 'Delete entry'");
    expect(gratitude).toContain("requestFocus(removedToday || !remaining.length ? 'learning-lab-gratitude-form-heading' : 'learning-lab-gratitude-history-heading')");
  });

  it('preserves sibling data and announces neutral state changes', () => {
    expect(gratitude).toContain("setData(Object.assign({}, data, { entries:");
    expect(gratitude).not.toContain('setData({ entries:');
    expect(gratitude).toContain("llAnnounce('Optional appreciation entry saved with '");
    expect(gratitude).toContain("llAnnounce('Optional appreciation entry deleted.')");
  });

  it('removes coercive cross-tool prompts and updates catalog copy', () => {
    expect(source).not.toContain('No gratitude log yet. One to three items can be completed in about a minute.');
    expect(source).not.toContain('strongest single positive-psychology intervention');
    expect(source).toContain('Optional appreciation notes with privacy and non-treatment guidance');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
