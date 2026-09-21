// Family/independent authoring command parity.
//
// The role invariant (see tests/family_mode_role_gates.test.js): choosing the
// parent or independent role sets isTeacherMode(true) AND the family flag. The
// stated principle there is "a parent authoring for their child is the author".
//
// That test guards the OVER-exposure direction (a district personnel evaluation
// portal must not reach a parent). This one guards the UNDER-exposure direction.
//
// The parent role branch in AlloFlowANTI.txt pre-expands the glossary and
// simplified sidebar panels, and the glossary tile even carries a parent-only
// label ("Word helper"). So the app deliberately puts those authoring tools in
// front of a parent. But the matching AlloBot commands carried roles: 'teacher',
// and _commandAllowsAudience resolves a parent to the 'parent' audience — so the
// panel was in the sidebar while "make a vocabulary glossary" routed to nothing.
// Commands are FILTERED OUT here, not surfaced as gated-with-a-reason, so there
// was no feedback either.
//
// The underlying context entries are role-agnostic (allo_command_context_source.js
// wires them to plain handleGenerate calls), so this is a gate-string defect, not
// a missing capability.

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

// Core authoring actions on the source the user supplied. A parent building a
// lesson for their own child, and an adult in self-study, are both the author
// of that material.
const AUTHORING_COMMANDS = [
  'generate_analysis',
  'generate_glossary',
  'generate_simplified',
  'generate_outline',
  'generate_quiz',
  'generate_sentence_frames',
];

// hasSourceOrAnalysis gates these via `when`, so a bare {} ctx hides them for
// reasons unrelated to role. Supply it.
const parentCtx = { isParentMode: true, isTeacherMode: true, hasSourceOrAnalysis: true };
const independentCtx = { isIndependentMode: true, isTeacherMode: true, hasSourceOrAnalysis: true };

describe('the role invariant these commands sit on', () => {
  it('resolves a parent to the parent audience even though teacher mode is on', () => {
    expect(AC.getCommandAudience(parentCtx)).toBe('parent');
  });

  it('resolves an independent learner to the independent audience', () => {
    expect(AC.getCommandAudience(independentCtx)).toBe('independent');
  });
});

describe('a parent authoring for their child reaches the authoring commands', () => {
  const ids = AC ? null : null;
  it.each(AUTHORING_COMMANDS)('%s is available in parent mode', (id) => {
    const got = AC.buildAlloCommands(parentCtx).map((c) => c.id);
    expect(got).toContain(id);
  });
});

describe('an independent learner reaches the authoring commands', () => {
  it.each(AUTHORING_COMMANDS)('%s is available in independent mode', (id) => {
    const got = AC.buildAlloCommands(independentCtx).map((c) => c.id);
    expect(got).toContain(id);
  });
});

describe('the sidebar already shows a parent these same tools', () => {
  it('pre-expands glossary and simplified when the parent role is chosen', () => {
    const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
    const i = anti.indexOf("} else if (role === 'parent') {");
    expect(i).toBeGreaterThan(-1);
    const branch = anti.slice(i, i + 400);
    expect(branch).toContain('setIsTeacherMode(true);');
    expect(branch).toContain("setExpandedTools(['source-input', 'adventure', 'glossary', 'simplified'])");
  });
});

describe('school-staff surfaces stay out of family and independent modes', () => {
  // The opposite failure. Widening the authoring commands must not widen these.
  it.each(['open_leadership_hub', 'open_educator_hub'])('%s stays teacher-only', (id) => {
    expect(AC.buildAlloCommands(parentCtx).map((c) => c.id)).not.toContain(id);
    expect(AC.buildAlloCommands(independentCtx).map((c) => c.id)).not.toContain(id);
  });
});
