import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Accommodation Card accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAccommodationCard(props) {');
  const end = source.indexOf('  function PersonalFlashcardDeck(props)', start);
  const card = source.slice(start, end);

  it('uses a stable section heading and private-practice framing', () => {
    expect(card).toContain("'learning-lab-accommodation-heading'");
    expect(card).toContain('A private practice card for reviewing supports and preparing a request.');
    expect(card).not.toContain('YOUR accommodations');
  });

  it('uses a named aside to explain scope and limits', () => {
    expect(card).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-accommodation-note-heading'");
    expect(card).toContain("id: 'learning-lab-accommodation-note-heading'");
    expect(card).toContain('does not change an IEP, 504 plan, workplace record, or other official record');
    expect(card).toContain('does not guarantee that a request will be approved');
  });

  it('tells users to select applicable supports and adapt example reasons', () => {
    expect(card).toContain('Select only supports that apply to you');
    expect(card).toContain('adapt the example reasons in your own words');
  });

  it('reports the accommodation count through a polite atomic status', () => {
    expect(card).toContain("id: 'learning-lab-accommodation-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(card).toContain("selectedCount === 1 ? 'accommodation on this practice card'");
  });

  it('uses higher-contrast category colors on the dark interface', () => {
    expect(card).toContain("color: '#c4b5fd'");
    expect(card).toContain("color: '#93c5fd'");
    expect(card).toContain("color: '#6ee7b7'");
    expect(card).toContain("color: '#fde68a'");
    expect(card).toContain("color: '#fca5a5'");
  });

  it('renders the catalog and categories as named sections', () => {
    expect(card).toContain("hh('section', { 'aria-labelledby': 'learning-lab-accommodation-catalog-heading'");
    expect(card).toContain("return hh('section', { key: 'cat-' + cat.id, 'aria-labelledby': categoryHeadingId");
    expect(card).toContain("hh('h4', { id: categoryHeadingId");
  });

  it('renders each category collection as a named semantic list', () => {
    expect(card).toContain("hh('ul', { 'aria-labelledby': categoryHeadingId");
    expect(card).toContain("return hh('li', { key: 'a-' + item.id }");
  });

  it('exposes catalog choices as pressed native buttons', () => {
    expect(card).toContain("type: 'button', onClick: function() { toggle(item.id); }, 'aria-pressed': on ? 'true' : 'false'");
    expect(card).toContain("'aria-labelledby': labelId, 'aria-describedby': reasonId");
  });

  it('gives catalog choices full-width 44-pixel targets', () => {
    expect(card).toContain("width: '100%', minHeight: 44");
  });

  it('hides decorative icons and checkmarks from assistive technology', () => {
    expect(card).toContain("hh('span', { 'aria-hidden': 'true' }, item.icon)");
    expect(card).toContain("on ? hh('span', { 'aria-hidden': 'true'");
  });

  it('labels the supporting copy as an example reason', () => {
    expect(card).toContain("'Example reason: ' + item.why");
    expect(card).not.toContain('Bright fluorescents are a real cognitive cost for me.');
  });

  it('announces catalog additions and removals', () => {
    expect(card).toContain("(nextValue ? ' added to' : ' removed from') + ' the practice card.'");
  });

  it('preserves sibling data when catalog or custom items change', () => {
    expect(card).toContain("setData(Object.assign({}, data, { selected: sel }))");
    expect(card).toContain("setData(Object.assign({}, data, { custom: custom }))");
    expect(card).toContain("setData(Object.assign({}, data, { custom: remaining }))");
    expect(card).not.toContain('setData({ selected:');
    expect(card).not.toContain('setData({ custom:');
  });

  it('uses a named native form for custom accommodations', () => {
    expect(card).toContain("hh('form', { 'aria-labelledby': 'learning-lab-accommodation-custom-form-heading', onSubmit: addCustom }");
    expect(card).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('provides persistent labels and bounded inputs for custom content', () => {
    expect(card).toContain("htmlFor: 'learning-lab-accommodation-custom-name'");
    expect(card).toContain("htmlFor: 'learning-lab-accommodation-custom-reason'");
    expect(card).toContain("id: 'learning-lab-accommodation-custom-name', required: true, maxLength: 240");
    expect(card).toContain("id: 'learning-lab-accommodation-custom-reason', maxLength: 500");
  });

  it('provides inline custom-name validation and first-invalid focus', () => {
    expect(card).toContain("setCustomError('Enter a name for the custom accommodation.')");
    expect(card).toContain("id: 'learning-lab-accommodation-custom-error', role: 'alert'");
    expect(card).toContain("'aria-invalid': customError ? 'true' : undefined");
    expect(card).toContain("setFocusTarget('learning-lab-accommodation-custom-name')");
    expect(card).toContain("llAnnounce('A custom accommodation name is required.')");
  });

  it('clears custom validation while the user edits', () => {
    expect(card).toContain("if (customError) setCustomError('')");
  });

  it('announces a successful custom addition and returns focus to the name field', () => {
    expect(card).toContain("llAnnounce('Custom accommodation added to the practice card.')");
    expect(card).toContain("setFocusTarget('learning-lab-accommodation-custom-name')");
  });

  it('renders custom accommodations as a named semantic list', () => {
    expect(card).toContain("custom.length > 0 ? hh('ul', { 'aria-labelledby': 'learning-lab-accommodation-custom-heading'");
    expect(card).toContain("return hh('li', { key: 'cu-' + item.id");
  });

  it('wraps custom accommodation names and multiline reasons', () => {
    expect(card).toContain("overflowWrap: 'anywhere'");
    expect(card).toContain("whiteSpace: 'pre-wrap'");
  });

  it('uses item-specific custom delete names and 44 by 44 pixel targets', () => {
    expect(card).toContain("'aria-label': 'Delete custom accommodation: ' + itemName");
    expect(card).toContain('minWidth: 44, minHeight: 44');
  });

  it('confirms custom deletion, announces completion, and restores focus', () => {
    expect(card).toContain("title: 'Delete this custom accommodation?', confirmText: 'Delete accommodation'");
    expect(card).toContain("llAnnounce('Custom accommodation deleted.')");
    expect(card).toContain("setFocusTarget(remaining.length ? 'learning-lab-accommodation-custom-heading' : 'learning-lab-accommodation-custom-name')");
  });

  it('keeps hooks at component scope instead of in a render-time IIFE', () => {
    expect(card).not.toMatch(/\n\s+\(function\(\) \{/);
    expect(card).not.toContain('editingCustom');
  });

  it('renders self-advocacy guidance as a named section', () => {
    expect(card).toContain("hh('section', { 'aria-labelledby': 'learning-lab-accommodation-script-heading'");
    expect(card).toContain("id: 'learning-lab-accommodation-script-heading'");
    expect(card).toContain('Review and adapt these examples before using them.');
  });

  it('renders generated examples as a named semantic list', () => {
    expect(card).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-accommodation-examples-heading'");
    expect(card).toContain("return hh('li', { key: 's-' + item.id");
  });

  it('reports when only the first three generated examples are shown', () => {
    expect(card).toContain("'Showing 3 of ' + selectedCount + ' examples.'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
