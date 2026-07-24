import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Flashcard Deck accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalFlashcardDeck(props) {');
  const end = source.indexOf('  function PersonalStudyPlanner(props)', start);
  const flashcards = source.slice(start, end);

  it('uses stable headings for every flashcard view', () => {
    expect(flashcards).toContain("'learning-lab-flashcards-heading'");
    expect(flashcards).toContain("'learning-lab-flashcards-cards-heading'");
    expect(flashcards).toContain("'learning-lab-flashcards-form-heading'");
    expect(flashcards).toContain("'learning-lab-flashcards-review-heading'");
  });

  it('moves focus after every view transition through an effect', () => {
    expect(flashcards).toContain('document.getElementById(focusTarget)');
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-cards-heading')");
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-form-heading')");
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-review-card-heading')");
  });

  it('preserves sibling data when cards or decks change', () => {
    expect(flashcards).toContain("setData(Object.assign({}, data, { cards: nextCards }))");
    expect(flashcards).toContain("setData(Object.assign({}, data, { decks: decks.concat([name]) }))");
    expect(flashcards).toContain('setData(Object.assign({}, data, {');
    expect(flashcards).not.toContain('setData({ cards:');
    expect(flashcards).not.toContain('setData({ decks:');
  });

  it('uses the accessible shared form dialog to create named decks', () => {
    expect(flashcards).toContain("title: 'Create a flashcard deck'");
    expect(flashcards).toContain("fields: [{ name: 'name', label: 'Deck name', required: true, maxLength: 80 }]");
    expect(flashcards).toContain('A deck with that name already exists.');
  });

  it('announces deck creation and opens the new deck', () => {
    expect(flashcards).toContain("setView('cards')");
    expect(flashcards).toContain("llAnnounce('Flashcard deck created: ' + name + '.')");
  });

  it('confirms deck deletion without placing user content in the dialog title', () => {
    expect(flashcards).toContain("title: 'Delete this flashcard deck?', confirmText: 'Delete deck'");
    expect(flashcards).not.toContain("title: 'Delete \"' + name");
  });

  it('announces deck deletion and restores deck-list focus', () => {
    expect(flashcards).toContain("llAnnounce('Flashcard deck deleted: ' + name + '.')");
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-heading')");
  });

  it('renders decks as a semantic list with named and described buttons', () => {
    expect(flashcards).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-flashcards-heading'");
    expect(flashcards).toContain("return hh('li', { key: 'd-' + deckName");
    expect(flashcards).toContain("'aria-labelledby': titleId, 'aria-describedby': summaryId");
  });

  it('uses explicit native button types for deck opening, deletion, and creation', () => {
    expect(flashcards).toContain("type: 'button', onClick: function() { openDeck(deckName); }");
    expect(flashcards).toContain("'aria-label': 'Delete flashcard deck: ' + deckName");
    expect(flashcards).toContain("type: 'button', onClick: addDeck");
  });

  it('gives deck controls at least 44-pixel targets', () => {
    expect(flashcards).toContain('minHeight: 96');
    expect(flashcards).toContain('minWidth: 44, minHeight: 44');
    expect(flashcards).toContain("width: '100%', minHeight: 48");
  });

  it('uses a named native flashcard authoring form', () => {
    expect(flashcards).toContain("hh('form', { 'aria-labelledby': 'learning-lab-flashcards-form-heading', onSubmit: submitCard }");
    expect(flashcards).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('provides persistent labels and help for both required fields', () => {
    expect(flashcards).toContain("htmlFor: 'learning-lab-flashcard-front'");
    expect(flashcards).toContain("htmlFor: 'learning-lab-flashcard-back'");
    expect(flashcards).toContain("id: 'learning-lab-flashcard-front-help'");
    expect(flashcards).toContain("id: 'learning-lab-flashcard-back-help'");
  });

  it('bounds both multiline fields and associates help plus errors', () => {
    expect(flashcards).toContain("id: 'learning-lab-flashcard-front', required: true, maxLength: 8000");
    expect(flashcards).toContain("id: 'learning-lab-flashcard-back', required: true, maxLength: 8000");
    expect(flashcards).toContain("'aria-describedby': 'learning-lab-flashcard-front-help' +");
    expect(flashcards).toContain("'aria-describedby': 'learning-lab-flashcard-back-help' +");
  });

  it('provides separate inline errors and first-invalid focus', () => {
    expect(flashcards).toContain("front: front ? '' : 'Enter the question or prompt for the front of the card.'");
    expect(flashcards).toContain("back: back ? '' : 'Enter the answer for the back of the card.'");
    expect(flashcards).toContain("id: 'learning-lab-flashcard-front-error', role: 'alert'");
    expect(flashcards).toContain("id: 'learning-lab-flashcard-back-error', role: 'alert'");
    expect(flashcards).toContain("setFocusTarget(errors.front ? 'learning-lab-flashcard-front' : 'learning-lab-flashcard-back')");
  });

  it('clears each validation error while its field is edited', () => {
    expect(flashcards).toContain("if (formErrors.front) setFormErrors(Object.assign({}, formErrors, { front: '' }))");
    expect(flashcards).toContain("if (formErrors.back) setFormErrors(Object.assign({}, formErrors, { back: '' }))");
  });

  it('announces form validation, save, update, and cancellation', () => {
    expect(flashcards).toContain("llAnnounce('The flashcard has missing required information.')");
    expect(flashcards).toContain("llAnnounce(wasEditing ? 'Flashcard updated.' : 'Flashcard saved.')");
    expect(flashcards).toContain("llAnnounce('Flashcard editing canceled.')");
  });

  it('renders saved cards as a named semantic list', () => {
    expect(flashcards).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-flashcards-cards-heading'");
    expect(flashcards).toContain("return hh('li', { key: 'c-' + card.id");
  });

  it('wraps multiline user card content', () => {
    expect(flashcards.match(/overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('uses explicit review metadata and machine-readable future dates', () => {
    expect(flashcards).toContain("hh('time', { dateTime: card.nextDue }, card.nextDue)");
    expect(flashcards).toContain("' · Reviews completed: ' + (card.reviewCount || 0)");
    expect(flashcards).not.toContain("'reviewed ' +");
    expect(flashcards).not.toContain("+ 'x · ease '");
  });

  it('provides item-specific edit and delete controls with full-size targets', () => {
    expect(flashcards).toContain("'aria-label': 'Edit flashcard: ' + itemName");
    expect(flashcards).toContain("'aria-label': 'Delete flashcard: ' + itemName");
    expect(flashcards.match(/minHeight: 44, padding: '8px 11px'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('confirms card deletion, announces it, and restores card-list focus', () => {
    expect(flashcards).toContain("title: 'Delete this flashcard?', confirmText: 'Delete card'");
    expect(flashcards).toContain("llAnnounce('Flashcard deleted.')");
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-cards-heading')");
  });

  it('captures a stable queue of due card identifiers before review', () => {
    expect(flashcards).toContain("var ids = dueCards.map(function(card) { return card.id; })");
    expect(flashcards).toContain('setReviewIds(ids)');
    expect(flashcards).toContain('reviewIds.map(function(id)');
    expect(flashcards).not.toContain('var card = dueCards[revIdx]');
  });

  it('uses a named live region for the current question or answer', () => {
    expect(flashcards).toContain("'aria-labelledby': 'learning-lab-flashcards-review-card-heading'");
    expect(flashcards).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });

  it('moves focus to the rating question after revealing the answer', () => {
    expect(flashcards).toContain("setFocusTarget('learning-lab-flashcards-rating-heading')");
    expect(flashcards).toContain("llAnnounce('Answer shown. Choose a recall rating.')");
  });

  it('groups ratings in a described fieldset with a clear legend', () => {
    expect(flashcards).toContain("hh('fieldset', { 'aria-describedby': 'learning-lab-flashcards-rating-help'");
    expect(flashcards).toContain('How well did you remember the answer?');
    expect(flashcards).toContain('Your rating changes when this card is scheduled for review.');
  });

  it('gives rating buttons explicit types, descriptive names, and large targets', () => {
    expect(flashcards).toContain("type: 'button', onClick: function() { rate(reviewCard, option.quality); }, 'aria-label': option.label + ': ' + option.info");
    expect(flashcards).toContain('minHeight: 52');
  });

  it('uses high-contrast rating colors and no opacity-reduced label text', () => {
    expect(flashcards).toContain("color: '#fca5a5'");
    expect(flashcards).toContain("color: '#fdba74'");
    expect(flashcards).toContain("color: '#6ee7b7'");
    expect(flashcards).toContain("color: '#67e8f9'");
    expect(flashcards).not.toContain('opacity: 0.8');
  });

  it('uses self-report wording instead of calling ratings objectively correct', () => {
    expect(flashcards).toContain('Good or Easy');
    expect(flashcards).not.toContain('correct this session');
  });

  it('announces review progress, completion, and early ending', () => {
    expect(flashcards).toContain("llAnnounce('Rating saved. Moving to card '");
    expect(flashcards).toContain("llAnnounce('Review complete. '");
    expect(flashcards).toContain("llAnnounce('Review session ended.')");
  });

  it('uses a named evidence aside with qualified claims', () => {
    expect(flashcards).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-flashcards-evidence-heading'");
    expect(flashcards).toContain('outcomes vary by material, learner, timing, and study design');
    expect(flashcards).toContain('not a precise model of when an individual will forget');
    expect(flashcards).not.toContain('4-5× better long-term retention');
    expect(flashcards).not.toContain('shows each card just before you would forget it');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
