import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Friendship Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalFriendshipTracker(props) {');
  const end = source.indexOf('  // ── AAAA. PERSONAL VALUES COMPASS (Wave 16) ──', start);
  const tracker = source.slice(start, end);

  it('uses autonomy-supportive wording rather than obligation language', () => {
    expect(tracker).toContain('Remember people and the check-in rhythms you choose.');
    expect(tracker).toContain('Cadences are optional reminders you choose, not judgments or obligations.');
    expect(tracker).not.toContain('who you owe a check-in to');
    expect(tracker).not.toContain('Combat relational drift');
  });

  it('uses a named form with native submit behavior', () => {
    expect(tracker).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); add(); }");
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-friend-form-heading'");
    expect(tracker).toContain("type: 'submit'");
  });

  it('provides visible labels for every form control', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-friend-name'");
    expect(tracker).toContain("htmlFor: 'learning-lab-friend-relationship'");
    expect(tracker).toContain("htmlFor: 'learning-lab-friend-cadence'");
  });

  it('uses a named native cadence select', () => {
    expect(tracker).toContain("hh('select', { id: 'learning-lab-friend-cadence'");
    expect(tracker).toContain("hh('option', { key: cadence.id, value: cadence.id }, cadence.label)");
    expect(tracker).not.toContain("key: 'cd-'");
  });

  it('uses clear cadence labels', () => {
    expect(tracker).toContain("label: 'Every two weeks'");
    expect(tracker).toContain("label: 'Every three months'");
  });

  it('requires and bounds the person name', () => {
    expect(tracker).toContain('Person’s name (required)');
    expect(tracker).toContain('required: true, maxLength: 1000');
    expect(tracker).toContain('maxLength: 2000');
  });

  it('reports and focuses an empty name inline without alert', () => {
    expect(tracker).toContain("setNameError('Enter a name before saving.')");
    expect(tracker).toContain("id: 'learning-lab-friend-name-error', role: 'alert'");
    expect(tracker).toContain("'aria-invalid': nameError ? 'true' : undefined");
    expect(tracker).toContain("focusById('learning-lab-friend-name')");
    expect(tracker).not.toContain("alert('Need a name.')");
  });

  it('trims personal text and normalizes unknown cadences', () => {
    expect(tracker).toContain("name: name, relationship: form.relationship.trim(), cadence: cadenceFor(form.cadence).id");
    expect(tracker).toContain('return CADENCES.filter(function(cadence) { return cadence.id === id; })[0] || CADENCES[1]');
  });

  it('preserves unrelated data while adding a reminder', () => {
    expect(tracker).toContain("setData(Object.assign({}, data, { friends: [friend].concat(data.friends || []) }))");
  });

  it('announces saving and returns focus to the form', () => {
    expect(tracker).toContain("llAnnounce('Check-in reminder saved for ' + name + '.')");
    expect(tracker).toContain("setForm(emptyForm); setNameError('')");
    expect(tracker).toContain("focusById('learning-lab-friend-name')");
  });

  it('states that the tracker does not contact people', () => {
    expect(tracker).toContain('This tracker does not send messages or notify anyone.');
  });

  it('discloses sensitive local storage', () => {
    expect(tracker).toContain('Names and contact patterns save in this browser.');
    expect(tracker).toContain('Avoid private details if other people use this device.');
    expect(tracker).toContain("'aria-describedby': 'learning-lab-friend-privacy learning-lab-friend-cadence-note'");
  });

  it('always provides a named reminder section and useful empty state', () => {
    expect(tracker).toContain("hh('section', { 'aria-labelledby': 'learning-lab-friend-list-heading'");
    expect(tracker).toContain("id: 'learning-lab-friend-list-heading', tabIndex: -1");
    expect(tracker).toContain('No check-in reminders saved yet.');
  });

  it('uses a semantic list of labeled reminder articles', () => {
    expect(tracker).toContain("hh('ul', { 'aria-label': 'Saved check-in reminders'");
    expect(tracker).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(tracker).toContain("hh('h3', { id: headingId");
  });

  it('does not rely on color alone for reminder state', () => {
    expect(tracker).toContain('Check-in reminder: due based on your chosen cadence.');
    expect(tracker).toContain('Check-in reminder: within your chosen cadence.');
    expect(tracker).not.toContain('⚠ Overdue');
    expect(tracker).not.toContain('✓ On track');
  });

  it('guards due calculations for missing or invalid legacy dates', () => {
    expect(tracker).toContain("typeof since === 'number' && isFinite(since) && since >= cadence.days");
  });

  it('uses time semantics for last contact and added dates', () => {
    expect(tracker).toContain("hh('time', { dateTime: friend.lastContact || undefined }, relDate(friend.lastContact))");
    expect(tracker).toContain("hh('time', { dateTime: friend.addedAt }, relDate(friend.addedAt))");
  });

  it('updates contact while preserving unrelated data', () => {
    expect(tracker).toContain("setData(Object.assign({}, data, { friends: (data.friends || []).map");
    expect(tracker).toContain("Object.assign({}, item, { lastContact: todayISO() })");
  });

  it('names and announces contact updates and restores button focus', () => {
    expect(tracker).toContain("'aria-label': 'Mark contacted today: '");
    expect(tracker).toContain("llAnnounce('Last contact updated to today for '");
    expect(tracker).toContain("focusById('learning-lab-friend-contact-' + friend.id)");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(tracker).toContain("title: 'Remove this check-in reminder?', confirmText: 'Remove reminder'");
    expect(tracker).toContain('This cannot be undone.');
    expect(tracker).toContain("setData(Object.assign({}, data, { friends: (data.friends || []).filter");
  });

  it('provides contextual removal names, announcement, and focus recovery', () => {
    expect(tracker).toContain("'aria-label': 'Remove check-in reminder for '");
    expect(tracker).toContain("llAnnounce('Check-in reminder removed.')");
    expect(tracker).toContain("focusById('learning-lab-friend-list-heading')");
  });

  it('wraps personal text and hides decorative heading icons', () => {
    expect(tracker).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(tracker).toContain("hh('span', { 'aria-hidden': 'true' }, '🤝 ')");
  });

  it('uses responsive fields and 44-pixel controls', () => {
    expect(tracker).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(tracker).toContain("width: '100%', minHeight: 44");
    expect(tracker).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
