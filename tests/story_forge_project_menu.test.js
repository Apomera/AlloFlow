import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import parser from '@babel/parser';

const source = readFileSync('story_forge_source.jsx', 'utf8');
const ast = parser.parse(source, {
  sourceType: 'script',
  plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'],
});

const jsxName = (element) => (
  element?.openingElement?.name?.type === 'JSXIdentifier'
    ? element.openingElement.name.name
    : ''
);
const getAttribute = (element, name) => element?.openingElement?.attributes?.find(attribute => (
  attribute.type === 'JSXAttribute' && attribute.name?.name === name
));
const hasAttribute = (element, name) => Boolean(getAttribute(element, name));
const getStringAttribute = (element, name) => {
  const attribute = getAttribute(element, name);
  return attribute?.value?.type === 'StringLiteral' ? attribute.value.value : '';
};
const collectElements = (node, output = []) => {
  if (!node || typeof node !== 'object') return output;
  if (node.type === 'JSXElement') output.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => collectElements(item, output));
    else if (value && typeof value === 'object') collectElements(value, output);
  }
  return output;
};
const collectNodes = (node, type, output = []) => {
  if (!node || typeof node !== 'object') return output;
  if (node.type === type) output.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => collectNodes(item, type, output));
    else if (value && typeof value === 'object') collectNodes(value, type, output);
  }
  return output;
};
const getVisibleText = (node) => {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'JSXText') return node.value;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'JSXExpressionContainer') return getVisibleText(node.expression);
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return (node.children || []).map(getVisibleText).join(' ');
  }
  return '';
};
const compactText = node => getVisibleText(node).replace(/\s+/g, ' ').trim();
const snippet = node => source.slice(node.start, node.end);

const allElements = collectElements(ast);
const projectMenus = allElements.filter(element => jsxName(element) === 'details' && hasAttribute(element, 'data-sf-project-menu'));
const projectMenu = projectMenus[0];
const menuElements = projectMenu ? collectElements(projectMenu, []) : [];
const menuButton = hook => menuElements.find(element => jsxName(element) === 'button' && hasAttribute(element, hook));

describe('StoryForge persistent Project menu', () => {
  it('keeps project identity and save-state hooks above every phase-specific workspace', () => {
    expect(projectMenus).toHaveLength(1);
    expect(source).toContain('data-sf-header-project-title');
    expect(source).toContain('data-sf-header-artifact');
    expect(source).toContain('data-sf-header-save-state');
    expect(source).toContain('data-sf-project-menu-title');
    expect(source).toContain('data-sf-draft-save');
    expect(source).toContain('data-sf-draft-save-live');
    expect(source).toContain('aria-live="polite" data-sf-draft-save-live');
    expect(snippet(projectMenu)).toContain("storyTitle.trim() || `Untitled ${artifactType === 'comic' ? 'comic' : 'story'}`");
    // The badge text now flows through the artifactLabel binding (i18n wave).
    expect(snippet(projectMenu)).toContain("ta(artifactType === 'comic' ? 'a11y.storyforge_ui_comic' : 'a11y.storyforge_ui_story')");
    expect(snippet(projectMenu)).toContain('{draftSaveLabel}');

    const firstPhaseWorkspace = source.indexOf("{phase === 'configure' && (");
    expect(projectMenu.start).toBeLessThan(firstPhaseWorkspace);
    expect(projectMenu.end).toBeLessThan(firstPhaseWorkspace);
  });

  it('uses native details/summary semantics without nesting a button in the summary', () => {
    const directSummaries = projectMenu.children.filter(child => child.type === 'JSXElement' && jsxName(child) === 'summary');
    expect(directSummaries).toHaveLength(1);
    const summary = directSummaries[0];

    expect(hasAttribute(summary, 'data-sf-project-menu-trigger')).toBe(true);
    expect(hasAttribute(summary, 'data-sf-focusable')).toBe(true);
    // The label is i18n'd (2026-08 wave); assert the expression on the summary instead.
    expect(snippet(summary)).toContain("ta('a11y.storyforge_attr_open_project_menu')");
    expect(collectElements(summary, []).filter(element => jsxName(element) === 'button')).toEqual([]);
    expect(snippet(summary)).toContain("ta('a11y.storyforge_ui_project')");
  });

  it('exposes labeled Save, Export, Import, and Checkpoint actions with stable hooks', () => {
    const contracts = [
      ['data-sf-project-menu-save', "ta('a11y.storyforge_ui_save_project_now')", 'persistDraftToStorage({ announce: true })'],
      ['data-sf-project-menu-export', "ta('a11y.storyforge_ui_export_backup')", 'exportStoryForgeProject()'],
      ['data-sf-project-menu-import', "ta('a11y.storyforge_ui_import_project')", 'onClick={importDraftJSON}'],
      ['data-sf-project-menu-checkpoint', "ta('a11y.storyforge_ui_save_checkpoint')", 'saveRevisionCheckpoint()'],
    ];

    contracts.forEach(([hook, label, handler]) => {
      const button = menuButton(hook);
      expect(button, `missing ${hook}`).toBeTruthy();
      expect(jsxName(button)).toBe('button');
      expect(getStringAttribute(button, 'type')).toBe('button');
      expect(snippet(button)).toContain(label);
      expect(snippet(button)).toContain(handler);
    });
  });

  it('switches to Restore and recovery options while hydration is awaiting a decision', () => {
    const recoveryBranch = collectNodes(projectMenu, 'ConditionalExpression').find(node => (
      snippet(node.test).includes("draftHydrationState === 'awaiting'")
    ));
    expect(recoveryBranch).toBeTruthy();

    const recoveryElements = collectElements(recoveryBranch.consequent, []);
    const normalElements = collectElements(recoveryBranch.alternate, []);
    const recoveryHooks = new Set(recoveryElements.flatMap(element => (
      element.openingElement?.attributes
        ?.filter(attribute => attribute.type === 'JSXAttribute')
        .map(attribute => attribute.name?.name) || []
    )));
    const normalHooks = new Set(normalElements.flatMap(element => (
      element.openingElement?.attributes
        ?.filter(attribute => attribute.type === 'JSXAttribute')
        .map(attribute => attribute.name?.name) || []
    )));

    expect(recoveryHooks.has('data-sf-project-menu-restore')).toBe(true);
    expect(recoveryHooks.has('data-sf-project-menu-recovery-options')).toBe(true);
    expect(normalHooks.has('data-sf-project-menu-save')).toBe(true);
    expect(normalHooks.has('data-sf-project-menu-export')).toBe(true);
    expect(normalHooks.has('data-sf-project-menu-import')).toBe(true);
    expect(normalHooks.has('data-sf-project-menu-checkpoint')).toBe(true);
    expect(normalHooks.has('data-sf-project-menu-restore')).toBe(false);

    const restore = menuButton('data-sf-project-menu-restore');
    const options = menuButton('data-sf-project-menu-recovery-options');
    expect(snippet(restore)).toContain("ta('a11y.storyforge_ui_restore_saved_project')");
    expect(snippet(restore)).toContain('onClick={restoreDraft}');
    expect(snippet(options)).toContain("ta('a11y.storyforge_ui_review_recovery_options')");
    expect(snippet(options)).toContain('setShowRestorePrompt(true)');
  });
});
