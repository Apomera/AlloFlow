// The pack planner must know WHO it is planning for.
//
// autoConfigureSettings (phase_k_helpers_source.jsx) is the single planner
// behind BOTH planning entry points:
//   - Blueprint mode      -> startLessonFlow / handleExecuteBlueprint
//   - Full Pack           -> handlePlanFullPack -> handleGenerateFullPack
//                            -> autoConfigureSettings (generation_helpers ~2493)
// so a role fix applied to one and not the other would silently diverge them.
// These tests pin that they share the planner AND that the shared prompt is
// role-aware.
//
// Before this change the prompt said only "Target Audience: ${grade}" and was
// hardcoded to a classroom frame ("TEACHER PACK GUIDANCE"), so an adult in
// self-study and a parent at the kitchen table got a plan built for a teacher
// with a class of 28 -- group protocols, class discussion kits, an exit ticket.
// isIndependentMode was ALREADY in the planner's deps and simply unused;
// isParentMode was not passed at all.
//
// The role vocabulary is not invented here. It matches the three system prompts
// the chat layer already ships (udl_chat_source.jsx ~459-464): a Family Tutor
// for parents, a Study Coach for self-directed learners, a UDL specialist for
// educators. The lesson-plan generator already branches the same three ways
// (study guide / family guide / lesson plan).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let phaseK, genHelpers, anti, generatedApp, chat;

beforeAll(() => {
  phaseK = readFileSync('phase_k_helpers_source.jsx', 'utf8');
  genHelpers = readFileSync('generation_helpers_source.jsx', 'utf8');
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  generatedApp = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
  chat = readFileSync('udl_chat_source.jsx', 'utf8');
});

// The planner body, so assertions cannot accidentally match elsewhere.
const plannerBody = () => {
  const start = phaseK.indexOf('const autoConfigureSettings = async');
  expect(start).toBeGreaterThan(-1);
  const end = phaseK.indexOf('\nconst ', start + 10);
  return phaseK.slice(start, end > 0 ? end : start + 30000);
};

describe('both planning entry points share one planner', () => {
  it('Full Pack routes its planning through autoConfigureSettings', () => {
    expect(genHelpers).toContain('batchConfig = await autoConfigureSettings(');
  });

  it('Full Pack planning is the same code path as Full Pack generation', () => {
    // handlePlanFullPack is a preflight-only call into handleGenerateFullPack,
    // which is why a planner change cannot hit one without the other.
    expect(genHelpers).toContain("return handleGenerateFullPack({ __fullPackPreflightOnly: true }, deps);");
  });
});

describe('the planner receives both role flags', () => {
  it('destructures isParentMode and isIndependentMode from deps', () => {
    const body = plannerBody();
    expect(body).toContain('isIndependentMode');
    expect(body).toContain('isParentMode');
  });

  it('the host deps builder supplies both flags to PhaseK', () => {
    const i = anti.indexOf('const _alloPhaseKHelpersDeps');
    const seg = anti.slice(i, i + 6000);
    expect(seg).toContain('isIndependentMode,');
    expect(seg).toContain('isParentMode,');
  });

  it('the Full Pack deps builder supplies both flags too', () => {
    const i = anti.indexOf('const _alloGenerationHelpersDeps');
    const seg = anti.slice(i, i + 9000);
    expect(seg).toContain('isIndependentMode,');
    expect(seg).toContain('isParentMode,');
  });

  it('Full Pack threads both flags into the planner call site', () => {
    expect(genHelpers).toContain('isParentMode');
    expect(genHelpers).toContain('isIndependentMode');
  });
});

describe('the shared prompt adapts its audience to the role', () => {
  it('replaces the bare grade-only audience line with a role-aware one', () => {
    const body = plannerBody();
    expect(body).toContain('const plannerAudience =');
    // The old line was literally "Target Audience: ${grade}" with no role.
    expect(body).not.toMatch(/Target Audience: \$\{grade\}\s*\n/);
  });

  it('frames a self-study learner as one person, not a class', () => {
    const body = plannerBody();
    expect(body).toMatch(/self-directed adult learner|independent learner working alone/i);
  });

  it('frames a parent as one child at home', () => {
    const body = plannerBody();
    expect(body).toMatch(/parent or caregiver|one child at home/i);
  });

  it('steers away from whole-class structures when there is no class', () => {
    const body = plannerBody();
    // Group protocols and exit tickets presuppose a room full of students.
    expect(body).toMatch(/group protocol|whole-class|discussion kit/i);
  });

  it('keeps the guidance label neutral instead of hardcoding TEACHER', () => {
    const body = plannerBody();
    expect(body).toContain('plannerGuidanceLabel');
    expect(body).not.toContain('TEACHER PACK GUIDANCE: "${customInput}"');
  });

  it('leaves the teacher path on the classroom framing it already had', () => {
    const body = plannerBody();
    expect(body).toMatch(/TEACHER PACK GUIDANCE/);
  });
});

describe('the blueprint-modify prompt is role-aware too (parity)', () => {
  it('no longer hardcodes a teacher as the only author', () => {
    // It said "adjusting a lesson plan blueprint based on teacher feedback"
    // and "Teacher Instruction:" regardless of who was typing.
    expect(chat).toContain('blueprintAuthorRole');
    expect(chat).not.toContain('Teacher Instruction: "${userInstruction}"');
  });

  it('receives the role flags it needs', () => {
    const start = chat.indexOf('const _modifyBlueprintWithAI');
    const seg = chat.slice(start, start + 4000);
    expect(seg).toContain('isParentMode');
    expect(seg).toContain('isIndependentMode');
  });
});

describe('the role vocabulary matches what the app already says elsewhere', () => {
  it('the chat layer already ships the three role system prompts', () => {
    expect(chat).toContain('Family Tutor and Child Development Guide');
    expect(chat).toContain('Study Coach for a self-directed learner');
    expect(chat).toContain('Universal Design for Learning (UDL) specialist');
  });
});

describe('the built ANTI mirror carries the same wiring', () => {
  it('App.jsx has both deps entries', () => {
    const i = generatedApp.indexOf('const _alloPhaseKHelpersDeps');
    expect(i).toBeGreaterThan(-1);
    const seg = generatedApp.slice(i, i + 6000);
    expect(seg).toContain('isParentMode,');
  });
});
