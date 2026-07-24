import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Confidence Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalConfidence(props) {');
  const end = source.indexOf('  // ── FFFF. PERSONAL HOPE LIBRARY (Wave 17) ──', start);
  const confidence = source.slice(start, end);

  it('uses inclusive language for varied experiences of confidence', () => {
    expect(confidence).toContain('Record moments of confidence, comfort, self-trust, or capability.');
    expect(confidence).toContain('Having few or no entries does not mean confidence is absent.');
  });

  it('frames entries as observations rather than an assessment', () => {
    expect(confidence).toContain('Personal observations, not an assessment');
    expect(confidence).toContain('do not measure your worth, prove what caused a feeling, diagnose a condition, or guarantee a future outcome');
    expect(confidence).not.toContain('most powerful predictor');
    expect(confidence).not.toContain('the pattern becomes a blueprint');
  });

  it('uses a named form with native submit behavior', () => {
    expect(confidence).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(confidence).toContain("'aria-labelledby': 'learning-lab-confidence-form-heading'");
    expect(confidence).toContain("type: 'submit'");
  });

  it('gives every field a stable visible label', () => {
    expect(confidence).toContain("var inputId = 'learning-lab-confidence-' + field.id");
    expect(confidence).toContain("hh('label', { htmlFor: inputId");
    expect(confidence).toContain("hh('textarea', { id: inputId");
  });

  it('associates helpful instructions with every field', () => {
    expect(confidence).toContain("var helpId = inputId + '-help'");
    expect(confidence).toContain("hh('p', { id: helpId");
    expect(confidence).toContain("'aria-describedby': helpId +");
  });

  it('marks only the core description as required', () => {
    expect(confidence).toContain("required: isRequired");
    expect(confidence).toContain("var isRequired = field.id === 'what'");
    expect(confidence).toContain('What happened? (required)');
    expect(confidence).toContain('When did you notice it? (optional)');
  });

  it('bounds all multiline responses', () => {
    expect(confidence).toContain('maxLength: 4000');
    expect(confidence).toContain("resize: 'vertical'");
  });

  it('reports and focuses a missing description inline without alert', () => {
    expect(confidence).toContain("setWhatError('Describe a moment before saving.')");
    expect(confidence).toContain("id: 'learning-lab-confidence-what-error', role: 'alert'");
    expect(confidence).toContain("'aria-invalid': isRequired && whatError ? 'true' : undefined");
    expect(confidence).toContain("focusById('learning-lab-confidence-what')");
    expect(confidence).not.toContain("alert('Need a brief description.')");
  });

  it('trims every response before saving', () => {
    expect(confidence).toContain('what: what, when: form.when.trim(), what_did_it: form.what_did_it.trim(), strength_showed: form.strength_showed.trim()');
  });

  it('preserves unrelated data when adding a reflection', () => {
    expect(confidence).toContain("setData(Object.assign({}, data, { moments: [moment].concat(data.moments || []) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(confidence).toContain("llAnnounce('Confidence reflection saved in this browser.')");
    expect(confidence).toContain("setForm(emptyForm); setWhatError('')");
    expect(confidence).toContain("focusById('learning-lab-confidence-what')");
  });

  it('discloses sensitive local storage', () => {
    expect(confidence).toContain('Reflections save in this browser and may contain sensitive information.');
    expect(confidence).toContain('Avoid names or private details if other people use this device.');
    expect(confidence).toContain("'aria-describedby': 'learning-lab-confidence-privacy'");
  });

  it('always provides a named history and useful empty state', () => {
    expect(confidence).toContain("hh('section', { 'aria-labelledby': 'learning-lab-confidence-history-heading'");
    expect(confidence).toContain("id: 'learning-lab-confidence-history-heading', tabIndex: -1");
    expect(confidence).toContain('No confidence reflections saved yet.');
  });

  it('uses a semantic newest-first list without hiding older records', () => {
    expect(confidence).toContain("hh('ul', { 'aria-label': 'Saved confidence reflections, newest first'");
    expect(confidence).toContain('moments.map(function(moment)');
    expect(confidence).not.toContain('moments.slice(0, 15)');
  });

  it('uses labeled articles and headings for saved reflections', () => {
    expect(confidence).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(confidence).toContain("hh('h3', { id: headingId");
  });

  it('hides decorative heading icons from assistive technology', () => {
    expect(confidence).toContain("hh('span', { 'aria-hidden': 'true' }, '💪 ')");
  });

  it('uses time semantics for saved dates', () => {
    expect(confidence).toContain("hh('time', { dateTime: moment.date || undefined }, relDate(moment.date))");
  });

  it('makes every nonempty optional response available', () => {
    expect(confidence).toContain('function detailsFor(moment)');
    expect(confidence).toContain("'aria-label': 'Confidence reflection details'");
    expect(confidence).toContain("hh('dt'");
    expect(confidence).toContain("hh('dd'");
  });

  it('provides explicit text when no optional details exist', () => {
    expect(confidence).toContain('No optional details were added.');
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(confidence).toContain("title: 'Remove this confidence reflection?', confirmText: 'Remove reflection'");
    expect(confidence).toContain('This cannot be undone.');
    expect(confidence).toContain("setData(Object.assign({}, data, { moments: (data.moments || []).filter");
  });

  it('names removal, announces it, and restores history focus', () => {
    expect(confidence).toContain("'aria-label': 'Remove confidence reflection: '");
    expect(confidence).toContain("llAnnounce('Saved confidence reflection removed.')");
    expect(confidence).toContain("focusById('learning-lab-confidence-history-heading')");
  });

  it('wraps long content and uses 44-pixel controls', () => {
    expect(confidence).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(confidence).toContain("width: '100%', minHeight: 76");
    expect(confidence).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
