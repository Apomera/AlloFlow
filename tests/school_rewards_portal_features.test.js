// School Rewards portal features added 2026-09-02: group award, prize goal,
// dark theme and reduced motion, and the escaping guard.
//
// The portal is a single hand-minified page driven by google.script.run, so
// these are source pins plus a syntax check; the server side of each feature
// is exercised in school_rewards_repository.test.js and the panel side in
// school_rewards_panel.test.js.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const PORTAL = readFileSync(resolve(root, 'apps_script/school_rewards/Portal.html'), 'utf8');
const SCRIPT = PORTAL.match(/<script>([\s\S]*)<\/script>/)[1];
const STYLE = PORTAL.match(/<style>([\s\S]*?)<\/style>/)[1];
const CODE = readFileSync(resolve(root, 'apps_script/school_rewards/Code.gs'), 'utf8');

describe('group award', () => {
  it('offers a group mode whose submit path calls the batch endpoint with a stable retry key', () => {
    expect(PORTAL).toContain('id="award-group-mode"');
    expect(PORTAL).toContain('id="award-group-count"');
    expect(SCRIPT).toContain("rpc('awardSchoolRewardsPointsBatch',groupPayload)");
    expect(SCRIPT).toContain("stableRetryKey('award_group',groupPayload)");
    // The single-student path is untouched.
    expect(SCRIPT).toContain("rpc('awardSchoolRewardsPoints',payload)");
    // Group mode relaxes the single-student select so the browser does not block submit.
    expect(SCRIPT).toContain("$('award-student').required=!on");
    // Group size is bounded on both sides of the wire.
    expect(SCRIPT).toContain('ids.length>60');
    expect(CODE).toContain('var SR_MAX_GROUP_AWARD = 60;');
    expect(CODE).toContain("idempotencyKey: (key + ':' + studentId).slice(0, 120)");
  });

  it('asks for confirmation before recording a group and reports partial failures without hiding successes', () => {
    expect(SCRIPT).toContain("window.confirm('Record '+Number($('award-amount').value)+' points for '+ids.length+' students");
    expect(SCRIPT).toContain('retry only the rest');
  });
});

describe('roster tiles and undo (2026-09-02)', () => {
  it('renders students as tappable tiles that drive the same select, in single and group mode', () => {
    expect(PORTAL).toContain('id="award-student-tiles" class="tiles" role="radiogroup"');
    // The select stays as the value carrier but is no longer a required, visible control.
    expect(PORTAL).toContain('<select id="award-student" class="sr-only" tabindex="-1" aria-hidden="true">');
    expect(PORTAL).not.toContain('<select id="award-student" required>');
    expect(SCRIPT).toContain('function renderAwardTiles(filtered)');
    expect(SCRIPT).toContain("role=\"'+(group?'checkbox':'radio')+'\"");
    expect(SCRIPT).toContain("notice('Choose a student first.','error')");
    expect(SCRIPT).not.toContain('function renderAwardGroupList');
  });

  it('offers Undo after a single award and reverses through the audited endpoint with a stable key', () => {
    expect(SCRIPT).toContain('function offerUndo(out)');
    expect(SCRIPT).toContain("label:'Undo'");
    expect(SCRIPT).toContain("rpc('reverseSchoolRewardsEntry',payload)");
    expect(SCRIPT).toContain("stableRetryKey('undo_'+entryId,payload)");
    expect(CODE).toContain('var SR_STAFF_UNDO_MS = 15 * 60 * 1000;');
    expect(CODE).toContain("requireRole_(['admin', 'staff']); request = object_(request);\n  var entryId");
    expect(CODE).toContain("'Staff can undo only their own awards.'");
  });
});

describe('student recognition, phone navigation, admin sections, Print Lab switch (2026-09-02)', () => {
  it('shows a student their latest recognition with the staff explanation on the overview', () => {
    expect(PORTAL).toContain('id="recognition-card"');
    expect(SCRIPT).toContain('function renderLatestRecognition()');
    expect(SCRIPT).toContain("filter(function(x){return x.kind==='EARN'}).slice(0,5)");
    expect(SCRIPT).toContain("esc(x.reason)");
  });

  it('pins the tab strip to the bottom on phones and adds an admin section index with collapse toggles', () => {
    expect(STYLE).toMatch(/@media\(max-width:760px\)\{[^}]*\}[^@]*\.tabs\{position:fixed;left:0;right:0;bottom:0/);
    expect(STYLE).toContain('.card.collapsed>*:not(h2){display:none}');
    expect(SCRIPT).toContain('function setupAdminSections()');
    expect(SCRIPT).toContain("button.setAttribute('aria-expanded',collapsed?'false':'true')");
    expect(SCRIPT).toContain('setupAdminSections();');
  });

  it('hides the Print Lab tab when the school setting is off and skips its bootstrap', () => {
    expect(PORTAL).toContain('id="setting-printlab"');
    expect(SCRIPT).toContain("rpc('adminUpdateRewardsSettings',{printLabEnabled:!!$('setting-printlab').checked})");
    expect(SCRIPT).toContain('printAccess=(student||awarder)&&printLabOn');
    expect(SCRIPT).toContain("!(state.data.config&&state.data.config.printLabEnabled===false)?await rpc('getSchoolRewardsPrintBootstrap'):null");
    expect(CODE).toContain('function adminUpdateRewardsSettings(request)');
    expect(CODE).toContain("printLabEnabled: printLabEnabled_(config)");
  });
});

