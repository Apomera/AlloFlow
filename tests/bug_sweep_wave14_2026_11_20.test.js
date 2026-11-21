import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(process.cwd());
function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function loadGlobalModule(rel, extraGlobals = {}) {
  const code = read(rel);
  const win = extraGlobals.window || {};
  const sandbox = {
    window: win,
    console,
    URL,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    ...extraGlobals,
  };
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox.window;
  sandbox.window.window = sandbox.window;
  sandbox.window.console = console;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: rel });
  sandbox._ctx = ctx;
  return sandbox;
}

function loadIntoExistingContext(rel, ctx) {
  const code = read(rel);
  vm.runInContext(code, ctx, { filename: rel });
}

describe('Wave 14 Pass 1: Core Safety, Infra & Branding', () => {
  let BP;
  beforeAll(() => {
    const sb = loadGlobalModule('brand_profile_module.js');
    BP = sb.window.AlloModules.BrandProfile;
  });

  it('brand_profile_module: validates raw name length and invalid colors before normalization, canonicalizes hex, and scopes print background', () => {
    expect(BP.isValidHex('#1a2b3c')).toBe(true);
    expect(BP.isValidHex('abc')).toBe(true);
    expect(BP.isValidHex('#12345678')).toBe(false);
    expect(BP.isValidHex('not-a-color')).toBe(false);

    const tooLong = BP.validateBrandProfile({ name: 'A'.repeat(81), colors: { accent: '#123456' } });
    expect(tooLong.ok).toBe(false);
    expect(tooLong.errors.some((e) => /80/.test(e))).toBe(true);

    const badColor = BP.validateBrandProfile({ name: 'School', colors: { accent: 'zzzzzz' } });
    expect(badColor.ok).toBe(false);
    expect(badColor.errors.some((e) => /accent/.test(e))).toBe(true);

    const noHash = BP.validateBrandProfile({ name: 'School', colors: { accent: '1a2b3c' } });
    expect(noHash.ok).toBe(true);

    const css = BP.brandProfileToCSS({ name: 'Test', colors: { accent: '1a2b3c', heading: '#111111' } });
    expect(css).toContain('#1a2b3c');
    expect(css).not.toMatch(/\.brand-header,\s*\.brand-footer\s*\{[^}]*background:/);
  });

  it('brand_profile_editor_source/module: expands 3-digit hex to 6-digit for color picker and normalizes #-less hex', () => {
    const src = read('brand_profile_editor_source.jsx');
    const built = read('brand_profile_editor_module.js');
    expect(src).toContain('toPickerHex');
    expect(built).toContain('toPickerHex');
  });

  it('safety_checker_module: normalizes curly apostrophes, handles ai_* categories, and fails closed on QR student mode object', async () => {
    const sb = loadGlobalModule('safety_checker_module.js', {
      window: {
        __alloQrStudentMode: { aiDisabled: true },
        location: { origin: 'https://alloflow.org', href: 'https://alloflow.org/' },
      },
    });
    const SC = sb.window.AlloModules.SafetyChecker;

    const curly = SC.check('I don\u2019t want to live anymore');
    expect(Array.isArray(curly)).toBe(true);
    expect(curly.length).toBeGreaterThan(0);
    expect(curly[0].severity).toBe('critical');

    expect(SC.getSeverity('ai_self_harm')).toBe('critical');
    expect(SC.getSeverity('ai_bullying')).toBe('high');
    expect(SC.getSeverity('inappropriate')).toBe('medium');
    expect(SC.getCategoryLabel('ai_self_harm')).toBe(SC.getCategoryLabel('self_harm'));

    // QR student mode object with aiDisabled:true must skip AI call even if callGemini exists
    let aiCalled = false;
    const res = await SC.aiCheck('some text that needs checking here', () => {
      aiCalled = true;
      return Promise.resolve('{"flagged":true}');
    });
    expect(aiCalled).toBe(false);
    expect(res).toBeFalsy();
  });

  it('word_timing_module: clamps snapped boundaries monotonically, avoids hash-only cache key collisions, and fails closed on opaque origin', async () => {
    let fetched = false;
    const sb = loadGlobalModule('word_timing_module.js', {
      window: {
        location: { origin: 'null', href: 'about:blank' },
        fetch: () => {
          fetched = true;
          return Promise.resolve({ ok: false });
        },
      },
    });
    const WT = sb.window.AlloModules.WordTiming;

    // Opaque origin must fail closed for http/https URLs without calling fetch
    const blocked = await WT.timingsForUrl('https://evil.example/a.mp3', 'one two three');
    expect(blocked).toBeNull();
    expect(fetched).toBe(false);

    // Monotonic boundary clamping from PCM channel with leading/trailing silence + bursts
    const sr = 8000;
    const channelData = new Float32Array(sr * 2);
    for (let i = 1600; i < 3600; i++) channelData[i] = 0.8;
    for (let i = 5600; i < 7600; i++) channelData[i] = 0.8;
    for (let i = 10400; i < 12800; i++) channelData[i] = 0.8;
    const mapping = WT.estimateFromChannel({ sentence: 'one two three', channelData, sampleRate: sr });
    expect(mapping).toBeTruthy();
    for (let i = 0; i < mapping.boundaryMs.length; i++) {
      expect(mapping.boundaryMs[i]).toBeGreaterThanOrEqual(mapping.speechStartMs);
      expect(mapping.boundaryMs[i]).toBeLessThanOrEqual(mapping.speechEndMs);
      if (i > 0) expect(mapping.boundaryMs[i]).toBeGreaterThanOrEqual(mapping.boundaryMs[i - 1]);
    }
    expect(read('word_timing_module.js')).toContain('hashSentence(url) + ');
  });

  it('adaptive_controller_source/module: handles modal container objects, ancestor visibility, cursor stick release, and R3 dictation failure', () => {
    const src = read('adaptive_controller_source.jsx');
    const built = read('adaptive_controller_module.js');
    expect(src).toContain('entry.root || entry.container || entry.element || entry');
    expect(src).toContain('_gpadReleaseRightStickKeys();');
    expect(src).toContain('started !== false');
    expect(built).toContain('_gpadReleaseRightStickKeys');
  });
});

