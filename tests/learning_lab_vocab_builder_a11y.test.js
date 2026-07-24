import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Vocabulary Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalVocabBuilder(props) {');
  const end = source.indexOf('  function PersonalMemoryPalace(props) {', start);
  const vocab = source.slice(start, end);

  it('uses a named list-creation form with native submit behavior', () => {
    expect(vocab).toContain("onSubmit: function(event) { event.preventDefault(); createList(); }");
    expect(vocab).toContain("'aria-labelledby': 'learning-lab-vocab-new-heading'");
    expect(vocab).toContain("hh('button', { type: 'submit'");
  });

  it('labels and validates the required list name', () => {
    expect(vocab).toContain("htmlFor: 'learning-lab-vocab-new-list'");
    expect(vocab).toContain("id: 'learning-lab-vocab-new-list', type: 'text'");
    expect(vocab).toContain("setListError('Enter a name for the vocabulary list.')");
    expect(vocab).toContain("id: 'learning-lab-vocab-list-error', role: 'alert'");
    expect(vocab).toContain("focusById('learning-lab-vocab-new-list')");
  });

  it('uses a named add-word form with labeled fields', () => {
    expect(vocab).toContain("onSubmit: function(event) { event.preventDefault(); addWord(); }");
    expect(vocab).toContain("'aria-labelledby': 'learning-lab-vocab-add-heading'");
    for (const field of ['word', 'definition', 'sentence']) {
      expect(vocab).toContain(`htmlFor: 'learning-lab-vocab-${field}'`);
      expect(vocab).toContain(`id: 'learning-lab-vocab-${field}'`);
    }
  });

  it('requires and reports word and definition errors independently', () => {
    expect(vocab).toContain("word: form.word.trim() ? '' : 'Enter a vocabulary word.'");
    expect(vocab).toContain("definition: form.definition.trim() ? '' : 'Enter a definition.'");
    expect(vocab).toContain("id: 'learning-lab-vocab-word-error', role: 'alert'");
    expect(vocab).toContain("id: 'learning-lab-vocab-definition-error', role: 'alert'");
    expect(vocab).toContain("focusById(nextErrors.word ? 'learning-lab-vocab-word' : 'learning-lab-vocab-definition')");
    expect(vocab).not.toContain('alert(');
  });

  it('preserves unrelated section data for create, update, and deletion', () => {
    expect(vocab).toContain("setData(Object.assign({}, data, { lists: [list].concat(rawLists) }))");
    expect(vocab).toContain("setData(Object.assign({}, data, {");
    expect(vocab).toContain("setData(Object.assign({}, data, { lists: rawLists.filter");
  });

  it('handles malformed legacy vocabulary data without crashing', () => {
    expect(vocab).toContain('var rawLists = Array.isArray(data.lists) ? data.lists : [];');
    expect(vocab).toContain("function wordsOf(list) { return (list && Array.isArray(list.words) ? list.words : []).filter(isRecord); }");
    expect(vocab).toContain('var listedLists = rawLists.filter(isRecord);');
    expect(vocab).toContain("textValue(list.name).trim() || 'Untitled list'");
    expect(vocab).toContain("textValue(word.word).trim() || 'Untitled word'");
    expect(source).toContain("stat: (Array.isArray((data.mytkVocab || {}).lists) ? (data.mytkVocab || {}).lists.length : 0) + ' lists'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(vocab).toContain('if (!pendingFocusId) return;');
    expect(vocab).toContain('var target = document.getElementById(pendingFocusId);');
    expect(vocab).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(vocab).not.toContain('setTimeout');
  });

  it('explains local-only saving and frames self-ratings as non-grades', () => {
    expect(vocab).toContain('saved only in your Personal Toolkit and are not shared with or sent to anyone');
    expect(vocab).toContain('Quiz scores and mastery stars are self-ratings to guide your own practice, not grades.');
  });

  it('confirms list and word deletion in app dialogs', () => {
    expect(vocab).toContain("title: 'Delete this vocabulary list?', confirmText: 'Delete list'");
    expect(vocab).toContain("title: 'Delete this vocabulary word?', confirmText: 'Delete word'");
    expect(vocab).not.toContain('confirm(');
  });

  it('uses separate open and delete controls instead of nested interaction', () => {
    expect(vocab).toContain("'aria-label': 'Delete vocabulary list: ' + listName");
    expect(vocab).toContain("'aria-label': 'Open vocabulary list: ' + listName");
    expect(vocab).not.toContain('e.stopPropagation()');
  });

  it('uses semantic lists and labeled articles for lists and words', () => {
    expect(vocab).toContain("hh('ul', { 'aria-label': 'Vocabulary lists'");
    expect(vocab).toContain("hh('article', { 'aria-labelledby': 'learning-lab-vocab-list-name-' + list.id }");
    expect(vocab).toContain("hh('ul', { 'aria-label': 'Vocabulary words'");
    expect(vocab).toContain("hh('article', { 'aria-labelledby': 'learning-lab-vocab-word-heading-' + word.id }");
  });

  it('communicates mastery with text and bounded values', () => {
    expect(vocab).toContain("'aria-label': 'Mastery ' + mastery + ' of 5'");
    expect(vocab).toContain("'Mastery: ' + mastery + ' of 5 '");
    expect(vocab).toContain('Math.max(0, Math.min(5, Number(value) || 0))');
  });

  it('exposes quiz answer disclosure relationships', () => {
    expect(vocab).toContain("'aria-expanded': 'false'");
    expect(vocab).toContain("'aria-controls': 'learning-lab-vocab-quiz-answer'");
    expect(vocab).toContain("id: 'learning-lab-vocab-quiz-answer', role: 'region'");
    expect(vocab).toContain("'aria-labelledby': 'learning-lab-vocab-quiz-answer-heading'");
  });

  it('moves focus to the revealed answer and each next question', () => {
    expect(vocab).toContain("focusById('learning-lab-vocab-quiz-answer-heading')");
    expect(vocab).toContain("id: 'learning-lab-vocab-quiz-answer-heading', tabIndex: -1");
    expect(vocab).toContain("focusById('learning-lab-vocab-quiz-question')");
  });

  it('uses a named group for recall self-rating', () => {
    expect(vocab).toContain("role: 'group', 'aria-label': 'Rate your vocabulary recall'");
    expect(vocab).toContain('I did not know it');
    expect(vocab).toContain('I knew it');
  });

  it('includes the final answer in the reported quiz score', () => {
    expect(vocab).toContain('var nextScore = state.score + (correct ? 1 : 0);');
    expect(vocab).toContain("'Quiz complete. Score: ' + nextScore + ' of '");
  });

  it('only quizzes words with both a term and definition', () => {
    expect(vocab).toContain("filter(function(word) { return textValue(word.word).trim() && textValue(word.definition).trim(); })");
    expect(vocab).toContain("llAnnounce('Add a word and definition before starting a quiz.')");
  });

  it('moves focus between list, word, and quiz modes', () => {
    expect(vocab).toContain("focusById('learning-lab-vocab-list-heading')");
    expect(vocab).toContain("focusById('learning-lab-vocab-open-' + previousId)");
    expect(vocab).toContain("focusById('learning-lab-vocab-start-quiz')");
  });

  it('announces creation, additions, quiz states, and deletion', () => {
    expect(vocab).toContain("llAnnounce('Vocabulary list created: '");
    expect(vocab).toContain("llAnnounce('Vocabulary word added: '");
    expect(vocab).toContain("llAnnounce('Vocabulary quiz started. '");
    expect(vocab).toContain("llAnnounce('Vocabulary word deleted.')");
  });

  it('provides named 44-pixel controls and fields', () => {
    expect(vocab).toContain("'aria-label': 'Delete vocabulary word: ' + (textValue(word.word).trim() || 'Untitled word')");
    expect(vocab).toContain('minWidth: 44, minHeight: 44');
    expect(vocab).toContain("minHeight: 44, padding: '9px 14px'");
    expect(vocab).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
