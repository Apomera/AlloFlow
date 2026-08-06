// Teacher bridge messages on the student device: freshness, expiry, and
// AlloBot's role during a live session.
//
// The bug these pin: the only staleness rule was a 24-HOUR server cleanup, and
// the "already seen" marker is a ref that resets on reload. So a student who
// reloaded or rejoined had a message from hours earlier displayed as though it
// had just arrived.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const anti = read(COPIES[0]);

describe('a stale teacher message is never replayed as if it were new', () => {
  it('gates display on ABSOLUTE recency, not just on being unseen', () => {
    // Unseen-ness alone is not enough: the marker resets on reload, so every
    // reload makes every message unseen again.
    expect(anti).toContain('const bridgeIsFresh = (Date.now() - payloadTs) <= BRIDGE_MESSAGE_FRESH_MS;');
    expect(anti).toContain('if (payloadTs > lastBridgeTimestampRef.current && bridgeIsFresh) {');
  });

  it('applies the same rule to the chat branch, which had the same flaw', () => {
    // That branch keyed off a WINDOW global, which resets identically.
    expect(anti).toContain('&& (Date.now() - chatTs) <= BRIDGE_MESSAGE_FRESH_MS) {');
  });

  it('keeps the freshness window far shorter than the 24h server cleanup', () => {
    const fresh = Number((anti.match(/const BRIDGE_MESSAGE_FRESH_MS = (\d+) \* 60 \* 1000/) || [])[1]);
    expect(fresh).toBe(10);
    // The cleanup is the backstop for the DOCUMENT; this is the rule for the
    // student's screen. Conflating them is what produced the bug.
    expect(anti).toContain('Date.now() - data.bridgePayload.timestamp > 86400000');
  });

  it('still shows a message to a student who joins a few minutes late', () => {
    // A freshness window that is too tight would break the legitimate case:
    // joining mid-lesson and needing to see what the class was just told.
    const fresh = Number((anti.match(/const BRIDGE_MESSAGE_FRESH_MS = (\d+) \* 60 \* 1000/) || [])[1]);
    expect(fresh).toBeGreaterThanOrEqual(5);
  });
});

describe('a delivered message clears itself', () => {
  it('expires after a visible window rather than waiting to be dismissed', () => {
    // An announcement is not a document. It should not sit on a student's
    // screen until they think to close it.
    expect(anti).toContain('const BRIDGE_MESSAGE_VISIBLE_MS = 3 * 60 * 1000;');
    expect(anti).toContain('if (elapsed >= BRIDGE_MESSAGE_VISIBLE_MS) setBridgeMessage(null);');
  });

  it('does not count time while the tab is hidden', () => {
    // A message that expired while the device was asleep was never actually
    // delivered to anybody.
    expect(anti).toContain("if (typeof document !== 'undefined' && document.hidden) return;");
  });

  it('clears its timer, so a replaced message cannot dismiss its successor', () => {
    const block = anti.slice(
      anti.indexOf('const [bridgeMessage, setBridgeMessage] = useState(null);'),
      anti.indexOf('const lastBridgeTimestampRef')
    );
    expect(block).toContain('return () => clearInterval(tick);');
    expect(block).toContain('}, [bridgeMessage]);');
  });
});

describe('AlloBot is the teacher voice in a live session, not its own', () => {
  it('stops volunteering idle tips to a student while a class is running', () => {
    // Unprompted tips during a live session read as interruption from a
    // character with no idea what the room is doing, and they compete with
    // whatever the teacher just sent.
    expect(anti).toContain('isIdleDisabled={showUDLGuide || (!isTeacherMode && !!activeSessionCode)}');
  });

  it('leaves the teacher and the solo-student cases untouched', () => {
    // The suppression is deliberately narrow: only a student, only in a live
    // session. A learner working alone still gets the companion.
    expect(anti).not.toContain('isIdleDisabled={true}');
    expect(anti).not.toContain('isIdleDisabled={!isTeacherMode}');
  });
});

describe('both ANTI copies carry it', () => {
  it('ships identically in the src mirror', () => {
    for (const p of COPIES) {
      const src = read(p);
      expect(src, p).toContain('const BRIDGE_MESSAGE_FRESH_MS = 10 * 60 * 1000;');
      expect(src, p).toContain('isIdleDisabled={showUDLGuide || (!isTeacherMode && !!activeSessionCode)}');
    }
  });

  it('defines the constants once, at module scope', () => {
    for (const p of COPIES) {
      const src = read(p);
      expect((src.match(/const BRIDGE_MESSAGE_FRESH_MS/g) || []).length, p).toBe(1);
      expect((src.match(/const BRIDGE_MESSAGE_VISIBLE_MS/g) || []).length, p).toBe(1);
    }
  });
});
