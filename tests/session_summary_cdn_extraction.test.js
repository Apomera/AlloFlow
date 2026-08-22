import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadSessionSummaryApi } from './session_summary_test_utils.js';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const host = read('AlloFlowANTI.txt');
const source = read('view_session_modal_source.jsx');
const moduleSource = read('view_session_modal_module.js');
const build = read('_build_view_session_modal_module.js');

describe('lazy end-session summary extraction', () => {
  it('exports the privacy-safe summary API from the Session Modal CDN module', () => {
    const api = loadSessionSummaryApi();
    expect(api).toEqual(expect.objectContaining({
      countValidRosterQuizResponses: expect.any(Function),
      summarizeRosterLiveActivities: expect.any(Function),
      buildRosterSessionInsightBrief: expect.any(Function),
      buildRosterSessionSummary: expect.any(Function),
      shouldSaveRosterSessionSummary: expect.any(Function),
      saveRosterSessionSummary: expect.any(Function),
    }));
    expect(source).toContain('const buildRosterSessionSummary');
    expect(source).toContain('const saveRosterSessionSummary');
  });

  it('removes the extracted implementations from the boot shell', () => {
    expect(host).not.toContain('const countValidRosterQuizResponses');
    expect(host).not.toContain('const summarizeRosterLiveActivities');
    expect(host).not.toContain('const buildRosterSessionInsightBrief');
    expect(host).not.toContain('const buildRosterSessionSummary');
    expect(host).not.toContain('const shouldSaveRosterSessionSummary');
    expect(host).not.toContain('const saveRosterSessionSummary');
    expect(host).toContain('sessionSummaryApi.buildRosterSessionSummary');
    expect(host).toContain('sessionSummaryApi.saveRosterSessionSummary');
  });

  it('preloads for active teacher sessions and fails closed while unavailable', () => {
    expect(host).toContain("window.__alloRetryModule('SessionModal')");
    expect(host).toContain('requestSessionManagementModule();');
    expect(host).toContain("if (!sessionSummaryApi) return;");
    expect(host).toContain('Your live session remains open; please try again.');
    const completionStart = host.indexOf('const completeLiveSessionEnd = async');
    const completionEnd = host.indexOf('// One END regardless', completionStart);
    const completion = host.slice(completionStart, completionEnd);
    expect(completion.indexOf('if (!sessionSummaryApi) return;')).toBeLessThan(completion.indexOf('await endMailboxLiveSession'));
  });

  it('is build-managed and keeps the deploy mirror byte-identical', () => {
    expect(build).toContain('buildRosterSessionSummary: buildRosterSessionSummary');
    expect(moduleSource).toContain('window.AlloModules.SessionModal = {');
    expect(read('desktop/web-app/public/view_session_modal_module.js')).toBe(moduleSource);
  });
});