describe('language menu (2026-09-02)', () => {
  it('ships a header language menu and the translation layer between its markers', () => {
    expect(PORTAL).toContain('<select id="lang-select" class="lang" aria-label="Language">');
    expect(SCRIPT).toContain('/* SR_I18N_START */');
    expect(SCRIPT).toContain('/* SR_I18N_END */');
    expect(SCRIPT).toContain("localStorage.setItem(STORAGE,lang)");
    expect(SCRIPT).toContain('new MutationObserver(');
  });
});

describe('prize goal', () => {
  it('lets a student mark one prize and shows the gap on the dashboard, in that browser only', () => {
    expect(PORTAL).toContain('id="prize-goal"');
    expect(SCRIPT).toContain("localStorage.getItem('alloflow_school_rewards_goal')");
    expect(SCRIPT).toContain('data-goal=');
    expect(SCRIPT).toContain("more point'+(gap===1?'':'s')+' to go");
    // Never sent to the ledger: no RPC carries the goal.
    expect(SCRIPT).not.toMatch(/rpc\([^)]*goal/i);
  });
});

describe('theme and motion', () => {
  it('follows the device colour scheme and motion preference', () => {
    expect(STYLE).toContain('@media (prefers-color-scheme: dark)');
    expect(STYLE).toContain('color-scheme:dark');
    expect(STYLE).toContain('@media (prefers-reduced-motion: reduce)');
    // High contrast: black, white, amber, 2px borders, visible focus.
    expect(STYLE).toContain('@media (prefers-contrast: more)');
    expect(STYLE).toContain('.progress-fill{background:#fbbf24!important}');
    expect(STYLE).toMatch(/prefers-contrast: more\)\{[^}]*color:#fff;background:#000/);
    // The status page shares the same dark treatment.
    expect(CODE).toContain('@media(prefers-color-scheme:dark)');
  });

  it('dark-theme text and surface pairs clear WCAG AA', () => {
    const luminance = (hex) => {
      const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    };
    const ratio = (a, b) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
    const pairs = [
      ['#e6ebf5', '#161e2e'], ['#b3bdd0', '#161e2e'], ['#c7d0e0', '#161e2e'], ['#c9b8ff', '#161e2e'],
      ['#0f1520', '#8b74e6'], ['#d9ccff', '#2d2559'], ['#a8ecc0', '#12351f'], ['#ffb3c0', '#3d1520'],
      ['#ffd98a', '#3a2c08'], ['#ffe9b8', '#3a2c08'], ['#e6ebf5', '#1f2a3d'],
    ];
    for (const [fg, bg] of pairs) expect(ratio(fg, bg), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
  });
});

describe('escaping guard', () => {
  it('never interpolates a raw record field into innerHTML without esc()', () => {
    // Every dynamic field the portal renders into markup goes through esc();
    // a raw concatenation of one of these names would be an injection point.
    // Only markup sinks count: a raw field inside a textContent or notice()
    // string is plain text and safe. Decide by the nearest sink before the match.
    const pattern = /'\+(?:item|student|s|p|entry|order|line|member|category|hold|model|request)\.(?:name|description|reason|email|homeroom|grade|firstName|displayName|note|title)\+'/g;
    const raw = [];
    for (const match of SCRIPT.matchAll(pattern)) {
      const before = SCRIPT.slice(Math.max(0, match.index - 400), match.index);
      const sinks = [['innerHTML', before.lastIndexOf('innerHTML')], ['textContent', before.lastIndexOf('textContent')], ['notice(', before.lastIndexOf('notice(')], ['confirm(', before.lastIndexOf('confirm(')]]
        .filter(([, at]) => at >= 0).sort((a, b) => b[1] - a[1]);
      if (!sinks.length || sinks[0][0] === 'innerHTML') raw.push(match[0]);
    }
    expect(raw).toEqual([]);
    expect(SCRIPT).toContain('function esc(v)');
  });

  it('still parses as a script after the edits', () => {
    expect(() => new Function(SCRIPT)).not.toThrow();
    expect(() => new Function(CODE)).not.toThrow();
  });
});
