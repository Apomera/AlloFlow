// generate_dispatcher_source.jsx - Phase J of CDN modularization.
// handleGenerate and curriculum-audit helpers — the resource-generation dispatcher.
// Switch-on-type router for simplified/glossary/quiz/outline/image/etc.

const ADAPTED_CITATION_AUDIT_VERSION = 1;
const ADAPTED_REFERENCES_HEADER_RE = /(?:^|\r?\n)[ \t]*#{1,6}[ \t]+(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|(?:Referenced|Verified)\s+Sources|Sources?(?:[ \t]*\/[^\r\n]*)?|References|Bibliography|Works\s+Cited|Références|Sources\s+du\s+texte|Referencias|Quellen)[ \t]*:?[ \t]*(?=\r?\n|$)/i;
const ADAPTED_CITATION_START_RE = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g;

function isAdaptationOffsetInsideFence(text, offset) {
  const lines = String(text || '').slice(0, Math.max(0, offset)).split(/\r?\n/);
  let openFence = '';
  for (const line of lines) {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (!marker) continue;
    const fenceChar = marker[1][0];
    if (!openFence) openFence = fenceChar;
    else if (openFence === fenceChar) openFence = '';
  }
  return !!openFence;
}

function findAdaptationMatchOutsideFences(text, pattern) {
  let offset = 0;
  while (offset <= text.length) {
    const match = pattern.exec(text.slice(offset));
    if (!match) return null;
    const absoluteIndex = offset + match.index;
    if (!isAdaptationOffsetInsideFence(text, absoluteIndex)) {
      match.index = absoluteIndex;
      return match;
    }
    offset = absoluteIndex + Math.max(1, match[0].length);
  }
  return null;
}

function splitAdaptationReferences(value) {
  const text = String(value || '');
  const match = findAdaptationMatchOutsideFences(text, ADAPTED_REFERENCES_HEADER_RE);
  if (!match) return { body: text, references: '', header: '' };
  const leadingBreak = /^(?:\r?\n)/.exec(match[0]);
  const headerStart = match.index + (leadingBreak ? leadingBreak[0].length : 0);
  const header = text.slice(headerStart, match.index + match[0].length).trim();
  const bodyBeforeReferences = text.slice(0, match.index).trim();
  let references = text.slice(headerStart).trim();
  let body = bodyBeforeReferences;

  // Older bilingual resources placed references between the target text and
  // the English delimiter. Detach only the reference portion and keep the
  // already-generated English block in the body so the final composer can
  // migrate the references to the true document trailer.
  const legacyEnglish = findAdaptationMatchOutsideFences(references, /(?:^|\r?\n)[ \t]*--- ENGLISH TRANSLATION ---[ \t]*(?:\r?\n|$)/i);
  if (legacyEnglish) {
    const englishTrailer = references.slice(legacyEnglish.index).trim();
    references = references.slice(0, legacyEnglish.index).trim();
    body = [bodyBeforeReferences, englishTrailer].filter(Boolean).join('\n\n');
  }

  return {
    body,
    references,
    header
  };
}

function extractAdaptationCitationLedgerLocal(value) {
  const text = String(value || '');
  const entries = [];
  ADAPTED_CITATION_START_RE.lastIndex = 0;
  let match;
  while ((match = ADAPTED_CITATION_START_RE.exec(text)) !== null) {
    const start = match.index;
    const urlStart = ADAPTED_CITATION_START_RE.lastIndex;
    let depth = 1;
    let escaped = false;
    let end = -1;
    for (let i = urlStart; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')' && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) continue;
    const marker = text.slice(start, end);
    entries.push({
      marker,
      label: match[0].slice(1, match[0].indexOf(']')),
      url: text.slice(urlStart, end - 1).trim(),
      start,
      end
    });
    ADAPTED_CITATION_START_RE.lastIndex = end;
  }
  return { version: ADAPTED_CITATION_AUDIT_VERSION, entries };
}

function validateAdaptationCitationConservation(before, after) {
  const beforeLedger = extractAdaptationCitationLedgerLocal(before);
  const afterLedger = extractAdaptationCitationLedgerLocal(after);
  const count = (entries) => {
    const result = new Map();
    entries.forEach(({ marker }) => result.set(marker, (result.get(marker) || 0) + 1));
    return result;
  };
  const beforeCounts = count(beforeLedger.entries);
  const afterCounts = count(afterLedger.entries);
  const missing = [];
  const unexpected = [];
  beforeCounts.forEach((expected, marker) => {
    const actual = afterCounts.get(marker) || 0;
    for (let i = actual; i < expected; i++) missing.push(marker);
  });
  afterCounts.forEach((actual, marker) => {
    const expected = beforeCounts.get(marker) || 0;
    for (let i = expected; i < actual; i++) unexpected.push(marker);
  });
  const orderChanged = missing.length === 0
    && unexpected.length === 0
    && beforeLedger.entries.some((entry, index) => entry.marker !== afterLedger.entries[index]?.marker);
  const localResult = {
    valid: missing.length === 0 && unexpected.length === 0 && !orderChanged,
    beforeCount: beforeLedger.entries.length,
    afterCount: afterLedger.entries.length,
    missing,
    unexpected,
    orderChanged
  };

  // Newer helper modules perform the same check centrally. Require the local
  // exact-marker result as well so an older/looser CDN helper can never turn a
  // changed URL into a successful audit during a rolling deployment.
  try {
    const shared = typeof window !== 'undefined'
      && window.AlloModules
      && window.AlloModules.TextPipelineHelpers
      && window.AlloModules.TextPipelineHelpers.validateCitationConservation;
    if (typeof shared === 'function') {
      const sharedResult = shared(before, after);
      const sharedValid = typeof sharedResult === 'boolean'
        ? sharedResult
        : !!(sharedResult && (sharedResult.valid ?? sharedResult.ok ?? sharedResult.conserved));
      return { ...localResult, valid: localResult.valid && sharedValid, shared: sharedResult };
    }
  } catch (_) {}
  return localResult;
}

function protectAdaptationCitations(value) {
  const text = String(value || '');
  const ledger = extractAdaptationCitationLedgerLocal(text);
  if (ledger.entries.length === 0) return { text, citations: [], original: text };
  let cursor = 0;
  let protectedText = '';
  const citations = ledger.entries.map((entry, index) => {
    let token = `⟦ALLOFLOW_CITATION_${String(index + 1).padStart(4, '0')}⟧`;
    while (text.includes(token)) token = token.replace('⟧', '_X⟧');
    protectedText += text.slice(cursor, entry.start) + token;
    cursor = entry.end;
    return { token, marker: entry.marker };
  });
  protectedText += text.slice(cursor);
  return { text: protectedText, citations, original: text };
}

function restoreProtectedAdaptationCitations(envelope, transformedValue) {
  const transformed = String(transformedValue || '');
  if (!envelope || !Array.isArray(envelope.citations) || envelope.citations.length === 0) {
    const conservation = validateAdaptationCitationConservation(envelope?.original || '', transformed);
    return { text: transformed, valid: conservation.valid, conservation };
  }
  let restored = transformed;
  let tokenValid = true;
  envelope.citations.forEach(({ token, marker }) => {
    const occurrences = restored.split(token).length - 1;
    if (occurrences !== 1) tokenValid = false;
    restored = restored.split(token).join(marker);
  });
  if (/⟦ALLOFLOW_CITATION_[^⟧]*⟧/.test(restored)) tokenValid = false;
  const conservation = validateAdaptationCitationConservation(envelope.original, restored);
  return { text: restored, valid: tokenValid && conservation.valid, conservation, tokenValid };
}

function composeAdaptedLeveledText(targetText, englishText, referencesText, isBilingual) {
  const sections = [String(targetText || '').trim()].filter(Boolean);
  const english = String(englishText || '').trim();
  if (isBilingual && english) {
    sections.push(`--- ENGLISH TRANSLATION ---\n\n${english}`);
  }
  const references = String(referencesText || '').trim();
  if (references) sections.push(references);
  return sections.join('\n\n');
}

// ─── Plan O Step 1: Vocabulary fit (deterministic) ──────────────────────
// Common 7+ letter words that should NOT count as Tier 2 academic vocab.
// Beck/McKeown defines Tier 2 as "high-utility academic words found across
// disciplines"; Tier 1 is everyday common vocab. This list catches false
// positives where word-length alone would misclassify a common word.
const COMMON_LONGER_WORDS = new Set([
  'another','because','between','through','without','thought','everyone','anything','everything','something','sometimes','somewhere','anywhere','believe','remember','important','different','together','morning','evening','country','children','friends','family','brother','sister','parents','teacher','student','teacher','school','student','question','answer','really','always','already','almost','beautiful','people','around','before','during','should','would','could','little','really','yourself','myself','himself','herself','themselves','about','above','across','against','behind','beside','beyond','underneath','tomorrow','yesterday','probably','possibly','definitely','certainly','therefore','however','because','though','although','whether','whenever','wherever','whatever','whichever','suddenly','quickly','slowly','carefully','actually','finally','exactly','maybe','perhaps','quite','everyone','someone','nobody','nothing','everywhere','anywhere','sometimes','always','usually','sometimes','never','wanted','seemed','looked','started','stopped','asked','helped','jumped','walked','talked','played','laughed','smiled','cried','watched','listened','followed','answered','planted','painted','reached','turned','opened','closed','picked','dropped','pulled','pushed','rolled','tossed','grabbed','knocked','shouted','whispered','laughed','climbed','crawled','floated','marched'
]);
// Suffixes that strongly indicate Tier 3 (domain-specific) vocabulary.
const TIER3_SUFFIX_RE = /(?:tion|sion|ology|ography|ography|osis|itis|emia|ase|ative|ation|ical|graphic|metric|phobia|trophy|stitial|chrom|sphere|morph|fluence|mission|version|ception|ulation)$/;

function parseGradeLevelToNum(g) {
  if (!g) return 4;
  const s = String(g).toLowerCase();
  if (/kinder|kg|^k\b/.test(s)) return 0;
  const m = s.match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n <= 12) return n;
  }
  if (/college|under-?grad/.test(s)) return 13;
  if (/grad/.test(s)) return 14;
  return 4;
}

function gradeBandExpectations(grade) {
  // Approximate Beck/McKeown norms for academic vocabulary load per ~500-word
  // lesson, scaled by grade band. Values are conservative starting points;
  // teachers can override when interpreting.
  if (grade <= 2)  return { tier2: 4,  tier3: 2,  band: 'K-2'    };
  if (grade <= 5)  return { tier2: 8,  tier3: 5,  band: '3-5'    };
  if (grade <= 8)  return { tier2: 14, tier3: 9,  band: '6-8'    };
  if (grade <= 12) return { tier2: 22, tier3: 15, band: '9-12'   };
  return                 { tier2: 30, tier3: 22, band: 'College' };
}

const AUDIT_STATUS_VALUES = ['Aligned', 'Partially Aligned', 'Not Aligned', 'Not evaluated', 'Not applicable', 'Compute failed'];
const AUDIT_STATUS_RANK = { 'Aligned': 0, 'Partially Aligned': 1, 'Not Aligned': 2 };

function normalizeAuditStatus(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  const match = AUDIT_STATUS_VALUES.find(function (status) { return status.toLowerCase() === raw; });
  return match || fallback || 'Not evaluated';
}

function worseAuditStatus(current, reviewed) {
  const a = normalizeAuditStatus(current);
  const b = normalizeAuditStatus(reviewed);
  if (AUDIT_STATUS_RANK[a] === undefined) return a;
  if (AUDIT_STATUS_RANK[b] === undefined) return a;
  return AUDIT_STATUS_RANK[b] > AUDIT_STATUS_RANK[a] ? b : a;
}

function applyAuditReviewStatus(dimension, review) {
  if (!dimension || !review || dimension.notApplicable || dimension.notEvaluated || dimension.computeFailed) return dimension;
  const reviewedStatus = normalizeAuditStatus(review.status, null);
  if (AUDIT_STATUS_RANK[reviewedStatus] === undefined) return dimension;
  dimension.status = worseAuditStatus(dimension.status, reviewedStatus);
  dimension.reviewedStatus = reviewedStatus;
  return dimension;
}

const AUDIT_LANGUAGE_NAME_TAGS = {
  english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt', dutch: 'nl',
  arabic: 'ar', chinese: 'zh', mandarin: 'zh', cantonese: 'yue', japanese: 'ja', korean: 'ko',
  hindi: 'hi', bengali: 'bn', urdu: 'ur', punjabi: 'pa', gujarati: 'gu', tamil: 'ta', telugu: 'te',
  marathi: 'mr', nepali: 'ne', russian: 'ru', ukrainian: 'uk', polish: 'pl', turkish: 'tr',
  vietnamese: 'vi', thai: 'th', indonesian: 'id', malay: 'ms', swahili: 'sw', somali: 'so',
  'haitian creole': 'ht', tagalog: 'tl', filipino: 'fil', greek: 'el', hebrew: 'he', persian: 'fa',
  farsi: 'fa', burmese: 'my', myanmar: 'my', khmer: 'km', lao: 'lo', amharic: 'am', yoruba: 'yo',
  zulu: 'zu', xhosa: 'xh', afrikaans: 'af', swedish: 'sv', norwegian: 'no', danish: 'da', finnish: 'fi',
  czech: 'cs', slovak: 'sk', hungarian: 'hu', romanian: 'ro', bulgarian: 'bg', croatian: 'hr',
  serbian: 'sr', bosnian: 'bs', slovenian: 'sl', albanian: 'sq', lithuanian: 'lt', latvian: 'lv',
  estonian: 'et', irish: 'ga', welsh: 'cy', 'scottish gaelic': 'gd', 'maay maay': 'ymm',
  'chin falam': 'cfm', marshallese: 'mh'
};

function normalizeAuditLanguageTag(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'und';
  const name = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/brazil.*portuguese|portuguese.*brazil/.test(name)) return 'pt-BR';
  if (/european.*portuguese|portuguese.*portugal/.test(name)) return 'pt-PT';
  if (/traditional.*chinese|chinese.*traditional/.test(name)) return 'zh-Hant';
  if (/simplified.*chinese|chinese.*simplified/.test(name)) return 'zh-Hans';
  if (AUDIT_LANGUAGE_NAME_TAGS[name]) return AUDIT_LANGUAGE_NAME_TAGS[name];
  const languageNames = Object.keys(AUDIT_LANGUAGE_NAME_TAGS).sort(function (a, b) { return b.length - a.length; });
  for (let i = 0; i < languageNames.length; i++) {
    const languageName = languageNames[i];
    if (new RegExp('(?:^|\\b)' + languageName.replace(/ /g, '\\s+') + '(?:\\b|$)', 'i').test(name)) {
      return AUDIT_LANGUAGE_NAME_TAGS[languageName];
    }
  }
  // Accept compact language tags, but do not mistake arbitrary display names
  // such as "English" for valid tags merely because they are alphabetic.
  if (/^(?:[a-z]{2,3})(?:[-_][a-z0-9]{2,8})*$/i.test(raw) || /^und$/i.test(raw)) {
    const candidate = raw.replace(/_/g, '-');
    try {
      if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) {
        return Intl.getCanonicalLocales(candidate)[0] || 'und';
      }
    } catch (e) { return 'und'; }
    return candidate;
  }
  return 'und';
}

function _collectAuditStrings(value, out, seen, depth) {
  if (value === null || value === undefined || depth > 7) return;
  if (typeof value === 'string') {
    const clean = value.trim();
    if (!clean || /^(?:data:|blob:|file:\/\/)/i.test(clean) || /^https?:\/\/\S+$/i.test(clean)) return;
    out.push(clean);
    return;
  }
  if (typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach(function (entry) { _collectAuditStrings(entry, out, seen, depth + 1); });
    return;
  }
  Object.keys(value).forEach(function (key) {
    if (/^(?:audio|audioUrl|audioPath|ttsAudio|karaokeAudio|karaokeStudentAudio|image|imageUrl|thumbnail|thumbnailUrl|blob|base64|bytes|url|path|src|id|mimes|sources|metadata|createdAt|updatedAt)$/i.test(key)) return;
    _collectAuditStrings(value[key], out, seen, depth + 1);
  });
}

function extractAuditArtifactText(artifact) {
  const chunks = [];
  if (!artifact) return '';
  _collectAuditStrings(artifact.originalText, chunks, new Set(), 0);
  _collectAuditStrings(artifact.data, chunks, new Set(), 0);
  return chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const DEDICATED_READ_ALOUD_TYPES = new Set(['adventure', 'dbq', 'faq', 'glossary', 'image', 'persona', 'quiz', 'simplified']);
const AUDIT_EXCLUDED_TYPES = new Set(['alignment-report', 'remediated', 'audit-remediation']);

function _splitAuditSentences(text, language) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(language || 'en', { granularity: 'sentence' }).segment(clean))
        .map(function (part) { return part.segment.trim(); }).filter(Boolean);
    }
  } catch (e) { /* use punctuation fallback */ }
  return clean.split(/(?<=[.!?\u3002\uff01\uff1f])\s+|[\r\n]+/u).map(function (s) { return s.trim(); }).filter(Boolean);
}

function _normalizeAuditSentenceKey(sentence) {
  return String(sentence == null ? '' : sentence).toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/([a-z0-9À-ÿ])\s*'\s*([a-z0-9À-ÿ])/g, "$1'$2")
    .replace(/([0-9])\s*\.\s*([0-9])/g, '$1.$2')
    .replace(/\s+([.,!?;:%)\]}…])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s*"\s*/g, '"')
    .replace(/([a-z0-9À-ÿ])\s*-\s*([a-z0-9À-ÿ])/g, '$1-$2')
    .replace(/\s*—\s*/g, '—')
    .replace(/\s+/g, ' ').trim();
}

function _preparedAuditSentenceEvidence(manifest, expectedSentences) {
  const container = manifest && manifest.sentences;
  const preparedKeys = new Set();
  let anonymousEntries = 0;
  let totalEntries = 0;
  if (Array.isArray(container)) {
    container.forEach(function (entry) {
      if (!entry) return;
      if (typeof entry === 'string') {
        totalEntries++;
        anonymousEntries++;
        return;
      }
      if (typeof entry !== 'object') return;
      const playable = entry.audioUrl || entry.url || entry.audioPath || entry.b64 || entry.base64 || entry.bytes || entry.data;
      if (!playable) return;
      totalEntries++;
      const sentence = entry.sentence || entry.text || entry.key;
      const key = sentence ? _normalizeAuditSentenceKey(sentence) : '';
      if (key) preparedKeys.add(key);
      else anonymousEntries++;
    });
  } else if (container && typeof container === 'object') {
    Object.keys(container).forEach(function (sentenceKey) {
      if (!container[sentenceKey]) return;
      totalEntries++;
      const key = _normalizeAuditSentenceKey(sentenceKey);
      if (key) preparedKeys.add(key);
    });
  }
  const expectedKeys = (Array.isArray(expectedSentences) ? expectedSentences : []).map(_normalizeAuditSentenceKey).filter(Boolean);
  let matchedEntries = expectedKeys.filter(function (key) { return preparedKeys.has(key); }).length;
  // Older array manifests sometimes omit their sentence text. Credit those
  // entries conservatively, never beyond the remaining readable denominator.
  matchedEntries += Math.min(anonymousEntries, Math.max(0, expectedKeys.length - matchedEntries));
  return { totalEntries: totalEntries, matchedEntries: matchedEntries };
}

function _artifactAudioEvidence(artifact, language) {
  const d = artifact && artifact.data && typeof artifact.data === 'object' ? artifact.data : {};
  const manifestCandidate = artifact && (artifact.karaokeAudio || d.karaokeAudio);
  const manifest = manifestCandidate && typeof manifestCandidate === 'object' ? manifestCandidate : null;
  const embedded = !!(d.audioUrl || d.ttsAudio || d.audioPath || (d.audio && (d.audio.url || d.audio.path)) || (artifact && (artifact.audioUrl || artifact.audioPath)));
  const readableText = extractAuditArtifactText(artifact);
  const sentenceList = _splitAuditSentences(readableText, language);
  const preparedEvidence = _preparedAuditSentenceEvidence(manifest, sentenceList);
  const expectedSentences = sentenceList.length;
  return {
    readable: !!readableText,
    // The app-wide Read This Page reader can synthesize any readable resource.
    // Dedicated controls are tracked separately because they are more discoverable
    // and may provide sentence-level highlighting or resource-specific playback.
    readAloudCapable: !!readableText,
    pageReaderEligible: !!readableText,
    dedicatedReadAloudCapable: !!(artifact && DEDICATED_READ_ALOUD_TYPES.has(artifact.type) && readableText),
    embedded: embedded,
    preparedSentences: preparedEvidence.matchedEntries,
    preparedSentenceEntries: preparedEvidence.totalEntries,
    expectedSentences: expectedSentences,
    preparedCoveragePct: expectedSentences > 0 ? Math.round((preparedEvidence.matchedEntries / expectedSentences) * 100) : null,
  };
}

function computeAudioCoverage(artifacts, language) {
  const safe = Array.isArray(artifacts) ? artifacts : [];
  let readableArtifacts = 0, readAloudCapableArtifacts = 0, dedicatedReadAloudArtifacts = 0;
  let pageReaderEligibleArtifacts = 0, embeddedAudioArtifacts = 0, totalEmbeddedAudioArtifacts = 0;
  let preparedAudioArtifacts = 0, expectedSentences = 0, preparedSentences = 0;
  let totalPreparedSentenceEntries = 0, runtimeFallbackArtifacts = 0, unscopedAudioArtifacts = 0;
  let unscopedEmbeddedAudioArtifacts = 0, unscopedPreparedAudioArtifacts = 0, unscopedPreparedSentences = 0;
  safe.forEach(function (artifact) {
    const evidence = _artifactAudioEvidence(artifact, language);
    if (evidence.readable) readableArtifacts++;
    if (evidence.readAloudCapable) readAloudCapableArtifacts++;
    if (evidence.pageReaderEligible) pageReaderEligibleArtifacts++;
    if (evidence.dedicatedReadAloudCapable) dedicatedReadAloudArtifacts++;
    if (evidence.embedded) {
      totalEmbeddedAudioArtifacts++;
      if (evidence.readable) embeddedAudioArtifacts++;
      else unscopedEmbeddedAudioArtifacts++;
    }
    totalPreparedSentenceEntries += evidence.preparedSentenceEntries;
    if (evidence.readable) {
      if (evidence.preparedSentences > 0) preparedAudioArtifacts++;
      expectedSentences += evidence.expectedSentences;
      preparedSentences += evidence.preparedSentences;
      if (evidence.readAloudCapable && evidence.preparedSentences < evidence.expectedSentences) runtimeFallbackArtifacts++;
    } else if (evidence.preparedSentenceEntries > 0) {
      unscopedPreparedAudioArtifacts++;
      unscopedPreparedSentences += evidence.preparedSentenceEntries;
    }
    if (!evidence.readable && (evidence.embedded || evidence.preparedSentenceEntries > 0)) unscopedAudioArtifacts++;
  });
  return {
    totalArtifacts: safe.length,
    readableArtifacts: readableArtifacts,
    readAloudCapableArtifacts: readAloudCapableArtifacts,
    readAloudCapabilityPct: readableArtifacts ? Math.round((readAloudCapableArtifacts / readableArtifacts) * 100) : null,
    pageReaderEligibleArtifacts: pageReaderEligibleArtifacts,
    dedicatedReadAloudArtifacts: dedicatedReadAloudArtifacts,
    dedicatedReadAloudPct: readableArtifacts ? Math.round((dedicatedReadAloudArtifacts / readableArtifacts) * 100) : null,
    embeddedAudioArtifacts: embeddedAudioArtifacts,
    embeddedAudioPct: readableArtifacts ? Math.round((embeddedAudioArtifacts / readableArtifacts) * 100) : null,
    totalEmbeddedAudioArtifacts: totalEmbeddedAudioArtifacts,
    unscopedEmbeddedAudioArtifacts: unscopedEmbeddedAudioArtifacts,
    preparedAudioArtifacts: preparedAudioArtifacts,
    totalPreparedSentenceEntries: totalPreparedSentenceEntries,
    preparedSentences: preparedSentences,
    expectedSentences: expectedSentences,
    preparedSentenceCoveragePct: expectedSentences ? Math.round((preparedSentences / expectedSentences) * 100) : null,
    unscopedAudioArtifacts: unscopedAudioArtifacts,
    unscopedPreparedAudioArtifacts: unscopedPreparedAudioArtifacts,
    unscopedPreparedSentences: unscopedPreparedSentences,
    runtimeFallbackArtifacts: runtimeFallbackArtifacts,
    runtimeFallbackAvailable: runtimeFallbackArtifacts > 0,
    notes: 'Read-aloud capability includes the app-wide Read This Page TTS reader for every readable resource. Dedicated in-resource controls, embedded audio files, and prepared synchronized sentence audio are reported separately and are not treated as equivalent evidence.',
  };
}

function _artifactCurriculumKey(artifact) {
  if (!artifact) return null;
  const d = artifact.data && typeof artifact.data === 'object' ? artifact.data : {};
  return artifact.curriculumId || artifact.projectId || d.curriculumId || d.projectId || d.auditGroupId || null;
}

function formatAuditArtifactTitle(artifact) {
  if (artifact && artifact.title) return String(artifact.title).slice(0, 160);
  const type = String(artifact && artifact.type || 'artifact').replace(/[-_]+/g, ' ').trim();
  return type.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 160);
}
function selectCurriculumArtifacts(history, config) {
  const safe = (Array.isArray(history) ? history : []).filter(function (artifact) {
    return artifact && artifact.type && !AUDIT_EXCLUDED_TYPES.has(artifact.type);
  });
  const configuredIds = config && (config.artifactIds || config.auditArtifactIds);
  const requestedIds = Array.isArray(configuredIds) ? configuredIds.map(String) : [];
  let selected = safe;
  let selectionMode = 'current eligible history';
  let curriculumKey = config && (config.curriculumId || config.projectId) || null;
  if (requestedIds.length) {
    const idSet = new Set(requestedIds);
    selected = safe.filter(function (artifact) { return idSet.has(String(artifact.id)); });
    selectionMode = 'explicit artifact IDs';
  } else {
    if (!curriculumKey) {
      const anchorIndex = safe.reduce(function (latest, artifact, index) { return artifact.type === 'analysis' ? index : latest; }, -1);
      const anchor = anchorIndex >= 0 ? safe[anchorIndex] : null;
      curriculumKey = anchor ? _artifactCurriculumKey(anchor) : null;
      if (!curriculumKey && anchorIndex >= 0) {
        selected = safe.slice(anchorIndex);
        selectionMode = 'latest analysis anchor';
      }
    }
    if (curriculumKey) {
      selected = safe.filter(function (artifact) { return String(_artifactCurriculumKey(artifact) || '') === String(curriculumKey); });
      selectionMode = 'curriculum identifier';
    }
  }
  const warnings = [];
  if (!requestedIds.length && !curriculumKey && selectionMode === 'current eligible history') warnings.push('No curriculum identifier or analysis anchor was available; the audit includes all eligible artifacts in the current history.');
  if (!selected.length) warnings.push('No eligible curriculum artifacts matched the requested audit scope.');
  return {
    artifacts: selected,
    metadata: {
      selectionMode: selectionMode,
      curriculumId: curriculumKey || null,
      requestedArtifactIds: requestedIds,
      includedArtifactIds: selected.map(function (artifact) { return artifact.id || null; }).filter(Boolean),
      includedArtifacts: selected.map(function (artifact) {
        return {
          id: artifact.id || null,
          title: String(artifact.title || formatAuditArtifactTitle(artifact) || artifact.type || 'Artifact').slice(0, 160),
          type: String(artifact.type || 'unknown').slice(0, 80),
          timestamp: artifact.timestamp || null,
        };
      }).filter(function (artifact) { return artifact.id; }).slice(0, 100),
      includedTypes: Array.from(new Set(selected.map(function (artifact) { return artifact.type; }))),
      excludedArtifactCount: safe.length - selected.length,
      warnings: warnings,
      contextTruncated: false,
    },
  };
}


// ─── Plan O: In-session LLM-review cache ─────────────────────────────
// Keyed by (dimension, artifact-fingerprint, gradeLevel). On audit re-run,
// dimensions whose inputs haven't changed reuse cached LLM reviews instead
// of re-calling Gemini. Persists for the page session only; cleared on reload.
const _auditLLMCache = new Map();
function _hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
function _auditFingerprint(artifacts, ...extras) {
    const safe = Array.isArray(artifacts) ? artifacts : [];
    const sorted = safe.slice().sort((a, b) => {
        const ai = (a && a.id) || '';
        const bi = (b && b.id) || '';
        return ai < bi ? -1 : ai > bi ? 1 : 0;
    });
    const parts = sorted.map(a => {
        if (!a) return '?';
        let dataHash = '0';
        try { dataHash = _hashStr(JSON.stringify(a.data || null)); } catch (e) { dataHash = 'circ'; }
        return (a.id || '?') + ':' + (a.type || '?') + ':' + dataHash;
    });
    return _hashStr(parts.join('|') + '||' + extras.join('|'));
}

// ─── Plan O: Harvest existing audit signals from artifacts ─────────────
// AlloFlow already produces audit-shaped data inside individual artifacts
// (analysis items contain reading-level bands + accuracy ratings; simplified
// items contain readability shifts; quiz items contain DOK levels). The
// comprehensive audit should USE these signals rather than re-derive them.
function harvestExistingAuditSignals(artifacts) {
  const out = {
    readingLevels: [],         // from analysis items: ranges + explanations
    accuracyRatings: [],       // from analysis items: rating + reason + counts
    simplifiedShifts: [],      // from simplified items: original vs simplified delta
    dokLevels: [],             // from quiz items: per-question DOK
    quizCounts: { total: 0, mcq: 0, reflection: 0 },
    scaffoldCounts: { sentenceFrames: 0, simplifiedTexts: 0, leveledGlossary: 0 },
    multimodal: { text: false, image: false, audio: false, interactive: false },
    distinctTypes: new Set(),
  };
  artifacts.forEach(item => {
    if (!item || !item.type) return;
    out.distinctTypes.add(item.type);
    const readableText = extractAuditArtifactText(item);
    if (readableText) out.multimodal.text = true;
    const audioEvidence = _artifactAudioEvidence(item);
    if (audioEvidence.readAloudCapable || audioEvidence.embedded || audioEvidence.preparedSentences > 0) out.multimodal.audio = true;
    const d = item.data;
    if (!d) return;
    if (item.type === 'analysis') {
      if (d.readingLevel && d.readingLevel.range) {
        out.readingLevels.push({
          range: String(d.readingLevel.range),
          explanation: String(d.readingLevel.explanation || ''),
        });
      }
      if (d.accuracy && d.accuracy.rating) {
        out.accuracyRatings.push({
          rating: String(d.accuracy.rating),
          reason: String(d.accuracy.reason || ''),
          discrepancyCount: Array.isArray(d.accuracy.discrepancies) ? d.accuracy.discrepancies.length : 0,
          verifiedFactCount: Array.isArray(d.accuracy.verifiedFacts) ? d.accuracy.verifiedFacts.length : 0,
        });
      }
    } else if (item.type === 'simplified') {
      out.scaffoldCounts.simplifiedTexts++;
      out.multimodal.text = true;
      // Simplified data shape varies; record what we can.
      if (typeof d === 'object' && d) {
        const original = d.originalText || d.original || '';
        const simplified = d.simplifiedText || d.text || (typeof d === 'string' ? d : '');
        if (original && simplified) {
          const origWords = (original.match(/\S+/g) || []).length;
          const simpWords = (simplified.match(/\S+/g) || []).length;
          out.simplifiedShifts.push({
            originalWords: origWords,
            simplifiedWords: simpWords,
            ratio: origWords > 0 ? +(simpWords / origWords).toFixed(2) : null,
            targetGrade: d.targetGrade || d.grade || null,
          });
        }
      }
    } else if (item.type === 'quiz' && d.questions) {
      out.multimodal.interactive = true;
      out.quizCounts.total += d.questions.length;
      d.questions.forEach(q => {
        if (q && q.dok) out.dokLevels.push(String(q.dok));
        if (q && q.type === 'reflection') out.quizCounts.reflection++;
        else out.quizCounts.mcq++;
      });
    } else if (item.type === 'sentence-frames') {
      out.scaffoldCounts.sentenceFrames++;
      out.multimodal.text = true;
    } else if (item.type === 'glossary') {
      out.multimodal.text = true;
      // Tiered glossary entries (with definitionLevel) count as scaffolds
      if (Array.isArray(d) && d.some(g => g && (g.definitionLevel || g.tier))) {
        out.scaffoldCounts.leveledGlossary++;
      }
    } else if (item.type === 'image' || item.type === 'concept-sort') {
      out.multimodal.image = true;
    } else if (item.type === 'adventure' || item.type === 'persona') {
      out.multimodal.interactive = true;
      out.multimodal.text = true;
    }
  });
  return out;
}

// ─── Plan O Step 2: Engagement variety (deterministic + LLM review) ────
function computeEngagementVariety(harvest, artifacts) {
  const distinctTypeCount = harvest.distinctTypes.size;
  const totalArtifacts = artifacts.length;
  // Diversity score: 0-1, where 1 = perfect balance across many types
  const diversity = totalArtifacts > 0
    ? Math.min(1, distinctTypeCount / Math.max(3, Math.min(7, totalArtifacts)))
    : 0;

  // DOK distribution as percentages
  const dokDist = { L1: 0, L2: 0, L3: 0, L4: 0, unknown: 0 };
  harvest.dokLevels.forEach(level => {
    const m = String(level).match(/[1-4]/);
    if (!m) { dokDist.unknown++; return; }
    dokDist['L' + m[0]]++;
  });
  const dokTotal = harvest.dokLevels.length;
  const dokPercent = {};
  if (dokTotal > 0) {
    ['L1','L2','L3','L4','unknown'].forEach(k => {
      dokPercent[k] = Math.round((dokDist[k] / dokTotal) * 100);
    });
  }

  // Multi-modal coverage
  const modalitiesPresent = ['text','image','audio','interactive'].filter(m => harvest.multimodal[m]);

  // Status logic
  let status = 'Aligned';
  const recommendations = [];
  if (distinctTypeCount < 3) {
    status = 'Partially Aligned';
    recommendations.push(`Only ${distinctTypeCount} artifact type(s) present. Consider adding at least 2 more formats (e.g., visual organizer, sentence frames, quiz, leveled text) for engagement variety.`);
  }
  if (modalitiesPresent.length < 2) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Only ${modalitiesPresent.length} modality present (${modalitiesPresent.join(', ') || 'none'}). UDL recommends multiple means of representation; add image/visual or interactive elements.`);
  }
  if (dokTotal > 0 && dokDist.L1 / dokTotal > 0.8) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Quiz DOK skews heavily to recall (Level 1: ${dokPercent.L1}%). Add Level 2-3 questions that require application or strategic thinking.`);
  }
  if (harvest.scaffoldCounts.sentenceFrames + harvest.scaffoldCounts.simplifiedTexts === 0 && totalArtifacts >= 3) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push('No scaffolds detected (sentence frames, simplified text, leveled glossary). Consider adding scaffolds to support diverse learners.');
  }

  return {
    status,
    diversityScore: +diversity.toFixed(2),
    distinctTypeCount,
    distinctTypes: Array.from(harvest.distinctTypes),
    totalArtifacts,
    dokDistribution: dokPercent,
    dokTotal,
    quizCounts: harvest.quizCounts,
    scaffoldCounts: harvest.scaffoldCounts,
    multimodalCoverage: { present: modalitiesPresent, missing: ['text','image','audio','interactive'].filter(m => !harvest.multimodal[m]) },
    simplifiedShiftSamples: harvest.simplifiedShifts.slice(0, 4),
    recommendations,
    notes: 'Counts are deterministic; format-balance recommendations are heuristic. The LLM review provides contextual judgment.',
  };
}

// ─── Plan O Step 5: Content accuracy (harvest + LLM review) ────────────
// AlloFlow already runs accuracy verification when teachers analyze source
// text — analysis.accuracy contains rating + reason + discrepancies +
// verifiedFacts (with citations). We aggregate those signals and add an
// LLM review pass that interprets across analyses + flags claims still
// needing verification in non-analysis artifacts (quiz answers, glossary
// defs, lesson-plan facts).
function computeContentAccuracy(harvest) {
  const ratings = harvest.accuracyRatings || [];
  const totalAnalyses = ratings.length;
  let highCount = 0, mediumCount = 0, lowCount = 0;
  let totalVerifiedFacts = 0, totalDiscrepancies = 0;
  ratings.forEach(r => {
    const rating = String(r.rating || '').toLowerCase();
    if (rating.indexOf('high') >= 0) highCount++;
    else if (rating.indexOf('low') >= 0 || rating.indexOf('poor') >= 0) lowCount++;
    else mediumCount++;
    totalVerifiedFacts += r.verifiedFactCount || 0;
    totalDiscrepancies += r.discrepancyCount || 0;
  });
  // Status logic
  let status = 'Aligned';
  const recommendations = [];
  if (totalAnalyses === 0) {
    status = 'Not evaluated';
    recommendations.push('No source-text analysis has been run yet. Run "Analyze Source Text" on the lesson source to surface AI-verified facts and any discrepancies.');
  } else {
    if (lowCount > 0) {
      status = 'Not Aligned';
      recommendations.push(`${lowCount} analysis flagged the source content as Low accuracy. Review the discrepancies in those analyses and revise the source before sharing with students.`);
    }
    if (totalDiscrepancies > 0) {
      if (status !== 'Not Aligned') status = 'Partially Aligned';
      recommendations.push(`${totalDiscrepancies} factual discrepancy${totalDiscrepancies === 1 ? '' : 'ies'} flagged across the analyses. Review and either correct the source or remove the affected sections.`);
    }
    if (mediumCount > 0 && status === 'Aligned') {
      status = 'Partially Aligned';
      recommendations.push(`${mediumCount} analysis returned Medium accuracy. Consider adding citations or rephrasing claims that the AI could not fully verify.`);
    }
  }
  return {
    status,
    notEvaluated: totalAnalyses === 0,
    totalAnalyses,
    accuracyRatingCounts: { high: highCount, medium: mediumCount, low: lowCount },
    totalVerifiedFacts,
    totalDiscrepancies,
    sampleVerifications: ratings.slice(0, 5),
    recommendations,
    notes: 'Aggregated from analyze-source-text accuracy passes. Each analysis already runs Google-Search-grounded verification when generated; this section aggregates those results across the curriculum.',
  };
}

// ─── Content accessibility (deterministic) ──────────────────────────────
// UDL-aligned check: do the curriculum artifacts have alt text for images,
// avoid color-only references, and break long text into manageable passages?
function computeContentAccessibility(artifacts, harvest, gradeLevel) {
  let totalImages = 0;
  let imagesWithAlt = 0;
  let colorOnlyCount = 0;
  const colorOnlyExamples = [];
  const implicitImageExamples = [];
  let implicitImageCount = 0;
  let longestUnbrokenPassage = 0;

  // Color-only patterns: phrases that rely solely on color to convey meaning
  const colorOnlyRe = /\b(the\s+(?:red|blue|green|yellow|orange|purple|pink)\s+(?:one|section|area|box|circle|highlight|region|part))\b|\b(highlighted?\s+in\s+(?:red|blue|green|yellow|orange|purple|pink))\b|\b(shown\s+in\s+(?:red|blue|green|yellow|orange))\b|\b(see\s+the\s+(?:red|blue|green|yellow)\b)/gi;
  // Image reference patterns
  const imgRefRe = /\b(see\s+(?:the\s+)?(?:image|figure|diagram|chart|picture|photo|illustration))\b|\b(as\s+shown\s+(?:in\s+)?(?:the\s+)?(?:image|figure|diagram))\b|\b((?:image|figure|diagram)\s+(?:\d+|above|below))\b/gi;

  artifacts.forEach(function (item) {
    if (!item) return;
    const d = item.data;
    const textBlob = extractAuditArtifactText(item);
    if (!d && !textBlob) return;

    // Count words in longest unbroken passage (no heading/hr/blank-line break)
    if (textBlob) {
      const paragraphs = textBlob.split(/\n\s*\n|\n#+\s|\n---/);
      paragraphs.forEach(function (p) {
        const wc = (p.match(/\S+/g) || []).length;
        if (wc > longestUnbrokenPassage) longestUnbrokenPassage = wc;
      });
    }

    // Detect color-only language
    if (textBlob) {
      let m;
      colorOnlyRe.lastIndex = 0;
      while ((m = colorOnlyRe.exec(textBlob)) !== null) {
        colorOnlyCount++;
        if (colorOnlyExamples.length < 8) colorOnlyExamples.push(m[0]);
      }
    }

    // Detect implicit image references (may lack alt text)
    if (textBlob) {
      let m;
      imgRefRe.lastIndex = 0;
      while ((m = imgRefRe.exec(textBlob)) !== null) {
        implicitImageCount++;
        if (implicitImageExamples.length < 8) implicitImageExamples.push(m[0]);
      }
    }

    // Count images and alt coverage
    if (item.type === 'image' || item.type === 'concept-sort') {
      totalImages++;
      // Captions and titles are not substitutes for a programmatic text alternative.
      if (d && (String(d.altText || d.alt || '').trim() || d.decorative === true)) {
        imagesWithAlt++;
      }
    }
    // Also count inline images in HTML-like content
    if (textBlob) {
      const imgTags = textBlob.match(/<img\b[^>]*>/gi) || [];
      imgTags.forEach(function (tag) {
        totalImages++;
        if (/alt\s*=\s*"[^"]*"/i.test(tag) || /alt\s*=\s*'[^']*'/i.test(tag)) {
          imagesWithAlt++;
        }
      });
    }
  });

  const altCoveragePct = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : null;

  // Status logic
  let status = 'Aligned';
  const recommendations = [];

  if (colorOnlyCount > 0) {
    status = 'Partially Aligned';
    recommendations.push(colorOnlyCount + ' color-only reference' + (colorOnlyCount === 1 ? '' : 's') + ' detected. Students with color vision deficiencies will miss this information. Add text labels, patterns, or shapes alongside color cues.');
  }

  if (totalImages > 0 && altCoveragePct < 80) {
    status = 'Not Aligned';
    recommendations.push('Only ' + altCoveragePct + '% of images have alt text. Screen-reader users and students on slow connections will miss visual content. Add descriptive alt text to all informational images.');
  } else if (totalImages > 0 && altCoveragePct < 100) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push('Alt text is present for ' + altCoveragePct + '% of images. Add a text alternative to every remaining informational image, or explicitly mark decorative images.');
  }

  // Grade-adjusted passage-length thresholds
  const gradeNum = parseInt(String(gradeLevel).replace(/[^0-9]/g, ''), 10) || 5;
  const maxPassage = gradeNum <= 2 ? 100 : gradeNum <= 5 ? 200 : gradeNum <= 8 ? 350 : 500;
  if (longestUnbrokenPassage > maxPassage) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push('Longest unbroken passage is ' + longestUnbrokenPassage + ' words (threshold for grade band: ' + maxPassage + '). Break long passages with headings, bullet points, or visual breaks to reduce cognitive load.');
  }

  if (implicitImageCount > 0 && totalImages === 0) {
    recommendations.push(implicitImageCount + ' reference' + (implicitImageCount === 1 ? '' : 's') + ' to images/figures found but no image artifacts detected. Ensure referenced visuals are present and have alt text.');
  }

  return {
    status,
    totalImages,
    imagesWithAlt,
    altCoveragePct,
    colorOnlyCount,
    longestUnbrokenPassage,
    colorOnlyExamples: colorOnlyExamples.slice(0, 6),
    implicitImageExamples: implicitImageExamples.slice(0, 6),
    implicitImageCount,
    recommendations,
    wcagConformanceAssessment: false,
    notes: 'Deterministic scan for selected accessibility indicators: explicit text alternatives, color-only language, and passage length. This is not a WCAG conformance assessment; manual and rendered-content testing are still required.',
  };
}

// ─── Plan R+ dim: Differentiation coverage ──────────────────────────────
// UDL-aligned check: does the curriculum offer multiple access paths for
// learners who differ in reading level, language, processing style, or
// expression mode? Deterministic detection of accommodation TYPES present
// across the artifact bundle.
function computeDifferentiationCoverage(artifacts, harvest, language) {
  const has = function (type) { return artifacts.some(function (a) { return a && a.type === type; }); };
  const simplifiedLevels = new Set();
  const audioCoverage = computeAudioCoverage(artifacts, language);
  const flags = {
    leveledReadingText: false,    // simplified text exists
    multipleReadingLevels: false, // simplified at multiple levels (look at differentiationGrades)
    glossarySupport: has('glossary'),
    sentenceFrames: has('sentence-frames'),
    visualOrganizer: has('outline') || has('concept-sort') || has('timeline'),
    quizScaffold: has('quiz'),
    interactiveOrAdventure: has('adventure') || has('persona'),
    visualOrImage: has('image'),
    audioPath: audioCoverage.readAloudCapableArtifacts > 0 || audioCoverage.embeddedAudioArtifacts > 0 || audioCoverage.preparedAudioArtifacts > 0,
  };
  artifacts.forEach(function (a) {
    if (a && a.type === 'simplified') {
      flags.leveledReadingText = true;
      var d = a.data || {};
      [d.targetGrade, d.grade, a.targetGrade, a.gradeLevel].filter(Boolean).forEach(function (level) { simplifiedLevels.add(String(level).trim().toLowerCase()); });
      if (Array.isArray(d.versions)) d.versions.forEach(function (version) {
        var level = version && (version.targetGrade || version.grade || version.level);
        if (level) simplifiedLevels.add(String(level).trim().toLowerCase());
      });
      if (Array.isArray(d.differentiationGrades)) d.differentiationGrades.filter(Boolean).forEach(function (level) {
        simplifiedLevels.add(String(level).trim().toLowerCase());
      });
    }
  });
  flags.multipleReadingLevels = simplifiedLevels.size > 1;
  // Reuse harvest scaffold counts where available
  var sf = harvest && harvest.scaffoldCounts ? harvest.scaffoldCounts : {};
  if ((sf.sentenceFrames || 0) > 0) flags.sentenceFrames = true;
  if ((sf.leveledGlossary || 0) > 0) flags.glossarySupport = true;

  const dims = Object.keys(flags);
  const presentCount = dims.reduce(function (n, k) { return n + (flags[k] ? 1 : 0); }, 0);
  const coverage = dims.length > 0 ? Math.round((presentCount / dims.length) * 100) : 0;
  // Status thresholds: 70%+ Aligned, 40-69% Partial, <40% Not Aligned.
  let status;
  if (coverage >= 70) status = 'Aligned';
  else if (coverage >= 40) status = 'Partially Aligned';
  else status = 'Not Aligned';
  // Per-row recommendation list
  const labelMap = {
    leveledReadingText: 'Leveled / simplified text',
    multipleReadingLevels: 'Multi-level versions (more than one reading level)',
    glossarySupport: 'Glossary / vocabulary support',
    sentenceFrames: 'Sentence frames (writing scaffold)',
    visualOrganizer: 'Visual organizer (outline / concept sort / timeline)',
    quizScaffold: 'Formative check / quiz',
    interactiveOrAdventure: 'Interactive or adventure mode',
    visualOrImage: 'Visual / image support',
    audioPath: 'Audio narration path',
  };
  const missing = dims.filter(function (k) { return !flags[k]; }).map(function (k) { return labelMap[k]; });
  const recommendations = [];
  if (missing.length > 0 && coverage < 70) {
    recommendations.push('Differentiation gaps: missing ' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? ', and more' : '') + '. Generate at least one of these to broaden access for learners with different needs.');
  }
  if (!flags.multipleReadingLevels && flags.leveledReadingText) {
    recommendations.push('Source text exists at one level only. Generate a second simplified version to support a wider reader range.');
  }
  return {
    status,
    coverage,
    presentCount,
    totalAccommodationTypes: dims.length,
    simplifiedLevels: Array.from(simplifiedLevels),
    audioCoverage,
    flags,
    missing,
    recommendations,
    notes: 'Detects ' + dims.length + ' UDL accommodation types: leveled text, multi-level versions, glossary, sentence frames, visual organizer, quiz, interactive/adventure, image, audio. Coverage = % of types present. Heuristic — does not assess accommodation quality.',
  };
}

// ─── Plan R+ dim: Cognitive load / pacing ────────────────────────────────
// Compares the lesson-plan's claimed segment durations against an estimate of
// actual time required (reading + activity + quiz). When there's no lesson
// plan, marks the dimension as Not applicable rather than emitting a misleading
// score.
function _parseMinutes(s) {
  if (!s) return null;
  var m = String(s).match(/(\d+)\s*(?:min|minute|mins)/i);
  return m ? parseInt(m[1], 10) : null;
}
function computeCognitiveLoad(artifacts, sourceWordCount, gradeLevel) {
  const lessonPlan = artifacts.slice().reverse().find(function (a) { return a && a.type === 'lesson-plan'; });
  if (!lessonPlan || !lessonPlan.data) {
    return {
      status: 'Not applicable',
      notApplicable: true,
      reason: 'No lesson plan in this curriculum. Generate a Lesson Plan to evaluate pacing realism.',
    };
  }
  const d = lessonPlan.data;
  // Sum claimed time across known segments. Each may live as { duration } or as ' (10 min)' text inside the body.
  const segments = [
    { key: 'directInstruction', label: 'Direct instruction' },
    { key: 'guidedPractice',    label: 'Guided practice' },
    { key: 'independentPractice', label: 'Independent practice' },
    { key: 'closure',           label: 'Closure' },
  ];
  var claimedTotal = 0;
  var perSegment = [];
  segments.forEach(function (s) {
    var seg = d[s.key];
    if (!seg) return;
    var mins = null;
    if (typeof seg === 'object' && seg.duration) mins = _parseMinutes(seg.duration);
    if (mins === null && typeof seg === 'string') mins = _parseMinutes(seg);
    if (mins === null && typeof seg === 'object' && seg.description) mins = _parseMinutes(seg.description);
    if (mins) {
      claimedTotal += mins;
      perSegment.push({ label: s.label, claimedMinutes: mins });
    } else {
      perSegment.push({ label: s.label, claimedMinutes: null });
    }
  });
  // Also check activities array
  if (Array.isArray(d.activities)) {
    d.activities.forEach(function (act) {
      var mins = _parseMinutes(act.duration) || _parseMinutes(act.description);
      if (mins) { claimedTotal += mins; perSegment.push({ label: act.title || act.name || 'Activity', claimedMinutes: mins }); }
    });
  }
  // Estimate actual time required:
  // - Source reading: words / wpm (grade-band adjusted: 100 wpm K-2, 150 wpm 3-5, 200 wpm 6-8, 250 wpm 9-12)
  const gradeNum = parseGradeLevelToNum(gradeLevel);
  let wpm = 200;
  if (gradeNum <= 2) wpm = 100;
  else if (gradeNum <= 5) wpm = 150;
  else if (gradeNum <= 8) wpm = 200;
  else wpm = 250;
  const readingMinutes = sourceWordCount > 0 ? Math.round(sourceWordCount / wpm) : 0;
  // - Quiz: ~1 min per question
  const quizItem = artifacts.find(function (a) { return a && a.type === 'quiz' && a.data && Array.isArray(a.data.questions); });
  const quizMinutes = quizItem ? quizItem.data.questions.length * 1 : 0;
  // - Activities: count distinct artifact types other than reading-only as ~5 min each (rough lower bound)
  const activityTypes = new Set(artifacts
    .filter(function (a) { return a && a.type && !['analysis', 'simplified', 'glossary', 'lesson-plan', 'alignment-report', 'udl-advice'].includes(a.type); })
    .map(function (a) { return a.type; }));
  const activityMinutes = activityTypes.size * 5;
  const estimatedTotal = readingMinutes + quizMinutes + activityMinutes;
  // Score
  let status, ratio;
  if (claimedTotal <= 0) {
    status = 'Partially Aligned'; ratio = null;
  } else {
    ratio = estimatedTotal / claimedTotal;
    if (ratio >= 0.7 && ratio <= 1.4) status = 'Aligned';
    else if (ratio >= 0.4 && ratio <= 2.0) status = 'Partially Aligned';
    else status = 'Not Aligned';
  }
  const recommendations = [];
  if (claimedTotal > 0 && ratio !== null) {
    if (ratio > 1.4) recommendations.push('Lesson plan claims ' + claimedTotal + ' min but content estimates ~' + estimatedTotal + ' min — likely under-scheduled. Consider trimming source text, removing one activity, or adding a second day.');
    if (ratio < 0.7) recommendations.push('Lesson plan claims ' + claimedTotal + ' min but content estimates ~' + estimatedTotal + ' min — likely over-scheduled (lesson may run short). Consider adding a discussion segment or follow-up activity.');
  } else if (claimedTotal === 0) {
    recommendations.push('Lesson plan does not specify segment durations. Add explicit time estimates ("10 min", "15 min") to each segment for realistic pacing.');
  }
  return {
    status,
    claimedTotalMinutes: claimedTotal,
    estimatedTotalMinutes: estimatedTotal,
    ratio: ratio !== null ? Number(ratio.toFixed(2)) : null,
    perSegment,
    breakdown: {
      reading: readingMinutes,
      quiz: quizMinutes,
      activities: activityMinutes,
      wpmAssumption: wpm,
    },
    recommendations,
    notes: 'Estimated time = ' + sourceWordCount + ' source words / ' + wpm + ' wpm + ' + (quizItem ? quizItem.data.questions.length : 0) + ' quiz items × 1 min + ' + activityTypes.size + ' distinct activities × 5 min. Compares against lesson-plan claimed durations. Heuristic — actual classroom pacing varies.',
  };
}

// ─── Plan O Step 6: Combined Pass/Revise + Curriculum Readiness Score ──
// Rolls all comprehensive-audit dimensions into a single 0-100 readiness
// score + overall status + blocking-issues list. Equal weighting across
// dimensions; N/A and computeFailed dimensions are excluded from the math
// but surface in the per-dimension list.
const STATUS_POINTS = { 'Aligned': 20, 'Partially Aligned': 12, 'Not Aligned': 0 };
const ALL_DIMENSIONS = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy', 'differentiation', 'cognitiveLoad', 'culturalResponsiveness'];
const DIMENSION_LABELS = {
  standards: 'Standards alignment',
  vocabulary: 'Vocabulary fit',
  engagement: 'Engagement variety',
  accessibility: 'Content accessibility',
  udl: 'UDL principles',
  accuracy: 'Content accuracy',
  differentiation: 'Differentiation coverage',
  cognitiveLoad: 'Cognitive load / pacing',
  culturalResponsiveness: 'Cultural responsiveness',
};

function computeReadinessScore(comprehensive) {
  if (!comprehensive) return null;
  let totalScore = 0;
  let dimensionsEvaluated = 0;
  let dimensionsApplicable = 0;
  let dimensionsReported = 0;
  const dimensionScores = {};
  const blockingIssues = [];
  const incompleteIssues = [];

  const representativeIssue = function (data, fallback) {
    if (!data) return fallback;
    if (Array.isArray(data.recommendations) && data.recommendations[0]) return data.recommendations[0];
    if (Array.isArray(data.perStandard) && data.perStandard[0]) {
      return data.perStandard[0].adminRecommendation || data.perStandard[0].recommendation || fallback;
    }
    return data.overallNarrative || data.narrative || data.reason || data.error || fallback;
  };

  ALL_DIMENSIONS.forEach(function (dim) {
    const data = comprehensive[dim];
    const label = DIMENSION_LABELS[dim] || dim;
    if (!data) {
      dimensionScores[dim] = { status: 'Not evaluated', points: null, notEvaluated: true };
      incompleteIssues.push({ dimension: label, issue: 'This required dimension was not returned by the audit.' });
      return;
    }
    dimensionsReported++;
    if (data.notApplicable || normalizeAuditStatus(data.status) === 'Not applicable') {
      dimensionScores[dim] = { status: 'Not applicable', points: null, notApplicable: true };
      return;
    }
    dimensionsApplicable++;
    if (data.computeFailed || normalizeAuditStatus(data.status) === 'Compute failed') {
      dimensionScores[dim] = { status: 'Compute failed', points: null, computeFailed: true };
      incompleteIssues.push({ dimension: label, issue: representativeIssue(data, 'The dimension could not be computed.') });
      return;
    }
    if (data.notEvaluated || normalizeAuditStatus(data.status) === 'Not evaluated') {
      dimensionScores[dim] = { status: 'Not evaluated', points: null, notEvaluated: true };
      incompleteIssues.push({ dimension: label, issue: representativeIssue(data, 'Required evidence was unavailable.') });
      return;
    }

    const status = normalizeAuditStatus(data.status, 'Not evaluated');
    if (STATUS_POINTS[status] === undefined) {
      dimensionScores[dim] = { status: 'Not evaluated', points: null, notEvaluated: true };
      incompleteIssues.push({ dimension: label, issue: 'The dimension returned an invalid status and was not scored.' });
      return;
    }
    dimensionsEvaluated++;
    const points = STATUS_POINTS[status];
    totalScore += points;
    dimensionScores[dim] = { status: status, points: points };
    if (status === 'Not Aligned') {
      blockingIssues.push({ dimension: label, issue: representativeIssue(data, 'This dimension did not meet the audit threshold.') });
    }
  });

  const maxPossible = dimensionsEvaluated * 20;
  const provisionalScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : null;
  const isIncomplete = incompleteIssues.length > 0 || dimensionsReported < ALL_DIMENSIONS.length || dimensionsEvaluated < dimensionsApplicable;
  let overallStatus, overallLabel;
  if (blockingIssues.length > 0) {
    overallStatus = 'Revise';
    overallLabel = 'Revise — critical issues';
  } else if (isIncomplete) {
    overallStatus = 'Incomplete';
    overallLabel = 'Incomplete — required evidence is missing';
  } else if (provisionalScore >= 90) {
    overallStatus = 'Pass';
    overallLabel = 'Pass — ready to deploy';
  } else if (provisionalScore >= 70) {
    overallStatus = 'Pass with notes';
    overallLabel = 'Pass with notes — minor improvements suggested';
  } else {
    overallStatus = 'Revise';
    overallLabel = provisionalScore >= 50 ? 'Revise — multiple dimensions need work' : 'Revise — significant gaps across dimensions';
  }

  return {
    score: isIncomplete ? null : provisionalScore,
    provisionalScore: provisionalScore,
    incomplete: isIncomplete,
    status: overallStatus,
    label: overallLabel,
    totalDimensions: ALL_DIMENSIONS.length,
    dimensionsReported: dimensionsReported,
    dimensionsApplicable: dimensionsApplicable,
    dimensionsEvaluated: dimensionsEvaluated,
    dimensionScores: dimensionScores,
    blockingIssues: blockingIssues,
    incompleteIssues: incompleteIssues,
    perDimensionPercent: Object.keys(dimensionScores).reduce(function (acc, dim) {
      const points = dimensionScores[dim].points;
      acc[dim] = typeof points === 'number' ? Math.round((points / 20) * 100) : null;
      return acc;
    }, {}),
    scoreBasis: 'Equal weighting across all applicable dimensions. Missing, failed, or unevaluated evidence prevents certification and produces only a provisional score.',
    notes: 'A Not Aligned dimension blocks Pass. Not evaluated or Compute failed dimensions make the report Incomplete; they are never silently excluded from certification.',
  };
}

function collectAuditText(artifacts) {
  const out = { text: '', sourceText: '', glossaryTerms: [] };
  let simplifiedText = '';
  (Array.isArray(artifacts) ? artifacts : []).forEach(function (item) {
    if (!item) return;
    const artifactText = extractAuditArtifactText(item);
    if (artifactText) out.text += artifactText + '\n';
    const d = item.data;
    if (item.type === 'analysis') {
      const source = item.originalText || (d && d.originalText) || '';
      if (source) out.sourceText = String(source);
    }
    if (item.type === 'simplified') {
      const simplified = typeof d === 'string' ? d : d && (d.simplifiedText || d.text);
      if (simplified) simplifiedText = String(simplified);
    }
    if (item.type === 'glossary') {
      const entries = Array.isArray(d) ? d : d && Array.isArray(d.items) ? d.items : [];
      entries.forEach(function (entry) {
        const term = entry && (entry.term || entry.word || entry.phrase);
        if (term) out.glossaryTerms.push(String(term).trim().toLocaleLowerCase());
      });
    }
  });
  out.sourceText = out.sourceText || simplifiedText || '';
  return out;
}

function _tokenizeAuditWords(text, language) {
  const clean = String(text || '');
  if (!clean) return [];
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(language || 'en', { granularity: 'word' }).segment(clean))
        .filter(function (part) { return part.isWordLike; })
        .map(function (part) { return part.segment.toLocaleLowerCase(language || undefined); });
    }
  } catch (e) { /* use Unicode fallback */ }
  return (clean.toLocaleLowerCase().match(/[\p{L}\p{M}][\p{L}\p{M}'’\-]*/gu) || []);
}

function computeVocabularyFit(artifacts, gradeLevel, language) {
  const { text, sourceText, glossaryTerms } = collectAuditText(artifacts);
  const effectiveLanguage = String(language || 'en');
  // sourceWords: count of words in the primary source text only (matches teacher intuition).
  // auditedTextWords: count across the full bundle (every artifact's content).
  const sourceWordList = _tokenizeAuditWords(sourceText, effectiveLanguage);
  const sourceWords = sourceWordList.length;
  const words = _tokenizeAuditWords(text, effectiveLanguage);
  const auditedTextWords = words.length;
  const uniqueSet = new Set(words);
  const tier3Set = new Set([].concat.apply([], glossaryTerms.map(function (term) { return _tokenizeAuditWords(term, effectiveLanguage); })));

  const supportsEnglishTierHeuristic = /^(?:en(?:[-_]|$)|english\b)/i.test(effectiveLanguage);
  if (!supportsEnglishTierHeuristic || auditedTextWords === 0) {
    const reason = !supportsEnglishTierHeuristic
      ? 'Tier 1/2/3 classification is currently validated only for English; word counts are provided, but vocabulary fit was not scored.'
      : 'No readable curriculum text was available for vocabulary scoring.';
    return {
      status: 'Not evaluated',
      notEvaluated: true,
      language: effectiveLanguage,
      sourceWords,
      auditedTextWords,
      totalWords: auditedTextWords,
      uniqueWords: uniqueSet.size,
      tier1Count: null,
      tier2Count: null,
      tier3Count: null,
      glossaryTermsCount: glossaryTerms.length,
      expected: null,
      tier2Examples: [],
      tier3Examples: [],
      recommendations: [reason],
      scoreBasis: 'Unicode-aware word counts; English-only tier heuristic withheld for unsupported languages.',
      notes: reason,
    };
  }

  let tier1 = 0, tier2 = 0, tier3 = 0;
  const tier2Examples = [];
  const tier3Examples = [];

  uniqueSet.forEach(word => {
    if (tier3Set.has(word) || (word.length >= 9 && TIER3_SUFFIX_RE.test(word))) {
      tier3++;
      if (tier3Examples.length < 8) tier3Examples.push(word);
    } else if (word.length >= 7 && !COMMON_LONGER_WORDS.has(word)) {
      tier2++;
      if (tier2Examples.length < 8) tier2Examples.push(word);
    } else {
      tier1++;
    }
  });

  const gradeNum = parseGradeLevelToNum(gradeLevel);
  const baseExpected = gradeBandExpectations(gradeNum);
  // Beck/McKeown norms are calibrated to a single ~1500-word text. The audited bundle
  // can be 3-5x larger when it includes simplified text + lesson plan + quiz + glossary.
  // Rescale tier expectations proportionally so 5th-grade Solar System bundle (~4400 words)
  // doesn't compare against single-text norms.
  const TYPICAL_SINGLE_TEXT_WORDS = 1500;
  const scale = auditedTextWords > 0 ? Math.max(1, auditedTextWords / TYPICAL_SINGLE_TEXT_WORDS) : 1;
  const expected = {
    tier2: Math.round(baseExpected.tier2 * scale),
    tier3: Math.round(baseExpected.tier3 * scale),
    band: baseExpected.band,
    gradeBand: baseExpected.band,
    scale: Number(scale.toFixed(2)),
    perTextTier2: baseExpected.tier2,
    perTextTier3: baseExpected.tier3,
  };
  const recommendations = [];
  let status = 'Aligned';

  if (tier2 < expected.tier2 * 0.5) {
    status = 'Partially Aligned';
    recommendations.push(`Tier 2 academic vocabulary is light for grade band ${expected.band} (~${tier2} unique vs ~${expected.tier2} expected). Consider adding cross-curricular academic words such as "examine", "evidence", "consequence", "framework", "interpret".`);
  } else if (tier2 > expected.tier2 * 2.5) {
    status = 'Partially Aligned';
    recommendations.push(`Tier 2 vocabulary load is heavy for grade band ${expected.band} (~${tier2} unique vs ~${expected.tier2} expected). May overwhelm; consider simpler synonyms or adding sentence-frame scaffolds.`);
  }
  if (tier3 < expected.tier3 * 0.5) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Tier 3 domain vocabulary is light (~${tier3} unique vs ~${expected.tier3} expected). Add ${Math.max(2, expected.tier3 - tier3)} more glossary terms specific to the topic.`);
  }
  if (sourceWords < 200 && artifacts.length > 0) {
    recommendations.push('Source text is short (<200 words). Vocabulary signal may be unreliable; consider expanding the source material before relying on this audit.');
  }

  return {
    status,
    notEvaluated: false,
    language: effectiveLanguage,
    scoreBasis: 'Deterministic English-language length, glossary, and suffix heuristics; teacher review is required.',
    sourceWords,
    auditedTextWords,
    totalWords: auditedTextWords, // legacy alias for backward compat with old saved audits
    uniqueWords: uniqueSet.size,
    tier1Count: tier1,
    tier2Count: tier2,
    tier3Count: tier3,
    glossaryTermsCount: glossaryTerms.length,
    expected,
    tier2Examples,
    tier3Examples,
    recommendations,
    notes: 'sourceWords = primary source text only (matches teacher intuition); auditedTextWords = across the full curriculum bundle (used for tier classification). Tier expectations scaled to bundle size (×' + Number(scale.toFixed(2)) + ').',
  };
}
function normalizeExplicitArtifactIds(value, allowedIds) {
  const allowed = new Set((Array.isArray(allowedIds) ? allowedIds : []).map((id) => String(id || '').trim()).filter(Boolean));
  if (!allowed.size || !Array.isArray(value)) return [];
  return Array.from(new Set(value.map((id) => String(id || '').trim()).filter((id) => allowed.has(id)))).slice(0, 12);
}
function normalizeAttributionSource(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'audit-model' || normalized === 'teacher' || normalized === 'deterministic-check' || normalized === 'unknown') return normalized;
  return fallback || 'unknown';
}
function normalizeFindingAttributions(rawReport, allowedIds) {
  const records = [];
  const add = (value) => {
    if (!value || typeof value !== 'object') return;
    const text = String(value.text || value.finding || value.label || '').trim();
    const artifactIds = normalizeExplicitArtifactIds(value.artifactIds || value.findingArtifactIds, allowedIds);
    if (!text || !artifactIds.length || records.some((record) => record.text === text)) return;
    records.push({ text, artifactIds, attributionSource: normalizeAttributionSource(value.attributionSource, 'audit-model') });
  };
  (Array.isArray(rawReport && rawReport.findingAttributions) ? rawReport.findingAttributions : []).forEach(add);
  (Array.isArray(rawReport && rawReport.gaps) ? rawReport.gaps : []).forEach(add);
  return records.slice(0, 8);
}
function normalizeStandardsDimension(rawReports, configuredStandards, options) {
  const attributionOptions = options && typeof options === 'object' ? options : {};
  const expected = (Array.isArray(configuredStandards) ? configuredStandards : []).map(function (standard) {
    if (typeof standard === 'string') return standard;
    if (!standard || typeof standard !== 'object') return String(standard || '');
    return String(standard.code || standard.standard || standard.label || standard.description || '').trim();
  }).filter(Boolean);
  if (!expected.length) {
    return {
      reports: [],
      dimension: {
        status: 'Not applicable',
        notApplicable: true,
        reason: 'No target standards entered. Add a standard in the settings panel to include standards alignment in the audit.',
        perStandard: [],
      },
    };
  }
  const incoming = Array.isArray(rawReports) ? rawReports : [];
  let passCount = 0, reviseCount = 0, missingCount = 0;
  const recommendations = [];
  const reports = expected.map(function (standard, index) {
    const raw = incoming[index] && typeof incoming[index] === 'object' ? incoming[index] : null;
    if (!raw) {
      missingCount++;
      return {
        standard: standard,
        status: 'Not evaluated',
        notEvaluated: true,
        overallDetermination: 'Not evaluated',
        gaps: ['The AI response did not include a valid report for this configured standard.'],
        findingAttributions: [],
        adminRecommendation: 'Regenerate the audit or review this standard manually.',
      };
    }
    const analysis = raw.analysis && typeof raw.analysis === 'object' ? raw.analysis : {};
    const findingAttributions = normalizeFindingAttributions(raw, attributionOptions.artifactIds);
    const keys = ['textAlignment', 'activityAlignment', 'assessmentAlignment'];
    let invalid = false;
    const normalizedAnalysis = {};
    const statuses = keys.map(function (key) {
      const part = analysis[key] && typeof analysis[key] === 'object' ? analysis[key] : {};
      const status = normalizeAuditStatus(part.status, 'Not evaluated');
      if (AUDIT_STATUS_RANK[status] === undefined) invalid = true;
      const artifactIds = normalizeExplicitArtifactIds(part.artifactIds || part.evidenceArtifactIds, attributionOptions.artifactIds);
      normalizedAnalysis[key] = {
        status: status,
        evidence: typeof part.evidence === 'string' ? part.evidence : '',
        notes: typeof part.notes === 'string' ? part.notes : '',
        artifactIds: artifactIds,
        attributionSource: artifactIds.length ? normalizeAttributionSource(part.attributionSource, 'audit-model') : null,
      };
      return status;
    });
    if (invalid) {
      missingCount++;
      return Object.assign({}, raw, {
        standard: standard,
        analysis: normalizedAnalysis,
        status: 'Not evaluated',
        notEvaluated: true,
        overallDetermination: 'Not evaluated',
        gaps: Array.isArray(raw.gaps) ? raw.gaps.slice(0, 8).map(function (gap) { return gap && typeof gap === 'object' ? String(gap.text || gap.finding || gap.label || '').trim() : String(gap || '').trim(); }).filter(Boolean) : [],
        findingAttributions: findingAttributions,
        adminRecommendation: raw.adminRecommendation || 'One or more required alignment components were missing or invalid; review manually.',
      });
    }
    const status = statuses.indexOf('Not Aligned') >= 0 ? 'Not Aligned'
      : statuses.indexOf('Partially Aligned') >= 0 ? 'Partially Aligned'
      : 'Aligned';
    const overallDetermination = status === 'Aligned' ? 'Pass' : 'Revise';
    if (overallDetermination === 'Pass') passCount++; else reviseCount++;
    if (raw.adminRecommendation) recommendations.push(String(raw.adminRecommendation));
    return Object.assign({}, raw, {
      standard: standard,
      analysis: normalizedAnalysis,
      status: status,
      overallDetermination: overallDetermination,
      gaps: Array.isArray(raw.gaps) ? raw.gaps.slice(0, 8).map(function (gap) { return gap && typeof gap === 'object' ? String(gap.text || gap.finding || gap.label || '').trim() : String(gap || '').trim(); }).filter(Boolean) : [],
      findingAttributions: findingAttributions,
      adminRecommendation: typeof raw.adminRecommendation === 'string' ? raw.adminRecommendation : '',
    });
  });
  const dimensionStatus = missingCount > 0 ? 'Not evaluated'
    : reviseCount === 0 ? 'Aligned'
    : passCount === 0 && reports.every(function (report) { return report.status === 'Not Aligned'; }) ? 'Not Aligned'
    : 'Partially Aligned';
  return {
    reports: reports,
    dimension: {
      status: dimensionStatus,
      notEvaluated: missingCount > 0,
      perStandard: reports,
      totalStandards: expected.length,
      passCount: passCount,
      reviseCount: reviseCount,
      missingCount: missingCount,
      recommendations: recommendations.slice(0, 5),
      notes: 'One validated report is required for every configured standard. Overall determinations are derived from text, activity, and assessment component statuses rather than accepted from the model.',
    },
  };
}


// ── Activities redesign (2026-08-16) — structured-activity normalizers ──────
// Pure. The brainstorm branch's discussion/jigsaw modes parse model JSON
// through these; both are exported on GenDispatcher for direct testing.
// Shapes are documented in docs/ACTIVITIES_RESOURCE_DESIGN_2026-08-16.md §D4
// and must stay pure data (scan_fn_in_tool_state.cjs).
const DISCUSSION_PROTOCOLS = ['think-pair-share', 'socratic-seminar', 'fishbowl', 'gallery-walk'];
const normalizeDiscussionKit = (raw, fallbackProtocol) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const str = v => String(v == null ? '' : v).trim();
    const strList = v => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
    const rawSets = Array.isArray(raw.questionSets) ? raw.questionSets : [];
    const questionSets = ['literal', 'inferential', 'evaluative'].map(depth => {
        const found = rawSets.find(s => s && String(s.depth || '').toLowerCase() === depth);
        return { depth, questions: strList(found && found.questions).slice(0, 6) };
    }).filter(s => s.questions.length);
    const stemsRaw = raw.talkStems && typeof raw.talkStems === 'object' && !Array.isArray(raw.talkStems) ? raw.talkStems : {};
    const talkStems = {};
    ['agree', 'disagree', 'clarify', 'build'].forEach(cat => {
        const list = strList(stemsRaw[cat]).slice(0, 4);
        if (list.length) talkStems[cat] = list;
    });
    const rawProtocol = String(raw.protocol || '').toLowerCase();
    const protocol = DISCUSSION_PROTOCOLS.includes(rawProtocol) ? rawProtocol
        : (DISCUSSION_PROTOCOLS.includes(fallbackProtocol) ? fallbackProtocol : 'think-pair-share');
    const item = {
        kind: 'discussion',
        title: str(raw.title),
        protocol,
        grouping: str(raw.grouping),
        openingQuestion: str(raw.openingQuestion),
        questionSets,
        talkStems,
        facilitationNotes: str(raw.facilitationNotes),
        lookFors: strList(raw.lookFors).slice(0, 8),
        rubric: null,
    };
    if (!item.title || !questionSets.length) return null;
    return item;
};
const normalizeJigsawActivity = (raw, requestedGroupSize) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const str = v => String(v == null ? '' : v).trim();
    const strList = v => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
    const chunks = (Array.isArray(raw.chunks) ? raw.chunks : []).map((c, i) => {
        const chunk = {
            label: str(c && c.label) || ('Expert ' + (i + 1)),
            expertPacket: str(c && c.expertPacket),
            teachBack: {
                keyPoints: strList(c && c.teachBack && c.teachBack.keyPoints).slice(0, 6),
                checkQuestions: strList(c && c.teachBack && c.teachBack.checkQuestions).slice(0, 4),
            },
        };
        // Optional differentiation tag (P3). The level word also rides inside
        // the label in the output language, so no chrome string depends on it.
        const level = String(c && c.suggestedLevel || '').toLowerCase();
        if (level === 'support' || level === 'core' || level === 'stretch') chunk.suggestedLevel = level;
        return chunk;
    }).filter(c => c.expertPacket).slice(0, 6);
    const size = Number(requestedGroupSize);
    const item = {
        kind: 'jigsaw',
        title: str(raw.title),
        groupSize: Number.isFinite(size) && size >= 2 && size <= 6 ? Math.floor(size) : (chunks.length || 4),
        chunks,
        homeGroupTask: str(raw.homeGroupTask),
        synthesisOrganizer: str(raw.synthesisOrganizer),
        // Question + answer stored ONCE here; the renderer's student list and the
        // teacher answer key both derive from these fields (one derivation).
        accountabilityCheck: (Array.isArray(raw.accountabilityCheck) ? raw.accountabilityCheck : [])
            .map(c => ({ q: str(c && c.q), answer: str(c && (c.answer != null ? c.answer : c.a)) }))
            .filter(c => c.q).slice(0, 8),
        rubric: null,
    };
    if (!item.title || item.chunks.length < 2) return null;
    return item;
};

// Renders one brainstorm data item as labeled plain text — the ONE serializer
// behind (a) the ladder handlers' prompt context (guide/worksheet/rubric read
// `description`, which discussion/jigsaw items don't have) and (b) the export
// flattener (which otherwise dumps label-less value soup). `labels` overrides
// the English section labels; the export path passes t()-driven ones (the keys
// all exist in ui_strings under brainstorm.*). Pure; exported on GenDispatcher.
const describeActivityItem = (item, labels) => {
    if (!item || typeof item !== 'object') return '';
    const L = Object.assign({
        protocol: 'Protocol',
        grouping: 'Grouping',
        opening: 'Opening question',
        depth_literal: 'Right there in the text',
        depth_inferential: 'Between the lines',
        depth_evaluative: 'Your judgment',
        talk_stems: 'Talk stems',
        stems_agree: 'Agreeing',
        stems_disagree: 'Disagreeing respectfully',
        stems_clarify: 'Asking for clarity',
        stems_build: 'Building on ideas',
        facilitation_notes: 'Facilitation notes (teacher)',
        look_fors: 'Participation look-fors',
        expert_group: 'Expert group',
        teach_back_points: 'When you teach your group, cover:',
        teach_back_questions: 'Check your group understood:',
        home_group_task: 'Home-group task',
        synthesis_organizer: 'Putting it together',
        accountability_check: 'Show what you learned (everyone answers)',
        answer_key: 'Answer key (teacher only)',
    }, labels || {});
    const lines = [];
    if (item.kind === 'discussion') {
        if (item.title) lines.push(item.title);
        if (item.protocol) lines.push(L.protocol + ': ' + item.protocol);
        if (item.grouping) lines.push(L.grouping + ': ' + item.grouping);
        if (item.openingQuestion) lines.push(L.opening + ': ' + item.openingQuestion);
        (Array.isArray(item.questionSets) ? item.questionSets : []).forEach(set => {
            const qs = set && Array.isArray(set.questions) ? set.questions : [];
            if (!qs.length) return;
            lines.push('', (L['depth_' + set.depth] || set.depth || '') + ':');
            qs.forEach((q, i) => lines.push('  ' + (i + 1) + '. ' + q));
        });
        const stems = item.talkStems && typeof item.talkStems === 'object' ? item.talkStems : {};
        const stemCats = ['agree', 'disagree', 'clarify', 'build'].filter(c => Array.isArray(stems[c]) && stems[c].length);
        if (stemCats.length) {
            lines.push('', L.talk_stems + ':');
            stemCats.forEach(c => lines.push('  ' + L['stems_' + c] + ': ' + stems[c].join(' | ')));
        }
        if (item.facilitationNotes) lines.push('', L.facilitation_notes + ':', item.facilitationNotes);
        if (Array.isArray(item.lookFors) && item.lookFors.length) lines.push('', L.look_fors + ': ' + item.lookFors.join('; '));
        return lines.join('\n').trim();
    }
    if (item.kind === 'jigsaw') {
        if (item.title) lines.push(item.title);
        (Array.isArray(item.chunks) ? item.chunks : []).forEach((chunk, i) => {
            if (!chunk || !chunk.expertPacket) return;
            lines.push('', (chunk.label || (L.expert_group + ' ' + (i + 1))) + ':', chunk.expertPacket);
            const tb = chunk.teachBack && typeof chunk.teachBack === 'object' ? chunk.teachBack : {};
            if (Array.isArray(tb.keyPoints) && tb.keyPoints.length) lines.push(L.teach_back_points + ' ' + tb.keyPoints.join('; '));
            if (Array.isArray(tb.checkQuestions) && tb.checkQuestions.length) lines.push(L.teach_back_questions + ' ' + tb.checkQuestions.join(' / '));
        });
        if (item.homeGroupTask) lines.push('', L.home_group_task + ':', item.homeGroupTask);
        if (item.synthesisOrganizer) lines.push('', L.synthesis_organizer + ':', item.synthesisOrganizer);
        const checks = Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : [];
        if (checks.length) {
            lines.push('', L.accountability_check + ':');
            checks.forEach((c, i) => lines.push('  ' + (i + 1) + '. ' + (c && c.q || '')));
            lines.push('', L.answer_key + ':');
            checks.forEach((c, i) => lines.push('  ' + (i + 1) + '. ' + (c && c.answer || '')));
        }
        return lines.join('\n').trim();
    }
    // Classic idea card: same three fields the old flatteners produced.
    return [item.title, item.description, item.connection].filter(Boolean).join('\n');
};

const handleGenerate = async (type, langOverride = null, keepLoading = false, textOverride = null, configOverride = {}, switchView = true, deps) => {
  const { gradeLevel, outlineType, visualStyle, visualCustomStyle, visualLayoutMode, quizMcqCount, persistedLessonDNA, leveledTextCustomInstructions, quizCustomInstructions, glossaryCustomInstructions, frameCustomInstructions, adventureCustomInstructions, brainstormCustomInstructions, faqCustomInstructions, outlineCustomInstructions, visualCustomInstructions, lessonCustomAdditions, timelineTopic, sourceTopic, history, inputText, differentiationRange, leveledTextLanguage, translationMode, resolveTranslationPolicy, selectedLanguages, studentInterests: _ambientStudentInterests, guidedMode, guidedStep, standardsInput, standardsContext: _ambientStandardsContext, targetStandards, dokLevel, sourceLength, sourceTone, textFormat, useEmojis, fullPackTargetGroup, rosterKey, imageGenerationStyle, imageAspectRatio, enableEmojiInline, cellGameDifficulty, includeSourceCitations, includeBibliography, currentUiLanguage, sourceCustomInstructions, sourceVocabulary, sourceLevel, generatedContent, mathSubject, mathMode, mathInput, mathQuantity, isAutoConfigEnabled, resourceCount, isParentMode, isIndependentMode, isTeacherMode, frameType, fillInTheBlank, vocabularyType, enableFactionResources, factionResourceMode, isAdventureStoryMode, isSocialStoryMode, isImmersiveMode, adventureChanceMode, adventureConsistentCharacters, adventureFreeResponseEnabled, adventureLanguageMode, adventureInputMode, apiKey, setIsMapLocked, setIsProcessing, setGenerationStep, setInteractionMode, setDefinitionData, setSelectionMenu, setRevisionData, setIsReviewGame, setReviewGameState, setGuidedStep, setGeneratedContent, setActiveView, setHistory, setError, setShowKokoroOfferModal, alloBotRef, pdfFixResult, addToast, t, warnLog, debugLog, callGemini: callGeminiBase, cleanJson, safeJsonParse, callImagen, extractSourceTextForProcessing, formatLessonDNA, getDifferentiationGrades, getGroupDifferentiationContext, flyToElement, fisherYatesShuffle, sanitizeTruncatedCitations, normalizeCitationPlacement, fixCitationPlacement, generateBibliographyString, processGrounding, parseFlowChartData, verifyMathProblems, normalizeResourceLinks, detectClimaxArchetype, handleGenerateLessonPlan, handleGenerateMath, handleGenerateSource, autoConfigureSettings, applyDetailedAutoConfig, getAssetManifest, getLessonContext, buildLessonPlanPrompt, buildStudyGuidePrompt, buildParentGuidePrompt, GUIDED_STEPS, LENGTH_THRESHOLDS, TIMELINE_MODE_DEFINITIONS, audioRef, autoRemoveWords, bridgeSimType, bridgeStepCount, conceptImageMode, conceptItemCount, conceptSortImageStyle, creativeMode, faqCount, glossaryDefinitionLevel, glossaryImageStyle, glossaryTier2Count, glossaryTier3Count, includeCharts, includeEtymology, includeTimelineVisuals, isBotVisible, isMathGraphEnabled, keepCitations, leveledTextLength, noText, passAnalysisToQuiz, quizReflectionCount, selectedConcepts: _ambientSelectedConcepts, standardsPromptString: _ambientStandardsPromptString, timelineImageStyle, timelineItemCount, timelineMode, useLowQualityVisuals, setGameMode, setGlossarySearchTerm, setIsConceptMapReady, setIsEditingAnalysis, setIsEditingBrainstorm, setIsEditingFaq, setIsEditingGlossary, setIsEditingLeveledText, setIsEditingOutline, setIsEditingQuiz, setIsEditingScaffolds, setIsGeneratingPersona, setIsInteractiveVenn, setIsMatchingGame, setIsMemoryGame, setIsPlaying, setIsPresentationMode, setIsSideBySide, setIsStudentBingoGame, setIsVennPlaying, setPersonaState, setPresentationState, setProcessingProgress, setShowQuizAnswers, setStickers, calculateReadability, callGeminiImageEdit, checkAccuracyWithSearch, chunkText, countWords, executeVisualPlan, filterEducationalSources, formatMathQuestion, generateHelpfulHint, generateVisualPlan, getDefaultTitle, performDeepVerification, repairGeneratedText, resetPersonaInterviewState, validateSequenceStructure, universalImageStyle, conceptSortCustomInstructions, dbqCustomInstructions, noteTakingCustomInstructions, anchorChartCustomInstructions, personaCustomInstructions, differentiationTypes, differentiationCustomGrades } = deps;
  try { if (window._DEBUG_GEN_DISPATCHER) console.log("[GenDispatcher] handleGenerate fired:", type); } catch(_) {}
    // Batch callers pass a run-local history snapshot so later resources see
    // earlier resources even though React state updates are asynchronous.
    const generationHistory = Array.isArray(configOverride && configOverride.historyOverride)
        ? configOverride.historyOverride
        : (Array.isArray(history) ? history : []);
    // Batch runners use one cooperative signal for every resource. Keep the
    // existing call sites stable while ensuring text requests can be cancelled
    // between resources instead of waiting for the full retry budget.
    const generationSignal = deps && deps.generationSignal;
    const throwIfGenerationAborted = () => {
        if (generationSignal && generationSignal.aborted) {
            const abortError = new Error('Generation aborted');
            abortError.name = 'AbortError';
            throw abortError;
        }
    };
    const callGemini = (...args) => {
        if (generationSignal && args[5] == null) args[5] = generationSignal;
        return callGeminiBase(...args);
    };
    const callImagenWithSignal = (...args) => {
        if (!generationSignal) return callImagen(...args);
        const options = args[3];
        args[3] = options && typeof options === 'object'
            ? Object.assign({}, options, { signal: options.signal || generationSignal })
            : { signal: generationSignal };
        return callImagen(...args);
    };
    const callGeminiImageEditWithSignal = (...args) => {
        if (!generationSignal) return callGeminiImageEdit(...args);
        const options = args[5];
        args[5] = options && typeof options === 'object'
            ? Object.assign({}, options, { signal: options.signal || generationSignal })
            : { signal: generationSignal };
        return callGeminiImageEdit(...args);
    };
    // ── DA CLINICAL ISOLATION ────────────────────────────────────────────
    // Dynamic Assessment supports (visual organizers, sentence frames) route
    // through this shared dispatcher and pass { isolatedContext: true }. A DA
    // probe measures a student's MODIFIABILITY on one construct; if the
    // generated support inherits the open lesson's topic, vocabulary,
    // standards, differentiation or student interests, the support teaches
    // outside content and the measure is confounded. That is a validity
    // failure, not a cosmetic one.
    //
    // This flag was passed by the host and read by NOBODY (verified 2026-07-27:
    // zero occurrences of isolatedContext in this file), so every DA support
    // silently inherited the ambient lesson. The suppression happens HERE, at
    // each value's single computation point, rather than at the ~20 prompt
    // template sites — missing one template site is an invisible clinical
    // defect, whereas a value that is empty at the source cannot leak.
    //
    // Strictly additive: when isolatedContext is falsy, every value below is
    // exactly what it was before. Arrays stay arrays (call sites use .length
    // and .join), strings stay strings.
    const _isolatedContext = !!(configOverride && configOverride.isolatedContext);
    const _standardsContextModule = typeof window !== 'undefined' && window.AlloModules
        ? window.AlloModules.StandardsContext
        : null;
    const _standardsContextInput = configOverride && configOverride.standardsContext
        ? configOverride.standardsContext
        : (_ambientStandardsContext || standardsInput || targetStandards);
    const _standardsContext = _isolatedContext
        ? null
        : (_standardsContextModule && typeof _standardsContextModule.resolve === 'function'
            ? _standardsContextModule.resolve(_standardsContextInput)
            : null);
    const _activeStandardsContext = _standardsContext
        && Array.isArray(_standardsContext.standards)
        && _standardsContext.standards.length
        ? _standardsContext
        : null;
    const ambientStandardsPromptString = _isolatedContext ? '' : _ambientStandardsPromptString;
    const standardsPromptString = (_standardsContext && _standardsContext.promptText) || ambientStandardsPromptString;
    const selectedConcepts = _isolatedContext ? [] : _ambientSelectedConcepts;
    const studentInterests = _isolatedContext ? [] : _ambientStudentInterests;
    const usesLocalTextBackend = (() => {
        try {
            const w = typeof window !== 'undefined' ? window : null;
            const localHelpers = w && w.AIBackendLocal;
            const isLocal = localHelpers && typeof localHelpers.isLocalTextBackend === 'function'
                ? localHelpers.isLocalTextBackend
                : (backend) => ['ollama', 'localai', 'lmstudio', 'alloflow-local', 'custom'].includes(String(backend || ''));
            if (w && w.__alloActiveAIBackend && w.__alloActiveAIBackend.backend) {
                return !!isLocal(w.__alloActiveAIBackend.backend);
            }
            const storage = w && w.localStorage;
            const cfg = storage ? JSON.parse(storage.getItem('alloflow_ai_config') || 'null') : null;
            return !!(cfg && cfg.backend && isLocal(cfg.backend));
        } catch (_) {
            return false;
        }
    })();
    // Constrained decoding for small local models: llama.cpp and LM Studio
    // compile a JSON schema to a GBNF grammar, so the shape becomes impossible
    // to get wrong rather than merely requested in prose. Returns null unless
    // the device has opted in AND this type has a verified schema, in which
    // case the extra arg is inert and the call behaves exactly as before.
    const localSchemaArg = (schemaType) => {
        try {
            const helpers = typeof window !== 'undefined' ? window.AIBackendLocal : null;
            if (!usesLocalTextBackend || !helpers || typeof helpers.resourceSchemaFor !== 'function') return null;
            const schema = helpers.resourceSchemaFor(schemaType);
            return schema ? { schema } : null;
        } catch (_) {
            return null;
        }
    };
    // The engine probe has always measured whether the loaded model can hold a
    // strict-JSON shape, and /api/engine/status has always reported it — but
    // nothing ever read it, so an unfit model was handed strict-JSON work anyway
    // and failed later as "Failed to parse … JSON. The AI response was not
    // valid." That message blames the response; the real answer is that this
    // model cannot do this job. Fail up front, and say which model and what to do.
    //
    // ★ Gates on a definite 'fail' ONLY. localModelSupportsTask() is true just
    // for 'pass', so gating on it would also block every model that has simply
    // never been probed ('unknown') — the common case on a fresh install.
    const assertLocalTaskSupported = (task, resourceLabel) => {
        if (!usesLocalTextBackend) return;
        try {
            const w = typeof window !== 'undefined' ? window : null;
            const helpers = w && w.AIBackendLocal;
            const active = w && w.__alloActiveAIBackend;
            const profile = active && active.localModelProfile;
            if (!helpers || typeof helpers.localTaskState !== 'function' || !profile) return;
            if (helpers.localTaskState(profile, task) !== 'fail') return;
            const modelName = profile.modelId || (active && active.model) || 'the local model';
            const err = new Error(
                `${resourceLabel} needs structured output, and the model check found that ${modelName} could not produce it. ` +
                'Run the model check again from Settings, choose a larger local model, or switch to a cloud backend for this resource.'
            );
            err.alloLocalCapability = task;
            throw err;
        } catch (capabilityErr) {
            if (capabilityErr && capabilityErr.alloLocalCapability) throw capabilityErr;
            // A malformed profile must never block generation.
        }
    };
    const emitLocalTaskProgress = (current, total, label) => {
        if (!usesLocalTextBackend) return;
        try {
            if (typeof window !== 'undefined' && typeof window.__alloLocalTaskProgress === 'function') {
                window.__alloLocalTaskProgress({ current, total, label, type });
            }
        } catch (_) {}
    };
    const setGenerationTaskProgress = (current, total, label) => {
        setProcessingProgress({ current, total });
        emitLocalTaskProgress(current, total, label);
    };
    const localExcerpt = (text, maxChars = 6000) => {
        const normalized = String(text || '').replace(/\s+\n/g, '\n').trim();
        if (normalized.length <= maxChars) return normalized;
        return normalized.slice(0, maxChars).trim() + '\n\n[Source excerpt trimmed for local model context.]';
    };
    const parseJsonLenient = (raw, fallback = null) => {
        const cleaned = cleanJson(String(raw || ''));
        const attempts = [cleaned];
        const arrStart = cleaned.indexOf('[');
        const arrEnd = cleaned.lastIndexOf(']');
        if (arrStart >= 0 && arrEnd > arrStart) attempts.push(cleaned.slice(arrStart, arrEnd + 1));
        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        if (objStart >= 0 && objEnd > objStart) attempts.push(cleaned.slice(objStart, objEnd + 1));
        for (const candidate of attempts) {
            try { return JSON.parse(candidate); } catch (_) {}
        }
        return fallback;
    };
    const unwrapArray = (value, keys = []) => {
        if (Array.isArray(value)) return value;
        for (const key of keys) {
            if (value && Array.isArray(value[key])) return value[key];
        }
        return [];
    };
    const compactHistoryForLocal = (items, limit = 6) => {
        if (!Array.isArray(items)) return '';
        return items.slice(-limit).map(h => `- ${(h && h.type) || 'resource'}: ${(h && h.title) || 'Untitled'}`).join('\n');
    };
    setIsMapLocked(false);
    const effectiveGrade = configOverride.grade || gradeLevel;
    const effectiveOutlineType = configOverride.outlineType || outlineType;
    // visualStyle === 'custom' means "use the user-typed phrase in visualCustomStyle"
    // (revealed by the dropdown when 'Custom' is selected). Empty custom field
    // falls back to 'Default' so the prompt template never gets "${''} style.".
    // configOverride still wins if a programmatic caller passes a literal style.
    let effectiveVisualStyle;
    if (configOverride.visualStyle) {
        effectiveVisualStyle = configOverride.visualStyle;
    } else if (visualStyle === 'custom') {
        const trimmed = (visualCustomStyle || '').trim().slice(0, 120);
        effectiveVisualStyle = trimmed || 'Default';
    } else if ((!visualStyle || visualStyle === 'Default') && (universalImageStyle || '').trim()) {
        // Universal default image style (2026-07-28): fills in ONLY when the
        // Visuals tool is on its own 'Default' — an explicit per-tool style
        // always wins, and configOverride (branch above) wins over everything.
        effectiveVisualStyle = (universalImageStyle || '').trim().slice(0, 120);
    } else {
        effectiveVisualStyle = visualStyle;
    }
    const effectiveQuizCount = configOverride.quizCount || quizMcqCount;
    // Isolated generations carry NO golden thread — not even an explicitly
    // passed configOverride.lessonDNA. dnaPromptBlock is injected into several
    // prompts verbatim, so it must be empty rather than merely unused.
    const lessonDNA = _isolatedContext ? null : (configOverride.lessonDNA || persistedLessonDNA || null);
    const dnaPromptBlock = _isolatedContext ? '' : formatLessonDNA(lessonDNA);
    // Isolated generations take instructions ONLY from what the caller passed
    // explicitly. The per-type fallbacks below are all ambient: they are the
    // teacher's main-app custom instructions for that tool (and, for timeline,
    // the open lesson's topic). A DA support that inherits "write everything as
    // a pirate story about the Civil War" is not measuring the construct.
    const effCustomInstructions = (configOverride && configOverride.customInstructions)
        ? configOverride.customInstructions
        : _isolatedContext ? '' : (
            type === 'simplified' ? leveledTextCustomInstructions :
            type === 'quiz' ? quizCustomInstructions :
            type === 'glossary' ? glossaryCustomInstructions :
            type === 'sentence-frames' ? frameCustomInstructions :
            type === 'adventure' ? adventureCustomInstructions :
            type === 'brainstorm' ? brainstormCustomInstructions :
            type === 'faq' ? faqCustomInstructions :
            type === 'outline' ? outlineCustomInstructions :
            type === 'image' ? visualCustomInstructions :
            type === 'timeline' ? (_isolatedContext ? '' : (timelineTopic || sourceTopic)) :
            // Added 2026-07-28: these five interpolated effCustomInstructions in
            // their prompts (or, for lesson-plan, passed it to the prompt
            // builders) while the resolver silently fell through to '' — the
            // probe's structurally-always-empty class. lesson-plan's field
            // predates this fix; the other four fields are new.
            type === 'lesson-plan' ? lessonCustomAdditions :
            type === 'concept-sort' ? conceptSortCustomInstructions :
            type === 'dbq' ? dbqCustomInstructions :
            type === 'note-taking' ? noteTakingCustomInstructions :
            type === 'anchor-chart' ? anchorChartCustomInstructions :
            // 2026-07-29: the PANEL's persona button goes through
            // handleGeneratePersonas (personas module), which honours this field
            // — but guided-step retries and Full Pack route through THIS branch,
            // which silently dropped it. One field, two prompt paths, one honest.
            type === 'persona' ? personaCustomInstructions :
            ''
        ) || '';
    let textToProcess = textOverride;
    let carriedInputReferences = '';
    if (textToProcess === null) {
        const latestAnalysis = generationHistory.slice().reverse().find(h => h && h.type === 'analysis');
        if (type !== 'analysis' && latestAnalysis?.data?.originalText) {
            const rawText = latestAnalysis.data.originalText;
            const analysisReferenceParts = splitAdaptationReferences(rawText);
            textToProcess = analysisReferenceParts.body;
            carriedInputReferences = analysisReferenceParts.references;
        } else {
            textToProcess = inputText;
        }
    }
    if (!textToProcess || !textToProcess.trim()) {
        const noSourceError = new Error('No source text is available for ' + type + ' generation.');
        noSourceError.code = 'allo/source-missing';
        // Interactive buttons keep the old fail-soft behavior. Unattended
        // blueprint/pack callers opt in to rethrow so the exact row is logged
        // instead of being reported as a successful no-op.
        if (configOverride && configOverride.rethrowErrors) throw noSourceError;
        return;
    }
    if (textToProcess.includes('--- ENGLISH TRANSLATION ---')) {
        const bilingualReferenceParts = splitAdaptationReferences(textToProcess);
        if (!carriedInputReferences && bilingualReferenceParts.references) {
            carriedInputReferences = bilingualReferenceParts.references;
        }
        const extracted = extractSourceTextForProcessing(bilingualReferenceParts.body, true); // prefer English
        if (extracted.isBilingual) {
            textToProcess = extracted.englishBlock || extracted.text;
            warnLog('[Generate] Bilingual source detected — using English block for ' + type + ' generation (' + textToProcess.length + ' chars)');
        }
    }
    // Differentiation fan-out. Was hardcoded to 'simplified'; now driven by the
    // opt-in list so a teacher can request a differentiated SET of any resource
    // whose branch honours configOverride.grade (17 of 20, verified by probe).
    //
    // Two guards, both deliberate:
    //   - `!configOverride.grade` is the recursion guard. The re-entry below is
    //     the only caller that passes a grade, so this is precise — unlike the
    //     old `Object.keys(configOverride).length === 0`, which also silently
    //     excluded quiz (the one panel whose button passes a config).
    //   - `!configOverride.skipDifferentiation` lets batch callers opt out.
    //     Full Pack sets it: differentiating inside a pack would multiply an
    //     already-large run (8 resources x 3 levels = 24 generations).
    const _diffTypes = Array.isArray(differentiationTypes) ? differentiationTypes : ['simplified'];
    if (_diffTypes.includes(type)
        && differentiationRange !== 'None'
        && !configOverride.grade
        && !configOverride.skipDifferentiation) {
        const gradesToGen = getDifferentiationGrades(gradeLevel, differentiationRange, differentiationCustomGrades);
        if (gradesToGen.length > 1) {
            setIsProcessing(true);
            // Return the last landed item instead of undefined. Programmatic
            // callers judge success by the return value (the blueprint runner
            // marks a falsy return FAILED), and this path generates real
            // resources — a bare return reported that work as "produced nothing".
            let _lastDiffItem = null;
            try {
                for (let i = 0; i < gradesToGen.length; i++) {
                    const grade = gradesToGen[i];
                    const isLast = i === gradesToGen.length - 1;
                    setGenerationStep(`Generating version for ${grade}...`);
                    // Thread langOverride through: callers that name a language
                    // (e.g. Reading Library generating in the book's language)
                    // must not have differentiated versions silently revert to
                    // the leveledTextLanguage dropdown.
                    _lastDiffItem = (await handleGenerate(type, langOverride, !isLast, textToProcess, Object.assign({}, configOverride, { grade: grade }), false, deps)) || _lastDiffItem;
                    if (!isLast) await new Promise(r => setTimeout(r, 800));
                }
                addToast(`Generated ${gradesToGen.length} differentiated versions!`, "success");
            } catch (e) {
                warnLog("Unhandled error:", e);
                addToast(t('toasts.batch_diff_failed'), "error");
            } finally {
                setIsProcessing(false);
            }
            return _lastDiffItem;
        }
    }
    if (type === 'simplified') {
        setInteractionMode('read');
        setDefinitionData(null);
        setSelectionMenu(null);
        setRevisionData(null);
    }
    setIsReviewGame(false);
    setReviewGameState({ claimed: new Set(), activeQuestion: null, showAnswer: false });
    const effectiveLanguage = langOverride || leveledTextLanguage;
    // Roster/group differentiation describes THIS CLASS's lesson groupings —
    // ambient context that must not steer a single student's DA support.
    const differentiationContext = _isolatedContext ? '' : getGroupDifferentiationContext();
    const dialectInstruction = effectiveLanguage !== 'English' ? "STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions." : "";
    const languageDirective = (effectiveLanguage && effectiveLanguage !== 'English' && effectiveLanguage !== 'All Selected Languages')
        ? `LANGUAGE: Write ALL generated student-facing text in ${effectiveLanguage}. Keep JSON keys, machine-role id values, and code/math notation in English. ${dialectInstruction}`
        : '';
    // ── Translations (Lane 4, 2026-08-16) ────────────────────────────────
    // Resolved ONCE per generation, from the same resolver the settings panel
    // renders against. Every translation site below reads `_xlate.enabled` and
    // `_xlate.target` — none of them tests a language string itself any more.
    // That was the actual defect: twenty-six sites each deciding for themselves
    // whether a translation was wanted, twenty-five of them hardcoding the
    // literal 'English' as the destination, and one reading the app UI language
    // instead of the output language.
    //
    // Read as a resolved OBJECT, never as `mode !== 'off'`. A multi-state
    // setting compared that way has already caused a lockout in this codebase:
    // an unrecognised value read as "on" for everybody. Here an unrecognised
    // value resolves to the documented 'auto' default inside the resolver, and
    // callers cannot get it wrong because they never see the raw string.
    const _resolveXlate = deps.resolveTranslationPolicy || ((mode, out, ui) => ({
        // Defensive fallback only: if the host did not thread the resolver, do
        // what the app did before this setting existed rather than silently
        // dropping every translation.
        enabled: !!out && out !== 'English' && out !== 'All Selected Languages',
        target: 'English',
        mode: 'auto',
    }));
    const _xlateChoices = [currentUiLanguage, 'English', ...(selectedLanguages || [])]
        .map(v => String(v == null ? '' : v).trim())
        .filter(v => v && v !== 'All Selected Languages' && v.toLowerCase() !== String(effectiveLanguage || '').trim().toLowerCase())
        .filter((v, i, arr) => arr.findIndex(o => o.toLowerCase() === v.toLowerCase()) === i);
    const _xlate = _resolveXlate(translationMode, effectiveLanguage, currentUiLanguage, _xlateChoices);
    // Prompt fragment for the JSON-field style ("_en" siblings). Named for what
    // it does, not for English, because the destination is no longer fixed.
    const glossLang = _xlate.target;
    // Shared cross-cutting directives. Each collapses to '' when its setting is
    // unset, so adding one to a prompt changes NOTHING for a teacher who has not
    // touched that setting. Same idiom as languageDirective — a shared fragment
    // branches interpolate, not a central assembler. Coverage is measured, not
    // assumed: dev-tools/check_local_llm_resource_matrix.cjs --capabilities
    // regenerates docs/resource_setting_coverage.md after any prompt change.
    const standardsDirective = standardsPromptString
        ? `TARGET STANDARDS: Align content emphasis and skill focus to: "${standardsPromptString}".`
        : '';
    const interestsDirective = (studentInterests && studentInterests.length > 0)
        ? `STUDENT INTERESTS: Where it fits naturally, frame examples and contexts using: ${studentInterests.join(', ')}. Never force relevance or distort factual content.`
        : '';
    // ── Artifact provenance ──────────────────────────────────────────────
    // ONE builder for every resource type. This used to be a literal declared
    // inside the 'simplified' branch plus a second, thinner literal for the
    // other nineteen types — so quizzes, glossaries, timelines and DBQs recorded
    // four fields while leveled text recorded eleven. A record that silently
    // omits DoK is worse than no record: it reads as "DoK was not set."
    //
    // Every value is the RESOLVED one this call actually used, never global UI
    // state. `isolatedContext` is what makes an empty standards/interests value
    // interpretable — under DA isolation those are deliberately blanked at
    // :1461-1463, which is otherwise indistinguishable from a teacher who set
    // nothing. `backend` is a genuine independent variable: several branches
    // ship twin prompts behind usesLocalTextBackend and those twins have drifted.
    const _buildItemConfig = (extra) => Object.assign({
        grade: effectiveGrade,
        language: effectiveLanguage,
        standards: standardsPromptString || "",
        interests: studentInterests,
        dok: dokLevel || "",
        useEmojis: !!useEmojis,
        customInstructions: effCustomInstructions || "",
        imageStyle: (universalImageStyle || "").trim(),
        backend: usesLocalTextBackend ? 'local' : 'cloud',
        isolatedContext: _isolatedContext,
    }, (configOverride.rosterGroupId ? {
        rosterGroupId: configOverride.rosterGroupId,
        rosterGroupName: configOverride.rosterGroupName,
        rosterGroupColor: configOverride.rosterGroupColor
    } : {}), extra || {});
    // dokLevel and useEmojis are NOT blanked by the DA isolation block above
    // (they are ambient task-shape settings, not lesson content), but a DA
    // support's cognitive demand is controlled by the probe protocol, not the
    // open lesson. Guard here so widening these directives' reach can never
    // introduce a new ambient influence on an isolated support.
    const emojiDirective = (useEmojis && !_isolatedContext)
        ? 'VISUAL SUPPORT: Add a relevant emoji next to key items or headings to support comprehension (UDL visual support). Keep them purposeful, not decorative clutter.'
        : '';
    // "Mixed" is a real option in the quiz panel (and now the universal panel);
    // interpolating it raw asks the model to target a level literally named
    // "Mixed". Mirror the quiz branch's progressive-ladder wording instead.
    // Webb's DoK is rooted in assessment ALIGNMENT, but the construct itself
    // describes the cognitive demand of a TASK — and every learning task has one.
    // A Venn diagram at DOK 2 asks what differs; at DOK 3 it asks which
    // difference matters and why. A Cornell cue can be "define erosion" or "why
    // does erosion accelerate here". So the directive is worded for tasks in
    // general, with an explicit guard against the obvious failure mode: a model
    // told to "target DOK 3" on a glossary should deepen the thinking the
    // resource invites, NOT bolt questions onto it.
    const _dokTaskFraming = ' Apply this to the depth of thinking the resource invites. Do NOT add quiz items, questions, or assessment scaffolding to a resource that is not an assessment.';
    const dokDirective = (!dokLevel || _isolatedContext)
        ? ''
        : dokLevel === 'Mixed'
            ? 'COGNITIVE DEMAND: Vary the cognitive demand progressively - begin at DOK 1 (Recall), move through DOK 2 (Skill/Concept), and finish at DOK 3 (Strategic Thinking).' + _dokTaskFraming
            : `COGNITIVE DEMAND: Pitch the thinking this resource asks for at Webb's Depth of Knowledge ${dokLevel}.` + _dokTaskFraming;
    if (effectiveLanguage === 'All Selected Languages' && !langOverride) {
        // Opt-IN list: types whose prompts genuinely honor effectiveLanguage.
        // Anything not listed regenerates once in English instead of fanning out into
        // N identical copies. New resource types default to safe (no duplicate spend).
        const MULTILINGUAL_FANOUT_TYPES = ['simplified', 'outline', 'image', 'quiz', 'faq',
            'sentence-frames', 'timeline', 'concept-sort', 'dbq', 'lesson-plan', 'adventure',
            'gemini-bridge', 'math', 'note-taking', 'anchor-chart', 'persona'];
        if (!MULTILINGUAL_FANOUT_TYPES.includes(type)) {
            return await handleGenerate(type, 'English', keepLoading, textToProcess, configOverride, switchView, deps);
        }
        setIsProcessing(true);
        // Same contract as the differentiation fan-out: batch paths must not
        // return undefined after landing real resources.
        let _lastLangItem = null;
        try {
            const langsToGen = ['English', ...selectedLanguages];
            const uniqueLangs = [...new Set(langsToGen)];
            for (let i = 0; i < uniqueLangs.length; i++) {
                const lang = uniqueLangs[i];
                const isLastLang = i === uniqueLangs.length - 1;
                const batchKeepLoading = !isLastLang || keepLoading;
                setGenerationStep(`${t('status.generating')} ${type} (${lang})...`);
                _lastLangItem = (await handleGenerate(type, lang, batchKeepLoading, textToProcess, configOverride, switchView, deps)) || _lastLangItem;
                await new Promise(r => setTimeout(r, 500));
            }
            addToast(`All ${type} resources generated!`, "success");
            if (type === 'simplified') flyToElement('ui-tool-simplified');
            if (type === 'glossary') flyToElement('ui-tool-glossary');
            if (type === 'outline') flyToElement('tour-tool-outline');
            if (type === 'image') flyToElement('tour-tool-visual');
        } catch (err) {
            console.error('[GenDispatcher] Batch generation error:', err);
            warnLog("Unhandled error:", err);
            setError(t('errors.batch_generation_failed'));
            if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
            // Same contract as the single-language path below: unattended callers
            // (blueprints, Demo Autopilot command steps) opt in to seeing the real
            // failure. A teacher with several languages selected routes through THIS
            // catch, so without the rethrow their demo steps still reported success
            // on a failed generation.
            if (configOverride && configOverride.rethrowErrors) throw err;
        } finally {
            if (!keepLoading) setIsProcessing(false);
        }
        return _lastLangItem;
    }
    setIsProcessing(true);
    setGenerationStep(t('status_steps.initializing'));
    setGenerationTaskProgress(0, 0, t('status_steps.initializing'));
    setError(null);
    setGlossarySearchTerm('');
    setGameMode(null);
    setIsMemoryGame(false);
    setIsMatchingGame(false);
    setIsStudentBingoGame(false);
    setShowQuizAnswers(false);
    setIsEditingLeveledText(false);
    setIsEditingFaq(false);
    setIsEditingQuiz(false);
    setIsEditingScaffolds(false);
    setIsEditingAnalysis(false);
    setIsEditingGlossary(false);
    setIsEditingBrainstorm(false);
    setIsEditingOutline(false);
    setIsSideBySide(false);
    setIsConceptMapReady(false);
    setIsInteractiveVenn(false);
    setIsVennPlaying(false);
    setIsPresentationMode(false);
    setPresentationState({});
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
    generateHelpfulHint(type, textToProcess, false);
    if (switchView) {
        setGeneratedContent(null);
        setActiveView('input');
    }
    try {
      let content;
      let metaInfo = '';
      if (type === 'glossary') {
        const t2Count = glossaryTier2Count || 0;
        const t3Count = glossaryTier3Count || 0;
        const totalTerms = t2Count + t3Count;
        if (totalTerms === 0) {
             addToast(t('toasts.request_at_least_one'), "error");
             setIsProcessing(false);
             // Unattended callers need a named reason, not an undefined return
             // their run record can only label "produced nothing".
             if (configOverride && configOverride.rethrowErrors) throw new Error('glossary step requested zero terms (set a Tier 2 or Tier 3 count)');
             return;
        }
        let levelContext = "";
        if (glossaryDefinitionLevel === 'Same as Source Text') {
            levelContext = "Write definitions that match the reading level/complexity of the provided source text.";
        } else if (glossaryDefinitionLevel === 'Same as Global Level') {
            levelContext = `Write definitions simplified for a ${effectiveGrade} student.`;
        } else {
             levelContext = `Write definitions simplified for a ${glossaryDefinitionLevel} student.`;
        }
        let prompt = '';
        // Glossary was already the one language-agnostic path: its translations
        // come from the teacher's own language list rather than a hardcoded
        // 'English'. The translation setting is layered ON TOP without taking
        // that away — 'off' clears the list, and the resolved gloss language is
        // added so the glossary agrees with every other resource about which
        // second language a teacher gets. The chip summary in the Glossary
        // panel keeps reading `selectedLanguages`, which is still the truth
        // about what the teacher added; this list is what gets requested.
        let langsReq = [...selectedLanguages];
        if (effectiveLanguage !== 'English' && effectiveLanguage !== 'All Selected Languages' && !langsReq.includes(effectiveLanguage)) {
            langsReq.push(effectiveLanguage);
        }
        if (!_xlate.enabled) {
            langsReq = [];
        } else if (!langsReq.some(l => String(l).toLowerCase() === String(_xlate.target).toLowerCase())) {
            langsReq.push(_xlate.target);
        }
        // The glossary is deliberately multi-language: its base column is always the English
        // definition, so English is the only language that must never be requested as a
        // "translation". This used to filter out effectiveLanguage on the assumption that the
        // terms were written in it, which silently dropped a column the teacher had explicitly
        // asked for: selecting Spanish AND setting the output language to Spanish removed the
        // Spanish column entirely. De-duplicate case-insensitively too, since the same language
        // can arrive from the teacher's list and from the output/translation setting.
        const _seenGlossaryLangs = new Set();
        langsReq = langsReq.filter(l => {
            const key = String(l == null ? '' : l).trim().toLowerCase();
            if (!key || key === 'english' || _seenGlossaryLangs.has(key)) return false;
            _seenGlossaryLangs.add(key);
            return true;
        });
        if (usesLocalTextBackend) {
            const localTermLimit = Math.max(1, Math.min(totalTerms, 8));
            const localLangInstruction = langsReq.length > 0
                ? `For each term, add a "translations" object for these languages: ${langsReq.join(', ')}. Use "Translated Term: Translated Definition" as each value.`
                : 'Do not include translations.';
            const prompt = `
              Analyze the source excerpt and identify vocabulary for ${effectiveGrade} students.
              Choose up to ${localTermLimit} useful terms total, balancing Academic and Domain-Specific vocabulary when possible.
              ${levelContext}
              ${localLangInstruction}
              ${effCustomInstructions ? `Prioritize these terms or concepts if they appear: "${effCustomInstructions}".` : ''}
              ${useEmojis ? 'Include a helpful emoji only when it clarifies the term, and put it in the separate "emoji" field, never inside "term".' : 'Do not use emojis.'}
              ${standardsDirective}
              ${dokDirective}
              ${interestsDirective}
              Return ONLY valid JSON with this shape:
              { "terms": [{ "term": "Name", "def": "Student-friendly definition", "tier": "Academic" | "Domain-Specific"${useEmojis ? ', "emoji": "one emoji, or omit the field"' : ''}${langsReq.length > 0 ? ', "translations": { "Language": "Translated Term: Translated Definition" }' : ''} }] }
              Source excerpt:
              """
              ${localExcerpt(textToProcess, 6000)}
              """
            `;
            setGenerationStep(t('status_steps.extracting_vocab'));
            setGenerationTaskProgress(0, 2, t('status_steps.extracting_vocab'));
            assertLocalTaskSupported('strict-json', 'The glossary');
            const result = await callGemini(prompt, true, false, null, null, null, localSchemaArg('glossary'));
            setGenerationTaskProgress(1, 2, t('status_steps.extracting_vocab'));
            const parsed = parseJsonLenient(result, {});
            const parsedContent = unwrapArray(parsed, ['terms', 'items', 'glossary']).slice(0, localTermLimit)
                .map(item => {
                    const tierRaw = String((item && item.tier) || '').toLowerCase();
                    const tier = tierRaw.includes('domain') || tierRaw.includes('tier 3') ? 'Domain-Specific' : 'Academic';
                    const normalized = {
                        term: String((item && item.term) || '').trim(),
                        def: String((item && (item.def || item.definition)) || '').trim(),
                        tier
                    };
                    if (item && item.translations && typeof item.translations === 'object') {
                        normalized.translations = item.translations;
                    }
                    return normalized;
                })
                .filter(item => item.term && item.def);
            if (!parsedContent.length) {
                throw new Error("Failed to parse Glossary JSON. The AI response was not valid.");
            }
            content = parsedContent;
            metaInfo = `${content.length} Terms - ${langsReq.length > 0 ? langsReq.join(', ') : 'English Only'} - Local`;
            setGenerationTaskProgress(2, 2, t('status_steps.generating_icons'));
        } else {
        if (langsReq.length > 0) {
            prompt = `
              Analyze the following text and identify vocabulary.
              Find exactly:
              - ${t2Count} "Academic" (Tier 2) terms: General sophisticated words used across disciplines (e.g., "analyze", "verify").
              - ${t3Count} "Domain-Specific" (Tier 3) terms: Specific to this specific topic/field (e.g., "photosynthesis", "isotope").
              For each term, provide:
              1. An English definition. ${levelContext}
              2. The Tier category ("Academic" or "Domain-Specific").
              3. Translations into: ${langsReq.join(', ')}.
              ${includeEtymology ? `
              4. Etymology / Word Roots for EVERY term (Academic AND Domain-Specific):
                 Provide 2-4 plain sentences on the word's origin, appropriate for a ${effectiveGrade} student.
                 MANDATORY requirements — do NOT skip any:
                 (a) The ACTUAL root morpheme(s) must appear verbatim as named strings in the "roots" array below — e.g., for "photosynthesis" the roots are "photo" and "synthesis". Do NOT write vague phrases like "comes from Greek" without naming the specific word/morpheme.
                 (b) Include brief word history when known: when/how the term entered English, meaning-shift over time, or who coined it. If unknown, skip this sentence — do not invent history.
                 (c) Name 1-3 related modern English words that share the same root, so students see the word family (e.g., for "photosynthesis": photograph, photon, photogenic).
                 Style by audience:
                 - K-5: simple sentences like "Comes from the Greek word photo meaning light — the same root appears in photograph and photon."
                 - 6-12: break into prefix/root/suffix, name source languages, and mention entry-into-English date if known.
                 - Skip terms with no meaningful etymology (proper nouns, brand names, very recent coinages). If so, OMIT the etymology, etymologyByLang, roots, AND any related fields together.
                 MULTI-LANGUAGE PROSE: Produce the etymology prose up front in ALL of these languages: ${[effectiveLanguage, ...langsReq].filter((v, i, a) => v && a.indexOf(v) === i).join(', ')}. Put each translation into the "etymologyByLang" object keyed by the English language name. Keep root morphemes in their source-language script (e.g. Greek "photo" stays as "photo" in every language version). Each language's prose should be 2-4 idiomatic sentences at roughly the same reading level — not a word-for-word translation of the English.
                 Output structure — add to each qualifying term:
                   "etymology": "English prose version (legacy field, mirrors etymologyByLang.English)",
                   "etymologyByLang": { ${[effectiveLanguage, ...langsReq].filter((v, i, a) => v && a.indexOf(v) === i).map(L => `"${L}": "prose in ${L}"`).join(', ')} },
                   "roots": [
                     { "root": "photo",     "lang": "Greek", "meaning": "light",              "related": ["photograph", "photon", "photogenic"] },
                     { "root": "synthesis", "lang": "Greek", "meaning": "putting together",   "related": ["synthetic", "synthesize"] }
                   ]
                 Each "root" = source-language morpheme (prefix / root / suffix). "lang" = origin language name. "meaning" = short English meaning (1-4 words). "related" = 1-3 modern English words sharing this root (optional per-root; include when they genuinely exist in common usage).
              ` : ''}
              ${effCustomInstructions ? `IMPORTANT: Prioritize these specific terms/concepts if they appear in the text: "${effCustomInstructions}".` : ''}
              ${useEmojis ? 'Include a relevant emoji for each term in the separate "emoji" field shown in the return shape below. Never place the emoji inside the "term" text itself.' : 'Do not use emojis.'}
              ${langsReq.length > 0 ? "STRICT DIALECT ADHERENCE: For any requested language that specifies a region (e.g. 'Brazilian Portuguese'), use that specific dialect's conventions." : ""}
              CRITICAL FOR TRANSLATIONS: Provide both the translated TERM and the translated DEFINITION.
              Format: "Translated Term: Translated Definition",
              ${standardsDirective}
              ${dokDirective}
              ${interestsDirective}
              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific"${useEmojis ? ', "emoji": "one emoji, or omit the field"' : ''}, "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" }${includeEtymology ? ', "etymology": "..." (optional), "etymologyByLang": { "English": "...", "Spanish": "..." } (optional, one key per requested language), "roots": [{ "root": "...", "lang": "...", "meaning": "..." }] (optional)' : ''} }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;
            metaInfo = `${t2Count} T2 / ${t3Count} T3 Terms - ${langsReq.join(', ')}`;
        } else {
            prompt = `
              Analyze the following text and identify vocabulary.
              Find exactly:
              - ${t2Count} "Academic" (Tier 2) terms: General sophisticated words used across disciplines.
              - ${t3Count} "Domain-Specific" (Tier 3) terms: Specific to this specific topic/field.
              For each term, provide:
              1. An English definition. ${levelContext}
              2. The Tier category ("Academic" or "Domain-Specific").
              ${includeEtymology ? `
              3. Etymology / Word Roots for EVERY term (Academic AND Domain-Specific):
                 Provide 2-4 plain sentences on the word's origin, appropriate for a ${effectiveGrade} student.
                 MANDATORY requirements — do NOT skip any:
                 (a) The ACTUAL root morpheme(s) must appear verbatim as named strings in the "roots" array below — e.g., for "photosynthesis" the roots are "photo" and "synthesis". Do NOT write vague phrases like "comes from Greek" without naming the specific word/morpheme.
                 (b) Include brief word history when known: when/how the term entered English, meaning-shift over time, or who coined it. If unknown, skip this sentence — do not invent history.
                 (c) Name 1-3 related modern English words that share the same root, so students see the word family (e.g., for "photosynthesis": photograph, photon, photogenic).
                 Style by audience:
                 - K-5: simple sentences like "Comes from the Greek word photo meaning light — the same root appears in photograph and photon."
                 - 6-12: break into prefix/root/suffix, name source languages, and mention entry-into-English date if known.
                 - Skip terms with no meaningful etymology (proper nouns, brand names, very recent coinages). If so, OMIT the etymology, roots, AND related fields together.
                 Output structure — add to each qualifying term:
                   "etymology": "prose sentences described above",
                   "roots": [
                     { "root": "photo",     "lang": "Greek", "meaning": "light",              "related": ["photograph", "photon", "photogenic"] },
                     { "root": "synthesis", "lang": "Greek", "meaning": "putting together",   "related": ["synthetic", "synthesize"] }
                   ]
                 Each "root" = source-language morpheme. "lang" = origin language. "meaning" = short English meaning (1-4 words). "related" = 1-3 modern English words sharing this root (optional per-root; include when they genuinely exist).
              ` : ''}
              ${effCustomInstructions ? `IMPORTANT: Prioritize these specific terms/concepts if they appear in the text: "${effCustomInstructions}".` : ''}
              ${useEmojis ? 'Include a relevant emoji for each term in the separate "emoji" field shown in the return shape below. Never place the emoji inside the "term" text itself.' : 'Do not use emojis.'}
              ${standardsDirective}
              ${dokDirective}
              ${interestsDirective}
              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific"${useEmojis ? ', "emoji": "one emoji, or omit the field"' : ''}${includeEtymology ? ', "etymology": "..." (optional), "roots": [{ "root": "...", "lang": "...", "meaning": "..." }] (optional)' : ''} }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;
            metaInfo = `${t2Count} T2 / ${t3Count} T3 Terms - English Only`;
        }
        setGenerationStep(t('status_steps.extracting_vocab'));
        const result = await callGemini(prompt, true);
        try {
            let parsedContent = JSON.parse(cleanJson(result));
            if (!Array.isArray(parsedContent)) {
                if (parsedContent.terms) parsedContent = parsedContent.terms;
                else if (parsedContent.items) parsedContent = parsedContent.items;
                else if (parsedContent.glossary) parsedContent = parsedContent.glossary;
                else parsedContent = [];
            }
            // Offline pre-warm: cache the authoritative dictionary entry for every term so
            // the whole glossary's vocabulary works OFFLINE before class — the Define popup,
            // both Pronounce popups, and Word Sounds all read this same localStorage cache.
            // Background, gentle (concurrency 3; cache-first, so cached terms cost nothing),
            // English-only, best-effort: never blocks or fails glossary generation.
            if (effectiveLanguage === 'English' && Array.isArray(parsedContent) && parsedContent.length) {
                (async () => {
                    try {
                        if (!(window.AlloDictionary && typeof window.AlloDictionary.lookup === 'function') && window.__alloLoadPlugin) {
                            await Promise.race([window.__alloLoadPlugin('dictionary_loader.js'), new Promise(r => setTimeout(r, 6000))]);
                        }
                        if (!(window.AlloDictionary && typeof window.AlloDictionary.lookup === 'function')) return;
                        const _terms = parsedContent.map(it => it && it.term).filter(w => typeof w === 'string' && w && !/\s/.test(w));
                        let _i = 0;
                        const _worker = async () => {
                            while (_i < _terms.length) {
                                const _w = _terms[_i++];
                                try { await window.AlloDictionary.lookup(_w); } catch (_e) {}
                            }
                        };
                        await Promise.all([_worker(), _worker(), _worker()]);
                        debugLog(`[dict] pre-warmed ${_terms.length} glossary term(s) for offline use`);
                    } catch (_e) {}
                })();
            }
            addToast(autoRemoveWords ? t('status_steps.refining_icons') : t('status_steps.generating_icons'), "info");
            setGenerationStep(autoRemoveWords ? t('status_steps.refining_icons') : t('status_steps.generating_icons'));
            const BATCH_SIZE = 3;
            const BATCH_DELAY_MS = 500;
            const MAX_RETRIES = 1;
            const processedContent = [];
            const generateImageWithRetry = async (item, index, total) => {
                try {
                    const _glossaryStyle = (glossaryImageStyle || '').trim() || (universalImageStyle || '').trim();
                    const styleInstruction = _glossaryStyle ? `Style: ${_glossaryStyle}.` : 'Simple, clear, flat vector art style.';
                    const imgPrompt = `Icon style illustration of "${item.term}" (Context: ${item.def}). ${styleInstruction} White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.`;
                    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                        try {
                            if (attempt > 0) {
                                const backoffMs = 1000 * Math.pow(2, attempt);
                                debugLog(`⏳ Retry ${attempt + 1}/${MAX_RETRIES} for "${item.term}" after ${backoffMs}ms...`);
                                await new Promise(r => setTimeout(r, backoffMs));
                            }
                            let imageUrl = await callImagenWithSignal(imgPrompt);
                            if (autoRemoveWords && imageUrl) {
                                try {
                                    const rawBase64 = imageUrl.split(',')[1];
                                    const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                                    imageUrl = await callGeminiImageEditWithSignal(editPrompt, rawBase64);
                                } catch (editErr) {
                                    if ((editErr && editErr.name === 'AbortError') || (generationSignal && generationSignal.aborted)) throw editErr;
                                    warnLog("Auto-remove text failed for term:", item.term, editErr);
                                }
                            }
                            debugLog(`✅ Image ${index + 1}/${total} generated for: ${item.term}`);
                            return { ...item, image: imageUrl };
                        } catch (e) {
                            if ((e && e.name === 'AbortError') || (generationSignal && generationSignal.aborted)) throw e;
                            const is401 = e.message && e.message.includes('401');
                            if (is401 && attempt < MAX_RETRIES - 1) {
                                warnLog(`⚠️ Rate limited on "${item.term}", will retry...`);
                                continue;
                            }
                            console.error(`[Imagen] ❌ Image failed for "${item.term}" after ${attempt + 1} attempts:`, e.message);
                            return item;
                        }
                    }
                    return item;
                } catch (e) { warnLog("Unhandled error in generateImageWithRetry:", e); }
            };
            for (let i = 0; i < parsedContent.length; i += BATCH_SIZE) {
                const batch = parsedContent.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(parsedContent.length / BATCH_SIZE);
                debugLog(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
                const batchResults = await Promise.all(
                    batch.map((item, idx) => generateImageWithRetry(item, i + idx, parsedContent.length))
                );
                processedContent.push(...batchResults);
                if (i + BATCH_SIZE < parsedContent.length) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
                }
            }
            debugLog(`✅ All ${processedContent.length} glossary images processed!`);
            content = processedContent;
        } catch (parseErr) {
            warnLog("Glossary Parse Error:", parseErr);
            throw new Error("Failed to parse Glossary JSON. The AI response was not valid.");
        }
        }
      } else if (type === 'simplified') {
        let complexityGuide = "";
        if (effectiveGrade === 'Kindergarten') {
            complexityGuide = `
            CRITICAL: WRITE FOR AN EMERGENT READER (Age 5-6).
            - Use extremely simple, repetitive sentence structures (e.g., "The sun is hot. The sun is big.").
            - Maximum 5-7 words per sentence.
            - Use ONLY basic high-frequency sight words (Dolch Pre-Primer/Primer list).
            - No abstract concepts. Concrete nouns and verbs only.
            - Avoid pronouns where possible; repeat the noun for clarity.
            - Break content into a list of simple statements.
            - COMPLEX TOPIC HANDLING: If the topic is complex, break it down into single-step, concrete actions. Use "Subject-Verb" patterns only.
            `;
        } else if (effectiveGrade === '1st Grade') {
             complexityGuide = `
            CRITICAL: WRITE FOR AN EARLY READER (Age 6-7).
            - Short, simple sentences. Strictly avoid compound sentences (avoid connecting clauses with "and", "but", "because").
            - Maximum 8-10 words per sentence.
            - Focus on decoding simple words.
            - One single idea per sentence.
            - COMPLEX TOPIC HANDLING: Reduce complex ideas to their most basic cause-and-effect relationship using simple words. Break long ideas into two sentences.
            `;
        } else if (['2nd Grade', '3rd Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            SIMPLIFY FOR EARLY FLUENCY:
            - Use standard subject-verb-object sentence structure.
            - Avoid complex academic vocabulary unless defined immediately.
            - Keep paragraphs short (2-3 sentences).
            - Target a complexity slightly lower than standard ${effectiveGrade} to ensure accessibility.
            - COMPLEX TOPIC HANDLING: Use short sentences. Break compound sentences into two separate sentences. Use analogies for abstract ideas. Avoid passive voice completely.
            `;
        } else if (['4th Grade', '5th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            UPPER ELEMENTARY ADJUSTMENT:
            - Use clear, direct language.
            - Sentences can be slightly longer but avoid dense syntax.
            - Introduce academic vocabulary with context clues.
            - COMPLEX TOPIC HANDLING: Focus on clarity. Avoid passive voice. Break down multi-step processes into distinct sentences. Prioritize readability over stylistic flair.
            `;
        } else if (['6th Grade', '7th Grade', '8th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            MIDDLE SCHOOL ADAPTATION (TRANSITION TO ACADEMIC TEXT):
            - Bridge conversational and academic language.
            - Use a mix of simple, compound, and complex sentences, but favor clarity for complex topics.
            - Introduce domain-specific vocabulary with clear context clues.
            - Focus on explanatory depth while maintaining clarity.
            - COMPLEX TOPIC HANDLING: Ensure syntax remains straightforward even when discussing advanced concepts. Avoid convoluted sentence structures or nested clauses.
            `;
        } else if (['9th Grade', '10th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            HIGH SCHOOL FOUNDATION (STANDARD RIGOR):
            - Use standard high school sentence variety and paragraph structure.
            - Include abstract concepts and analytical language.
            - Vocabulary should be precise and grade-appropriate (Tier 2 and Tier 3 words).
            - Tone should be formal but accessible.
            `;
        } else if (['11th Grade', '12th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            COLLEGE PREP / ADVANCED HIGH SCHOOL:
            - Sophisticated syntax and nuanced argumentation.
            - Use rhetorical devices and high-level academic vocabulary without simplification.
            - Assume ability to handle dense text and abstract reasoning.
            - Focus on synthesis of ideas.
            `;
        } else if (['College', 'Graduate Level'].includes(effectiveGrade)) {
             complexityGuide = `
            PROFESSIONAL / ACADEMIC DISCOURSE:
            - Expert-level density and precision.
            - Use professional terminology freely.
            - Complex sentence structures including extensive subordination.
            - Target an educated, adult audience.
            `;
        }
        // ── Measurable grade calibration (C1, 2026-08-16) ────────────────────
        // The guides above are qualitative for every band except Kindergarten and
        // 1st Grade, which are the only two that carry a hard number. Everything
        // from 2nd Grade up said things like "sentences can be slightly longer",
        // which a model can satisfy while landing two grades high. That is the
        // reported symptom: a 5th Grade request coming back around 7th.
        //
        // The source generator (content_engine_source.jsx) already compensates for
        // the same overshoot with an explicit ladder. The adaptation path had no
        // equivalent, so this is the counterpart, expressed as the two inputs the
        // app can actually measure afterwards: average sentence length and average
        // syllables per word, the two terms of the Flesch-Kincaid grade formula
        // AlloFlow computes in calculateReadability(). Stating the target in the
        // same terms as the check means the instruction and the measurement agree.
        //
        // No regeneration loop: this shapes the single generation, it does not
        // retry it.
        const _gradeCalibration = {
            'Kindergarten':   { asl: 6,  asw: 1.15, fk: '0 to 1' },
            '1st Grade':      { asl: 8,  asw: 1.20, fk: '1 to 2' },
            '2nd Grade':      { asl: 10, asw: 1.25, fk: '2 to 3' },
            '3rd Grade':      { asl: 12, asw: 1.30, fk: '3 to 4' },
            '4th Grade':      { asl: 14, asw: 1.35, fk: '4 to 5' },
            '5th Grade':      { asl: 15, asw: 1.40, fk: '5 to 6' },
            '6th Grade':      { asl: 16, asw: 1.45, fk: '6 to 7' },
            '7th Grade':      { asl: 17, asw: 1.50, fk: '7 to 8' },
            '8th Grade':      { asl: 18, asw: 1.55, fk: '8 to 9' },
            '9th Grade':      { asl: 19, asw: 1.60, fk: '9 to 10' },
            '10th Grade':     { asl: 20, asw: 1.62, fk: '10 to 11' },
            '11th Grade':     { asl: 21, asw: 1.65, fk: '11 to 12' },
            '12th Grade':     { asl: 22, asw: 1.68, fk: '11 to 13' },
        }[effectiveGrade];
        if (_gradeCalibration) {
            complexityGuide += `
            MEASURABLE TARGETS FOR ${effectiveGrade} (these are checked after generation):
            - Average sentence length: at most ${_gradeCalibration.asl} words. Individual sentences may vary, but the average across the whole passage must not exceed this.
            - Average syllables per word: at most ${_gradeCalibration.asw}. Prefer the shorter of two words that mean the same thing.
            - Flesch-Kincaid grade level of the finished passage: ${_gradeCalibration.fk}.
            - Every Tier 3 term you keep must be defined in the same sentence it first appears, in plain words.
            - CALIBRATION: writing to a grade label alone reliably lands one to two grades above it. Write to the numbers above, not to the label, and when a sentence is borderline, split it.
            `;
        }
        let targetWords = countWords(textToProcess);
        let lengthInstruction = "";
        const percentageMatch = leveledTextLength.match(/\((\d+)%\)/);
        if (leveledTextLength === 'Same as Source') {
            lengthInstruction = `TARGET LENGTH: Maintain approximately the same length as the source text (~${targetWords} words). Do not significantly shorten or expand unless necessary for the target grade level.`;
        } else if (percentageMatch) {
             const percentage = parseInt(percentageMatch[1], 10);
             const multiplier = percentage / 100;
             targetWords = Math.max(50, Math.round(targetWords * multiplier));
             let action = "Modify";
             if (percentage < 100) action = "Condense";
             else if (percentage > 100) action = "Expand";
             lengthInstruction = `TARGET LENGTH: ${action} the text to approximately ${targetWords} words (${percentage}% of original).`;
        } else if (leveledTextLength.includes('words')) {
             const match = leveledTextLength.match(/\d+/);
             if (match) {
                 targetWords = parseInt(match[0], 10);
                 lengthInstruction = `TARGET LENGTH: Write approximately ${targetWords} words.`;
             }
        }
        let formatInstruction = "";
        const outputLangInstruction = effectiveLanguage !== 'English' ? `Write the content primarily in ${effectiveLanguage}.` : "";
        if (textFormat === 'Dialogue Script') {
            formatInstruction = `
            FORMAT: DIALOGUE SCRIPT (Reader's Theater)
            - Create a cast of characters relevant to the topic (e.g., "Professor Proton", "Student A", or historical figures).
            - ${outputLangInstruction}
            - Use clear character labels (e.g. "**Character Name:** ...").
            - Include stage directions in italics or parentheses.
            - Ensure the educational content is explained through the natural conversation.
            ${_xlate.enabled ? `- CRITICAL FOR TRANSLATION: In the ${glossLang} translation section, do NOT include the ${effectiveLanguage} terms in parentheses. Keep the ${glossLang} text fully ${glossLang}.` : ''}
            `;
        } else if (textFormat === 'Mock Advertisement') {
            formatInstruction = `
            FORMAT: MOCK ADVERTISEMENT / BROCHURE
            - Transform the educational content into a persuasive advertisement, brochure, or commercial script.
            - ${outputLangInstruction}
            - Use catchy headlines, slogans, and enthusiastic language.
            - Present key facts as "product features" or "benefits".
            - Include a "Call to Action" related to the topic.
            - Maintain accuracy while using a promotional tone.
            `;
        } else if (textFormat === 'News Report') {
            formatInstruction = `
            FORMAT: BREAKING NEWS REPORT
            - Write the content as a newspaper article or TV news transcript.
            - ${outputLangInstruction}
            - Use a journalistic tone (Who, What, Where, When, Why).
            - Include a catchy headline and a dateline.
            - Include "quotes" from relevant figures (experts, historical figures, or witnesses).
            - Structure with the most important facts first (inverted pyramid).
            `;
        } else if (textFormat === 'Podcast Script') {
            formatInstruction = `
            FORMAT: PODCAST SCRIPT
            - Write a script for two hosts: "Alex" (Male, enthusiastic) and "Sam" (Female, thoughtful/analytical).
            - ${outputLangInstruction}
            - Use a conversational, energetic, and engaging tone.
            - Include [Sound Effect] cues where appropriate (e.g., *[Upbeat intro music fades]*).
            - Have the hosts ask each other questions to break down complex ideas naturally.
            - Include an Intro (with a catchy podcast name) and an Outro.
            `;
        } else if (textFormat === 'Social Media Thread') {
            const slangInstruction = effectiveLanguage === 'English'
                ? '- TONE: Use contemporary English slang and lingo (e.g., "straight up fire", "no cap", "weak sauce", "GOAT", "lowkey") to make it relatable and engaging.'
                : `- TONE: Use contemporary slang and lingo appropriate for ${effectiveLanguage} speaking youth culture. Do NOT use English slang unless it is commonly used loan-words in that language.`;
            formatInstruction = `
            FORMAT: SOCIAL MEDIA THREAD
            - Break the content into a series of 6-10 short, punchy posts (like a Twitter/X thread).
            - ${outputLangInstruction}
            - Number each post (e.g., 1/8, 2/8).
            - Use emojis liberally to structure the visual flow.
            - Use hashtags relevant to the topic.
            - Focus on hooks ("Did you know?") and key takeaways.
            ${slangInstruction}
            - LANGUAGE CONSISTENCY: If you include parenthetical explanations for slang terms, ensure they match the language of the current section.
              - In the ${effectiveLanguage} section: Explanations must be in ${effectiveLanguage}.
              - In the English Translation section: Explanations must be in English.
              - Do NOT cross-contaminate languages in parenthetical glosses.
            `;
        } else if (textFormat === 'Poetry') {
            formatInstruction = `
            FORMAT: POETRY / VERSE
            - Rewrite the educational content as a poem (e.g., Rhyming Couplets, Free Verse, or Ballad).
            - ${outputLangInstruction}
            - Ensure the rhyme and rhythm help with memorization of key facts.
            - Use sensory details and imagery while maintaining factual accuracy.
            - Structure: Clear stanzas.
            `;
        } else if (textFormat === 'Narrative Story') {
            formatInstruction = `
            FORMAT: NARRATIVE STORY / FICTION
            - Transform the educational content into a short story.
            - ${outputLangInstruction}
            - Create characters and a setting relevant to the topic.
            - Weave the facts and concepts naturally into the plot and dialogue.
            - Ensure the story has a clear beginning, middle, and end.
            `;
        }
      const referenceParts = splitAdaptationReferences(textToProcess);
      const textWithoutRefs = referenceParts.body.trim();
      const extractedReferences = referenceParts.references || carriedInputReferences;
      const chunks = chunkText(textWithoutRefs, usesLocalTextBackend ? 3500 : 9000);
      const isMultiChunk = chunks.length > 1;
      if (isMultiChunk) {
            addToast(t('meta.processing_sections', { count: chunks.length }) || `Text is long. Processing ${chunks.length} sections...`, "info");
            setGenerationTaskProgress(0, chunks.length, t('status_steps.adapting_text'));
      }
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const _initialMeta = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''}${isMultiChunk ? ` (${t('meta.multi_part') || 'Multi-part'})` : ''}`;
      metaInfo = _initialMeta;
      const citationAudit = {
          version: ADAPTED_CITATION_AUDIT_VERSION,
          policy: 'exact-marker-sequence-with-protected-tokens',
          enabled: !!keepCitations,
          sourceCitationCount: extractAdaptationCitationLedgerLocal(textWithoutRefs).entries.length,
          hasReferenceTrailer: !!extractedReferences,
          status: 'valid',
          fallbackCount: 0,
          stages: []
      };
      const recordCitationStage = (stage, result, action, attempts = 1) => {
          if (!keepCitations) return;
          citationAudit.stages.push({
              stage,
              valid: !!result?.valid,
              beforeCount: Number(result?.conservation?.beforeCount ?? result?.beforeCount ?? 0),
              afterCount: Number(result?.conservation?.afterCount ?? result?.afterCount ?? 0),
              action,
              attempts
          });
          if (!result?.valid) {
              citationAudit.status = 'fallback-used';
              citationAudit.fallbackCount++;
          }
      };
      const citationAuditSnapshot = () => ({
          ...citationAudit,
          stages: citationAudit.stages.map(stage => ({ ...stage }))
      });
      // Provenance. Records what actually shaped THIS artifact so a generation can
      // be reconstructed after the fact — which matters when artifacts are compared
      // across conditions rather than just handed to a class.
      //
      // Two rules, both learned the hard way:
      //   1. Record the RESOLVED value the branch used, never the global UI state.
      //      An earlier version stamped `standards`/`interests` unconditionally, so
      //      artifacts claimed settings their prompt never received.
      //   2. Record the backend. The same settings produce materially different
      //      prompts on the local vs cloud path (several branches ship twin prompts),
      //      so "which model built this" is part of the configuration, not metadata.
      const _itemConfig = _buildItemConfig({ citationAudit: citationAuditSnapshot() });
      const tempItem = {
          id: newId,
          type,
          data: "",
          meta: metaInfo,
          title: type === 'simplified' ? `Adapted Text (${effectiveGrade})` : getDefaultTitle(type),
          timestamp: new Date(),
          config: _itemConfig
      };
      setHistory(prev => [...prev, tempItem]);
      if (switchView || !generatedContent) {
          setGeneratedContent(tempItem);
          setActiveView('simplified');
      }
      let fullTargetText = "";
      let fullEnglishText = "";
      let finalAdaptedItem = tempItem;
      let bilingualTranslationValid = true;
      let citationWarningShown = false;
      const cleanModelText = (value) => String(value || "")
          .replace(/^```[a-zA-Z]*\n/i, '')
          .replace(/^```\s*/, '')
          .replace(/```\s*$/, '')
          .trim();
      const warnCitationFallback = (stage) => {
          warnLog(`[CitationConservation] ${stage} changed or removed a citation; retained the last verified text instead.`);
          if (!citationWarningShown) {
              citationWarningShown = true;
              addToast('A rewrite changed a source citation, so AlloFlow kept the last citation-safe text.', 'warning');
          }
      };
      const runCitationGuardedTransform = async (sourceText, transform, stage, fallbackText = sourceText) => {
          const original = String(sourceText || '');
          const envelope = keepCitations
              ? protectAdaptationCitations(original)
              : { text: original, citations: [], original };
          const maxAttempts = keepCitations ? 2 : 1;
          let finalCheck = null;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              const raw = await transform(envelope.text, attempt > 1);
              const cleaned = cleanModelText(raw);
              if (!keepCitations) {
                  return { text: cleaned, valid: true, attempts: attempt };
              }
              const restored = restoreProtectedAdaptationCitations(envelope, cleaned);
              finalCheck = restored;
              if (restored.valid) {
                  recordCitationStage(stage, restored, 'accepted', attempt);
                  return { text: restored.text, valid: true, attempts: attempt };
              }
          }
          recordCitationStage(stage, finalCheck || {
              valid: false,
              conservation: validateAdaptationCitationConservation(original, '')
          }, 'pre-transform-fallback', maxAttempts);
          warnCitationFallback(stage);
          return { text: String(fallbackText || original), valid: false, attempts: maxAttempts };
      };
      const translateCitationSafe = async (sourceText, stage) => {
          return runCitationGuardedTransform(sourceText, async (protectedText, isRetry) => callGemini(`
              Translate the following ${effectiveLanguage} text into ${glossLang}.
              Maintain the formatting, tone, emojis, and every protected citation token exactly.
              Each token matching ⟦ALLOFLOW_CITATION_####⟧ must appear exactly once.
              Do not add, remove, duplicate, reorder, translate, or alter a citation token.
              Return ONLY the ${glossLang} translation.
              ${isRetry ? 'RETRY: The prior response failed citation validation. Copy every protected token exactly once.' : ''}
              Text to Translate:
              "${protectedText}"
          `), stage, sourceText);
      };
      for (let i = 0; i < chunks.length; i++) {
          const isLast = i === chunks.length - 1;
          if (isMultiChunk) {
              setGenerationStep(`Adapting section ${i + 1} of ${chunks.length}...`);
              setGenerationTaskProgress(i + 1, chunks.length, `Adapting section ${i + 1} of ${chunks.length}...`);
          } else {
              setGenerationStep(t('status_steps.adapting_text'));
              if (usesLocalTextBackend) {
                  setGenerationTaskProgress(0, 1, t('status_steps.adapting_text'));
              }
          }
          const chunkIntro = isMultiChunk
              ? `Rewrite the following PART ${i+1} of ${chunks.length} of a text for ${effectiveGrade} level in ${effectiveLanguage}.`
              : `Rewrite the following text for ${effectiveGrade} level in ${effectiveLanguage}.`;
          const targetTransform = await runCitationGuardedTransform(chunks[i], async (protectedSegment, isRetry) => callGemini(`
              ${chunkIntro}
              ${complexityGuide}
              ${lengthInstruction}
              ${formatInstruction}
              ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
              ${useEmojis ? '- Use emojis liberally throughout the text to provide visual cues and engagement (e.g., "The sun ☀️ is a star ⭐").' : '- Do not use emojis.'}
              ${keepCitations
                  ? '- CITATION PRESERVATION (CRITICAL): Citations are protected as tokens matching ⟦ALLOFLOW_CITATION_####⟧. Copy every token exactly once. Do not add, remove, duplicate, reorder, translate, or alter a token. The app restores the links after validation.'
                  : '- Remove all hyperlinks and citations.'}
              - DO NOT emit any "Sources", "References", "Bibliography", "Verified Sources", "Références", "Sources du texte", "Referencias", "Quellen", or equivalent section. The references list is appended automatically by the app — any references section you produce will be discarded and may cause duplicates.
              ${includeCharts ? `- DATA VISUALIZATION: Analyze the text for structured data.
              1. If quantitative comparisons exist, insert a Chart on its own line (NO line breaks inside brackets):
                 [[CHART: { "type": "bar", "title": "Title", "data": [{"label": "A", "value": 10}, {"label": "B", "value": 20}] }]]
              2. If a single percentage is highlighted, use a Donut Chart:
                 [[CHART: { "type": "donut", "title": "Title", "percentage": 75, "label": "75%" }]]
              3. If qualitative data exists, use a Markdown Table.
              4. You may include both if appropriate.` : ''}
              ${studentInterests.length > 0 ? `- CRITICAL: Explain key concepts using analogies and examples related to: "${studentInterests.join(', ')}" to increase engagement and relevance.` : ''}
              ${standardsPromptString ? `- CRITICAL: Align the text complexity and skill focus to meet Target Standards: "${standardsPromptString}".` : ''}
              ${dokLevel ? `- Target Webb's Depth of Knowledge (DOK): ${dokLevel}` : ''}
              ${dialectInstruction}
              ${differentiationContext}
              ${isRetry ? 'RETRY: The prior response failed citation validation. Copy every protected token exactly once.' : ''}
              CRITICAL: Return ONLY the ${effectiveLanguage} text.${_xlate.enabled ? ` Do NOT provide a ${glossLang} translation yet.` : ' Do NOT add a translation into any other language.'}
              Text Segment: "${protectedSegment}"
          `), `adapt-section-${i + 1}`, chunks[i]);
          let targetResult = targetTransform.text;
          if (!isMultiChunk && usesLocalTextBackend) {
              setGenerationTaskProgress(1, 1, t('status_steps.adapting_text'));
          }
          fullTargetText += targetResult + "\n\n";
          // Translations off means the second LLM round trip per chunk is not
          // spent at all, not merely discarded. On a five-chunk adaptation that
          // is five fewer calls.
          if (_xlate.enabled) {
              if (isMultiChunk) setGenerationStep(`Translating section ${i + 1} of ${chunks.length}...`);
              else setGenerationStep(t('status_steps.translating') || 'Translating...');
              const translation = await translateCitationSafe(targetResult, `translate-section-${i + 1}`);
              if (translation.valid && bilingualTranslationValid) {
                  fullEnglishText += translation.text + "\n\n";
              } else {
                  bilingualTranslationValid = false;
                  fullEnglishText = "";
              }
          } else {
              fullEnglishText += targetResult + "\n\n";
          }
          let currentTargetDisplay = fullTargetText.trim();
          let currentEnglishDisplay = fullEnglishText.trim();
          if (keepCitations) {
              currentTargetDisplay = sanitizeTruncatedCitations(currentTargetDisplay);
              currentTargetDisplay = normalizeCitationPlacement(currentTargetDisplay);
              if (_xlate.enabled) {
                  currentEnglishDisplay = sanitizeTruncatedCitations(currentEnglishDisplay);
                  currentEnglishDisplay = normalizeCitationPlacement(currentEnglishDisplay);
              }
          }
          // Structural Markdown repair AFTER citation repair, BEFORE every
          // state write (2026-07-17): the model sometimes glues "## Heading"
          // onto the previous paragraph ("...(url)## Why the Brain Dreams")
          // and the renderer then correctly shows a literal "##". Applies on
          // every streamed chunk update, citations kept or not. Identity
          // fallback tolerates a stale helpers module during CDN skew.
          const _mdBounds = (window.AlloModules && window.AlloModules.TextPipelineHelpers
              && window.AlloModules.TextPipelineHelpers.normalizeMarkdownBlockBoundaries) || ((s) => s);
          currentTargetDisplay = _mdBounds(currentTargetDisplay);
          currentEnglishDisplay = _mdBounds(currentEnglishDisplay);
          const currentTotal = composeAdaptedLeveledText(
              currentTargetDisplay,
              currentEnglishDisplay,
              isLast && keepCitations ? extractedReferences : '',
              _xlate.enabled && bilingualTranslationValid
          );
          const updatedItem = {
              ...tempItem,
              data: currentTotal,
              config: { ..._itemConfig, citationAudit: citationAuditSnapshot() }
          };
          finalAdaptedItem = updatedItem;
          if (switchView || (generatedContent && generatedContent.id === newId)) {
              setGeneratedContent(updatedItem);
          }
          setHistory(prev => prev.map(item => item.id === newId ? updatedItem : item));
          if (!isLast) await new Promise(r => setTimeout(r, 800));
      }
      if (!isMultiChunk) {
          const trimmedTarget = fullTargetText.trim();
          const wc = countWords(trimmedTarget);
          const minWords = targetWords * LENGTH_THRESHOLDS.MIN_VARIANCE;
          const maxWords = targetWords * LENGTH_THRESHOLDS.MAX_VARIANCE;
          let repaired = null;
          const repairCtx = `Grade: ${effectiveGrade}, Topic: ${sourceTopic || "General"}, Format: ${textFormat}`;
          let repairIssue = null;
          if (wc < minWords) {
              setGenerationStep(t('status.text_expanding'));
              repairIssue = 'too_short';
          } else if (wc > maxWords) {
              setGenerationStep(t('status.text_condensing') || 'Condensing text...');
              repairIssue = 'too_long';
          }
          if (repairIssue) {
              const guardedRepair = await runCitationGuardedTransform(
                  trimmedTarget,
                  (protectedText, isRetry) => repairGeneratedText(
                      protectedText,
                      repairIssue,
                      targetWords,
                      `${repairCtx}. Protected citation tokens matching ⟦ALLOFLOW_CITATION_####⟧ must each remain exactly once.${isRetry ? ' This is a retry after citation validation failed.' : ''}`,
                      false
                  ),
                  `length-repair-${repairIssue}`,
                  trimmedTarget
              );
              if (guardedRepair.valid && guardedRepair.text.trim() !== trimmedTarget) {
                  repaired = guardedRepair.text.trim();
              }
          }
          // Declared OUTSIDE both blocks: the second `if (repaired)` below both
          // reads and reassigns it. It was `let`-scoped to the first block, so
          // every non-English refine threw ReferenceError at the citation
          // sanitize step. The two blocks stay separate because the first one
          // can set `repaired = null` to bail out of the second.
          let repairedEnglish = '';
          if (repaired) {
              if (_xlate.enabled) {
                  setGenerationStep(t('status_steps.translating') || 'Translating refined text...');
                  const repairedTranslation = await translateCitationSafe(repaired, 'length-repair-translation');
                  if (repairedTranslation.valid) {
                      repairedEnglish = repairedTranslation.text;
                  } else {
                      // Keep the previously validated target/English pair. Never
                      // combine a repaired target with a stale English translation.
                      repaired = null;
                  }
              }
          }
          if (repaired) {
              fullTargetText = repaired;
              let repairedTarget = repaired.trim();
              if (keepCitations) {
                  repairedTarget = sanitizeTruncatedCitations(repairedTarget);
                  repairedTarget = normalizeCitationPlacement(repairedTarget);
                  if (_xlate.enabled) {
                      repairedEnglish = sanitizeTruncatedCitations(repairedEnglish);
                      repairedEnglish = normalizeCitationPlacement(repairedEnglish);
                  }
              }
              // Same structural Markdown repair as the streamed path above.
              const _mdBoundsRepair = (window.AlloModules && window.AlloModules.TextPipelineHelpers
                  && window.AlloModules.TextPipelineHelpers.normalizeMarkdownBlockBoundaries) || ((s) => s);
              repairedTarget = _mdBoundsRepair(repairedTarget);
              repairedEnglish = _mdBoundsRepair(repairedEnglish);
              const repairedTotal = composeAdaptedLeveledText(
                  repairedTarget,
                  repairedEnglish,
                  keepCitations ? extractedReferences : '',
                  _xlate.enabled
              );
              metaInfo = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''} (Refined)`;
              const refinedItem = {
                  ...tempItem,
                  data: repairedTotal,
                  meta: metaInfo,
                  config: { ..._itemConfig, citationAudit: citationAuditSnapshot() }
              };
              finalAdaptedItem = refinedItem;
              if (switchView || (generatedContent && generatedContent.id === newId)) {
                  setGeneratedContent(refinedItem);
              }
              setHistory(prev => prev.map(item => item.id === newId ? refinedItem : item));
          }
      }
      // ── Measured level, reported rather than discarded (C1, 2026-08-16) ──
      // calculateReadability already ran on the ANALYSIS resource and its result
      // was rendered there, but the adapted text (the one place the target grade
      // is the whole point) never computed it at all. The teacher only found out
      // where the passage actually landed by clicking Check Level, which costs two
      // model calls. This measures it locally, for free, and hands it to the view.
      //
      // English only, deliberately. Flesch-Kincaid is defined on English syllable
      // and sentence statistics; running it over Spanish or Vietnamese would return
      // a number that looks authoritative and means nothing. When the adaptation is
      // not in English, no measurement is claimed.
      if (effectiveLanguage === 'English') {
          const _measured = calculateReadability(fullTargetText);
          if (_measured) {
              finalAdaptedItem = {
                  ...finalAdaptedItem,
                  localStats: _measured,
                  targetGradeLevel: effectiveGrade
              };
              if (switchView || (generatedContent && generatedContent.id === newId)) {
                  setGeneratedContent(finalAdaptedItem);
              }
              setHistory(prev => prev.map(item => item.id === newId ? finalAdaptedItem : item));
          }
      }
      addToast(`${getDefaultTitle(type)} generated!`, "success");
      if (switchView) flyToElement('ui-tool-simplified');
      return finalAdaptedItem;
      } else if (type === 'outline') {
        let promptInstructions = "";
        let structureHint = "";
        switch(effectiveOutlineType) {
            case 'Structured Outline':
                promptInstructions = "Create a hierarchical outline with main topics and sub-points.";
                break;
            case 'Flow Chart':
                promptInstructions = "Create a step-by-step process flow. Every branch must include a 'connections' array of edge objects with a valid 0-based 'target' index and an optional short 'label'. Use labels for meaningful route conditions such as Yes, No, Approved, or Needs revision. A step must not connect to itself. For a simple linear flow, connect each step to the next with an empty label. Example with a labeled fork and merge: [{'title':'Check condition','items':['Evaluate X'],'connections':[{'target':1,'label':'Yes'},{'target':2,'label':'No'}]}, {'title':'Path A','items':['Do A'],'connections':[{'target':3,'label':''}]}, {'title':'Path B','items':['Do B'],'connections':[{'target':3,'label':''}]}, {'title':'Final step','items':['Done'],'connections':[]}]. Aim for 5-8 steps total.";
                break;
            case 'Key Concept Map':
                promptInstructions = "Identify the central concept and branch out into key related attributes or sub-concepts. CRITICAL: Keep all labels extremely concise (max 4-5 words) to fit inside visual nodes.";
                break;
            case 'Venn Diagram':
                promptInstructions = "Identify two distinct contrasting categories (Set A, Set B) from the text and their shared commonalities (Shared).";
                structureHint = "CRITICAL FOR VENN DIAGRAM: You MUST return exactly 3 branches in this order: 1. The first distinct category (Set A). 2. The second distinct category (Set B). 3. The shared/overlapping traits (Title: 'Shared').";
                break;
            case 'T-Chart':
                promptInstructions = "Identify two contrasting categories from the text that students must sort items into (e.g. Renewable vs Non-Renewable, Mammals vs Reptiles, Igneous vs Sedimentary, Prokaryotes vs Eukaryotes). Generate 6-12 canonical, unambiguous items balanced ~50/50 between the two columns. Items should be 1-3 words each.";
                structureHint = "CRITICAL FOR T-CHART: You MUST return exactly 2 branches. Branch 1 title = left column header (2-3 words). Branch 2 title = right column header (2-3 words). Each branch's 'items' array contains the entries that belong in that column. Avoid edge cases — every item should clearly belong to exactly one column.";
                break;
            case 'Fishbone':
                promptInstructions = "Identify a central problem or effect from the text, then organize its CAUSES into 4-6 named CATEGORIES (the 'bones' of the fishbone diagram). Use domain-appropriate categories: for engineering/quality use the classic '6Ms' (People, Methods, Machines, Materials, Measurements, Environment) or a subset; for biology/ecology use categories like Genetic, Environmental, Behavioral, Physiological; for history use Political, Economic, Social, Cultural; for science use Causes, Conditions, Reactions, Outcomes. Pick categories that fit the topic. Within each category, list 2-4 specific causes (1-4 words each). The 'main' field is the central effect/problem being analyzed.";
                structureHint = "CRITICAL FOR FISHBONE: Return 4-6 branches. Each branch represents one CATEGORY of causes (a 'bone'). Branch.title = category name (1-3 words, e.g. 'Equipment', 'Methods'). Branch.items = specific causes within that category (2-4 items per branch). The main field describes the overall effect/problem being analyzed. Avoid generic categories — pick ones that fit the specific topic.";
                break;
            case 'Cause and Effect':
                promptInstructions = "Identify the central event/phenomenon. List its antecedent 'Causes' (factors leading to it) and subsequent 'Effects' (consequences resulting from it). If a sequential chain reaction exists, list it.";
                structureHint = "CRITICAL: Return branches in this order: Causes, Effects, then optional Chain. Every branch MUST include a stable semantic role independent of display language: role='cause', role='effect', or role='chain'. Example: [{ 'role': 'cause', 'title': 'Causes', 'items': ['Cause 1', 'Cause 2'] }, { 'role': 'effect', 'title': 'Effects', 'items': ['Effect 1'] }]";
                break;
            case 'Problem Solution':
                promptInstructions = "Identify the core problem discussed and list the solutions or steps taken to resolve it.";
                break;
            case 'Frayer Model':
                promptInstructions = "Create a Frayer Model for a single key vocabulary term from the source text. The 'main' field is the vocabulary term itself. Return exactly 4 branches in this order: 1. 'Definition' (a single student-friendly definition as the only item, 1 short sentence), 2. 'Characteristics' (3-5 key features or attributes of the term), 3. 'Examples' (3-5 concrete examples drawn from the text or its domain), 4. 'Non-Examples' (3-5 things that are NOT examples, ideally with a brief reason why each is excluded).";
                structureHint = "CRITICAL FOR FRAYER MODEL: Return exactly 4 branches with titles Definition / Characteristics / Examples / Non-Examples in that order. 'Definition' branch should have exactly one item.";
                break;
            case 'KWL Chart':
                promptInstructions = "Create a KWL Chart anchored to the topic of the source text. The 'main' field is the topic. Return exactly 3 branches: 1. 'Know' (4-6 prior knowledge items students at the target grade are likely to bring), 2. 'Want to Know' (4-6 anticipated student questions about the topic), 3. 'Learned' (return an empty items array OR 1-2 placeholder items like '___' since students fill this in after the lesson).";
                structureHint = "CRITICAL FOR KWL CHART: Return exactly 3 branches with titles Know / Want to Know / Learned in that order. The Learned column should be sparse (empty array or placeholder) because students complete it after the lesson.";
                break;
            case 'Claim-Evidence-Reasoning':
                promptInstructions = "Create a Claim-Evidence-Reasoning template anchored to a key scientific question or phenomenon from the source text. The 'main' field is the central question or phenomenon. Return exactly 3 branches: 1. 'Claim' (a single declarative answer to the question, as the only item), 2. 'Evidence' (3-5 specific pieces of data, observations, or quotations from the source that support the claim), 3. 'Reasoning' (2-4 statements connecting the evidence to the claim via scientific principles or logical inference).";
                structureHint = "CRITICAL FOR CER: Return exactly 3 branches with titles Claim / Evidence / Reasoning in that order. 'Claim' should be a single declarative item. Evidence items should be specific (quotation marks for direct quotes, or specific data points), not generic.";
                break;
            case 'Story Map':
                promptInstructions = "Create a Story Map (plot diagram) for the source narrative text. The 'main' field is the story title or central narrative summary. Return exactly 5 branches in narrative order: 1. 'Exposition' (setting, main characters, initial situation), 2. 'Rising Action' (3-4 key events that build tension), 3. 'Climax' (the turning point or moment of highest tension, typically a single item), 4. 'Falling Action' (events that follow the climax and lead toward resolution), 5. 'Resolution' (how the story concludes and any final state).";
                structureHint = "CRITICAL FOR STORY MAP: Return exactly 5 branches with titles Exposition / Rising Action / Climax / Falling Action / Resolution in that order. If the source text is non-narrative, return a single branch noting this is not applicable.";
                break;
            case 'Memory Palace':
                promptInstructions = "Create a Memory Palace (method of loci) for the key facts in this text. TARGET SIZE: about 16 loci in total — 4 ROOMS of 4 items is the ideal shape. A palace that size can actually be walked from memory; much larger and it stops being memorable, which defeats the technique. Use 3-5 ROOMS (branches) that group the material into meaningful clusters, 3-5 items each. Go under 16 only if the text genuinely cannot support it, and never pad with weak or duplicated facts to reach the number. Each branch.title = a short room name (1-3 words). Each branch's items = the facts or concepts to memorize (max 6 words each, listed in the order they should be memorized). ALSO include on each branch a parallel array 'mnemonics' with EXACTLY one entry per item: a vivid, concrete, slightly surreal mental-image description (max 20 words) that visually encodes BOTH the item and its meaning — bizarre, exaggerated, sensory images are remembered best. Keep every mnemonic school-appropriate and non-violent.";
                structureHint = "CRITICAL FOR MEMORY PALACE: Return 2-5 branches (rooms). Each branch MUST have: title (room name, 1-3 words), items (facts in memorization order), and mnemonics (array exactly parallel to items — one vivid, school-appropriate image description per item, max ~20 words). Example branch: {\"title\": \"Sky Room\", \"items\": [\"Evaporation\"], \"mnemonics\": [\"A kettle the size of a house boiling a whole lake into golden steam\"]}.";
                break;
            case '3D Concept Space':
                promptInstructions = "Identify 3-6 thematic STRANDS (dimensions, themes, or sub-domains) that organize this topic, and the key concepts within each strand. Each branch is one strand; each branch's items are the concepts inside that strand. This organizer renders as a 3D space where each strand becomes a depth plane, so strands must be genuinely distinct lenses on the topic (e.g. for ecosystems: Producers, Consumers, Decomposers, Abiotic Factors; for a historical period: Political, Economic, Social, Technological). CRITICAL: keep every label extremely concise (strand titles 1-3 words, concept items max 4-5 words). If concepts in different strands are causally or sequentially related, use 'connectsTo' (0-based branch indices) to link the strands.";
                structureHint = "CRITICAL FOR 3D CONCEPT SPACE: Return 3-6 branches, each representing one distinct thematic STRAND (branch.title = strand name, 1-3 words). Each branch's items array contains 3-6 key concepts within that strand (max 4-5 words each). Strands become depth planes in a 3D view, so avoid overlapping or catch-all strands.";
                break;
            case 'See-Think-Wonder':
                promptInstructions = "Create a See-Think-Wonder routine (Harvard Project Zero Visible Thinking) for the source artifact (text, image, phenomenon, or concept). The 'main' field describes what the student is observing. Return exactly 3 branches: 1. 'See' (3-5 concrete, observable details students might notice, no inferences), 2. 'Think' (3-5 inferences or interpretations grounded explicitly in the observations from See), 3. 'Wonder' (3-5 open-ended questions the observation provokes). Maintain strict separation between observation (See), interpretation (Think), and questioning (Wonder).";
                structureHint = "CRITICAL FOR SEE-THINK-WONDER: Return exactly 3 branches with titles See / Think / Wonder in that order. See items must be observations only (what is visible/readable); Think items must be inferences; Wonder items must be open questions phrased as questions.";
                break;
            default:
                promptInstructions = "Create a structured summary.";
        }
        const prompt = `
          Analyze the provided text and create a structured visual representation.
          Type: ${effectiveOutlineType}
          ${promptInstructions}
          ${structureHint}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          Adapt the language to ${effectiveLanguage} and the complexity to ${effectiveGrade}.
          ${interestsDirective}
          ${dokDirective}
          ${standardsPromptString ? `Ensure the structure supports the cognitive requirements of Standards: "${standardsPromptString}".` : ''}
          ${useEmojis ? 'Include a relevant emoji at the start of every "main", "title", and "item" field to serve as a visual anchor.' : 'Do not use emojis.'}
          ${dialectInstruction}
          Return ONLY JSON matching this structure exactly (conceptually map the requested type to this hierarchy):
          { "main": "Central Topic/Goal/Problem", ${_xlate.enabled ? `"main_en": "${glossLang} translation", ` : ''}"branches": [{ ${effectiveOutlineType === 'Cause and Effect' ? '"role": "cause|effect|chain", ' : ''}${['Venn Diagram', 'T-Chart', 'Frayer Model', 'KWL Chart', 'Claim-Evidence-Reasoning', 'Story Map', 'See-Think-Wonder'].includes(effectiveOutlineType) ? '"sectionRole": "stable English machine role", ' : ''}"title": "Category/Step/Solution/Cause", ${_xlate.enabled ? `"title_en": "${glossLang} translation", ` : ''}"items": ["Detail/Substep/Effect"], ${_xlate.enabled ? `"items_en": ["${glossLang} translations"], ` : ''}${effectiveOutlineType === 'Flow Chart' ? '"connections": [{ "target": 1, "label": "Yes" }]' : ''} }] }
          Note: Flow Chart "connections" use valid 0-based target indices and optional concise route labels; legacy "connectsTo" arrays are accepted and repaired automatically. Machine roles must remain stable English identifiers even when visible text is translated.
          ${differentiationContext}
          Text: "${usesLocalTextBackend ? localExcerpt(textToProcess, 6500) : textToProcess}"
        `;
        if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.analyzing_structure'));
        const result = await callGemini(prompt, true);
        if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.analyzing_structure'));
        const _normalizeGeneratedOrganizer = (value) => {
            const sharedNormalizer = window.AlloModules?.ViewRenderers?.normalizeVisualOrganizerData;
            if (typeof sharedNormalizer === 'function') return sharedNormalizer(value, effectiveOutlineType);
            const fallback = value && typeof value === 'object' ? { ...value } : {};
            fallback.main = fallback.main || 'Main Topic';
            fallback.branches = Array.isArray(fallback.branches) ? fallback.branches.map((branch, index) => ({
                ...(branch && typeof branch === 'object' ? branch : {}),
                title: branch?.title || ('Step ' + (index + 1)),
                items: Array.isArray(branch?.items) ? branch.items : [],
            })) : [];
            fallback.structureType = effectiveOutlineType;
            return fallback;
        };
        try {
            content = _normalizeGeneratedOrganizer(usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result)));
        } catch (parseErr) {
            warnLog("Outline JSON parse failed. Attempting AI repair...", parseErr);
            const repairPrompt = `
              The following JSON is malformed. Please fix the syntax errors and return ONLY the valid JSON.
              Malformed JSON:
              ${result}
            `;
            try {
                const repairResult = await callGemini(repairPrompt, true);
                content = _normalizeGeneratedOrganizer(JSON.parse(cleanJson(repairResult)));
            } catch (finalErr) {
                warnLog("Outline Repair Failed:", finalErr);
                throw new Error("Failed to parse Visual Organizer data. Please try regenerating.");
            }
        }
        metaInfo = `${effectiveGrade} - ${effectiveLanguage} - ${effectiveOutlineType}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'image') {
        console.log('[VisualDebug] dispatcher routing to image branch; effectiveVisualStyle=', effectiveVisualStyle, 'visualLayoutMode=', typeof visualLayoutMode !== 'undefined' ? visualLayoutMode : '(undefined)');
        setGenerationStep(t('status_steps.analyzing_visuals'));
        const imageSourceText = usesLocalTextBackend ? localExcerpt(textToProcess, 4500) : textToProcess;
        const promptGenPrompt = `
            Analyze the following text to create a visual plan for an educational diagram: "${imageSourceText}".
            ${effCustomInstructions ? `Specific instructions: "${effCustomInstructions}".` : ''}
            Task:
            1. List key visual elements (physical objects, icons, spatial relationships) for the image generator prompt.
            2. Write a concise (1-sentence) Alt Text description for screen readers describing what the final diagram will show (e.g. "A diagram showing the water cycle stages").
            Constraints: ${noText ? "NO TEXT LABELS." : fillInTheBlank ? "NO TEXT LABELS. Include empty white boxes for students to write in." : `Include essential labels only in ${effectiveLanguage}.`}
            ${useEmojis ? 'Emphasize simple, emoji-like iconography.' : ''}
            Return ONLY JSON:
            {
                "visualElements": "comma-separated list of elements...",
                "altText": "Concise description..."
            }
        `;
        if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.analyzing_visuals'));
        const result = await callGemini(promptGenPrompt, true);
        if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.analyzing_visuals'));
        let imagePrompt = "";
        let altText = "Educational diagram.";
        try {
            const parsed = usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result));
            imagePrompt = parsed.visualElements || parsed.elements || result;
            altText = parsed.altText || "Educational diagram.";
        } catch (e) {
            warnLog("Image prompt JSON parse failed, falling back to raw text", e);
            imagePrompt = result;
        }
        let styleDescription = "";
        if (effectiveVisualStyle === 'Default') {
             styleDescription = noText ? "Clean, text-free vector art." : fillInTheBlank ? "Black and white worksheet line art, empty boxes." : "Clean educational vector art, minimal text.";
             if (creativeMode) styleDescription += " Detailed, artistic.";
        } else {
             styleDescription = `${effectiveVisualStyle} style.`;
             if (fillInTheBlank) styleDescription += " Black and white, empty boxes for writing.";
             if (noText) styleDescription += " No text labels, visual only.";
        }
        if (useEmojis) styleDescription += " Style: Flat, colorful, emoji-like icons.";
        const finalPrompt = `Educational diagram: ${imagePrompt}. Style: ${styleDescription}. White background, high contrast, clear lines.`;
        const targetWidth = useLowQualityVisuals ? 300 : 800;
        const targetQual = useLowQualityVisuals ? 0.5 : 0.9;
        let visualPlan = null;
        if (visualLayoutMode !== 'single') {
            try {
                if (visualLayoutMode === 'auto') {
                    visualPlan = await generateVisualPlan(imageSourceText.substring(0, 500), effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions, generationSignal);
                } else {
                    const templateHint = `You MUST use layout: "${visualLayoutMode}".`;
                    const concept = imageSourceText.substring(0, 500);
                    visualPlan = await generateVisualPlan(concept + '\n\n' + templateHint, effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions, generationSignal);
                    if (visualPlan) visualPlan.layout = visualLayoutMode;
                }
            } catch (planErr) {
                console.error('[VisualDebug] generateVisualPlan threw:', planErr);
                warnLog('[ArtDirector] Plan generation failed, falling back to single image', planErr);
            }
        }
        if (visualPlan && visualPlan.layout !== 'single' && visualPlan.panels.length > 1) {
            setGenerationStep(t('visual_director.generating_panels') || 'Generating multi-panel illustration...');
            const executedPlan = await executeVisualPlan(visualPlan, targetWidth, targetQual, effectiveVisualStyle, generationSignal);
            if (!executedPlan?.panels?.some(p => p?.imageUrl)) {
                console.error('[VisualDebug] executeVisualPlan returned all-null panels:', executedPlan);
            }
            content = {
                prompt: finalPrompt,
                style: styleDescription,
                imageUrl: executedPlan.panels[0]?.imageUrl || null,
                altText: altText,
                visualPlan: executedPlan
            };
            metaInfo = t('visual_director.multi_panel', { count: executedPlan.panels.length }) || `Multi-Panel (${executedPlan.panels.length} panels)`;
        } else {
        setGenerationStep(t('status_steps.rendering_diagram'));
        let imageBase64;
        try {
            imageBase64 = await callImagenWithSignal(finalPrompt, targetWidth, targetQual);
        } catch(e) {
            console.error('[VisualDebug] callImagen threw:', e);
            warnLog('Image generation failed:', e);
            if (typeof setError === 'function') setError(`Image generation failed: ${e?.message || e}`);
            return;
        }
        if (!imageBase64) {
            console.error('[VisualDebug] callImagen returned falsy imageBase64; bailing');
            if (typeof setError === 'function') setError('Image generation produced no output');
            return;
        }
        if (fillInTheBlank || noText || creativeMode) {
             try {
                 setGenerationStep(t('status.refining_image'));
                 const rawBase64 = imageBase64.split(',')[1];
                 let refinePrompt = "";
                 if (fillInTheBlank) {
                     refinePrompt = "Edit this educational diagram. Replace ALL text labels, numbers, and words with empty white rectangular boxes. Ensure the boxes are large enough for a student to write in. Keep the leader lines and arrows pointing to the boxes. Maintain the black and white line art style.";
                 } else if (noText) {
                     refinePrompt = "Remove all text, labels, letters, numbers, and words from this image. Keep the visual illustrations and diagram structure perfectly intact. The result should be a clean, text-free visual.";
                 } else if (creativeMode) {
                     refinePrompt = "Enhance this image to make it significantly more eye-catching and visually appealing. Increase contrast, vibrancy, and lighting effects while maintaining the educational clarity of the diagram. Make it look like a high-quality textbook illustration.";
                 }
                 if (refinePrompt) {
                     const refinedImage = await callGeminiImageEditWithSignal(refinePrompt, rawBase64, targetWidth, targetQual);
                     if (refinedImage) {
                         imageBase64 = refinedImage;
                         addToast(t('visuals.actions.enhanced_success'), "success");
                     }
                 }
             } catch (refineErr) {
                 warnLog("Auto-refinement failed:", refineErr);
                 addToast(t('visuals.actions.enhanced_skipped'), "warning");
             }
        }
        content = { prompt: finalPrompt, style: styleDescription, imageUrl: imageBase64, altText: altText };
        if (fillInTheBlank) {
            metaInfo = t('meta.worksheet_mode');
        } else {
            metaInfo = effectiveVisualStyle !== 'Default' ? effectiveVisualStyle : t('meta.visual_diagram');
        }
        }
        if (usesLocalTextBackend && metaInfo && !String(metaInfo).includes(' - Local')) metaInfo += ' - Local';
      } else if (type === 'quiz') {
        setShowQuizAnswers(false);
        // Plan S: Quiz is now mode-aware. Default 'exit-ticket' preserves the
        // existing behavior for any caller that doesn't pass a mode.
        const _quizMode = (configOverride && configOverride.quizMode) || 'exit-ticket';
        const _qmStrategies = (window.AlloModules && window.AlloModules.QuizModeStrategies) || null;
        const _modeStrategy = _qmStrategies ? _qmStrategies.getStrategy(_quizMode) : null;
        const _modeFraming = _modeStrategy ? _modeStrategy.generation.promptFrame : 'Create a short "Exit Ticket" quiz based on this text.';
        const _modeQuestionTargets = _modeStrategy ? _modeStrategy.generation.questionTargets : 'today\'s lesson content';
        // Pre-check + review modes draw on different context: pre-check needs
        // PREREQUISITE concepts (what the source assumes), review pulls from
        // earlier history items rather than today's source.
        let analysisContext = "";
        if (passAnalysisToQuiz || _quizMode === 'pre-check' || _quizMode === 'review') {
             const analysisItem = generationHistory.slice().reverse().find(h => h && h.type === 'analysis');
             if (analysisItem && analysisItem.data) {
                 const { concepts, readingLevel } = analysisItem.data;
                 const levelStr = typeof readingLevel === 'object' ? readingLevel.range : readingLevel;
                 if (_quizMode === 'pre-check') {
                     analysisContext = `\n                 SOURCE ANALYSIS (for prerequisite identification):\n                 - Key Concepts the Lesson Will Teach: ${concepts ? concepts.join(', ') : 'N/A'}\n                 - Lesson Reading Level: ${levelStr}\n                 INSTRUCTION: For EACH key concept above, identify ONE source-specific prerequisite the student should already know to access that concept, then write a probe testing that prerequisite. Probes should test PRIOR knowledge while making the connection to the source concept obvious (e.g., for "photosynthesis" the prerequisite might be "what plants need to grow"). Do not assess full lesson outcomes directly.\n                 `;
                 } else if (_quizMode === 'review') {
                     // Pull historical concepts from prior history items too (multiple analyses)
                     const allAnalyses = generationHistory.filter(h => h && h.type === 'analysis');
                     const allConcepts = allAnalyses.flatMap(h => (h.data && h.data.concepts) || []).filter(Boolean);
                     analysisContext = `\n                 PRIOR LESSON CONCEPTS FOR SPACED RETRIEVAL:\n                 - Earlier Concepts Across History: ${allConcepts.length > 0 ? allConcepts.join(', ') : 'N/A (use today\'s source as fallback)'}\n                 - Today's Concepts: ${concepts ? concepts.join(', ') : 'N/A'}\n                 INSTRUCTION: Probe retention of EARLIER concepts when available. If only today's concepts are available, quiz today's source directly from a spaced-review angle. Do not switch to unrelated review topics.\n                 `;
                 } else {
                     analysisContext = `\n                 PRIORITY CONTEXT FROM SOURCE ANALYSIS:\n                 - Key Concepts Identified: ${concepts ? concepts.join(', ') : 'N/A'}\n                 - Detected Source Level: ${levelStr}\n                 INSTRUCTION: Ensure the quiz questions specifically target these identified concepts to check for understanding.\n                 `;
                 }
             }
        }
        let dokInstruction = "";
        if (dokLevel === "Mixed") {
            dokInstruction = "Structure the questions progressively: Start with simple DOK 1 (Recall) questions, then move to DOK 2 (Skill/Concept), and end with DOK 3 (Strategic Thinking).";
        } else if (dokLevel) {
            dokInstruction = `Target Webb's Depth of Knowledge (DOK): ${dokLevel}`;
        }
        const _modeItemCount = (_modeStrategy && _modeStrategy.generation.defaultItemCount) || effectiveQuizCount;
        const _hasOwnConfig = function (key) {
            return !!(configOverride && Object.prototype.hasOwnProperty.call(configOverride, key));
        };
        const _clampQuizCount = function (value, max) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.floor(parsed))) : 0;
        };
        const _supportedItemTypes = ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'];
        const _sanitizeItemMix = function (mix) {
            const safe = {};
            const source = mix && typeof mix === 'object' ? mix : {};
            _supportedItemTypes.forEach(function (key) {
                const count = _clampQuizCount(source[key], key === 'mcq' ? 20 : 5);
                if (count > 0) safe[key] = count;
            });
            return safe;
        };
        const _hasExplicitItemTypes = _hasOwnConfig('itemTypes') && configOverride.itemTypes && typeof configOverride.itemTypes === 'object';
        const _hasExplicitMcqCount = _hasOwnConfig('quizMcqCount');
        const _explicitMcqCount = _hasExplicitMcqCount ? _clampQuizCount(configOverride.quizMcqCount, 20) : null;
        // The mode is a preset. Explicit per-type counts are authoritative,
        // including zero, and opt out of automatic Timeline/Glossary skips.
        const _resolvedMix = _sanitizeItemMix(
            (_modeStrategy && _modeStrategy.generation.defaultItemTypeMix) || { mcq: _modeItemCount }
        );
        if (!_hasExplicitItemTypes && _explicitMcqCount !== null) {
            if (_explicitMcqCount > 0) _resolvedMix.mcq = _explicitMcqCount;
            else delete _resolvedMix.mcq;
        }
        const _hasTimelineArtifact = Array.isArray(generationHistory) && generationHistory.some(function (h) { return h && h.type === 'timeline'; });
        const _hasGlossaryArtifact = Array.isArray(generationHistory) && generationHistory.some(function (h) { return h && h.type === 'glossary'; });
        const _smartSkips = [];
        if (!_hasExplicitItemTypes && _hasTimelineArtifact && _resolvedMix['sequence-sense']) {
            delete _resolvedMix['sequence-sense'];
            _smartSkips.push('sequence-sense (Timeline exists)');
        }
        if (!_hasExplicitItemTypes && _hasGlossaryArtifact && _resolvedMix['relation-mismatch']) {
            delete _resolvedMix['relation-mismatch'];
            _smartSkips.push('relation-mismatch (Glossary exists)');
        }
        const _modeItemMix = _hasExplicitItemTypes
            ? _sanitizeItemMix(configOverride.itemTypes)
            : _resolvedMix;
        if (_explicitMcqCount !== null) {
            if (_explicitMcqCount > 0) _modeItemMix.mcq = _explicitMcqCount;
            else delete _modeItemMix.mcq;
        }
        const _mcqCount = _modeItemMix.mcq || 0;
        const _multiSelectCount = _modeItemMix['multi-select'] || 0;
        const _fillBlankCount = _modeItemMix['fill-blank'] || 0;
        const _shortAnswerCount = _modeItemMix['short-answer'] || 0;
        const _selfExplanationCount = _modeItemMix['self-explanation'] || 0;
        const _sequenceSenseCount = _modeItemMix['sequence-sense'] || 0;
        const _relationMismatchCount = _modeItemMix['relation-mismatch'] || 0;
        const _answerEvidenceCount = _modeItemMix['answer-evidence'] || 0;
        const _numericResponseCount = _modeItemMix['numeric-response'] || 0;
        const _resolvedItemCount = _supportedItemTypes.reduce(function (total, key) {
            return total + (_modeItemMix[key] || 0);
        }, 0);
        const _reflectionCount = _clampQuizCount(
            _hasOwnConfig('quizReflectionCount') ? configOverride.quizReflectionCount : quizReflectionCount,
            2
        );
        const _requestedScoringPolicy = configOverride && configOverride.scoringPolicy && typeof configOverride.scoringPolicy === 'object'
            ? configOverride.scoringPolicy
            : {};
        const _scoringPolicy = {
            accuracy: _requestedScoringPolicy.accuracy !== false,
            confidence: _requestedScoringPolicy.confidence === true,
            partialCredit: _requestedScoringPolicy.partialCredit !== false,
            writtenResponseMode: _requestedScoringPolicy.writtenResponseMode === 'teacher-review'
                ? 'teacher-review'
                : 'ai-provisional',
        };
        const _scoringInstruction = _scoringPolicy.writtenResponseMode === 'teacher-review'
            ? 'Written responses will be reviewed by the teacher. Still provide complete reference answers and rubrics so the teacher has a clear key.'
            : 'Written responses receive provisional AI feedback. Provide specific reference answers and observable rubrics; avoid vague criteria.';
        // Slice 5: visual MCQ mode read from configOverride
        const _mcqVisualMode = (configOverride && configOverride.mcqVisualMode) || 'none';
        // Plan T v3+ Chunk 10: optional image-style hint. Empty preserves
        // today's default behavior. Trimmed + length-clamped defensively.
        // Falls back to the universal default (2026-07-28), matching glossary /
        // timeline / concept-sort, so quiz visuals share the lesson's art style.
        const _imageStyleOverride = (configOverride && typeof configOverride.imageStyle === 'string') ? configOverride.imageStyle : '';
        const _imageStyleRaw = _imageStyleOverride.trim() ? _imageStyleOverride : (universalImageStyle || '');
        const _imageStyle = _imageStyleRaw.trim().slice(0, 120);
        const _imageStyleSuffix = _imageStyle ? ' Style: ' + _imageStyle + '.' : '';
        // Build item-type-specific instruction blocks dynamically
        const _itemTypeBlocks = [];
        if (_mcqCount > 0) _itemTypeBlocks.push(_mcqCount + ' Multiple Choice Question(s) with 4 options each');
        if (_multiSelectCount > 0) _itemTypeBlocks.push(_multiSelectCount + ' Multi-Select Question(s) with 4-6 options and 2-4 correct answers; partial credit supported');
        if (_fillBlankCount > 0) _itemTypeBlocks.push(_fillBlankCount + ' Fill-in-the-Blank Question(s)');
        if (_shortAnswerCount > 0) _itemTypeBlocks.push(_shortAnswerCount + ' Short-Answer Question(s) (1-2 sentence response)');
        if (_selfExplanationCount > 0) _itemTypeBlocks.push(_selfExplanationCount + ' Self-Explanation Prompt(s) (3-5 sentence explanation in own words)');
        if (_sequenceSenseCount > 0) _itemTypeBlocks.push(_sequenceSenseCount + ' Sequence Sense Question(s) (4-6 items where the student verifies order, diagnoses misplacement, and identifies the ordering principle)');
        if (_relationMismatchCount > 0) _itemTypeBlocks.push(_relationMismatchCount + ' Relation Mismatch Question(s) (4-5 pre-paired items where ONE pair is wrong; student finds it and picks the correct partner)');
        if (_answerEvidenceCount > 0) _itemTypeBlocks.push(_answerEvidenceCount + ' Answer + Evidence Question(s) (choose an answer, then the evidence or reason that supports it)');
        if (_numericResponseCount > 0) _itemTypeBlocks.push(_numericResponseCount + ' Numeric Response Question(s) with a correct value, tolerance, and optional units');
        const _includeReflections = _reflectionCount > 0;
        const _reflectionInstruction = _includeReflections
            ? 'Additionally, generate exactly ' + _reflectionCount + ' unscored closing reflection prompt(s) in the reflections array. Ask about learning, remaining confusion, or a change in thinking; do not ask for confidence because confidence is collected per assessed item.'
            : 'Return an empty reflections array.';
        const _itemTypeInstructions = _itemTypeBlocks.map(function (s, i) { return (i + 1) + '. ' + s + '.'; }).join('\n          ');
        // Plan S Slice 3e: misconception probe flag — when in pre-check or formative mode,
        // tell the LLM to use distractors rooted in COMMON STUDENT MISCONCEPTIONS rather
        // than random plausibly-wrong options. This catches predictable errors and gives
        // teachers diagnostic data they couldn't get from random-distractor MCQs.
        const _useMisconceptionDistractors = (_quizMode === 'pre-check' || _quizMode === 'formative') && _mcqCount > 0;
        const _sourceGroundingInstruction = (function () {
            if (_quizMode === 'pre-check') {
                return `SOURCE-GROUNDED READINESS RULES:
          - Use the source text below as the anchor for every item.
          - Each item must name or clearly connect to a concept, vocabulary term, process, setting, claim, or relationship from the source.
          - Probe a prerequisite only when it is needed for that source-specific concept; do not drift into generic background knowledge.`;
            }
            if (_quizMode === 'review') {
                return `SOURCE-GROUNDED REVIEW RULES:
          - Prefer earlier concepts from the provided history when available, but keep each item related to the current source's topic, vocabulary, or conceptual neighborhood.
          - If no earlier concepts are available, quiz the current source directly, like an exit ticket, from a spaced-review angle.
          - Do not invent unrelated review topics.`;
            }
            return `SOURCE-GROUNDED ASSESSMENT RULES:
          - Build every item from the source text below.
          - Test specific facts, vocabulary, relationships, claims, processes, or inferences in that source.
          - Do not ask generic topic questions that could be answered without reading the source.`;
        })();
        // Build a type-aware JSON example. In particular, a customized
        // zero-MCQ recipe must not show the model an MCQ object to imitate.
        const _jsonExamplesByType = {
            mcq: { type: 'mcq', question: 'Question text?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', conceptLabel: 'short concept' },
            'multi-select': { type: 'multi-select', question: 'Select every statement that is supported.', options: ['Correct statement A', 'Distractor B', 'Correct statement C', 'Distractor D'], correctAnswers: ['Correct statement A', 'Correct statement C'], conceptLabel: 'short concept' },
            'fill-blank': { type: 'fill-blank', question: 'Sentence with ___ for the blank.', expectedFill: 'target phrase', acceptableAlternatives: ['accepted alternative'], conceptLabel: 'short concept' },
            'short-answer': { type: 'short-answer', question: 'Open prompt requiring a 1-2 sentence response.', expectedAnswer: 'Concise reference answer covering the key idea.', conceptLabel: 'short concept' },
            'self-explanation': { type: 'self-explanation', question: 'Explain the concept in your own words.', rubric: 'Reward the named key elements, relationships, and an accurate example.', conceptLabel: 'short concept' },
            'sequence-sense': { type: 'sequence-sense', question: 'Verify and diagnose this sequence.', items: ['first', 'second', 'third', 'fourth'], presentedOrder: [0, 2, 1, 3], intentionallyWrongIndex: 1, orderingPrinciple: 'process', principleOptions: ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'], conceptLabel: 'short concept' },
            'relation-mismatch': { type: 'relation-mismatch', question: 'Find and repair the incorrect pair.', pairs: [{ left: 'A', right: 'match A' }, { left: 'B', right: 'match B' }, { left: 'C', right: 'wrong match' }, { left: 'D', right: 'match D' }], wrongPairIndex: 2, correctPartnerForWrong: 'correct match C', candidatePartners: ['distractor 1', 'correct match C', 'distractor 2', 'distractor 3'], conceptLabel: 'short concept' },
            'answer-evidence': { type: 'answer-evidence', question: 'Which claim is best supported?', answerOptions: ['Claim A', 'Claim B', 'Claim C', 'Claim D'], correctAnswer: 'Claim B', evidencePrompt: 'Which evidence or reason best supports that answer?', evidenceOptions: ['Evidence A', 'Evidence B', 'Evidence C', 'Evidence D'], correctEvidence: 'Evidence C', conceptLabel: 'short concept' },
            'numeric-response': { type: 'numeric-response', question: 'Calculate the requested value. Include units when appropriate.', correctValue: 12.5, tolerance: 0.1, unit: 'cm', acceptableUnits: ['centimeter', 'centimeters'], conceptLabel: 'short concept' },
        };
        // Visual prompts are production instructions, not text alternatives. Keep
        // authored descriptions beside them so the rendered assessment can give a
        // blind learner the same information conveyed by each generated visual.
        // The descriptions must remain objective and must not identify the keyed
        // answer unless that information is visibly present in the image itself.
        if ((_mcqVisualMode === 'question' || _mcqVisualMode === 'both') && _jsonExamplesByType.mcq) {
            _jsonExamplesByType.mcq.imagePrompt = 'A concrete, classroom-friendly educational illustration.';
            _jsonExamplesByType.mcq.imageAltText = 'An objective description of the visible subject, labels, spatial relationships, and other information needed to understand the illustration.';
        }
        if ((_mcqVisualMode === 'options' || _mcqVisualMode === 'both') && _jsonExamplesByType.mcq) {
            _jsonExamplesByType.mcq.optionImagePrompts = ['Image prompt A', 'Image prompt B', 'Image prompt C', 'Image prompt D'];
            _jsonExamplesByType.mcq.optionImageAltTexts = ['Objective visual description A', 'Objective visual description B', 'Objective visual description C', 'Objective visual description D'];
        }
        const _jsonExampleQuestions = _supportedItemTypes.filter(function (key) {
            return (_modeItemMix[key] || 0) > 0;
        }).map(function (key) {
            const example = Object.assign({}, _jsonExamplesByType[key]);
            if (_xlate.enabled) {
                example.question_en = glossLang + ' translation of the question';
                if (key === 'mcq' || key === 'multi-select') example.options_en = ['A in ' + glossLang, 'B in ' + glossLang, 'C in ' + glossLang, 'D in ' + glossLang];
                if (key === 'answer-evidence') {
                    example.answerOptions_en = ['answer A in ' + glossLang, 'answer B in ' + glossLang, 'answer C in ' + glossLang, 'answer D in ' + glossLang];
                    example.evidenceOptions_en = ['evidence A in ' + glossLang, 'evidence B in ' + glossLang, 'evidence C in ' + glossLang, 'evidence D in ' + glossLang];
                }
            }
            return example;
        });
        const _jsonShape = JSON.stringify({
            questions: _jsonExampleQuestions,
            reflections: _includeReflections
                ? [_xlate.enabled ? { text: 'Reflection prompt', text_en: glossLang + ' reflection prompt' } : 'Reflection prompt']
                : [],
        }, null, 2);
        let result = '';
        if (usesLocalTextBackend) {
        const prompt = `
          ${_modeFraming}
          Quiz target: ${_modeQuestionTargets}.
          Audience: ${effectiveGrade} level students.
          Mode: ${_quizMode}.
          Language: ${effectiveLanguage}.
          ${interestsDirective}
          ${dokInstruction}
          ${standardsPromptString ? `Target standards: "${standardsPromptString}".` : ''}
          ${analysisContext}
          ${_sourceGroundingInstruction}
          Generate exactly ${_resolvedItemCount} assessed items using this exact item-type recipe:
          ${_itemTypeInstructions}
          ${_reflectionInstruction}
          ${_scoringInstruction}
          Follow the requested JSON example for each item type exactly. MCQs must have exactly 4 options and correctAnswer must exactly match one option. Every assessed item must include a short lowercase conceptLabel.
          ${_useMisconceptionDistractors ? 'Build MCQ distractors from common student misconceptions or predictable errors, not random wrong answers.' : ''}
          ${(_mcqVisualMode === 'question' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'VISUAL MCQ (question stimulus): For EACH MCQ item, additionally provide an "imagePrompt" field: a 1-sentence prompt for an image generator that depicts the question\'s subject. Use concrete, age-appropriate, classroom-friendly imagery.' : ''}
          ${(_mcqVisualMode === 'options' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'VISUAL MCQ (option images): For EACH MCQ item, additionally provide an "optionImagePrompts" array of 4 strings (one per option, same order as options). Each prompt must depict that option concretely.' : ''}
          ${effCustomInstructions ? `Custom instructions: ${effCustomInstructions}` : ''}
          ${(_mcqVisualMode === 'question' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'ACCESSIBLE QUESTION VISUAL: Include imageAltText for each imagePrompt. Objectively describe the intended visible content, labels, and spatial relationships. Do not interpret the image or identify the keyed answer unless that fact is visibly explicit.' : ''}
          ${(_mcqVisualMode === 'options' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'ACCESSIBLE OPTION VISUALS: Include optionImageAltTexts as 4 objective visual descriptions aligned with optionImagePrompts. Describe what is visibly distinct; do not merely repeat the option label.' : ''}
          ${useEmojis ? 'Use emojis only if they improve clarity.' : 'Do not use emojis.'}
          Return ONLY valid JSON matching this shape: ${_jsonShape}
          Source excerpt:
          """
          ${localExcerpt(textToProcess, 6500)}
          """
        `;
        setGenerationStep(t('status_steps.drafting_quiz'));
        setGenerationTaskProgress(0, 1, t('status_steps.drafting_quiz'));
        result = await callGemini(prompt, true);
        setGenerationTaskProgress(1, 1, t('status_steps.drafting_quiz'));
        } else {
        const prompt = `
          ${_modeFraming}
          Quiz target: ${_modeQuestionTargets}.
          Audience: ${effectiveGrade} level students.
          ${dnaPromptBlock}
          Language: ${effectiveLanguage}.
          ${interestsDirective}
          ${dokInstruction}
          ${standardsPromptString ? `Ensure questions align with Standards: "${standardsPromptString}".` : ''}
          ${analysisContext}
          ${_sourceGroundingInstruction}
          Include the following item types:
          ${_itemTypeInstructions}
          ${_reflectionInstruction}
          ${_scoringInstruction}
          ${_useMisconceptionDistractors ? 'CRITICAL FOR MCQ DISTRACTORS: For each MCQ, build the 3 wrong options from COMMON STUDENT MISCONCEPTIONS or predictable errors at this grade level — not random plausibly-wrong options. Each distractor should encode an error a real student would make. This makes the quiz a diagnostic of misconceptions, not just a check of knowledge.' : ''}
          IMPORTANT — concept tagging for retention tracking: For EVERY item (regardless of type), additionally provide a "conceptLabel" field — a 2-4 word stable concept tag describing what the item tests (e.g., "photosynthesis basics", "subject-verb agreement", "fraction equivalents"). Use lowercase. Use the SAME label across items that test the same underlying concept. This enables cross-session retention tracking — students who saw "photosynthesis basics" in last week's exit-ticket and again in today's review get tracked as the same concept.
          ${(_mcqVisualMode === 'question' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'VISUAL MCQ (question stimulus): For EACH MCQ item, additionally provide an "imagePrompt" field: a 1-sentence prompt for an image generator that depicts the question\'s subject. Use concrete, age-appropriate, classroom-friendly imagery. Example: "A simple labeled diagram of the water cycle showing evaporation, condensation, and precipitation, in a clean educational illustration style."' : ''}
          ${(_mcqVisualMode === 'options' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'VISUAL MCQ (option images): For EACH MCQ item, additionally provide an "optionImagePrompts" array of 4 strings (one per option, same order as options). Each is a 1-sentence prompt depicting that option\'s answer concretely. Example for "Which planet is Mars?": ["A red rocky planet with thin atmosphere", "A large striped gas giant with a great red spot", ...]' : ''}
          ${_multiSelectCount > 0 ? 'For each Multi-Select: provide 4-6 plausible options and a correctAnswers array containing the exact text of 2-4 correct options. Make every option independently judgeable. Avoid tricks such as all-of-the-above. The student receives partial credit for correct selections and loses credit for incorrect selections.' : ''}
          ${(_mcqVisualMode === 'question' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'ACCESSIBLE QUESTION VISUAL: Include imageAltText for each imagePrompt. Objectively describe the intended visible content, labels, and spatial relationships. Do not interpret the image or identify the keyed answer unless that fact is visibly explicit.' : ''}
          ${(_mcqVisualMode === 'options' || _mcqVisualMode === 'both') && _mcqCount > 0 ? 'ACCESSIBLE OPTION VISUALS: Include optionImageAltTexts as 4 objective visual descriptions aligned with optionImagePrompts. Describe what is visibly distinct; do not merely repeat the option label.' : ''}
          ${_fillBlankCount > 0 ? 'For each Fill-in-the-Blank: write a complete sentence with the target term replaced by "___" (3 underscores). Provide expectedFill (the precise word/phrase) AND a short list of acceptableAlternatives (synonyms or common variants — typos NOT included; the grader handles those).' : ''}
          ${_shortAnswerCount > 0 ? 'For each Short-Answer: write a question that requires a 1-2 sentence response demonstrating understanding (not just recall). Provide expectedAnswer as a 10-30 word reference answer the AI grader can compare student responses against.' : ''}
          ${_selfExplanationCount > 0 ? 'For each Self-Explanation Prompt: write a question that asks the student to explain a key concept in their own words (3-5 sentences). Provide a "rubric" string the AI grader can use — describe what a complete explanation should cover (key elements, relationships, examples). Reward genuine understanding over memorized phrasing.' : ''}
          ${_sequenceSenseCount > 0 ? 'For each Sequence Sense Question: provide an "items" array of 4-6 strings in the CANONICAL CORRECT ORDER. Then provide "presentedOrder" — an array of indices [0..N-1] representing the order the student will see (with one item intentionally moved out of position). Provide "intentionallyWrongIndex" — the position in presentedOrder where the misplaced item appears (or null if you want the displayed order to actually be correct). Provide "orderingPrinciple" — one of "chronological", "cause-effect", "process", "size", or "hierarchy" — and "principleOptions" — the same 5 strings (always all 5, in random order is fine). The student will: (1) verify yes/no, (2) click the misplaced item if any, (3) identify the principle. Choose content where ordering genuinely matters and the principle is clear.' : ''}
          ${_relationMismatchCount > 0 ? 'For each Relation Mismatch Question: provide a "pairs" array of 4-5 {left, right} objects where ONE pair is intentionally WRONG. Provide "wrongPairIndex" pointing to that pair. Provide "correctPartnerForWrong" — the right column value that SHOULD have been paired with the wrong-pair\'s left item. Provide "candidatePartners" — an array of 4 strings that includes correctPartnerForWrong and 3 distractors. Choose content where genuine left-right relationships exist (term-definition, cause-effect, person-contribution, etc.) and the wrong pair encodes a believable confusion (not an obvious nonsense match).' : ''}
          ${_answerEvidenceCount > 0 ? 'For each Answer + Evidence Question: provide answerOptions (exactly 4), correctAnswer (matching one answer option), evidencePrompt, evidenceOptions (exactly 4), and correctEvidence (matching one evidence option). The evidence must genuinely justify the correct answer; plausible distractors should reflect common reasoning errors.' : ''}
          ${_numericResponseCount > 0 ? 'For each Numeric Response: provide correctValue as a number, tolerance as a non-negative number (0 for exact answers), unit as the preferred unit or an empty string, and acceptableUnits as common equivalent spellings for that SAME unit. Ask only questions with one unambiguous numeric result.' : ''}
          ${lessonDNA ? `Instruction: Ensure questions align with the "Core Concepts" and test the "Required Vocabulary" listed in the Lesson DNA above.` : ''}
          ${useEmojis ? 'Include relevant emojis in questions and options to support understanding.' : 'Do not use emojis.'}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          ${_xlate.enabled ? `For every question, option, and reflection, provide a ${glossLang} translation field (suffix _en). The "_en" suffix is a fixed field name, not a language code — put the ${glossLang} text in it.` : 'Do NOT provide translation fields of any kind.'}
          ${dialectInstruction}
          Return ONLY valid JSON: ${_jsonShape}
          ${differentiationContext}
          Source text:
          "${textToProcess}"
        `;
        setGenerationStep(t('status_steps.drafting_quiz'));
        result = await callGemini(prompt, true);
        }
        try {
            content = usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result));
            if (!content) content = {};
            if (Array.isArray(content)) {
                 content = { questions: content, reflections: [] };
            }
            if (!content.questions || !Array.isArray(content.questions)) content.questions = [];
            if (!content.reflections || !Array.isArray(content.reflections)) content.reflections = [];
            // Plan S Slice 2: type-aware normalization. MCQ keeps its options + correctAnswer
            // shape; fill-blank requires expectedFill; short-answer requires expectedAnswer.
            // Items missing a `type` field default to 'mcq' for back-compat.
            content.questions = content.questions.map(q => {
                const itemType = q.type || 'mcq';
                // Plan T v3 + Chunk 5: stable conceptLabel for cross-session
                // retention tracking. Use shared normalizer so generation,
                // write, and read paths all agree on the canonical form.
                // Falls back to trim+lowercase if module not loaded.
                const _qla = (typeof window !== 'undefined') && window.AlloModules && window.AlloModules.QuizLiveAggregators;
                const _norm = (_qla && typeof _qla.normalizeConceptId === 'function')
                    ? _qla.normalizeConceptId
                    : (s => (typeof s === 'string' ? s.trim().toLowerCase() : ''));
                const _rawConceptLabel = (typeof q.conceptLabel === 'string' && q.conceptLabel.trim())
                    ? _norm(q.conceptLabel)
                    : '';
                const base = {
                    ...q,
                    type: itemType,
                    question: q.question || "Question text missing",
                    conceptLabel: _rawConceptLabel,
                };
                if (itemType === 'mcq') {
                    base.options = Array.isArray(q.options) ? q.options : ["True", "False"];
                    base.correctAnswer = q.correctAnswer || "";
                } else if (itemType === 'multi-select') {
                    base.options = Array.isArray(q.options) ? q.options.filter(function (s) { return typeof s === 'string' && s; }) : [];
                    base.correctAnswers = Array.isArray(q.correctAnswers)
                        ? q.correctAnswers.filter(function (s) { return typeof s === 'string' && base.options.indexOf(s) !== -1; })
                        : (q.correctAnswer && base.options.indexOf(q.correctAnswer) !== -1 ? [q.correctAnswer] : []);
                } else if (itemType === 'fill-blank') {
                    base.expectedFill = q.expectedFill || "";
                    base.acceptableAlternatives = Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : [];
                } else if (itemType === 'short-answer') {
                    base.expectedAnswer = q.expectedAnswer || "";
                } else if (itemType === 'self-explanation') {
                    // Self-explanation uses a rubric string for the grader instead of a key answer.
                    base.rubric = q.rubric || q.expectedAnswer || "";
                } else if (itemType === 'sequence-sense') {
                    // Slice 5: 3-step diagnostic. items[] = canonical order; presentedOrder = display permutation;
                    // intentionallyWrongIndex = which display position is misplaced (null = order is actually correct);
                    // orderingPrinciple = canonical principle answer; principleOptions = 5 candidate principles.
                    base.items = Array.isArray(q.items) ? q.items.filter(function (it) { return it && (typeof it === 'string' || it.text); }) : [];
                    base.presentedOrder = Array.isArray(q.presentedOrder) ? q.presentedOrder.filter(function (n) { return typeof n === 'number'; }) : null;
                    base.intentionallyWrongIndex = (typeof q.intentionallyWrongIndex === 'number') ? q.intentionallyWrongIndex : null;
                    base.orderingPrinciple = q.orderingPrinciple || '';
                    var defaultPrincipleOpts = ['chronological','cause-effect','process','size','hierarchy'];
                    base.principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 3 ? q.principleOptions : defaultPrincipleOpts;
                } else if (itemType === 'relation-mismatch') {
                    // Slice 5: 2-step diagnostic. pairs[] = displayed pairs (one wrong);
                    // wrongPairIndex = which pair is wrong; correctPartnerForWrong = right answer; candidatePartners = 4 options.
                    base.pairs = Array.isArray(q.pairs) ? q.pairs.filter(function (pr) { return pr && (pr.left || pr.left_text) && (pr.right || pr.right_text); }).map(function (pr) {
                        return { left: pr.left || pr.left_text, right: pr.right || pr.right_text };
                    }) : [];
                    base.wrongPairIndex = (typeof q.wrongPairIndex === 'number') ? q.wrongPairIndex : 0;
                    base.correctPartnerForWrong = q.correctPartnerForWrong || '';
                    base.candidatePartners = Array.isArray(q.candidatePartners) ? q.candidatePartners.filter(function (s) { return typeof s === 'string' && s; }) : [];
                } else if (itemType === 'answer-evidence') {
                    base.answerOptions = Array.isArray(q.answerOptions) ? q.answerOptions.filter(function (s) { return typeof s === 'string' && s; }) : [];
                    base.correctAnswer = q.correctAnswer || '';
                    base.evidencePrompt = q.evidencePrompt || 'Which evidence or reason best supports your answer?';
                    base.evidenceOptions = Array.isArray(q.evidenceOptions) ? q.evidenceOptions.filter(function (s) { return typeof s === 'string' && s; }) : [];
                    base.correctEvidence = q.correctEvidence || '';
                } else if (itemType === 'numeric-response') {
                    const parsedCorrectValue = Number(q.correctValue);
                    const parsedTolerance = Number(q.tolerance);
                    base.correctValue = Number.isFinite(parsedCorrectValue) ? parsedCorrectValue : 0;
                    base.tolerance = Number.isFinite(parsedTolerance) ? Math.max(0, parsedTolerance) : 0;
                    base.unit = typeof q.unit === 'string' ? q.unit.trim() : '';
                    base.acceptableUnits = Array.isArray(q.acceptableUnits) ? q.acceptableUnits.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim(); }) : [];
                }
                return base;
            });
            if (!usesLocalTextBackend) try {
                const checkedQuestions = await Promise.all(content.questions.map(async (q, idx) => {
                    // Only fact-check MCQ items — fill-blank and short-answer have their
                    // own grader at student-response time, no pre-grading needed.
                    if (q.type && q.type !== 'mcq') return q;
                    setGenerationStep(`${t('status_steps.verifying_answers')} (${idx + 1}/${content.questions.length})...`);
                    await new Promise(resolve => setTimeout(resolve, idx * 200));
                    const checkPrompt = `
                        Verify the factual accuracy of this multiple choice question designed for a ${effectiveGrade} student.
                        Question: "${q.question}"
                        Options: ${q.options.join(', ')}
                        Indicated Correct Answer: "${q.correctAnswer}",
                        Task:
                        Determine if the indicated correct answer is the single, factually correct option. Then explain the correct answer and debunk the distractors.
                        Output Requirements:
                        1. If the Indicated Answer is CORRECT and UNIQUE:
                           Start immediately with: "**Verified Correct Answer:** [Full text of the correct option]".
                           Then follow with a concise explanation of why it is correct.
                           Then add a section "**Why other options are incorrect:**" and provide a brief bulleted list explaining the error in each distractor.
                        2. If the Indicated Answer is INCORRECT, AMBIGUOUS, or NOT UNIQUE:
                           Start immediately with: "**CORRECTION / WARNING:** [State clearly if the answer is wrong or multiple are correct]".
                           Then state: "**Actual Correct Answer:** [Full text of the correct option(s)]".
                           Then explain the discrepancy or error.
                        Format Guidelines:
                        - Do NOT repeat the Question text.
                        - Use **bold** for the headers as specified.
                        - Keep the explanation concise.
                        - Write the explanation in ${effectiveLanguage}.
                        ${_xlate.enabled ? `- After the explanation, add a new line "--- English Translation ---" (a fixed marker) and provide the explanation in ${glossLang}.` : ''}
                        ${dialectInstruction}
                    `;
                    try {
                        const factCheckResult = await callGemini(checkPrompt);
                        return { ...q, factCheck: factCheckResult };
                    } catch (err) {
                        warnLog(`Auto fact check failed for question ${idx}`, err);
                        return q;
                    }
                }));
                content.questions = checkedQuestions;
            } catch (err) {
                warnLog("Fact checking process encountered an error", err);
            }
        } catch (parseErr) {
             warnLog("Quiz Parse Error:", parseErr);
             throw new Error("Failed to parse Quiz JSON. The AI response was not valid.");
        }
        // Plan S Slice 5: Visual MCQ image generation. Only runs when the
        // teacher opted in via mcqVisualMode. Iterates MCQ items in parallel
        // (Promise.all) so wall-clock scales with max single-image latency,
        // not the sum. Question and option images each fire independently.
        const _wantQuestionImages = _mcqVisualMode === 'question' || _mcqVisualMode === 'both';
        const _wantOptionImages = _mcqVisualMode === 'options' || _mcqVisualMode === 'both';
        if ((_wantQuestionImages || _wantOptionImages) && Array.isArray(content.questions) && typeof callImagen === 'function') {
            try {
                const _mcqItems = content.questions.filter(function (q) { return q && (q.type === 'mcq' || !q.type); });
                if (_mcqItems.length > 0) {
                    setGenerationStep && setGenerationStep('Generating MCQ visuals (' + _mcqItems.length + ' question' + (_mcqItems.length === 1 ? '' : 's') + ')...');
                    // Build a flat list of image generation tasks
                    const _imgTasks = [];
                    _mcqItems.forEach(function (q) {
                        if (_wantQuestionImages && q.imagePrompt) {
                            q.imageAltText = typeof q.imageAltText === 'string' && q.imageAltText.trim()
                                ? q.imageAltText.trim().slice(0, 600)
                                : String(q.imagePrompt).trim().slice(0, 600);
                            _imgTasks.push({
                                target: q,
                                key: 'imageUrl',
                                prompt: q.imagePrompt + _imageStyleSuffix,
                            });
                        }
                        if (_wantOptionImages && Array.isArray(q.optionImagePrompts)) {
                            q.optionImageUrls = q.optionImageUrls || new Array(q.options ? q.options.length : 4).fill(null);
                            const _authoredOptionAlts = Array.isArray(q.optionImageAltTexts) ? q.optionImageAltTexts : [];
                            q.optionImageAltTexts = q.optionImagePrompts.slice(0, 4).map(function (prompt, optIdx) {
                                const authored = typeof _authoredOptionAlts[optIdx] === 'string' ? _authoredOptionAlts[optIdx].trim() : '';
                                return (authored || String(prompt || '').trim()).slice(0, 600);
                            });
                            q.optionImagePrompts.slice(0, 4).forEach(function (prompt, optIdx) {
                                if (prompt) _imgTasks.push({
                                    target: q,
                                    key: 'optionImageUrls',
                                    optIdx: optIdx,
                                    prompt: prompt + _imageStyleSuffix,
                                });
                            });
                        }
                    });
                    // Run all image gens in parallel; any failure leaves the URL null and
                    // the view falls back to text-only rendering. Never blocks the quiz.
                    await Promise.all(_imgTasks.map(async function (task) {
                        try {
                            const url = await callImagenWithSignal(task.prompt);
                            if (task.key === 'imageUrl') {
                                task.target.imageUrl = url || '';
                            } else if (task.key === 'optionImageUrls') {
                                task.target.optionImageUrls[task.optIdx] = url || '';
                            }
                        } catch (imgErr) {
                            warnLog('[Quiz] Visual MCQ image generation failed for one item:', imgErr);
                            // Leave the URL unset; render falls back to text-only
                        }
                    }));
                }
            } catch (visualErr) {
                warnLog('[Quiz] Visual MCQ pipeline failed:', visualErr);
                // Don't throw — quiz still works without visuals
            }
        }
        // Plan T v3+ Chunk 7: misconception-distractor validation pass. When
        // pre-check / formative MCQs were generated with the misconception flag,
        // the LLM was *instructed* to encode common student errors as distractors —
        // but there's no validation that it actually did. Run a single batched
        // secondary LLM call that scores each distractor on whether it encodes
        // a recognized misconception. Surfaces a "distractor review" summary so
        // teachers know which MCQs to inspect / edit before deploying. Cheap
        // (one Gemini call regardless of MCQ count) and never blocks: failures
        // are silent and leave content.distractorReview undefined.
        if (!usesLocalTextBackend && _useMisconceptionDistractors && Array.isArray(content.questions)) {
            try {
                const _mcqsForReview = content.questions
                    .map((q, qIdx) => ({ q, qIdx }))
                    .filter(entry => entry.q && (entry.q.type === 'mcq' || !entry.q.type) && Array.isArray(entry.q.options) && entry.q.correctAnswer != null);
                if (_mcqsForReview.length > 0) {
                    setGenerationStep && setGenerationStep('Reviewing distractor quality...');
                    const _itemsBlock = _mcqsForReview.map(entry => {
                        const distractors = entry.q.options.filter(o => o !== entry.q.correctAnswer);
                        return `Q${entry.qIdx + 1}: "${entry.q.question}"\n  Correct: "${entry.q.correctAnswer}"\n  Distractors: ${distractors.map((d, di) => `(${di + 1}) "${d}"`).join(' / ')}`;
                    }).join('\n\n');
                    const reviewPrompt = `You are an assessment-design expert evaluating MCQ distractors for a ${effectiveGrade} level quiz on this topic. For each MCQ below, evaluate whether each distractor encodes a REAL student misconception (a common, predictable error students make in their thinking) versus a random plausibly-wrong answer that doesn't reflect any specific misunderstanding.

Return ONLY a single valid JSON object with this exact shape:
{
  "reviews": [
    {
      "qIdx": 0,
      "distractorScores": [
        { "distractor": "...", "encodesMisconception": true, "reason": "ONE sentence: what misconception this catches" }
      ]
    }
  ]
}

Be strict: a distractor only encodes a misconception if a teacher could point to a specific wrong belief or reasoning error students hold. "Plausible-but-random" wrong answers should be marked encodesMisconception: false with a reason like "no specific misconception encoded".

MCQs:

${_itemsBlock}`;
                    try {
                        const reviewRaw = await callGemini(reviewPrompt, true);
                        const reviewParsed = (typeof reviewRaw === 'string') ? JSON.parse(reviewRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()) : reviewRaw;
                        if (reviewParsed && Array.isArray(reviewParsed.reviews)) {
                            let totalDistractors = 0;
                            let misconceptionCount = 0;
                            const weakItems = [];
                            reviewParsed.reviews.forEach(review => {
                                if (typeof review.qIdx !== 'number' || !Array.isArray(review.distractorScores)) return;
                                const target = content.questions[review.qIdx];
                                if (!target) return;
                                const scoresByDistractor = review.distractorScores.map(d => ({
                                    distractor: String(d.distractor || ''),
                                    encodesMisconception: !!d.encodesMisconception,
                                    reason: String(d.reason || ''),
                                }));
                                target.distractorQuality = scoresByDistractor;
                                const itemMisconceptionCount = scoresByDistractor.filter(s => s.encodesMisconception).length;
                                totalDistractors += scoresByDistractor.length;
                                misconceptionCount += itemMisconceptionCount;
                                // Flag items where < half of distractors encode a misconception
                                if (scoresByDistractor.length > 0 && itemMisconceptionCount * 2 < scoresByDistractor.length) {
                                    weakItems.push(review.qIdx);
                                }
                            });
                            content.distractorReview = {
                                totalDistractors,
                                misconceptionCount,
                                weakItems,
                                quality: totalDistractors > 0 ? Math.round((misconceptionCount / totalDistractors) * 100) : null,
                            };
                        }
                    } catch (reviewErr) {
                        warnLog('[Quiz] Distractor validation pass failed (non-fatal):', reviewErr);
                    }
                }
            } catch (outerErr) {
                warnLog('[Quiz] Distractor validation outer error:', outerErr);
            }
        }
        // Enforce the requested upper bounds after generation. Missing items
        // cannot be invented safely, so surface a warning instead of silently
        // claiming the requested recipe was fulfilled.
        const _keptByType = {};
        if (content && Array.isArray(content.questions)) {
            content.questions = content.questions.filter(function (question) {
                const key = question && question.type ? question.type : 'mcq';
                const requested = _modeItemMix[key] || 0;
                const kept = _keptByType[key] || 0;
                if (kept >= requested) return false;
                _keptByType[key] = kept + 1;
                return true;
            });
        }
        if (content && Array.isArray(content.reflections)) {
            content.reflections = content.reflections.slice(0, _reflectionCount);
        }
        const _actualQuestions = content && Array.isArray(content.questions) ? content.questions : [];
        const _actualReflections = content && Array.isArray(content.reflections) ? content.reflections : [];
        const _actualItemMix = {};
        _actualQuestions.forEach(function (question) {
            const key = question && question.type ? question.type : 'mcq';
            _actualItemMix[key] = (_actualItemMix[key] || 0) + 1;
        });
        const _countMismatch = _supportedItemTypes.some(function (key) {
            return (_actualItemMix[key] || 0) !== (_modeItemMix[key] || 0);
        }) || _actualReflections.length !== _reflectionCount;
        if (content && typeof content === 'object') {
            content.requestedItemTypeMix = Object.assign({}, _modeItemMix);
            content.actualItemTypeMix = Object.assign({}, _actualItemMix);
            content.requestedReflectionCount = _reflectionCount;
            content.itemCountMismatch = _countMismatch;
        }
        if (_countMismatch) {
            addToast('The AI returned fewer items than requested in at least one question type. Review the generated mix before sharing.', 'warning');
        }
        // Plan S: stamp the mode onto the content so the view can render
        // mode-aware behavior (intro banner, AI explainer, confidence rating).
        if (content && typeof content === 'object') {
            content.mode = _quizMode;
            content.modeLabel = _modeStrategy ? _modeStrategy.label : 'Exit Ticket';
            content.modeIcon = _modeStrategy ? _modeStrategy.icon : '📝';
            content.mcqVisualMode = _mcqVisualMode;
            content.scoringPolicy = Object.assign({}, _scoringPolicy);
            // Plan T v3+ Chunk 10: persist style hint for the refine pipeline.
            if (_imageStyle) content.imageStyle = _imageStyle;
            if (usesLocalTextBackend) content.localModelGenerated = true;
        }
        const _modeMetaPrefix = _modeStrategy && _quizMode !== 'exit-ticket' ? _modeStrategy.label + ' · ' : '';
        const _smartSkipSuffix = _smartSkips.length > 0 ? ` · skipped: ${_smartSkips.join(', ')}` : '';
        const _metaQuestionCount = _actualQuestions.length;
        const _metaMcqCount = _actualItemMix.mcq || 0;
        const _metaReflectionCount = _actualReflections.length;
        metaInfo = `${_modeMetaPrefix}${effectiveGrade} - Quiz (${_metaQuestionCount} items; ${_metaMcqCount} MCQ${_metaReflectionCount > 0 ? `; ${_metaReflectionCount} Ref` : ''})${dokLevel ? ` - ${dokLevel.split(':')[0]}` : ''} - ${effectiveLanguage}${usesLocalTextBackend ? ' - Local' : ''}${_smartSkipSuffix}`;
        // Stamp smart-skip info onto the quiz content so the view module can
        // optionally surface it to teachers (future enhancement).
        if (content && typeof content === 'object' && _smartSkips.length > 0) {
            content.smartSkips = _smartSkips.slice();
        }
      } else if (type === 'analysis') {
        let verificationContext = "";
        let collectedSources = [];
        let isSearchActive = checkAccuracyWithSearch && !usesLocalTextBackend;
        if (checkAccuracyWithSearch && usesLocalTextBackend) {
            debugLog('[LocalAI] Skipping search-backed analysis verification for local text backend.');
        }
        if (isSearchActive) {
            try {
                const deepResult = await performDeepVerification(textToProcess);
                verificationContext = deepResult.text;
                collectedSources = (deepResult.sources || []).map(s => ({ uri: s.uri, title: s.title }));
                if (!verificationContext || verificationContext.length < 10 || collectedSources.length === 0) {
                    verificationContext = "";
                    collectedSources = [];
                    isSearchActive = false;
                    addToast(t('toasts.verification_unavailable'), "info");
                }
            } catch (verifyErr) {
                warnLog("Analysis Verification Step Failed", verifyErr);
                addToast(t('toasts.verification_failed_proceed'), "info");
                isSearchActive = false;
            }
        }
        setGenerationStep(isSearchActive ? t('status_steps.synthesizing_analysis') : t('status_steps.analyzing_structure'));
        // 2026-08-16 (L4): this read currentUiLanguage, which meant the whole
        // analysis came back in the app's INTERFACE language and ignored the
        // Output language setting entirely. It is the leak Aaron suspected.
        // The analysis prose now follows effectiveLanguage like every other
        // resource; the extra full-text translation follows the translation
        // setting. Local backends still opt out: the twin local prompt has no
        // room for a second full rendering of the source.
        const targetUiLang = _xlate.target || effectiveLanguage;
        const isTranslatedAnalysis = _xlate.enabled && !usesLocalTextBackend;
        const prompt = `
          Analyze the following text for an educator.
          ${verificationContext ? `
          --- VERIFICATION REPORT (FROM GOOGLE SEARCH) ---
          The text has already been fact-checked. Here are the findings (with citations):
          """
          ${verificationContext}
          """,
          INSTRUCTION:
          1. Use the "Verification Report" above to populate the "accuracy" section of the JSON.
          2. Specifically separate findings into "discrepancies" and "verifiedFacts".
          ------------------------------------------------
          ` : ''}
          Provide:
          1. Reading Level: Estimate a 3-grade range based on U.S. Grade Level standards (e.g. "3rd-5th Grade", "6th-8th Grade", "K-2nd Grade"). Provide a detailed pedagogical analysis of text complexity, citing specific examples of sentence structure and vocabulary load.
          2. Key Concepts (array of strings)
          3. Estimated Accuracy (e.g. "High", "Moderate", with a short explanation).
          4. Potential Grammar/Spelling Issues (list specific examples or say "None detected")
          ${isTranslatedAnalysis ? `5. Translated Text: A full, fluent translation of the source text into ${targetUiLang}.` : ''}
          ${languageDirective ? `Write the analysis prose (explanations, concepts, accuracy reason, grammar notes) in ${effectiveLanguage}.` : ''}
          CRITICAL OUTPUT INSTRUCTION:
          You MUST return VALID JSON. Do not wrap the JSON in markdown code blocks.
          *** CITATION RETENTION RULE ***:
          When populating the "discrepancies" and "verifiedFacts" arrays, you MUST include the bracketed citation numbers (e.g. [1], [2]) exactly as they appear in the Verification Report.
          - Correct: "The text claims X, but sources say Y [1]."
          - Incorrect: "The text claims X, but sources say Y.",
          ${isTranslatedAnalysis ? `
          LANGUAGE INSTRUCTIONS:
          - Also supply a ${targetUiLang} rendering of every analysis field (concepts, explanations, accuracy reasons, grammar notes).
          - Include the "translatedText" field with the source text translated into ${targetUiLang}.
          - CRITICAL: Calculate the "readingLevel" from the complexity of the ORIGINAL SOURCE text, NOT of any translation.
          --- BILINGUAL ARRAYS REQUIREMENT ---
          For the "discrepancies" and "verifiedFacts" arrays specifically:
          You MUST provide both the ${targetUiLang} text AND the original source-language text for every item.
          Format each string exactly like this (the "--- ENGLISH TRANSLATION ---" marker is a fixed separator token, not a claim about the language):
          "${targetUiLang} Version... [1] --- ENGLISH TRANSLATION --- Original Version... [1]"
          ` : ''}
          Required JSON Structure:
          {
            "readingLevel": { "range": "...", "explanation": "..." },
            "concepts": ["..."],
            "accuracy": {
                "rating": "...",
                "reason": "..."${checkAccuracyWithSearch ? ', \n"discrepancies": ["Error found... [1]", "Inaccuracy... [2]"], \n"verifiedFacts": ["Fact verified... [3]", "Date confirmed... [1]"]' : ''}
            },
            "grammar": ["..."]${isTranslatedAnalysis ? ', \n"translatedText": "..."' : ''}
          }
          ${differentiationContext}
          Text: "${usesLocalTextBackend ? localExcerpt(textToProcess, 7000) : textToProcess}"
        `;
        if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.analyzing_structure'));
        const result = await callGemini(prompt, true, false);
        if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.analyzing_structure'));
        let resultText = "";
        if (typeof result === 'object' && result !== null) {
            resultText = result.text || JSON.stringify(result);
        } else {
            resultText = String(result || "");
        }
        if (!resultText || resultText.trim().length < 5) {
             throw new Error("AI returned empty response. Please try again.");
        }
        let analysisData;
        try {
             const cleanedResult = cleanJson(resultText);
             if (!cleanedResult || (!cleanedResult.trim().startsWith('{') && !cleanedResult.trim().startsWith('['))) {
                 throw new Error("Response format is not JSON");
             }
             analysisData = usesLocalTextBackend ? parseJsonLenient(resultText, null) : JSON.parse(cleanedResult);
             if (!analysisData) throw new Error("Response format is not JSON");
        } catch (parseError) {
             warnLog("Analysis JSON parse issue. Attempting AI Repair...", parseError);
             setGenerationStep('Formatting analysis results...');
             if (!usesLocalTextBackend) try {
                 const safeSnippet = String(resultText).substring(0, 20000);
                 const repairPrompt = `
                    The previous AI response was meant to be JSON but was returned as conversational text.
                    Please convert the text below into the required JSON structure.
                    Required Structure:
                    {
                        "readingLevel": { "range": "...", "explanation": "..." },
                        "concepts": ["..."],
                        "accuracy": {
                            "rating": "...",
                            "reason": "...",
                            "discrepancies": ["..."],
                            "verifiedFacts": ["..."]
                        },
                        "grammar": ["..."]${isTranslatedAnalysis ? ', "translatedText": "..."' : ''}
                    }
                    Input Text to Convert:
                    """
                    ${safeSnippet}
                    """,
                    Return ONLY valid JSON.
                 `;
                 const repairResult = await callGemini(repairPrompt, true);
                 analysisData = JSON.parse(cleanJson(repairResult));
             } catch (repairErr) {
                 warnLog("Analysis Repair Failed:", repairErr);
                 analysisData = {
                     readingLevel: { range: "N/A", explanation: "AI returned unstructured text or invalid JSON. See verification section." },
                     concepts: ["Analysis format issue"],
                     accuracy: { rating: "See Report", reason: resultText },
                     grammar: []
                 };
             }
             if (usesLocalTextBackend) {
                 analysisData = {
                     readingLevel: { range: "N/A", explanation: "Local model returned unstructured analysis text." },
                     concepts: ["Analysis format issue"],
                     accuracy: { rating: "Not verified", reason: resultText },
                     grammar: []
                 };
             }
        }
        analysisData = {
             readingLevel: analysisData.readingLevel || { range: "N/A", explanation: "Could not determine level." },
             concepts: Array.isArray(analysisData.concepts) ? analysisData.concepts : (analysisData.concepts ? [String(analysisData.concepts)] : []),
             accuracy: analysisData.accuracy || { rating: "Unknown", reason: "Could not verify accuracy." },
             grammar: Array.isArray(analysisData.grammar) ? analysisData.grammar : [],
             translatedText: analysisData.translatedText
        };
        if (checkAccuracyWithSearch && !isSearchActive) {
            analysisData.accuracy = {
                ...analysisData.accuracy,
                rating: "Not web-verified",
                reason: "Web verification did not return attributable sources. This is an AI-generated estimate, not a Google Search-verified accuracy result.",
                discrepancies: [],
                verifiedFacts: []
            };
        }
        if (typeof analysisData.readingLevel === 'string') {
            analysisData.readingLevel = { range: analysisData.readingLevel, explanation: "AI did not provide detailed explanation." };
        }
        let gatheredCitations = "";
        if (isSearchActive && collectedSources.length > 0) {
             const combinedFindings = [
                 ...(analysisData.accuracy.discrepancies || []),
                 ...(analysisData.accuracy.verifiedFacts || [])
             ].join(" ");
             const _normalizeCitationBrackets = (text) => text.replace(
                 /\[(?:Source\s+)?(\d+(?:\s*,\s*(?:Source\s+)?\d+)*)\]/gi,
                 (match, inner) => {
                     const nums = inner.match(/\d+/g) || [];
                     if (nums.length === 0) return match;
                     return nums.map(n => `[${n}]`).join(' ');
                 }
             );
             const expandedFindings = _normalizeCitationBrackets(combinedFindings);
             const _eduWrapped = filterEducationalSources(
                 collectedSources.map(s => ({ web: { uri: s.uri, title: s.title } }))
             );
             const _eduUriSet = new Set(_eduWrapped.map(c => c.web.uri));
             const usedIndices = new Set();
             const finalSources = [];
             const oldToNewIndexMap = new Map();
             const rejectedIndices = new Set(); // educationally-filtered indices (1-based)
             let newCounter = 1;
             collectedSources.forEach((source, idx) => {
                 const originalGlobalIndex = idx + 1;
                 const marker = `[${originalGlobalIndex}]`;
                 if (!expandedFindings.includes(marker)) return; // unreferenced — skip
                 if (!_eduUriSet.has(source.uri)) {
                     rejectedIndices.add(originalGlobalIndex);
                     return;
                 }
                 usedIndices.add(originalGlobalIndex);
                 finalSources.push({ ...source, newIndex: newCounter });
                 oldToNewIndexMap.set(originalGlobalIndex, newCounter);
                 newCounter++;
             });
             let citationText = "";
             if (finalSources.length > 0) {
                 finalSources.forEach((source) => {
                     const safeTitle = (source.title || "Web Source").replace(/[\[\]]/g, '');
                     citationText += `\n${source.newIndex}. [${safeTitle}](${source.uri})`;
                 });
             } else {
                 citationText += "\n(Sources consulted during verification)";
                 collectedSources.forEach((s, i) => {
                    const safeTitle = (s.title || "Web Source").replace(/[\[\]]/g, '');
                    citationText += `\n${i+1}. [${safeTitle}](${s.uri})`;
                 });
             }
             gatheredCitations = citationText;
             const rehydrateList = (list) => {
                 if (!Array.isArray(list)) return [];
                 return list.map(itemText => {
                     let processedText = _normalizeCitationBrackets(itemText);
                     rejectedIndices.forEach(rej => {
                         const marker = `[${rej}]`;
                         processedText = processedText.split(marker).join('');
                     });
                     collectedSources.forEach((source, idx) => {
                         const originalGlobalIndex = idx + 1;
                         const marker = `[${originalGlobalIndex}]`;
                         if (processedText.includes(marker) && source.uri && oldToNewIndexMap.has(originalGlobalIndex)) {
                             const newNum = oldToNewIndexMap.get(originalGlobalIndex);
                             const supMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
                             const supNum = String(newNum).split('').map(d => supMap[d] || d).join('');
                             const interactiveMarker = `[⁽${supNum}⁾](${source.uri})`;
                             processedText = processedText.split(marker).join(interactiveMarker);
                         }
                     });
                     processedText = processedText.replace(/\s*\[\d+\]\s*/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
                     return processedText;
                 });
             };
             if (analysisData.accuracy) {
                 if (analysisData.accuracy.discrepancies) {
                     analysisData.accuracy.discrepancies = rehydrateList(analysisData.accuracy.discrepancies);
                 }
                 if (analysisData.accuracy.verifiedFacts) {
                     analysisData.accuracy.verifiedFacts = rehydrateList(analysisData.accuracy.verifiedFacts);
                 }
                 analysisData.accuracy.citations = gatheredCitations;
             }
        }
        const localStats = calculateReadability(textToProcess);
        const textForDisplay = analysisData.translatedText || textToProcess;
        let cleanedTextForDisplay = textForDisplay.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
                return line.replace(/^(\s*)\*\*(.*)\*\*$/, '$1$2');
            }
            return line;
        }).join('\n');
        const _nonEmpty = cleanedTextForDisplay.split('\n').filter(l => l.trim());
        const _headerCount = _nonEmpty.filter(l => l.trim().startsWith('#')).length;
        if (_nonEmpty.length > 3 && _headerCount / _nonEmpty.length > 0.4) {
            cleanedTextForDisplay = cleanedTextForDisplay.split('\n').map(line => {
                const trimmed = line.trim();
                if (/^#{1,6}\s+/.test(trimmed)) {
                    return line.replace(/^(\s*)#{1,6}\s+(.*)$/, '$1**$2**');
                }
                return line;
            }).join('\n');
        }
        content = {
            ...analysisData,
            originalText: cleanedTextForDisplay,
            rawEnglishText: textToProcess,
            localStats
        };
        metaInfo = `${isSearchActive ? t('meta.analysis_verified') : t('meta.analysis_standard')}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'faq') {
        if (usesLocalTextBackend) {
            const localFaqCount = Math.max(3, Math.min(Number(faqCount) || 5, 6));
            const prompt = `
                Generate ${localFaqCount} clear Frequently Asked Questions based on the source excerpt.
                Audience: ${effectiveGrade} students.
                Language: ${effectiveLanguage}.
                ${standardsDirective}
                ${dokDirective}
                ${studentInterests.length > 0 ? `Use examples related to "${studentInterests.join(', ')}" where natural.` : ''}
                ${useEmojis ? 'Use emojis sparingly only if they improve clarity.' : 'Do not use emojis.'}
                ${effCustomInstructions ? `Custom instructions: ${effCustomInstructions}` : ''}
                Return ONLY valid JSON with this shape:
                { "faqs": [{ "question": "Question?", "answer": "Short student-friendly answer." }] }
                Source excerpt:
                """
                ${localExcerpt(textToProcess, 6000)}
                """
            `;
            setGenerationStep(t('status_steps.identifying_misconceptions'));
            setGenerationTaskProgress(0, 1, t('status_steps.identifying_misconceptions'));
            assertLocalTaskSupported('strict-json', 'The FAQ');
            const result = await callGemini(prompt, true, false, null, null, null, localSchemaArg('faq'));
            const parsed = parseJsonLenient(result, {});
            content = unwrapArray(parsed, ['faqs', 'questions', 'items']).slice(0, localFaqCount)
                .map(item => ({
                    question: String((item && item.question) || '').trim(),
                    answer: String((item && item.answer) || '').trim()
                }))
                .filter(item => item.question && item.answer);
            if (!content.length) {
                throw new Error("Failed to parse FAQ JSON. The AI response was not valid.");
            }
            metaInfo = `${content.length} Questions - ${effectiveGrade} - ${effectiveLanguage} - Local`;
            setGenerationTaskProgress(1, 1, t('status_steps.identifying_misconceptions'));
        } else {
        const prompt = `
            Generate ${faqCount} Frequently Asked Questions (FAQs) based on the text below.
            Target Audience: ${effectiveGrade} students.
            Language: ${effectiveLanguage}.
            ${standardsDirective}
            ${dokDirective}
            ${studentInterests.length > 0 ? `Integrate metaphors or examples related to "${studentInterests.join(', ')}" where helpful.` : ''}
            ${useEmojis ? 'Include relevant emojis in the questions and answers.' : 'Do not use emojis.'}
            ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
            ${_xlate.enabled ? `Provide ${glossLang} translations for every question and answer.` : 'Do NOT provide translations.'}
            ${dialectInstruction}
            Format: Return ONLY a JSON array of objects with "question", "answer" ${_xlate.enabled ? ', "question_en", "answer_en"' : ''} keys.
            Example: [{"question": "Why is the sky blue? ☁️", "answer": "...", "question_en": "...", "answer_en": "..."}]
            ${differentiationContext}
            Text: "${textToProcess}"
        `;
        setGenerationStep(t('status_steps.identifying_misconceptions'));
        const result = await callGemini(prompt, true);
        try {
            let parsed = JSON.parse(cleanJson(result));
            if (!Array.isArray(parsed)) {
                 if (parsed.faqs) parsed = parsed.faqs;
                 else if (parsed.questions) parsed = parsed.questions;
                 else parsed = [];
            }
            content = parsed;
            metaInfo = `${faqCount} Questions - ${effectiveGrade} - ${effectiveLanguage}`;
        } catch (parseErr) {
             warnLog("FAQ Parse Error:", parseErr);
             throw new Error("Failed to parse FAQ JSON. The AI response was not valid.");
        }
        }
      } else if (type === 'brainstorm') {
         // Activities redesign (2026-08-16): the sidebar panel passes the chosen
         // activity mode + options via configOverride. Guided mode, blueprints,
         // and AlloBot don't pass one, so they keep generating idea starters.
         const activityMode = configOverride && typeof configOverride.activityMode === 'string' ? configOverride.activityMode : 'ideas';
         const activityConfig = configOverride && configOverride.activityConfig && typeof configOverride.activityConfig === 'object' ? configOverride.activityConfig : {};
         if (activityMode === 'discussion') {
             const protocol = DISCUSSION_PROTOCOLS.includes(String(activityConfig.protocol || '').toLowerCase()) ? String(activityConfig.protocol).toLowerCase() : 'think-pair-share';
             const stepLabel = t('status_steps.building_discussion') || 'Building discussion kit...';
             setGenerationStep(stepLabel);
             if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, stepLabel);
             const discussionContext = usesLocalTextBackend ? localExcerpt(textToProcess, 5500) : textToProcess;
             const prompt = `
                You are an expert discussion facilitator and UDL specialist.
                Design ONE runnable class discussion kit for ${effectiveGrade} students from the source text, using the "${protocol}" protocol.
                ${studentInterests.length > 0 ? `Student interests: ${studentInterests.join(', ')}.` : ''}
                ${standardsPromptString ? `Target standards: ${standardsPromptString}.` : ''}
                ${dokDirective}
                ${effCustomInstructions ? `Custom focus: ${effCustomInstructions}.` : ''}
                ${languageDirective}
                Requirements:
                - Every question must be answerable from the source text; ramp literal -> inferential -> evaluative.
                - Talk stems must be short enough for a student to hold in mind while speaking.
                - "grouping": ONE sentence on room/group setup for ${protocol}.
                - "facilitationNotes": markdown for the TEACHER only (timing, pitfalls, how to restart a stalled discussion).
                - "lookFors": observable participation indicators, never grades or scores.
                Return ONLY valid JSON:
                { "title": "...", "protocol": "${protocol}", "grouping": "...", "openingQuestion": "...",
                  "questionSets": [ { "depth": "literal", "questions": ["..."] }, { "depth": "inferential", "questions": ["..."] }, { "depth": "evaluative", "questions": ["..."] } ],
                  "talkStems": { "agree": ["..."], "disagree": ["..."], "clarify": ["..."], "build": ["..."] },
                  "facilitationNotes": "...", "lookFors": ["..."] }
                Source text:
                """
                ${discussionContext}
                """
             `;
             const result = await callGemini(prompt, true);
             const kit = normalizeDiscussionKit(parseJsonLenient(result, null), protocol);
             if (!kit) throw new Error("Failed to parse Discussion Kit JSON. The AI response was not valid.");
             content = [kit];
             metaInfo = `${t('meta.discussion_kit') || 'Discussion Kit'}${usesLocalTextBackend ? ' - Local' : ''}`;
             if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, stepLabel);
         } else if (activityMode === 'jigsaw') {
             const groupSizeNum = Number(activityConfig.groupSize);
             const groupSize = Number.isFinite(groupSizeNum) && groupSizeNum >= 2 && groupSizeNum <= 6 ? Math.floor(groupSizeNum) : 4;
             const stepLabel = t('status_steps.building_jigsaw') || 'Building jigsaw activity...';
             setGenerationStep(stepLabel);
             if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, stepLabel);
             const jigsawContext = usesLocalTextBackend ? localExcerpt(textToProcess, 5500) : textToProcess;
             const prompt = `
                You are an expert in cooperative learning (Aronson jigsaw) and UDL.
                Split the source text into ${groupSize} genuinely INTERDEPENDENT expert chunks for ${effectiveGrade} students — each chunk must hold knowledge the others need, so every group member matters.
                ${studentInterests.length > 0 ? `Student interests: ${studentInterests.join(', ')}.` : ''}
                ${standardsPromptString ? `Target standards: ${standardsPromptString}.` : ''}
                ${dokDirective}
                ${effCustomInstructions ? `Custom focus: ${effCustomInstructions}.` : ''}
                ${languageDirective}
                ${differentiationContext ? `DIFFERENTIATION: ${differentiationContext}
                - Vary the reading demand of the expert packets across chunks so experts can be assigned strategically: at least one lighter-demand chunk and one stretch chunk, every packet still carrying essential knowledge the group needs.
                - Label each chunk with "suggestedLevel": "support" | "core" | "stretch", AND append the matching plain word (in the OUTPUT LANGUAGE, in parentheses) to that chunk's "label" so teachers see it without extra UI.` : ''}
                Requirements:
                - "expertPacket": markdown a student expert reads to master ONLY their chunk (rewritten for ${effectiveGrade}, not copied).
                - "teachBack": what that expert covers when teaching their home group, plus questions to check their group understood.
                - "homeGroupTask": the group task that NEEDS all ${groupSize} chunks.
                - "synthesisOrganizer": a markdown organizer (table or headings) students complete together spanning every chunk.
                - "accountabilityCheck": ${Math.min(groupSize + 2, 8)} short free-response questions spanning ALL chunks (with answers), so each member is individually accountable.
                Return ONLY valid JSON:
                { "title": "...",
                  "chunks": [ { "label": "...", "expertPacket": "...", "teachBack": { "keyPoints": ["..."], "checkQuestions": ["..."] } } ],
                  "homeGroupTask": "...", "synthesisOrganizer": "...",
                  "accountabilityCheck": [ { "q": "...", "answer": "..." } ] }
                Source text:
                """
                ${jigsawContext}
                """
             `;
             const result = await callGemini(prompt, true);
             const activity = normalizeJigsawActivity(parseJsonLenient(result, null), groupSize);
             if (!activity) throw new Error("Failed to parse Jigsaw JSON. The AI response was not valid.");
             content = [activity];
             metaInfo = `${t('meta.jigsaw_activity') || 'Jigsaw Activity'}${usesLocalTextBackend ? ' - Local' : ''}`;
             if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, stepLabel);
         } else {
         setGenerationStep(t('status_steps.brainstorming') || "Brainstorming ideas...");
         if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.brainstorming_start') || "Ooh, let me think of some fun activities!", 'thinking');
         const audienceDesc = isIndependentMode ? "a single independent learner (self-study)" : `${effectiveGrade} students`;
         const taskDesc = isIndependentMode
            ? "Generate a list of 5-8 'Solo Projects' and 'Real-world Experiments' suitable for one person to complete independently at home. Focus on DIY, creative application, or research challenges."
            : "Generate a list of 5-8 engaging, hands-on, or interdisciplinary activity ideas that connect the key concepts to other domains or physical activities.";
         const historySource = configOverride.historyOverride || history;
         if (usesLocalTextBackend) {
             const prompt = `
                Generate 5 practical activity ideas from the source excerpt.
                Audience: ${audienceDesc}.
                ${taskDesc}
                ${studentInterests.length > 0 ? `Student interests: ${studentInterests.join(', ')}.` : ''}
                ${standardsPromptString ? `Target standards: ${standardsPromptString}.` : ''}
                ${dokDirective}
                ${effCustomInstructions ? `Custom focus: ${effCustomInstructions}.` : ''}
                Recent resource history:
                ${compactHistoryForLocal(historySource) || 'No previous resources generated yet.'}
                ${languageDirective}
                Return ONLY valid JSON with this shape:
                { "ideas": [{ "title": "Activity Name", "description": "1-2 sentence activity description", "connection": "How it connects to the source concept" }] }
                Source excerpt:
                """
                ${localExcerpt(textToProcess, 5500)}
                """
             `;
             setGenerationTaskProgress(0, 1, t('status_steps.brainstorming') || "Brainstorming ideas...");
             assertLocalTaskSupported('strict-json', 'The brainstorm list');
             const result = await callGemini(prompt, true, false, null, null, null, localSchemaArg('brainstorm'));
             const parsed = parseJsonLenient(result, {});
             content = unwrapArray(parsed, ['ideas', 'activities', 'items']).slice(0, 8)
                 .map(item => ({
                     title: String((item && item.title) || '').trim(),
                     description: String((item && item.description) || '').trim(),
                    connection: String((item && item.connection) || '').trim(),
                    rubric: null // Optional schema slot; generated only when an educator requests it.
                 }))
                 .filter(item => item.title && item.description);
             if (!content.length) {
                 throw new Error("Failed to parse Brainstorm JSON. The AI response was not valid.");
             }
             metaInfo = `${t('meta.engagement_ideas')} - Local`;
             setGenerationTaskProgress(1, 1, t('status_steps.brainstorming') || "Brainstorming ideas...");
         } else {
         const prompt = `
            You are a creative pedagogical expert.
            Analyze the following source text and the context of previously generated resources in the user's history.
            ${dnaPromptBlock}
            ${taskDesc}
            Context from Resource History:
            ${historySource.length > 0 ? historySource.map(h => `- ${h.type}: ${h.title}`).join('\n') : "No previous resources generated yet."}
            ${differentiationContext}
            Source Text: "${textToProcess}",
            ${effCustomInstructions ? `Custom Focus/Instructions: ${effCustomInstructions}` : ''}
            ${standardsPromptString ? `Ensure activities help students demonstrate mastery of Standards: "${standardsPromptString}".` : ''}
            ${dokDirective}
            ${lessonDNA ? `Task: Generate activity ideas that specifically help students answer the "Essential Question" or master the "Core Concepts".` : ''}
            Target Audience: ${audienceDesc}.
            Interests: ${studentInterests.length > 0 ? studentInterests.join(', ') : 'General'}.
            ${languageDirective}
            Output Format: Return ONLY a JSON array of objects: [{ "title": "Activity Name", "description": "Detailed description of the activity", "connection": "How it connects to concepts" }]
         `;
         const result = await callGemini(prompt, true);
         try {
             let parsed = JSON.parse(cleanJson(result));
             if (!Array.isArray(parsed)) {
                 if (parsed.ideas && Array.isArray(parsed.ideas)) parsed = parsed.ideas;
                 else if (parsed.activities && Array.isArray(parsed.activities)) parsed = parsed.activities;
                 else parsed = [];
             }
             content = parsed;
             content = (Array.isArray(content) ? content : []).slice(0, 8)
                 .map(item => ({
                     title: String((item && item.title) || '').trim(),
                     description: String((item && item.description) || '').trim(),
                     connection: String((item && item.connection) || '').trim(),
                     rubric: null // Optional schema slot; generated only when an educator requests it.
                 }))
                 .filter(item => item.title && item.description);
             metaInfo = t('meta.engagement_ideas');
         } catch (parseErr) {
             warnLog("Brainstorm Parse Error:", parseErr);
             throw new Error("Failed to parse Brainstorm JSON. The AI response was not valid.");
         }
         }
         }
      } else if (type === 'sentence-frames') {
         if (usesLocalTextBackend) {
             const localMode = frameType === 'Paragraph Frame' ? 'paragraph' : 'list';
             const prompt = `
                Create writing scaffolds from the source excerpt for ${effectiveGrade} students.
                Type: ${frameType}.
                Language: ${effectiveLanguage}.
                ${dokDirective}
                ${studentInterests.length > 0 ? `Relate to ${studentInterests.join(', ')} if natural.` : ''}
                ${standardsPromptString ? `Support these standards: ${standardsPromptString}.` : ''}
                ${effCustomInstructions ? `Instructions: ${effCustomInstructions}.` : ''}
                ${useEmojis ? 'Use emojis only when they help students understand the scaffold.' : 'Do not use emojis.'}
                Return ONLY valid JSON.
                If the type is Paragraph Frame, use:
                { "mode": "paragraph", "text": "A fill-in-the-blank paragraph using [blank].", "rubric": "| Criteria | 1 | 3 | 5 |\\n|---|---|---|---|\\n| Content | ... | ... | ... |" }
                Otherwise use:
                { "mode": "list", "items": [{ "text": "Sentence starter or discussion prompt" }], "rubric": "| Criteria | 1 | 3 | 5 |\\n|---|---|---|---|\\n| Content | ... | ... | ... |" }
                Source excerpt:
                """
                ${localExcerpt(textToProcess, 5500)}
                """
             `;
             setGenerationStep(t('status_steps.constructing_scaffolds'));
             setGenerationTaskProgress(0, 1, t('status_steps.constructing_scaffolds'));
             const result = await callGemini(prompt, true);
             content = parseJsonLenient(result, {});
             if (!content || typeof content !== 'object' || Array.isArray(content)) content = {};
             if (!content.mode) content.mode = localMode;
             if (content.mode === 'list' && (!content.items || !Array.isArray(content.items))) {
                 content.items = content.starters || content.prompts || [];
             }
             if (content.mode === 'paragraph' && !content.text) {
                 content.text = content.paragraph || "";
             }
             if (content.mode === 'list') {
                 content.items = (content.items || []).slice(0, 8)
                     .map(item => ({ text: String((item && item.text) || item || '').trim() }))
                     .filter(item => item.text);
             }
             if ((content.mode === 'list' && (!content.items || !content.items.length)) || (content.mode === 'paragraph' && !content.text)) {
                 throw new Error("Failed to parse Scaffolds JSON. The AI response was not valid.");
             }
             content.rubric = content.rubric || "| Criteria | 1 | 3 | 5 |\n|---|---|---|---|\n| Content | Needs support | Clear | Strong and specific |\n| Use of Scaffold | Incomplete | Mostly complete | Complete and thoughtful |\n| Mechanics | Many errors | Some errors | Clear and polished |";
             metaInfo = `${frameType} - ${effectiveLanguage} - Local`;
             setGenerationTaskProgress(1, 1, t('status_steps.constructing_scaffolds'));
         } else {
         const prompt = `
            Create writing supports (Scaffolds) based on the text below for ${effectiveGrade} students.
            Type: ${frameType}
            Language: ${effectiveLanguage}.
            ${dokDirective}
            ${studentInterests.length > 0 ? `Context: Relate to ${studentInterests.join(', ')} if possible.` : ''}
            ${effCustomInstructions ? `Instructions: ${effCustomInstructions}` : ''}
            ${standardsPromptString ? `Design scaffolds to support the skills required by Standards: "${standardsPromptString}".` : ''}
            ${_xlate.enabled ? `Provide ${glossLang} translations for all text.` : 'Do NOT provide translations.'}
            ${dialectInstruction}
            ${useEmojis ? 'Include relevant emojis in the sentence starters or prompts.' : 'Do not use emojis.'}
            Output Requirements:
            1. Scaffolds:
               - If "Sentence Starters": Provide 5-8 distinct sentence beginnings that help students structure an answer or argument about the text.
               - If "Paragraph Frame": Provide a fill-in-the-blank paragraph structure. Use [blank] (bracketed text) to indicate where students should write.
               - If "Discussion Prompts": Provide 3-5 provocative discussion questions.
            2. Grading Rubric:
               - Create a Markdown table rubric (Criteria vs Levels 1-5) specifically for this activity.
               - Include criteria for Content, Use of Scaffolds, and Mechanics.
            Return ONLY a JSON object with this structure:
            {
                "mode": "list" (for Starters/Prompts) OR "paragraph" (for Frame),
                "items": [{ "text": "..."${_xlate.enabled ? ', "text_en": "..."' : ''} }] (if mode is list),
                "text": "..." (if mode is paragraph)${_xlate.enabled ? ', "text_en": "..."' : ''},
                "rubric": "Markdown string of the rubric table",
            }
            ${differentiationContext}
            Text: "${textToProcess}"
         `;
         setGenerationStep(t('status_steps.constructing_scaffolds'));
         const result = await callGemini(prompt, true);
         try {
             content = JSON.parse(cleanJson(result));
             if (!content.mode) content.mode = frameType === 'Paragraph Frame' ? 'paragraph' : 'list';
             if (content.mode === 'list' && (!content.items || !Array.isArray(content.items))) {
                 content.items = content.starters || content.prompts || [];
             }
             if (content.mode === 'paragraph' && !content.text) {
                 content.text = content.paragraph || "";
             }
             metaInfo = `${frameType} - ${effectiveLanguage}`;
         } catch (parseErr) {
             warnLog("Scaffolds Parse Error:", parseErr);
             throw new Error("Failed to parse Scaffolds JSON. The AI response was not valid.");
         }
         }
      } else if (type === 'alignment-report') {
         // Plan O Step 1.5: ungated. The audit runs even without target standards
         // — the standards-alignment LLM call is skipped (see line 1935 below)
         // and the comprehensive dimensions still produce a meaningful report.
         const auditScopeSelection = selectCurriculumArtifacts(generationHistory, configOverride || {});
         const artifactsToAudit = auditScopeSelection.artifacts;
         if (artifactsToAudit.length === 0) {
             throw new Error("No resources found to audit. Please generate a Lesson Plan, Text, or Quiz first.");
         }
         const getAuditText = (item) => {
             const extractedText = extractAuditArtifactText(item);
             if (extractedText) return extractedText;
             const d = item.data;
             if (!d) return "No content.";
             if (typeof d === 'string') return d;
             switch (item.type) {
                 case 'lesson-plan':
                     return `
                     OBJECTIVES: ${Array.isArray(d.objectives) ? d.objectives.join('; ') : d.objectives}
                     ESSENTIAL QUESTION: ${d.essentialQuestion}
                     DIRECT INSTRUCTION: ${d.directInstruction}
                     GUIDED PRACTICE: ${d.guidedPractice}
                     INDEPENDENT PRACTICE: ${d.independentPractice}
                     ASSESSMENT/CLOSURE: ${d.closure}
                     `;
                 case 'quiz':
                     if (!d.questions) return t('export.no_questions');
                     return d.questions.map((q, i) => `Q${i+1}: ${q.question} (Correct: ${q.correctAnswer})`).join('\n');
                 case 'glossary':
                     if (!Array.isArray(d)) return t('export.no_terms');
                     return d.map(gItem => `${t('export.term_label')} ${gItem.term} - ${t('export.def_label')} ${gItem.def}${gItem.etymology ? ` — Roots: ${gItem.etymology}` : ''}`).join('; ');
                 case 'sentence-frames':
                     return d.mode === 'list'
                         ? (d.items ? d.items.map(i => i.text).join('\n') : '')
                         : d.text;
                 case 'outline':
                     return `${t('export.main_label')} ${d.main}. ${t('export.structure_label')} ${d.branches?.map(b => `${b.title} (${b.items?.join(', ')})`).join('; ')}`;
                 case 'timeline':
                       if (!Array.isArray(d)) return t('export.no_events');
                       return d.map(evt => `${evt.date}: ${evt.event}`).join('\n');
                 case 'concept-sort':
                       if (!d.categories || !d.items) return t('export.incomplete_sort');
                       return `${t('export.categories_label')} ${d.categories.map(c => c.label).join(', ')}. ${t('export.items_label')} ${d.items.map(i => i.content).join(', ')}`;
                 case 'math':
                       const probs = d.problems || [d];
                       return probs.map(p => `${t('export.problem_label')} ${formatMathQuestion(p)}. ${t('export.answer_label')} ${p.answer}`).join('\n');
                 case 'brainstorm':
                       if (!Array.isArray(d)) return t('export.no_ideas');
                       return d.map(b => `${t('export.activity_label')} ${b.title} - ${b.description}`).join('\n');
                 case 'adventure':
                       return `${t('export.scenario_label')} ${d.currentScene?.text || t('export.no_active_scene')}`;
                 case 'persona':
                       if (!Array.isArray(d)) return t('export.no_personas');
                       return d.map(p => `${t('export.interview_figure_label')} ${p.name} (${p.role})`).join('\n');
                 case 'analysis':
                       return `${t('export.analysis_source_label')} ${d.readingLevel?.range || t('export.unknown_level')}. ${t('export.key_concepts_label')} ${d.concepts?.join(', ')}.`;
                 default:
                     try { return JSON.stringify(d).substring(0, 500); }
                     catch (circErr) { return `[${item.type} content]`; }
             }
         };
         const failedTypes = [];
         const auditArtifactRoster = artifactsToAudit.map((item) => JSON.stringify({
             id: item && item.id ? String(item.id) : '',
             title: String(item && (item.title || getDefaultTitle(item.type)) || item.type || 'Artifact'),
             type: String(item && item.type || 'unknown')
         })).filter(Boolean).join("\n");
         const safeGetAuditText = (item) => {
             try {
                 const txt = getAuditText(item);
                 if (typeof txt === 'string') return txt;
                 try { return JSON.stringify(txt).substring(0, 500); }
                 catch (circErr) {
                     failedTypes.push(item.type);
                     return `[${item.type} content]`;
                 }
             } catch (e) {
                 failedTypes.push(item.type);
                 warnLog(`[Alignment] Failed to serialize ${item.type} artifact:`, e);
                 return `[${item.type} content could not be serialized for audit]`;
             }
         };
         let comprehensiveContext = "";
         const MAX_TOTAL_CONTEXT = 30000;
         let contextOverflowed = false;
         artifactsToAudit.forEach((item, index) => {
             if (contextOverflowed) return;
             const label = item.title || getDefaultTitle(item.type);
             let contentStr = safeGetAuditText(item);
             if (contentStr.length > 2500) contentStr = contentStr.substring(0, 2500) + "... [truncated]";
             const chunk = `\n--- ARTIFACT ${index + 1}: ${label.toUpperCase()} (${item.type}) ---\n${contentStr}\n`;
             if (comprehensiveContext.length + chunk.length > MAX_TOTAL_CONTEXT) {
                 comprehensiveContext += `\n--- [Additional ${artifactsToAudit.length - index} artifact(s) omitted to fit audit window] ---\n`;
                 contextOverflowed = true;
                 return;
             }
             comprehensiveContext += chunk;
         });
         if (failedTypes.length > 0) {
             const uniq = Array.from(new Set(failedTypes));
             warnLog(`[Alignment] ${failedTypes.length} artifact(s) could not be serialized. Types: ${uniq.join(', ')}`);
         }
         const prompt = `
            Act as a strict District Curriculum Administrator conducting a **Holistic Lesson Plan Audit**.
            Your goal is to certify if the ENTIRE COLLECTION of generated resources aligns with the Target Standards.
            TARGET STANDARDS: "${standardsPromptString}"
            TARGET GRADE LEVEL: ${gradeLevel}
            --- EXACT ARTIFACT ID ROSTER (use these IDs only) ---
            ${auditArtifactRoster}
            Use artifactIds only when evidence clearly comes from those exact artifacts. Never invent or guess IDs; return [] when attribution is unclear.
            When artifactIds are present, set attributionSource to "audit-model". Do not use "teacher" or "deterministic-check" unless the input explicitly supplies that source label.
            --- LESSON ARTIFACTS SUBMITTED FOR AUDIT ---

            ${comprehensiveContext}
            --- AUDIT PROTOCOL ---
            Perform the Audit Protocol for EACH standard provided:
            1. DECONSTRUCT: Break the standard into required Content (Nouns) and Skills (Verbs/DOK).
            2. HOLISTIC EVIDENCE GATHERING: Look across ALL artifacts provided above.
               - **Instructional Alignment:** Does the Lesson Plan and Text teach the required content?
               - **Activity Alignment:** Do the Scaffolds, Organizers, and Games (Timeline/Sorts) force students to practice the specific skills?
               - **Assessment Alignment:** Does the Quiz or Adventure outcome verify mastery of the standard?
            3. GAP ANALYSIS: If a standard requires "Analysis," but the resources only provide "Recall" (Glossary/Basic Quiz), mark it as Partially Aligned.
            Return ONLY JSON with this structure:
            {
              "reports": [
                {
                    "standard": "The specific Standard Code being audited",
                    "standardBreakdown": { "cognitiveDemand": "...", "contentFocus": "..." },
                    "analysis": {
                        "textAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "artifactIds": ["exact artifact ID from roster"],
                            "attributionSource": "audit-model",
                            "evidence": "Cites specific artifacts (e.g. 'The Lesson Plan Hook covers...')",
                            "notes": "...",
                        },
                        "activityAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "artifactIds": ["exact artifact ID from roster"],
                            "attributionSource": "audit-model",
                            "evidence": "Cites specific artifacts (e.g. 'The Concept Sort requires distinguishing...', 'The Timeline builds sequence...')",
                            "notes": "Evaluation of how these activities practice the standard's skills.",
                        },
                        "assessmentAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "artifactIds": ["exact artifact ID from roster"],
                            "attributionSource": "audit-model",
                            "evidence": "Cites specific artifacts (e.g. 'Quiz Question 3 tests...')",
                            "notes": "...",
                        }
                    },
                    "overallDetermination": "Pass" | "Revise",
                    "gaps": ["List of specific missing elements or rigor gaps..."],
                    "findingAttributions": [{ "text": "Exact gap text from gaps", "artifactIds": ["exact artifact ID from roster"], "attributionSource": "audit-model" }],
                    "adminRecommendation": "Formal paragraph recommending next steps...",
                }
              ]
            }
         `;
         // ---- Standards alignment (LLM): only if standards are provided -----
         if (targetStandards.length > 0) {
             setGenerationStep && setGenerationStep('Auditing standards alignment...');
             const result = await callGemini(prompt, true);
             try {
                 content = JSON.parse(cleanJson(result));
                 metaInfo = `Standards: ${standardsPromptString}`;
             } catch (parseErr) {
                 warnLog("Alignment Report Parse Error (attempt 1):", parseErr);
                 try {
                     await new Promise(r => setTimeout(r, 750));
                     const retryPrompt = `${prompt}\n\nCRITICAL: Your previous response failed JSON.parse. Return ONLY a single valid JSON object matching the structure above. No prose, no markdown fences, no trailing commas.`;
                     const retryResult = await callGemini(retryPrompt, true);
                     content = JSON.parse(cleanJson(retryResult));
                     metaInfo = `Standards: ${standardsPromptString}`;
                 } catch (retryErr) {
                     warnLog("Alignment Report Parse Error (attempt 2):", retryErr);
                     throw new Error("Failed to parse Alignment Report JSON. The AI response was not valid.");
                 }
             }
         } else {
             // No standards provided: skip the alignment LLM call but still
             // produce a content object so the comprehensive dimensions can
             // attach. The render handles empty reports[] gracefully.
             content = { reports: [] };
             metaInfo = `Comprehensive audit (no target standards)`;
         }

         // ---- Comprehensive audit dimensions (parallel where possible) ------
         // Deterministic computations run synchronously first. Optional AI
         // reviews for the remaining dimensions are launched together below so
         // one slow review does not serialize the rest of the audit.
         const auditHarvest = harvestExistingAuditSignals(artifactsToAudit);
         content.comprehensive = content.comprehensive || {};
         auditScopeSelection.metadata.contextTruncated = contextOverflowed;
         auditScopeSelection.metadata.serializationFailures = Array.from(new Set(failedTypes));
         content.comprehensive.auditScope = auditScopeSelection.metadata;
         const auditLanguage = String(effectiveLanguage || currentUiLanguage || 'en');
         content.comprehensive.auditLanguage = auditLanguage;
         content.comprehensive.auditLanguageTag = normalizeAuditLanguageTag(auditLanguage);
         content.comprehensive.auditMetadata = {
             schemaVersion: 4,
             generatedAt: new Date().toISOString(),
             gradeLevel: String(effectiveGrade || gradeLevel || ''),
         };

         // ---- Standards alignment normalization -----------------------------
         // Fold the standards-alignment data (already produced by the LLM call
         // above when targetStandards exist) into comprehensive.standards so it
         // counts toward the readiness score and renders in the same dimension
         // framework as the others. content.reports is kept as a back-compat
         // alias but the canonical shape going forward is comprehensive.standards.
         const normalizedStandards = normalizeStandardsDimension(content.reports, targetStandards, { artifactIds: artifactsToAudit.map((item) => item && item.id).filter(Boolean) });
         content.reports = normalizedStandards.reports;
         content.comprehensive.standards = normalizedStandards.dimension;

         // ---- Sync deterministic compute (Steps 1, 2, 3, 5 stats) -----------
         // On compute failure, write a placeholder marker so the teacher sees
         // "Couldn't compute" instead of the dimension silently disappearing.
         const failedPlaceholder = (label, err) => ({
             status: 'Compute failed',
             computeFailed: true,
             error: err && err.message ? String(err.message).slice(0, 240) : 'Unknown error',
             notes: label + ' could not be computed for this audit. The error has been logged. Try regenerating the audit; if the problem persists, check the artifacts have the expected shape.',
         });

         let vocabFit = null;
         try {
             vocabFit = computeVocabularyFit(artifactsToAudit, gradeLevel, effectiveLanguage || currentUiLanguage || 'en');
             vocabFit.readingLevels = auditHarvest.readingLevels;
             content.comprehensive.vocabulary = vocabFit;
         } catch (vocabErr) {
             warnLog('[Alignment] Vocabulary fit computation failed:', vocabErr);
             content.comprehensive.vocabulary = failedPlaceholder('Vocabulary', vocabErr);
         }

         let engagement = null;
         try {
             engagement = computeEngagementVariety(auditHarvest, artifactsToAudit);
             content.comprehensive.engagement = engagement;
         } catch (engErr) {
             warnLog('[Alignment] Engagement variety computation failed:', engErr);
             content.comprehensive.engagement = failedPlaceholder('Engagement variety', engErr);
         }

         let accessibility = null;
         try {
             accessibility = computeContentAccessibility(artifactsToAudit, auditHarvest, gradeLevel);
             content.comprehensive.accessibility = accessibility;
         } catch (accErr) {
             warnLog('[Alignment] Accessibility computation failed:', accErr);
             content.comprehensive.accessibility = failedPlaceholder('Content accessibility', accErr);
         }

         let accuracy = null;
         try {
             accuracy = computeContentAccuracy(auditHarvest);
             content.comprehensive.accuracy = accuracy;
         } catch (accuracyErr) {
             warnLog('[Alignment] Content accuracy computation failed:', accuracyErr);
             content.comprehensive.accuracy = failedPlaceholder('Content accuracy', accuracyErr);
         }

         // ---- Plan R+ new dimensions: differentiation + cognitive load ----
         let differentiation = null;
         try {
             differentiation = computeDifferentiationCoverage(artifactsToAudit, auditHarvest, effectiveLanguage || currentUiLanguage || 'en');
             content.comprehensive.differentiation = differentiation;
         } catch (diffErr) {
             warnLog('[Alignment] Differentiation computation failed:', diffErr);
             content.comprehensive.differentiation = failedPlaceholder('Differentiation coverage', diffErr);
         }

         let cognitiveLoad = null;
         try {
             const sourceWords = (vocabFit && typeof vocabFit.sourceWords === 'number') ? vocabFit.sourceWords : 0;
             cognitiveLoad = computeCognitiveLoad(artifactsToAudit, sourceWords, gradeLevel);
             content.comprehensive.cognitiveLoad = cognitiveLoad;
         } catch (clErr) {
             warnLog('[Alignment] Cognitive load computation failed:', clErr);
             content.comprehensive.cognitiveLoad = failedPlaceholder('Cognitive load / pacing', clErr);
         }

         // Shared grade band derived once for all dimensions
         const dimGradeBand = (vocabFit && vocabFit.expected && vocabFit.expected.gradeBand) || gradeLevel;

         // ---- Async LLM reviews (parallel) ---------------------------------
         setGenerationStep && setGenerationStep('Running 8 audit dimensions in parallel...');

         // Each task is self-contained: build prompt → call → parse → apply.
         // Tasks return null on any failure; failures are logged but don't
         // block other dimensions or the overall audit.
         const vocabTask = (vocabFit && !vocabFit.notEvaluated) ? (async () => {
             const fp = 'vocab:' + _auditFingerprint(artifactsToAudit, gradeLevel);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.vocabulary.llmReview = cached; applyAuditReviewStatus(content.comprehensive.vocabulary, cached); return; }
             try {
                 const contextSnippet = (comprehensiveContext || '').slice(0, 4000);
                 const prompt = `You are a literacy coach reviewing a heuristic vocabulary classification.\n\nThe system classified words from a lesson as:\n- Tier 1 (everyday): ${vocabFit.tier1Count} unique words\n- Tier 2 (academic, cross-disciplinary): ${vocabFit.tier2Count} unique words. Examples flagged by the heuristic: ${(vocabFit.tier2Examples || []).join(', ') || '(none)'}\n- Tier 3 (domain-specific): ${vocabFit.tier3Count} unique words. Examples flagged: ${(vocabFit.tier3Examples || []).join(', ') || '(none)'}\n\nGrade band: ${vocabFit.expected.gradeBand}\nExpected per Beck/McKeown norms: ~${vocabFit.expected.tier2} Tier 2 + ~${vocabFit.expected.tier3} Tier 3 unique words.\n\nSource text excerpt (first 4000 chars):\n"""\n${contextSnippet}\n"""\n\nReview the heuristic classifications and provide:\n1. "corrections": array of words from the Tier 2 examples that the heuristic got WRONG (i.e., they're really Tier 1 everyday words). Common false positives to watch for: long-but-common words like "tomorrow", "remember", "different", "without", "morning".\n2. "missedTier2": array of 2-4 Tier 2 academic words that ARE in the source text but the heuristic likely missed (e.g., shorter words like "claim", "reveal", "trace", "frame" that appear academically).\n3. "recommendations": array of 2-3 specific Tier 2 academic words to ADD to this lesson, contextually appropriate to the topic and grade band. Each recommendation must be one to three words.\n4. "narrative": ONE paragraph (2-3 sentences) summarizing whether the lesson's vocabulary load is appropriate for the grade band, and what the most important next move is.\n\nReturn ONLY a single valid JSON object with exactly these four fields. No prose outside the JSON, no markdown fences.`;
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned". Base it on grade appropriateness and scaffolding needs.', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, vocabFit.status),
                     corrections: Array.isArray(review.corrections) ? review.corrections.slice(0, 12) : [],
                     missedTier2: Array.isArray(review.missedTier2) ? review.missedTier2.slice(0, 8) : [],
                     recommendations: Array.isArray(review.recommendations) ? review.recommendations.slice(0, 6) : [],
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                 };
                 content.comprehensive.vocabulary.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.vocabulary, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Vocab LLM review failed:', e); }
         })() : Promise.resolve();

         const engagementTask = engagement ? (async () => {
             const fp = 'engagement:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.engagement.llmReview = cached; applyAuditReviewStatus(content.comprehensive.engagement, cached); return; }
             try {
                 // DOK fallback: when engagement.dokTotal === 0 BUT a quiz exists in the
                 // artifacts (i.e., the quiz generator didn't tag DOK levels), pass the
                 // actual quiz questions to the LLM so it can estimate DOK rather than
                 // falsely report "no quiz items." Verified bug from Solar System audit.
                 const quizItem = artifactsToAudit.find(function (h) { return h && h.type === 'quiz' && h.data; });
                 const hasQuiz = !!(quizItem && quizItem.data && Array.isArray(quizItem.data.questions) && quizItem.data.questions.length > 0);
                 const needsDokFallback = hasQuiz && (engagement.dokTotal === 0 || !engagement.dokTotal);
                 const quizSnippet = needsDokFallback
                     ? quizItem.data.questions.slice(0, 12).map(function (q, i) {
                         var qt = (q && (q.question || q.text)) ? String(q.question || q.text) : '';
                         return (i + 1) + '. ' + qt.slice(0, 220);
                       }).join('\n')
                     : '';
                 const dokFallbackBlock = needsDokFallback
                     ? '\n\nDOK FALLBACK NEEDED: This quiz has ' + quizItem.data.questions.length + ' questions but no DOK metadata. Estimate DOK distribution from the question stems below. Return percentages summing to 100. Examples:\n' + quizSnippet
                     : '';
                 const dokInstruction = needsDokFallback
                     ? '3. "dokAssessment": ONE sentence on the estimated DOK distribution from the questions above (e.g., "Estimated ~70% L1 recall, ~25% L2, ~5% L3; add 2-3 strategic-thinking items").\n4. "estimatedDokDistribution": object with percentage estimates {"L1": int, "L2": int, "L3": int, "L4": int} based on the questions above (must sum to 100).'
                     : '3. "dokAssessment": ONE sentence on whether the DOK balance is appropriate (e.g., "DOK skews recall-heavy; add 2-3 application-level questions" or "DOK distribution is well-balanced for ' + dimGradeBand + '"). If dokTotal is 0, say "No quiz items present to evaluate DOK."';
                 const prompt = `You are an expert in UDL (Universal Design for Learning) and Webb's Depth of Knowledge framework. Review the engagement-variety profile of this curriculum.\n\nDeterministic stats:\n- Distinct artifact types: ${engagement.distinctTypeCount} (${engagement.distinctTypes.join(', ')})\n- Total artifacts: ${engagement.totalArtifacts}\n- Diversity score: ${engagement.diversityScore} (0=single type, 1=balanced)\n- DOK distribution (% of quiz items, ${engagement.dokTotal} total): L1=${engagement.dokDistribution.L1 || 0}%, L2=${engagement.dokDistribution.L2 || 0}%, L3=${engagement.dokDistribution.L3 || 0}%, L4=${engagement.dokDistribution.L4 || 0}%, unknown=${engagement.dokDistribution.unknown || 0}%\n- Scaffolds: ${engagement.scaffoldCounts.sentenceFrames} sentence-frames sets, ${engagement.scaffoldCounts.simplifiedTexts} simplified texts, ${engagement.scaffoldCounts.leveledGlossary} leveled glossaries\n- Modalities present: ${engagement.multimodalCoverage.present.join(', ') || '(none)'}\n- Modalities missing: ${engagement.multimodalCoverage.missing.join(', ') || '(none)'}\n- Grade band: ${dimGradeBand}${dokFallbackBlock}\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether engagement variety is appropriate for the grade band and what is most needed.\n2. "formatGaps": array of 1-3 specific format additions that would most improve engagement (e.g., "add a Visual Organizer to give visual learners a non-text path through the content", "add a brief Adventure scenario for kinesthetic engagement"). Each entry should be a sentence.\n${dokInstruction}\n\nReturn ONLY a single valid JSON object with exactly these fields.`;
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned".', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, engagement.status),
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     formatGaps: Array.isArray(review.formatGaps) ? review.formatGaps.slice(0, 5) : [],
                     dokAssessment: typeof review.dokAssessment === 'string' ? review.dokAssessment : '',
                 };
                 // If LLM estimated DOK distribution as fallback, attach it to engagement directly
                 // so the render shows the bar chart instead of "no quiz items."
                 if (needsDokFallback && review.estimatedDokDistribution && typeof review.estimatedDokDistribution === 'object') {
                     const est = review.estimatedDokDistribution;
                     const safeNum = function (v) { return typeof v === 'number' && v >= 0 ? Math.round(v) : 0; };
                     content.comprehensive.engagement.dokDistribution = {
                         L1: safeNum(est.L1),
                         L2: safeNum(est.L2),
                         L3: safeNum(est.L3),
                         L4: safeNum(est.L4),
                         unknown: 0,
                     };
                     content.comprehensive.engagement.dokTotal = quizItem.data.questions.length;
                     content.comprehensive.engagement.dokSource = 'llm-estimated';
                     if (content.comprehensive.engagement.dokDistribution.L1 > 80) {
                         content.comprehensive.engagement.status = worseAuditStatus(content.comprehensive.engagement.status, 'Partially Aligned');
                     }
                 }
                 content.comprehensive.engagement.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.engagement, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Engagement LLM review failed:', e); }
         })() : Promise.resolve();

         const accessTask = accessibility ? (async () => {
             const fp = 'accessibility:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.accessibility.llmReview = cached; applyAuditReviewStatus(content.comprehensive.accessibility, cached); return; }
             try {
                 const prompt = `You are a school accessibility specialist (school psychologist with assistive-technology expertise). Review the content-level accessibility of this curriculum.\n\nDeterministic findings:\n- Total images: ${accessibility.totalImages} (${accessibility.imagesWithAlt} with alt text${accessibility.altCoveragePct !== null ? ', ' + accessibility.altCoveragePct + '% coverage' : ''})\n- Color-only language hits: ${accessibility.colorOnlyCount}${accessibility.colorOnlyExamples.length > 0 ? ' (examples: ' + accessibility.colorOnlyExamples.slice(0, 3).join(' | ') + ')' : ''}\n- Implicit image references: ${accessibility.implicitImageCount}${accessibility.implicitImageExamples.length > 0 ? ' (examples: ' + accessibility.implicitImageExamples.slice(0, 3).join(' | ') + ')' : ''}\n- Longest unbroken passage: ${accessibility.longestUnbrokenPassage} words\n- Grade band: ${dimGradeBand}\n\nSource text excerpt (first 3000 chars):\n"""\n${(comprehensiveContext || '').slice(0, 3000)}\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on overall content accessibility for this grade band. Focus on student impact (what would a student with X experience here?), not WCAG terminology.\n2. "studentImpacts": array of 1-3 specific student-experience callouts. Each entry pairs a student profile with what they would encounter, e.g., "A student using a screen reader would hear 'image' with no description for 3 of the 4 figures, missing the visual evidence for the photosynthesis diagram." Be specific and concrete.\n3. "fixes": array of 2-4 actionable fix suggestions a teacher could apply to THIS content. Each fix should be a sentence, concrete, and tied to the specific findings.\n\nReturn ONLY a single valid JSON object with exactly these three fields.`;
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned". Do not call this a WCAG conformance assessment.', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, accessibility.status),
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     studentImpacts: Array.isArray(review.studentImpacts) ? review.studentImpacts.slice(0, 5) : [],
                     fixes: Array.isArray(review.fixes) ? review.fixes.slice(0, 6) : [],
                 };
                 content.comprehensive.accessibility.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.accessibility, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Accessibility LLM review failed:', e); }
         })() : Promise.resolve();

         // UDL is pure-LLM (no deterministic stats; uses harvest priors)
         const udlTask = (async () => {
             const fp = 'udl:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.udl = cached; return; }
             try {
                 const modPresent = auditHarvest.multimodal || {};
                 const scaffoldCounts = auditHarvest.scaffoldCounts || {};
                 const distinctTypes = Array.from(auditHarvest.distinctTypes || []);
                 const prompt = `You are a CAST-trained UDL specialist evaluating a curriculum against the three Universal Design for Learning principles (CAST UDL Guidelines v3.0). Each principle has its own pillar. Rate each pillar individually, not the curriculum as a whole.\n\nCurriculum profile (deterministic):\n- Distinct artifact types: ${distinctTypes.join(', ') || '(none)'}\n- Modalities: text=${!!modPresent.text}, image=${!!modPresent.image}, audio=${!!modPresent.audio}, interactive=${!!modPresent.interactive}\n- Scaffolds: ${scaffoldCounts.sentenceFrames || 0} sentence-frame sets, ${scaffoldCounts.simplifiedTexts || 0} simplified texts, ${scaffoldCounts.leveledGlossary || 0} leveled glossaries\n- Reading levels: ${(auditHarvest.readingLevels || []).map(r => r.range).join('; ') || '(none)'}\n- Grade band: ${dimGradeBand}\n\nSource excerpt (first 2500 chars):\n"""\n${(comprehensiveContext || '').slice(0, 2500)}\n"""\n\nFor EACH UDL pillar, evaluate using these prompts:\n\n1. REPRESENTATION (how is content presented?). Multiple ways to access the same content? Visual + auditory + text + interactive? Customizable display? Vocabulary support? Activate background knowledge? Highlight patterns?\n\n2. ENGAGEMENT (why do learners invest effort?). Choices/autonomy? Authenticity, relevance, cultural responsiveness? Optimal challenge with scaffolds? Sustained-effort supports (goal-setting, feedback, self-reflection)?\n\n3. ACTION & EXPRESSION (how do learners demonstrate what they know?). Multiple ways to respond (writing, speaking, drawing, building, performing)? Tools and assistive-tech support? Goal-setting and progress-monitoring scaffolds?\n\nReturn ONLY a single valid JSON object:\n{\n  "representation": { "status": "Aligned"|"Partially Aligned"|"Not Aligned", "evidence": "...", "gaps": "...", "recommendation": "ONE sentence" },\n  "engagement":     { "status": "...", "evidence": "...", "gaps": "...", "recommendation": "..." },\n  "actionExpression":{ "status": "...", "evidence": "...", "gaps": "...", "recommendation": "..." },\n  "overallNarrative": "ONE paragraph (2-3 sentences) summarizing UDL alignment and naming the most pressing pillar to strengthen",\n  "overallStatus": "Aligned"|"Partially Aligned"|"Not Aligned"\n}\n\nNo prose outside the JSON. No markdown fences. No trailing commas.`;
                 const result = await callGemini(prompt, true);
                 let udl;
                 try {
                     udl = JSON.parse(cleanJson(result));
                 } catch (firstParseErr) {
                     warnLog('[Alignment] UDL JSON parse failed (attempt 1), retrying:', firstParseErr);
                     await new Promise(r => setTimeout(r, 750));
                     const retryPrompt = prompt + '\n\nCRITICAL: Your previous response failed JSON.parse with: ' + String(firstParseErr.message || '').slice(0, 120) + '. Return ONLY a single valid JSON object. No prose, no markdown fences, no trailing commas.';
                     const retryResult = await callGemini(retryPrompt, true);
                     udl = JSON.parse(cleanJson(retryResult));
                 }
                 const pillarShape = function (p) {
                     const safe = p && typeof p === 'object' ? p : {};
                     return {
                         status: normalizeAuditStatus(safe.status, 'Partially Aligned'),
                         evidence: typeof safe.evidence === 'string' ? safe.evidence : '',
                         gaps: typeof safe.gaps === 'string' ? safe.gaps : '',
                         recommendation: typeof safe.recommendation === 'string' ? safe.recommendation : '',
                     };
                 };
                 const udlShape = {
                     status: normalizeAuditStatus(udl.overallStatus, 'Partially Aligned'),
                     overallNarrative: typeof udl.overallNarrative === 'string' ? udl.overallNarrative : '',
                     representation: pillarShape(udl.representation),
                     engagement: pillarShape(udl.engagement),
                     actionExpression: pillarShape(udl.actionExpression),
                     priorsUsed: {
                         distinctTypes: distinctTypes,
                         modalitiesPresent: ['text','image','audio','interactive'].filter(function (m) { return !!modPresent[m]; }),
                         scaffoldCounts: scaffoldCounts,
                     },
                     notes: 'Per CAST UDL Guidelines v3.0. Each pillar evaluated against the deterministic curriculum profile + LLM judgment of the source content.',
                 };
                 udlShape.status = [udlShape.representation.status, udlShape.engagement.status, udlShape.actionExpression.status]
                     .reduce(function (current, status) { return worseAuditStatus(current, status); }, 'Aligned');
                 content.comprehensive.udl = udlShape;
                 _auditLLMCache.set(fp, udlShape);
             } catch (e) {
                 warnLog('[Alignment] UDL evaluation failed:', e);
                 if (!content.comprehensive.udl) {
                     content.comprehensive.udl = {
                         status: 'Compute failed',
                         computeFailed: true,
                         error: e && e.message ? String(e.message).slice(0, 240) : 'UDL LLM call failed or response could not be parsed.',
                         notes: 'UDL principles evaluation could not complete. The error has been logged. Try regenerating the audit.',
                     };
                 }
             }
         })();

         const accuracyTask = accuracy ? (async () => {
             const fp = 'accuracy:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.accuracy.llmReview = cached; applyAuditReviewStatus(content.comprehensive.accuracy, cached); return; }
             try {
                 const prompt = `You are a fact-checking editor reviewing a curriculum's content accuracy. The lesson's source text was previously analyzed and AI-graded for accuracy.\n\nDeterministic harvest from analysis items:\n- Total analyses run: ${accuracy.totalAnalyses}\n- Accuracy ratings: ${accuracy.accuracyRatingCounts.high} High, ${accuracy.accuracyRatingCounts.medium} Medium, ${accuracy.accuracyRatingCounts.low} Low\n- Total verified facts: ${accuracy.totalVerifiedFacts}\n- Total discrepancies flagged: ${accuracy.totalDiscrepancies}\n- Grade band: ${dimGradeBand}\n\nSample analysis verifications (first 3):\n${accuracy.sampleVerifications.slice(0, 3).map((s, i) => `  ${i+1}. Rating: ${s.rating}, ${s.verifiedFactCount} verified, ${s.discrepancyCount} discrepancies. Reason: "${(s.reason || '').slice(0, 200)}"`).join('\n') || '(no analyses available)'}\n\nFull source excerpt (first 3000 chars):\n"""\n${(comprehensiveContext || '').slice(0, 3000)}\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on overall content accuracy. If no analyses have been run, explicitly suggest running "Analyze Source Text" before deploying this curriculum.\n2. "claimsToVerify": array of 1-4 specific factual claims in NON-analysis artifacts (quiz questions, glossary definitions, lesson-plan facts) that a teacher should double-check. Each entry should be the actual claim quoted or paraphrased. Focus on claims with measurable risk (specific dates, numbers, named people/places, scientific assertions).\n3. "fixes": array of 1-3 actionable suggestions for improving accuracy ("add citations to the quiz answers", "verify the dates in the timeline against a primary source", etc.).\n\nReturn ONLY a single valid JSON object with exactly these three fields. No prose outside the JSON.`;
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned".', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, accuracy.status),
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     claimsToVerify: Array.isArray(review.claimsToVerify) ? review.claimsToVerify.slice(0, 6) : [],
                     fixes: Array.isArray(review.fixes) ? review.fixes.slice(0, 5) : [],
                 };
                 content.comprehensive.accuracy.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.accuracy, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Accuracy LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Differentiation review (LLM grades the scaffold mix) ---
         const differentiationTask = (differentiation && !differentiation.computeFailed) ? (async () => {
             const fp = 'differentiation:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.differentiation.llmReview = cached; applyAuditReviewStatus(content.comprehensive.differentiation, cached); return; }
             try {
                 const flags = differentiation.flags || {};
                 const present = Object.keys(flags).filter(function (k) { return flags[k]; });
                 const missing = differentiation.missing || [];
                 const prompt = 'You are a UDL specialist reviewing how a curriculum supports learner variability.\n\nDeterministic scaffold inventory (' + differentiation.coverage + '% coverage):\n- Present: ' + (present.join(', ') || '(none)') + '\n- Missing: ' + (missing.join(', ') || '(none)') + '\n\nGrade band: ' + dimGradeBand + '\n\nSource excerpt (first 2000 chars):\n"""\n' + (comprehensiveContext || '').slice(0, 2000) + '\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether the scaffold mix realistically serves the range of learners typical at this grade band. Name the most impactful missing scaffold for THIS content (some content needs visuals more than text-leveling; some needs audio more than visuals).\n2. "priorityAdditions": array of 1-3 specific scaffold-add suggestions ranked by impact for the grade band and topic. Each entry one short sentence.\n3. "qualityFlags": array of 0-2 sentences flagging any present-but-likely-thin scaffolds (e.g., "glossary present but only 4 terms — consider expanding for ELL support").\n\nReturn ONLY a single valid JSON object with exactly these three fields.';
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned".', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, differentiation.status),
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     priorityAdditions: Array.isArray(review.priorityAdditions) ? review.priorityAdditions.slice(0, 5) : [],
                     qualityFlags: Array.isArray(review.qualityFlags) ? review.qualityFlags.slice(0, 4) : [],
                 };
                 content.comprehensive.differentiation.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.differentiation, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Differentiation LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Cognitive load review (LLM judges pacing realism) ------
         const cognitiveLoadTask = (cognitiveLoad && !cognitiveLoad.notApplicable && !cognitiveLoad.computeFailed) ? (async () => {
             const fp = 'cognitiveLoad:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.cognitiveLoad.llmReview = cached; applyAuditReviewStatus(content.comprehensive.cognitiveLoad, cached); return; }
             try {
                 const segs = (cognitiveLoad.perSegment || []).map(function (s) { return s.label + ': ' + (s.claimedMinutes !== null ? s.claimedMinutes + ' min' : '(no time given)'); }).join('\n - ');
                 const prompt = 'You are an experienced classroom teacher reviewing a lesson plan for realistic pacing.\n\nClaimed segment durations:\n - ' + (segs || '(none)') + '\nClaimed total: ' + cognitiveLoad.claimedTotalMinutes + ' min\n\nDeterministic estimate of actual time required: ' + cognitiveLoad.estimatedTotalMinutes + ' min\n  - Reading: ' + cognitiveLoad.breakdown.reading + ' min (assumes ' + cognitiveLoad.breakdown.wpmAssumption + ' wpm at this grade)\n  - Quiz: ' + cognitiveLoad.breakdown.quiz + ' min\n  - Activities: ' + cognitiveLoad.breakdown.activities + ' min\n\nClaimed-vs-estimated ratio: ' + (cognitiveLoad.ratio || 'n/a') + '\nGrade band: ' + dimGradeBand + '\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether the pacing is realistic and what the most likely failure mode is (running out of time vs. dead time). Be specific about which segment is most likely the squeeze point.\n2. "specificAdjustments": array of 1-3 concrete adjustments ("trim source text to 800 words", "drop one quiz question", "split into 2 days"). Each entry one short sentence.\n\nReturn ONLY a single valid JSON object with exactly these two fields.';
                 const result = await callGemini(prompt + '\n\nAlso return a top-level "status" field: "Aligned", "Partially Aligned", or "Not Aligned".', true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     status: normalizeAuditStatus(review.status, cognitiveLoad.status),
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     specificAdjustments: Array.isArray(review.specificAdjustments) ? review.specificAdjustments.slice(0, 5) : [],
                 };
                 content.comprehensive.cognitiveLoad.llmReview = reviewShape;
                 applyAuditReviewStatus(content.comprehensive.cognitiveLoad, reviewShape);
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Cognitive load LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Cultural responsiveness (LLM-detected N/A) ---------------
         // First gate: does this content have human contexts/examples/perspectives
         // to evaluate? If not, dimension returns notApplicable and is excluded from
         // the readiness math.
         const culturalTask = (async () => {
             const fp = 'culturalResponsiveness:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.culturalResponsiveness = cached; return; }
             try {
                 const prompt = 'You are an experienced equity-and-inclusion educator reviewing a curriculum for cultural responsiveness.\n\nFIRST decide whether this content has human contexts, examples, perspectives, or named people that representation considerations apply to. Pure mechanics (math equations, phonics drills, titration steps) often do NOT — for those, return { "notApplicable": true, "reason": "Brief explanation of why representation considerations do not apply." }\n\nIf the content DOES have human surface area, evaluate:\n- Diversity of names, examples, settings, and perspectives represented\n- Avoidance of stereotypes or single-story framing\n- Inclusion of underrepresented or non-dominant perspectives where relevant\n- Asset-based (not deficit-based) framing of communities discussed\n\nGrade band: ' + dimGradeBand + '\n\nSource excerpt (first 3500 chars):\n"""\n' + (comprehensiveContext || '').slice(0, 3500) + '\n"""\n\nReturn ONLY a single valid JSON object. EITHER:\n  { "notApplicable": true, "reason": "..." }\nOR (when applicable):\n  {\n    "notApplicable": false,\n    "status": "Aligned" | "Partially Aligned" | "Not Aligned",\n    "narrative": "ONE paragraph (2-3 sentences) honestly assessing the representation. Avoid both inflation and over-criticism — name what is present, what is missing, and what one specific addition would most strengthen the lesson.",\n    "strengths": array of 0-3 specific things this content does well (named, concrete),\n    "gaps": array of 0-3 specific gaps (named, concrete, not generic),\n    "additions": array of 1-3 concrete suggestions for adding underrepresented perspectives, examples, or framings\n  }\n\nNo prose outside the JSON. No markdown fences. Be honest, not performative.';
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 if (review && review.notApplicable === true) {
                     content.comprehensive.culturalResponsiveness = {
                         status: 'Not applicable',
                         notApplicable: true,
                         reason: typeof review.reason === 'string' ? review.reason : 'Content has no human surface area to evaluate.',
                         notes: 'LLM judged this content does not have representation considerations to evaluate (e.g., pure mechanics, math equations, phonics drills).',
                     };
                 } else {
                     content.comprehensive.culturalResponsiveness = {
                         status: normalizeAuditStatus(review.status, 'Partially Aligned'),
                         narrative: typeof review.narrative === 'string' ? review.narrative : '',
                         strengths: Array.isArray(review.strengths) ? review.strengths.slice(0, 5) : [],
                         gaps: Array.isArray(review.gaps) ? review.gaps.slice(0, 5) : [],
                         additions: Array.isArray(review.additions) ? review.additions.slice(0, 5) : [],
                         notes: 'LLM-graded representation review. Inherently judgment-laden — treat findings as a starting point for teacher reflection, not a verdict.',
                     };
                 }
                 _auditLLMCache.set(fp, content.comprehensive.culturalResponsiveness);
             } catch (e) {
                 warnLog('[Alignment] Cultural responsiveness LLM call failed:', e);
                 content.comprehensive.culturalResponsiveness = {
                     status: 'Compute failed',
                     computeFailed: true,
                     error: e && e.message ? String(e.message).slice(0, 240) : 'Cultural responsiveness LLM call failed.',
                     notes: 'Cultural responsiveness evaluation could not complete.',
                 };
             }
         })();

         await Promise.all([vocabTask, engagementTask, accessTask, udlTask, accuracyTask, differentiationTask, cognitiveLoadTask, culturalTask]);

         // ---- Plan O Step 6: Curriculum Readiness Score (roll-up) -----------
         setGenerationStep && setGenerationStep('Computing curriculum readiness score...');
         try {
             const readiness = computeReadinessScore(content.comprehensive);
             if (readiness) {
                 content.comprehensive.overall = readiness;
             }
         } catch (rollupErr) {
             warnLog('[Alignment] Readiness score computation failed:', rollupErr);
         }
      } else if (type === 'timeline') {
         setGenerationStep(t('status_steps.extracting_sequence'));
         const effectiveCount = configOverride.timelineCount || timelineItemCount;
         // Second ambient fallback: even with effCustomInstructions suppressed,
         // this re-derives the topic from the open lesson. Isolated timelines
         // take their content from textToProcess (the DA directive) alone.
         const effectiveTopic = effCustomInstructions || (_isolatedContext ? '' : (timelineTopic || sourceTopic)) || "General Sequence";
         const effectiveMode = configOverride.timelineMode || timelineMode || 'auto';
         const isAutoMode = effectiveMode === 'auto';
         const modeDef = !isAutoMode ? TIMELINE_MODE_DEFINITIONS[effectiveMode] : null;
         const modeListForAuto = Object.entries(TIMELINE_MODE_DEFINITIONS)
             .map(([k, def]) => `  - "${k}": ${def.label} — ${def.description}. e.g., ${def.examples}`)
             .join('\n');
         const modeSection = isAutoMode ? `
             *** MODE SELECTION (AUTO-DETECT) ***
             Examine the source text AND the teacher's content hint below, then pick the single best ordering mode from this list:
${modeListForAuto}
             Teacher's content hint: "${effectiveTopic}" (may explicitly suggest a mode; if so, prefer that)
             Return your pick as "detectedMode": "<mode key>" in the JSON response.
             Use that mode's ordering criterion for the items.
         ` : `
             *** ORDERING MODE (LOCKED BY TEACHER) ***
             Mode: ${modeDef.label}
             Criterion: ${modeDef.description}
             Example positions: ${modeDef.examples}
             ${modeDef.guidance}
             The progressionLabel should follow the template: "${modeDef.labelTemplate}"
         `;
          let result = '';
          if (usesLocalTextBackend) {
          const localTimelineCount = Math.max(4, Math.min(Number(effectiveCount) || 6, 7));
          const prompt = `
             Extract one clear ordered sequence from the source excerpt.
             Audience: ${effectiveGrade} students.
             Language: ${effectiveLanguage}.
             ${standardsDirective}
             ${interestsDirective}
             ${emojiDirective}
             ${dokDirective}
             Focus: "${effectiveTopic}"
             ${isAutoMode ? 'Choose the best ordering mode from: chronological, procedural, lifecycle, size, hierarchy, cause-effect, intensity, narrative. Include it as "detectedMode".' : `Use this mode: ${modeDef.label}. Criterion: ${modeDef.description}.`}
             Generate ${localTimelineCount} or fewer items only if the order is unambiguous.
             Each item must be self-contained and clearly ordered.
             Return ONLY valid JSON:
             {
               ${isAutoMode ? '"detectedMode": "chronological",' : ''}
               "progressionLabel": "Order axis label",
               "items": [
                 { "date": "Position label", "event": "Standalone event or step" }
               ]
             }
             Source excerpt:
             """
             ${localExcerpt(textToProcess, 6500)}
             """
          `;
          setGenerationTaskProgress(0, 1, t('status_steps.extracting_sequence'));
          result = await callGemini(prompt, true);
          setGenerationTaskProgress(1, 1, t('status_steps.extracting_sequence'));
          } else {
          const prompt = `
             You are a Sequence Validation Expert. Your task is to extract or CREATE a SINGLE, UNAMBIGUOUS sequence from the provided text.
             Target Audience: ${effectiveGrade} students.
             Language: ${effectiveLanguage}.
             ${standardsDirective}
             ${interestsDirective}
             ${emojiDirective}
             ${dokDirective}
             Focus Topic / Content hint: "${effectiveTopic}"
             ${modeSection}
             *** FUNDAMENTAL REQUIREMENT ***
             There must be EXACTLY ONE CORRECT ORDER for the items you generate. A student must be able to determine the correct order purely from the item descriptions without guessing.
             *** VALIDATION RULES (You MUST verify each) ***
             Rule 1: BINARY COMPARABILITY - For any two items A and B, it must be objectively determinable which comes "before" or "after" on the axis.
             Rule 2: NO TIES - No two items can reasonably occupy the same position.
             Rule 3: NO AMBIGUOUS WORDING - Avoid vague terms. Use specifics: "1776" not "Colonial Era", "Cell" not "Small Structure".
             Rule 4: SELF-CONTAINED ITEMS - Each item must make sense in isolation (no "Then...", "Next...", "It...").
             Rule 5: EXTRACTABLE FROM TEXT - Items must be derivable from the source text (or clearly inferred logical steps).
             Rule 6: MINIMUM DISTINCTIVENESS - Each item must differ enough that its position is unambiguous.
             *** ITEM COUNT RULE ***
             Generate ONLY as many items as the text can clearly support with UNAMBIGUOUS ordering.
             - Minimum: 4 items (fewer = too easy, not enough to form a meaningful sequence)
             - Maximum: 10 items (more = overwhelming for students)
             - Preferred: ${effectiveCount ? effectiveCount : '5-7'} items if the text supports it
             - CRITICAL: Do NOT pad with items that have ambiguous positions just to reach a count.
             *** PRE-GENERATION CHECKLIST (Internal - do not output) ***
             Before generating, mentally verify:
             [ ] Can I state the SINGLE ordering criterion in one clear phrase?
             [ ] For every pair of items, can I definitively say which is "earlier/smaller/lower" on this axis?
             [ ] If I shuffled these items, would an informed student find exactly ONE correct arrangement?
             [ ] Are all items self-contained with no pronouns or relative words?
             ${_xlate.enabled ? `Provide ${glossLang} translations for all labels and descriptions.` : 'Do NOT provide translations.'}
             ${dialectInstruction}
             Return ONLY a JSON object with this structure:
             {
                 ${isAutoMode ? '"detectedMode": "<one of: chronological, procedural, lifecycle, size, hierarchy, cause-effect, intensity, narrative>",' : ''}
                 "progressionLabel": "AXIS: [Criterion Name] ([Low End] → [High End])",
                 ${_xlate.enabled ? `"progressionLabel_en": "${glossLang} translation of the label",` : ''}
                 "items": [
                     {
                         "date": "Specific Position (e.g., '1776', 'Step 1', '10 cm')",
                         ${_xlate.enabled ? '"date_en": "...",' : ''}
                         "event": "Complete, standalone description of this item",
                         ${_xlate.enabled ? '"event_en": "..."' : ''}
                     }
                 ]
             }
             EXAMPLE progressionLabel formats:
             - "Timeline: Earliest (1492) → Latest (1776)"
             - "Size Scale: Smallest (Atom) → Largest (Universe)"
             - "Process Steps: First (Observe) → Last (Conclude)"
             ${differentiationContext}
             Text: "${textToProcess}"
          `;
         result = await callGemini(prompt, true);
         }
         const parseTimelineResponse = (raw) => {
             const parsed = usesLocalTextBackend ? parseJsonLenient(raw, {}) : JSON.parse(cleanJson(raw));
             let itemsArray = [];
             let progressionLabel = t('timeline.progression_label_default') || 'Sequential Order';
             let progressionLabel_en = null;
             let detectedMode = null;
             if (parsed && !Array.isArray(parsed) && parsed.items) {
                 itemsArray = parsed.items;
                 if (parsed.progressionLabel) progressionLabel = parsed.progressionLabel;
                 if (parsed.progressionLabel_en) progressionLabel_en = parsed.progressionLabel_en;
                 if (parsed.detectedMode && TIMELINE_MODE_DEFINITIONS[parsed.detectedMode]) {
                     detectedMode = parsed.detectedMode;
                 }
             }
             else if (Array.isArray(parsed)) {
                 itemsArray = parsed;
             }
             else if (parsed) {
                 if (parsed.events) itemsArray = parsed.events;
                 else if (parsed.sequence) itemsArray = parsed.sequence;
                 else itemsArray = [];
             }
             const finalMode = isAutoMode ? (detectedMode || 'chronological') : effectiveMode;
             return {
                 progressionLabel,
                 progressionLabel_en,
                 items: itemsArray,
                 mode: finalMode,
                 autoDetected: isAutoMode
             };
         };
         try {
             content = parseTimelineResponse(result);
             if (usesLocalTextBackend && (!content.items || !content.items.length)) {
                 throw new Error("Local timeline response did not include sequence items.");
             }
             metaInfo = `${t('meta.events_count', { count: content.items.length })}${usesLocalTextBackend ? ' - Local' : ''}`;
         } catch (parseErr) {
             warnLog("Timeline Parse Error (attempt 1):", parseErr);
             try {
                 const retryPrompt = `The previous response was not valid JSON. Return ONLY a valid JSON object matching this exact structure, with no prose, no markdown fences, and no trailing commas:\n{\n    "progressionLabel": "AXIS: ...",\n    "items": [ { "date": "...", "event": "..." } ]\n}\nPrevious response to repair:\n${result}`;
                 const retryResult = await callGemini(retryPrompt, true);
                 content = parseTimelineResponse(retryResult);
                 metaInfo = `${t('meta.events_count', { count: content.items.length })}${usesLocalTextBackend ? ' - Local' : ''}`;
             } catch (retryErr) {
                 warnLog("Timeline Parse Error (attempt 2):", retryErr);
                 throw new Error("Failed to parse Timeline JSON. The AI response was not valid.");
             }
         }
         try {
             const validation = validateSequenceStructure(content, content.mode || effectiveMode);
             if (!validation.ok) {
                 content.validationIssues = validation.issues;
                 warnLog('[Timeline] Structural validation issues:', validation.issues);
             }
         } catch (vErr) {
             warnLog('[Timeline] Validator threw:', vErr);
         }
         if (includeTimelineVisuals && content.items && content.items.length > 0) {
             setGenerationStep(t('timeline.visuals.generating') || 'Generating sequence visuals...');
             addToast(t('timeline.visuals.generating') || 'Generating sequence visuals...', 'info');
             let failCount = 0;
             const POOL_SIZE = 2;
             const MAX_RETRIES = 1;
             const progression = content.progressionLabel || 'sequential order';
             const generateOne = async (item) => {
                 const _timelineStyle = (universalImageStyle || '').trim();
                 const styleInstruction = _timelineStyle ? `Style: ${_timelineStyle}.` : 'Educational style.';
                 const imgPrompt = `Simple vector icon/illustration of: "${item.event}" (sequence position: "${item.date || ''}"). Context: part of a sequence ordered by ${progression}. White background. ${styleInstruction} No text. Visual only.`;
                 for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                     try {
                         if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                         let imageUrl = await callImagenWithSignal(imgPrompt);
                         if (autoRemoveWords && imageUrl) {
                             try {
                                 const rawBase64 = imageUrl.split(',')[1];
                                 const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                                 imageUrl = await callGeminiImageEditWithSignal(editPrompt, rawBase64);
                             } catch (editErr) {
                                 if ((editErr && editErr.name === 'AbortError') || (generationSignal && generationSignal.aborted)) throw editErr;
                                 warnLog("Timeline batch auto-remove text failed for:", item.event, editErr);
                             }
                         }
                         return { ...item, image: imageUrl };
                     } catch (e) {
                         if ((e && e.name === 'AbortError') || (generationSignal && generationSignal.aborted)) throw e;
                         if (attempt === MAX_RETRIES - 1) { failCount++; warnLog('Timeline image gen failed', e); return item; }
                     }
                 }
                 return item;
             };
             const output = new Array(content.items.length);
             for (let i = 0; i < content.items.length; i += POOL_SIZE) {
                 const batch = content.items.slice(i, i + POOL_SIZE);
                 const results = await Promise.all(batch.map(generateOne));
                 results.forEach((r, j) => { output[i + j] = r; });
             }
             content.items = output;
             if (failCount > 0) {
                 const msg = t('timeline.visuals.failed', { failed: failCount, total: content.items.length });
                 addToast((msg && msg !== 'timeline.visuals.failed') ? msg : `${failCount} of ${content.items.length} visuals couldn't be generated. Cards will show text only.`, 'warning');
             }
         }
      } else if (type === 'math') {
          setGenerationStep(t('status_steps.solving_visualizing'));
          const problemToSolve = configOverride.mathInput || mathInput || sourceTopic || "Create a relevant word problem based on the text";
          const mode = configOverride.mathMode || mathMode || 'Problem Set Generator';
          const subject = configOverride.mathSubject || mathSubject || 'General Math';
          const mathContextPrompt = `Source Context: "${textToProcess.substring(0, 1500)}..."\nGrade Level: ${effectiveGrade}\nInterests: ${studentInterests.join(', ')}`;
          let prompt = "";
          if (usesLocalTextBackend) {
              prompt = `
                Create a compact math/STEM resource for ${effectiveGrade} students.
                Subject: ${subject}
                Mode: ${mode}
                Topic or problem: "${problemToSolve}"
                Source excerpt:
                """
                ${localExcerpt(textToProcess, 4500)}
                """
                Requirements:
                - If this is a problem set, create 3 problems.
                - If this is a solver/explainer, solve or explain the given problem in 3-5 clear steps.
                - Keep all prose concise and student-friendly.
                - Do not generate SVG or graph markup; set "graphData" to null.
                ${languageDirective ? '- ' + languageDirective + ' Keep mathematical expressions in standard notation.' : ''}
                ${studentInterests.length > 0 ? `- Frame the word problems using these student interests: ${studentInterests.join(', ')}.` : ''}
                ${standardsDirective ? '- ' + standardsDirective : ''}
                ${dokDirective ? '- ' + dokDirective : ''}
                ${emojiDirective ? '- ' + emojiDirective + ' Keep all mathematical notation, expressions and numeric answers free of emoji.' : ''}
                Return ONLY valid JSON:
                {
                  "title": "Short title",
                  "problems": [
                    {
                      "question": "Problem or prompt",
                      "answer": "Answer",
                      "steps": [{ "explanation": "Step explanation", "latex": "" }],
                      "realWorld": "Short real-world connection"
                    }
                  ],
                  "graphData": null
                }
              `;
          } else if (mode === 'Problem Set Generator') {
              prompt = `
                You are an expert Math Curriculum Designer.
                ${languageDirective ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + effectiveLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + glossLang + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
                Topic/Skill: "${problemToSolve}"
                ${mathContextPrompt}
                Instruction: Create EXACTLY the number and types of problems described in the Topic/Skill above. Match the count, types, and difficulty the user specified. If no specific count is given, create 5 problems.
                Context Usage: Frame the word problems using characters, settings, or themes from the Source Context.
                ${standardsDirective}
                ${emojiDirective ? emojiDirective + ' Keep all mathematical notation, expressions and numeric answers free of emoji.' : ''}
                ${dokDirective}
                Output Format:
                Return a JSON object with a "problems" array.
                Return ONLY JSON in the following format:
                {
                  "title": "Problem Set: ${problemToSolve.substring(0, 30)}...",
                  "problems": [
                    {
                      "question": "Problem 1 text...",
                      "answer": "Answer 1",
                      "steps": [{ "explanation": "...", "latex": "..." }],
                      "realWorld": "1-2 sentence real-life connection — name a specific career or everyday situation where this skill is used. Do NOT restate the problem as a word problem.",
                    }
                  ],
                  "graphData": null
                }
              `;
          } else {
              prompt = `
                You are an Expert Math & Science Tutor.
                ${languageDirective ? 'IMPORTANT: Generate ALL text content (explanations, steps, real-world applications) in ' + effectiveLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + glossLang + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
                Subject: ${subject}
                Mode: ${mode}
                Problem: "${problemToSolve}"
                Context: ${mathContextPrompt}
                Instructions: Solve the problem or explain the concept.
                ${isMathGraphEnabled ? 'VISUALS REQUIRED: Generate a self-contained SVG graph or diagram in the "graphData" field.' : ''}
                ${standardsDirective}
                ${emojiDirective ? emojiDirective + ' Keep all mathematical notation, expressions and numeric answers free of emoji.' : ''}
                Return ONLY JSON:
                {
                  "problem": "Clean Latex string of the input",
                  "answer": "Final Answer string",
                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null",
                  "realWorld": "Connection string explanation"
                }
              `;
          }
          if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.solving_visualizing'));
          const result = await callGemini(prompt, true);
          if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.solving_visualizing'));
          let rawContent;
          let cleaned;
          try {
              cleaned = cleanJson(result);
              rawContent = usesLocalTextBackend ? parseJsonLenient(result, null) : safeJsonParse(result);
              if (!rawContent) {
                try { rawContent = JSON.parse(cleaned); } catch (_) {}
              }
              if (!rawContent) {
                const jsonMatch = result.match(/[\[{][\s\S]*[\]}]/);
                if (jsonMatch) {
                  const extracted = jsonMatch[0];
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { rawContent = JSON.parse(window.jsonrepair(extracted)); } catch (_) {}
                  }
                  if (!rawContent) {
                    try { rawContent = JSON.parse(extracted); } catch (_) {}
                  }
                }
              }
              if (!rawContent) throw new Error("Failed to parse Math JSON after all strategies.");
          } catch (parseErr) {
               warnLog("Math Parse Error:", parseErr);
               throw new Error("Failed to parse Math JSON.");
          }
          let normalizedContent = {
              title: rawContent.title || 'Math & STEM Solver',
              problems: [],
              graphData: rawContent.graphData || null
          };
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => (typeof s === 'string' ? { explanation: s, latex: '' } : s));
          };
          if (Array.isArray(rawContent.problems)) {
              normalizedContent.problems = rawContent.problems.map(p => ({ ...p, steps: normalizeSteps(p.steps) }));
          } else {
              normalizedContent.problems = [{
                  question: rawContent.problem || problemToSolve,
                  answer: rawContent.answer,
                  steps: normalizeSteps(rawContent.steps),
                  realWorld: rawContent.realWorld
              }];
          }
          content = normalizedContent;
          metaInfo = `${subject} - ${mode}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'gemini-bridge') {
         const localBridgeStepCount = usesLocalTextBackend ? Math.max(3, Math.min(Number(bridgeStepCount) || 5, 6)) : bridgeStepCount;
         setGenerationStep(t('status_steps.engineering_prompts', { count: localBridgeStepCount }));
         const context = getLessonContext();
         const bridgeContext = usesLocalTextBackend ? localExcerpt(context, 6500) : context;
         const stackMap = {
            'react': 'Interactive Web App (React)',
            'python': 'Data Visualization (Python)',
            'physics': 'Physics Simulation (p5.js)',
            'chatbot': 'AI Character Chatbot (HTML/JS)',
         };
         const techStack = stackMap[bridgeSimType] || bridgeSimType;
         const prompt = `
            You are an Expert Prompt Engineer specializing in Generative AI Coding tools (Gemini Canvas).
            Goal: Create a sequential, iterative guide (Chain of Thought) that a user can copy/paste one by one to build a robust educational application.
            Target Tech Stack: ${techStack}
            Target Grade Level: ${effectiveGrade}
            Language: ${effectiveLanguage}
            Step Count: Exactly ${localBridgeStepCount} steps.
            Lesson Context:
            ${bridgeContext}
            Strategy:
            Break the development process down into ${localBridgeStepCount} logical prompts.
            - Step 1: Setup basic file structure, "Hello World", and core UI layout.
            - Middle Steps: Implement specific logic, interactivity, and educational content based on the Context.
            - Final Step: Polish, CSS styling (Tailwind), and error handling.
            Format:
            Return ONLY a JSON array of strings. Each string is the specific prompt the user should paste into Gemini.
            Example: ["Create a single file React app that...", "Now add a state variable for...", "Finally, style the component using..."]
         `;
         if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.engineering_prompts', { count: localBridgeStepCount }));
         const result = await callGemini(prompt, true);
         if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.engineering_prompts', { count: localBridgeStepCount }));
         try {
             content = usesLocalTextBackend ? parseJsonLenient(result, []) : JSON.parse(cleanJson(result));
             if (!Array.isArray(content)) content = [result];
         } catch (e) {
             content = [result];
         }
         metaInfo = `${t('meta.bridge_info', { type: bridgeSimType, count: localBridgeStepCount })}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'concept-sort') {
         setGenerationStep(t('status_steps.categorizing_concepts'));
         const isLowerGrade = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'].includes(effectiveGrade);
         const isAutoCount = !conceptItemCount || conceptItemCount === '';
         const itemCountInstruction = isAutoCount
            ? `2. Generate items (cards) for students to sort into these categories. *** ITEM COUNT RULE *** Generate ONLY as many items as the source text can clearly support — items must be unambiguous, distinctive, and sortable into exactly ONE of the categories. Minimum 6 items. Maximum 30 items. Preferred: 12-18 items if the text supports it (richer texts can support more). Do NOT pad with weak or ambiguous items just to reach a count.`
            : `2. Generate exactly ${conceptItemCount} items (cards) that students must sort into these categories.`;
         let categoryInstruction = "1. Identify 2 or 3 contrasting categories, concepts, or themes central to the text (e.g., \"Renewable vs Non-Renewable\", \"Federalist vs Anti-Federalist\", \"Input vs Output\").";
         if (selectedConcepts.length > 0) {
             categoryInstruction = `1. Use these specific categories: ${selectedConcepts.join(', ')}. Ensure items fit clearly into exactly one of these categories.`;
         }
         let result = '';
         if (usesLocalTextBackend) {
         const localItemCount = isAutoCount ? 10 : Math.max(6, Math.min(Number(conceptItemCount) || 10, 12));
         const prompt = `
            Create a compact Concept Sort activity from the source excerpt.
            Audience: ${effectiveGrade} students.
            Language: ${effectiveLanguage}.
            ${standardsDirective}
            ${interestsDirective}
            ${emojiDirective}
            ${dokDirective}
            ${categoryInstruction}
            Generate 2 or 3 categories and up to ${localItemCount} unambiguous cards.
            Each card must clearly belong to exactly one category.
            Keep category labels short.
            Keep card text short: ${isLowerGrade ? '1-5 words' : '1 short phrase'}.
            ${effCustomInstructions ? `Custom focus: ${effCustomInstructions}` : ''}
            Return ONLY valid JSON:
            {
                "categories": [
                    { "id": "c1", "label": "Category 1", "color": "bg-indigo-500" },
                    { "id": "c2", "label": "Category 2", "color": "bg-pink-500" }
                ],
                "items": [
                    { "id": "i1", "content": "Card text", "categoryId": "c1" }
                ]
            }
            Source excerpt:
            """
            ${localExcerpt(textToProcess, 6000)}
            """
         `;
         setGenerationTaskProgress(0, 1, t('status_steps.categorizing_concepts'));
         result = await callGemini(prompt, true);
         setGenerationTaskProgress(1, 1, t('status_steps.categorizing_concepts'));
         } else {
         const prompt = `
            Analyze the provided source text to create a "Concept Sort" activity.
            Target Audience: ${effectiveGrade} students.
            Language: ${effectiveLanguage}.
            ${standardsDirective}
            ${interestsDirective}
            ${emojiDirective}
            ${dokDirective}
            Task:
            ${categoryInstruction}
            ${itemCountInstruction}
            Differentiation Strategy for ${effectiveGrade}:
            ${isLowerGrade
                ? '- LOWER LEVEL: Focus on concrete, tangible examples. The content of the cards should be short (1-5 words) to act as captions for visual support.'
                : '- UPPER LEVEL: Focus on abstract concepts, nuances, or specific quotes. Use complex sentences or scenarios.'
            }
            ${effCustomInstructions ? `Custom Focus: ${effCustomInstructions}` : ''}
            ${effectiveLanguage !== 'English' ? 'Ensure all categories and items are in the target language.' : ''}
            ${dialectInstruction}
            Return ONLY JSON with this structure:
            {
                "categories": [
                    { "id": "c1", "label": "Category 1 Name", "color": "bg-indigo-500" },
                    { "id": "c2", "label": "Category 2 Name", "color": "bg-pink-500" }
                ],
                "items": [
                    { "id": "i1", "content": "Card Text", "categoryId": "c1" },
                    { "id": "i2", "content": "Card Text", "categoryId": "c2" }
                ]
            }
            Text: "${textToProcess.substring(0, 10000)}"
         `;
         result = await callGemini(prompt, true);
         }
         try {
             content = usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result));
             if (!content.categories) content.categories = [];
             if (!content.items) content.items = [];
             if (usesLocalTextBackend && (!content.categories.length || !content.items.length)) {
                 throw new Error("Local concept sort response did not include categories and items.");
             }
             const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
             const itemsAreShort = content.items.length > 0 && content.items.every(it => wordCount(it.content) <= 6);
             const shouldGenerateImages =
                 conceptImageMode === 'always' ||
                 (!usesLocalTextBackend && conceptImageMode === 'auto' && itemsAreShort);
             if (shouldGenerateImages && content.items.length > 0) {
                 setGenerationStep('Generating card visuals...');
                 addToast(t('toasts.generating_card_visuals'), "info");
                 // POOL_SIZE was 5, dropped to 2 to reduce concurrent rate-limit
                 // triggers on Imagen. callImagen has its own centralized 3-attempt exponential
                 // backoff (1s/2s/4s, see AlloFlowANTI.txt:13021), but when 5
                 // requests fire at once and the first hits a 429, the others
                 // are already in flight and exhaust their retries within ~7s.
                 // Smaller pool + a final-pass sweep recovers more cards.
                 const POOL_SIZE = 2;
                 const generateOne = async (item) => {
                     try {
                         const _csDeckStyle = (universalImageStyle || '').trim();
                         const styleInstruction = _csDeckStyle ? `Style: ${_csDeckStyle}.` : 'Educational style.';
                         const imgPrompt = `Simple, clear vector icon or illustration of: "${item.content}". White background. ${styleInstruction} No text.`;
                         const imageUrl = await callImagenWithSignal(imgPrompt);
                         return { ...item, image: imageUrl };
                     } catch (e) {
                         if ((e && e.name === 'AbortError') || (generationSignal && generationSignal.aborted)) throw e;
                         warnLog("Card image gen failed", e);
                         return item;
                     }
                 };
                 const output = new Array(content.items.length);
                 for (let i = 0; i < content.items.length; i += POOL_SIZE) {
                     const batch = content.items.slice(i, i + POOL_SIZE);
                     const results = await Promise.all(batch.map(generateOne));
                     results.forEach((r, j) => { output[i + j] = r; });
                 }
                 // Final-pass retry sweep: any items still without images get a
                 // second chance with serialized calls + 750ms gap. Catches
                 // stragglers that hit transient rate limits during the burst.
                 // Doesn't retry items that came back without images for safety
                 // reasons (those would fail again the same way).
                 const stillMissingIdx = output
                     .map((it, idx) => (!it || !it.image) ? idx : -1)
                     .filter(idx => idx >= 0);
                 if (stillMissingIdx.length > 0) {
                     setGenerationStep(`Retrying ${stillMissingIdx.length} card visual${stillMissingIdx.length === 1 ? '' : 's'}...`);
                     for (const idx of stillMissingIdx) {
                         const item = output[idx];
                         if (!item) continue;
                         const refreshed = await generateOne(item);
                         if (refreshed && refreshed.image) {
                             output[idx] = refreshed;
                         }
                         // 750ms gap so the rate-limit window has time to clear
                         // between retries. Total worst case: N × (callImagen
                         // retries up to ~7s + 750ms gap) = ~8s per missing card.
                         // For typical 8-card decks with 2-3 stragglers, ~16-24s.
                         await new Promise(r => setTimeout(r, 750));
                     }
                 }
                 // Recount AFTER the sweep so the warning toast reflects what
                 // actually shipped, not the first-pass failures.
                 const finalFailCount = output.filter(it => !it || !it.image).length;
                 content.items = output;
                 if (finalFailCount > 0) {
                     const msg = t('concept_sort.visuals_failed', { failed: finalFailCount, total: content.items.length });
                     addToast(
                         (msg && msg !== 'concept_sort.visuals_failed') ? msg : `${finalFailCount} of ${content.items.length} card visuals couldn't be generated after retries. Cards will show text only — you can regenerate or upload images in edit mode.`,
                         "warning"
                     );
                 }
             }
             const catCount = content.categories.length;
             metaInfo = shouldGenerateImages
                ? t('meta.categories_visual', { count: catCount })
                : t('meta.categories_text', { count: catCount });
             if (usesLocalTextBackend) metaInfo += ' - Local';
         } catch (parseErr) {
             warnLog("Concept Sort Parse Error:", parseErr);
             throw new Error("Failed to parse Concept Sort JSON. The AI response was not valid.");
         }
      } else if (type === 'dbq') {
         console.log('[DBQ] Branch entered. effectiveGrade=' + effectiveGrade + ', textToProcess length=' + (textToProcess?.length || 0) + ', effectiveLanguage=' + effectiveLanguage);
         setGenerationStep('Creating Document-Based Questions...');
         const isElementary = /k|1st|2nd|3rd|4th|5th/i.test(effectiveGrade);
         const isMiddle = /6th|7th|8th/i.test(effectiveGrade);
         const _dbqMode = window._dbqMode || 'standard';
         const _dbqFocusTopic = document.getElementById('dbq-focus-topic')?.value || '';
         const _dbqCustomDocs = document.getElementById('dbq-custom-docs')?.value || '';
         const _dbqCustomEssayFocus = document.getElementById('dbq-custom-essay-focus')?.value || '';
         const _dbqTeacherLinks = document.getElementById('dbq-teacher-links')?.value || '';
         console.log('[DBQ] Mode=' + _dbqMode + ', focusTopic=' + _dbqFocusTopic.substring(0, 60) + ', hasCustomDocs=' + !!_dbqCustomDocs + ', hasTeacherLinks=' + !!_dbqTeacherLinks);
         let _dbqSearchResults = '';
         if (!usesLocalTextBackend && (_dbqMode === 'search' || _dbqMode === 'links') && (window._webSearch || window._aiBackend?.webSearch)) {
           try {
             setGenerationStep('Searching for primary sources...');
             const searcher = window._webSearch || window._aiBackend?.webSearch;
             const topic = _dbqFocusTopic || textToProcess.substring(0, 200);
             let allResults = [];
             if (_dbqMode === 'links' && _dbqTeacherLinks.trim()) {
               const urls = _dbqTeacherLinks.trim().split('\n').filter(u => u.trim().startsWith('http'));
               for (const url of urls.slice(0, 6)) {
                 try {
                   const domain = new URL(url.trim()).hostname;
                   const siteResults = await searcher.search(`site:${domain} ${topic}`, 1);
                   allResults.push({ url: url.trim(), title: siteResults[0]?.title || domain, snippet: siteResults[0]?.snippet || 'Teacher-provided source' });
                 } catch(e) { allResults.push({ url: url.trim(), title: url.trim().split('/').pop(), snippet: 'Teacher-provided document' }); }
               }
             } else {
               const [archiveResults, generalResults] = await Promise.all([
                 searcher.search(`${topic} primary source document site:loc.gov OR site:archives.gov OR site:avalon.law.yale.edu OR site:founders.archives.gov`, 5).catch(() => []),
                 searcher.search(`${topic} primary source historical document`, 5).catch(() => [])
               ]);
               const seen = new Set();
               [...archiveResults, ...generalResults].forEach(r => {
                 if (r.url && !seen.has(r.url)) { seen.add(r.url); allResults.push(r); }
               });
             }
             if (allResults.length > 0) {
               _dbqSearchResults = '\n\nREAL WEB SOURCES FOUND (use these URLs and information to build document excerpts):\n' +
                 allResults.slice(0, 8).map((r, i) => `${i + 1}. "${r.title}" — ${r.url}\n   Preview: ${r.snippet || 'No preview available'}`).join('\n') +
                 '\n\nINSTRUCTIONS FOR WEB SOURCES:\n- Use the actual URLs above in the "sourceUrl" field for each document\n- Use the title and snippet as the basis for the document excerpt, then EXPAND it to a substantial passage\n- Set documentType to "linked" for documents from web sources\n- Students will be able to click through to read the full original source\n';
             }
           } catch(searchErr) { console.warn('[DBQ] Web search failed:', searchErr?.message); }
         }
         const _dbqModeInstructions = _dbqMode === 'perspectives'
           ? `\n\nSPECIAL MODE — COMPETING PERSPECTIVES:\nYou MUST structure this DBQ around two or more clearly opposing viewpoints or interpretations.${_dbqFocusTopic ? ' Focus on: ' + _dbqFocusTopic + '.' : ''}\n- At least 2 documents should represent each major perspective\n- Label each document's perspective in a "perspective" field (e.g., "Federalist", "Anti-Federalist", "Pro-expansion", "Indigenous resistance")\n- The corroborationClaims MUST include at least one claim where documents directly contradict each other\n- The synthesis essay prompt MUST require students to evaluate BOTH perspectives and take a position\n- Include a "perspectives" array in the JSON root: [{"label": "Perspective A Name", "description": "Brief description", "docIds": ["A","C"]}, {"label": "Perspective B Name", "description": "Brief description", "docIds": ["B","D"]}]\n`
           : (_dbqMode === 'search' || _dbqMode === 'links')
           ? `\n\nSPECIAL MODE — WEB-ENHANCED SOURCES WITH REAL LINKS:\n${_dbqFocusTopic ? 'Topic focus: ' + _dbqFocusTopic + '.\n' : ''}Use the real web sources provided below to build document excerpts. Each document MUST include a "sourceUrl" field linking to the original source.\n- For each web source, create a substantial excerpt based on the title and snippet, expanded with historically accurate content\n- Include a mix of document types: speeches, letters, newspaper editorials, government records, testimony, data/statistics\n- Set "documentType" to "linked" for documents sourced from web search\n- Also include 1-2 documents extracted from the provided source text (documentType: "primary" or "secondary")\n- Aim for ${isElementary ? '3-4' : '5-6'} total documents\n- Each document's "sourceUrl" field MUST contain the actual URL from the web search results${_dbqSearchResults}\n`
           : _dbqMode === 'custom' && _dbqCustomDocs.trim()
           ? `\n\nSPECIAL MODE — TEACHER-PROVIDED DOCUMENTS:\nThe teacher has provided specific documents below. You MUST use EXACTLY these documents as the document excerpts. Do NOT generate, modify, or replace them. Your job is to:\n- Preserve each document's exact text as the "excerpt"\n- Parse any "Title:" and "Source:" lines the teacher provided for each document\n- If a line starts with http, use it as the "sourceUrl" for that document\n- Add appropriate "documentType" classification (primary, secondary, data, visual, testimony, linked)\n- Generate HAPP prompts, sourcing questions, analysis questions, and sentence starters for each document\n- Create corroboration claims that connect across the teacher's documents\n- Write a synthesis essay prompt${_dbqCustomEssayFocus ? ' focused on: ' + _dbqCustomEssayFocus : ''}\n- Build the rubric appropriate to the grade level\n\nTEACHER-PROVIDED DOCUMENTS (separated by ---):\n"""\n${_dbqCustomDocs}\n"""\n`
           : '';
         let dbqPrompt = '';
         if (usesLocalTextBackend) {
             dbqPrompt = `Create a compact Document-Based Question activity for ${effectiveGrade} students.

Language: ${effectiveLanguage}.
${standardsDirective}
${dokDirective}
${effCustomInstructions ? `Teacher instructions: ${effCustomInstructions}` : ''}

Use the source excerpt to create a MINI DBQ.

Source excerpt:
"""
${localExcerpt(textToProcess, 7000)}
"""

Return ONLY valid JSON:
{
  "title": "DBQ Title",
  "historicalContext": "2-3 sentence context paragraph",
  "documents": [
    {
      "id": "A",
      "title": "Document A: Short title",
      "documentType": "primary",
      "source": "Source/context note",
      "sourceUrl": "",
      "excerpt": "Short excerpt or paraphrased passage, 60-120 words",
      "happPrompts": {
        "historical": "What was happening when this was created?",
        "audience": "Who was this written for?",
        "purpose": "Why was this created?",
        "pointOfView": "What perspective is shown?"
      },
      "sourcingQuestions": ["Question 1"],
      "analysisQuestions": ["Question 1"],
      "sentenceStarters": ["This document shows...", "I know this because..."]
    }
  ],
  "corroborationClaims": [
    {
      "claim": "A theme across the documents",
      "supportingDocs": ["A"],
      "challengingDocs": [],
      "guideQuestion": "How do the documents support or complicate this claim?"
    }
  ],
  "synthesisPrompt": "Writing prompt using evidence from the documents",
  "thesisStarter": "I believe that ___ because...",
  "rubric": [
    {"criteria": "Claim", "1": "Needs a claim", "2": "Basic claim", "3": "Clear claim", "4": "Strong claim with context"},
    {"criteria": "Evidence", "1": "Little evidence", "2": "Uses one document", "3": "Uses multiple documents", "4": "Uses evidence well"}
  ],
  "teacherNotes": "Brief teaching notes"
}

Create 2-3 documents only. Keep excerpts concise.`;
             setGenerationTaskProgress(0, 1, 'Creating Document-Based Questions...');
         } else {
         dbqPrompt = `You are an expert social studies and ELA curriculum designer creating a Document-Based Question (DBQ) activity.

Target Audience: ${effectiveGrade} students.
Language: ${effectiveLanguage}.${_dbqModeInstructions}
${standardsDirective}
${dokDirective}
${effCustomInstructions ? `Teacher Instructions: ${effCustomInstructions}` : ''}

Source Material (use ALL of this to create rich, substantial document excerpts):
"""
${textToProcess.substring(0, isElementary ? 6000 : isMiddle ? 10000 : 15000)}
"""

Create a complete DBQ activity packet with these components:

1. HISTORICAL CONTEXT: A brief (2-3 sentence) introduction that sets the stage for students.${isElementary ? ' Use simple, engaging language.' : ''}

2. DOCUMENTS: Extract or create ${isElementary ? '3' : isMiddle ? '4' : '5-6'} document excerpts from the source material. Each document MUST be:
   - A SUBSTANTIAL passage — ${isElementary ? 'at least 50-100 words each. Students need enough text to practice reading and finding evidence.' : isMiddle ? 'at least 100-200 words each. Include enough detail for students to analyze author perspective and identify key evidence.' : 'at least 200-400 words each. AP/high school documents must be long enough for deep textual analysis, sourcing, and corroboration.'}
   - A distinct passage, quote, data point, or perspective from the text
   - Labeled (Document A, Document B, etc.)
   - Accompanied by a source citation (author, date, context)
   - Adapted to ${effectiveGrade} reading level — ${isElementary ? 'use simple vocabulary and short sentences' : isMiddle ? 'use grade-appropriate vocabulary with context clues for harder terms' : 'maintain original complexity and academic vocabulary'}
   - Include a "documentType" field: one of "primary", "secondary", "data", "visual", "testimony"
   - IMPORTANT: Do NOT truncate or over-summarize. Real DBQ documents are meaty — give students something substantial to work with.

3. HAPP SOURCING FRAMEWORK: For each document, provide structured HAPP (Historical context, Audience, Purpose, Point of view) scaffolding:
   - "happPrompts": An object with guiding questions for each HAPP dimension
${isElementary ? '   - Use simple sentence starters like "This was written by..." and "The author wanted to..."' : isMiddle ? '   - Use guided questions like "Who wrote this and when?" and "What was the author trying to do?"' : '   - Use open-ended analytical questions appropriate for AP-level critical thinking'}

4. SOURCING QUESTIONS: For each document, provide ${isElementary ? '1' : '2'} sourcing questions.
${isElementary ? '   - Use sentence starters: "I think the author wrote this because..."' : ''}

5. ANALYSIS QUESTIONS: For each document, provide ${isElementary ? '1' : '2'} analysis questions.
${isElementary ? '   - Use sentence starters: "The main idea is..." and "I know this because..."' : ''}

6. CORROBORATION CLAIMS: Identify 2-3 key claims or themes that appear across multiple documents. For each claim, note which document IDs support or challenge it.

7. SYNTHESIS ESSAY PROMPT: A culminating writing prompt that requires students to use evidence from multiple documents.
${isElementary ? '   Include a simple thesis sentence starter: "I think ___ because Document A shows ___ and Document B shows ___."' : isMiddle ? '   Include a thesis template: "Although [counterargument], [your position] because [reason 1] and [reason 2]."' : ''}

8. RUBRIC: A 4-point rubric (1-4) with criteria for: Thesis, Evidence Use, Analysis, Organization.
${isElementary ? '   - Rubric language should be simple and encouraging. A "4" for elementary means: states a clear opinion with a reason, mentions at least 2 documents, uses simple connecting words. A "1" means: no clear opinion stated.' : isMiddle ? '   - Rubric should reflect middle school expectations. A "4" means: clear thesis with counterargument acknowledgment, cites 3+ documents with specific evidence, explains WHY evidence matters. A "1" means: no thesis, no document references.' : '   - Rubric should reflect AP/high school rigor. A "4" means: nuanced thesis addressing complexity, integrates evidence from most documents with analysis of perspective/bias, demonstrates historical thinking skills (causation, continuity, contextualization). A "1" means: restatement without analysis.'}

${effectiveLanguage !== 'English' ? `All content must be in ${effectiveLanguage}.` : ''}

Return ONLY JSON:
{
  "title": "DBQ Title",
  "historicalContext": "Context paragraph",
  "documents": [
    {
      "id": "A",
      "title": "Document A: Title",
      "documentType": "primary",
      "source": "Author, Date, Context",
      "sourceUrl": "https://... (REQUIRED for linked documents, optional for others)",
      "excerpt": "The document text...",
      "happPrompts": {
        "historical": "What was happening when this was created?",
        "audience": "Who was this written for?",
        "purpose": "Why was this created?",
        "pointOfView": "What perspective does the author have?"
      },
      "sourcingQuestions": ["Question 1"],
      "analysisQuestions": ["Question 1"],
      "sentenceStarters": ${isElementary || isMiddle ? '["I think the author...", "This document shows..."]' : 'null'}
    }
  ],
  "corroborationClaims": [
    {
      "claim": "A key theme or argument",
      "supportingDocs": ["A", "C"],
      "challengingDocs": ["B"],
      "guideQuestion": "How do Documents A and C agree on this? How does Document B differ?"
    }
  ],
  "synthesisPrompt": "The essay question...",
  "thesisStarter": ${isElementary || isMiddle ? '"I believe that ___ because..."' : 'null'},
  "rubric": [
    {"criteria": "Thesis", "1": "description", "2": "description", "3": "description", "4": "description"},
    {"criteria": "Evidence Use", "1": "...", "2": "...", "3": "...", "4": "..."},
    {"criteria": "Analysis", "1": "...", "2": "...", "3": "...", "4": "..."},
    {"criteria": "Organization", "1": "...", "2": "...", "3": "...", "4": "..."}
  ],
  "teacherNotes": "Brief notes on scaffolding, differentiation, or extension ideas"
}`;
         }
         console.log('[DBQ] About to call Gemini. Prompt length=' + dbqPrompt.length);
         const result = await callGemini(dbqPrompt, true);
         if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, 'Creating Document-Based Questions...');
         console.log('[DBQ] Gemini returned. Result length=' + (result?.length || 0) + '. Preview: ' + String(result || '').substring(0, 200));
         try {
             content = usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result));
             if (!content.documents) content.documents = [];
             if (!content.rubric) content.rubric = [];
             metaInfo = `${content.documents?.length || 0} documents · ${content.rubric?.length || 0} rubric criteria${usesLocalTextBackend ? ' - Local' : ''}`;
             console.log('[DBQ] Parsed successfully. ' + metaInfo);
         } catch (parseErr) {
             warnLog("DBQ Parse Error:", parseErr);
             console.error('[DBQ] JSON parse failed. Raw response (first 1000 chars):', String(result || '').substring(0, 1000));
             throw new Error("Failed to parse DBQ JSON. The AI response was not valid.");
         }
      } else if (type === 'lesson-plan') {
         setGenerationStep(isIndependentMode ? t('lesson_plan.status_creating_study') : (isParentMode ? t('lesson_plan.status_creating_family') : t('lesson_plan.status_synthesizing')));
         const historySource = configOverride.historyOverride || history;
         const context = getLessonContext(historySource);
         const assetManifest = configOverride.assetManifest || getAssetManifest(historySource);
         let prompt;
         if (isIndependentMode) {
             prompt = buildStudyGuidePrompt(context, effectiveLanguage, effCustomInstructions);
         } else if (isParentMode) {
             prompt = buildParentGuidePrompt(context, effectiveLanguage, effCustomInstructions);
         } else {
             prompt = buildLessonPlanPrompt(context, assetManifest, effectiveLanguage, effCustomInstructions);
         }
         if (usesLocalTextBackend) {
             prompt = `
                Create a compact ${isIndependentMode ? 'student study guide' : (isParentMode ? 'family guide' : 'UDL-aligned lesson plan')} for ${effectiveGrade} students.
                Language: ${effectiveLanguage}.
                ${standardsDirective}
                ${dokDirective}
                ${interestsDirective}
                ${effCustomInstructions ? `Teacher instructions: ${effCustomInstructions}` : ''}
                Use this lesson context excerpt:
                """
                ${localExcerpt(context, 6500)}
                """
                Return ONLY valid JSON with this shape:
                {
                  "essentialQuestion": "One clear essential question",
                  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
                  "hook": "Brief opening hook",
                  "directInstruction": "Concise teacher explanation",
                  "guidedPractice": "Supported practice activity",
                  "independentPractice": "Independent or partner task",
                  "closure": "Exit check or reflection",
                  "extensions": ["Support or extension 1", "Support or extension 2"]
                }
             `;
             setGenerationTaskProgress(0, 1, isIndependentMode ? t('lesson_plan.status_creating_study') : (isParentMode ? t('lesson_plan.status_creating_family') : t('lesson_plan.status_synthesizing')));
         }
         assertLocalTaskSupported('strict-json', 'The lesson plan');
         const result = await callGemini(prompt, true, false, null, null, null, localSchemaArg('lesson-plan'));
         if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, isIndependentMode ? t('lesson_plan.status_creating_study') : (isParentMode ? t('lesson_plan.status_creating_family') : t('lesson_plan.status_synthesizing')));
         try {
             content = usesLocalTextBackend ? parseJsonLenient(result, null) : safeJsonParse(result);
             if (!content) {
                 const cleaned = cleanJson(result);
                 content = JSON.parse(cleaned);
             }
         } catch (parseErr) {
             warnLog("Lesson Plan Parse Error:", parseErr);
             throw new Error("Failed to parse Lesson Plan JSON. The AI response was not valid.");
         }
         if (!content) content = {};
         if (!content.objectives || !Array.isArray(content.objectives)) content.objectives = [];
         if (!content.extensions || !Array.isArray(content.extensions)) content.extensions = [];
         const stringFields = ['essentialQuestion', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];
         stringFields.forEach(field => {
             if (!content[field]) content[field] = "";
         });
         if (!content.extensions) content.extensions = [];
         if (!Array.isArray(content.extensions)) {
             if (content.extensions) {
                 content.extensions = [content.extensions];
             } else {
                 content.extensions = [];
             }
         }
         metaInfo = `${effectiveGrade} - ${isIndependentMode ? t('meta.study_guide') : (isParentMode ? t('meta.family_guide') : t('meta.udl_aligned'))}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'adventure') {
        setGenerationStep(t('status_steps.designing_adventure'));
        let langInstruction = "Language: English.";
        if (effectiveLanguage !== 'English') {
             langInstruction = `Language: ${effectiveLanguage}. Do NOT provide ${glossLang || 'other-language'} translations for this JSON output.`;
        }
        const toneInstruction = isAdventureStoryMode
            ? "TONE: Story Time Mode (Family Friendly). Focus on exploration, mystery, and puzzles. Avoid combat."
            : "TONE: Standard Adventure. Balance exploration with risk and consequences.";
        const adventureSourceText = usesLocalTextBackend ? localExcerpt(textToProcess, 3500) : textToProcess.substring(0, 3000);
        const prompt = `
          You are a dungeon master running a "Choose Your Own Adventure" educational simulation.
          ${dnaPromptBlock}
          Source Material: "${adventureSourceText}",
          --- SETTINGS ---
          Target Audience: ${effectiveGrade} students.
          ${langInstruction}
          ${toneInstruction}
          ${standardsDirective}
          ${dokDirective}
          ${emojiDirective ? emojiDirective + ' CRITICAL: emoji may appear ONLY in narrative prose and choice text. Character names, the "voices" map keys and values, and "soundParams" values must remain plain ASCII with no emoji -- they are matched against fixed lists to select audio.' : ''}
          ${studentInterests.length > 0 ? `Theme/Interests: Integrate elements of "${studentInterests.join(', ')}" to engage the student.` : ''}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          ${lessonDNA && lessonDNA.visualContext ? `VISUAL CONTINUITY: The student has just studied a diagram described as: "${lessonDNA.visualContext}". Ensure the opening scene description visually matches this setting.` : ''}
          Task: Create the OPENING SCENE of an interactive story that helps the student explore the concepts in the source text.
          - Put the student in a role related to the topic.
          - The story should be engaging but educational.
          - CRITICAL: Do NOT list the choices in the 'text' narrative. Only describe the situation. The choices will be displayed as buttons.
          - Provide exactly 4 distinct choices for what to do next.
          VOICE ACTING INSTRUCTIONS:
          Return a "voices" map where the key is the character name and value is one of: [Fenrir, Kore, Leda, Orus, Charon, Zephyr, Aoede].
          Return ONLY JSON:
          {
            "text": "The descriptive text of the opening scene...",
            "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
            "inventoryUpdate": { "add": { "name": "Item Name", "type": "permanent" } } OR null,
            "voices": { "Character Name": "VoiceName" },
            "soundParams": {
                "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
            }
          }
        `;
        if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.designing_adventure'));
        const result = await callGemini(prompt, true);
        if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.designing_adventure'));
        try {
            content = usesLocalTextBackend ? parseJsonLenient(result, {}) : JSON.parse(cleanJson(result));
            if (!content) content = {};
            if (!content.text) content.text = t('adventure.fallback_opening');
            if (!content.options || !Array.isArray(content.options)) content.options = [];
            if (!content.voiceMap) content.voiceMap = content.voices || {};
        } catch (e) {
            warnLog("Adventure Parse Error", e);
            if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
            throw new Error("Failed to parse Adventure JSON.");
        }
        metaInfo = `${t('meta.opening_scene')}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'persona') {
          setIsProcessing(true);
          setGenerationStep(t('status_steps.identifying_figures'));
          if (switchView || !generatedContent) {
              setActiveView('persona');
          }
          resetPersonaInterviewState();
          try {
              const personaCount = usesLocalTextBackend ? 2 : 3;
              const personaSourceText = usesLocalTextBackend ? localExcerpt(textToProcess, 3500) : `${textToProcess.substring(0, 3000)}...`;
              const prompt = `
                Analyze the following text about "${sourceTopic || "the current lesson topic"}".
                Source Text:
                "${personaSourceText}",
                Task: Identify ${personaCount} specific historical figures, experts, or fictional archetypes (e.g., 'A Union Soldier', 'Marie Curie', 'A Red Blood Cell') relevant to this content that a ${effectiveGrade} student could interview to learn more.
                ${effCustomInstructions ? `TRUSTED TEACHER INSTRUCTIONS: ${effCustomInstructions} (Prioritize these when selecting figures. Keep every "visualDescription" a plain physical description for an image generator.)` : ''}
                ${languageDirective}
                Return ONLY a JSON array of objects with this exact structure:
                [
                    {
                        "name": "Name",
                        "role": "Short Description",
                        "year": "Relevant Year or Era",
                        "context": "Why they are relevant",
                        "visualDescription": "A highly detailed physical description for an image generator (e.g., 'Oil painting of [Name], [details], neutral background').",
                        "greeting": "A short, engaging starting message from this character to the student.",
                    }
                ]
              `;
              if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, t('status_steps.identifying_figures'));
              const result = await callGemini(prompt, false, !usesLocalTextBackend);
              if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, t('status_steps.identifying_figures'));
              let textToParse = "";
              if (typeof result === 'object' && result !== null && result.text) {
                  textToParse = result.text;
              } else {
                  textToParse = String(result || "");
              }
              let parsedOptions = [];
              if (!textToParse.includes('[') && !textToParse.includes('{')) {
                   warnLog("Persona Gen: No JSON found in response.");
                   addToast(t('toasts.character_data_not_found'), "warning");
                   throw new Error("No JSON found");
              }
              try {
                  parsedOptions = usesLocalTextBackend ? parseJsonLenient(textToParse, []) : JSON.parse(cleanJson(textToParse));
                  if (usesLocalTextBackend && !Array.isArray(parsedOptions)) {
                      parsedOptions = unwrapArray(parsedOptions, ['figures', 'characters', 'personas', 'options']);
                  }
              } catch (e) {
                  warnLog("Standard parse failed. Attempting robust parse...");
                  parsedOptions = safeJsonParse(textToParse);
          }
          if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
               parsedOptions = parsedOptions.map(p => ({
                   name: p.name || "Unknown Figure",
                   role: p.role || "Historical Figure",
                   year: p.year || "Unknown Era",
                   context: p.context || "No details provided.",
                   visualDescription: p.visualDescription || "",
                   greeting: p.greeting || "Hello.",
                   quests: Array.isArray(p.quests) ? p.quests : [],
                   suggestedQuestions: Array.isArray(p.suggestedQuestions) ? p.suggestedQuestions : []
               }));
               setPersonaState(prev => ({ ...prev, options: parsedOptions }));
               content = parsedOptions;
               metaInfo = `${t('meta.interview_candidates')}${usesLocalTextBackend ? ' - Local' : ''}`;
              } else {
                   throw new Error("Invalid persona format received.");
              }
          } catch (err) {
              warnLog("Persona Generation Error:", err);
           if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
              throw new Error("Failed to identify historical figures.");
          } finally {
              setIsGeneratingPersona(false);
          }
      } else if (type === 'note-taking') {
          // Note-Taking Templates (Cornell Notes / Lab Report / Reading Response).
          // Generates a lesson-aware scaffolded template. Per architectural
          // directive, the actual template rendering lives in
          // note_taking_templates_module.js; this dispatcher just builds the
          // initial data object with lesson-aware pre-population.
          setIsProcessing(true);
          if (switchView || !generatedContent) setActiveView('note-taking');
          const templateType = (configOverride && configOverride.templateType) || (deps.noteTakingTemplateType) || 'cornell-notes';
          const lessonRef = {
              sourceTextSnippet: (textToProcess || '').substring(0, 200),
              generatedAt: new Date().toISOString(),
              gradeLevel: effectiveGrade,
              language: effectiveLanguage,
          };
          const noteSourceText = usesLocalTextBackend ? localExcerpt(textToProcess, 3500) : (textToProcess || '').substring(0, 3000);
          const parseNoteScaffold = async (prompt, fallback, progressLabel) => {
              try {
                  if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, progressLabel);
                  const result = await callGemini(prompt, true);
                  if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, progressLabel);
                  const parsed = usesLocalTextBackend ? parseJsonLenient(result, fallback) : JSON.parse(cleanJson(result));
                  return parsed && typeof parsed === 'object' ? parsed : fallback;
              } catch (parseErr) {
                  warnLog(`${progressLabel} parse failed:`, parseErr);
                  return fallback;
              }
          };
          if (templateType === 'cornell-notes') {
              // Pre-fill cues column with 5-8 key terms / anticipated questions from source.
              const prompt = `
                  Analyze the following source text. Extract 5-8 key terms or anticipated student questions that would belong in the LEFT-COLUMN ("Cues") of a Cornell Notes template for a ${effectiveGrade} student. Each cue should be short (1-6 words) and act as a memory anchor or question prompt the student can return to.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${emojiDirective}
                  ${dokDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Lesson title", "cues": ["Cue 1", "Cue 2", "Cue 3", ...] }
              `;
              let scaffolded = { title: sourceTopic || '', cues: [] };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Cornell Notes scaffold');
              const cuesArr = Array.isArray(scaffolded.cues) ? scaffolded.cues : [];
              content = {
                  templateType: 'cornell-notes',
                  title: scaffolded.title || sourceTopic || 'Cornell Notes',
                  cues: cuesArr.slice(0, 8).map((text, i) => ({ id: `cue-${Date.now()}-${i}`, text: String(text || '') })),
                  notes: cuesArr.slice(0, 8).map((_, i) => ({ id: `note-${Date.now()}-${i}`, text: '' })),
                  summary: '',
                  connections: '',
                  lessonRef,
              };
          } else if (templateType === 'lab-report') {
              const prompt = `
                  Analyze the following science-related source text. Extract: 1) a research question this text raises that a student could investigate, 2) a list of likely materials needed (if the source describes any experimental setup), and 3) a relevant title for the experiment. Target audience: ${effectiveGrade} student.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${emojiDirective}
                  ${dokDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Experiment title", "question": "Research question?", "materials": ["material 1", "material 2", ...] }
              `;
              let scaffolded = { title: sourceTopic || '', question: '', materials: [] };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Lab Report scaffold');
              const matsArr = Array.isArray(scaffolded.materials) ? scaffolded.materials : [];
              content = {
                  templateType: 'lab-report',
                  title: scaffolded.title || sourceTopic || 'Lab Report',
                  question: scaffolded.question || '',
                  hypothesis: '',
                  materials: matsArr.map((text, i) => ({ id: `mat-${Date.now()}-${i}`, text: String(text || '') })),
                  procedure: [],
                  data: '',
                  analysis: '',
                  conclusion: '',
                  connections: '',
                  lessonRef,
              };
          } else if (templateType === 'reading-response') {
              const prompt = `
                  Analyze the following source text. Extract the title and author (if present in the text or its metadata). If not explicit, infer the best title from the content.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Reading title", "author": "Author name or empty string" }
              `;
              let scaffolded = { title: sourceTopic || '', author: '' };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Reading Response scaffold');
              content = {
                  templateType: 'reading-response',
                  title: scaffolded.title || sourceTopic || 'Reading Response',
                  author: scaffolded.author || '',
                  pageRange: '',
                  favoriteLine: '',
                  thinkings: '',
                  connection: { type: 'text-to-self', text: '' },
                  question: '',
                  lessonRef,
              };
          } else if (templateType === 'double-entry') {
              // Seed the LEFT column with salient quotes; the student writes responses.
              const prompt = `
                  Analyze the following source text. Extract 3-5 short, vivid QUOTES or passages (each 1-2 sentences, copied verbatim from the source in its ORIGINAL language, never translated) that a ${effectiveGrade} student could respond to in a double-entry (dialectical) journal. Pick lines that are striking, puzzling, or important — the kind worth thinking about. Also extract the title and author if present.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Reading title", "author": "Author or empty string", "quotes": ["Quote 1", "Quote 2", ...] }
              `;
              let scaffolded = { title: sourceTopic || '', author: '', quotes: [] };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Double-Entry scaffold');
              const quotesArr = Array.isArray(scaffolded.quotes) ? scaffolded.quotes : [];
              const seeded = quotesArr.slice(0, 5).map((q, i) => ({ id: `de-${Date.now()}-${i}`, quote: String(q || ''), response: '' }));
              content = {
                  templateType: 'double-entry',
                  title: scaffolded.title || sourceTopic || 'Double-Entry Journal',
                  author: scaffolded.author || '',
                  pageRange: '',
                  entries: seeded.length ? seeded : [{ id: `de-${Date.now()}-0`, quote: '', response: '' }],
                  lessonRef,
              };
          } else if (templateType === 'guided-notes') {
              // AI generates fill-in-the-blank statements with the key term as the answer.
              const prompt = `
                  Create GUIDED NOTES (fill-in-the-blank) from the following source text for a ${effectiveGrade} student. Produce 6-10 statements that capture the most important facts/concepts. In each statement, blank out ONE key term (the single most important word or short phrase). Split each statement into the text BEFORE the blank, the ANSWER (the blanked term), and the text AFTER the blank. Keep statements concise and factually grounded in the source.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Lesson title", "blanks": [ { "before": "The powerhouse of the cell is the ", "answer": "mitochondria", "after": "." }, ... ] }
              `;
              let scaffolded = { title: sourceTopic || '', blanks: [] };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Guided Notes scaffold');
              const blanksArr = Array.isArray(scaffolded.blanks) ? scaffolded.blanks : [];
              content = {
                  templateType: 'guided-notes',
                  title: scaffolded.title || sourceTopic || 'Guided Notes',
                  blanks: blanksArr.slice(0, 12).map((b, i) => ({
                      id: `gn-${Date.now()}-${i}`,
                      before: String((b && b.before) || ''),
                      answer: String((b && b.answer) || ''),
                      after: String((b && b.after) || ''),
                      studentAnswer: '',
                  })).filter(b => b.answer),
                  notesExtra: '',
                  lessonRef,
              };
          } else if (templateType === 'q-and-a') {
              // Seed study questions + model answers; student edits/adds + self-quizzes.
              const prompt = `
                  Analyze the following source text. Generate 4-6 STUDY QUESTIONS a ${effectiveGrade} student could use for self-testing (active recall). Mix recall ("what/when") with higher-order ("why/how") questions. For each, also write a concise, correct model answer grounded in the source.
                  Source: "${noteSourceText}"
                  ${languageDirective}
                  ${standardsDirective}
                  ${emojiDirective}
                  ${dokDirective}
                  ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
                  Return ONLY a JSON object:
                  { "title": "Study set title", "pairs": [ { "question": "Why does ...?", "answer": "Because ..." }, ... ] }
              `;
              let scaffolded = { title: sourceTopic || '', pairs: [] };
              scaffolded = await parseNoteScaffold(prompt, scaffolded, 'Q&A scaffold');
              const pairsArr = Array.isArray(scaffolded.pairs) ? scaffolded.pairs : [];
              content = {
                  templateType: 'q-and-a',
                  title: scaffolded.title || sourceTopic || 'Q&A Study Notes',
                  pairs: pairsArr.slice(0, 8).map((p, i) => ({
                      id: `qa-${Date.now()}-${i}`,
                      question: String((p && p.question) || ''),
                      answer: String((p && p.answer) || ''),
                  })).filter(p => p.question || p.answer),
                  connections: '',
                  lessonRef,
              };
          } else {
              content = { templateType: 'cornell-notes', title: sourceTopic || 'Notes', cues: [], notes: [], summary: '', lessonRef };
          }
          metaInfo = `${effectiveGrade} - ${templateType}${usesLocalTextBackend ? ' - Local' : ''}`;
      } else if (type === 'anchor-chart') {
          // Anchor Charts — classroom visual reference.
          // Hand-drawn aesthetic. Rendering lives in anchor_charts_module.js.
          setIsProcessing(true);
          if (switchView || !generatedContent) setActiveView('anchor-chart');
          const requestedChartType = (configOverride && configOverride.chartType) || (deps.anchorChartType) || 'auto';
          const supportedChartTypes = ['reference', 'process', 'concept-map', 'comparison', 'strategy', 'vocabulary', 'routine', 'worked-example', 'criteria-success', 'misconception', 'question-guide'];
          const chartType = requestedChartType === 'auto' || supportedChartTypes.includes(requestedChartType) ? requestedChartType : 'auto';
          const lessonRef = {
              sourceTextSnippet: (textToProcess || '').substring(0, 200),
              generatedAt: new Date().toISOString(),
              gradeLevel: effectiveGrade,
              language: effectiveLanguage,
          };
          const chartTypeGuide = {
              auto: 'choose the strongest chart type for the source and topic. Prefer vocabulary for term-heavy content, process/routine for steps, comparison for contrasts, misconception for common mix-ups, criteria-success for rubrics, worked-example for procedures with a model, strategy for reusable academic moves, question-guide for discussion or analysis prompts, and concept-map for parts of a whole.',
              process: 'a multi-step process (e.g., the writing process, the scientific method). Sections should be sequential steps. Use 4-6 sections.',
              'concept-map': 'a concept and its components (e.g., parts of a cell, branches of government). Sections should be parallel sub-parts. Use 3-6 sections.',
              reference: 'a reference list of features, conventions, or norms (e.g., features of a good argument, classroom norms). Sections should be parallel categories. Use 3-6 sections.',
              comparison: 'a comparison across two or more categories (e.g., similes vs metaphors, mitosis vs meiosis). Sections should be the categories being compared. Use 2-4 sections.',
              strategy: 'a reusable thinking or learning strategy students can apply across tasks. Sections should be practical moves such as Plan, Try, Check, Revise, or Explain. Use 4-6 sections.',
              vocabulary: 'a vocabulary chart for key terms. Each section should be one important term with a student-friendly meaning, example, and visual clue in the bullets. Use 4-6 terms.',
              routine: 'a classroom or academic routine students should follow consistently. Sections should be the ordered routine steps with brief reminders. Use 4-6 sections.',
              'worked-example': 'a worked example or model. Sections should walk through the model from setup to reasoning to final check, showing why each move works. Use 4-6 sections.',
              'criteria-success': 'success criteria for strong work. Sections should name what students should include or check before turning in work. Use 4-6 criteria.',
              misconception: 'common misconceptions and fixes. Each section should name one likely mix-up and explain the correct idea with a quick fix or contrast. Use 3-6 sections.',
              'question-guide': 'a question guide for discussion, close reading, inquiry, or analysis. Sections should be question categories with student-friendly prompts. Use 4-6 sections.',
          };
          const chartTypeHint = chartTypeGuide[chartType] || chartTypeGuide.reference;
          const chartSourceText = usesLocalTextBackend ? localExcerpt(textToProcess, 3500) : (textToProcess || '').substring(0, 2500);
          const prompt = `
              Design a classroom ANCHOR CHART for a ${effectiveGrade} student. Topic: "${sourceTopic || chartSourceText.substring(0, 200) || 'reference'}". Chart type request: ${chartType} - ${chartTypeHint}.

              An anchor chart is a poster-sized visual reference co-created in class. It should be CONCISE (each bullet 3-10 words), MEMORABLE (use language a student would actually use), and ORGANIZED (clear sections).

              Supported chartType values: ${supportedChartTypes.join(', ')}. If the request is "auto", choose exactly one supported chartType and make the sections match that purpose. The chartType JSON value must be only the selected id, with no explanation.

              Do NOT design a separate critique, sticky-note, peer-comment, or student-submission workflow. The app already has annotation tools and Interactive Mode. Focus this output on the poster content itself.

              For each section, also propose a simple iconPrompt describing a SIMPLE icon (a single concrete object, no text/letters) that represents the section visually — this will be drawn in a hand-drawn marker style.

              Source text for context (may be empty): "${chartSourceText}"

              ${languageDirective}
              ${standardsDirective}
              ${emojiDirective}
              ${dokDirective}
              ${effCustomInstructions ? `TEACHER INSTRUCTIONS: ${effCustomInstructions}` : ''}
              The "chartType" value and every "iconPrompt" must stay in English (machine id / image-generator input).
              Return ONLY a JSON object with this exact shape:
              {
                "chartType": "reference",
                "title": "Short, memorable title (3-6 words, can be all-caps if punchy)",
                "sections": [
                  {
                    "label": "SECTION LABEL (1-3 words, often a verb or category)",
                    "bullets": ["Short bullet 1", "Short bullet 2", "Short bullet 3"],
                    "iconPrompt": "simple object that represents this section"
                  }
                ]
              }
          `;
          let scaffolded = { title: sourceTopic || 'Anchor Chart', sections: [] };
          try {
              if (usesLocalTextBackend) setGenerationTaskProgress(0, 1, 'Designing anchor chart');
              const result = await callGemini(prompt, true);
              if (usesLocalTextBackend) setGenerationTaskProgress(1, 1, 'Designing anchor chart');
              scaffolded = usesLocalTextBackend ? parseJsonLenient(result, scaffolded) : JSON.parse(cleanJson(result));
          } catch (parseErr) {
              warnLog('Anchor chart scaffold parse failed:', parseErr);
          }
          const generatedChartType = String((scaffolded && scaffolded.chartType) || '').trim();
          const resolvedChartType = supportedChartTypes.includes(chartType) ? chartType : (supportedChartTypes.includes(generatedChartType) ? generatedChartType : 'reference');
          const rawSections = Array.isArray(scaffolded.sections) ? scaffolded.sections : [];
          const sections = rawSections.slice(0, 6).map((s, i) => ({
              id: `sec-${Date.now()}-${i}`,
              label: String((s && s.label) || `Section ${i + 1}`),
              bullets: Array.isArray(s && s.bullets) ? s.bullets.map(b => String(b || '')) : [],
              iconPrompt: String((s && s.iconPrompt) || ''),
              iconUrl: '',
          }));
          content = {
              title: scaffolded.title || sourceTopic || 'Anchor Chart',
              chartType: resolvedChartType,
              sections,
              lessonRef,
          };
          metaInfo = `${effectiveGrade} - ${resolvedChartType}${usesLocalTextBackend ? ' - Local' : ''}`;
      }
      let itemTitle = getDefaultTitle(type);
      if (type === 'analysis') {
          const existingCount = generationHistory.filter(h => h.type === 'analysis').length;
          if (existingCount > 0) {
              itemTitle += ` (V${existingCount + 1})`;
          }
      }
      if (type === 'simplified') {
          itemTitle = `Adapted Text (${effectiveGrade})`;
      }
      const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          data: content,
          meta: metaInfo,
          title: itemTitle,
          timestamp: new Date(),
          config: _buildItemConfig()
      };
      setHistory(prev => [...prev, newItem]);
      if (switchView || !generatedContent) {
          setGeneratedContent({ type, data: content, id: newItem.id, config: newItem.config });
          setActiveView(type);
          setStickers([]);
      }
      const toastTitle = type === 'simplified' ? "Adapted Text" : getDefaultTitle(type);
      addToast(`${toastTitle} generated!`, "success");
      if (switchView) {
          if (type === 'simplified') flyToElement('ui-tool-simplified');
          if (type === 'glossary') flyToElement('ui-tool-glossary');
          if (type === 'quiz') flyToElement('ui-tool-quiz');
          if (type === 'faq') flyToElement('tour-tool-faq');
          if (type === 'brainstorm') flyToElement('tour-tool-brainstorm');
          if (type === 'sentence-frames') flyToElement('tour-tool-scaffolds');
          if (type === 'timeline') flyToElement('tour-tool-timeline');
          if (type === 'concept-sort') flyToElement('tour-tool-concept-sort');
          if (type === 'dbq') flyToElement('tour-tool-dbq');
          if (type === 'alignment-report') flyToElement('tour-tool-alignment');
          if (type === 'gemini-bridge') flyToElement('tour-tool-brainstorm');
          if (type === 'outline') flyToElement('tour-tool-outline');
          if (type === 'image') flyToElement('tour-tool-visual');
          if (type === 'analysis') flyToElement('tour-tool-analysis');
      }
      return newItem;
    } catch (err) {
      if (!err.message?.includes("401")) {
          warnLog("Unhandled error:", err);
      }
      const errMsg = err.message?.includes("Blocked") ? "Content blocked by safety filters." :
                     err.message?.includes("Stopped") ? "Generation stopped by AI model." :
                     err.message?.includes("401") ? "Daily Usage Limit Reached. Please try again later." :
                     "Error generating content. Please try again.";
      setError(errMsg);
      addToast(errMsg, "error");
      if (isBotVisible && alloBotRef.current) {
          const actionName = type === 'analysis' ? 'analyzing the source' : 'generating content';
          alloBotRef.current.speak(`I ran into a problem ${actionName}: ${errMsg}.`);
      }
      // Unattended callers (blueprint runs) opt in to seeing the real failure.
      // Swallowing here left them one indistinguishable outcome — undefined —
      // for safety blocks, throttle exhaustion, and network drops alike, which
      // their run record could only label "returned no resource (it did not
      // throw)". The rethrow happens AFTER the toast/banner/bot handling above,
      // so interactive surfaces behave exactly as before.
      if (configOverride && configOverride.rethrowErrors) throw err;
    } finally {
      if (!keepLoading) setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.GenDispatcher = {
  handleGenerate,
  // Pure scope selector. Exported so the blueprint<->audit handoff can be
  // tested end to end: a run hands over artifactIds, and this is what decides
  // whether the report scopes explicitly or falls back to a guess.
  selectCurriculumArtifacts,
  splitAdaptationReferences,
  extractAdaptationCitationLedgerLocal,
  validateAdaptationCitationConservation,
  protectAdaptationCitations,
  restoreProtectedAdaptationCitations,
  composeAdaptedLeveledText,
  // Activities redesign (2026-08-16): pure structured-activity normalizers +
  // the shared per-kind serializer (ladder prompts + export both use it).
  normalizeDiscussionKit,
  normalizeJigsawActivity,
  describeActivityItem
};
