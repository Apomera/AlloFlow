import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Script Library accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalScriptLibrary(props) {');
  const end = source.indexOf('  // ── HHHH. PERSONAL KNOWLEDGE MAP (Wave 18) ──', start);
  const library = source.slice(start, end);

  it('frames scripts as optional suggestions to adapt', () => {
    expect(library).toContain('Review, adapt, copy, or save optional phrases for different situations.');
    expect(library).toContain('Suggestions to adapt, not guaranteed advice');
    expect(library).toContain('You can edit, ignore, or replace any suggestion; there is no required wording.');
    expect(library).not.toContain('Especially valuable for ND students');
  });

  it('states safety, context, and communication boundaries', () => {
    expect(library).toContain('may not be safe or effective in every relationship, culture, power dynamic, or urgent situation');
    expect(library).toContain('Prioritize your safety');
    expect(library).toContain('This tool does not send messages or contact anyone.');
  });

  it('uses a named complete tablist', () => {
    expect(library).toContain("role: 'tablist', 'aria-label': 'Script categories'");
    expect(library).toContain("role: 'tab'");
    expect(library).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(library).toContain("'aria-controls': 'learning-lab-script-panel'");
  });

  it('uses roving tab focus', () => {
    expect(library).toContain('tabIndex: active ? 0 : -1');
  });

  it('supports Arrow, Home, and End tab navigation', () => {
    expect(library).toContain("event.key === 'ArrowRight'");
    expect(library).toContain("event.key === 'ArrowLeft'");
    expect(library).toContain("event.key === 'Home'");
    expect(library).toContain("event.key === 'End'");
    expect(library).toContain('event.preventDefault()');
  });

  it('moves focus with keyboard category changes', () => {
    expect(library).toContain("focusById('learning-lab-script-tab-' + CATS[next].id)");
  });

  it('uses a focusable panel labeled by the active tab', () => {
    expect(library).toContain("id: 'learning-lab-script-panel', role: 'tabpanel'");
    expect(library).toContain("'aria-labelledby': 'learning-lab-script-tab-' + currentCat.id");
    expect(library).toContain('tabIndex: 0');
  });

  it('hides decorative category icons from accessible names', () => {
    expect(library).toContain("hh('span', { 'aria-hidden': 'true' }, category.icon + ' ')");
  });

  it('keeps unknown legacy categories visible through a fallback', () => {
    expect(library).toContain('return CATS.filter(function(category) { return category.id === id; })[0] || CATS[0]');
    expect(library).toContain('categoryFor(custom.category).id === currentCat.id');
  });

  it('uses a semantic list of labeled script articles', () => {
    expect(library).toContain("hh('ul', { 'aria-label': currentCat.label + ' scripts'");
    expect(library).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(library).toContain("hh('h3', { id: headingId");
  });

  it('distinguishes built-in suggestions from personal scripts in text', () => {
    expect(library).toContain("item.builtin ? 'Built-in suggestion' : 'Personal script'");
  });

  it('uses labeled selectable read-only textareas for script wording', () => {
    expect(library).toContain("htmlFor: textId");
    expect(library).toContain("hh('textarea', { id: textId");
    expect(library).toContain('readOnly: true');
    expect(library).toContain("item.builtin ? 'Suggested wording' : 'Saved wording'");
  });

  it('preserves multiline script text and supports manual selection', () => {
    expect(library).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(library).toContain("if (pendingFocus.select && typeof target.select === 'function') target.select()");
    expect(library).toContain('function focusById(id, selectText) { setPendingFocus({ id: id, select: !!selectText }); }');
  });

  it('gives every copy action a contextual accessible name', () => {
    expect(library).toContain("'aria-label': 'Copy script for '");
    expect(library).toContain("}, 'Copy script')");
  });

  it('handles unavailable clipboard access with manual-copy instructions', () => {
    expect(library).toContain("typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function'");
    expect(library).toContain('Clipboard access is unavailable. The script text is selected; use Control+C or Command+C.');
    expect(library).toContain('focusById(textId, true)');
  });

  it('handles asynchronous clipboard success and failure', () => {
    expect(library).toContain('Promise.resolve(navigator.clipboard.writeText(text)).then(function()');
    expect(library).toContain('Script copied. Review and adapt it before using it.');
    expect(library).toContain('The script could not be copied automatically.');
    expect(library).toContain('.catch(function()');
  });

  it('announces copy outcomes', () => {
    expect(library).toContain("llAnnounce('Script copied to the clipboard.')");
    expect(library).toContain('Automatic copying failed. The script text is selected for manual copying.');
    expect(library).not.toContain("try { navigator.clipboard.writeText(item.script); } catch(e) {}");
  });

  it('provides visible per-script copy status', () => {
    expect(library).toContain("role: 'status', 'aria-live': 'polite'");
    expect(library).toContain("'aria-describedby': itemStatus ? statusId : undefined");
  });

  it('uses time semantics for personal script dates', () => {
    expect(library).toContain("hh('time', { dateTime: item.addedAt }, relDate(item.addedAt))");
  });

  it('uses a named form with native submit behavior', () => {
    expect(library).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addCustom(); }");
    expect(library).toContain("'aria-labelledby': 'learning-lab-script-form-heading'");
    expect(library).toContain("type: 'submit'");
  });

  it('provides visible labels for both custom fields', () => {
    expect(library).toContain("htmlFor: 'learning-lab-script-situation'");
    expect(library).toContain("htmlFor: 'learning-lab-script-text'");
    expect(library).toContain('Situation (required)');
    expect(library).toContain('Words to save (required)');
  });

  it('associates help with both custom fields', () => {
    expect(library).toContain("id: 'learning-lab-script-situation-help'");
    expect(library).toContain("id: 'learning-lab-script-text-help'");
    expect(library).toContain("'aria-describedby': 'learning-lab-script-situation-help' +");
    expect(library).toContain("'aria-describedby': 'learning-lab-script-text-help' +");
  });

  it('requires and bounds both custom fields', () => {
    expect(library).toContain('rows: 2, required: true, maxLength: 4000');
    expect(library).toContain('rows: 4, required: true, maxLength: 6000');
  });

  it('reports missing custom fields inline and focuses the first error', () => {
    expect(library).toContain("situation ? '' : 'Describe the situation.'");
    expect(library).toContain("script ? '' : 'Enter the words you want to save.'");
    expect(library).toContain("id: 'learning-lab-script-situation-error', role: 'alert'");
    expect(library).toContain("id: 'learning-lab-script-text-error', role: 'alert'");
    expect(library).toContain("focusById(!situation ? 'learning-lab-script-situation' : 'learning-lab-script-text')");
  });

  it('trims custom text and preserves unrelated data', () => {
    expect(library).toContain('var situation = newForm.situation.trim(); var script = newForm.script.trim()');
    expect(library).toContain("setData(Object.assign({}, data, { custom: [custom].concat(data.custom || []) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(library).toContain("llAnnounce('Custom script saved in this browser.')");
    expect(library).toContain("focusById('learning-lab-script-situation')");
  });

  it('discloses sensitive local storage', () => {
    expect(library).toContain('Personal scripts save in this browser and may describe sensitive situations.');
    expect(library).toContain('Avoid names or private details if other people use this device.');
    expect(library).toContain("'aria-describedby': 'learning-lab-script-privacy'");
  });

  it('confirms custom deletion while preserving unrelated data', () => {
    expect(library).toContain("title: 'Remove this custom script?', confirmText: 'Remove script'");
    expect(library).toContain('This cannot be undone.');
    expect(library).toContain("setData(Object.assign({}, data, { custom: (data.custom || []).filter");
  });

  it('names deletion, announces it, and restores panel focus', () => {
    expect(library).toContain("'aria-label': 'Remove custom script for '");
    expect(library).toContain("llAnnounce('Custom script removed.')");
    expect(library).toContain("focusById('learning-lab-script-panel-heading')");
  });

  it('uses 44-pixel tabs and actions with larger text fields', () => {
    expect(library).toContain('minWidth: 44, minHeight: 44');
    expect(library).toContain("minHeight: 96, resize: 'vertical'");
    expect(library).toContain("minHeight: 110, resize: 'vertical'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
