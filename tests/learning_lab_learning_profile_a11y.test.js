import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Learning Profile revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLearningProfile(props) {');
  const end = source.indexOf('  function PersonalReflectionPrompts(props) {', start);
  const profile = source.slice(start, end);

  it('uses stable named sections and effect-based focus restoration', () => {
    for (const id of ['learning-lab-profile-heading', 'learning-lab-profile-fields-heading', 'learning-lab-profile-sharing-heading']) expect(profile).toContain("'" + id + "'");
    expect(profile).toContain('document.getElementById(focusTarget)');
  });

  it('discloses local autosave, optional fields, privacy, and sharing choice', () => {
    expect(profile).toContain('All fields are optional and save automatically in this browser.');
    expect(profile).toContain('avoid names, disability information, health details');
    expect(profile).toContain('You decide whether to print or share any part of this profile.');
  });

  it('preserves sibling state on every autosaved field update', () => {
    expect(profile).toContain("setData(Object.assign({}, data, { profile: Object.assign({}, profile, patch) }))");
    expect(profile).not.toContain('setData({ profile:');
  });

  it('associates every field with a label and help text and hides decorative icons', () => {
    expect(profile).toContain("htmlFor: 'learning-lab-profile-' + field.id");
    expect(profile).toContain("id: 'learning-lab-profile-help-' + field.id");
    expect(profile).toContain("'aria-describedby': 'learning-lab-profile-help-' + field.id");
    expect(profile).toContain("hh('span', { 'aria-hidden': 'true' }, field.icon + ' ')");
  });

  it('bounds sensitive fields and prevents browser autofill', () => {
    expect(profile).toContain("maxLength: field.type === 'input' ? 240 : 4000");
    expect(profile).toContain("autoComplete: 'off'");
    expect(profile).toContain("minHeight: 44");
    expect(profile).toContain("minHeight: 88");
  });

  it('uses neutral, optional field language rather than deficit framing', () => {
    expect(profile).toContain('Times when focusing may feel harder');
    expect(profile).toContain('Conditions that may make learning harder');
    expect(profile).toContain('People or roles I may choose to ask for support');
    expect(profile).not.toContain("label: 'My hardest time of day'");
    expect(profile).not.toContain("label: 'Adults who get me'");
  });

  it('provides print success status, failure alert, and announcements', () => {
    expect(profile).toContain("role: printError ? 'alert' : 'status'");
    expect(profile).toContain('Print dialog requested. Review the destination and included information');
    expect(profile).toContain("llAnnounce('Print dialog requested. Review the profile before sharing it.')");
    expect(profile).toContain("llAnnounce('The print dialog could not open.')");
  });

  it('provides an accessible clear-data confirmation and focus restoration', () => {
    expect(profile).toContain("title: 'Clear this learning profile?', confirmText: 'Clear profile'");
    expect(profile).toContain("setData(Object.assign({}, data, { profile: {} }))");
    expect(profile).toContain("setFocusTarget('learning-lab-profile-name')");
    expect(profile).toContain("llAnnounce('Learning profile cleared.')");
  });

  it('uses consent-based sharing language without directing disclosure', () => {
    expect(profile).toContain('Review before sharing');
    expect(profile).toContain('remove anything you do not want included');
    expect(profile).toContain('not an assessment or a requirement to disclose a diagnosis');
    expect(profile).not.toContain('hand a copy to teachers or your IEP team');
  });

  it('updates the catalog description to reflect privacy and control', () => {
    expect(source).toContain('Optional private learning-preference summary you control and may print.');
    expect(source).not.toContain('printable for teachers / IEP.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
