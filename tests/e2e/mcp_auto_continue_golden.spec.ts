// MCP auto-continue loop goldens (v1.5, the #6-full payoff) — the driver's improvement loop
// was the last untested seam in the connector: its accept/revert/stall policy only executed
// against live Gemini. This spec closes that: a scripted loopback "Gemini" (Node http server,
// pointed at via ALLOFLOW_MCP_GEMINI_BASE) serves the REAL pipeline's real prompts —
// Vision PDF audit, structure extraction, HTML audits, and aiFixChunked's fix-chunk prompt —
// while driver.remediate({ autoContinue: true }) runs the real loop headless.
//
//   A (ACCEPT): primary ends below target with 1 AI issue → round 1's chunk fix injects a
//      marker → the re-audit of the MARKED html comes back clean/high → the round merges
//      through finalizeRemediationRound and is ACCEPTED; final html carries the marker.
//   B (REVERT→STALL): the re-audit of the marked html reports MORE issues than before →
//      noise-aware revert (the host's rule) → second round same → two-stall abandon; final
//      html does NOT carry the marker and the primary result stands.
//
// No Gemini quota is spent; network is used only for the pipeline's CDN libraries.
import { test, expect } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';

const FIX_MARKER = 'data-mcp-fix-marker="1"';

// Scenario switch consulted by the scripted model on every HTML-audit call.
let scenario: 'accept' | 'revert' = 'accept';
const calls: string[] = [];

