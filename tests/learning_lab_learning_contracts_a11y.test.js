import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Learning Contracts accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLearningContract(props) {');
  const end = source.indexOf('  function PersonalCircleSupport(props) {', start);
  const contracts = source.slice(start, end);

  it('uses a named editor form with native submit behavior', () => {
    expect(contracts).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(contracts).toContain("'aria-labelledby': 'learning-lab-contract-editor-heading'");
    expect(contracts).toContain("id: 'learning-lab-contract-editor-heading', tabIndex: -1");
    expect(contracts).toContain("type: 'submit'");
  });

  it('associates visible labels with title, text areas, and dates', () => {
    expect(contracts).toContain("htmlFor: 'learning-lab-contract-title'");
    expect(contracts).toContain("htmlFor: 'learning-lab-contract-rewards'");
    expect(contracts).toContain("htmlFor: 'learning-lab-contract-accountability'");
    expect(contracts).toContain("htmlFor: 'learning-lab-contract-start'");
    expect(contracts).toContain("htmlFor: 'learning-lab-contract-end'");
  });

  it('visibly identifies required and optional fields', () => {
    expect(contracts).toContain("'Contract title (required)'");
    expect(contracts).toContain("'Commitments (at least one required)'");
    expect(contracts).toContain("'Optional reward or encouragement'");
    expect(contracts).toContain("'Optional support or check-in person'");
    expect(contracts).toContain("'Start date (required)'");
    expect(contracts).toContain("'Review date (optional)'");
  });

  it('gives draft commitment rows stable IDs and labels', () => {
    expect(contracts).toContain("commitments: [{ id: tkId(), text: '' }]");
    expect(contracts).toContain("key: entry.id");
    expect(contracts).toContain("htmlFor: inputId");
    expect(contracts).toContain("id: inputId, type: 'text'");
  });

  it('adds commitment fields with announcements and focus', () => {
    expect(contracts).toContain("llAnnounce('Commitment field added.')");
    expect(contracts).toContain("focusById('learning-lab-contract-commitment-' + entry.id)");
    expect(contracts).toContain("form.commitments.length >= 20");
  });

  it('provides named 44-pixel removal controls for commitment fields', () => {
    expect(contracts).toContain("'aria-label': 'Remove commitment ' + (index + 1)");
    expect(contracts).toContain("llAnnounce('Commitment field removed.')");
    expect(contracts).toContain("minWidth: 44, minHeight: 44");
  });

  it('reports and focuses a missing contract title inline', () => {
    expect(contracts).toContain("next.title = 'Enter a title for this learning contract.'");
    expect(contracts).toContain("id: 'learning-lab-contract-title-error', role: 'alert'");
    expect(contracts).toContain("'aria-invalid': errors.title ? 'true' : undefined");
    expect(contracts).not.toContain("alert('Need a title.')");
  });

  it('requires at least one meaningful commitment', () => {
    expect(contracts).toContain("form.commitments.some(function(entry) { return entry.text.trim(); })");
    expect(contracts).toContain("next.commitments = 'Enter at least one commitment.'");
    expect(contracts).toContain("id: 'learning-lab-contract-commitments-error', role: 'alert'");
  });

  it('validates dates and constrains the review date to the start date', () => {
    expect(contracts).toContain("next.startDate = 'Choose a valid start date.'");
    expect(contracts).toContain("form.endDate < form.startDate");
    expect(contracts).toContain("'Choose a review date on or after the start date.'");
    expect(contracts).toContain("min: form.startDate || undefined");
  });

  it('trims saved values and preserves unrelated section data', () => {
    expect(contracts).toContain('title: form.title.trim()');
    expect(contracts).toContain("item.text.trim(); }).filter(Boolean)");
    expect(contracts).toContain('rewards: form.rewards.trim(), accountability: form.accountability.trim()');
    expect(contracts).toContain("setData(Object.assign({}, data, { contracts: [entry].concat(rawContracts) }))");
  });

  it('announces saves and focuses the new contract heading', () => {
    expect(contracts).toContain("llAnnounce('Unsigned learning contract saved: ' + entry.title)");
    expect(contracts).toContain("focusById('learning-lab-contract-heading-' + entry.id)");
  });

  it('confirms before discarding a changed draft', () => {
    expect(contracts).toContain("title: 'Discard this contract draft?', confirmText: 'Discard draft'");
    expect(contracts).toContain('Return to the contract list and discard this unsaved draft?');
    expect(contracts).toContain("llAnnounce('Unsaved contract draft discarded.')");
  });

  it('moves focus between the contract list and editor', () => {
    expect(contracts).toContain("focusById('learning-lab-contract-editor-heading')");
    expect(contracts).toContain("focusById('learning-lab-contract-new')");
  });

  it('confirms signing and preserves unrelated data', () => {
    expect(contracts).toContain("title: 'Sign this learning contract?', confirmText: 'Sign contract'");
    expect(contracts).toContain("setData(Object.assign({}, data, { contracts: rawContracts.map");
    expect(contracts).toContain("signed: true, signedAt: todayISO()");
    expect(contracts).toContain("llAnnounce('Learning contract signed: ' + textValue(entry.title))");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(contracts).toContain("title: 'Delete this learning contract?', confirmText: 'Delete contract'");
    expect(contracts).toContain('This cannot be undone.');
    expect(contracts).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores focus', () => {
    expect(contracts).toContain("'aria-label': 'Delete learning contract: ' + (textValue(entry.title).trim() || 'Untitled contract')");
    expect(contracts).toContain("setData(Object.assign({}, data, { contracts: rawContracts.filter");
    expect(contracts).toContain("llAnnounce('Learning contract deleted.')");
    expect(contracts).toContain("focusById('learning-lab-contract-list-heading')");
  });

  it('uses neutral product language without the unsupported research claim', () => {
    expect(contracts).toContain('Write a personal plan with commitments, dates, and optional support.');
    expect(contracts).not.toContain('60+ years of behavioral-contracting research support');
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(contracts).toContain('Contracts save in this browser only; saving does not send them to or notify anyone, including a check-in person you name.');
    expect(contracts).toContain('if other people use this device.');
    expect(contracts).toContain("'aria-describedby': 'learning-lab-contract-privacy-note'");
  });

  it('uses a named semantic list with labeled articles', () => {
    expect(contracts).toContain("'aria-labelledby': 'learning-lab-contract-list-heading'");
    expect(contracts).toContain("hh('ul', { 'aria-label': contracts.length");
    expect(contracts).toContain("return hh('li', { key: 'lc-' + entry.id }");
    expect(contracts).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('communicates signed state in text rather than color alone', () => {
    expect(contracts).toContain("entry.signed ? 'Signed contract' : 'Unsigned contract'");
    expect(contracts).toContain("'Sign contract'");
  });

  it('uses definition-list and time semantics for dates and status', () => {
    expect(contracts).toContain("hh('dl', { 'aria-label': 'Contract dates and status'");
    expect(contracts).toContain("hh('time', { dateTime: textValue(entry.startDate).trim() || undefined }");
    expect(contracts).toContain("hh('time', { dateTime: textValue(entry.endDate).trim() }");
    expect(contracts).toContain("hh('time', { dateTime: textValue(entry.signedAt).trim() }");
  });

  it('presents commitments and optional details in named sections', () => {
    expect(contracts).toContain("hh('section', { 'aria-label': 'Commitments' }");
    expect(contracts).toContain("'aria-label': 'Reward or encouragement'");
    expect(contracts).toContain("'aria-label': 'Support or check-in person'");
    expect(contracts).toContain("whiteSpace: 'pre-wrap'");
  });

  it('provides responsive dates and 44-pixel fields and controls', () => {
    expect(contracts).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(contracts).toContain("width: '100%', minHeight: 44");
    expect(contracts).toContain("minWidth: 44, minHeight: 44");
    expect(contracts).toContain("minHeight: 88");
  });

  it('handles malformed legacy contract data without crashing', () => {
    expect(contracts).toContain('var rawContracts = Array.isArray(data.contracts) ? data.contracts : [];');
    expect(contracts).toContain('var contracts = rawContracts.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkContract || {}).contracts) ? (data.mytkContract || {}).contracts.length : 0) + ' contracts'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(contracts).toContain('if (!pendingFocusId) return;');
    expect(contracts).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(contracts).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
