// Live-session visual organizer: snapback and unreachable-activity fixes
// (2026-09-17).
//
// Three defects, all in the student half of a live session:
//
//  1. The teacher-armed organizer push was the only one of three push branches
//     with no consume-once nonce. interactiveOrganizer stays in the session doc
//     until the teacher stops the activity, so every later snapshot — including
//     the student's own XP write — re-opened the organizer the moment they
//     navigated anywhere else.
//  2. Organizer view mode was written from the XP roster-sync effect, whose deps
//     include globalPoints. Earning points re-forced isInteractiveMap = true,
//     and every activity's render gate lives in the isInteractiveMap === false
//     branch — so the armed activity was set but rendered nothing.
//  3. The arm effect starts a 16s "did it stall?" timer before four guards that
//     mean "this arm is not for the resource currently open". A student who
//     navigated away left that timer running and reported a failed activity to
//     the teacher's roster when nothing had failed.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');

// The snapshot handler's organizer branch, isolated so assertions cannot pass on
// text that happens to appear elsewhere in a 45k-line file.
function organizerPushBranch() {
  const start = anti.indexOf("if (organizerResourceId && data.interactiveOrganizer?.type) {");
  expect(start, 'organizer push branch should exist').toBeGreaterThan(-1);
  const end = anti.indexOf("else if (data.mode === 'sync' && data.currentResourceId)", start);
  expect(end).toBeGreaterThan(start);
  return anti.slice(start, end);
}

describe('a teacher-armed organizer is delivered once, not on every snapshot', () => {
  it('keys the push on the arm event, not just the resource id', () => {
    const branch = organizerPushBranch();
    expect(branch).toMatch(/const organizerPushKey = \[/);
    // activityId + armedAt identify the arm; the revision lets a teacher edit
    // re-deliver. Resource id alone would never change while armed, which is
    // exactly how the loop happened.
    expect(branch).toMatch(/data\.interactiveOrganizer\?\.activityId/);
    expect(branch).toMatch(/data\.interactiveOrganizer\?\.armedAt/);
    expect(branch).toMatch(/organizerResourceRevision,/);
  });

  it('checks the nonce before navigating and consumes it after', () => {
    const branch = organizerPushBranch();
    const check = branch.indexOf('lastOrganizerPushKeyRef.current !== organizerPushKey');
    const consume = branch.indexOf('lastOrganizerPushKeyRef.current = organizerPushKey');
    const navigate = branch.indexOf('setGeneratedContent({ ...organizerResource })');
    expect(check, 'nonce must be checked').toBeGreaterThan(-1);
    expect(consume, 'nonce must be consumed').toBeGreaterThan(check);
    expect(navigate, 'navigation happens after the nonce is consumed').toBeGreaterThan(consume);
  });

  it('matches the consume-once pattern its two sibling branches already use', () => {
    // The group and individual pushes were fixed for this same bug earlier; the
    // organizer branch was simply missed. Keep all three shaped alike.
    for (const ref of ['lastGroupPushKeyRef', 'lastIndividualPushKeyRef', 'lastOrganizerPushKeyRef']) {
      expect(anti, ref).toContain(`const ${ref} = useRef(null);`);
      expect(anti, `${ref} resets on leaving the session`).toContain(`${ref}.current = null;`);
    }
  });
});

describe('organizer view mode is not a side effect of earning points', () => {
  const xpEffect = () => {
    const start = anti.indexOf('if (!isTeacherMode && activeSessionCode && user && globalPoints !== undefined) {');
    expect(start).toBeGreaterThan(-1);
    const end = anti.indexOf('}, [globalPoints, activeSessionCode', start);
    expect(end).toBeGreaterThan(start);
    return anti.slice(start, end);
  };

  it('the XP roster sync no longer writes isInteractiveMap', () => {
    expect(xpEffect()).not.toMatch(/setIsInteractiveMap\(/);
  });

  it('view mode has its own effect, keyed on what actually decides it', () => {
    const start = anti.indexOf('// Student organizer view mode in a live session.');
    expect(start, 'the dedicated effect should exist').toBeGreaterThan(-1);
    const end = anti.indexOf('sessionData?.interactiveOrganizer?.type]);', start);
    expect(end).toBeGreaterThan(start);
    const effect = anti.slice(start, end);

    expect(effect).toMatch(/if \(sessionData\?\.forceStatic\) \{ setIsInteractiveMap\(false\); return; \}/);
    // globalPoints must not be what re-runs this.
    expect(effect).not.toMatch(/globalPoints/);
  });

  it('yields to an armed activity instead of covering it with the map view', () => {
    const start = anti.indexOf('// Student organizer view mode in a live session.');
    const end = anti.indexOf('sessionData?.interactiveOrganizer?.type]);', start);
    const effect = anti.slice(start, end);
    const bail = effect.indexOf("if (sessionData?.interactiveOrganizer?.type) return;");
    const force = effect.indexOf('setIsInteractiveMap(true);');
    expect(bail, 'an armed activity should stop the forced map view').toBeGreaterThan(-1);
    expect(force, 'the bail-out must come first').toBeGreaterThan(bail);
  });
});

describe('a student reading something else is not reported as a failed activity', () => {
  it('stops the stall timer on each "not for this resource" exit', () => {
    const start = anti.indexOf('const _stallWatchOff = ()');
    expect(start, 'the guarded exits should stop the clock').toBeGreaterThan(-1);
    const end = anti.indexOf('let syncedGameData = null;', start);
    expect(end).toBeGreaterThan(start);
    const guards = anti.slice(start, end);

    // All four early exits — resource, structure, revision, readiness.
    const stops = guards.match(/&& _stallWatchOff\(\)\) return;/g) || [];
    expect(stops.length).toBe(4);
    expect(guards).toContain('_clearOrganizerLaunchTimer();');
  });

  it('still arms when the resource does match', () => {
    // The guards must remain guards: none of them may have been deleted in the
    // course of stopping the timer.
    const start = anti.indexOf('const _stallWatchOff = ()');
    const end = anti.indexOf('let syncedGameData = null;', start);
    const guards = anti.slice(start, end);
    expect(guards).toMatch(/remote\.resourceId &&/);
    expect(guards).toMatch(/remote\.structureType &&/);
    expect(guards).toMatch(/remote\.resourceRevision &&/);
    expect(guards).toMatch(/getLiveOrganizerReadiness\(remote\.type, generatedContent\)\.ok/);
  });
});

describe('the three host copies stay identical', () => {
  it('AlloFlowANTI.txt, its mirror and App.jsx carry the same fixes', () => {
    const mirror = fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');
    const app = fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/App.jsx'), 'utf8');
    expect(mirror).toBe(anti);
    expect(app).toBe(anti);
  });
});
