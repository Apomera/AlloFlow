import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Accommodation Request Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAccomRequest(props) {');
  const end = source.indexOf('  function PersonalLifeDeck(props) {', start);
  const builder = source.slice(start, end);

  it('frames the tool as a drafting aid rather than a legal determination', () => {
    expect(builder).toContain('A drafting aid, not a legal determination');
    expect(builder).toContain('This is a writing aid, not legal advice or an eligibility decision.');
    expect(builder).toContain('does not establish rights, approve support, replace an evaluation, or guarantee an outcome');
  });

  it('does not rank self-advocacy or assign it to one person', () => {
    expect(builder).not.toContain('Self-advocacy is the most important transition skill');
    expect(builder).not.toContain('your parents + IEP team advocate FOR you');
    expect(builder).not.toContain('In college + work, YOU do');
  });

  it('avoids inaccurate categorical descriptions of Section 504', () => {
    expect(builder).toContain('Eligibility and supports require an individualized school process.');
    expect(builder).not.toContain("504 plans are for students who don't qualify for an IEP");
  });

  it('avoids categorical workplace and college documentation claims', () => {
    expect(builder).toContain('Employer procedures and legal coverage vary.');
    expect(builder).not.toContain('ADA-protected workplace accommodation');
    expect(builder).not.toContain('they need documentation');
  });

  it('explains that procedures and terminology vary by context', () => {
    expect(builder).toContain('Eligibility, documentation, procedures, terminology, and available supports vary');
    expect(builder).toContain('State, local, institutional, and employer procedures may also apply.');
  });

  it('discloses that the tool never sends or assesses requests', () => {
    expect(builder).toContain('This tool does not send requests, contact anyone, assess eligibility, or provide legal advice.');
    expect(builder).toContain('This tool does not send messages.');
  });

  it('warns about sensitive local draft storage', () => {
    expect(builder).toContain('Drafts save in this browser and may contain disability, health, school, or employment information.');
    expect(builder).toContain('Avoid sensitive details on a shared device.');
  });

  it('links to current official education and employment starting points', () => {
    expect(builder).toContain('https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination/frequently-asked-questions-disability-discrimination');
    expect(builder).toContain('disability-discrimination-academic-adjustments-postsecondary-students');
    expect(builder).toContain('https://www.eeoc.gov/laws/guidance/enforcement-guidance-reasonable-accommodation-and-undue-hardship-under-ada');
  });

  it('identifies and secures external links', () => {
    expect(builder).toContain("target: '_blank', rel: 'noopener noreferrer'");
    expect(builder).toContain('(opens in a new tab)');
    expect(builder).toContain("minHeight: 44, alignItems: 'center'");
  });

  it('declares all editor state hooks before conditional rendering', () => {
    expect(builder).toContain("var es = R.useState({ request: '' });");
    expect(builder).toContain('var ps = R.useState(null);');
    expect(builder).toContain('var cs = R.useState(null);');
    expect(builder.indexOf('var cs = R.useState')).toBeLessThan(builder.indexOf('if (activeType)'));
  });

  it('offers five accurately named drafting contexts', () => {
    expect(builder).toContain("label: 'IEP team discussion'");
    expect(builder).toContain("label: 'K–12 Section 504 discussion'");
    expect(builder).toContain("label: 'Teacher or school contact'");
    expect(builder).toContain("label: 'College accessibility office'");
    expect(builder).toContain("label: 'Workplace accommodation discussion'");
  });

  it('renders contexts as a named semantic list of buttons', () => {
    expect(builder).toContain("'aria-labelledby': 'learning-lab-accom-template-heading'");
    expect(builder).toContain("hh('ul', { 'aria-label': 'Accommodation request drafting contexts'");
    expect(builder).toContain("id: 'learning-lab-accom-template-' + template.id, type: 'button'");
    expect(builder).toContain("'aria-describedby': descId");
  });

  it('opens a context with an announcement and heading focus', () => {
    expect(builder).toContain("llAnnounce('Opened ' + template.label + ' drafting form.')");
    expect(builder).toContain("focusById('learning-lab-accom-editor-heading')");
  });

  it('handles an unavailable template without mutating state during render', () => {
    expect(builder).toContain('This template could not be found');
    expect(builder).not.toContain("if (!t) { setActiveType(null); return null; }");
  });

  it('uses a named native editor form', () => {
    expect(builder).toContain("hh('form', { onSubmit: function(event) { save(activeTemplate, event); }");
    expect(builder).toContain("'aria-labelledby': 'learning-lab-accom-fields-heading'");
    expect(builder).toContain("type: 'submit'");
  });

  it('provides visible labels for recipient and sign-off inputs', () => {
    expect(builder).toContain("htmlFor: 'learning-lab-accom-to'");
    expect(builder).toContain("htmlFor: 'learning-lab-accom-name'");
    expect(builder).toContain('Recipient or team (optional)');
  });

  it('bounds recipient and sign-off inputs', () => {
    expect(builder).toContain("id: 'learning-lab-accom-to', type: 'text', value: form.to, maxLength: 1000");
    expect(builder).toContain("id: 'learning-lab-accom-name', type: 'text', value: form.myName, maxLength: 1000");
  });

  it('associates every detail label and help text with its textarea', () => {
    expect(builder).toContain("htmlFor: fieldId");
    expect(builder).toContain("id: helpId");
    expect(builder).toContain("'aria-describedby': helpId + (invalid ? ' ' + errorId : '') + ' learning-lab-accom-privacy-help'");
  });

  it('uses functional-impact language instead of requiring a diagnosis', () => {
    expect(builder).toContain('Effect on access, participation, learning, or work (optional)');
    expect(builder).toContain('Describe the functional effect that is relevant to the request.');
    expect(builder).not.toContain('connect to your disability or diagnosis');
  });

  it('requires only the requested change or support', () => {
    expect(builder).toContain('Change or support I want to discuss (required)');
    expect(builder).toContain("required: field.id === 'request'");
    expect(builder).toContain('maxLength: 6000');
  });

  it('reports and focuses a missing required request inline', () => {
    expect(builder).toContain("request: 'Describe the change or support you want to discuss.'");
    expect(builder).toContain("'aria-invalid': invalid ? 'true' : undefined");
    expect(builder).toContain("id: errorId, role: 'alert'");
    expect(builder).toContain("focusById('learning-lab-accom-request')");
  });

  it('preserves unrelated builder data whenever drafts change', () => {
    expect(builder).toContain("setData(Object.assign({}, data, { drafts: nextDrafts }))");
    expect(builder).not.toContain("setData({ drafts:");
  });

  it('generates plain-language context-specific openings', () => {
    expect(builder).toContain('ask the IEP team to discuss a possible change');
    expect(builder).toContain('ask the school to discuss whether a Section 504 evaluation, plan, or plan change may be appropriate');
    expect(builder).toContain('ask about your process for requesting disability-related academic adjustments, auxiliary aids, or other support');
    expect(builder).toContain('I need a change at work because of a disability-related limitation or medical condition');
  });

  it('asks for the next process step instead of promising approval', () => {
    expect(builder).toContain('Please let me know the next step in your process and whether you need other information.');
    expect(builder).toContain('I would welcome a discussion about effective options.');
  });

  it('provides a visible label and instructions for the editable preview', () => {
    expect(builder).toContain('Review and edit the generated draft');
    expect(builder).toContain("htmlFor: 'learning-lab-accom-preview'");
    expect(builder).toContain('Review every placeholder and statement before copying, saving, or sharing.');
  });

  it('makes the generated preview directly editable and bounded', () => {
    expect(builder).toContain("id: 'learning-lab-accom-preview', value: previewBody, rows: 16, maxLength: 30000");
    expect(builder).toContain('setPreviewOverride(event.target.value)');
    expect(builder).not.toContain("hh('div', { style: { padding: 14, borderRadius: 10");
  });

  it('does not silently discard direct preview edits when a source field changes', () => {
    const setFieldStart = builder.indexOf('function setField(id, value)');
    const setFieldEnd = builder.indexOf('function hasFormContent()', setFieldStart);
    const setField = builder.slice(setFieldStart, setFieldEnd);
    expect(setField).not.toContain('setPreviewOverride(null)');
  });

  it('requires confirmation before discarding a nonempty unsaved draft', () => {
    expect(builder).toContain("title: 'Discard unsaved draft?', confirmText: 'Discard draft'");
    expect(builder).toContain("if (!hasFormContent()) { finish(); return; }");
    expect(builder).toContain("if (accepted) finish()");
  });

  it('returns focus to the originating context after closing', () => {
    expect(builder).toContain("focusById('learning-lab-accom-template-' + template.id)");
    expect(builder).toContain("llAnnounce('Drafting form closed without saving.')");
  });

  it('saves the reviewed preview text rather than regenerating it', () => {
    expect(builder).toContain('var body = currentBody(template).trim()');
    expect(builder).toContain('body: body');
  });

  it('announces saved drafts and focuses the saved section', () => {
    expect(builder).toContain("llAnnounce('Accommodation request draft saved in this browser.')");
    expect(builder).toContain("focusById('learning-lab-accom-saved-heading')");
  });

  it('uses asynchronous clipboard handling with a manual-copy fallback', () => {
    expect(builder).toContain("typeof navigator === 'undefined' || !navigator.clipboard");
    expect(builder).toContain('Promise.resolve(navigator.clipboard.writeText(body))');
    expect(builder).toContain('The draft text is selected for manual copying.');
    expect(builder).toContain('focusById(textId, true)');
  });

  it('reports copy outcomes inline without blocking alerts', () => {
    expect(builder).toContain("role: 'status', 'aria-live': 'polite'");
    expect(builder).toContain('Draft copied. Review it before sharing.');
    expect(builder).not.toContain("alert('Copied");
    expect(builder).not.toContain('catch (e) {}');
  });

  it('always exposes a named saved-drafts section', () => {
    expect(builder).toContain("hh('section', { 'aria-labelledby': 'learning-lab-accom-saved-heading'");
    expect(builder).toContain("id: 'learning-lab-accom-saved-heading', tabIndex: -1");
    expect(builder).toContain('No accommodation request drafts saved.');
  });

  it('renders every saved draft as a semantic list article', () => {
    expect(builder).toContain("hh('ul', { 'aria-label': 'Saved accommodation request drafts'");
    expect(builder).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(builder).toContain("hh('h3', { id: headingId");
  });

  it('shows complete saved drafts in labeled selectable controls', () => {
    expect(builder).toContain("htmlFor: textId");
    expect(builder).toContain("value: String(draft.body || ''), readOnly: true, rows: 8");
    expect(builder).not.toContain('d.body.substring(0, 200)');
  });

  it('uses time semantics for saved dates', () => {
    expect(builder).toContain("hh('time', { dateTime: draft.date }, relDate(draft.date))");
  });

  it('gives saved-draft copy and removal controls contextual names', () => {
    expect(builder).toContain("'aria-label': 'Copy saved ' + template.label + ' draft'");
    expect(builder).toContain("'aria-label': 'Remove saved ' + template.label + ' draft'");
  });

  it('confirms saved-draft removal before changing data', () => {
    expect(builder).toContain("title: 'Remove saved draft?', confirmText: 'Remove draft'");
    expect(builder).toContain('if (!accepted) return;');
    expect(builder).toContain("llAnnounce('Saved accommodation request draft removed.')");
  });

  it('uses responsive layouts and 44-pixel controls', () => {
    expect(builder).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(builder).toContain('minWidth: 44, minHeight: 44');
    expect(builder).toContain("width: '100%', minHeight: 44");
  });

  it('wraps long draft text without clipping it from access', () => {
    expect(builder).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(builder).not.toContain('maxHeight: 60, overflow: \'hidden\'');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
