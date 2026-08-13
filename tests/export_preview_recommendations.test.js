import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const compiled = readFileSync('view_export_preview_module.js', 'utf8');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const pdfSource = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const pdfCompiled = readFileSync('view_pdf_audit_module.js', 'utf8');
const exportSource = readFileSync('export_source.jsx', 'utf8');

const helperStart = source.indexOf('const _BUILDER_STYLE_GALLERY');
const helperEnd = source.indexOf('function ExportPreviewView');
const helpers = new Function(source.slice(helperStart, helperEnd) + '\nreturn { _builderWordCount, _builderDocumentStatistics, _builderSelectionStatistics, _builderHeadingOutline, _builderTableOfContentsEntries, _builderInsertTableOfContents, _builderRefreshTableOfContents, _builderMoveHeadingSection, _builderApplyDocumentTemplate, _builderNormalizeCustomStyles, _builderNormalizeCustomDocumentTemplates, _builderDocumentReferenceEntries, _builderRefreshDocumentReferences, _builderInsertBookmark, _builderInsertCrossReference, _builderInsertFootnote, _builderRemoveBookmark, _builderRemoveCrossReference, _builderRemoveFootnote, _builderNormalizeCitationSource, _builderNormalizeCitationSources, _builderNormalizeCitationItem, _builderNormalizeCitationItems, _builderCitationItems, _builderWriteCitationItems, _builderCitationSources, _builderCitationEntries, _builderRefreshCitationFields, _builderFormatCitationItem, _builderFormatCitationCluster, _builderFormatInlineCitation, _builderFormatBibliographyEntry, _builderParseRIS, _builderParseBibTeX, _builderParseCitationImport, _builderCitationSourceFromCrossref, _builderCitationSourceFingerprint, _builderImportCitationSources, _builderUpsertCitationSource, _builderSetCitationStyle, _builderInsertCitation, _builderUpdateCitation, _builderInsertOrRefreshBibliography, _builderRemoveCitation, _builderRemoveCitationSource, _builderExportPreflight, _builderH5PCompatibility, _builderInsertReviewComment, _builderCommentEntries, _builderSetCommentThread, _builderStripReviewComments, _builderHandleTrackedBeforeInput, _builderTrackedChangeEntries, _builderFinalizeTrackedChanges, _builderFinalizeDocumentForExport, _builderSuspendTrackedChanges, _builderCaptureElementRevision, _builderRecordElementRevision, _builderRecordInsertedStructure, _builderRecordDeletedStructure, _builderTrackInlineFormatting, _builderApplyTrackedChange, _builderSetTrackedMarkupView, _builderCompareDocumentVersions, _builderRestoreVersionBlock, _builderReviewerIdentity, _builderNormalizeQuickAccessItems };')();

