import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

// Question-craft tally (2026-08-23): suggestion chips carry hidden
// good/neutral/poor tiers that are stripped before the DOM — in BOTH modes
// since the single-interview tier extension landed the same day (panel had
// them first). The tally records WHICH tier the student picked (plus untiered
// 'coached' picks and self-authored 'freeform' questions), feeds the counts to
// the end-of-session summary as TRUSTED app telemetry, and archives them on
// the private session artifact — without ever exposing tiers mid-interview.

const root = process.cwd();
const personaCoreSource = fs.readFileSync(path.join(root, 'personas_source.jsx'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'view_persona_chat_source.jsx'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
const artifactSource = fs.readFileSync(path.join(root, 'persona_session_artifact_source.jsx'), 'utf8');
const contractSource = fs.readFileSync(path.join(root, 'read_aloud_artifact_contract_source.jsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const ZERO_CRAFT = 'questionCraft: { good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 }';

let Contract;
let Runtime;
beforeAll(() => {
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('persona_session_artifact_module.js');
  Contract = window.AlloModules.ReadAloudArtifactContract;
  Runtime = window.AlloModules.PersonaSessionArtifact;
});

function extractSlice(startMarker, endMarker, returnExpr) {
  const start = personaCoreSource.indexOf(startMarker);
  const end = personaCoreSource.indexOf(endMarker);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const slice = personaCoreSource.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict"; ${slice}; return ${returnExpr};`)();
}

function extractHelpers() {
  const helpers = extractSlice('const clampInteger', '// Translation policy',
    '{ normalizeQuestionCraft, bumpQuestionCraft }');
  expect(typeof helpers.normalizeQuestionCraft).toBe('function');
  expect(typeof helpers.bumpQuestionCraft).toBe('function');
  return helpers;
}

describe('question-craft helpers (behavioral)', () => {
  it('normalizes garbage to bounded integer counts and drops unknown keys', () => {
    const { normalizeQuestionCraft } = extractHelpers();
    expect(normalizeQuestionCraft(undefined)).toEqual({ good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 });
    expect(normalizeQuestionCraft(null)).toEqual({ good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 });
    expect(normalizeQuestionCraft([1, 2])).toEqual({ good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 });
    const dirty = normalizeQuestionCraft({ good: '7', neutral: 2.6, poor: -3, freeform: NaN, injected: 99 });
    expect(dirty).toEqual({ good: 7, neutral: 3, poor: 0, coached: 0, freeform: 0 });
    expect(Object.keys(dirty)).not.toContain('injected');
  });

  it('bumps exactly one known kind, caps at 999, and treats null/unknown kinds as a pure normalize', () => {
    const { bumpQuestionCraft } = extractHelpers();
    expect(bumpQuestionCraft(undefined, 'good')).toEqual({ good: 1, neutral: 0, poor: 0, coached: 0, freeform: 0 });
    expect(bumpQuestionCraft({ good: 998 }, 'good').good).toBe(999);
    expect(bumpQuestionCraft({ good: 999 }, 'good').good).toBe(999);
    expect(bumpQuestionCraft({ good: 4, freeform: 2 }, null)).toEqual({ good: 4, neutral: 0, poor: 0, coached: 0, freeform: 2 });
    expect(bumpQuestionCraft({ good: 4 }, 'nonsense')).toEqual({ good: 4, neutral: 0, poor: 0, coached: 0, freeform: 0 });
  });

  it('does not mutate the previous counts object (updater purity)', () => {
    const { bumpQuestionCraft } = extractHelpers();
    const prev = { good: 1, neutral: 0, poor: 0, coached: 0, freeform: 0 };
    const next = bumpQuestionCraft(prev, 'good');
    expect(prev.good).toBe(1);
    expect(next.good).toBe(2);
    expect(next).not.toBe(prev);
  });
});

describe('normalizeSingleSuggestions (behavioral)', () => {
  const normalizeSingleSuggestions = () => extractSlice(
    'const normalizeSingleSuggestions', 'const normalizePersonaCandidates', 'normalizeSingleSuggestions');

  it('tolerates the legacy string shape and the tiered object shape side by side', () => {
    const fn = normalizeSingleSuggestions();
    expect(fn(['Ask about her youth.', { text: 'Why did you persist?', tier: 'good' }])).toEqual([
      { text: 'Ask about her youth.', tier: null },
      { text: 'Why did you persist?', tier: 'good' },
    ]);
  });

  it('nulls invalid tiers, dedupes case-insensitively, and caps at the limit', () => {
    const fn = normalizeSingleSuggestions();
    expect(fn([{ text: 'One', tier: 'excellent' }])[0].tier).toBe(null);
    expect(fn(['Same question', { text: 'same QUESTION', tier: 'good' }])).toHaveLength(1);
    expect(fn(Array.from({ length: 9 }, (_, i) => `Question ${i}`))).toHaveLength(6);
    expect(fn(null)).toEqual([]);
    expect(fn([{ tier: 'good' }, '', 42])).toEqual([]);
  });
});

describe('single-mode tier extension', () => {
  it('choice mode generates ranked tiers exactly like the panel (2 good / 2 neutral / 2 poor, shuffled)', () => {
    // Two tiered generators: the panel one and the single-interview one.
    expect((personaCoreSource.match(/QUALITY TIERS/g) || []).length).toBe(2);
    expect(personaCoreSource).toContain("const useTiers = expectedCount === 6;");
    expect(personaCoreSource).toContain("if (balancedOptions.length !== 6) throw new Error('Persona follow-ups must contain exactly two options per quality tier');");
    expect(personaCoreSource).toContain('suggestions = fisherYatesShuffle(balancedOptions).slice(0, 6);');
    // Tier balance is enforced through the same validator the panel uses.
    expect(personaCoreSource).toContain('const balancedOptions = normalizePanelOptions(safeTieredPayload, 6, true);');
  });

  it('free-response hints stay untiered ({text, tier: null}) so picks tally as coached', () => {
    expect(personaCoreSource).toContain(".map(text => ({ text, tier: null }))");
  });

  it('the topic spark rides in untiered and replaces a neutral slot like the panel spark', () => {
    expect(personaCoreSource).toContain("next.suggestions = normalizeSingleSuggestions([{ text: cleanSpark, tier: null }, ...remainingOptions], 6);");
    expect(personaCoreSource).toContain("const neutralSlot = existingOptions.findIndex(option => option.tier === 'neutral');");
  });

  it('the view renders only the suggestion text — never the tier', () => {
    expect(viewSource).toContain("onClick={() => handlePersonaChatSubmit(typeof q === 'string' ? q : q.text, true)}");
    expect(viewSource).toContain("{typeof q === 'string' ? q : q.text}");
    expect(viewSource).not.toContain('data-tier');
    // The chip map must not branch its label or class on q.tier.
    const chipStart = viewSource.indexOf('personaState.suggestions.map((q, i)');
    expect(chipStart).toBeGreaterThan(-1);
    expect(viewSource.slice(chipStart, viewSource.indexOf('</button>', chipStart))).not.toContain('q.tier');
  });
});

describe('question-craft counting sites', () => {
  it('counts ONLY in the two turn SUCCESS commits, never at submit time or in rollback paths', () => {
    // DELIBERATE CONTRACT: a failed turn rolls its optimistic message back and
    // the same chip can be re-picked, so counting at submit time double-counts.
    // 2 = one bump per success commit (single, panel); the declaration spells
    // "bumpQuestionCraft = (" so the call-site regex does not match it. If this
    // count changes, verify the new site is a SUCCESS commit before updating.
    const bumps = personaCoreSource.match(/bumpQuestionCraft\(/g) || [];
    expect(bumps.length).toBe(2);
    const commits = personaCoreSource.match(/questionCraft: bumpQuestionCraft\(prev\.questionCraft, questionCraftKind\),/g) || [];
    expect(commits.length).toBe(2);
  });

  it('classifies the panel pick by tier at submit entry, before suggestions can be replaced', () => {
    expect(personaCoreSource).toContain('const pickedPanelTier = fromSuggestion');
    expect(personaCoreSource).toContain(
      "(((normalizePanelOptions(personaState.panelSuggestions, 6).find(option => option.text === userText.trim())) || {}).tier || null)"
    );
    expect(personaCoreSource).toContain("const questionCraftKind = pickedPanelTier || (fromSuggestion ? 'coached' : 'freeform');");
  });

  it('classifies single-mode picks by their hidden tier, falling back to coached/freeform', () => {
    expect(personaCoreSource).toContain('const pickedSingleTier = fromSuggestion');
    expect(personaCoreSource).toContain(
      "((allowedSuggestionOptions.find(option => option.text === textToSend.trim()) || {}).tier || null)"
    );
    expect(personaCoreSource).toContain("const questionCraftKind = pickedSingleTier || (fromSuggestion ? 'coached' : 'freeform');");
    // The choice validator and the tier lookup read the SAME normalized list.
    expect(personaCoreSource).toContain('const allowedSuggestionOptions = normalizeSingleSuggestions(personaState.suggestions, 6);');
    expect(personaCoreSource).toContain('const allowedChoices = allowedSuggestionOptions.map(option => option.text);');
  });

  it('keeps initial state (monolith) and resetPersonaInterviewState in lockstep with zeroed counts', () => {
    expect(personaCoreSource).toContain(ZERO_CRAFT);
    expect(appSource).toContain(ZERO_CRAFT);
  });
});

describe('summary prompt integration', () => {
  const promptStart = personaCoreSource.indexOf('Create an evidence-conscious learning summary');
  const promptEnd = personaCoreSource.indexOf('Return ONLY JSON with this exact shape:', promptStart);
  const promptRegion = personaCoreSource.slice(promptStart, promptEnd);

  it('injects the craft block into the summary prompt', () => {
    expect(promptStart).toBeGreaterThan(-1);
    expect(promptEnd).toBeGreaterThan(promptStart);
    expect(promptRegion).toContain('${questionCraftBlock}');
  });

  it('keeps the craft block OUTSIDE the untrusted fences (it is trusted app telemetry)', () => {
    const fenceStart = promptRegion.indexOf('<UNTRUSTED_INTERVIEW_TRANSCRIPT>');
    const fenceEnd = promptRegion.indexOf('</UNTRUSTED_INTERVIEW_TRANSCRIPT>');
    expect(fenceStart).toBeGreaterThan(-1);
    expect(fenceEnd).toBeGreaterThan(fenceStart);
    expect(promptRegion.slice(fenceStart, fenceEnd)).not.toContain('questionCraftBlock');
    expect(promptRegion.indexOf('${questionCraftBlock}')).toBeGreaterThan(fenceEnd);
  });

  it('marks the counts as app-measured, coaches without shaming, and suppresses raw counts in learner output', () => {
    expect(personaCoreSource).toContain('APP-MEASURED QUESTION CHOICES (trusted app telemetry; not taken from the transcript):');
    expect(personaCoreSource).toContain('Be encouraging, never shaming, and do not repeat the raw counts back to the student.');
    expect(personaCoreSource).toContain("Ground exactly ONE \"studentStrengths\" entry or ONE \"nextSteps\" entry");
  });

  it('emits nothing when no questions were counted (empty block, not a zeros line)', () => {
    expect(personaCoreSource).toContain("const questionCraftBlock = questionCraftLines.length === 0 ? '' :");
    expect(personaCoreSource).toContain('if (tieredPickCount > 0) questionCraftLines.push(');
    expect(personaCoreSource).toContain('if (selfSourcedCount > 0) questionCraftLines.push(');
  });
});

describe('resume snapshot round-trip', () => {
  it('the snapshot writer persists questionCraft only as a plain object', () => {
    expect(viewSource).toContain(
      "questionCraft: (st.questionCraft && typeof st.questionCraft === 'object' && !Array.isArray(st.questionCraft)) ? st.questionCraft : null,"
    );
  });

  it('the resume normalizer re-bounds every kind and defaults to zeros', () => {
    for (const kind of ['good', 'neutral', 'poor', 'coached', 'freeform']) {
      expect(viewSource).toContain(`${kind}: _boundedSnapshotNumber(_rawQuestionCraft.${kind}, 0, 999, 0)`);
    }
    expect(viewSource).toContain('} : { good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 };');
    expect(viewSource).toContain('questionCraft: questionCraft,');
  });

  it('resumes suggestions with their tiers preserved but still bounded to text + known tier', () => {
    expect(viewSource).toContain("_boundedSnapshotText(typeof item === 'string' ? item : (item && item.text), 500)");
    expect(viewSource).toContain("list.push({ text: text, tier: tier });");
  });
});

describe('private session artifact carries the tally', () => {
  const craftInput = (questionCraft) => ({
    sessionId: 'session-craft-001',
    resourceId: 'resource-craft',
    language: 'English',
    selectedVoice: 'Kore',
    personaState: {
      mode: 'single',
      selectedCharacter: { id: 'ada-lovelace', name: 'Ada Lovelace' },
      chatHistory: [
        { role: 'user', text: 'What is an algorithm?' },
        { role: 'model', text: 'It is a sequence of operations.' },
      ],
      questionCraft,
    },
  });

  it('lifts personaState.questionCraft into the artifact and survives serialize -> parse', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(
      craftInput({ good: 2, neutral: 1, poor: 0, coached: 1, freeform: 3 }));
    expect(artifact.session.questionCraft).toEqual({ good: 2, neutral: 1, poor: 0, coached: 1, freeform: 3 });
    const reparsed = Contract.parseReadAloudArtifact(Contract.serializeReadAloudArtifact(artifact));
    expect(reparsed.session.questionCraft).toEqual({ good: 2, neutral: 1, poor: 0, coached: 1, freeform: 3 });
  });

  it('omits an all-zero tally so empty sessions keep their pre-tally artifact shape', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(
      craftInput({ good: 0, neutral: 0, poor: 0, coached: 0, freeform: 0 }));
    expect(artifact.session).not.toHaveProperty('questionCraft');
    const legacy = await Runtime.buildPrivateSessionArtifact(craftInput(undefined));
    expect(legacy.artifact.session).not.toHaveProperty('questionCraft');
  });

  it('the contract rejects out-of-range counts and unknown craft keys outright', () => {
    const contractInput = Runtime.normalizePersonaSession(craftInput(undefined)).contractInput;
    expect(() => Contract.buildPrivatePersonaSessionArtifact(
      { ...contractInput, questionCraft: { good: -1 } })).toThrow();
    expect(() => Contract.buildPrivatePersonaSessionArtifact(
      { ...contractInput, questionCraft: { good: 1, hacked: 2 } })).toThrow();
    // Sanity: the untampered input still builds.
    expect(() => Contract.buildPrivatePersonaSessionArtifact(
      { ...contractInput, questionCraft: { good: 1 } })).not.toThrow();
  });

  it('the artifact source bounds the tally BEFORE the contract sees it', () => {
    expect(artifactSource).toContain('if (questionCraftTotal > 0) contractInput.questionCraft = questionCraft;');
    expect(artifactSource).toContain('Math.max(0, Math.min(999, Math.round(numeric)))');
    expect(contractSource).toContain("strictKeys(input.questionCraft, ['good', 'neutral', 'poor', 'coached', 'freeform'], 'questionCraft', errors)");
    expect(contractSource).toContain('questionCraft counts must be integers from 0 to 999.');
  });
});

describe('localized save-button tooltips', () => {
  it('the save button titles ride t() keys present in the master strings and the deploy mirror', () => {
    expect(viewSource).toContain("title={transcriptSavePending ? t('persona.save_transcript_title_saving') : t('persona.save_transcript_title')}");
    for (const file of ['ui_strings.js', path.join('desktop', 'web-app', 'public', 'ui_strings.js')]) {
      const strings = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      expect(strings.persona.save_transcript_title).toBe('Save private Persona session with narration');
      expect(strings.persona.save_transcript_title_saving).toBe('Saving private Persona session');
    }
  });
});

describe('gate coverage (persona mouse-only corpus)', () => {
  it('verify:gate scans the persona modules with a dedicated baseline', () => {
    expect(packageJson).toContain('(view_persona_chat|persona_ui|personas|persona_session_artifact)_module');
    expect(packageJson).toContain('persona_mouse_only_baseline.json');
    const baseline = JSON.parse(fs.readFileSync(path.join(root, 'dev-tools', 'persona_mouse_only_baseline.json'), 'utf8'));
    expect(baseline).toHaveProperty('accepted');
  });
});

describe('choices read-aloud (round 3)', () => {
  it('single and panel choice rows both offer a Hear-the-choices control on the shared TTS path', () => {
    expect(viewSource).toContain("handleSpeak(parts.join(' '), 'persona-choices', 0);");
    expect(viewSource).toContain("handleSpeak(parts.join(' '), 'persona-panel-choices', 0);");
    expect((viewSource.match(/aria-label=\{t\('persona\.speak_choices'\)\}/g) || []).length).toBe(2);
    // The playing state is reflected on the icon, honoring reduced motion.
    expect(viewSource).toContain("playingContentId === 'persona-choices' ? 'animate-pulse motion-reduce:animate-none' : ''");
    expect(viewSource).toContain("playingContentId === 'persona-panel-choices' ? 'animate-pulse motion-reduce:animate-none' : ''");
  });

  it('speaks letter labels in choice mode but never the tier', () => {
    const speakStart = viewSource.indexOf("handleSpeak(parts.join(' '), 'persona-choices'");
    const speakRegion = viewSource.slice(viewSource.lastIndexOf('<button', speakStart), speakStart);
    expect(speakRegion).toContain("String.fromCharCode(65 + index) + '. ' + optionText");
    expect(speakRegion).not.toContain('tier');
  });

  it('the speak_choices key exists in the master strings and the deploy mirror', () => {
    for (const file of ['ui_strings.js', path.join('desktop', 'web-app', 'public', 'ui_strings.js')]) {
      const strings = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      expect(strings.persona.speak_choices).toBe('Hear the choices');
    }
  });
});

describe('HTML permanent product shows the tally (round 3)', () => {
  const htmlInput = (questionCraft) => ({
    sessionId: 'session-html-001',
    resourceId: 'resource-html',
    language: 'English',
    selectedVoice: 'Kore',
    personaState: {
      mode: 'single',
      selectedCharacter: { id: 'ada-lovelace', name: 'Ada Lovelace' },
      chatHistory: [
        { role: 'user', text: 'What is an algorithm?' },
        { role: 'model', text: 'It is a sequence of operations.' },
      ],
      questionCraft,
    },
  });

  it('renders a Question sourcing section when the artifact carries a tally', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(
      htmlInput({ good: 2, neutral: 1, poor: 0, coached: 1, freeform: 3 }));
    const { html } = Runtime.buildOwnerHtmlDocument(artifact);
    expect(html).toContain('Question sourcing');
    expect(html).toContain('strong 2, middle 1, weak 0');
    expect(html).toContain('Suggested-question picks: 1.');
    expect(html).toContain('Questions the student wrote in their own words: 3.');
  });

  it('omits the section entirely for artifacts with no tally', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(htmlInput(undefined));
    const { html } = Runtime.buildOwnerHtmlDocument(artifact);
    expect(html).not.toContain('Question sourcing');
  });
});

describe('dead markdown save removed (round 3)', () => {
  it('the superseded transcript export is gone from the module and the monolith binding', () => {
    expect(personaCoreSource).not.toContain('const handleSavePersonaChat');
    expect(personaCoreSource).toContain('handleSavePersonaChat: REMOVED 2026-08-23');
    expect(appSource).not.toContain('handleSavePersonaChat = api.handleSavePersonaChat');
    // The LIVE save path keeps the prop name, mapped to the artifact save.
    expect(appSource).toContain('handleSavePersonaChat: handleSavePrivatePersonaSession');
  });
});