function scriptedModel(promptText: string, hasInlineData: boolean): string {
  // Vision calls: the opening PDF audit (baseline must succeed so remediation has an audit).
  if (hasInlineData || /accessibility auditor for educational documents/i.test(promptText) || /SLICE CONTEXT/i.test(promptText)) {
    calls.push('vision-audit');
    return JSON.stringify({
      score: 55, summary: 'scripted baseline audit', confidence: 'high', documentLanguage: 'en',
      critical: [], serious: [{ issue: 'Link text is vague', wcag: '2.4.4', location: 'page 1' }],
      moderate: [], minor: [], passes: ['document has a title'],
    });
  }
  // HTML audits (the fix-loop verify + final audit + each auto-continue re-verify).
  if (/accessibility auditor\. Audit this HTML/i.test(promptText)) {
    const fixed = promptText.includes(FIX_MARKER);
    calls.push('html-audit:' + (fixed ? 'fixed' : 'unfixed'));
    if (!fixed) {
      // Primary pass: below target, ONE AI-flagged issue → auto-continue has work to do.
      return JSON.stringify({ score: 80, summary: 'one issue remains', issues: [{ issue: 'Link text is vague', wcag: '2.4.4' }], passes: ['lang present'] });
    }
    if (scenario === 'accept') {
      return JSON.stringify({ score: 97, summary: 'clean after fix', issues: [], passes: ['lang present', 'links descriptive'] });
    }
    // revert scenario: the "fix" made things WORSE — more issues than the 1 before.
    return JSON.stringify({
      score: 96, summary: 'regressions introduced', passes: [],
      issues: [{ issue: 'Link text is vague', wcag: '2.4.4' }, { issue: 'Heading order broken', wcag: '1.3.1' }, { issue: 'List structure lost', wcag: '1.3.1' }],
    });
  }
  // aiFixChunked: return the chunk with the marker as an ATTRIBUTE on an existing element.
  // (First cut appended a trailing <p> — real axe scored it as content outside the landmark
  // region, det dropped 100→94, and the loop CORRECTLY reverted the "fix". The golden's fake
  // fix must be genuinely harmless, which is itself a nice proof the revert rule works.)
  if (/Fix these WCAG violations/i.test(promptText)) {
    calls.push('fix-chunk');
    const m = /"""\n([\s\S]*?)\n"""/.exec(promptText);
    const chunk = m ? m[1] : '<p>missing</p>';
    const marked = chunk.replace(/<p([ >])/, '<p ' + FIX_MARKER + '$1');
    return marked.includes(FIX_MARKER) ? marked : (chunk + '<span ' + FIX_MARKER + '></span>');
  }
  if (/Return ONLY a JSON array/i.test(promptText)) {
    calls.push('structure');
    return JSON.stringify([
      { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
      { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
    ]);
  }
  if (/Extract ALL text content/i.test(promptText)) {
    calls.push('extract');
    return '# Photosynthesis Study Guide\nPlants convert light energy into chemical energy stored as glucose.';
  }
  calls.push('other');
  return '{}';
}

let server: http.Server;
let driver: any;

test.describe.configure({ mode: 'serial' });
test.setTimeout(420000);

test.describe('MCP auto-continue loop — scripted model, real pipeline, real reducer', () => {
  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let text = '', hasInline = false;
        try {
          const parsed = JSON.parse(body);
          const parts = (parsed.contents && parsed.contents[0] && parsed.contents[0].parts) || [];
          for (const p of parts) {
            if (p && typeof p.text === 'string') text += p.text + '\n';
            if (p && p.inline_data) hasInline = true;
          }
        } catch (_) {}
        const out = scriptedModel(text, hasInline);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: out }] }, finishReason: 'STOP' }] }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;
    process.env.ALLOFLOW_MCP_GEMINI_BASE = 'http://127.0.0.1:' + port + '/models';
    process.env.GEMINI_API_KEY = 'scripted-loopback-key';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Driver = require(path.resolve(__dirname, '../../desktop/mcp/remediation_headless_driver.cjs'));
    driver = Driver.createDriver({ log: (m: string) => { if (process.env.ALLOFLOW_MCP_VERBOSE === '1') console.log('[driver]', m); } });
  });

  test.afterAll(async () => {
    if (driver) await Promise.race([driver.close(), new Promise((r) => setTimeout(r, 20000))]);
    if (server) server.close();
    delete process.env.ALLOFLOW_MCP_GEMINI_BASE;
  });

  const SRC_PDF = path.resolve(__dirname, 'artifacts/remediation-e2e.source.pdf');

  test('A: an improving round is ACCEPTED through the canonical reducer and lands in the final output', async () => {
    scenario = 'accept';
    calls.length = 0;
    const out = await driver.remediate({
      filePath: SRC_PDF, targetScore: 95, fixPasses: 0, polishPasses: 0,
      taggedPdf: false, autoContinue: true, autoContinueRounds: 2,
    });
    expect(out.autoContinue).toBeTruthy();
    expect(out.autoContinue.roundsRun).toBeGreaterThanOrEqual(1);
    expect(out.autoContinue.log.join(' | ')).toContain('accepted');
    expect(out.autoContinue.log.join(' | ')).not.toContain('REVERTED');
    // The accepted round's html IS the final html (the marker the scripted fixer injected).
    expect(out.accessibleHtml).toContain(FIX_MARKER);
    expect(out.afterScore).toBeGreaterThanOrEqual(90); // min(97, real axe/EA) — clean fixture stays high
    expect(calls).toContain('fix-chunk');
  });

  test('B: a round that makes things WORSE is REVERTED (host rule) and two stalls abandon the loop', async () => {
    scenario = 'revert';
    calls.length = 0;
    const out = await driver.remediate({
      filePath: SRC_PDF, targetScore: 95, fixPasses: 0, polishPasses: 0,
      taggedPdf: false, autoContinue: true, autoContinueRounds: 3,
    });
    expect(out.autoContinue).toBeTruthy();
    expect(out.autoContinue.roundsRun).toBe(2); // two reverts → stall abandon, third round never runs
    const log = out.autoContinue.log.join(' | ');
    expect(log).toContain('REVERTED');
    expect(log).not.toContain('accepted');
    // The regression never reached the output: final html is the PRIMARY pass's html.
    expect(out.accessibleHtml).not.toContain(FIX_MARKER);
    // NOTE the score does NOT discriminate accept-vs-revert here, by design: the content score
    // is deduction-grounded (the model's raw `score: 80` claim is deliberately ignored — one
    // serious issue deducts to 94) and EA's det also reads 94 on this fixture, so both
    // scenarios min-govern to the same number. The discriminators are the marker, the round
    // log, and the verification state: a reverted run keeps its open issue → never complete.
    expect(out.scoreSource).toBe('min');
    expect(out.verificationState).not.toBe('complete');
  });
});
