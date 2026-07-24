import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf-8');
const hash8 = (file) => createHash('sha256').update(read(file)).digest('hex').slice(0, 8);

describe('student-facing accessibility contracts', () => {
  it('StudentJoinPanel exposes a named region, real labels, and keyboard-visible controls', () => {
    const src = read('view_student_join_panel_source.jsx');
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-labelledby={isJoinPanelExpanded ? titleId : collapsedTitleId}');
    expect(src).toContain('<form className="flex flex-col gap-3 max-w-xs mx-auto" onSubmit={handleJoinSubmit}');
    expect(src).toContain('htmlFor={hostInputId}');
    expect(src).toContain('htmlFor={codeInputId}');
    expect(src).toContain('autoComplete="one-time-code"');
    expect(src).toContain('focus-visible:ring-2');
    expect(src).toContain('getStudentJoinThemeStyles');
    expect(src).toContain('window.AlloThemeContext');
    expect(src).toContain("theme === 'contrast'");
    expect(src).toContain("theme === 'dark'");
  });

  it('StudentSaveAdventurePanel exposes save/adventure sections, progress, and live status', () => {
    const src = read('view_student_save_adventure_source.jsx');
    expect(src).toContain('aria-labelledby={saveTitleId}');
    expect(src).toContain('aria-labelledby={adventureTitleId}');
    expect(src).toContain('role="progressbar"');
    expect(src).toContain('aria-valuenow={boundedPoints}');
    expect(src).toContain('role="status" aria-live="polite"');
    expect(src).toContain("aria-label={t('student.save_drive')}");
    expect(src).toContain('focus-visible:ring-2');
    expect(src).toContain('getStudentSaveThemeStyles');
    expect(src).toContain('window.AlloThemeContext');
    expect(src).toContain('secondaryPurple');
    expect(src).toContain("theme === 'contrast'");
    expect(src).toContain("theme === 'dark'");
  });

  it('SocraticChat behaves like an accessible floating chat with a live log', () => {
    const src = read('view_socratic_chat_source.jsx');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-describedby={descId}');
    expect(src).toContain('role="log"');
    expect(src).toContain('aria-relevant="additions text"');
    expect(src).toContain('aria-pressed={socraticAutoRead}');
    expect(src).toContain('aria-pressed={socraticAutoSend}');
    expect(src).toContain('aria-pressed={isSocraticDictating}');
    expect(src).toContain('<form className={`p-3 ${_inputArea} flex gap-2 shrink-0`} onSubmit={handleSubmitForm}>');
    expect(src).toContain('aria-controls={logId}');
    expect(src).toContain('const _header = chatStyles.header');
    expect(src).toContain('const _button = chatStyles.button');
    expect(src).toContain('const _secondaryButton = chatStyles.secondaryButton');
  });

  it('StudentSubmitModal is announced as a modal dialog and keeps keyboard focus contained', () => {
    const src = read('student_interaction_source.jsx');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('aria-labelledby={titleId}');
    expect(src).toContain('aria-describedby={descId}');
    expect(src).toContain('tabIndex={-1}');
    expect(src).toContain('const handleDialogKeyDown');
    expect(src).toContain("e.key === 'Escape'");
    expect(src).toContain("e.key !== 'Tab'");
    expect(src).toContain('role="status" aria-live="polite"');
    expect(src).toContain('aria-busy="true"');
    expect(src).toContain('getStudentInteractionThemeStyles');
    expect(src).toContain('window.AlloThemeContext');
    expect(src).toContain("theme === 'contrast'");
    expect(src).toContain("theme === 'dark'");
    expect(src).toContain('headerText');
    expect(src).toContain("submissionMethod === 'mailbox'");
    expect(src).toContain('Submit to teacher’s Drive');
    expect(src).toContain('await Promise.resolve(onSubmit(fullName, stats))');
    expect(src).toContain("submissionContext === 'standard-live'");
    expect(src).toContain('If delivery fails, a backup file downloads instead.');
  });

  it('the inline student live-session lobby has dark and high-contrast branches', () => {
    const host = read('AlloFlowANTI.txt');
    const deployHost = read('desktop/web-app/src/AlloFlowANTI.txt');
    [host, deployHost].forEach((src) => {
      expect(src).toContain('const studentLobbyStyles = useMemo');
      expect(src).toContain("theme === 'contrast'");
      expect(src).toContain("theme === 'dark'");
      expect(src).toContain('studentLobbyStyles.panel');
      expect(src).toContain('studentLobbyStyles.badge');
    });
  });

  it('generated student modules are mirrored to the deploy public folder', () => {
    [
      'student_interaction_module.js',
      'view_student_join_panel_module.js',
      'view_student_save_adventure_module.js',
      'view_socratic_chat_module.js',
    ].forEach((file) => {
      expect(read(file)).toBe(read(`desktop/web-app/public/${file}`));
    });
  });

  it('canonical and deploy loaders both stamp the CURRENT content hash of each student module', () => {
    // Design call (2026-07-16, was a stale assertion): build.js now stamps the deploy
    // App.jsx/ANTI with ABSOLUTE CDN URLs (`https://alloflow-cdn.pages.dev/<file>?v=<hash8>`)
    // rather than the old `./local` form — deploy serves student modules from the CDN with
    // cache busting. We assert the evolved form, and the stronger invariant it enables:
    // every copy's ?v= stamp must equal the sha256-8 of the module bytes ON DISK, so a
    // module edit without a loader restamp (stale cache-buster) fails here.
    const host = read('AlloFlowANTI.txt');
    const deployHost = read('desktop/web-app/src/AlloFlowANTI.txt');
    const deployApp = read('desktop/web-app/src/App.jsx');
    [
      'student_interaction_module.js',
      'view_student_join_panel_module.js',
      'view_student_save_adventure_module.js',
      'view_socratic_chat_module.js',
    ].forEach((file) => {
      const tag = `${file}?v=${hash8(file)}`;
      expect(host).toContain(tag);
      expect(deployHost).toContain(`https://alloflow-cdn.pages.dev/${tag}`);
      expect(deployApp).toContain(`https://alloflow-cdn.pages.dev/${tag}`);
    });
  });
});
