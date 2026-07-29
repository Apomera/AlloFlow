import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function snippetBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start, 'Missing marker: ' + startMarker).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end, 'Missing marker: ' + endMarker).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Typing Practice personalized setup accessibility and recovery', () => {
  it('labels custom and personalized passage setup as named sections', () => {
    expect(source).toContain("return h('section', {");
    expect(source).toContain("'aria-labelledby': 'tp-custom-setup-title'");
    expect(source).toContain("h('h2', { id: 'tp-custom-setup-title'");
    expect(source).toContain("'aria-labelledby': 'tp-passage-setup-title'");
    expect(source).toContain("h('h2', { id: 'tp-passage-setup-title'");
  });

  it('allows saved custom drills to be edited even when the library is full', () => {
    const custom = snippetBetween('function renderCustomSetup()', 'function renderPassageSetup()');
    expect(custom).toContain('library.length >= MAX_CUSTOM_LIBRARY && !editingEntry');
    expect(custom).toContain('id: editingEntry ? editingEntry.id');
    expect(custom).toContain('savedAt: editingEntry ? editingEntry.savedAt');
    expect(custom).toContain('x.id !== entry.id');
    expect(custom).toContain("editingEntry ? 'Update and open'");
  });

  it('delays custom text errors until blur and avoids announcing every keystroke', () => {
    const custom = snippetBetween('function renderCustomSetup()', 'function renderPassageSetup()');
    expect(custom).toContain('var showDraftError = customTextTouched && draftTooShort;');
    expect(custom).toContain('onBlur: function() { setCustomTextTouched(true); }');
    expect(custom).toContain("'aria-invalid': showDraftError ? 'true' : 'false'");
    expect(custom).toContain("'aria-live': showDraftError || atCapacity ? 'polite' : 'off'");
  });

  it('provides specific, comfortably sized custom library actions', () => {
    const custom = snippetBetween('function renderCustomSetup()', 'function renderPassageSetup()');
    expect(custom).toContain("'Edit ' + (entry.label || 'untitled custom drill')");
    expect(custom).toContain("'Delete ' + (entry.label || 'untitled custom drill')");
    expect(custom).toContain("minHeight: '44px'");
    expect(custom).toContain("setAnnounceText('Editing ' + (entry.label || 'untitled custom drill') + '.')");
    expect(custom).toContain("setAnnounceText(removedLabel + ' removed from saved custom drills.')");
  });

  it('exposes passage choices as named groups with pressed states and visible guidance', () => {
    const passage = snippetBetween('function renderPassageSetup()', '// VIEW: SUMMARY');
    for (const id of ['grade', 'language', 'length', 'difficulty']) {
      expect(passage).toContain("role: 'group', 'aria-labelledby': 'tp-passage-" + id + "-title'");
    }
    expect(passage.match(/'aria-pressed':/g)?.length).toBeGreaterThanOrEqual(4);
    expect(passage.match(/opt\.hint/g)?.length).toBeGreaterThanOrEqual(4);
    expect(passage).toContain("'aria-describedby': 'tp-passage-topic-help tp-passage-topic-count'");
  });

  it('makes passage generation cancellable and ignores stale async results', () => {
    const generation = snippetBetween('var cancelPassageGeneration', 'function renderPassageSetup()');
    expect(generation).toContain('passageGenerationRef.current += 1;');
    expect(generation).toContain('var generationId = ++passageGenerationRef.current;');
    expect(generation.match(/passageGenerationRef\.current !== generationId/g)?.length).toBe(2);
    expect(source).toContain('Cancel generation');
    expect(source).toContain('Passage generation canceled. Your choices are still here.');
  });

  it('routes generated, cached, and saved passages through preparation', () => {
    const passage = snippetBetween('var cancelPassageGeneration', '// VIEW: SUMMARY');
    expect(passage.match(/view: 'drill-intro'/g)?.length).toBeGreaterThanOrEqual(3);
    expect(passage).toContain('The preparation screen is open.');
    expect(passage).toContain('Last passage selected. Preparation screen opened.');
    expect(passage).toContain('Saved passage selected. Preparation screen opened.');
  });

  it('imports curated packs only into free slots without evicting saved passages', () => {
    const passage = snippetBetween('function renderPassageSetup()', '// VIEW: SUMMARY');
    expect(passage).toContain('var availableSlots = Math.max(0, MAX_PASSAGE_LIBRARY - lib.length);');
    expect(passage).toContain('var importableCount = Math.min(missingPassages.length, availableSlots);');
    expect(passage).toContain('missingPassages.slice(0, availableSlots)');
    expect(passage).toContain('var nextLib = fresh.concat(existing);');
    expect(passage).not.toContain('fresh.concat(existing).slice(0, MAX_PASSAGE_LIBRARY)');
    expect(passage).toContain('The library is now full; existing passages were kept.');
  });
});
