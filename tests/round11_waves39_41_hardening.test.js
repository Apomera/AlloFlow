import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256File(rel) {
  return createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}

describe('Round 11 Wave 39 — Remote MCP Runner & veraPDF Hardening', () => {
  it('validates runner storage URLs, tightens failure classification, and preserves lock/integrity invariants', () => {
    const runner = require('../services/alloflow-remote-mcp/runner/server.cjs');
    const runnerSrc = readRepo('services/alloflow-remote-mcp/runner/server.cjs');
    const containerSrc = readRepo('services/alloflow-remote-mcp/src/remediation-container.ts');
    const workflowSrc = readRepo('services/alloflow-remote-mcp/src/remediation-workflow.ts');

    const allowedHosts = new Set(['r2.internal']);
    const baseReq = {
      schema: 1,
      jobId: 'job_test_01',
      input: { url: 'http://r2.internal/input', contentType: 'application/pdf' },
      output: {
        taggedPdfUrl: 'http://r2.internal/output/tagged.pdf',
        reportUrl: 'http://r2.internal/output/report.json',
      },
      options: {
        targetScore: 95,
        fixPasses: 1,
        effortProfile: 'standard',
        ocrLanguage: 'en',
        polishPasses: 0,
        taggedPdf: true,
        autoContinue: false,
        autoContinueRounds: 0,
        validateUa: false,
        maxRunMinutes: 10,
      },
    };

    // Valid payload succeeds.
    expect(runner.validateRunPayload(baseReq, allowedHosts).jobId).toBe('job_test_01');

    // Path traversal, backslash, control chars, and input/output URL aliasing are rejected.
    expect(() => runner.validateRunPayload({
      ...baseReq,
      input: { url: 'http://r2.internal/input/../secret', contentType: 'application/pdf' },
    }, allowedHosts)).toThrow();
    expect(() => runner.validateRunPayload({
      ...baseReq,
      input: { url: 'http://r2.internal/input\\evil', contentType: 'application/pdf' },
    }, allowedHosts)).toThrow();
    expect(() => runner.validateRunPayload({
      ...baseReq,
      output: {
        taggedPdfUrl: 'http://r2.internal/input',
        reportUrl: 'http://r2.internal/output/report.json',
      },
    }, allowedHosts)).toThrow();

    // Tightened driver failure classifier does not misclassify ordinary document prose.
    expect(runner.classifyDriverFailure(new Error('Document discusses sales quota targets')).code).toBe('remediation_failed');
    expect(runner.classifyDriverFailure(new Error('Form requests parent permission slip')).code).toBe('remediation_failed');
    expect(runner.classifyDriverFailure(new Error('[model_quota_exhausted] daily limit reached')).code).toBe('model_quota_exhausted');
    expect(runner.classifyDriverFailure(new Error('HTTP 429 RESOURCE_EXHAUSTED retryAfterMs=12000')).code).toBe('model_throttled');
    expect(runner.classifyDriverFailure(new Error('API_AUTH_FAILED: invalid key')).code).toBe('model_route_rejected');

    // Static invariants: no error.name leak, local artifact SHA-256 verification, checkpoint serialization,
    // idempotent output conflict check in container, and model_quota_exhausted in workflow.
    expect(runnerSrc).not.toContain('error.name');
    expect(runnerSrc).toContain('async function verifyLocalArtifact(');
    expect(runnerSrc).toContain('let checkpointChain = Promise.resolve();');
    expect(runnerSrc).toContain('remediation.taggedPdfB64 = null;');
    expect(runnerSrc).toContain("flag: 'wx'");
    expect(containerSrc).toContain('const existing = await env.DOCUMENTS.head(job.result_key);');
    expect(containerSrc).toContain('const existing = await env.DOCUMENTS.head(job.report_key);');
    expect(workflowSrc).toContain('"model_quota_exhausted"');
  });

  it('hardens verapdf_validator.html origin trust, temp-file cleanup, XML escaping, queue cap, a11y, and _headers', () => {
    const html = readRepo('verapdf/verapdf_validator.html');
    const headers = readRepo('_headers');

    // Behavioral check on _isTrustedVeraOrigin: loopback requires http: or https:.
    const fnSrc = html.slice(html.indexOf('function _isOpaqueLocalOrigin()'), html.indexOf('function _isTrustedVeraSource('));
    const ctx = vm.createContext({
      URL,
      window: { location: { origin: 'https://alloflow-cdn.pages.dev', protocol: 'https:' } },
    });
    vm.runInContext(fnSrc, ctx);
    expect(ctx._isTrustedVeraOrigin('ftp://localhost/evil')).toBe(false);
    expect(ctx._isTrustedVeraOrigin('http://localhost:3000')).toBe(true);
    expect(ctx._isTrustedVeraOrigin('https://alloflow-cdn.pages.dev')).toBe(true);
    expect(ctx._isTrustedVeraOrigin('https://evil.example')).toBe(false);

    // Temp file cleanup before save + finally, XML escaping, queue cap, boot pulse cap, WCAG 2.2 AA.
    expect(html.indexOf('const outPath = await (await new File(\'/files/struct_out.pdf\')).toPath();'))
      .toBeLessThan(html.indexOf("await doc.save('/files/struct_out.pdf');"));
    expect(html).toContain('if (ticks >= 90) { stopPulse(); return; }');
    expect(html).toContain('const MAX_PENDING_OPS = 4;');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('<h2 id="ro-heading"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("frame-src 'none'");
    expect(headers).toContain('/verapdf/*');
    expect(headers).toMatch(/\/verapdf\/\*[\s\S]*?frame-ancestors 'self'/);
  });
});

describe('Round 11 Wave 40 — STEM Shelves & Music Studio Hardening', () => {
  it('fixes MIDI export with explicit rest, guards ogTicksPerMeasure/ogValidateProject/ogClone in open_groove_core.js', () => {
    const core = require('../music_studio/open_groove_core.js');
    const project = core.ogCreateProject({ title: 'Rest MIDI Test', bpm: 120, ppq: 960 });
    const synth = project.tracks.find((t) => t.type === 'synth');
    const pattern = project.patterns[0];
    pattern.events.push(
      { id: 'ev_n1', type: 'note', trackId: synth.id, startTick: 0, durationTicks: 480, midi: 60, velocity: 0.8 },
      { id: 'ev_r1', type: 'rest', trackId: synth.id, startTick: 480, durationTicks: 480 },
      { id: 'ev_n2', type: 'note', trackId: synth.id, startTick: 960, durationTicks: 480, midi: 64, velocity: 0.8 },
    );

    // Must not throw ReferenceError: entry is not defined.
    const midiBytes = core.ogBuildMidiFile(project, pattern.id);
    expect(midiBytes).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...midiBytes.slice(0, 4))).toBe('MThd');

    // Extreme denominator never produces 0 ticks per measure.
    expect(core.ogTicksPerMeasure({ ppq: 24, timeSignature: [1, 999999] })).toBeGreaterThanOrEqual(1);

    // Validation catches reserved prototype keys, invalid ppq/timeSignature, excessive microtiming, non-array events.
    const badProj = core.ogClone(project);
    badProj.ppq = 999999;
    badProj.timeSignature = [0, 99];
    badProj.tracks[0].id = 'constructor';
    badProj.patterns[0].events[0].microtimingTicks = 999999;
    const errs = core.ogValidateProject(badProj);
    expect(errs.some((e) => /PPQ/i.test(e))).toBe(true);
    expect(errs.some((e) => /Time signature/i.test(e))).toBe(true);
    expect(errs.some((e) => /reserved id/i.test(e))).toBe(true);
    expect(errs.some((e) => /microtiming/i.test(e))).toBe(true);

    // Attribution ignores Object.prototype keys like toString.
    const attrProj = core.ogCreateProject({ title: 'Proto License' });
    attrProj.assets.push({ id: 'as1', name: 'Test', license: 'toString', attributionRequired: false });
    expect(core.ogBuildAttributionText(attrProj)).toBe('No attribution-required assets.');
  });

  it('hardens AudioEngine lifecycle/MIDI-0 in open_groove_audio.js and loop boundary/fast-path in open_groove_scheduler.js', () => {
    const core = require('../music_studio/open_groove_core.js');
    globalThis.OpenGrooveCore = core;
    const audio = require('../music_studio/open_groove_audio.js');
    const scheduler = require('../music_studio/open_groove_scheduler.js');

    // Closed AudioContext is rejected cleanly.
    const closedEngine = audio.ogCreateAudioEngine({ context: { state: 'closed' } });
    expect(closedEngine.available).toBe(false);

    // MIDI 0 (C-1) must not fall back to MIDI 60.
    const freqSet = [];
    const mockParam = () => ({ value: 0, setValueAtTime(v) { freqSet.push(v); }, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
    const mockNode = () => ({
      connect() {}, disconnect() {}, start() {}, stop() {},
      gain: mockParam(), frequency: mockParam(), detune: mockParam(), Q: mockParam(), pan: mockParam(),
    });
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      closed: false,
      close() { this.closed = true; return Promise.resolve(); },
      createGain: mockNode,
      createWaveShaper: () => ({ connect() {}, disconnect() {}, curve: null, oversample: '' }),
      createBiquadFilter: mockNode,
      createOscillator: mockNode,
      createBufferSource: mockNode,
      createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
    };
    const eng = audio.ogCreateAudioEngine({ context: mockCtx });
    expect(eng.available).toBe(true);
    expect(audio.ogPlayNote(eng, { pitch: 'C-1', velocity: 0.8 }, 0, 0.2)).toBe(true);
    // C-1 is ~8.18 Hz, clamped to min 20 Hz; MIDI 60 would be ~261.63 Hz.
    expect(freqSet.some((f) => f <= 25)).toBe(true);
    expect(freqSet.some((f) => Math.abs(f - 261.63) < 1)).toBe(false);

    // Dispose transitions engine unusable and closes AudioContext.
    audio.ogDisposeAudioEngine(eng);
    expect(eng.available).toBe(false);
    expect(mockCtx.closed).toBe(true);
    expect(audio.ogPlayDrum(eng, 'kick', 0, 0.8)).toBe(false);

    // Loop playback plan catches a swung/nudged hit crossing from loop 0 into loop 1, and skips rests.
    const proj = core.ogCreateProject({ title: 'Loop Edge', bpm: 120, ppq: 960 });
    const drum = proj.tracks.find((t) => t.type === 'drumRack');
    const pat = proj.patterns[0];
    pat.bars = 1;
    const patLen = core.ogPatternLengthTicks(proj, pat); // 3840
    pat.events.push(
      { id: 'ev_edge', type: 'drumHit', trackId: drum.id, padId: 'pad_1', startTick: patLen - 20, microtimingTicks: 40, velocity: 0.9 },
      { id: 'ev_rest', type: 'rest', trackId: drum.id, startTick: 0, durationTicks: 480 },
    );
    const loopPlan = scheduler.ogBuildLoopPlaybackPlan(proj, { patternId: pat.id, transportTick: patLen, lookaheadTicks: 200 });
    expect(loopPlan.some((it) => it.sourceId === 'ev_edge' && it.scheduledTick === patLen + 20)).toBe(true);
    expect(loopPlan.some((it) => it.type === 'rest')).toBe(false);
  });

  it('hardens circuit_shelf, sim_shelf, and molecule_shelf CSP, theme sync, origin trust, and a11y', () => {
    for (const rel of ['circuit_shelf/circuit_shelf.html', 'sim_shelf/sim_shelf.html', 'molecule_shelf/molecule_shelf.html']) {
      const html = readRepo(rel);
      expect(html, rel).toContain('http-equiv="Content-Security-Policy"');
      expect(html, rel).toContain('function isTrustedThemeOrigin(origin)');
      expect(html, rel).toContain("data.type !== 'alloflow-theme-change'");
      expect(html, rel).toContain('prefers-reduced-motion');
      expect(html, rel).toContain('aria-controls="coachBody"');
      expect(html, rel).toContain("e.key === 'ArrowRight'");
      expect(html, rel).toContain(".get('host')");
      expect(html, rel).toContain('usercontent\\.goog');
    }
    const molHtml = readRepo('molecule_shelf/molecule_shelf.html');
    expect(molHtml).toContain('var seq = ++loadSeq;');
    expect(molHtml).toContain('v.plugin.clear');
    expect(molHtml).toContain('var seq = ++describeSeq;');
  });
});