describe('Document Builder export recommendations', () => {
  it('runs deterministic preflight checks and reports blocking document defects', () => {
    document.documentElement.lang = '';
    document.title = '';
    document.body.innerHTML = '<h1 id="same">Title</h1><h3 id="same">Skipped</h3><img src="x"><table><tr><td>Cell</td></tr></table><input>';
    const result = helpers._builderExportPreflight(document, 'html');
    expect(result.errors).toBeGreaterThanOrEqual(3);
    expect(result.warnings).toBeGreaterThanOrEqual(3);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'language', 'title', 'heading-order', 'image-alt', 'form-label', 'table-headers', 'duplicate-ids',
    ]));
  });

  it('accepts an accessible minimal document and counts words reactively', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Accessible handout';
    document.body.innerHTML = '<h1>Accessible handout</h1><p>Three useful words</p><img src="x" alt=""><table><tr><th scope="col">Name</th></tr></table><label for="answer">Answer</label><input id="answer">';
    const result = helpers._builderExportPreflight(document, 'html');
    expect(result.errors).toBe(0);
    expect(helpers._builderWordCount(document)).toBe(7);
    expect(helpers._builderDocumentStatistics(document)).toMatchObject({ words: 7, readingMinutes: 1, speakingMinutes: 1 });
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('p'));
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
    expect(helpers._builderSelectionStatistics(document)).toMatchObject({ active: true, words: 3, charactersWithoutSpaces: 16 });
    document.getSelection().removeAllRanges();
    expect(helpers._builderHeadingOutline(document).map((item) => item.level)).toEqual([1]);
  });

  it('anchors author-attributed threaded comments and strips review markup without losing text', () => {
    document.body.innerHTML = '<p>Alpha beta gamma.</p>';
    const text = document.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 10);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);

    const inserted = helpers._builderInsertReviewComment(document, range, 'Clarify this word.', 'Morgan Editor');
    expect(inserted.ok).toBe(true);
    const marker = document.querySelector('mark[data-allo-comment-id]');
    const firstEntry = helpers._builderCommentEntries(document)[0];
    expect(marker?.textContent).toBe('beta');
    expect(firstEntry.thread).toHaveLength(1);
    expect(firstEntry.thread[0].author).toBe('Morgan Editor');
    expect(marker?.getAttribute('data-allo-comment-author-key')).toMatch(/^reviewer-/);
    expect(marker?.getAttribute('aria-label')).toContain('Morgan Editor');

    const firstIdentity = helpers._builderReviewerIdentity('Morgan Editor');
    expect(helpers._builderReviewerIdentity('Morgan Editor')).toEqual(firstIdentity);
    expect(firstIdentity.initials).toBe('ME');

    helpers._builderSetCommentThread(marker, [...firstEntry.thread, { text: 'Added context.', at: new Date().toISOString(), author: 'Riley Reviewer' }]);
    const updatedEntry = helpers._builderCommentEntries(document)[0];
    expect(updatedEntry.thread).toHaveLength(2);
    expect(updatedEntry.authors).toEqual(['Morgan Editor', 'Riley Reviewer']);

    const clone = document.body.cloneNode(true);
    helpers._builderStripReviewComments(clone);
    expect(clone.querySelector('mark[data-allo-comment-id]')).toBeNull();
    expect(clone.textContent).toBe('Alpha beta gamma.');
  });

  it('normalizes persistent Quick Access commands without duplicates or unsafe IDs', () => {
    expect(helpers._builderNormalizeQuickAccessItems()).toEqual(['save', 'undo', 'redo']);
    expect(helpers._builderNormalizeQuickAccessItems(['redo', 'save', 'redo', 'unknown', 'comments'])).toEqual(['redo', 'save', 'comments']);
    expect(helpers._builderNormalizeQuickAccessItems(['save', 'undo', 'redo', 'comments', 'trackChanges', 'wordCount', 'navigation', 'focus'])).toHaveLength(6);
  });

  it('records text insertions and deletions and can accept or reject the revision set', () => {
    document.body.innerHTML = '<p>Alpha beta.</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    const paragraph = document.querySelector('p');
    const selection = document.getSelection();
    const insertionRange = document.createRange();
    insertionRange.setStart(paragraph.firstChild, 5);
    insertionRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(insertionRange);
    let insertionPrevented = false;
    const insertion = helpers._builderHandleTrackedBeforeInput(document, {
      inputType: 'insertText', data: ' new', preventDefault: () => { insertionPrevented = true; },
    });
    expect(insertion.ok).toBe(true);
    expect(insertionPrevented).toBe(true);

    const betaNode = Array.from(paragraph.childNodes).find((node) => node.nodeType === 3 && node.nodeValue.includes('beta'));
    const deletionRange = document.createRange();
    deletionRange.setStart(betaNode, betaNode.nodeValue.indexOf('beta'));
    deletionRange.setEnd(betaNode, betaNode.nodeValue.indexOf('beta') + 4);
    selection.removeAllRanges();
    selection.addRange(deletionRange);
    const deletion = helpers._builderHandleTrackedBeforeInput(document, {
      inputType: 'deleteByCut', preventDefault() {},
    });
    expect(deletion.ok).toBe(true);
    expect(helpers._builderTrackedChangeEntries(document).map((change) => change.type)).toEqual(['insert', 'delete']);

    const originalMarkup = document.body.innerHTML;
    const resumeChanges = helpers._builderSuspendTrackedChanges(document.body);
    expect(document.body.querySelector('ins,del')).toBeNull();
    expect(document.body.textContent).toContain('new');
    expect(document.body.textContent).not.toContain('beta');
    resumeChanges();
    expect(document.body.innerHTML).toBe(originalMarkup);

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.querySelector('ins,del')).toBeNull();
    expect(accepted.textContent).toContain('new');
    expect(accepted.textContent).not.toContain('beta');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('ins,del')).toBeNull();
    expect(rejected.textContent).not.toContain('new');
    expect(rejected.textContent).toContain('beta');

    document.body.innerHTML = '<p>AB</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    const backspaceRange = document.createRange();
    backspaceRange.setStart(document.querySelector('p').firstChild, 2);
    backspaceRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(backspaceRange);
    let backspacePrevented = false;
    const backspace = helpers._builderHandleTrackedBeforeInput(document, {
      inputType: 'deleteContentBackward', preventDefault: () => { backspacePrevented = true; },
    });
    expect(backspace.ok).toBe(true);
    expect(backspacePrevented).toBe(true);
    expect(document.querySelector('del[data-allo-change-id]')?.textContent).toBe('B');
  });

  it('records reversible formatting with reviewer attribution and four-state markup previews', () => {
    document.body.innerHTML = '<p style="text-align:left">Alpha beta.</p>';
    document.body.setAttribute('data-allo-reviewer-name', 'Alex Reviewer');
    const paragraph = document.querySelector('p');
    const before = helpers._builderCaptureElementRevision(paragraph, { attributeMode: 'presentation' });
    paragraph.style.textAlign = 'center';
    const recorded = helpers._builderRecordElementRevision(paragraph, before, 'format', 'Paragraph centered', {
      kind: 'block-format', attributeMode: 'presentation',
    });

    expect(recorded.ok).toBe(true);
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({
      type: 'format',
      label: 'Paragraph centered',
      author: 'Alex Reviewer',
    });
    expect(helpers._builderExportPreflight(document, 'html').issues.map((issue) => issue.code)).toContain('pending-changes');

    helpers._builderSetTrackedMarkupView(document, 'original');
    expect(document.body.getAttribute('data-allo-tracked-view')).toBe('original');
    expect(paragraph.style.textAlign).toBe('left');
    helpers._builderSetTrackedMarkupView(document, 'all');
    expect(paragraph.style.textAlign).toBe('center');

    const originalMarkup = document.body.innerHTML;
    const resume = helpers._builderSuspendTrackedChanges(document.body);
    expect(document.body.querySelector('[data-allo-change-kind]')).toBeNull();
    expect(document.querySelector('p').style.textAlign).toBe('center');
    resume();
    expect(document.body.innerHTML).toBe(originalMarkup);

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.querySelector('[data-allo-change-kind]')).toBeNull();
    expect(accepted.querySelector('p').style.textAlign).toBe('center');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('[data-allo-change-kind]')).toBeNull();
    expect(rejected.querySelector('p').style.textAlign).toBe('left');
  });

  it('tracks inline formatting without losing the selected text', () => {
    document.body.innerHTML = '<p>Alpha beta gamma.</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    const text = document.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 10);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);

    const result = helpers._builderTrackInlineFormatting(document, 'bold', null, 'Bold formatting', () => {
      const marker = document.querySelector('[data-allo-change-kind="inline-format"]');
      marker.style.fontWeight = '700';
      return true;
    });
    expect(result.ok).toBe(true);
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({ type: 'format', text: 'beta' });

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.textContent).toBe('Alpha beta gamma.');
    expect(accepted.querySelector('span')?.style.fontWeight).toBe('700');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.textContent).toBe('Alpha beta gamma.');
    expect(rejected.querySelector('span')).toBeNull();
  });

  it('accepts or rejects inserted and deleted structural revisions', () => {
    document.body.innerHTML = '<p>Alpha</p>';
    const rule = document.createElement('hr');
    document.body.appendChild(rule);
    helpers._builderRecordInsertedStructure(rule, 'Inserted horizontal rule');
    expect(helpers._builderTrackedChangeEntries(document)[0].type).toBe('structure');

    const acceptedInsert = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedInsert, 'accept');
    expect(acceptedInsert.querySelector('hr')).not.toBeNull();
    expect(acceptedInsert.querySelector('[data-allo-change-id]')).toBeNull();

    const rejectedInsert = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedInsert, 'reject');
    expect(rejectedInsert.querySelector('hr')).toBeNull();

    document.body.innerHTML = '<p>Alpha</p><div data-allo-section-break="next-page" data-allo-section-name="Review" style="break-before:page"></div>';
    const section = document.querySelector('[data-allo-section-break]');
    helpers._builderRecordDeletedStructure(section, 'Deleted section break');
    expect(document.querySelector('[data-allo-change-kind="structure-delete"]')).not.toBeNull();

    const acceptedDelete = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedDelete, 'accept');
    expect(acceptedDelete.querySelector('[data-allo-section-break]')).toBeNull();

    const rejectedDelete = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedDelete, 'reject');
    expect(rejectedDelete.querySelector('[data-allo-section-break]')?.getAttribute('data-allo-section-name')).toBe('Review');
  });

  it('compares the current document with a local snapshot without mutating either version', () => {
    const snapshot = '<!DOCTYPE html><html><head><title>Version</title></head><body><h1>Title</h1><p>Old text</p></body></html>';
    document.documentElement.lang = 'en';
    document.title = 'Current';
    document.body.innerHTML = '<h1>Title</h1><p>New text with more words</p><p>Added paragraph</p>';
    const before = document.body.innerHTML;
    const result = helpers._builderCompareDocumentVersions(document, snapshot);

    expect(result).toMatchObject({
      ok: true,
      added: 1,
      modified: 1,
      unchanged: 1,
      beforeWords: 3,
      afterWords: 8,
      wordDelta: 5,
    });
    expect(result.excerpts.map((item) => item.kind)).toEqual(expect.arrayContaining(['modified', 'added']));
    expect(result.excerpts.find((item) => item.kind === 'modified')).toMatchObject({ beforeIndex: 1, afterIndex: 1, beforeTag: 'p', afterTag: 'p' });
    expect(document.body.innerHTML).toBe(before);
  });

  it('restores one modified block while preserving unrelated current content', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.removeAttribute('data-allo-reviewer-name');
    const snapshot = '<!DOCTYPE html><html><body><h1>Title</h1><p>Saved paragraph</p><p>Unchanged ending</p></body></html>';
    document.body.innerHTML = '<h1>Title</h1><p>Current paragraph</p><p>Unchanged ending</p><p>New appendix</p>';
    const comparison = helpers._builderCompareDocumentVersions(document, snapshot);
    const modified = comparison.excerpts.find((excerpt) => excerpt.kind === 'modified');
    const restored = helpers._builderRestoreVersionBlock(document, snapshot, modified);

    expect(restored).toMatchObject({ ok: true, tracked: false });
    expect(Array.from(document.querySelectorAll('p')).map((node) => node.textContent)).toEqual(['Saved paragraph', 'Unchanged ending', 'New appendix']);
  });

  it('records a version block restore as a reversible structural change when tracking is on', () => {
    const snapshot = '<!DOCTYPE html><html><body><h1>Title</h1><p>Saved paragraph</p></body></html>';
    document.body.innerHTML = '<h1>Title</h1><p>Current paragraph</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');
    const comparison = helpers._builderCompareDocumentVersions(document, snapshot);
    const modified = comparison.excerpts.find((excerpt) => excerpt.kind === 'modified');
    const restored = helpers._builderRestoreVersionBlock(document, snapshot, modified);

    expect(restored).toMatchObject({ ok: true, tracked: true });
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({
      type: 'structure',
      label: 'Restored block from version history',
      author: 'Jordan Reviewer',
    });

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.querySelector('p')?.textContent).toBe('Saved paragraph');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('p')?.textContent).toBe('Current paragraph');
  });
  it('inserts and live-refreshes an automatic table of contents without inflating document statistics', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1 data-allo-style="title">Guide</h1><p>Opening words</p><h2>Start here</h2><p>Useful details</p><h3>Deep detail</h3><p>More context</p>';
    const wordsBefore = helpers._builderWordCount(document);

    const inserted = helpers._builderInsertTableOfContents(document, { maxLevel: 2 });
    const nav = document.querySelector('nav[data-allo-toc]');

    expect(inserted).toMatchObject({ ok: true, existing: false, count: 2 });
    expect(nav?.getAttribute('contenteditable')).toBe('false');
    expect(Array.from(nav.querySelectorAll('a')).map((link) => link.textContent)).toEqual(['Guide', 'Start here']);
    expect(Array.from(nav.querySelectorAll('a')).every((link) => link.getAttribute('href')?.startsWith('#'))).toBe(true);
    expect(helpers._builderWordCount(document)).toBe(wordsBefore);
    expect(helpers._builderHeadingOutline(document).map((heading) => heading.text)).toEqual(['Guide', 'Start here', 'Deep detail']);

    document.querySelector('h2').textContent = 'First steps';
    const refreshed = helpers._builderInsertTableOfContents(document, { maxLevel: 3 });
    expect(refreshed).toMatchObject({ ok: true, existing: true, count: 3, updated: true });
    expect(nav.getAttribute('data-allo-toc-depth')).toBe('3');
    expect(Array.from(nav.querySelectorAll('a')).map((link) => link.textContent)).toEqual(['Guide', 'First steps', 'Deep detail']);
  });

  it('keeps tracked TOC refreshes current and rejects the TOC with its editing spacer', () => {
    document.body.innerHTML = '<h1 data-allo-style="title">Tracked guide</h1><h2>Section</h2><p>Body content</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');

    const inserted = helpers._builderInsertTableOfContents(document, { maxLevel: 2 });
    expect(inserted).toMatchObject({ ok: true, existing: false, count: 2 });
    expect(inserted.marker?.getAttribute('data-allo-change-kind')).toBe('structure-insert');
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({ label: 'Inserted automatic table of contents' });

    document.querySelector('h2').textContent = 'Updated section';
    helpers._builderRefreshTableOfContents(document);

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(Array.from(accepted.querySelectorAll('nav[data-allo-toc] a')).at(-1)?.textContent).toBe('Updated section');
    expect(accepted.querySelector('[data-allo-unwrap-on-accept]')).toBeNull();
    expect(accepted.querySelector('div[style*="display:contents"]')).toBeNull();

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('nav[data-allo-toc]')).toBeNull();
    expect(Array.from(rejected.querySelectorAll('p')).map((paragraph) => paragraph.textContent)).toEqual(['Body content']);
  });

  it('moves complete logical heading sections while keeping the document title pinned', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1 data-allo-style="title">Document title</h1><h2>Alpha</h2><p>Alpha body</p><h3>Alpha detail</h3><p>Nested body</p><h2>Beta</h2><p>Beta body</p>';
    const before = helpers._builderHeadingOutline(document);

    expect(before[0]).toMatchObject({ text: 'Document title', movable: false, previousIndex: null, nextIndex: null });
    const moved = helpers._builderMoveHeadingSection(document, 3, 1);

    expect(moved).toMatchObject({ ok: true, tracked: false, moved: 'Beta' });
    expect(Array.from(document.querySelectorAll('h1,h2,h3')).map((heading) => heading.textContent)).toEqual(['Document title', 'Beta', 'Alpha', 'Alpha detail']);
    expect(Array.from(document.querySelectorAll('p')).map((paragraph) => paragraph.textContent)).toEqual(['Beta body', 'Alpha body', 'Nested body']);
  });

  it('records outline reordering as one reversible structural revision', () => {
    document.body.innerHTML = '<h1 data-allo-style="title">Document title</h1><h2>One</h2><p>First body</p><h2>Two</h2><p>Second body</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');

    const moved = helpers._builderMoveHeadingSection(document, 2, 1);
    expect(moved).toMatchObject({ ok: true, tracked: true, moved: 'Two' });
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({
      type: 'structure', label: 'Moved section: Two', author: 'Jordan Reviewer',
    });

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(Array.from(accepted.querySelectorAll('h2')).map((heading) => heading.textContent)).toEqual(['Two', 'One']);

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(Array.from(rejected.querySelectorAll('h2')).map((heading) => heading.textContent)).toEqual(['One', 'Two']);
  });

  it('sanitizes reusable templates and makes tracked template application reversible', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1>Old document</h1><p>Old body</p>';
    const direct = helpers._builderApplyDocumentTemplate(document, {
      label: 'Safe starter',
      html: '<h1 onclick="alert(1)">New document</h1><script>bad()</script><p><a href="javascript:bad()">Start</a></p>',
    });
    expect(direct).toMatchObject({ ok: true, tracked: false });
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('h1')?.hasAttribute('onclick')).toBe(false);
    expect(document.querySelector('a')?.hasAttribute('href')).toBe(false);

    document.body.innerHTML = '<h1>Current document</h1><p>Current body</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');
    const tracked = helpers._builderApplyDocumentTemplate(document, {
      label: 'Report starter', html: '<h1>Report</h1><h2>Summary</h2><p>Write here.</p>',
    });

    expect(tracked).toMatchObject({ ok: true, tracked: true });
    expect(helpers._builderTrackedChangeEntries(document)[0]).toMatchObject({ type: 'structure', label: 'Applied template: Report starter' });
    expect(helpers._builderApplyDocumentTemplate(document, { label: 'Another', html: '<h1>Another</h1>' })).toMatchObject({ ok: false });

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.querySelector('h1')?.textContent).toBe('Report');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('h1')?.textContent).toBe('Current document');
  });

  it('creates semantic footnotes, excludes generated labels from word count, and renumbers after removal', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1>Guide</h1><p id="footnote-source">Alpha beta</p>';
    const wordsBefore = helpers._builderWordCount(document);
    const sourceParagraph = document.querySelector('#footnote-source');

    const firstRange = document.createRange();
    firstRange.selectNodeContents(sourceParagraph);
    firstRange.collapse(false);
    const first = helpers._builderInsertFootnote(document, 'Source details', firstRange);

    expect(first).toMatchObject({ ok: true, tracked: false, number: 1 });
    expect(first.reference.querySelector('a')).toMatchObject({ textContent: '1' });
    expect(first.reference.querySelector('a')?.getAttribute('role')).toBe('doc-noteref');
    expect(first.note.getAttribute('role')).toBe('doc-footnote');
    expect(first.note.querySelector('[data-allo-footnote-backlink]')?.getAttribute('href')).toBe('#footnote-ref-' + first.id);
    expect(document.querySelector('[data-allo-footnotes]')?.getAttribute('role')).toBe('doc-endnotes');
    expect(helpers._builderWordCount(document)).toBe(wordsBefore + 2);

    const secondRange = document.createRange();
    secondRange.selectNodeContents(sourceParagraph);
    secondRange.collapse(false);
    const second = helpers._builderInsertFootnote(document, 'Second source', secondRange);
    expect(second).toMatchObject({ ok: true, number: 2 });
    expect(helpers._builderWordCount(document)).toBe(wordsBefore + 4);

    expect(helpers._builderRemoveFootnote(document, first.id)).toMatchObject({ ok: true, tracked: false });
    const remaining = helpers._builderRefreshDocumentReferences(document).footnotes;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ id: second.id, number: 1, broken: false });
    expect(remaining[0].reference.querySelector('a')?.textContent).toBe('1');

    expect(helpers._builderRemoveFootnote(document, second.id)).toMatchObject({ ok: true, tracked: false });
    expect(document.querySelector('[data-allo-footnotes]')).toBeNull();
    expect(helpers._builderWordCount(document)).toBe(wordsBefore);
  });

  it('keeps cross-reference labels live and flags links whose bookmarks were removed', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Reference integrity';
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1>Reference integrity</h1><p id="bookmark-source">Alpha beta concept</p><p id="reference-destination">See </p>';

    const bookmarkRange = document.createRange();
    const bookmarkText = document.querySelector('#bookmark-source').firstChild;
    bookmarkRange.setStart(bookmarkText, 0);
    bookmarkRange.setEnd(bookmarkText, 10);
    const bookmark = helpers._builderInsertBookmark(document, 'Key idea', bookmarkRange);
    expect(bookmark).toMatchObject({ ok: true, tracked: false, name: 'Key idea' });
    expect(bookmark.node.textContent).toBe('Alpha beta');

    const referenceRange = document.createRange();
    referenceRange.selectNodeContents(document.querySelector('#reference-destination'));
    referenceRange.collapse(false);
    const crossReference = helpers._builderInsertCrossReference(document, bookmark.id, 'text', referenceRange);
    expect(crossReference).toMatchObject({ ok: true, tracked: false, targetId: bookmark.id });
    expect(crossReference.node.textContent).toBe('Alpha beta');
    expect(crossReference.node.getAttribute('href')).toBe('#' + bookmark.id);

    bookmark.node.textContent = 'Updated topic';
    const refreshed = helpers._builderRefreshDocumentReferences(document);
    expect(refreshed.crossReferences[0]).toMatchObject({ label: 'Updated topic', broken: false, targetName: 'Key idea' });
    expect(crossReference.node.textContent).toBe('Updated topic');

    const removed = helpers._builderRemoveBookmark(document, bookmark.id);
    expect(removed).toMatchObject({ ok: true, tracked: false });
    expect(document.querySelector('#bookmark-source')?.textContent).toContain('Updated topic');
    expect(removed.references.crossReferences[0].broken).toBe(true);
    expect(crossReference.node.getAttribute('aria-invalid')).toBe('true');
    expect(helpers._builderExportPreflight(document, 'html').issues.map((issue) => issue.code)).toContain('broken-references');

    expect(helpers._builderRemoveCrossReference(document, crossReference.id)).toMatchObject({ ok: true, tracked: false });
    expect(document.querySelector('[data-allo-cross-reference]')).toBeNull();
  });

  it('groups paired footnote insertions and removals into one reversible tracked change', () => {
    document.body.innerHTML = '<p id="tracked-footnote-source">Alpha</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');
    const insertionRange = document.createRange();
    insertionRange.selectNodeContents(document.querySelector('#tracked-footnote-source'));
    insertionRange.collapse(false);

    const inserted = helpers._builderInsertFootnote(document, 'Tracked source', insertionRange);
    expect(inserted).toMatchObject({ ok: true, tracked: true, number: 1 });
    expect(document.querySelectorAll('[data-allo-change-group]')).toHaveLength(2);
    expect(helpers._builderTrackedChangeEntries(document)).toEqual([
      expect.objectContaining({ type: 'structure', label: 'Inserted footnote', author: 'Jordan Reviewer' }),
    ]);

    const acceptedInsertion = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedInsertion, 'accept');
    expect(acceptedInsertion.querySelector('[data-allo-footnote-ref]')).not.toBeNull();
    expect(acceptedInsertion.querySelector('[data-allo-footnote]')).not.toBeNull();
    expect(acceptedInsertion.querySelector('[data-allo-change-id]')).toBeNull();

    const rejectedInsertion = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedInsertion, 'reject');
    expect(rejectedInsertion.querySelector('[data-allo-footnote-ref]')).toBeNull();
    expect(rejectedInsertion.querySelector('[data-allo-footnotes]')).toBeNull();

    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p id="removed-footnote-source">Beta</p>';
    const directRange = document.createRange();
    directRange.selectNodeContents(document.querySelector('#removed-footnote-source'));
    directRange.collapse(false);
    const direct = helpers._builderInsertFootnote(document, 'Keepable source', directRange);
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');

    const removed = helpers._builderRemoveFootnote(document, direct.id);
    expect(removed).toMatchObject({ ok: true, tracked: true });
    expect(document.querySelectorAll('[data-allo-change-group]')).toHaveLength(2);
    expect(helpers._builderTrackedChangeEntries(document)).toEqual([
      expect.objectContaining({ type: 'structure', label: 'Removed footnote' }),
    ]);

    const acceptedRemoval = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedRemoval, 'accept');
    expect(acceptedRemoval.querySelector('[data-allo-footnote-ref]')).toBeNull();
    expect(acceptedRemoval.querySelector('[data-allo-footnotes]')).toBeNull();

    const rejectedRemoval = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedRemoval, 'reject');
    expect(rejectedRemoval.querySelector('[data-allo-footnote-ref]')).not.toBeNull();
    expect(rejectedRemoval.querySelector('[data-allo-footnote]')?.textContent).toContain('Keepable source');
  });

  it('preserves selected bookmark text across tracked insertion and removal decisions', () => {
    document.body.innerHTML = '<p id="tracked-bookmark-source">Keep this text</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    const insertionRange = document.createRange();
    const selectedText = document.querySelector('#tracked-bookmark-source').firstChild;
    insertionRange.setStart(selectedText, 0);
    insertionRange.setEnd(selectedText, 4);

    const inserted = helpers._builderInsertBookmark(document, 'Tracked bookmark', insertionRange);
    expect(inserted).toMatchObject({ ok: true, tracked: true });
    expect(inserted.marker.getAttribute('data-allo-change-kind')).toBe('reference-insert');

    const acceptedInsertion = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedInsertion, 'accept');
    expect(acceptedInsertion.querySelector('[data-allo-bookmark]')?.textContent).toBe('Keep');
    expect(acceptedInsertion.textContent).toContain('Keep this text');

    const rejectedInsertion = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedInsertion, 'reject');
    expect(rejectedInsertion.querySelector('[data-allo-bookmark]')).toBeNull();
    expect(rejectedInsertion.textContent).toContain('Keep this text');

    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p id="bookmark-removal-source">Preserve this phrase</p>';
    const directRange = document.createRange();
    const directText = document.querySelector('#bookmark-removal-source').firstChild;
    directRange.setStart(directText, 0);
    directRange.setEnd(directText, 8);
    const direct = helpers._builderInsertBookmark(document, 'Removable bookmark', directRange);
    document.body.setAttribute('data-allo-track-changes', '1');

    const removed = helpers._builderRemoveBookmark(document, direct.id);
    expect(removed).toMatchObject({ ok: true, tracked: true });
    expect(removed.marker.getAttribute('data-allo-change-kind')).toBe('reference-remove');

    const acceptedRemoval = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedRemoval, 'accept');
    expect(acceptedRemoval.querySelector('[data-allo-bookmark]')).toBeNull();
    expect(acceptedRemoval.textContent).toContain('Preserve this phrase');

    const rejectedRemoval = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedRemoval, 'reject');
    expect(rejectedRemoval.querySelector('[data-allo-bookmark]')?.textContent).toBe('Preserve');
    expect(rejectedRemoval.textContent).toContain('Preserve this phrase');
  });
  it('normalizes source records and formats common APA, MLA, and Chicago author-date citations', () => {
    const record = helpers._builderNormalizeCitationSource({
      id: 'source: unsafe',
      type: 'journal',
      authors: 'Smith, Jordan; Lee, Morgan',
      title: '  Learning   Together  ',
      containerTitle: 'Journal of Inclusive Learning',
      year: '2024',
      volume: '12',
      issue: '3',
      pages: '10-20',
      doi: 'https://doi.org/10.1000/example',
    });

    expect(record).toMatchObject({
      id: 'sourceunsafe',
      type: 'journal',
      authors: ['Smith, Jordan', 'Lee, Morgan'],
      title: 'Learning Together',
      doi: '10.1000/example',
    });
    expect(helpers._builderFormatInlineCitation(record, 'apa', '23')).toBe('(Smith & Lee, 2024, p. 23)');
    expect(helpers._builderFormatInlineCitation(record, 'apa', 'pp. 23-24')).toBe('(Smith & Lee, 2024, pp. 23-24)');
    expect(helpers._builderFormatInlineCitation(record, 'mla', '23')).toBe('(Smith and Lee 23)');
    expect(helpers._builderFormatInlineCitation(record, 'chicago', '23')).toBe('(Smith and Lee 2024, 23)');
    expect(helpers._builderFormatBibliographyEntry(record, 'apa')).toContain('Smith, J., & Lee, M.');
    expect(helpers._builderFormatBibliographyEntry(record, 'apa')).toContain('https://doi.org/10.1000/example');
  });

  it('manages reusable sources, live citation fields, and scoped bibliographies', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Research brief';
    document.body.removeAttribute('data-allo-track-changes');
    document.body.removeAttribute('data-allo-tracked-view');
    document.body.innerHTML = '<h1>Research brief</h1><p id="citation-target">Evidence matters</p>';
    const wordsBeforeCitation = helpers._builderWordCount(document);

    const first = helpers._builderUpsertCitationSource(document, {
      type: 'journal',
      authors: ['Smith, Jordan'],
      title: 'Inclusive Evidence',
      containerTitle: 'Learning Review',
      year: '2024',
      volume: '8',
      issue: '2',
      pages: '15-32',
      doi: '10.1000/inclusive',
    });
    const second = helpers._builderUpsertCitationSource(document, {
      type: 'webpage',
      corporateAuthor: 'Universal Learning Institute',
      title: 'Designing for Everyone',
      year: '2023',
      url: 'https://example.test/design',
    });

    expect(first).toMatchObject({ ok: true, tracked: false });
    expect(second).toMatchObject({ ok: true, tracked: false });
    expect(helpers._builderCitationSources(document)).toHaveLength(2);

    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#citation-target'));
    range.collapse(false);
    const inserted = helpers._builderInsertCitation(document, first.source.id, '23', range);
    expect(inserted).toMatchObject({ ok: true, tracked: false });
    expect(inserted.node.textContent).toBe('(Smith, 2024, p. 23)');
    expect(inserted.node.getAttribute('role')).toBe('doc-biblioref');
    expect(inserted.node.querySelector('[data-allo-citation-link]')?.getAttribute('href')).toBe('#bibliography-source-' + first.source.id);
    expect(helpers._builderWordCount(document)).toBe(wordsBeforeCitation);

    const beforeBibliography = helpers._builderExportPreflight(document, 'html').issues.map((issue) => issue.code);
    expect(beforeBibliography).toContain('bibliography-missing');
    expect(beforeBibliography).not.toContain('broken-citations');

    const bibliography = helpers._builderInsertOrRefreshBibliography(document, { includeUncited: false });
    expect(bibliography).toMatchObject({ ok: true, existing: false, tracked: false });
    expect(bibliography.node.getAttribute('role')).toBe('doc-bibliography');
    expect(bibliography.node.querySelector('[data-allo-bibliography-title]')?.textContent).toBe('References');
    expect(bibliography.node.querySelectorAll('[data-allo-bibliography-source]')).toHaveLength(1);
    expect(bibliography.node.querySelector('[data-allo-bibliography-source]')?.id).toBe('bibliography-source-' + first.source.id);
    expect(bibliography.node.querySelector('a[href="https://doi.org/10.1000/inclusive"]')).not.toBeNull();
    expect(helpers._builderHeadingOutline(document).map((entry) => entry.text)).toEqual(['Research brief']);

    const mla = helpers._builderSetCitationStyle(document, 'mla');
    expect(mla).toMatchObject({ ok: true, style: 'mla', tracked: false });
    expect(inserted.node.textContent).toBe('(Smith 23)');
    expect(bibliography.node.querySelector('[data-allo-bibliography-title]')?.textContent).toBe('Works Cited');

    const edited = helpers._builderUpsertCitationSource(document, { ...first.source, title: 'Revised Inclusive Evidence', year: '2025' }, 'mla');
    expect(edited).toMatchObject({ ok: true, tracked: false });
    expect(bibliography.node.textContent).toContain('Revised Inclusive Evidence');
    helpers._builderSetCitationStyle(document, 'chicago');
    expect(inserted.node.textContent).toBe('(Smith 2025, 23)');

    const expanded = helpers._builderInsertOrRefreshBibliography(document, { includeUncited: true });
    expect(expanded.existing).toBe(true);
    expect(expanded.node.getAttribute('data-allo-bibliography-scope')).toBe('all');
    expect(expanded.node.querySelectorAll('[data-allo-bibliography-source]')).toHaveLength(2);
    expect(helpers._builderRemoveCitationSource(document, first.source.id)).toMatchObject({ ok: false });
    expect(helpers._builderRemoveCitationSource(document, second.source.id)).toMatchObject({ ok: true });
    expect(expanded.node.querySelectorAll('[data-allo-bibliography-source]')).toHaveLength(1);

    expect(helpers._builderRemoveCitation(document, inserted.id)).toMatchObject({ ok: true, tracked: false });
    expect(helpers._builderRemoveCitationSource(document, first.source.id)).toMatchObject({ ok: true });
    expect(expanded.node.querySelector('[data-allo-bibliography-empty]')).not.toBeNull();
  });

  it('separates broken citations from bookmark and footnote integrity warnings', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Citation integrity';
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<h1>Citation integrity</h1><p id="broken-citation-target">Claim</p>';
    const sourceResult = helpers._builderUpsertCitationSource(document, {
      type: 'book', authors: ['Rivera, Alex'], title: 'Evidence Guide', year: '2022',
    });
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#broken-citation-target'));
    range.collapse(false);
    const citation = helpers._builderInsertCitation(document, sourceResult.source.id, '', range);
    document.querySelector('[data-allo-citation-store]').textContent = '[]';

    const refreshed = helpers._builderRefreshDocumentReferences(document);
    expect(refreshed).toMatchObject({ documentBrokenCount: 0, citationBrokenCount: 1, brokenCount: 1 });
    expect(citation.node.getAttribute('aria-invalid')).toBe('true');
    const codes = helpers._builderExportPreflight(document, 'html').issues.map((issue) => issue.code);
    expect(codes).toContain('broken-citations');
    expect(codes).toContain('bibliography-missing');
    expect(codes).not.toContain('broken-references');
  });

  it('tracks source, style, citation, and bibliography changes as reversible revisions', () => {
    document.body.innerHTML = '<p>Tracked research</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');
    const sourceResult = helpers._builderUpsertCitationSource(document, {
      type: 'book', authors: ['Chen, Riley'], title: 'Tracked Sources', publisher: 'Example Press', year: '2026',
    });
    expect(sourceResult).toMatchObject({ ok: true, tracked: true });
    expect(helpers._builderTrackedChangeEntries(document)).toEqual([
      expect.objectContaining({ type: 'structure', label: 'Added source: Tracked Sources', author: 'Jordan Reviewer' }),
    ]);

    const acceptedSource = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedSource, 'accept');
    expect(JSON.parse(acceptedSource.querySelector('[data-allo-citation-store]').textContent)).toHaveLength(1);
    expect(acceptedSource.querySelector('[data-allo-change-id]')).toBeNull();

    const rejectedSource = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedSource, 'reject');
    expect(JSON.parse(rejectedSource.querySelector('[data-allo-citation-store]').textContent)).toEqual([]);

    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p>Style test</p>';
    const directSource = helpers._builderUpsertCitationSource(document, {
      type: 'webpage', corporateAuthor: 'Example Institute', title: 'Style Guide', year: '2025',
    });
    document.body.setAttribute('data-allo-track-changes', '1');
    const styleResult = helpers._builderSetCitationStyle(document, 'mla');
    expect(styleResult).toMatchObject({ ok: true, tracked: true });
    const acceptedStyle = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedStyle, 'accept');
    expect(acceptedStyle.querySelector('[data-allo-citation-store]')?.getAttribute('data-allo-citation-style')).toBe('mla');
    const rejectedStyle = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedStyle, 'reject');
    expect(rejectedStyle.querySelector('[data-allo-citation-store]')?.getAttribute('data-allo-citation-style')).toBe('apa');

    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p id="tracked-citation-target">Tracked claim</p>';
    const liveSource = helpers._builderUpsertCitationSource(document, {
      id: directSource.source.id, type: 'webpage', corporateAuthor: 'Example Institute', title: 'Style Guide', year: '2025',
    });
    document.body.setAttribute('data-allo-track-changes', '1');
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#tracked-citation-target'));
    range.collapse(false);
    const citation = helpers._builderInsertCitation(document, liveSource.source.id, '4', range);
    const bibliography = helpers._builderInsertOrRefreshBibliography(document, { includeUncited: false });
    expect(citation).toMatchObject({ ok: true, tracked: true });
    expect(bibliography).toMatchObject({ ok: true, tracked: true });

    const acceptedFields = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(acceptedFields, 'accept');
    expect(acceptedFields.querySelector('[data-allo-citation]')).not.toBeNull();
    expect(acceptedFields.querySelector('[data-allo-bibliography]')).not.toBeNull();

    const rejectedFields = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejectedFields, 'reject');
    expect(rejectedFields.querySelector('[data-allo-citation]')).toBeNull();
    expect(rejectedFields.querySelector('[data-allo-bibliography]')).toBeNull();
  });

  it('recomputes accepted citation and bibliography fields when exporting from Original review view', () => {
    document.body.innerHTML = '<h1>Export fields</h1><p id="review-export-target">Claim</p>';
    document.body.removeAttribute('data-allo-track-changes');
    const sourceResult = helpers._builderUpsertCitationSource(document, {
      type: 'book', authors: ['Patel, Morgan'], title: 'Original View Export', publisher: 'Example Press', year: '2024',
    });
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#review-export-target'));
    range.collapse(false);
    const citation = helpers._builderInsertCitation(document, sourceResult.source.id, '7', range);
    helpers._builderInsertOrRefreshBibliography(document, { includeUncited: false });

    document.body.setAttribute('data-allo-track-changes', '1');
    helpers._builderSetCitationStyle(document, 'mla');
    expect(citation.node.textContent).toBe('(Patel 7)');
    helpers._builderSetTrackedMarkupView(document, 'original');
    expect(citation.node.textContent).toBe('(Patel, 2024, p. 7)');

    const finalBody = helpers._builderFinalizeDocumentForExport(document.body.cloneNode(true));
    expect(finalBody.getAttribute('data-allo-tracked-view')).toBeNull();
    expect(finalBody.querySelector('[data-allo-citation]')?.textContent).toBe('(Patel 7)');
    expect(finalBody.querySelector('[data-allo-citation]')?.hasAttribute('tabindex')).toBe(false);
    expect(finalBody.querySelector('[data-allo-citation]')?.hasAttribute('aria-keyshortcuts')).toBe(false);
    expect(finalBody.querySelector('[data-allo-citation-link]')?.hasAttribute('tabindex')).toBe(false);
    expect(finalBody.querySelector('[data-allo-bibliography-title]')?.textContent).toBe('Works Cited');
    expect(finalBody.querySelector('[data-allo-change-id]')).toBeNull();
    expect(finalBody.querySelector('[data-allo-citation-store]')).not.toBeNull();
  });


  it('upgrades legacy citation fields and renders linked multi-source clusters with item controls', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p>Clustered evidence <span data-allo-citation="1" data-allo-citation-id="legacy-citation" data-allo-citation-source="source-one" data-allo-citation-locator="4">(old label)</span></p>';
    helpers._builderUpsertCitationSource(document, {
      id: 'source-one', type: 'book', authors: ['Smith, Jordan'], title: 'First Evidence', year: '2024',
    });
    helpers._builderUpsertCitationSource(document, {
      id: 'source-two', type: 'journal', authors: ['Lee, Morgan'], title: 'Second Evidence', year: '2023',
    });

    const legacy = document.querySelector('[data-allo-citation]');
    helpers._builderRefreshCitationFields(document);
    expect(JSON.parse(legacy.getAttribute('data-allo-citation-items'))).toEqual([
      { sourceId: 'source-one', locator: '4', prefix: '', suffix: '', suppressAuthor: false, suppressYear: false },
    ]);
    expect(legacy.getAttribute('tabindex')).toBe('0');
    expect(legacy.getAttribute('aria-keyshortcuts')).toBe('Enter');

    const updated = helpers._builderUpdateCitation(document, 'legacy-citation', [
      { sourceId: 'source-one', locator: '4', prefix: 'see', suppressYear: true },
      { sourceId: 'source-two', locator: '11', suffix: 'emphasis added', suppressAuthor: true },
    ]);
    expect(updated).toMatchObject({ ok: true, tracked: false });
    expect(legacy.textContent).toBe('(see Smith, p. 4; 2023, p. 11 emphasis added)');
    expect(legacy.getAttribute('data-allo-citation-source')).toBe('source-one');
    expect(legacy.getAttribute('data-allo-citation-locator')).toBe('4');
    expect(Array.from(legacy.querySelectorAll('[data-allo-citation-link]')).map((link) => link.getAttribute('href'))).toEqual([
      '#bibliography-source-source-one', '#bibliography-source-source-two',
    ]);

    const bibliography = helpers._builderInsertOrRefreshBibliography(document, { includeUncited: false });
    expect(bibliography.node.querySelectorAll('[data-allo-bibliography-source]')).toHaveLength(2);
    expect(helpers._builderCitationEntries(document)).toMatchObject({ citedSourceCount: 2, brokenCount: 0 });
    expect(helpers._builderRemoveCitationSource(document, 'source-two')).toMatchObject({ ok: false });
  });

  it('records citation cluster edits as one reversible tracked revision', () => {
    document.body.removeAttribute('data-allo-track-changes');
    document.body.innerHTML = '<p id="citation-edit-target">Claim</p>';
    const first = helpers._builderUpsertCitationSource(document, {
      id: 'tracked-source-one', type: 'book', authors: ['Patel, Morgan'], title: 'Original Source', year: '2022',
    }).source;
    const second = helpers._builderUpsertCitationSource(document, {
      id: 'tracked-source-two', type: 'report', corporateAuthor: 'Example Institute', title: 'Added Source', year: '2025',
    }).source;
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#citation-edit-target'));
    range.collapse(false);
    const inserted = helpers._builderInsertCitation(document, first.id, '7', range);
    document.body.setAttribute('data-allo-track-changes', '1');
    document.body.setAttribute('data-allo-reviewer-name', 'Jordan Reviewer');

    const edited = helpers._builderUpdateCitation(document, inserted.id, [
      { sourceId: first.id, locator: '8', suppressYear: true },
      { sourceId: second.id, prefix: 'compare', suffix: 'updated' },
    ]);
    expect(edited).toMatchObject({ ok: true, tracked: true });
    expect(edited.marker.getAttribute('data-allo-change-kind')).toBe('reference-update');
    expect(helpers._builderTrackedChangeEntries(document)).toEqual([
      expect.objectContaining({ type: 'structure', label: expect.stringContaining('Edited citation'), author: 'Jordan Reviewer' }),
    ]);

    const accepted = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(accepted, 'accept');
    expect(accepted.querySelector('[data-allo-citation]')?.textContent).toBe('(Patel, p. 8; compare Example Institute, 2025 updated)');
    expect(JSON.parse(accepted.querySelector('[data-allo-citation]')?.getAttribute('data-allo-citation-items'))).toHaveLength(2);

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(rejected.querySelector('[data-allo-citation]')?.textContent).toBe('(Patel, 2022, p. 7)');
    expect(JSON.parse(rejected.querySelector('[data-allo-citation]')?.getAttribute('data-allo-citation-items'))).toHaveLength(1);
  });

  it('parses RIS and BibTeX source records with bounded normalized metadata', () => {
    const ris = helpers._builderParseCitationImport([
      'TY  - JOUR',
      'AU  - Smith, Jordan',
      'AU  - Lee, Morgan',
      'TI  - Inclusive Learning',
      'JO  - Learning Review',
      'PY  - 2024/03/14',
      'VL  - 12',
      'IS  - 2',
      'SP  - 21',
      'EP  - 29',
      'DO  - https://doi.org/10.1000/example',
      'ER  -',
      'TY  - RPRT',
      'A2  - Example Institute',
      'T1  - Research Brief',
      'PY  - 2025',
      'UR  - https://example.test/brief',
      'ER  -',
    ].join('\n'), 'auto');
    expect(ris).toMatchObject({ format: 'ris', errors: [] });
    expect(ris.sources).toHaveLength(2);
    expect(ris.sources[0]).toMatchObject({
      type: 'journal', authors: ['Smith, Jordan', 'Lee, Morgan'], title: 'Inclusive Learning',
      containerTitle: 'Learning Review', year: '2024', volume: '12', issue: '2',
      pages: '21?29', doi: '10.1000/example',
    });
    expect(ris.sources[1]).toMatchObject({ type: 'report', corporateAuthor: 'Example Institute', title: 'Research Brief' });

    const bibtex = helpers._builderParseCitationImport(String.raw`@article{inclusive,
  author = {Rivera, Alex and Chen, Riley},
  title = {Learning {Together}},
  journal = {Inclusive Education Quarterly},
  year = {2026},
  pages = {10--14},
  doi = {10.2000/together}
}`, 'auto');
    expect(bibtex).toMatchObject({ format: 'bibtex', errors: [] });
    expect(bibtex.sources).toEqual([
      expect.objectContaining({
        type: 'journal', authors: ['Rivera, Alex', 'Chen, Riley'], title: 'Learning Together',
        containerTitle: 'Inclusive Education Quarterly', year: '2026', pages: '10?14', doi: '10.2000/together',
      }),
    ]);
    expect(helpers._builderParseCitationImport('not a source record', 'auto').errors).toHaveLength(1);
  });

  it('maps Crossref metadata and imports source groups with duplicate detection and rollback', () => {
    const crossref = helpers._builderCitationSourceFromCrossref({
      type: 'journal-article',
      author: [{ family: 'Nguyen', given: 'Avery' }, { family: 'Garcia', given: 'Sam' }],
      title: ['Universal Design Evidence'],
      'container-title': ['Education Research'],
      publisher: 'Example Publisher',
      issued: { 'date-parts': [[2026, 4, 2]] },
      volume: '8', issue: '1', page: '33-48',
      DOI: '10.3000/udl', URL: 'https://doi.org/10.3000/udl',
    });
    expect(crossref).toMatchObject({
      type: 'journal', authors: ['Nguyen, Avery', 'Garcia, Sam'], title: 'Universal Design Evidence',
      containerTitle: 'Education Research', year: '2026', volume: '8', issue: '1',
      pages: '33-48', doi: '10.3000/udl',
    });

    document.body.innerHTML = '<p>Imported sources</p>';
    document.body.setAttribute('data-allo-track-changes', '1');
    const imported = helpers._builderImportCitationSources(document, [
      crossref,
      { ...crossref, id: 'duplicate-copy', title: 'Duplicate title is ignored by DOI' },
      { type: 'book', authors: ['Brooks, Taylor'], title: 'Distinct Book', year: '2024', publisher: 'Example Press' },
    ]);
    expect(imported).toMatchObject({ ok: true, duplicateCount: 1, tracked: true });
    expect(imported.added).toHaveLength(2);
    expect(imported.marker.getAttribute('data-allo-change-kind')).toBe('reference-update');

    const rejected = document.body.cloneNode(true);
    helpers._builderFinalizeTrackedChanges(rejected, 'reject');
    expect(JSON.parse(rejected.querySelector('[data-allo-citation-store]').textContent)).toEqual([]);

    document.body.removeAttribute('data-allo-track-changes');
    const repeated = helpers._builderImportCitationSources(document, [crossref]);
    expect(repeated).toMatchObject({ ok: true, duplicateCount: 1, tracked: false });
    expect(repeated.added).toHaveLength(0);
    expect(helpers._builderCitationSources(document)).toHaveLength(2);
  });

  it('bounds and sanitizes persistent custom style and template definitions', () => {
    const styles = helpers._builderNormalizeCustomStyles([
      { id: 'Fancy style', label: '  Fancy style  ', tag: 'script', style: { color: '#123456', fontSize: '18px', backgroundColor: 'url(javascript:bad)', unknown: 'ignored' } },
    ]);
    expect(styles).toEqual([expect.objectContaining({
      id: 'custom-Fancystyle', label: 'Fancy style', tag: 'p', custom: true,
      style: { color: '#123456', fontSize: '18px' },
    })]);
    expect(helpers._builderNormalizeCustomStyles(Array.from({ length: 20 }, (_, index) => ({ label: 'Style ' + index, style: {} })))).toHaveLength(12);

    const templates = helpers._builderNormalizeCustomDocumentTemplates([
      { id: 'starter', label: ' Starter ', html: '<h1>Starter</h1>', description: ' Saved here ' },
      { id: 'empty', label: 'Empty', html: '<p> </p>' },
    ]);
    expect(templates).toEqual([expect.objectContaining({ id: 'custom-starter', label: 'Starter', description: 'Saved here', custom: true })]);
    expect(helpers._builderNormalizeCustomDocumentTemplates(Array.from({ length: 12 }, (_, index) => ({ label: 'Template ' + index, html: '<p>Content</p>' })))).toHaveLength(8);
  });

  it('preflights H5P compatibility and embedded media before export', () => {
    const quiz = helpers._builderH5PCompatibility({
      type: 'quiz',
      data: { questions: [
        { question: 'Ready?', options: ['Yes', 'No'], correctAnswer: 'Yes' },
        { question: 'Too many', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'A' },
      ] },
    });
    expect(quiz).toMatchObject({ library: 'Single Choice Set 1.11', total: 2, valid: 1, omitted: 1, ready: true });

    const mixed = helpers._builderH5PCompatibility({
      type: 'quiz',
      data: { questions: [
        { type: 'multi-select', question: 'Select both', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] },
        { type: 'short-answer', question: 'Explain why.', expectedAnswer: 'Because.' },
        { type: 'numeric-response', question: 'How much?', correctValue: 5, tolerance: 0.2 },
      ] },
    });
    expect(mixed).toMatchObject({ library: 'Question Set 1.21', total: 3, valid: 3, adapted: 1, manualReview: 2, omitted: 0, ready: true });

    const cards = helpers._builderH5PCompatibility({
      type: 'glossary',
      data: [
        { term: 'Atom', def: 'A unit', image: 'data:image/png;base64,aGVsbG8=', audio: 'data:audio/mpeg;base64,aGVsbG8=' },
        { term: 'Remote', def: 'External', image: 'https://example.test/remote.png' },
        { term: 'Incomplete', def: '' },
      ],
    });
    expect(cards).toMatchObject({ library: 'Dialog Cards 1.9', total: 3, valid: 2, omitted: 1, embeddedMedia: 2, omittedMedia: 1, ready: true });
    expect(helpers._builderH5PCompatibility({ type: 'faq', data: [] }).ready).toBe(false);
  });

  it('persists margins in versioned presets and refreshes live document statistics', () => {
    expect(host).toContain("pageMargin: '1in'");
    expect(host).toContain('const _EXPORT_PRESET_SCHEMA_VERSION = 3');
    expect(source).toContain("setExportConfigAndRefresh(p => ({ ...p, pageMargin: m.val }))");
    expect(source).toContain('refreshDocumentStats();');
    expect(compiled).toContain('wordCount.toLocaleString()');
  });

  it('packages EPUB raster images, preserves regional language tags, and catches ZIP failures', () => {
    expect(source).toContain("zip.file('OEBPS/' + path");
    expect(source).toContain('_imageManifest.push');
    expect(source).toContain("_contentProps.push('remote-resources')");
    expect(source).toContain("replace(/_/g, '-')");
    expect(source).toContain("ePub export failed:");
    expect(compiled).toContain('_imageManifest.join');
  });

  it('keeps package sources explicit and alternate downloads reliable and offline-aware', () => {
    document.documentElement.lang = 'en';
    document.title = 'Remote resource lesson';
    document.body.innerHTML = '<h1>Lesson</h1><img src="https://example.test/image.png" alt="Diagram"><style>@import url(https://example.test/font.css);</style><audio src="https://example.test/audio.mp3"></audio>';
    const result = helpers._builderExportPreflight(document, 'epub');
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['epub-images', 'epub-styles']));
    expect(source).toContain("add('warning', 'epub-media'");
    expect(source).toContain('aria-label="Quiz to export as QTI"');
    expect(source).toContain('await handler({ generatedContent: selected.item })');
    expect(source).toContain('await handler({ liveHtml: clean.html, liveTitle: clean.title })');
    expect(source).toContain('const downloadBuilderBlob = React.useCallback');
    expect(source).toContain("downloadBuilderBlob(blob, { extension: 'epub' })");
    expect(source).toContain("response = await fetch(absolute");
    expect(source).toContain(".replace(/@font-face");
    expect(exportSource).toContain('builder-live-document');
    expect(compiled).toContain('Building ePub...');
  });

  it('adds preflight, find/replace, heading navigation, Office, and contextual assessment exports', () => {
    for (const label of ['Run export preflight checks', 'Find / Replace | Heading Outline', 'Accessible Word (.docx)', 'OpenDocument (.odt)', 'QTI quiz package', 'H5P interactive activity (.h5p)', 'IMS content package']) {
      expect(source).toContain(label);
    }
    expect(source).toContain("const hasAssessmentContent =");
    expect(host).toContain('getSkippedResources, handleExportH5P, handleExportIMS, handleExportQTI, history');
  });

  it('exposes the tested Office builders through a narrow shared API', () => {
    expect(pdfSource).toContain('async function _buildAccessibleOfficeExport');
    expect(pdfSource).toContain('_buildDocxBlobFromSpec(spec, d, DOC_MODES.standard)');
    expect(pdfSource).toContain('_htmlToOdtPackageParts(html)');
    expect(pdfCompiled).toContain('window.AlloModules.AccessibleOfficeExport = { build: _buildAccessibleOfficeExport }');
  });
});
