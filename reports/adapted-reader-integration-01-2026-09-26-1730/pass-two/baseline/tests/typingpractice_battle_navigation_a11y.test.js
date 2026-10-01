import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const source = read('stem_lab/stem_tool_typingpractice.js');

describe('Typing Practice Battle Mode exit and nested-view accessibility', () => {
  it('protects active matches with the shared accessible confirmation', () => {
    expect(source).toContain('function requestBattleExit()');
    expect(source).toContain("'Quit this Battle match? Current cleared words, combo, and outcome will not be saved.'");
    expect(source).toContain("title: 'Quit Battle Mode?'");
    expect(source).toContain("confirmText: 'Quit match'");
    expect(source).toContain("cancelText: 'Keep playing'");
    expect(source).toContain("'aria-haspopup': 'dialog'");
    expect(source).toContain('onClick: requestBattleExit');
    expect(source).toContain('battleExitPendingRef.current');
  });

  it('excludes confirmation time and preserves the prior pause state', () => {
    expect(source).toContain('var wasPaused = !!battleSt.paused');
    expect(source).toContain('typingPracticePauseBattleClock(current, confirmationStartedAt, false)');
    expect(source).toContain('typingPracticeResumeBattleClock(current, resumeAt)');
    expect(source).toContain('confirmation time was excluded from the match clock');
    expect(source).toContain('Quit canceled. Battle remains paused.');
    expect(source).toContain("'pickerOpenedAt'");
  });

  it('restores the appropriate interaction target after canceling', () => {
    expect(source).toContain('var wasPickerOpen = !!battleSt.pickerOpen');
    expect(source).toContain('var target = wasPickerOpen ? battleAttackOptionRef.current : battleCaptureRef.current');
    expect(source).toContain('if (battlePauseButtonRef.current) battlePauseButtonRef.current.focus();');
  });

  it('moves focus as the nested Battle workflow changes views', () => {
    expect(source).toContain("state.battle.view === 'summary'");
    expect(source).toContain('battleSummaryHeadingRef.current');
    expect(source).toContain("state.battle.view === 'menu'");
    expect(source).toContain('battleMenuHeadingRef.current');
    expect(source).toContain('ref: battleMenuHeadingRef');
    expect(source).toContain('ref: battleSummaryHeadingRef');
    expect(source).toContain('tabIndex: -1');
  });

  it('names the menu and describes the result summary', () => {
    expect(source).toContain("'aria-labelledby': 'tp-battle-menu-title'");
    expect(source).toContain("id: 'tp-battle-menu-title'");
    expect(source).toContain("'aria-labelledby': 'tp-battle-summary-title'");
    expect(source).toContain("'aria-describedby': 'tp-battle-summary-result'");
    expect(source).toContain("id: 'tp-battle-summary-result'");
    expect(source).toContain('Results summary ready.');
  });

  it('keeps the desktop mirror identical', () => {
    expect(read('desktop/web-app/public/stem_lab/stem_tool_typingpractice.js')).toBe(source);
  });
});
