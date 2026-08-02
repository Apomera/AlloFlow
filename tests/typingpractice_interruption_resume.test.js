import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice interruption recovery', () => {
  it('stores partial work separately from completed progress', () => {
    expect(source).toContain('interruptedDrill: null');
    expect(source).toContain('var saveInterruptedDrill = function(reason)');
    expect(source).toContain("upd('interruptedDrill', null);");
    expect(source).toContain('it will not count as a completed session');
  });

  it('rehydrates a saved target and typed prefix for resume', () => {
    expect(source).toContain('interruptedDraftMatches');
    expect(source).toContain('Saved typing draft restored. Continue when you are ready.');
    expect(source).toContain("setSightReadLeft(resumeDraft ? 0");
    expect(source).toContain('Debounced progress save covers reloads');
  });

  it('surfaces an explicit resume-or-discard choice on the menu', () => {
    expect(source).toContain("'aria-label': 'Resume saved practice'");
    expect(source).toContain('not counted yet');
    expect(source).toContain('Discard saved practice?');
    expect(source).toContain("setAnnounceText('Resuming saved '");
  });

  it('validates interrupted drafts in full-backup restores', () => {
    expect(source).toContain("backupState.interruptedDrill !== undefined && backupState.interruptedDrill !== null");
    expect(source).toContain('Interrupted drill draft uses an unknown drill.');
    expect(source).toContain('Interrupted drill draft is too large.');
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });
});
