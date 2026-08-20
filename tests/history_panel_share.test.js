import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8');

describe('HistoryPanel community sharing', () => {
  it('shares the resource pack from the header, not each individual resource row', () => {
    expect(src).toContain('shareResourcePackToCommunity');
    expect(src).toContain('data-help-key="history_share_pack"');
    expect(src).toContain("source_type: 'resource-pack'");
    expect(src).not.toContain('history.share_to_community_aria');
    expect(src).not.toContain('alloflow_pending_submission", JSON.stringify({\n                                                title: item.title');
  });

  it('sanitizes the pack payload before staging it (fail-closed without the sanitizer)', () => {
    // Raw history items can carry biometric-class student audio
    // (fluency-record audioRecording) and base64 media; the share path must
    // run sanitizeHistoryForCloud and refuse to stage when it is unavailable.
    expect(src).toContain('window.sanitizeHistoryForCloud');
    expect(src).toContain('if (!sanitizeForCloud)');
    expect(src).toContain('mediaStripped: true');
    const shareStart = src.indexOf('const shareResourcePackToCommunity');
    const stagingIdx = src.indexOf('alloflow_pending_submission', shareStart);
    const sanitizeIdx = src.indexOf('sanitizeForCloud(', shareStart);
    expect(sanitizeIdx).toBeGreaterThan(-1);
    expect(sanitizeIdx).toBeLessThan(stagingIdx);
  });

  it('preserves text-role metadata and adds a non-blocking primary-text preflight', () => {
    expect(src).toContain('textAccessPreflight');
    expect(src).toContain('supplementalWithoutPrimary');
    expect(src).toContain('instructionalText: getInstructionalTextRecord(item)');
    expect(src).toContain('config.instructionalText');
    expect(src).toContain("item.config.instructionalContext");
    expect(src).toContain('This pack includes a supplemental adapted text but no designated primary text.');
    expect(src).toContain('advisoryOnly: true');
    // Community staging must not regain the identifying free-form fields that
    // the original allowlist intentionally omitted.
    expect(src).not.toContain('customInstructions: item.config.customInstructions');
    expect(src).not.toContain('rosterGroupName: item.config.rosterGroupName');
  });
});
