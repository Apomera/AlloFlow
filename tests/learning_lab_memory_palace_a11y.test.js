import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Memory Palace accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMemoryPalace(props) {');
  const end = source.indexOf('  function PersonalClassRoster(props) {', start);
  const palace = source.slice(start, end);

  it('uses a named palace-creation form with native submit behavior', () => {
    expect(palace).toContain("onSubmit: function(event) { event.preventDefault(); createPalace(); }");
    expect(palace).toContain("'aria-labelledby': 'learning-lab-palace-new-heading'");
    expect(palace).toContain("hh('button', { type: 'submit'");
  });

  it('labels and validates the required palace name', () => {
    expect(palace).toContain("htmlFor: 'learning-lab-palace-new-name'");
    expect(palace).toContain("id: 'learning-lab-palace-new-name', type: 'text'");
    expect(palace).toContain("setPalaceError('Enter a name for the memory palace.')");
    expect(palace).toContain("id: 'learning-lab-palace-name-error', role: 'alert'");
    expect(palace).toContain("focusById('learning-lab-palace-new-name')");
  });

  it('uses a named add-stop form with labeled fields', () => {
    expect(palace).toContain("onSubmit: function(event) { event.preventDefault(); addLocus(); }");
    expect(palace).toContain("'aria-labelledby': 'learning-lab-palace-add-heading'");
    for (const field of ['location', 'item', 'vivid']) {
      expect(palace).toContain(`htmlFor: 'learning-lab-palace-${field}'`);
      expect(palace).toContain(`id: 'learning-lab-palace-${field}'`);
    }
  });

  it('reports location and item errors independently', () => {
    expect(palace).toContain("location: locForm.location.trim() ? '' : 'Enter a location for this stop.'");
    expect(palace).toContain("item: locForm.item.trim() ? '' : 'Enter the item to remember.'");
    expect(palace).toContain("id: 'learning-lab-palace-location-error', role: 'alert'");
    expect(palace).toContain("id: 'learning-lab-palace-item-error', role: 'alert'");
    expect(palace).toContain("focusById(nextErrors.location ? 'learning-lab-palace-location' : 'learning-lab-palace-item')");
    expect(palace).not.toContain('alert(');
  });

  it('preserves unrelated section data for create, update, and deletion', () => {
    expect(palace).toContain("setData(Object.assign({}, data, { palaces: [palace].concat(rawPalaces) }))");
    expect(palace).toContain("setData(Object.assign({}, data, {");
    expect(palace).toContain("setData(Object.assign({}, data, { palaces: rawPalaces.filter");
  });

  it('confirms palace and stop deletion in app dialogs', () => {
    expect(palace).toContain("title: 'Delete this memory palace?', confirmText: 'Delete palace'");
    expect(palace).toContain("title: 'Delete this palace stop?', confirmText: 'Delete stop'");
    expect(palace).not.toContain('confirm(');
  });

  it('uses separate open and delete controls instead of nested interaction', () => {
    expect(palace).toContain("'aria-label': 'Delete memory palace: ' + palaceName");
    expect(palace).toContain("'aria-label': 'Open memory palace: ' + palaceName");
    expect(palace).not.toContain('e.stopPropagation()');
  });

  it('uses semantic lists and labeled articles for palaces and stops', () => {
    expect(palace).toContain("hh('ul', { 'aria-label': 'Memory palaces'");
    expect(palace).toContain("hh('article', { 'aria-labelledby': 'learning-lab-palace-name-' + palace.id }");
    expect(palace).toContain("hh('ol', { 'aria-label': 'Memory palace route'");
    expect(palace).toContain("hh('article', { 'aria-labelledby': 'learning-lab-palace-locus-' + locus.id }");
  });

  it('exposes memory-walk progress with complete value semantics', () => {
    expect(palace).toContain("role: 'progressbar'");
    expect(palace).toContain("'aria-label': 'Memory walk progress'");
    expect(palace).toContain("'aria-valuemin': 1, 'aria-valuemax': loci.length, 'aria-valuenow': safeIndex + 1");
    expect(palace).toContain("'aria-valuetext': 'Stop ' + (safeIndex + 1) + ' of ' + loci.length");
  });

  it('bounds the active stop index against route length', () => {
    expect(palace).toContain('var safeIndex = Math.max(0, Math.min(loci.length - 1, walkIdx));');
    expect(palace).toContain('var current = loci[safeIndex];');
  });

  it('moves focus into the walk and on each next stop', () => {
    expect(palace).toContain("focusById('learning-lab-palace-walk-heading')");
    expect(palace).toContain("id: 'learning-lab-palace-walk-heading', tabIndex: -1");
    expect(palace).toContain("llAnnounce('Stop ' + (nextIndex + 1) + ' of '");
  });

  it('returns focus to the walk launcher when a walk ends', () => {
    expect(palace).toContain("focusById('learning-lab-palace-start-walk')");
    expect(palace).toContain("completed ? 'Memory walk complete.' : 'Memory walk stopped.'");
  });

  it('uses a named native-button group for walk controls', () => {
    expect(palace).toContain("role: 'group', 'aria-label': 'Memory walk controls'");
    expect(palace).toContain('Complete walk');
    expect(palace).toContain('Next stop');
  });

  it('moves focus into an editor and back to its palace card', () => {
    expect(palace).toContain("focusById('learning-lab-palace-editor-heading')");
    expect(palace).toContain("id: 'learning-lab-palace-editor-heading', tabIndex: -1");
    expect(palace).toContain("focusById('learning-lab-palace-open-' + previousId)");
  });

  it('announces creation, stop changes, and walk start', () => {
    expect(palace).toContain("llAnnounce('Memory palace created: '");
    expect(palace).toContain("llAnnounce('Memory palace stop added: '");
    expect(palace).toContain("llAnnounce('Memory palace stop deleted.')");
    expect(palace).toContain("llAnnounce('Memory walk started. Stop 1 of '");
  });

  it('provides named 44-pixel controls and fields', () => {
    expect(palace).toContain("'aria-label': 'Delete memory stop '");
    expect(palace).toContain('minWidth: 44, minHeight: 44');
    expect(palace).toContain("minHeight: 44, padding: '9px 14px'");
    expect(palace).toContain("width: '100%', minHeight: 44");
  });

  it('exposes method guidance as a named aside', () => {
    expect(palace).toContain("hh('aside', { 'aria-label': 'About the method of loci'");
  });

  it('handles malformed legacy palace data without crashing', () => {
    expect(palace).toContain('var rawPalaces = Array.isArray(data.palaces) ? data.palaces : [];');
    expect(palace).toContain("var lociOf = function(palace) { return (palace && Array.isArray(palace.loci) ? palace.loci : []).filter(isRecord); };");
    expect(palace).toContain('var palaces = rawPalaces.filter(isRecord);');
    expect(palace).toContain("var palaceName = textValue(palace.name).trim() || 'Untitled palace';");
    expect(source).toContain("stat: (Array.isArray((data.mytkPalace || {}).palaces) ? (data.mytkPalace || {}).palaces.length : 0) + ' palaces'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(palace).toContain('if (!pendingFocusId) return;');
    expect(palace).toContain('var target = document.getElementById(pendingFocusId);');
    expect(palace).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(palace).not.toContain('setTimeout');
  });

  it('explains local-only saving', () => {
    expect(palace).toContain('Palaces are saved only in your Personal Toolkit and are not shared with or sent to anyone.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
