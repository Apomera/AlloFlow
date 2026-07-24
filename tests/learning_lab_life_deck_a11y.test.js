import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Life Deck accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLifeDeck(props) {');
  const end = source.indexOf('  function PersonalCommStyle(props) {', start);
  const deck = source.slice(start, end);

  it('frames reflection as optional and self-directed', () => {
    expect(deck).toContain('Choose an optional reflection prompt and save a response only if you want to.');
    expect(deck).toContain('Skip, stop, or choose another prompt at any time');
    expect(deck).toContain('There is no required answer, pace, insight, or emotional response.');
  });

  it('states assessment, therapy, and crisis-support boundaries', () => {
    expect(deck).toContain('Prompts are not an assessment, diagnosis, therapy, or crisis support.');
    expect(deck).toContain('If a prompt raises an immediate safety concern');
  });

  it('discloses personal browser storage', () => {
    expect(deck).toContain('Responses save in this browser and may be personal.');
    expect(deck).toContain('Avoid sensitive details on a shared device.');
  });

  it('defaults to a gentler prompt range', () => {
    expect(deck).toContain("var ms = R.useState('gentle')");
    expect(deck).toContain('Gentle prompts — selected by default');
    expect(deck).toContain("return mode === 'all' ? DECK : DECK.filter");
  });

  it('warns before enabling deeper prompt topics', () => {
    expect(deck).toContain('May include grief, fear, anger, body image, boundaries, survival, or other difficult experiences.');
    expect(deck).toContain("var DEEP_PROMPTS = [");
    expect(deck).toContain("What does my grief have to teach me?");
  });

  it('uses a native radio group for prompt range', () => {
    expect(deck).toContain("hh('fieldset'");
    expect(deck).toContain("hh('legend'");
    expect(deck).toContain("type: 'radio', name: 'learning-lab-life-deck-mode'");
    expect(deck).toContain("checked: mode === 'gentle'");
  });

  it('gives radio labels at least 44 pixels of target height', () => {
    expect(deck).toContain("minHeight: 44, color: '#f8fafc'");
    expect(deck).toContain("width: 20, height: 20");
  });

  it('draws from the selected pool and avoids the most recent prompt', () => {
    expect(deck).toContain('var pool = poolForMode()');
    expect(deck).toContain('var recent = pickedQ || (answers[0] && answers[0].question)');
    expect(deck).toContain('Math.floor(Math.random() * choices.length)');
  });

  it('announces a draw and focuses the prompt heading', () => {
    expect(deck).toContain("llAnnounce('A reflection prompt was drawn.')");
    expect(deck).toContain("focusById('learning-lab-life-deck-question-heading')");
  });

  it('uses a semantic heading and blockquote for the current prompt', () => {
    expect(deck).toContain("id: 'learning-lab-life-deck-question-heading', tabIndex: -1");
    expect(deck).toContain("hh('blockquote'");
  });

  it('uses a named native response form', () => {
    expect(deck).toContain("hh('form', { onSubmit: answer");
    expect(deck).toContain("'aria-labelledby': 'learning-lab-life-deck-response-heading'");
    expect(deck).toContain("type: 'submit'");
  });

  it('provides a visible label and instructions for the response', () => {
    expect(deck).toContain("htmlFor: 'learning-lab-life-deck-response'");
    expect(deck).toContain('Response (required to save)');
    expect(deck).toContain('Write any length up to 8,000 characters.');
  });

  it('requires and bounds a response only when saving', () => {
    expect(deck).toContain('rows: 6, required: true, maxLength: 8000');
    expect(deck).toContain('You may also draw another prompt or close this one without saving.');
  });

  it('reports and focuses empty-response validation inline', () => {
    expect(deck).toContain('Enter a response before saving, or close this prompt without saving.');
    expect(deck).toContain("id: 'learning-lab-life-deck-response-error', role: 'alert'");
    expect(deck).toContain("'aria-invalid': answerError ? 'true' : undefined");
    expect(deck).toContain("focusById('learning-lab-life-deck-response')");
  });

  it('does not use a blocking validation alert', () => {
    expect(deck).not.toContain("alert('Pick a card + answer first.')");
  });

  it('preserves unrelated data when responses change', () => {
    expect(deck).toContain("setData(Object.assign({}, data, { answers: nextAnswers }))");
    expect(deck).not.toContain("setData({ answers:");
  });

  it('announces saving and focuses the history heading', () => {
    expect(deck).toContain("llAnnounce('Reflection response saved in this browser.')");
    expect(deck).toContain("focusById('learning-lab-life-deck-history-heading')");
  });

  it('confirms before a different prompt discards entered text', () => {
    expect(deck).toContain('Discard this unsaved response and draw a different prompt?');
    expect(deck).toContain("title: 'Discard unsaved response?', confirmText: 'Discard response'");
  });

  it('confirms before closing discards entered text', () => {
    expect(deck).toContain('Discard this unsaved response and close the prompt?');
    expect(deck).toContain("if (!text.trim()) { action(); return; }");
  });

  it('announces closing and restores focus to Draw', () => {
    expect(deck).toContain("llAnnounce('Reflection prompt closed without saving.')");
    expect(deck).toContain("focusById('learning-lab-life-deck-draw')");
  });

  it('always exposes a named history section', () => {
    expect(deck).toContain("hh('section', { 'aria-labelledby': 'learning-lab-life-deck-history-heading'");
    expect(deck).toContain("id: 'learning-lab-life-deck-history-heading', tabIndex: -1");
    expect(deck).toContain('No reflection responses saved.');
  });

  it('renders all saved answers rather than silently limiting history', () => {
    expect(deck).toContain('answers.map(function(answer, index)');
    expect(deck).not.toContain('answers.slice(0, 20)');
  });

  it('uses a semantic list of labeled response articles', () => {
    expect(deck).toContain("hh('ul', { 'aria-label': 'Saved Life Deck responses'");
    expect(deck).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(deck).toContain("hh('h3', { id: headingId");
  });

  it('makes saved responses visibly labeled and editable', () => {
    expect(deck).toContain("htmlFor: fieldId");
    expect(deck).toContain("value: String(answer.answer || ''), rows: 4, maxLength: 8000");
    expect(deck).toContain('updateAnswer(answer.id, event.target.value)');
  });

  it('discloses autosave for edited history', () => {
    expect(deck).toContain('Saved responses are editable and save automatically in this browser.');
    expect(deck).toContain("'aria-describedby': 'learning-lab-life-deck-history-help'");
  });

  it('uses time semantics for saved dates', () => {
    expect(deck).toContain("hh('time', { dateTime: answer.date }, relDate(answer.date))");
  });

  it('confirms saved response removal', () => {
    expect(deck).toContain("title: 'Remove saved response?', confirmText: 'Remove response'");
    expect(deck).toContain("if (!accepted) return;");
  });

  it('names removal controls with prompt context', () => {
    expect(deck).toContain("'aria-label': 'Remove saved response to: '");
  });

  it('announces removal and restores history focus', () => {
    expect(deck).toContain("llAnnounce('Saved reflection response removed.')");
    expect(deck).toContain("focusById('learning-lab-life-deck-history-heading')");
  });

  it('wraps long prompts and answers', () => {
    expect(deck).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(deck).toContain("resize: 'vertical'");
  });

  it('uses responsive wrapping and 44-pixel controls', () => {
    expect(deck).toContain("display: 'flex', flexWrap: 'wrap'");
    expect(deck).toContain('minWidth: 44, minHeight: 44');
    expect(deck).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
