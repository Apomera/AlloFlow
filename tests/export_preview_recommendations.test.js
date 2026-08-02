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
const helpers = new Function(source.slice(helperStart, helperEnd) + '\nreturn { _builderWordCount, _builderDocumentStatistics, _builderSelectionStatistics, _builderHeadingOutline, _builderTableOfContentsEntries, _builderInsertTableOfContents, _builderRefreshTableOfContents, _builderMoveHeadingSection, _builderApplyDocumentTemplate, _builderNormalizeCustomStyles, _builderNormalizeCustomDocumentTemplates, _builderExportPreflight, _builderH5PCompatibility, _builderInsertReviewComment, _builderCommentEntries, _builderSetCommentThread, _builderStripReviewComments, _builderHandleTrackedBeforeInput, _builderTrackedChangeEntries, _builderFinalizeTrackedChanges, _builderSuspendTrackedChanges, _builderCaptureElementRevision, _builderRecordElementRevision, _builderRecordInsertedStructure, _builderRecordDeletedStructure, _builderTrackInlineFormatting, _builderApplyTrackedChange, _builderSetTrackedMarkupView, _builderCompareDocumentVersions, _builderRestoreVersionBlock, _builderReviewerIdentity, _builderNormalizeQuickAccessItems };')();

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
