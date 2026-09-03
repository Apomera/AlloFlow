// Plain-language pass (2026-09-02). After the JSON-box incident the rule is:
// every message a principal, teacher, cashier, or student can meet says what
// happened and what to do next; internal integrity text is one click away,
// never the first thing shown.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const CODE = read('apps_script/school_rewards/Code.gs');
const PORTAL = read('apps_script/school_rewards/Portal.html');
const PRACTICE = read('school-rewards-practice.html');

describe('repository messages', () => {
  it('no longer speaks in schema terms to the person at the register', () => {
    for (const gone of ['Unlimited inventory must use -1', 'Inventory transition is allowed only', 'explicit target inventory limit', 'six-digit hex color', 'configured domain.', 'order-level refund', 'A stable request key is required']) {
      expect(CODE, gone).not.toContain(gone);
    }
    for (const now of ['Leave the remaining field empty, or choose a stock limit instead.', 'Pick a colour for the category', 'refund the order from the Store tab', 'Someone else is saving right now', 'Sign in with your school Google account, not a personal one.']) {
      expect(CODE, now).toContain(now);
    }
    // The pins other suites rely on survive.
    for (const kept of ['Your role cannot perform this action.', 'The undo window has passed.', 'Staff can undo only their own awards.', 'Describe what the student did to earn these points.']) expect(CODE).toContain(kept);
  });

  it('the deployment check page says what to do next in both outcomes', () => {
    expect(CODE).toContain('You can close this tab and go back to AlloFlow to tick the last step.');
    expect(CODE).toContain('Three things to check: you are signed in with a school account');
  });
});

describe('portal', () => {
  it('turns integrity and journal errors into one plain sentence with the details one click away', () => {
    const fail = PORTAL.slice(PORTAL.indexOf('function fail(error)'), PORTAL.indexOf('function rpc('));
    expect(fail).toContain("The ledger needs an administrator to review it before this can continue. Nothing was changed.");
    expect(fail).toContain("label:'Show details'");
    expect(fail).toContain('TECHNICAL.test(message)');
    const pattern = new RegExp(PORTAL.match(/var TECHNICAL=\/(.*?)\/i;/)[1], 'i');
    for (const technical of ['The pending operation intent is not canonical.', 'Catalog inventory movement hash chain is invalid. Review the integrity report.', 'The mail delivery signing secret is unavailable.', 'Inventory changed and is neither the signed before state nor the signed after state.']) expect(pattern.test(technical), technical).toBe(true);
    for (const human of ['Not enough points available for this purchase.', 'Choose at least one student.', 'The undo window has passed. Ask an administrator to correct this award.', 'Someone else is saving right now. Wait a moment and try again.']) expect(pattern.test(human), human).toBe(false);
  });

  it('shows a first-week checklist derived from the ledger, ahead of the settings card', () => {
    expect(PORTAL.indexOf('id="checklist-card"')).toBeLessThan(PORTAL.indexOf('id="settings-card"'));
    expect(PORTAL).toContain('function renderAdminChecklist()');
    expect(PORTAL).toContain('try{renderAdminChecklist()}catch(e){}');
    for (const line of ['At least one staff member can award points', 'Students are on the roster', 'A store window is in preview or open', 'The first award has been recorded']) expect(PORTAL).toContain(line);
    // Derived only: the checklist never writes.
    const fn = PORTAL.slice(PORTAL.indexOf('function renderAdminChecklist()'), PORTAL.indexOf("$('import-roster').onclick"));
    expect(fn).not.toMatch(/rpc\(|localStorage/);
  });

  it('shows example roster rows and a blank template before the file chooser', () => {
    const card = PORTAL.slice(PORTAL.indexOf('<h3>Bulk CSV import</h3>'), PORTAL.indexOf('id="import-roster"'));
    expect(card).toContain('<table class="csv-sample"');
    expect(card).toContain('ava.r@yourschool.example');
    expect(card.indexOf('id="roster-template"')).toBeLessThan(card.indexOf('id="roster-csv"'));
    expect(PORTAL).toContain("a.download='school-rewards-roster-template.csv'");
  });
});

describe('practice page', () => {
  it('starts the tour by itself on the first visit, once', () => {
    expect(PRACTICE).toContain("localStorage.getItem('alloflow_school_rewards_practice_toured')");
    expect(PRACTICE).toContain("setTimeout(function(){if(!box)showStep(0)},900)");
  });
});

describe('panel', () => {
  it('explains the deployment check inline after opening it', () => {
    const src = read('school_rewards_source.jsx');
    expect(src).toContain('data-help-key="schoolrewards_health_hint"');
    expect(src).toContain('setHealthHint(true)');
    expect(src).toContain('First-week checklist that ticks itself');
  });
});
