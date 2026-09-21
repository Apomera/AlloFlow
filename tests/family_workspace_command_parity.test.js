// Family/independent workspace command parity — the second pass.
//
// Companion to tests/family_authoring_command_parity.test.js, which widened the
// six "create from this content" commands. Same defect class, same evidence
// standard, applied to the workspace commands a parent or self-study adult uses
// AROUND authoring: settings, export, translation, and the reference surfaces.
//
// The bar each command below had to clear, so this stays a consistency fix
// rather than a judgement call about who "should" get what:
//
//   1. Its host context entry is role-agnostic (no isParentMode /
//      isIndependentMode / isSchoolRole check in allo_command_context_source.js).
//   2. Its destination UI carries no school-only guard, so the surface is
//      ALREADY reachable by clicking in parent/independent mode. The command was
//      hiding the spoken and palette route to a door that is already open.
//
// The Accessibility Lab is the clearest instance: its "Return to Accessibility
// Lab review" button is gated purely on session state, so a parent mid-review
// could see the button while "open the Accessibility Lab" routed to nothing.
//
// Commands that FAIL bar 2 stay teacher-only and are pinned below: the
// Leadership and Educator hubs, rosters, class analytics, live sessions and the
// submission inbox all address a class of other people's children.
//
// DELIBERATELY NOT WIDENED: open_ai_settings and use_gemini_canvas. They meet
// both bars -- the AI setup modal auto-prompts on desktop startup regardless of
// role and is gated on _isCanvasEnv, never on role -- but an existing assertion
// in tests/allo_commands.test.js pins them OUT of every learner-facing mode.
// Widening them would have required overwriting another session's explicit
// decision, so they are left alone pending a call from the user. The narrower
// change below stands on its own.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});

// Workspace commands an author needs regardless of which kind of author they are.
const WORKSPACE_COMMANDS = [
  'open_project_settings',
  'open_udl_guide',
  'open_accessibility_lab',
  'open_community_catalog',
  'open_export_menu',
  'export_pack',
  'open_document_builder',
  'open_block_suggestions',
  'open_translate',
  'open_wizard',
  'undo_settings',
];

// Surfaces that address a CLASS of other people's children. These stay
// teacher-only; widening the set above must not widen these.
const SCHOOL_ONLY = [
  'open_leadership_hub',
  'open_educator_hub',
  'open_roster',
  'open_class_analytics',
  'open_class_session',
  'open_live_session_center',
  'open_submission_inbox',
  'open_share_collect',
  'open_group_tools',
];

const ctxFor = (role) => ({
  isTeacherMode: true,
  ...(role === 'parent' ? { isParentMode: true } : { isIndependentMode: true }),
  hasSourceOrAnalysis: true,
  canUndoSettings: true,
  hasExportableContent: true,
});

describe.each(['parent', 'independent'])('%s mode reaches its own workspace', (role) => {
  it.each(WORKSPACE_COMMANDS)('%s is available', (id) => {
    const got = AC.buildAlloCommands(ctxFor(role), { includeGated: true }).map((c) => c.id);
    expect(got).toContain(id);
  });
});

describe.each(['parent', 'independent'])('%s mode still cannot reach school-staff surfaces', (role) => {
  it.each(SCHOOL_ONLY)('%s stays teacher-only', (id) => {
    const got = AC.buildAlloCommands(ctxFor(role), { includeGated: true }).map((c) => c.id);
    expect(got).not.toContain(id);
  });
});

describe('the reachability premise this widening rests on', () => {
  it('the Accessibility Lab return button is gated on session state, not role', () => {
    const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
    const i = anti.indexOf('data-a11y-review-return="true"');
    expect(i).toBeGreaterThan(-1);
    const guard = anti.slice(Math.max(0, i - 400), i);
    expect(guard).toContain('accessibilityReviewSession && !isAccessibilityLabOpen');
    expect(guard).not.toContain('!isParentMode');
    expect(guard).not.toContain('!isIndependentMode');
  });

  it('the host defines only a handful of school-only guards, none on these doors', () => {
    const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
    // Teaching script + the teacher history tab + student-mode derivation. If a
    // future change adds a school-only guard to one of the widened doors, this
    // count moves and the pin above should be revisited.
    const schoolOnly = anti.match(/isTeacherMode\s*&&\s*!isParentMode\s*&&\s*!isIndependentMode/g) || [];
    expect(schoolOnly.length).toBe(3);
  });
});
