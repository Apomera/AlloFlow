import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sociallab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sociallab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Social Skills Lab own-words rehearsal', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('adds an optional own-words transfer step after scenario feedback', () => {
    const text = source();
    expect(text).toContain("var _transferDraft = useState('')");
    expect(text).toContain("var _transferSaved = useState(false)");
    expect(text).toContain("role: 'region'");
    expect(text).toContain("'aria-label': 'Make the response your own'");
    expect(text).toContain("'aria-label': 'Your own words rehearsal'");
    expect(text).toContain("transferSaved ? 'Own-words rehearsal marked' : 'Mark own-words rehearsal as practiced'");
    expect(text).toContain("'aria-label': 'Own-words rehearsal status'");
    expect(text).toContain('It does not need to sound perfect; this is a rehearsal, not another test.');
  });

  it('announces the practice-round completion and resets between scenarios', () => {
    const text = source();
    expect(text).toContain("announceToSR('Your own-words rehearsal was marked for this practice round.')");
    expect((text.match(/setTransferDraft\(''\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((text.match(/setTransferSaved\(false\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).toContain("'aria-label': 'Choose your response'");
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });
});