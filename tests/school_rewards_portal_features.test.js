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
    expect(SCRIPT).toContain("rpc(group?'awardSchoolRewardsPointsBatch':'awardSchoolRewardsPoints',Object.assign({},p,{idempotencyKey:draft.key}))");
    expect(SCRIPT).toContain("checkedAwardRetryKey(group?'award_group':'award',payload)");
    // Both paths use the existing endpoints through a frozen, reviewed request.
    expect(SCRIPT).toContain("await sendFrozenAward(state.awardRetryDraft)");
    // Group mode relaxes the single-student select so the browser does not block submit.
    expect(SCRIPT).toContain("$('award-student').required=!on");
    // Group size is bounded on both sides of the wire.
    expect(SCRIPT).toContain('ids.length>60');
    expect(CODE).toContain('var SR_MAX_GROUP_AWARD = 60;');
    expect(CODE).toContain("idempotencyKey: groupAwardStudentKey_(key, studentId)");
  });

  it('asks for confirmation before recording a group and reports partial failures without hiding successes', () => {
    // The message is one translatable sentence with numbered slots, filled by
    // fmt(), and shown through confirmT so it is translated before the dialog.
    expect(SCRIPT).toContain("reviewAwardSelection(ids,amount,categoryId,reason)");
    expect(SCRIPT).toContain('Use Retry pending award for the exact original group.');
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
    expect(SCRIPT).toContain("!(data.config&&data.config.printLabEnabled===false)?await rpc('getSchoolRewardsPrintBootstrap'):null");
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
    expect(SCRIPT).toContain("localStorage.getItem(key)");
    expect(SCRIPT).toContain("alloflow_school_rewards_goal_v2:");
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

  it('keeps every phone touch target at or above 24px', () => {
    // Measured by dev-tools/school_rewards_mobile_sweep.cjs at 390x844 in all four
    // roles. Before these rules the built-in help links rendered 17-21px tall and
    // the checkbox rows, which are tapped through their label, rendered 16px.
    expect(STYLE).toContain('.help-more a,.help-links a{display:inline-flex;align-items:center;min-height:44px');
    expect(STYLE).toContain('label:has(input[type="checkbox"]){min-height:24px}');
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
    // The built-in help links are the one place the light purple would otherwise survive into the dark theme.
    expect(STYLE).toContain('.help-more a,.help-links a{color:#c9b8ff}');
    expect(STYLE).toContain('.help-more a,.help-links a{color:#fbbf24}');
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

describe('records requests (2026-09-03)', () => {
  it('gives an administrator an export and a redaction path, and warns against editing the sheet', () => {
    expect(PORTAL).toContain('id="records-card"');
    expect(PORTAL).toContain('id="records-export"');
    expect(PORTAL).toContain('id="records-redact"');
    expect(PORTAL).toContain('Do not delete rows in the spreadsheet');
    // The card sits on the admin tab, after that panel opens.
    expect(PORTAL.indexOf('id="records-card"')).toBeGreaterThan(PORTAL.indexOf('id="panel-admin"'));
    // Redaction is confirmed, reasoned, and reports what necessarily remains.
    expect(SCRIPT).toContain("rpc('redactSchoolRewardsStudent'");
    expect(SCRIPT).toContain('confirm:true');
    expect(SCRIPT).toContain('records-residue');
    expect(SCRIPT).toContain("rpc('exportSchoolRewardsStudentRecord'");
  });
});

describe('academic year rollover (2026-09-03)', () => {
  it('offers a preview before anything changes, and a close that names the carry-over choice', () => {
    expect(PORTAL).toContain('id="year-card"');
    expect(PORTAL).toContain('id="year-check"');
    expect(PORTAL).toContain('id="year-carry"');
    expect(PORTAL).toContain('value="none"');
    expect(PORTAL).toContain('value="all"');
    expect(SCRIPT).toContain("rpc('getSchoolRewardsYearPreview')");
    expect(SCRIPT).toContain("rpc('startSchoolRewardsAcademicYear'");
    expect(SCRIPT).toContain('confirm:true');
    // Closing is confirmed and the preview writes nothing.
    expect(SCRIPT).toContain("notice('Year checked. Nothing has changed.','ok')");
  });

  it('closes the year by appending, never by editing a balance', () => {
    expect(CODE).toContain('function startSchoolRewardsAcademicYear(request)');
    expect(CODE).toContain("'year_close'");
    expect(CODE).toContain("'REVERSAL', -balance");
    // Batched: one write per sheet, so closing does not scale with the roster.
    expect(CODE).toContain('function appendRows_(sheet, rows)');
    expect(CODE).toContain("appendRows_(sheet_(book, 'Ledger'), ledgerRows)");
    // Guards: nothing in flight, explicit confirmation, and a per-student archive.
    expect(CODE).toContain('Close the shopping window before closing the year');
    expect(CODE).toContain('Some students have points reserved for open print requests');
    expect(CODE).toContain('function yearSummarySheet_(book)');
    expect(CODE).toContain("event: 'ACADEMIC_YEAR_STARTED'");
  });
});

describe('storage and retention (2026-09-04)', () => {
  it('reports capacity and trims only settled request records', () => {
    expect(PORTAL).toContain('id="capacity-card"');
    expect(SCRIPT).toContain("rpc('getSchoolRewardsCapacity')");
    expect(SCRIPT).toContain("rpc('pruneSchoolRewardsRequestRecords',{confirm:true})");
    expect(CODE).toContain('var SR_SHEET_CELL_LIMIT = 10000000;');
    expect(CODE).toContain('var SR_MIN_PRUNE_DAYS = 180;');
    // Anything unresolved is kept, and the record itself is never trimmed.
    expect(CODE).toContain("journal.state !== 'COMPLETED'");
    expect(CODE).toContain("permanent: ['Ledger', 'Audit']");
  });

  it('scopes mail period keys to the academic year so a reused name still sends', () => {
    expect(CODE).toContain("hash_(kind + '|' + year + '|' + period)");
    expect(CODE).toContain('function academicYearStart_(book)');
    expect(CODE).toContain('academicYearStartedAt: at');
    // An in-flight mail run blocks the close, so no run spans a key change.
    expect(CODE).toContain('A mail run is still in progress or waiting for review');
  });
});

describe('the store says how a purchase happens (2026-09-11)', () => {
  // Found by driving the practice page as a first-time user: it opens as Staff in the
  // "store preview" scenario, where the catalog shows no Add-to-cart button and no
  // checkout for ANY role, and nothing on the Store tab said why. It read as broken.
  it('carries one sentence per situation as static markup, so the language pack sees them', () => {
    expect(PORTAL).toContain('<div id="store-buy-note" class="muted" hidden>');
    expect(PORTAL).toContain('<span data-buy-note="browse" hidden>Purchases are completed at the register by a cashier or administrator. This view is browse-only.</span>');
    expect(PORTAL).toContain('<span data-buy-note="admin" hidden>Open a shopping window in Admin setup to enable checkout.</span>');
    expect(PORTAL).toContain('<span data-buy-note="closed" hidden>Checkout stays closed until an administrator opens a shopping window. A cashier then completes each purchase at the register.</span>');
  });
  it('picks the sentence from the live window state and the actor role, and hides it for a cashier who can buy', () => {
    expect(SCRIPT).toContain("buyKind=open?(cashier?'':'browse'):(admin?'admin':'closed')");
    expect(SCRIPT).toContain("buyNote.hidden=!buyKind");
    expect(SCRIPT).toContain("n.hidden=n.getAttribute('data-buy-note')!==buyKind");
  });
  it('ships the sentences in the catalogue and in Spanish', () => {
    const catalogue = JSON.parse(readFileSync(resolve(root, 'apps_script/school_rewards/portal_strings.json'), 'utf8'));
    const es = JSON.parse(readFileSync(resolve(root, 'apps_script/school_rewards/i18n_src/es.json'), 'utf8'));
    for (const key of [
      'purchases_are_completed_at_the_register_by_a_cashier_or_ad_91j09e',
      'open_a_shopping_window_in_admin_setup_to_enable_checkout_14t2ao9',
      'checkout_stays_closed_until_an_administrator_opens_a_shopp_10rrapf',
      'purchase_complete_1_for_2_points_3_now_has_4_points_availa_1jew1qt',
    ]) {
      expect(catalogue.strings[key], key).toBeTruthy();
      expect(es.strings[key], key + ' (es)').toBeTruthy();
      expect(es.strings[key]).not.toBe(catalogue.strings[key]);
    }
  });
});

describe('the checkout panel reports a completed purchase (2026-09-11)', () => {
  // After the one click that completes a purchase, the panel reverted to "Cart is
  // empty… Add at least one prize." while the receipt rendered under the catalog,
  // about a thousand pixels lower on the demo's six-item store. The success state was
  // indistinguishable from a reset.
  it('records what was just bought, for the student it was bought for', () => {
    expect(SCRIPT).toContain("state.lastCheckoutSummary={studentId:student.id,items:doneLines.map(function(line){return Number(line.quantity)+' x '+line.itemName}).join(', '),total:Number(out.order&&out.order.total||0),available:Number(out.availableBalance||0)}");
  });
  it('shows it in the budget line ahead of the empty-cart prompt, as one translatable sentence', () => {
    expect(SCRIPT).toContain("else if(!lines.length&&state.lastCheckoutSummary&&state.lastCheckoutSummary.studentId===selected.id)budget.textContent=fmt('Purchase complete: {1} for {2} points. {3} now has {4} points available. The receipt is below the catalog.'");
  });
  it('forgets it the moment a new cart starts', () => {
    expect(SCRIPT).toContain("if(lines.length)delete state.lastCheckoutSummary;$('cart-lines').innerHTML=");
  });
});
