// FERPA masterstroke pins (2026-07-01): live-quiz answers ride a dedicated
// peer-to-peer WebRTC star ('quiz-signaling'; Firestore quizState.allResponses
// strictly a fallback), and cross-session concept mastery is DEVICE-LOCAL —
// the cloud conceptMastery/{uid} write is gone. Mastery reaches the teacher
// only through user-controlled channels: live P2P snapshots on the quiz
// channel and the student's saved project file, which the teacher's retention
// dashboard reads via the imported-mastery bank.
//
// These are source pins in the canvas_shell_live_controls style: they keep
// the storage-elimination guarantees (the whole point of the migration) from
// silently regressing.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const phaseK = readFileSync(resolve(process.cwd(), 'phase_k_helpers_source.jsx'), 'utf8');
const misc = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
const viewQuiz = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
const polling = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');

describe('quiz answers: peer-to-peer first, Firestore strictly fallback', () => {
  it('transport supports parallel stars via signalingPath', () => {
    expect(polling).toContain("this.signalingPath = config.signalingPath || 'signaling';");
    expect(polling).toContain('signalingCollectionRef(this.sessionCode, this.signalingPath)');
    expect(polling).toContain('signalingDocRef(this.sessionCode, this.userUid, this.signalingPath)');
  });

  it('shell mounts a headless quiz host + guest on quiz-signaling while a quiz is armed', () => {
    expect(anti.split("signalingPath: 'quiz-signaling'").length - 1).toBe(2); // host + guest
    expect(anti).toContain('quizHostRef');
    expect(anti).toContain('quizGuestRef');
  });

  it('handleSubmitLiveAnswer sends via the channel and only falls back to Firestore', () => {
    const idx = anti.indexOf('const handleSubmitLiveAnswer');
    expect(idx).toBeGreaterThan(-1);
    const block = anti.slice(idx, idx + 4200);
    expect(block).toContain('sentViaChannel = g.sendResponse(payload.questionIdx, responsePayload)');
    expect(block).toContain('if (!sentViaChannel) {');
    // The Firestore write must be INSIDE the fallback guard.
    const guardIdx = block.indexOf('if (!sentViaChannel) {');
    const writeIdx = block.indexOf('quizState.allResponses.${user.uid}');
    expect(writeIdx).toBeGreaterThan(guardIdx);
  });

  it('teacher consumers read the merged view (dashboard mount + routing rules)', () => {
    expect(anti).toContain('const quizMergedAllResponses = React.useMemo');
    expect(anti).toContain('sessionData: quizMergedSessionData');
    expect(anti).toContain('const allByUid = quizMergedAllResponses || {};');
  });
});

describe('concept mastery: device-local, never cloud-synced', () => {
  it('the cloud conceptMastery write is GONE from the submit path', () => {
    const idx = anti.indexOf('const handleSubmitLiveAnswer');
    const block = anti.slice(idx, idx + 5000);
    expect(block).not.toContain("'conceptMastery'");
    expect(block).toContain('setConceptMasteryLocal(prev =>');
  });

  it('mastery persists locally and streams to the teacher peer-to-peer', () => {
    expect(anti).toContain("safeSetItem('allo_concept_mastery'");
    expect(anti).toContain("g.sendResponse('__mastery__', next)");
    expect(anti).toContain("sendResponse('__mastery__', m)"); // on-connect snapshot
  });

  it('teacher host banks live snapshots separately from answers', () => {
    expect(anti).toContain("if (payload.pollId === '__mastery__')");
    expect(anti).toContain('setLiveMasteryByUid(prev =>');
  });
});

describe('project-file roundtrip (teacher dashboard reads submitted files)', () => {
  it('student save embeds the mastery block with a re-keying uid', () => {
    expect(phaseK).toContain('conceptMastery: (conceptMasteryLocal && conceptMasteryLocal.attempts');
    expect(phaseK).toContain('uid: (user && user.uid) || null');
    expect(phaseK).toContain('attempts: conceptMasteryLocal.attempts');
  });

  it('project load restores the student copy AND banks it for the teacher', () => {
    expect(misc).toContain('if (rawData.conceptMastery && rawData.conceptMastery.attempts)');
    expect(misc).toContain('setConceptMasteryLocal({ attempts: rawData.conceptMastery.attempts })');
    expect(misc).toContain('bankImportedConceptMastery(rawData.conceptMastery)');
    expect(anti).toContain('bankImportedConceptMastery: (m) =>');
    expect(anti).toContain("safeSetItem('allo_imported_mastery'");
  });

  it('the dashboard prefers the shell-provided mastery prop over legacy cloud reads', () => {
    expect(anti).toContain('conceptMasteryByUid: teacherConceptMasteryByUid');
    expect(viewQuiz).toContain('var propMastery = p.conceptMasteryByUid;');
    expect(viewQuiz).toContain('if (propMastery !== undefined && propMastery !== null)');
    expect(viewQuiz).toContain('conceptMasteryByUid={props.conceptMasteryByUid}');
  });
});