describe('Round 11 Wave 41 — Video Studio Companion & Shared Block Hardening', () => {
  it('blocks SVG data-URL bypass, truncated ZIP OOB, VTT arrow injection, and prototype collisions in [VS_SHARED]', () => {
    const modSrc = readRepo('video_studio_module.js');
    const bMark = '// [VS_SHARED_BEGIN]';
    const eMark = '// [VS_SHARED_END]';
    const sharedSrc = modSrc.slice(modSrc.indexOf(bMark), modSrc.indexOf(eMark) + eMark.length);
    const ctx = vm.createContext({ URL, Date, Math, Number, String, Array, Object, RegExp, JSON, Uint8Array, DataView, isFinite, encodeURIComponent });
    vm.runInContext(sharedSrc, ctx);

    // SVG data URLs must be rejected; raster PNG base64 data URLs accepted.
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const svgDataUrl = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+';
    const inserts = ctx.vsSanitizeTeachingInserts([
      { type: 'image_overlay', start: 0, end: 3, imageSrc: svgDataUrl },
      { type: 'image_overlay', start: 1, end: 4, imageSrc: pngDataUrl },
    ], 10);
    expect(inserts.length).toBe(1);
    expect(inserts[0].imageSrc).toBe(pngDataUrl);

    const cues = ctx.vsBuildResourceCues([
      { type: 'image', title: 'Bad SVG', data: { imageUrl: svgDataUrl } },
      { type: 'image', title: 'Good PNG', data: { imageUrl: pngDataUrl } },
    ]);
    expect(cues[0].imageSrc).toBe('');
    expect(cues[1].imageSrc).toBe(pngDataUrl);

    // Truncated ZIP with huge nameLen returns cleanly without throwing or OOB reading.
    const bogusZip = new Uint8Array(68);
    const dv = new DataView(bogusZip.buffer);
    dv.setUint32(0, 0x02014b50, true); // central directory signature
    dv.setUint16(28, 9999, true); // nameLen way past EOF
    dv.setUint32(46, 0x06054b50, true); // EOCD signature
    dv.setUint16(56, 1, true); // entry count = 1
    dv.setUint32(62, 0, true); // central dir offset = 0
    expect(ctx.vsReadZip(bogusZip)).toEqual([]);

    // VTT cue text neutralizes `-->`.
    const vtt = ctx.vsBuildVtt([{ start: 0, end: 2, text: 'Step 1 --> Step 2' }]);
    expect(vtt).not.toContain('Step 1 --> Step 2');
    expect(vtt).toContain('Step 1 -> Step 2');

    // Object.prototype keys cannot leak into presets/maps/glossary/coach JSON.
    expect(ctx.vsAudioPolishPreset('constructor').key).toBe('voice_balanced');
    expect(ctx.vsSanitizeLessonPlan([{ type: 'toString', start: 0, text: 'hi' }], 10)).toEqual([]);
    expect(ctx.vsSanitizeLocalizedDraft({ style: 'constructor' }, 10).style).toBe('natural');
    expect(ctx.vsApplyPronunciationGlossary('constructor value', [{ term: 'value', spoken: 'val' }])).toBe('constructor val');
    const chat = ctx.vsSanitizeCoachChat('{"__proto__":{"polluted":true},"guidance":"Click Save","kind":"navigation"}', { posture: 'educator' });
    expect(chat.guidance).toBe('Click Save');
    expect(({}).polluted).toBeUndefined();
  });

  it('enforces desktop offline ASR guard, opener bridge token-before-latch, export mutex, and WCAG/IDB fixes in video_studio.html', () => {
    const html = readRepo('video_studio/video_studio.html');
    expect(html).toContain('window.alloflowDesktop');
    expect(html).toContain('if (!bridgeToken || ev.data.bridge !== bridgeToken) return false;');
    expect(html).toContain('if (opener && target && bridgeToken)');
    expect(html).toContain('if (sceneExportInFlight || exportInFlight) return;');
    expect(html).toContain('if (exportInFlight || sceneExportInFlight) return;');
    expect(html).toContain('var sure = false;');
    expect(html).toContain("row.querySelector('textarea, input[type=\"text\"]')");
    expect(html).toContain("if (ev.key === 'Tab')");
    expect(html).toContain('#047857');
    expect(html).toContain('aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"');
    expect(html).toContain('req.onblocked = function ()');
    expect(html).toContain('if (age > CHECKPOINT_MAX_AGE_MS || kept >= CHECKPOINT_MAX_COUNT)');
  });
});

describe('Round 11 — 4-Way Mirror Parity', () => {
  it('maintains byte-for-byte SHA-256 parity across all 11 Round 11 browser deliverables', () => {
    const files = [
      'verapdf/verapdf_validator.html',
      'circuit_shelf/circuit_shelf.html',
      'sim_shelf/sim_shelf.html',
      'molecule_shelf/molecule_shelf.html',
      'timeline_studio/timeline_studio.html',
      'zoom_gallery/zoom_gallery.html',
      'music_studio/open_groove_core.js',
      'music_studio/open_groove_audio.js',
      'music_studio/open_groove_scheduler.js',
      'video_studio/video_studio.html',
      'video_studio_module.js',
    ];
    const mirrors = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of files) {
      const expected = sha256File(rel);
      for (const root of mirrors) {
        const dst = path.join(root, rel);
        expect(fs.existsSync(path.join(ROOT, dst)), `${dst} must exist`).toBe(true);
        expect(sha256File(dst), `${dst} must match ${rel}`).toBe(expected);
      }
    }
  });
});
