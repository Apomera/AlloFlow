import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import parser from '@babel/parser';

const source = readFileSync('story_forge_source.jsx', 'utf8');
const ast = parser.parse(source, { sourceType: 'script', plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'] });
const buttons = [];
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && node.name.name === 'button') buttons.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
};
visit(ast);

describe('Story Forge button behavior', () => {
  it('gives every JSX button an explicit non-submit type', () => {
    const missing = buttons.filter((node) => !node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type'));
    expect(missing.map((node) => node.loc.start.line)).toEqual([]);
    expect(buttons.some((node) => node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type' && a.value?.value === 'submit'))).toBe(false);
  });
  it('gives every exported HTML button an explicit type', () => {
    const rawButtons = source.match(/<button\b[^>]*>/g) || [];
    expect(rawButtons.filter((tag) => !/\btype=["']button["']/.test(tag))).toEqual([]);
    expect(rawButtons.length).toBeGreaterThanOrEqual(5);
  });
});
describe('Story Forge comic production controls', () => {
  it('provides keyboard parity for panel and lettering resize handles', () => {
    expect(source).toContain('const handlePanelResizeKeyDown =');
    expect(source).toContain('onKeyDown={(e) => handlePanelResizeKeyDown(e, p.id, idx, previewLayout, pageIndex)}');
    expect(source).toContain("onKeyDown={(e) => handleBubbleControlKeyDown(e, p.id, 'resize')}");
    expect(source).toContain('Use arrow keys, Home for 1 by 1, or End for the largest frame.');
  });

  it('uses an accessible single-page comic preview navigator', () => {
    expect(source).toContain('role="tablist" aria-label="Comic pages"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-controls={`sf-comic-preview-page-${page.page}`}');
    expect(source).toContain('aria-selected={comicPreviewPage === page.page}');
  });

  it('supports true panel drag reordering with a keyboard-equivalent handle', () => {
    expect(source).toContain('const movePanelToIndex =');
    expect(source).toContain('const handlePanelSequenceKeyDown =');
    expect(source).toContain('onDrop={(e) => finishPanelSequenceDrop(e, idx)}');
    expect(source).toContain('draggable="true"');
    expect(source).toContain('data-sf-panel-drag-handle={p.id}');
    expect(source).toContain('Use arrow keys, Home, or End.');
  });

  it('exposes bounded comic undo and redo without overriding native text undo', () => {
    expect(source).toContain('const comicHistoryRef = useRef(');
    expect(source).toContain('const nativeTextUndo = Boolean(');
    expect(source).toContain('aria-label="Undo comic production edit"');
    expect(source).toContain('aria-label="Redo comic production edit"');
    expect(source).toContain('aria-keyshortcuts="Control+Z Meta+Z"');
    expect(source).toContain('aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"');
  });
});
describe('Story Forge draft recovery controls', () => {
  it('guards autosave until draft hydration is resolved and reports save state', () => {
    expect(source).toContain("if (draftHydrationState !== 'ready' || showRestorePrompt)");
    expect(source).toContain('Hydrate before autosave is allowed to run.');
    expect(source).toContain('persistDraftToStorage({ announce: true })');
    expect(source).toContain('data-sf-draft-save');
    expect(source).toContain('data-sf-draft-save-live');
    expect(source).toContain("setDraftSaveState('error')");
    expect(source).toContain('setIsDirty(false)');
  });

  it('keeps the close dialog open on save failure and preserves the last confirmed draft', () => {
    expect(source).toContain('data-sf-save-close');
    expect(source).toContain('if (persistDraftToStorage({ announce: true, allowDuringHydration: true }))');
    expect(source).toContain('close and keep the last confirmed draft');
    expect(source).not.toContain('setShowCloseConfirm(false); try { localStorage.removeItem(SAVE_KEY);');
  });

  it('uses the centralized sanitizer for browser restore and file import', () => {
    expect(source).toContain('const data = sanitizeStoryForgeDraft(JSON.parse(saved));');
    expect(source).toContain('const draft = applySanitizedDraft(savedDraftRef.current);');
    expect(source).toContain('applySanitizedDraft({ ...d, phase: importedPhase });');
    expect(source).toContain('language, customLanguage, storyShape');
    expect(source).toContain('genre, language, customLanguage, vocabTerms, storyShape');
  });
});

describe('Story Forge readiness focus routing', () => {
  it('routes production findings to exact fields and affected panels', () => {
    expect(source).toContain('const getReadinessFocusTarget = (issue) =>');
    expect(source).toContain("return 'sf-title'");
    expect(source).toContain("return 'sf-new-vocab-term'");
    expect(source).toContain('`sf-paragraph-text-${id}`');
    expect(source).toContain('`sf-illustrate-${id}`');
    expect(source).toContain('`sf-lettering-${id}`');
    expect(source).toContain("return 'sf-comic-continuity'");
    expect(source).toContain("return 'sf-review-tools'");
    expect(source).toContain("changePhase(issue.phase || 'write', getReadinessFocusTarget(issue))");
  });

  it('provides focusable target markup and contrast-aware save styling', () => {
    expect(source).toContain('id="sf-new-vocab-term"');
    expect(source).toContain('id={`sf-paragraph-text-${p.id}`}');
    expect(source).toContain('id={`sf-illustrate-${p.id}`}');
    expect(source).toContain('id={`sf-lettering-${p.id}`}');
    expect(source).toContain('id="sf-comic-continuity"');
    expect(source).toContain('id="sf-review-tools"');
    expect(source).toContain('.sf-modal-root.theme-contrast .sf-draft-save');
  });
});