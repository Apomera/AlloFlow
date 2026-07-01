// Live Session Center + help signals (2026-07-01) — source pins on
// AlloFlowANTI.txt and live_polling_module.js, in the style of
// canvas_shell_live_controls.test.js.
//
// Pins: (1) the consolidated teacher dock exists and launches poll /
// quick-check / pictionary; (2) the help-signal channel stays enum-only and
// Tier-1 (signal/signalAt allowlisted, options fixed, writes gated through
// writeToSession); (3) the polling HostPanel supports initialPoll composer
// presets the dock's Quick Check relies on.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const polling = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');

describe('Live Session Center dock (teacher)', () => {
  it('mounts one dock that launches poll, quick check and pictionary', () => {
    expect(anti).toContain("t('live_dock.title') || 'Live Session Center'");
    expect(anti).toContain('setLivePollPreset(null); setShowLivePollingPanel(true); setShowLiveDock(false);');
    expect(anti).toContain("t('live_dock.quick_check')");
    expect(anti).toContain('setShowPictionaryHost(true); setShowLiveDock(false);');
  });

  it('passes the composer preset into the polling HostPanel and clears it on close', () => {
    expect(anti).toContain('initialPoll: livePollPreset');
    expect(anti).toContain('setShowLivePollingPanel(false); setLivePollPreset(null);');
  });

  it('quick check seeds a 1-3 confused→ready rating poll', () => {
    expect(anti).toContain('1 = Confused\\n2 = Okay\\n3 = Ready');
    expect(anti).toContain('ratingMin: 1, ratingMax: 3');
  });

  it('shows a privacy note describing the peer-only transport', () => {
    expect(anti).toContain("t('live_dock.privacy_note')");
  });
});

describe('Help signals (Tier-1 enum-only channel)', () => {
  it('allowlists signal + signalAt for writeToSession', () => {
    expect(anti).toContain("'signal', 'signalAt',");
  });

  it('keeps the vocabulary a fixed enum set (no free text)', () => {
    expect(anti).toContain('const LIVE_SIGNAL_OPTIONS = [');
    for (const id of ['stuck', 'slow', 'repeat', 'ready']) {
      expect(anti).toContain(`{ id: '${id}',`);
    }
  });

  it('student sender writes through the Tier-1 gate, not raw updateDoc', () => {
    const senderIdx = anti.indexOf('const sendSignal = (id) =>');
    expect(senderIdx).toBeGreaterThan(-1);
    const senderBlock = anti.slice(senderIdx, senderIdx + 400);
    expect(senderBlock).toContain('writeToSession(signalRef,');
    expect(senderBlock).toContain('roster.${user.uid}.signal');
    expect(senderBlock).toContain('roster.${user.uid}.signalAt');
  });

  it('teacher dock lists fresh signals and can clear them', () => {
    expect(anti).toContain('LIVE_SIGNAL_FRESH_MS');
    expect(anti).toContain('const clearSignal = (uid) =>');
    expect(anti).toContain("t('live_dock.clear_all_signals')");
  });
});

describe('HostPanel initialPoll presets (live_polling_module.js)', () => {
  it('seeds the composer from props.initialPoll when the panel opens', () => {
    expect(polling).toContain('props.initialPoll');
    expect(polling).toContain('if (!isOpen || !initialPoll) return;');
    expect(polling).toContain('setPollPrompt(initialPoll.prompt)');
    expect(polling).toContain('setRatingLabels(initialPoll.ratingLabels)');
  });
});
