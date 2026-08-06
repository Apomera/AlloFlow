// Where shared-activity setup lives, and what it no longer requires.
//
// Four defects, reported from real use:
//   1. The form sat inside a role="menu" dropdown whose keydown handler cycles
//      [role="menuitem"] on ArrowUp/ArrowDown. Arrow keys inside the options
//      textarea could therefore move focus out of the field. Form controls are
//      not menu items.
//   2. Wrong information architecture: setting up a scheduling poll was filed
//      under "Documents", next to PDF export.
//   3. Double-gated discovery: a collapsed <details> AND a separate "enabled"
//      checkbox, so nothing was visible until two disclosures were opened.
//   4. An activity could not be sent without a resource pack, which made a
//      staff scheduling poll impossible: it has no lesson and never will.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const HEADER = readFileSync('view_header_source.jsx', 'utf8');
const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

describe('setup is out of the dropdown menu', () => {
  it('no longer puts form controls inside the Documents menu', () => {
    // The menu still exists; what must not come back is a form inside it.
    const menuStart = HEADER.indexOf('role="menu"');
    expect(menuStart, 'the Documents menu still exists').toBeGreaterThan(0);
    const menu = HEADER.slice(menuStart, menuStart + 20000);
    expect(menu, 'no options textarea in a menu').not.toContain('optionsText');
    expect(menu, 'no identity select in a menu').not.toContain('identityMode');
  });

  it('points at the Control Center instead', () => {
    expect(HEADER).toContain('Set up a poll, sign-up sheet or class activity');
  });

  it('keeps the reason in the code, not just in a commit', () => {
    expect(HEADER).toMatch(/keyboard-hostile|arrow handler steals focus/);
  });
});

describe('setup lives with the results', () => {
  for (const f of COPIES) {
    it(`${f} hosts the form in the Assignment Control Center`, () => {
      const src = readFileSync(f, 'utf8');
      // Same dialog that already shows hosted assignments and their status, so
      // set up, share and read are one place.
      const dialogAt = src.indexOf('assignment-control-center-title');
      const formAt = src.indexOf('activity-setup-title');
      expect(dialogAt, 'control center exists').toBeGreaterThan(0);
      expect(formAt, 'setup form exists').toBeGreaterThan(0);
      expect(Math.abs(formAt - dialogAt), 'the form is inside that dialog').toBeLessThan(4000);
    });

    it(`${f} makes choosing a type the enable, with no separate checkbox`, () => {
      const src = readFileSync(f, 'utf8');
      // A "None" option replaces the old checkbox, so one control both reveals
      // and configures rather than two nested disclosures.
      expect(src).toContain('<option value="">None</option>');
      expect(src).toContain('enabled: !!nextType,');
    });

    it(`${f} offers all four activity types in one list`, () => {
      const src = readFileSync(f, 'utf8');
      const formAt = src.indexOf('activity-setup-title');
      const form = src.slice(formAt, formAt + 8000);
      for (const value of ['word_cloud', 'rating', 'availability', 'signup']) {
        expect(form, value).toContain(`<option value="${value}">`);
      }
    });
  }
});

describe('there is a front door', () => {
  const HUB = readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
  const HUB_MODULE = readFileSync('view_educator_hub_modal_module.js', 'utf8');

  it('has an Educator Hub card, which is how every other tool is found', () => {
    expect(HUB).toContain('educator_hub_activities_card');
    expect(HUB).toMatch(/Polls & Sign-ups/);
    // It opens the working surface rather than duplicating it.
    expect(HUB).toContain('setShowRecentQrShares(true)');
  });

  it('defaults the opener so a host that does not pass it still renders', () => {
    // Same defaulting the file already uses for setShowCinematicStudio; without
    // it, an older host would throw on click.
    expect(HUB).toContain('setShowRecentQrShares = (() => {})');
  });

  it('is wired from the host and reaches the built module', () => {
    for (const f of COPIES) {
      expect(readFileSync(f, 'utf8'), f).toContain('<EducatorHubModal setShowRecentQrShares={setShowRecentQrShares}');
    }
    expect(HUB_MODULE, 'a source-only change would never ship').toContain('educator_hub_activities_card');
  });

  it('no longer calls the entry point "recent homework links"', () => {
    // The dialog now creates as well as lists, so the old name described only
    // half of it and sent people looking in the wrong place.
    expect(HEADER).not.toContain('Recent homework links');
    expect(HEADER).toContain('Polls, sign-ups & shared links');
  });
});

describe('the dialog does not close by accident', () => {
  for (const f of COPIES) {
    it(`${f} only closes when the whole gesture was on the backdrop`, () => {
      const src = readFileSync(f, 'utf8');
      // It holds a FORM now. Drag to select text in the options box, release a
      // few pixels outside, and a plain backdrop onClick would discard
      // everything typed. stopPropagation cannot help: the click target really
      // is the backdrop, and only the press ORIGIN distinguishes the two.
      expect(src).toContain('const recentQrBackdropPressRef = useRef(false);');
      expect(src).toContain('recentQrBackdropPressRef.current = event.target === event.currentTarget;');
      expect(src, 'a bare close-on-any-backdrop-click must not return').not.toContain('aria-labelledby="assignment-control-center-title" onClick={() => setShowRecentQrShares(false)}');
    });

    it(`${f} still closes deliberately, by button and by Escape`, () => {
      const src = readFileSync(f, 'utf8');
      // Hardening dismissal must not strip the ways out that people expect.
      expect(src).toContain('aria-label="Close Share & Collect"');
      expect(src).toContain('useFocusTrap(recentQrSharesDialogRef, showRecentQrShares');
    });

    it(`${f} is named for what it does now`, () => {
      const src = readFileSync(f, 'utf8');
      // "Assignment Control Center" described an archive of past links, not a
      // place to set up a poll.
      expect(src).toContain('>Share & Collect</h2>');
      expect(src).not.toContain('>Assignment Control Center</h2>');
    });
  }
});

describe('an activity can be sent on its own', () => {
  for (const f of COPIES) {
    it(`${f} does not require a resource pack`, () => {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('const activityOnly = includeSharedActivity');
      // Both refusals have to yield, not just the first: the second one fires
      // when resources exist but none are shareable.
      expect(src).toContain('if (!resourcesToAssign.length && !activityOnly) {');
      expect(src).toContain('if (!resources.length && !activityOnly) {');
    });

    it(`${f} still names an activity-only link something meaningful`, () => {
      const src = readFileSync(f, 'utf8');
      // With no resource to borrow a title from, the prompt is the only sensible
      // name; without this the link would be titled "AlloFlow homework".
      expect(src).toMatch(/activityOnly \? \(sharedAssignmentActivity\?\.prompt \|\| 'Shared activity'\)/);
    });

    it(`${f} still refuses an empty share with nothing attached at all`, () => {
      const src = readFileSync(f, 'utf8');
      // activityOnly requires an ENABLED activity, so "no resources and no
      // activity" is still refused rather than producing an empty link.
      expect(src).toMatch(/activityOnly = includeSharedActivity[\s\S]{0,120}enabled === true/);
    });
  }
});
