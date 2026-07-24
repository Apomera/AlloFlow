import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Life Skills and Supports accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLifeSkills(props) {');
  const end = source.indexOf('  function PersonalEthical(props) {', start);
  const skills = source.slice(start, end);

  it('frames examples as optional rather than universal adulthood requirements', () => {
    expect(skills).toContain("'Life Skills and Supports'");
    expect(skills).toContain("'Examples, not requirements'");
    expect(skills).toContain('Skip anything unsafe, inaccessible, unavailable, irrelevant, or not part of your goals.');
    expect(skills).not.toContain('Practical adult skills students rarely get direct instruction in');
  });

  it('recognizes supported and preferred ways of doing tasks', () => {
    expect(skills).toContain('have a support plan');
    expect(skills).toContain('Independence is not the only valid outcome.');
  });

  it('provides safer inclusive display labels while preserving legacy storage keys', () => {
    expect(skills).toContain("'Use an oven safely, with support if preferred'");
    expect(skills).toContain("'Contact a health office using a preferred communication method'");
    expect(skills).toContain("'Plan a longer trip with preferred support'");
    expect(skills).toContain('function skillLabel(item)');
  });

  it('uses native labeled checkboxes instead of custom toggle buttons', () => {
    expect(skills).toContain('htmlFor: inputId');
    expect(skills).toContain("type: 'checkbox', checked: checked");
    expect(skills).toContain('event.target.checked');
    expect(skills).not.toContain("return hh('button', { key: 'sk-'");
  });

  it('uses complete textual checked and unchecked states', () => {
    expect(skills).toContain("'Tracked '");
    expect(skills).toContain("'Not tracked'");
  });

  it('preserves unrelated data when changing a selection', () => {
    expect(skills).toContain("var nextSkills = Object.assign({}, data.skills || {})");
    expect(skills).toContain("setData(Object.assign({}, data, { skills: nextSkills }))");
  });

  it('announces both selecting and clearing a skill', () => {
    expect(skills).toContain("llAnnounce((checked ? 'Added to tracked skills: ' : 'Removed from tracked skills: ')");
  });

  it('counts only known checklist keys', () => {
    expect(skills).toContain('function knownKeys()');
    expect(skills).toContain('allKeys.filter(function(key) { return !!skills[key]; }).length');
    expect(skills).not.toContain('Object.keys(skills).length');
  });

  it('provides a textual status and named native progress element', () => {
    expect(skills).toContain("role: 'status'");
    expect(skills).toContain("hh('progress', { value: doneSkills, max: totalSkills");
    expect(skills).toContain("'aria-label': 'Tracked Life Skills and Supports examples'");
  });

  it('uses semantic category sections and headings', () => {
    expect(skills).toContain("return hh('section', { key: categoryKey, 'aria-labelledby': headingId");
    expect(skills).toContain("hh('h2', { id: headingId");
    expect(skills).toContain("selectedCount + ' of ' + category.items.length");
  });

  it('uses named semantic lists for every category', () => {
    expect(skills).toContain("hh('ul', { 'aria-label': category.label + ' examples'");
    expect(skills).toContain("return hh('li', { key: key }");
  });

  it('uses machine-readable completion dates', () => {
    expect(skills).toContain("hh('time', { dateTime: skills[key] || undefined }, relDate(skills[key]))");
  });

  it('does not rely on color alone for tracked status', () => {
    expect(skills).toContain("checked ? hh('span'");
    expect(skills).toContain("'Tracked '");
    expect(skills).toContain("'Not tracked'");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(skills).toContain('Selections and dates save in this browser.');
    expect(skills).toContain('other people who use this device.');
  });

  it('uses responsive 44-pixel checkbox targets', () => {
    expect(skills).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(skills).toContain("width: '100%', minHeight: 44, height: '100%'");
    expect(skills).toContain("width: 22, height: 22");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
