// Privacy/data-minimization pins: live-quiz answers ride a dedicated
// peer-to-peer WebRTC star ('quiz-signaling'). When that channel is unavailable,
// Firestore receives only fixed-shape submission metadata, never an answer.
// Cross-session concept mastery remains DEVICE-LOCAL and
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

describe('quiz answers: peer-to-peer first, content-free receipt fallback', () => {
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

  it('handleSubmitLiveAnswer sends via P2P first and falls back only to a fixed-shape receipt', () => {
    const idx = anti.indexOf('const handleSubmitLiveAnswer');
    expect(idx).toBeGreaterThan(-1);
    const block = anti.slice(idx, idx + 4800);
    expect(block).toContain('sentViaChannel = g.sendResponse(payload.questionIdx, responsePayload)');
    expect(block).toContain('if (!sentViaChannel) {');
    const guardIdx = block.indexOf('if (!sentViaChannel) {');
    const writeIdx = block.indexOf('quizState.responseReceipts.${user.uid}');
    expect(writeIdx).toBeGreaterThan(guardIdx);
    const fallback = block.slice(guardIdx, block.indexOf('// Plan T v3', guardIdx));
    expect(fallback).toContain('activityId,');
    expect(fallback).toContain('questionIndex: payload.questionIdx');
    expect(fallback).toContain('submittedAt: Date.now()');
    expect(fallback).toContain("flow: 'assessment'");
    expect(fallback).not.toContain('responsePayload');
    expect(fallback).not.toContain('payload.answer');
    expect(block).not.toContain('quizState.allResponses.${user.uid}');
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

describe('class-vs-boss: P2P-first answers + anonymous results sharing (2026-07-02)', () => {
  it('StudentQuizOverlay sends answers P2P first and falls back to a content-free receipt', () => {
    for (const file of ['ui_modals_source.jsx', 'ui_modals_module.js', 'desktop/web-app/public/ui_modals_module.js']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).toContain('window.__alloQuizChannelSend');
      expect(source).toContain("p2pSend('boss:' + currentQuestionIndex, responseValue)");
      const channelIndex = source.indexOf("p2pSend('boss:'");
      const receiptIndex = source.indexOf('quizState.responseReceipts.${user.uid}');
      expect(channelIndex).toBeGreaterThan(-1);
      expect(receiptIndex).toBeGreaterThan(channelIndex);

      const fallbackStart = source.indexOf('await updateDoc(sessionRef, {', channelIndex);
      const fallbackEnd = source.indexOf('} catch (e)', fallbackStart);
      const fallback = source.slice(fallbackStart, fallbackEnd);
      expect(fallback).toContain('activityId: presentationActivityId');
      expect(fallback).toContain('questionIndex: receiptQuestionIndex');
      expect(fallback).toContain('submittedAt: Date.now()');
      expect(fallback).toContain("flow: 'presentation'");
      expect(fallback).not.toContain('optionIndex');
      expect(source).not.toContain('quizState.responses.${user.uid}');
    }
  });

  it('shell banks boss channel answers per question and merges into quizState.responses', () => {
    expect(anti).toContain("payload.pollId.indexOf('boss:') === 0");
    expect(anti).toContain('setLiveBossResponses');
    expect(anti).toContain('liveBossResponses.qIdx === String(qs.currentQuestionIndex)');
    expect(anti).toContain('window.__alloQuizChannelSend = (pollId, response)');
  });

  it('counts receipt-only participation without feeding receipts into answer scoring', () => {
    const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
    expect(teacher).toContain('const validReceiptUids = Object.entries(responseReceipts');
    expect(teacher).toContain('const answeredUidSet = new Set(scoredResponseUids.concat(validReceiptUids))');
    expect(teacher).toContain('const unscoredReceiptCount = validReceiptUids.filter');
    expect(teacher).toContain('const count = Object.values(responses || {}).filter(r => r === idx).length');
    expect(teacher).toContain('Object.values(responses || {}).map(gradeLiveResponse).filter(grade => grade.evaluable)');
    expect(teacher).not.toContain('validReceiptUids.map(gradeLiveResponse)');
    expect(teacher).toContain('submitted, unscored (peer connection unavailable)');
    expect(anti).toContain("getValidCurrentQuizResponseReceiptUids(qs, 'presentation')");
    expect(anti).toContain('const answeredUids = new Set(Object.keys(qs.responses || {}))');
  });

  it('clears receipt-only submissions at attempt, question, navigation, and mode boundaries', () => {
    const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
    expect(anti).toContain('"quizState.responseReceipts": {}');
    expect(teacher).toContain('"quizState.phase": "answering", "quizState.responses": {}, "quizState.responseReceipts": {}');
    expect(teacher.split('"quizState.responseReceipts": {}').length - 1).toBeGreaterThanOrEqual(4);
    expect(teacher).toContain('const updates = { "quizState.mode": newMode, "quizState.responses": {}, "quizState.responseReceipts": {} }');
  });

  it('teacher can share anonymous per-question results; students render them', () => {
    expect(anti).toContain('window.__alloQuizShareResults = (summary)');
    expect(anti).toContain("host.broadcastPollResults('quiz-results', summary)");
    expect(anti).toContain('setQuizSharedResults(summary || null)');
    expect(viewQuiz).toContain('window.__alloQuizShareResults');
    expect(viewQuiz).toContain('shareResultsToClass');
  });
});

describe('visual live quiz and Team Showdown reuse', () => {
  it('keeps question and option visuals aligned across source, built, and desktop student overlays', () => {
    for (const file of ['ui_modals_source.jsx', 'ui_modals_module.js', 'desktop/web-app/public/ui_modals_module.js']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).toContain('data-live-quiz-question-image');
      expect(source).toContain('data-live-quiz-option-image');
      expect(source).toContain('optionImageUrls');
      expect(source).toContain('imageAlt');
    }
  });

  it('shows the same existing quiz visuals on the live presenter device', () => {
    for (const file of ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).toContain('data-live-quiz-presenter-question-image');
      expect(source).toContain('data-live-quiz-presenter-option-grid');
      expect(source).toContain('data-live-quiz-presenter-option-image');
      expect(source).toContain('question.optionImageUrls');
    }
  });

  it('maps existing roster groups into the established four-color team wire format', () => {
    const source = readFileSync(resolve(process.cwd(), 'ui_modals_source.jsx'), 'utf8');
    expect(source).toContain('const groupedTeamIds = Object.keys(sessionData?.groups || {})');
    expect(source).toContain('groupedTeamIds.indexOf(studentGroupId)');
    expect(source).toContain('teamOptions[existingGroupIndex % teamOptions.length]');
    expect(source).toContain('quizState.teams.');
    expect(source).not.toContain("t('quiz.status.result_score', { points: 100 })");
  });
});

describe('pictionary moderation + presence polish (2026-07-02)', () => {
  const pic = readFileSync(resolve(process.cwd(), 'concept_pictionary_source.jsx'), 'utf8');
  it('guessers have a cooldown; hosts can mute a guesser; offline drawers are flagged', () => {
    expect(pic).toContain('GUESS_COOLDOWN_MS = 3000');
    expect(pic).toContain('toggleMuteGuesser');
    expect(pic).toContain('if (mutedGuessersRef.current[uid]) return;');
    expect(pic).toContain('>offline</span>');
  });

  it('guest countdowns anchor to the HOST clock (device skew immune)', () => {
    expect(pic.split('hostNow: Date.now()').length - 1).toBeGreaterThanOrEqual(3); // fresh round + reconnect replay + timing updates
    expect(pic).toContain('const clockOffsetMs = (round && typeof round.hostNow === ');
    expect(pic).toContain('const hostNow = now - clockOffsetMs;');
    expect(pic).toContain('const effectiveNow = isPaused && pausedAt ? pausedAt : hostNow;');
    expect(pic).toContain('const elapsed = effectiveNow - startedAt - pausedTotalMs;');
    expect(pic).toContain('clockOffsetMs={activeRound.clockOffsetMs || 0}');
  });
});

describe('confidence-aware routing (screening heuristics with integrity floor)', () => {
  it('router evaluates confidencePattern rules with the >=2 usable AND >=2 matched floor', () => {
    expect(anti).toContain('const _confidencePatternMatch = (when, uid)');
    expect(anti).toContain('if (when.acrossQuestions.length < 2) return false;');
    expect(anti).toContain('return usable >= 2 && matched >= 2;');
    expect(anti).toContain("entry.confidence === 'guessed'");
    expect(anti).toContain("when.confidencePattern === 'confident-wrong'");
    // Dispatched before aggregate + legacy paths
    const conf = anti.indexOf('r.when.confidencePattern && Array.isArray(r.when.acrossQuestions)');
    const agg = anti.indexOf('r.when.aggregate && Array.isArray(r.when.acrossQuestions)');
    expect(conf).toBeGreaterThan(-1);
    expect(conf).toBeLessThan(agg);
  });

  it('editor quick-adds seed >=2 gradable items and label rules as screening heuristics', () => {
    const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
    expect(teacher).toContain('const addConfidencePatternRule = (pattern)');
    expect(teacher).toContain('if (seed.length < 2)');
    expect(teacher).toContain('Screening heuristic, not a measurement');
    expect(teacher).toContain("addConfidencePatternRule('fragile')");
    expect(teacher).toContain("addConfidencePatternRule('confident-wrong')");
  });
});

describe('student answer-progress pill (2026-07-02)', () => {
  it('teacher broadcasts deduped progress; students render the pill', () => {
    expect(anti).toContain("host.broadcastPoll({ id: '__progress__'");
    expect(anti).toContain('quizProgressSentRef.current === key) return;');
    expect(anti).toContain("if (p && p.id === '__progress__') setQuizProgress");
    expect(anti).toContain("t('quiz.progress_answered') || 'answered'");
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
