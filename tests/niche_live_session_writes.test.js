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
const adventureView = readFileSync(resolve(process.cwd(), 'view_adventure_source.jsx'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const adventureModule = readFileSync(resolve(process.cwd(), 'view_adventure_module.js'), 'utf8');
const publicAdventureModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_adventure_module.js'), 'utf8');

describe('escape room: every session ref uses the real sessions path', () => {
  it('has no session doc refs missing the public/data segments', () => {
    // Malformed variant: doc(db, 'artifacts', <appId>, 'sessions', ...)
    expect(escapeMod).not.toMatch(/doc\(db,\s*'artifacts',\s*\w+,\s*'sessions'/);
    // And the team-progress sync uses the corrected full path.
    expect(escapeMod).toContain("doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode)");
  });
});

describe('firestore.rules cover the niche student writes', () => {
  it('lets students cast only an active teacher-authored fixed-choice democracy vote', () => {
    expect(rules).toContain('function democracyOnlySelfVote()');
    expect(rules).toContain("'democracy', 'escapeRoomState'");
    expect(rules).toContain("get('phase', '') == 'voting'");
    expect(rules).toContain("in resource.data.get('democracy', {}).get('activeOptions', [])");
    // The write these rules exist for:
    expect(adventure).toContain('democracy.votes.${user.uid}');
    expect(shell).toContain("'democracy.activeOptions': activeOptions");
    expect(shell).toContain("'democracy.phase': 'voting'");
    expect(shell).toContain("const activeOptions = newOptions.map(option => String(option.action || '').trim())");
    expect(adventure).toContain('const nextActiveOptions = Array.from(new Set((data.scene?.options || [])');
    expect(adventure).toContain('"democracy.activeOptions": nextActiveOptions');
  });

  it('shows a private change-vote state to students and aggregate participation only to teachers', () => {
    expect(adventureView).toContain('var currentUserUid = props.currentUserUid');
    expect(adventureView).toContain("Vote submitted. Choose another option to change it.");
    expect(adventureView).toContain("aria-pressed={isDemocracy && !isTeacherMode ? isMyVote : undefined}");
    expect(adventureView).toContain("isDemocracy && isTeacherMode && voteCount > 0");
    expect(adventureView).toContain("democracyTotalVotes + ' of ' + democracyAudienceTotal + ' students voted'");
    expect(shell).toContain('currentUserUid: user && user.uid');
    expect(publicAdventureModule).toBe(adventureModule);
  });

  it('lets students update shared escape-room team progress (per-uid team claims)', () => {
    expect(rules).toContain('function escapeRoomTeamPlay()');
    expect(rules).toContain("hasOnly(['teamProgress', 'teams'])");
  });

  it('lets boss-mode students publish only their receipt and auto-join teams (per-uid)', () => {
    // Answer content remains P2P. The session fallback contains only the
    // student's bounded submission receipt plus their own team assignment.
    expect(rules).toContain("affectedKeys().hasOnly(['responseReceipts', 'teams'])");
    expect(rules).toContain('quizReceiptOnlySelf()');
    expect(rules).toContain("quizNestedOnlySelf('teams')");
    const uiModals = readFileSync(resolve(process.cwd(), 'ui_modals_source.jsx'), 'utf8');
    expect(uiModals).toContain('quizState.responseReceipts.${user.uid}');
    expect(uiModals).not.toContain('quizState.responses.${user.uid}');
    expect(uiModals).toContain('quizState.teams.${user.uid}');
  });
});
