import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Focus Audio accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalFocusPlaylist(props) {');
  const end = source.indexOf('  function PersonalWorryTime(props) {', start);
  const audio = source.slice(start, end);

  it('uses a named semantic list for audio conditions', () => {
    expect(audio).toContain("hh('ul', { 'aria-label': 'Focus audio conditions'");
    expect(audio).toContain("return hh('li', { key: 'pl-' + playlist.id");
  });

  it('uses labeled articles with semantic headings', () => {
    expect(audio).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(audio).toContain("hh('h3', { id: headingId");
    expect(audio).toContain("id: descriptionId");
  });

  it('hides decorative playlist icons', () => {
    expect(audio).toContain("hh('div', { 'aria-hidden': 'true'");
  });

  it('uses native fieldsets and legends for each rating group', () => {
    expect(audio).toContain("hh('fieldset', { 'aria-describedby': descriptionId + ' ' + statusId + ' learning-lab-focus-audio-help'");
    expect(audio).toContain("hh('legend'");
    expect(audio).toContain("'How helpful is ' + playlist.label + '?'");
  });

  it('uses native radio controls instead of identical star buttons', () => {
    expect(audio).toContain("type: 'radio'");
    expect(audio).toContain("name: 'learning-lab-focus-audio-' + playlist.id");
    expect(audio).toContain("checked: selected");
    expect(audio).not.toContain("}, '⭐')");
  });

  it('associates every radio with a visible label', () => {
    expect(audio).toContain("var optionId = 'learning-lab-focus-audio-' + playlist.id + '-rating-' + value");
    expect(audio).toContain("htmlFor: optionId");
    expect(audio).toContain("id: optionId, type: 'radio'");
  });

  it('provides an explicit not-rated option alongside ratings one through five', () => {
    expect(audio).toContain('var ratingValues = [0, 1, 2, 3, 4, 5]');
    expect(audio).toContain("value === 0 ? 'Not rated'");
    expect(audio).toContain("value + (value === 1 ? ' star' : ' stars')");
  });

  it('communicates current rating as visible text', () => {
    expect(audio).toContain("rating ? 'Current rating: ' + rating + ' out of 5.' : 'Current rating: Not rated.'");
    expect(audio).toContain("id: statusId");
  });

  it('does not rely on color alone for selected state', () => {
    expect(audio).toContain("border: selected ? '2px solid #ddd6fe'");
    expect(audio).toContain("checked: selected");
    expect(audio).toContain("Current rating:");
  });

  it('announces rating and cleared states', () => {
    expect(audio).toContain("playlist.label + ' rated ' + value + ' out of 5.'");
    expect(audio).toContain("playlist.label + ' rating cleared.'");
  });

  it('preserves unrelated section data when ratings change', () => {
    expect(audio).toContain("setData(Object.assign({}, data, { ratings: Object.assign({}, data.ratings || {}, patch) }))");
    expect(audio).not.toContain('setData({ ratings:');
  });

  it('provides a single overall rating instruction', () => {
    expect(audio).toContain("id: 'learning-lab-focus-audio-help'");
    expect(audio).toContain('Rate each condition from 1 (not helpful) to 5 (very helpful), or choose Not rated.');
  });

  it('uses lighter text colors for small headings', () => {
    for (const color of ['#ddd6fe', '#fde68a', '#bfdbfe', '#a7f3d0', '#a5f3fc', '#fed7aa', '#e2e8f0']) {
      expect(audio).toContain(`textColor: '${color}'`);
    }
  });

  it('removes unsupported universal audio claims', () => {
    expect(audio).toContain('Audio preferences can change with the person, task, environment, and day.');
    expect(audio).toContain('rather than treating any category as universally best');
    expect(audio).not.toContain('Research-favored for study');
    expect(audio).not.toContain('helps many ADHD students');
    expect(audio).not.toContain('matching audio to task does help');
  });

  it('labels the comparison guidance as a complementary region', () => {
    expect(audio).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-focus-audio-note-heading'");
    expect(audio).toContain("id: 'learning-lab-focus-audio-note-heading'");
  });

  it('provides 44-pixel rating targets', () => {
    expect(audio).toContain("minHeight: 44, padding: '5px 4px'");
    expect(audio).toContain("width: 18, height: 18");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
