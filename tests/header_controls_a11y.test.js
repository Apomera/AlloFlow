import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import parser from '@babel/parser';

const source = readFileSync('view_header_source.jsx', 'utf8');

const openingElements = [];
const ast = parser.parse(source, { sourceType: 'script', plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'] });
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement') openingElements.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
};
visit(ast);

describe('header control accessibility', () => {
  it('gives every native button an explicit non-submit type', () => {
    const buttons = openingElements.filter((node) => node.name.type === 'JSXIdentifier' && node.name.name === 'button');
    const missing = buttons.filter((node) => !node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type'));
    expect(missing.map((node) => node.loc.start.line)).toEqual([]);
    expect(source).not.toContain('type="submit"');
  });

  it('makes the dismissible help tip keyboard operable and motion-safe', () => {
    expect(source).toContain('onClick={dismissHelpOnboarding}');
    expect(source).toContain("aria-label={t('common.dismiss') || 'Dismiss help tip'}");
    expect(source).toContain('animate-bounce motion-reduce:animate-none');
    expect(source).not.toMatch(/<div\s+onClick=\{dismissHelpOnboarding\}/);
  });

  it('passes reactive localized names to the memoized global mute control', () => {
    expect(source).toContain("muteLabel={t('a11y.mute_all_audio') || 'Mute all audio'}");
    expect(source).toContain("unmuteLabel={t('a11y.unmute_all_audio') || 'Unmute all audio'}");
    expect(source).toContain("muteTitle={t('a11y.mute_all_audio_title') || 'Mute all audio'}");
    expect(source).toContain("unmuteTitle={t('a11y.unmute_all_audio_title') || 'Unmute all audio'}");
  });
  it('localizes the remaining header control names and reading-theme options', () => {
    expect(source).toContain("const readThisPageTitle = t('read_this_page.title')");
    expect(source).toContain("const notebookLabel = t('cmd.open_notebook')");
    expect(source).toContain("t('header.personal_ai_connect')");
    expect(source).toContain("t('header.personal_ai_disconnect')");
    expect(source).toContain("t('header.reading_theme_easy_read')");
    expect(source).toContain('aria-label={th.label}');

    expect(source).not.toContain("aria-label={showReadThisPage ? 'Close Read This Page panel'");
    expect(source).not.toContain('Open my notebook, ${notebookEntryCount}');
    expect(source).not.toContain("aria-label={window.__alloStudentAiConfigured ? 'Personal AI connected'");
    expect(source).not.toContain("aria-label='Disconnect personal AI and erase session key'");
    expect(source).not.toContain("aria-label={th.label + ' theme'}");
  });

  it('keeps localized visible text aligned with the personal-AI accessible names', () => {
    expect(source).toContain("personalAIReadyLabel = t('header.personal_ai_ready')");
    expect(source).toContain('{window.__alloStudentAiConfigured ? personalAIReadyLabel : personalAIConnectLabel}');
    expect(source).toContain("<span className='hidden xl:inline'>{personalAIDisconnectLabel}</span>");
  });

  it('provides a touch-friendly Student Actions launcher backed by the shared palette', () => {
    expect(source).toContain('data-help-key="header_student_actions"');
    expect(source).toContain("window.CustomEvent('alloflow:open-command-palette')");
    expect(source).toContain("aria-label={t('student.actions') || 'Open student actions'}");
    expect(source).toContain('{!isTeacherMode && (');
  });
});
