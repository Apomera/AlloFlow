import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_crisiscompanion.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_crisiscompanion.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Crisis Companion confirmation and focus accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('preserves visible focus for shared input and textarea helpers', () => {
    const text = source();
    expect(text).not.toContain("outline: 'none'");
    expect(text).toContain("'.selh-crisiscompanion input:focus-visible,'");
    expect(text).toContain("'.selh-crisiscompanion textarea:focus-visible,'");
  });

  it('uses one named modal alert dialog instead of browser confirmations', () => {
    const text = source();
    expect(text).not.toContain('window.confirm');
    expect(text).not.toContain("confirm('");
    expect(text).toContain("role: 'alertdialog'");
    expect(text).toContain("'aria-modal': 'true'");
    expect(text).toContain("'aria-labelledby': 'cc-confirm-title'");
    expect(text).toContain("'aria-describedby': 'cc-confirm-description'");
  });

  it('focuses Cancel first, traps Tab, supports Escape, and restores cancelled triggers', () => {
    const text = source();
    expect(text).toContain("focusCrisisControl('cc-confirm-cancel')");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain("querySelectorAll('button:not([disabled])')");
    expect(text).toContain('if (triggerId) focusCrisisControl(triggerId)');
  });

  it('clears both persisted copies of the safety plan only after confirmation', () => {
    const text = source();
    expect(text).toContain("openCrisisConfirm({ type: 'clear-safety-plan'");
    expect(text).toContain("upd({ ccConfirmAction: null, safetyPlan: {} })");
    expect(text).toContain("lsSet(ccKey('crisisCompanion.safetyPlan.v1'), {})");
    expect(text).toContain("focusCrisisControl('cc-safety-plan-heading')");
  });

  it('confirms bulk distress-reading deletion and returns meaningful context', () => {
    const text = source();
    expect(text).toContain("openCrisisConfirm({ type: 'clear-distress-readings'");
    expect(text).toContain("upd({ ccConfirmAction: null, distressReadings: [] })");
    expect(text).toContain("id: 'cc-distress-section', tabIndex: -1");
  });
});
