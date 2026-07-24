import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Sensory Preferences accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSensoryProfile(props) {');
  const end = source.indexOf('  function PersonalNDJournal(props) {', start);
  const sensory = source.slice(start, end);

  it('uses neutral non-diagnostic framing', () => {
    expect(sensory).toContain("'Personal notes, not a diagnosis'");
    expect(sensory).toContain('does not assess or diagnose a condition');
    expect(sensory).not.toContain("your nervous system isn't broken");
  });

  it('uses a named explicit form for preference saving', () => {
    expect(sensory).toContain("onSubmit: function(event) { event.preventDefault(); saveProfile(); }");
    expect(sensory).toContain("'aria-labelledby': 'learning-lab-sensory-profile-heading'");
    expect(sensory).toContain("}, 'Save preference notes')");
  });

  it('associates every preference textarea with visible label and help', () => {
    expect(sensory).toContain("htmlFor: inputId");
    expect(sensory).toContain("'aria-describedby': helpId");
    expect(sensory).toContain("hh('p', { id: helpId");
    expect(sensory).toContain("rows: 3, maxLength: 3000");
  });

  it('marks preference icons decorative while retaining text labels', () => {
    expect(sensory).toContain("hh('span', { 'aria-hidden': 'true' }, dimension.icon + ' ')");
    expect(sensory).toContain("dimension.label + ' (optional)'");
  });

  it('saves normalized preferences while preserving data and unknown profile fields', () => {
    expect(sensory).toContain("normalized[dimension.id] = String(draft[dimension.id] || '').trim()");
    expect(sensory).toContain("setData(Object.assign({}, data, { profile: Object.assign({}, data.profile || {}, normalized) }))");
  });

  it('announces preference saving and restores heading focus', () => {
    expect(sensory).toContain("llAnnounce('Sensory preferences saved in this browser.')");
    expect(sensory).toContain("focusById('learning-lab-sensory-profile-heading')");
  });

  it('uses a named observation form and visible required label', () => {
    expect(sensory).toContain("onSubmit: function(event) { event.preventDefault(); addObservation(); }");
    expect(sensory).toContain("htmlFor: 'learning-lab-sensory-observation'");
    expect(sensory).toContain("'Observation (required)'");
    expect(sensory).toContain("required: true, maxLength: 3000");
  });

  it('reports and focuses an empty observation inline', () => {
    expect(sensory).toContain("setObservationError('Enter an observation before saving it.')");
    expect(sensory).toContain("id: 'learning-lab-sensory-observation-error', role: 'alert'");
    expect(sensory).toContain("'aria-invalid': observationError ? 'true' : undefined");
    expect(sensory).toContain("focusById('learning-lab-sensory-observation')");
  });

  it('preserves unrelated data when saving observations', () => {
    expect(sensory).toContain("setData(Object.assign({}, data, { observations: [entry].concat(data.observations || []) }))");
    expect(sensory).toContain("llAnnounce('Sensory observation saved.')");
  });

  it('uses a named semantic observation list with labeled articles', () => {
    expect(sensory).toContain("'aria-labelledby': 'learning-lab-sensory-observations-heading'");
    expect(sensory).toContain("hh('ul', { 'aria-label': 'Most recent sensory observations'");
    expect(sensory).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(sensory).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics and preserves observation whitespace', () => {
    expect(sensory).toContain("hh('time', { dateTime: entry.date || undefined }, relDate(entry.date))");
    expect(sensory).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms observation removal and preserves unrelated data', () => {
    expect(sensory).toContain("title: 'Remove this observation?', confirmText: 'Remove observation'");
    expect(sensory).toContain('This cannot be undone.');
    expect(sensory).toContain("setData(Object.assign({}, data, { observations: (data.observations || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(sensory).toContain("'aria-label': 'Remove sensory observation: '");
    expect(sensory).toContain("llAnnounce('Sensory observation removed.')");
    expect(sensory).toContain("focusById('learning-lab-sensory-observations-heading')");
  });

  it('discloses browser storage and shared-device privacy', () => {
    expect(sensory).toContain('Preferences and observations save in this browser.');
    expect(sensory).toContain('if other people use this device.');
    expect(sensory).toContain("'aria-describedby': 'learning-lab-sensory-privacy-note'");
  });

  it('uses responsive grids and 44-pixel controls', () => {
    expect(sensory).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");
    expect(sensory).toContain("width: '100%', minHeight: 44");
    expect(sensory).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
