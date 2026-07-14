// Niche live-feature write contracts (2026-07-02 audit) — source pins.
//
// The audit found that democracy voting and collaborative escape-room play
// write session-doc fields the original firestore.rules draft would have
// blocked, and that the escape-room team sync used a malformed Firestore
// path (missing 'public','data') that failed silently for its whole life.
// These pins keep the fixed path and the rules coverage from regressing.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const escapeMod = readFileSync(resolve(process.cwd(), 'escape_room_module.js'), 'utf8');
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
const adventure = readFileSync(resolve(process.cwd(), 'adventure_handlers_source.jsx'), 'utf8');

describe('escape room: every session ref uses the real sessions path', () => {
  it('has no session doc refs missing the public/data segments', () => {
    // Malformed variant: doc(db, 'artifacts', <appId>, 'sessions', ...)
    expect(escapeMod).not.toMatch(/doc\(db,\s*'artifacts',\s*\w+,\s*'sessions'/);
    // And the team-progress sync uses the corrected full path.
    expect(escapeMod).toContain("doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode)");
  });
});

describe('firestore.rules cover the niche student writes', () => {
  it('lets students cast their own democracy vote', () => {
    expect(rules).toContain('function democracyOnlySelfVote()');
    expect(rules).toContain("'democracy', 'escapeRoomState'");
    // The write these rules exist for:
    expect(adventure).toContain('democracy.votes.${user.uid}');
  });

  it('lets students update shared escape-room team progress (per-uid team claims)', () => {
    expect(rules).toContain('function escapeRoomTeamPlay()');
    expect(rules).toContain("hasOnly(['teamProgress', 'teams'])");
  });

  it('lets boss-mode students answer and auto-join teams (per-uid)', () => {
    // StudentQuizOverlay (ui_modals) writes quizState.responses.{uid} and
    // quizState.teams.{uid} — the original quizOnlySelf allowed only
    // allResponses and would have blocked class-vs-boss entirely.
    expect(rules).toContain("hasOnly(['allResponses', 'responses', 'teams'])");
    expect(rules).toContain("quizNestedOnlySelf('responses')");
    expect(rules).toContain("quizNestedOnlySelf('teams')");
    const uiModals = readFileSync(resolve(process.cwd(), 'ui_modals_source.jsx'), 'utf8');
    expect(uiModals).toContain('quizState.responses.${user.uid}');
    expect(uiModals).toContain('quizState.teams.${user.uid}');
  });
});
