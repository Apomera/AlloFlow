// AI authoring for the availability poll (spec §7).
//
// The model writes OPTION LABELS and nothing else. The risks worth pinning are
// not "is the suggestion good" (unanswerable in a test) but the boundaries:
// it must propose into the form rather than share, it must not choose who is
// voting, and its output must be clamped exactly like typing, so a bad
// generation is bounded rather than trusted.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The controller stays in the host; the form is a presentation-only CDN view.
const SRC = readFileSync('AlloFlowANTI.txt', 'utf8');
const MIRROR = readFileSync('desktop/web-app/src/AlloFlowANTI.txt', 'utf8');
const SURFACE = readFileSync('view_assignment_center_source.jsx', 'utf8');

// The handler body, so assertions are about the suggestion path and not the
// rest of a 1200-line header.
const handler = (() => {
  const start = SRC.indexOf('const suggestPollTimes = useCallback(async () => {');
  if (start < 0) throw new Error('suggestPollTimes not found');
  const end = SRC.indexOf('\n  }, [', start);
  if (end < 0) throw new Error('could not find the end of suggestPollTimes');
  return SRC.slice(start, end);
})();

describe('the model proposes, it does not decide', () => {
  it('writes only the options box', () => {
    expect(handler, 'writes the drafted lines into the options box').toMatch(/optionsText: \w+\.join/);
    // Anything else it could set would be the model making a decision that is
    // not its to make.
    for (const field of ['identityMode', 'enabled', 'allowMaybe', 'multiSelect', 'minParticipants']) {
      expect(handler, `AI must not set ${field}`).not.toContain(`${field}:`);
    }
  });

  it('never shares, creates, or sends anything', () => {
    for (const verb of ['createHomeworkAssignmentLink', 'setShowShare', 'share(', 'publish']) {
      expect(handler, `AI authoring must not ${verb}`).not.toContain(verb);
    }
  });

  it('tells the user the suggestion is a draft', () => {
    expect(SURFACE).toMatch(/Nothing is shared until you create the link/);
  });
});

describe('a bad generation is bounded, not trusted', () => {
  it('applies the same clamps as hand-entry', () => {
    // The config normalizer clamps to 80 chars and 50 options anyway; matching
    // here means what the organizer SEES is what will be stored.
    expect(handler).toContain('.slice(0, 80)');
    expect(handler).toContain('.slice(0, 12)');
    expect(handler).toMatch(/replace\(\/\[\\u0000-\\u001f\\u007f\]/);
    expect(handler).toContain('.filter(Boolean)');
  });

  it('strips list markers the model adds anyway', () => {
    // Asking for no bullets does not reliably get no bullets.
    expect(handler).toMatch(/replace\(\/\^\[\\s\\-\*\\u2022\]/);
  });

  it('degrades when the assistant is unavailable', () => {
    expect(handler).toContain("typeof window.callGemini !== 'function'");
    expect(handler).toMatch(/still type the options yourself/);
  });

  it('says so rather than silently doing nothing on an empty reply', () => {
    expect(handler, 'checks for an empty draft').toMatch(/if \(!\w+\.length\)/);
    expect(handler).toMatch(/did not suggest any (times|options)/);
  });

  it('always clears its busy flag', () => {
    // A stuck spinner on a network hiccup reads as a broken button.
    // A stuck spinner on a network hiccup reads as a broken button.
    expect(handler, 'clears busy in a finally').toMatch(/finally\s*\{[\s\S]{0,80}setPollAiBusy\(false\)/);
  });
});

describe('the prompt refuses the traps this feature invites', () => {
  it('forbids inventing time zones, which is an explicit non-goal', () => {
    expect(handler).toMatch(/Do NOT convert time zones/);
  });

  it('forbids inventing attendees or detail', () => {
    expect(handler).toMatch(/Do not invent attendees/);
  });

  it('asks for one option per line, matching the box it fills', () => {
    expect(handler).toMatch(/ONE option per line/);
  });
});

describe('it reaches both copies of the monolith', () => {
  it('is mirrored, since App.jsx is generated from these', () => {
    // The monolith exists twice and both are built from; a one-copy edit ships
    // to one surface and not the other.
    expect(SRC).toContain('const suggestPollTimes = useCallback(');
    expect(MIRROR).toContain('const suggestPollTimes = useCallback(');
    expect(SURFACE).toContain('Suggest options');
    expect(SRC).toContain('onSuggestPollTimes={suggestPollTimes}');
    expect(MIRROR).toContain('onSuggestPollTimes={suggestPollTimes}');
  });
});