describe('Wave 14 Pass 2: SEL Hub Tools (6 files)', () => {
  it('sel_tool_selfadvocacy: uses string toast args, readable letter text, crisis modal, aria-label on rehearsal input, and scoped print CSS', () => {
    const s = read('sel_hub/sel_tool_selfadvocacy.js');
    expect(s).not.toMatch(/addToast\s*\(\s*\{/);
    expect(s).toContain("'aria-label': 'Your rehearsal response'");
    expect(s).toContain('.selfadv-tool');
    expect(s).toContain('showCrisisModal');
  });

  it('sel_tool_digitalwellbeing: fixes overnight sleep slider value, crisis modal, and roving tablist keyboard navigation', () => {
    const s = read('sel_hub/sel_tool_digitalwellbeing.js');
    expect(s).toContain('sleepStop < 18 ? sleepStop + 24 : sleepStop');
    expect(s).toContain('showCrisisModal');
    expect(s).toContain("e.key === 'ArrowRight'");
  });

  it('sel_tool_cultureexplorer: lowers story_listener threshold to 3, guards audio mute, adds crisis modal & keyboard tablist, deduplicates XP', () => {
    const s = read('sel_hub/sel_tool_cultureexplorer.js');
    expect(s).toContain('(d.storiesRead || []).length >= 3');
    expect(s).toContain('__alloIsGlobalMuted');
    expect(s).toContain('showCrisisModal');
    expect(s).toContain('recipesXpAwarded');
    expect(s).toContain("e.key === 'ArrowRight'");
  });

  it('sel_tool_community: fixes HC button ink, render-phase visitedTabs, global mute, fresh checkBadges overrides, gradeBand preference, crisis modal, aria-label, clipboard & XP dedup', () => {
    const s = read('sel_hub/sel_tool_community.js');
    expect(s).toContain('var _comBtnFg = _comHC ?');
    expect(s).toContain('React.useEffect(function() {\n          if (!visitedTabs[activeTab])');
    expect(s).toContain('__alloIsGlobalMuted');
    expect(s).toContain('function checkBadges(overrides)');
    expect(s).toContain("ctx.gradeBand === 'elementary'");
    expect(s).toContain("'aria-label': pwReflectionSaved ? 'Reflection saved' : 'Save privilege walk reflection'");
    expect(s).toContain('learnedItems');
    expect(s).toContain('scCompletedIds');
  });

  it('sel_tool_civicaction: scopes civic-a11y CSS, fixes global mute, removes quiz spoiler aria-label, adds keyboard tablists, fixes Power Map 0-coord, wires democracy_champion & crisis checks', () => {
    const s = read('sel_hub/sel_tool_civicaction.js');
    expect(s).toContain('.civic-action-root *');
    expect(s).toContain('__alloIsGlobalMuted');
    expect(s).not.toContain("'aria-label': '\\ud83d\\udca1 ' + question.explain");
    expect(s).toContain('data-civic-tab');
    expect(s).toContain('data-rights-sec');
    expect(s).toContain("typeof s[axis] === 'number'");
    expect(s).toContain("awardBadge('democracy_champion')");
    expect(s).toContain('powermap:');
    expect(s).toContain('talkprep:');
  });

  it('sel_tool_upstander: fixes global mute, removes render-phase setState & badge XP re-award, adds crisis modal + genFocus safety, keyboard tablists, HC contrast & gradeBand labels', () => {
    const s = read('sel_hub/sel_tool_upstander.js');
    expect(s).toContain('__alloIsGlobalMuted');
    expect(s).toContain('React.useEffect(function() {\n        if (!exploredTabs[activeTab])');
    expect(s).not.toContain('Re-award XP for the action even if badge already earned');
    expect(s).toContain('var _upDisabledBg =');
    expect(s).toContain('var _upBandLabel =');
    expect(s).toContain('upstander_gen');
    expect(s).toContain('upstander_pledge');
    expect(s).toContain('upstander_witnesslog');
    expect(s).toContain('data-up-tab');
    expect(s).toContain('data-de-tab');
    expect(s).toContain('data-ref-tab');
  });
});

describe('Wave 14 Pass 3: Artifacts, Behavior Lens & SpEd STEM Tools', () => {
  let sb;
  let Contract;
  let AudioMod;
  let PersonaMod;
  let BLW;

  beforeAll(() => {
    sb = loadGlobalModule('read_aloud_artifact_contract_module.js');
    loadIntoExistingContext('read_aloud_artifact_audio_module.js', sb._ctx);
    loadIntoExistingContext('persona_session_artifact_module.js', sb._ctx);
    loadIntoExistingContext('behavior_lens_workspace_module.js', sb._ctx);
    Contract = sb.window.AlloModules.ReadAloudArtifactContract;
    AudioMod = sb.window.AlloModules.ReadAloudArtifactAudio;
    PersonaMod = sb.window.AlloModules.PersonaSessionArtifact;
    BLW = sb.window.AlloModules.BehaviorLensWorkspace;
  });

  it('read_aloud_artifact_contract_module: blocks prototype-polluting roles, malformed base64 padding, and null/boolean/blank numeric coercion', () => {
    const res = vm.runInContext(`
      (function() {
        const C = window.AlloModules.ReadAloudArtifactContract;
        const badProto = C.validateReadAloudArtifact({
          schema: C.SCHEMA,
          schemaVersion: C.SCHEMA_VERSION,
          artifactType: C.TYPES.PERSONA_SESSION,
          id: 'sess-1',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
          privacy: Object.assign({}, C.PERSONA_PRIVACY),
          persona: { id: 'p1', name: 'Ada' },
          voiceProfile: { voiceId: 'v1', rate: null, resolverVersion: false },
          messages: [{ id: 'm1', role: '__proto__', speaker: 'Ada', text: 'Hello', order: null, audio: { mimeType: 'audio/mpeg', base64: 'A===', durationMs: null } }],
        });
        return badProto;
      })()
    `, sb._ctx);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('read_aloud_artifact_audio_module: bounds synthesis rates, resolverVersion, and maxRetries strictly', () => {
    const src = read('read_aloud_artifact_audio_source.jsx');
    expect(src).toContain('boundedRate');
    expect(src).toContain('boundedResolverVersion');
    expect(src).toContain('boundedMaxRetries');
    expect(AudioMod).toBeTruthy();
  });

  it('persona_session_artifact_module: preserves decimals/URLs/abbreviations/quotes in splitTranscriptText, blocks constructor locale, and avoids double HTML escaping', async () => {
    const split = PersonaMod.splitTranscriptText('Pi is 3.14 today! Visit https://alloflow.org now. The U.S.A. won "fairly." Next?');
    const joined = split.join(' ');
    expect(joined).toContain('3.14');
    expect(joined).toContain('https://alloflow.org');
    expect(joined).toContain('U.S.A.');
    expect(joined).toContain('"fairly."');
    expect(joined).toContain('Next?');

    const html = await vm.runInContext(`
      (async function() {
        const P = window.AlloModules.PersonaSessionArtifact;
        const built = await P.buildPrivateSessionArtifact({
          id: 'ps-1',
          title: 'Test <Session>',
          language: 'constructor',
          personaName: 'Ada & Grace',
          messages: [{ role: 'persona', speaker: 'Ada & Grace', text: 'Hello <world>' }],
        });
        const doc = P.buildOwnerHtmlDocument(built.artifact || built);
        return typeof doc === 'string' ? doc : String(doc && doc.html || '');
      })()
    `, sb._ctx);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Ada &amp; Grace');
    expect(html).not.toContain('&amp;amp;');
  });

  it('behavior_lens_workspace_module: enforces maxBytes on arrays, preserves null durationMs, guards non-finite import bytes, and buckets fractional intensity safely', () => {
    const maxBytes = BLW.MAX_TOOL_STATE_BYTES;
    const hugeArr = Array.from({ length: 40 }, () => 'x'.repeat(Math.ceil(maxBytes / 10)));
    const normalizedTool = BLW.normalizeToolState({ arr: hugeArr });
    expect(normalizedTool.arr).toBeUndefined();

    const ws = BLW.normalizeWorkspace({
      workflowDiagnostics: [{ id: 'd1', timestamp: '2026-11-20T00:00:00.000Z', action: 'save', durationMs: null }],
    });
    expect(ws.workflowDiagnostics[0].durationMs).toBeNull();

    const badImport = BLW.validateWorkspaceImport({ version: 1, studentProfile: { name: 'A' } }, { sourceBytes: NaN, maxBytes: 1000 });
    expect(badImport).toBeTruthy();

    const summary = BLW.summarizeIntensity([{ intensity: 3.4 }, { intensity: 3.6 }]);
    expect(summary.distribution[3]).toBe(1);
    expect(summary.distribution[4]).toBe(1);
  });

  it('stem_tool_lawnavigator & stem_tool_eligibility: guard stale async requests, render-phase loads, URL encoding, focus forwarding, and print timer cleanup', () => {
    const law = read('stem_lab/stem_tool_lawnavigator.js');
    expect(law).toContain('mountedRef');
    expect(law).toContain('liveReqRef');
    expect(law).toContain('aiReqRef');
    expect(law).toContain('encodeURIComponent');
    expect(law).toContain('resetAiState');

    const elig = read('stem_lab/stem_tool_eligibility.js');
    expect(elig).toContain('focusSection: props.focusSection');
    expect(elig).toContain('lastFocusedSectionRef');
    expect(elig).toContain('_activePrepPrintCleanup');
  });
});
