/* Shared, data-only word practice contract. No AI, storage, or network calls. */
(function (root) {
  'use strict';
  function createWordPracticeCore() {
    const LIMITS = Object.freeze({ words: 200, wordLength: 120, instructionChars: 12000, totalInstructionChars: 512 * 1024, audioChars: 4 * 1024 * 1024, totalAudioChars: 24 * 1024 * 1024, pictureChars: 6 * 1024 * 1024, totalPictureChars: 20 * 1024 * 1024 });
    const own = (obj, key) => obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    const text = (value, max = 2000) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';
    const key = value => text(value).normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ');
    const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    function instructionText(value, field, word) {
      const clean = text(value, LIMITS.instructionChars + 1);
      if (clean.length > LIMITS.instructionChars) throw new Error('The ' + field + ' for “' + text(word, LIMITS.wordLength) + '” must be 12,000 characters or fewer. Shorten the field or split it into separate practice items.');
      return clean;
    }
    // These names and BCP 47 tags work in the dependency-free offline player.
    // Unknown names remain untagged; never relabel a translation as English.
    const languageNames = {
      english: 'en', spanish: 'es', 'spanish (latin america)': 'es-419', 'spanish (castilian)': 'es-ES',
      french: 'fr', 'french (canadian)': 'fr-CA', german: 'de', italian: 'it', portuguese: 'pt',
      'portuguese (brazil)': 'pt-BR', 'portuguese (portugal)': 'pt-PT', 'portuguese (angola)': 'pt-AO',
      arabic: 'ar', hebrew: 'he', persian: 'fa', farsi: 'fa', urdu: 'ur', pashto: 'ps', sindhi: 'sd',
      uyghur: 'ug', yiddish: 'yi', dhivehi: 'dv', sorani: 'ckb', 'kurdish (sorani)': 'ckb',
      chinese: 'zh', mandarin: 'zh', 'chinese (simplified)': 'zh-Hans', 'chinese (traditional)': 'zh-Hant',
      hindi: 'hi', japanese: 'ja', korean: 'ko', russian: 'ru', ukrainian: 'uk', vietnamese: 'vi',
      somali: 'so', 'haitian creole': 'ht', bengali: 'bn', punjabi: 'pa', tamil: 'ta', telugu: 'te',
      turkish: 'tr', polish: 'pl', dutch: 'nl', swedish: 'sv', norwegian: 'no', danish: 'da',
      finnish: 'fi', greek: 'el', romanian: 'ro', hungarian: 'hu', czech: 'cs', slovak: 'sk',
      swahili: 'sw', indonesian: 'id', malay: 'ms', thai: 'th', tagalog: 'tl', filipino: 'fil',
      afrikaans: 'af', amharic: 'am', albanian: 'sq', armenian: 'hy', azerbaijani: 'az',
      basque: 'eu', belarusian: 'be', bosnian: 'bs', bulgarian: 'bg', catalan: 'ca',
      croatian: 'hr', estonian: 'et', georgian: 'ka', gujarati: 'gu', icelandic: 'is',
      irish: 'ga', kannada: 'kn', kazakh: 'kk', khmer: 'km', lao: 'lo', latvian: 'lv',
      lithuanian: 'lt', macedonian: 'mk', malayalam: 'ml', maltese: 'mt', marathi: 'mr',
      mongolian: 'mn', nepali: 'ne', serbian: 'sr', sinhala: 'si', slovenian: 'sl',
      uzbek: 'uz', welsh: 'cy', zulu: 'zu',
      // Keep supported UI names aligned with the recording-language contract
      // below, including in the standalone player where host helpers are absent.
      acholi: 'ach', burmese: 'my', 'chin (falam)': 'cfm', 'chin (hakha)': 'cnh',
      dari: 'prs', esperanto: 'eo', hausa: 'ha', hmong: 'hmn', igbo: 'ig',
      karen: 'kar', kinyarwanda: 'rw', kirundi: 'rn', latin: 'la', lingala: 'ln',
      'maay maay': 'ymm', marshallese: 'mh', tigrinya: 'ti', yoruba: 'yo'
    };
    function languageInfo(value) {
      const original = text(value, 80), name = original.toLowerCase();
      let tag = own(languageNames, name) || original.replace(/_/g, '-');
      if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i.test(tag)) return { tag: '', dir: 'auto' };
      try { if (typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function') tag = Intl.getCanonicalLocales(tag)[0] || ''; }
      catch (_) { return { tag: '', dir: 'auto' }; }
      // Script subtags precede extension/private-use singletons. A Latin
      // numbering extension (ar-u-nu-latn) does not change the writing script.
      const subtags = tag.split('-').slice(1);
      const extension = subtags.findIndex(part => part.length === 1);
      const script = (extension < 0 ? subtags : subtags.slice(0, extension)).find(part => /^[a-z]{4}$/i.test(part));
      const rtl = script ? /^(Arab|Hebr|Thaa|Nkoo|Adlm|Rohg|Syrc|Samr|Mand)$/i.test(script) : /^(ar|fa|prs|he|iw|ur|ps|sd|ug|yi|dv|ckb|syr)(-|$)/i.test(tag);
      return { tag, dir: rtl ? 'rtl' : 'ltr' };
    }
    // Display labels are separate from saved language/audio identifiers. Keep
    // script and region distinctions, and tag the label in its actual UI locale.
    function languageLabel(value, locale = 'English') {
      const original = text(value, 80), language = languageInfo(original);
      const fallback = { text: original, language: { tag: '', dir: 'auto' } };
      if (!language.tag || typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return fallback;
      try {
        const names = new Intl.DisplayNames([languageInfo(locale).tag || 'en'], { type: 'language', languageDisplay: 'standard', fallback: 'none' });
        const label = names.of(language.tag);
        return label ? { text: label, language: languageInfo(names.resolvedOptions().locale) } : fallback;
      } catch (_) { return fallback; }
    }
    // Recording identity follows the originating Word Sounds defaults. This is
    // deliberately separate from the shorter HTML language-of-parts tag.
    const audioLanguageNames = {english:'en-US',spanish:'es-ES','spanish (latin america)':'es-419','spanish (castilian)':'es-ES',french:'fr-FR','french (canadian)':'fr-CA',german:'de-DE',portuguese:'pt-BR','portuguese (brazil)':'pt-BR','portuguese (angola)':'pt-AO','portuguese (portugal)':'pt-PT',mandarin:'zh-CN',chinese:'zh-CN','chinese (mandarin)':'zh-CN','chinese (simplified)':'zh-CN','chinese (traditional)':'zh-TW',arabic:'ar-SA',vietnamese:'vi-VN',russian:'ru-RU',japanese:'ja-JP',italian:'it-IT',korean:'ko-KR',hindi:'hi-IN',dutch:'nl-NL',polish:'pl-PL',indonesian:'id-ID',turkish:'tr-TR',hebrew:'he-IL',swedish:'sv-SE',danish:'da-DK',norwegian:'no-NO',finnish:'fi-FI',greek:'el-GR',thai:'th-TH',czech:'cs-CZ',hungarian:'hu-HU',romanian:'ro-RO',ukrainian:'uk-UA',cantonese:'zh-HK',tagalog:'fil-PH',filipino:'fil-PH',bengali:'bn-IN',urdu:'ur-PK',malay:'ms-MY',swahili:'sw-KE',bulgarian:'bg-BG',croatian:'hr-HR',serbian:'sr-RS',slovak:'sk-SK',persian:'fa-IR',farsi:'fa-IR',tamil:'ta-IN',amharic:'am-ET',afrikaans:'af-ZA',kurdish:'ku-TR',somali:'so-SO','haitian creole':'ht-HT',haitian:'ht-HT',khmer:'km-KH',cambodian:'km-KH',lao:'lo-LA',burmese:'my-MM',myanmar:'my-MM',nepali:'ne-NP',marathi:'mr-IN',gujarati:'gu-IN',punjabi:'pa-IN',telugu:'te-IN',kannada:'kn-IN',malayalam:'ml-IN',sinhala:'si-LK',yoruba:'yo-NG',igbo:'ig-NG',hausa:'ha-NG',kinyarwanda:'rw-RW',kirundi:'rn-BI',lingala:'ln-CD',tigrinya:'ti-ET',oromo:'om-ET',mongolian:'mn-MN',hmong:'hmn',esperanto:'eo',latin:'la',pashto:'ps-AF',pushto:'ps-AF',dari:'prs-AF',georgian:'ka-GE',armenian:'hy-AM',albanian:'sq-AL',macedonian:'mk-MK',acholi:'ach-UG',karen:'kar-MM','chin (hakha)':'cnh-MM','chin (falam)':'cfm-MM','maay maay':'ymm-SO',marshallese:'mh-MH'};
    const audioLanguageDefaults = Object.create(null);
    Object.values(audioLanguageNames).forEach(value => { const primary = value.split('-')[0]; if (!audioLanguageDefaults[primary]) audioLanguageDefaults[primary] = value.toLowerCase(); });
    function audioLanguageKey(value) {
      if (typeof value !== 'string') return '';
      const raw = value.trim().replace(/_/g, '-').replace(/\s+/g, ' ').toLowerCase();
      if (!raw || raw.length > 256 || /[\u0000-\u001f\u007f]/.test(raw)) return '';
      const parts = raw.split('\u241f'); if (parts.length > 3) return '';
      let base = parts[0].trim(), locale = (parts[1] || '').trim(), dialect = (parts[2] || '').trim();
      const parenthetical = base.match(/^(.+?)\s*\(([^()]*)\)\s*$/);
      if (parenthetical) { base = parenthetical[1].trim(); dialect = dialect || parenthetical[2].trim(); }
      const tag = input => {
        if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/.test(input)) return '';
        try { if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) input = Intl.getCanonicalLocales(input)[0].toLowerCase(); } catch (_) { return ''; }
        return own(audioLanguageDefaults, input) || input;
      };
      const alias = input => own(audioLanguageNames, input) ? tag(audioLanguageNames[input].toLowerCase()) : '';
      const named = base.startsWith('name:') ? (base.slice(5).trim() ? base : '') : null;
      if (named === '') return '';
      if (parts.length === 2 && (named || tag(base) === base)) { dialect = locale; locale = ''; }
      const dialectLocale = dialect ? alias(base + ' (' + dialect + ')') : '';
      const baseKey = named || alias(base) || tag(base) || (base ? 'name:' + base : '');
      if (!baseKey || (locale && !tag(locale))) return '';
      const resolved = locale ? tag(locale) : dialectLocale || baseKey;
      return dialect && dialectLocale !== resolved ? resolved + '\u241f' + dialect : resolved;
    }
    function fieldLanguage(item, field, fallback = 'en') {
      const record = item && typeof item === 'object' ? item : {};
      const language = field === 'term' ? record.termLanguage || record.wordLanguage || record.language
        : field === 'definition' ? record.definitionLanguage
        : field === 'example' ? record.exampleLanguage || record.definitionLanguage
        : field === 'sentence' ? (record.sentenceActivity && record.sentenceActivity.language) || record.sentenceLanguage || record.termLanguage || record.wordLanguage || record.language : '';
      return text(language, 80) || text(fallback, 80) || 'en';
    }
    function audioProvenance(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      const output = {};
      ['language','requestedLanguage','provider','engine','resolvedVoice','voice','model','source'].forEach(name => {
        const clean = text(value[name], name === 'language' || name === 'requestedLanguage' ? 256 : 160);
        if (clean) output[name] = clean;
      });
      return output;
    }
    function audioCompatibility(source, expectedLanguage, provenance) {
      const object = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
      const supplied = audioProvenance(provenance);
      const profile = Object.keys(supplied).length ? supplied : audioProvenance(object.provenance || object.synthesisProfile || object.metadata);
      const audio = safeAudio(object.audio || object.asset || source);
      const sourceLanguage = profile.language || '', expected = text(expectedLanguage, 256);
      const actualKey = audioLanguageKey(sourceLanguage), expectedKey = audioLanguageKey(expected);
      const status = !audio ? 'missing' : actualKey && expectedKey ? actualKey === expectedKey ? 'ready' : 'stale-language' : 'legacy';
      return { status, audio, provenance: profile, sourceLanguage, expectedLanguage: expected };
    }
    function normalizedAudio(source, expectedLanguage, provenance, original) {
      let current = audioCompatibility(source, expectedLanguage, provenance);
      const retained = audioCompatibility(original, expectedLanguage);
      if (retained.audio && current.audio === retained.audio && !current.sourceLanguage && retained.sourceLanguage) current = retained;
      let backup = retained.audio ? { audio: retained.audio, provenance: retained.provenance } : null;
      if (current.status === 'stale-language') backup = { audio: current.audio, provenance: current.provenance };
      if (!current.audio && retained.audio) current = retained;
      const audio = current.status === 'stale-language' ? '' : current.audio;
      if (backup && backup.audio === audio) backup = null;
      return { audio, provenance: current.provenance, status: current.status, original: backup };
    }
    function audioIssueCounts(pack) {
      let staleLanguage = 0;
      (pack && pack.items || []).forEach(item => { if (item.wordAudioStatus === 'stale-language') staleLanguage++; (item.phonemes || []).forEach(sound => { if (sound.audioStatus === 'stale-language') staleLanguage++; }); });
      return { staleLanguage };
    }
    function safeAudio(value) {
      let candidate = typeof value === 'string' ? value : value && typeof value.mime === 'string' && typeof value.base64 === 'string'
        ? 'data:' + value.mime + ';base64,' + value.base64 : '';
      if (candidate.length > LIMITS.audioChars) return '';
      // MediaRecorder includes codec parameters (for example WebM/Opus).
      // Strip well-formed MIME parameters, not the recording bytes, before
      // applying the same allowlist, base64 and container checks below.
      const match = /^data:(audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac))(?:;[ \t]*[a-z][a-z0-9_-]*[ \t]*=[ \t]*(?:[a-z0-9._+\/-]+|"[a-z0-9._+\/, -]+")[ \t]*)*;base64,([a-z0-9+/]*={0,2})$/i.exec(candidate);
      if (!match || match[2].length < 12 || match[2].length % 4 !== 0) return '';
      try {
        const bytes = atob(match[2].slice(0, 80));
        const at = i => bytes.charCodeAt(i);
        const mime = match[1].toLowerCase();
        const valid = /wav|wave/.test(mime) ? bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE'
          : /mpeg|mp3/.test(mime) ? bytes.startsWith('ID3') || (at(0) === 255 && (at(1) & 224) === 224)
          : mime === 'audio/aac' ? at(0) === 255 && (at(1) & 246) === 240
          : mime === 'audio/ogg' ? bytes.startsWith('OggS')
          : mime === 'audio/webm' ? at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163
          : mime === 'audio/flac' ? bytes.startsWith('fLaC') : bytes.slice(4, 8) === 'ftyp';
        return valid ? 'data:' + mime + ';base64,' + match[2] : '';
      } catch (_) { return ''; }
    }
    // A glossary picture: an embedded PNG, JPEG, GIF or WebP, checked by its file
    // signature like audio above, or an https link (shown live and in the HTML file).
    function safePicture(value) {
      const candidate = typeof value === 'string' ? value.trim() : '';
      if (!candidate || candidate.length > LIMITS.pictureChars) return '';
      if (/^https:\/\/[^\s"'<>\\]+$/i.test(candidate)) return candidate.length <= 2048 ? candidate : '';
      const match = /^data:image\/(png|jpeg|jpg|gif|webp);base64,([a-z0-9+/]*={0,2})$/i.exec(candidate);
      if (!match || match[2].length < 16 || match[2].length % 4 !== 0) return '';
      try {
        const bytes = atob(match[2].slice(0, 32)), at = i => bytes.charCodeAt(i), type = match[1].toLowerCase();
        const valid = type === 'png' ? at(0) === 0x89 && bytes.slice(1, 4) === 'PNG'
          : type === 'gif' ? bytes.startsWith('GIF8')
          : type === 'webp' ? bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP'
          : at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff;
        return valid ? 'data:image/' + (type === 'jpg' ? 'jpeg' : type) + ';base64,' + match[2] : '';
      } catch (_) { return ''; }
    }
    // The glossary's fingerprint of the picture a description was written for
    // (same as the flashcard export): a description of an earlier picture is not reused.
    function pictureHash(image) {
      let h = 0x811c9dc5;
      const mix = c => { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; };
      String(image.length).split('').forEach(ch => mix(ch.charCodeAt(0)));
      const step = Math.max(1, Math.floor(image.length / 4096));
      for (let i = 0; i < image.length; i += step) mix(image.charCodeAt(i));
      return 'img-' + image.length.toString(36) + '-' + h.toString(16).padStart(8, '0');
    }
    function pictureCredit(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
      try {
        const line = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AltText && window.AlloModules.AltText.openImageCreditLine;
        if (typeof line === 'function') return text(line(value), 400);
      } catch (_) {}
      return ['set', 'author', 'license'].map(name => text(value[name], 160)).concat(value.modified === true ? ['edited'] : []).filter(Boolean).join(' · ');
    }
    // Accepts a glossary entry (image, imageAlt, imageDecorative, imageAttribution)
    // or a saved practice item's own { picture } on re-normalisation.
    function pictureFor(record, word) {
      const saved = record.picture && typeof record.picture === 'object' && !Array.isArray(record.picture) ? record.picture : null;
      const raw = saved ? saved.src : typeof record.image === 'string' ? record.image : record.image && typeof record.image === 'object' ? record.image.src : '';
      const src = safePicture(raw);
      if (!src) return null;
      const decorative = saved ? saved.decorative === true : record.imageDecorative === true;
      let alt = '';
      if (!decorative) {
        alt = text(saved ? saved.alt : record.imageAlt, 1000);
        if (!saved && alt && record.imageAltHash && typeof raw === 'string' && pictureHash(raw) !== record.imageAltHash) alt = '';
        alt = alt || text(word, LIMITS.wordLength);
      }
      return { src, alt, decorative, credit: saved ? text(saved.credit, 400) : pictureCredit(record.imageAttribution) };
    }
    // Keep the portable player independent of the live Word Sounds module.
    // These are its canonical phonics/IPA mappings, parity-checked against
    // word_sounds_core.js. Resolve the original object before dropping its IPA
    // provenance: explicit IPA i/u/j mean ee/oo/y, unlike app strings i/u/j.
    const normalizeSound = value => text(value, 40).normalize('NFC').toLowerCase().replace(/^\/+|\/+$/g, '');
    const soundAliases = {c:'k',ck:'k',q:'k',qu:'k',ph:'f',wh:'w',tch:'ch',dge:'j',ai:'ay',ea:'ee',ir:'er',ur:'er',au:'aw',oe:'oa',oi:'oy','ā':'ay','ē':'ee','ī':'ie','ō':'oa','ū':'oo','ɡ':'g','ʃ':'sh','ʒ':'zh','θ':'th','ð':'dh','ŋ':'ng','dʒ':'j','ʤ':'j','tʃ':'ch','ʧ':'ch','æ':'a','ɛ':'e','ɪ':'i','ɒ':'o','ɑ':'o','ɑː':'o','ʌ':'u','ə':'schwa','iː':'ee','uː':'oo','ʊ':'oo_short','eɪ':'ay','aɪ':'ie','oʊ':'oa','əʊ':'oa','aʊ':'ow','ɔɪ':'oy','ɹ':'r','ɝ':'er','ɚ':'er'};
    const ipaExtraKeys = {'ɜr':'er','ɜː':'er','ɜ':'er','ɑr':'ar','ɑːr':'ar','ɔr':'or','ɔːr':'or','ɔ':'aw','ɔː':'aw','ɐ':'u'};
    function soundKey(value) {
      const record = value && typeof value === 'object' ? value : null;
      const explicitIpa = record && typeof record.ipa === 'string' && !!normalizeSound(record.ipa);
      let token = typeof value === 'string' ? normalizeSound(value) : '';
      if (record) {
        // soundKey is the already-resolved app notation in saved portable sets.
        const fields = explicitIpa ? ['ipa'] : ['soundKey', 'phoneme', 'sound', 'grapheme', 'label', 'text'];
        token = fields.map(field => normalizeSound(record[field])).find(Boolean) || '';
      }
      token = token.replace(/[\u02c8\u02cc\u0361]/g, '');
      if (explicitIpa && token === 'i') return 'ee';
      if (explicitIpa && token === 'u') return 'oo';
      if (explicitIpa && token === 'j') return 'y';
      const resolved = own(ipaExtraKeys, token) || token;
      return own(soundAliases, resolved) || resolved;
    }
    function soundBankSources(bank, value) {
      if (!bank || typeof bank !== 'object' || Array.isArray(bank)) return [];
      const resolved = soundKey(value);
      if (!resolved) return [];
      // Prefer a canonical entry, then equivalent caller spellings. Bank keys
      // use app notation: a raw key "i" must never supply explicit IPA /i/,
      // which has already resolved to "ee" before this lookup.
      const aliases = Object.keys(bank).filter(name => name !== resolved && soundKey(name) === resolved);
      return [resolved, ...aliases].map(name => own(bank, name)).filter(Boolean);
    }
    function parseWords(value, { lineSeparated = false } = {}) {
      const input = typeof value === 'string' ? value : '';
      if (input.length > 100000) throw new Error('Use up to 200 words in one practice set.');
      return input.split(lineSeparated ? /[\r\n]+/ : /[,\r\n]+/).map(word => word.trim()).filter(Boolean);
    }
    const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
    function normalizeOptions(value = {}) {
      const options = value && typeof value === 'object' ? value : {};
      return {
        mode: ['popup', 'blend', 'vocabulary', 'spelling', 'sentence'].includes(options.mode) ? options.mode : 'popup',
        repetitions: Math.round(bounded(options.repetitions == null ? 3 : options.repetitions, 3, 1, 10)),
        shuffle: options.shuffle !== false,
        varyPosition: options.varyPosition === true,
        varySize: options.varySize === true,
        autoAdvance: options.autoAdvance === true,
        intervalSeconds: bounded(options.intervalSeconds == null ? 3 : options.intervalSeconds, 3, 1, 30),
        includeAudio: options.includeAudio !== false,
        includePictures: options.includePictures !== false,
        vocabularyFirst: options.vocabularyFirst === 'meaning' ? 'meaning' : 'word',
        cardFont: ['default', 'arial', 'verdana', 'georgia'].includes(options.cardFont) ? options.cardFont : 'default',
        cardTextScale: bounded(options.cardTextScale == null ? 1 : options.cardTextScale, 1, 0.85, 1.4),
        cardTheme: ['paper', 'cream', 'mist'].includes(options.cardTheme) ? options.cardTheme : 'paper'
      };
    }
    // A shared allowlist keeps saved sets, offline cards and slides consistent.
    // System font fallbacks provide glyphs for scripts outside the chosen face.
    function cardAppearance(value) {
      const options = normalizeOptions(value);
      const fonts = { default: ['inherit', 'Arial'], arial: ['Arial, Helvetica, sans-serif', 'Arial'], verdana: ['Verdana, Geneva, sans-serif', 'Verdana'], georgia: ['Georgia, "Times New Roman", serif', 'Georgia'] };
      const palettes = {
        paper: { background: 'FFFFFF', heading: '172554', text: '1E293B', accent: '1E3A8A', muted: '475569', border: 'BAC6D9' },
        cream: { background: 'FFF8E8', heading: '44321F', text: '43382B', accent: '775120', muted: '6B5944', border: 'C6B58F' },
        mist: { background: 'EDF6F6', heading: '163F43', text: '1C4144', accent: '1E5960', muted: '466568', border: 'A0C2C5' }
      };
      return { fontFamily: fonts[options.cardFont][0], fontFace: fonts[options.cardFont][1], textScale: options.cardTextScale, ...palettes[options.cardTheme] };
    }
    function translationText(value, word) {
      const string = value => typeof value === 'string' ? value.trim() : '';
      let full = '';
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // A normalized text/translation wrapper already holds the full spoken
        // passage. Otherwise preserve both pieces of a structured glossary pair.
        full = string(value.text) || string(value.translation);
        if (!full) {
          const term = string(value.term) || string(value.word);
          const definition = string(value.def) || string(value.definition) || string(value.meaning);
          full = [term, definition].filter(Boolean).join(': ');
        }
      } else full = string(value);
      // Validate the complete passage, including the joining punctuation. Never
      // shorten the term or meaning independently before checking this bound.
      return instructionText(full, 'translation', word);
    }
    function translationsFor(value, word) {
      if (typeof value === 'string') { const clean = translationText(value, word); return clean ? [{ language: '', text: clean }] : []; }
      // Preserve every translation; the per-field and total instruction limits
      // below reject oversized sets without silently dropping languages.
      if (Array.isArray(value)) return value.map(item => ({
        language: text(item && typeof item === 'object' && (item.language || item.lang), 60), text: translationText(item, word)
      })).filter(item => item.text);
      if (!value || typeof value !== 'object') return [];
      return Object.keys(value).filter(language => !['__proto__', 'constructor', 'prototype'].includes(language)).map(language => ({
        language: text(language, 60), text: translationText(value[language], word)
      })).filter(item => item.text);
    }
    function sentenceActivityFor(record, word, language) {
      const saved = record.sentenceActivity;
      const board = record.activityItems && record.activityItems.read_sentence;
      const source = saved || board;
      if (!source || typeof source !== 'object') return null;
      if (saved && key(saved.answer) !== key(word)) return null;
      const choices = [...new Set((Array.isArray(source.choices || source.options) ? source.choices || source.options : []).map(value => text(value, 120)).filter(Boolean))];
      const answer = choices.find(value => key(value) === key(saved ? saved.answer : word));
      if (choices.length < 2 || choices.length > 6 || !answer) return null;
      let prompt;
      if (saved) prompt = instructionText(saved.prompt, 'sentence prompt', word);
      else {
        if (typeof board.before !== 'string' || typeof board.after !== 'string' || typeof board.sentence !== 'string') return null;
        // Preserve the teacher's prepared blank and choices. Do not invent a
        // sentence, or export a stale board whose target word has changed.
        const before = board.before.trim(), after = board.after.trim();
        const join = target => (before + ' ' + target + (/^[.,!?]/.test(after) ? '' : ' ') + after).trim();
        if (key(join(word)) !== key(board.sentence)) return null;
        prompt = instructionText(join('____'), 'sentence prompt', word);
      }
      return prompt ? { prompt, choices, answer, language: text(source.language || record.sentenceLanguage || language, 80) || 'en' } : null;
    }
    function normalizeInput(input = {}) {
      if (Array.isArray(input)) input = { words: input };
      if (!input || typeof input !== 'object') throw new Error('Open a saved word practice set or paste a word list.');
      const supplied = input.words == null ? (input.items == null ? input.data : input.items) : input.words;
      const words = typeof supplied === 'string' ? parseWords(supplied) : Array.isArray(supplied) ? supplied : [];
      if (words.length > 2000) throw new Error('Use up to 200 different words in one practice set.');
      const language = text(input.language, 80) || 'en';
      const stableText = (value, max) => {
        const clean = text(value, max + 1);
        if (clean.length > max) throw new Error('Practice item IDs must be ' + max + ' characters or fewer.');
        return clean;
      };
      const authoredId = record => stableText(record && record.entryId, 160);
      const portableId = record => stableText(record && record.id, 200);
      const reserved = new Set(words.map(raw => raw && typeof raw === 'object' ? authoredId(raw) ? 'entry:' + authoredId(raw) : portableId(raw) : '').filter(Boolean));
      let nextId = 1;
      const makeId = () => { while (reserved.has('w' + nextId)) nextId++; const id = 'w' + nextId++; reserved.add(id); return id; };
      const assets = new Map();
      function addAssets(source, destination = assets) {
        if (!source || typeof source !== 'object') return;
        Object.keys(source).forEach(name => { if (!['__proto__', 'constructor', 'prototype'].includes(name)) destination[key(name)] = source[name]; });
      }
      function addSharedAssets(source, fallbackLanguage) {
        if (!source || typeof source !== 'object') return;
        Object.keys(source).forEach(name => {
          if (['__proto__', 'constructor', 'prototype'].includes(name)) return;
          const value = source[name] && typeof source[name] === 'object' ? source[name] : {};
          const provenance = audioProvenance(value.provenance || value.synthesisProfile || value.metadata);
          const scope = audioLanguageKey(provenance.language || fallbackLanguage);
          if (!assets.has(scope)) assets.set(scope, Object.create(null));
          assets.get(scope)[key(name)] = source[name];
        });
      }
      // Untagged shared recordings belong to their originating language. An
      // explicit recording language takes precedence over its container.
      addSharedAssets(input.ttsAssets, language);
      words.forEach(item => { if (item && typeof item === 'object') addSharedAssets(item._ttsAssets, fieldLanguage(item, 'term', language)); });
      const banks = [{ bank: input.phonemeBank, language: input.bankLanguage || language }];
      if (input.phonemeBanks && typeof input.phonemeBanks === 'object' && !Array.isArray(input.phonemeBanks)) Object.keys(input.phonemeBanks).forEach(name => { banks.push({ bank: input.phonemeBanks[name], language: name }); });
      const bankSource = (sound, expected) => {
        for (const scoped of banks) {
          for (const source of soundBankSources(scoped.bank, sound)) {
            const state = audioCompatibility(source, expected);
            if (state.audio && (audioLanguageKey(scoped.language) === audioLanguageKey(expected) || state.status === 'ready')) return { audio: state.audio, provenance: { ...state.provenance, language: state.sourceLanguage || text(scoped.language, 256), source: state.provenance.source || 'recorded_bank' } };
          }
        }
        return '';
      };
      const items = [], seen = new Map(), usedIds = new Map();
      words.forEach(raw => {
        const record = typeof raw === 'string' ? { word: raw } : raw && typeof raw === 'object' ? raw : {};
        const original = text(record.targetWord || record.word || record.term, 10000).normalize('NFC');
        if (!original) return;
        if (original.length > LIMITS.wordLength) throw new Error('Each word or short phrase must be 120 characters or fewer.');
        const itemKey = key(original);
        const termLanguage = fieldLanguage(record, 'term', language), definitionLanguage = fieldLanguage(record, 'definition', language);
        const languageKey = audioLanguageKey(termLanguage);
        const entryId = authoredId(record), suppliedId = portableId(record);
        const identity = entryId ? 'entry:' + entryId : suppliedId ? 'id:' + suppliedId : 'word:' + JSON.stringify([languageKey, itemKey]);
        const existing = seen.get(identity);
        if (existing && key(existing.word) !== itemKey) throw new Error('One practice entry ID refers to different words. Give each distinct entry its own ID.');
        if (existing && audioLanguageKey(existing.termLanguage) !== languageKey) throw new Error('One practice entry ID refers to different languages. Give each distinct entry its own ID.');
        const id = existing ? existing.id : entryId ? 'entry:' + entryId : suppliedId || makeId();
        if (usedIds.has(id) && usedIds.get(id) !== identity) throw new Error('Each distinct practice entry needs its own stable ID.');
        const exampleLanguage = fieldLanguage(record, 'example', definitionLanguage);
        const ownAssets = Object.create(null); addAssets(record._ttsAssets, ownAssets);
        const directWord = record.wordAudio || record.audio || record.audioUrl || record.pronunciationAudio;
        const wordSource = safeAudio(directWord && (directWord.audio || directWord.asset || directWord)) ? directWord : own(ownAssets, itemKey) || own(assets.get(languageKey), itemKey) || '';
        const wordState = normalizedAudio(wordSource, termLanguage, wordSource === directWord ? record.wordAudioProvenance : undefined, record.wordAudioOriginal);
        const phonemes = (Array.isArray(record.phonemes) ? record.phonemes : []).slice(0, 40).map(phoneme => {
          const label = text(typeof phoneme === 'string' ? phoneme : phoneme && (phoneme.label || phoneme.grapheme || phoneme.ipa || phoneme.text || phoneme.phoneme || phoneme.sound), 40);
          const bankKey = soundKey(phoneme) || soundKey(label);
          const object = phoneme && typeof phoneme === 'object' ? phoneme : {};
          const direct = object.audio || object.asset;
          const source = safeAudio(direct && (direct.audio || direct.asset || direct)) ? direct : object.audioOriginal ? '' : bankSource(bankKey, termLanguage);
          const state = normalizedAudio(source, termLanguage, source === direct ? object.provenance : undefined, object.audioOriginal);
          return { label, soundKey: bankKey, audio: state.audio, provenance: state.provenance, audioStatus: state.status, ...(state.original ? { audioOriginal: state.original } : {}) };
        }).filter(phoneme => phoneme.label);
        const item = {
          id, ...(entryId ? { entryId } : {}), word: original, termLanguage, definitionLanguage, exampleLanguage,
          definition: instructionText(record.definition || record.def || record.meaning, 'definition', original),
          example: instructionText(record.example || record.exampleSentence || record.sentence, 'example', original),
          translations: translationsFor(record.translations || record.translation, original),
          wordAudio: wordState.audio, wordAudioProvenance: wordState.provenance, wordAudioStatus: wordState.status, ...(wordState.original ? { wordAudioOriginal: wordState.original } : {}),
          phonemes,
          sentenceActivity: sentenceActivityFor(record, original, termLanguage),
          picture: pictureFor(record, original)
        };
        if (existing) {
          ['definition', 'example'].forEach(field => { if (!existing[field] && item[field]) { existing[field] = item[field]; existing[field + 'Language'] = item[field + 'Language']; } });
          if (!existing.wordAudio && item.wordAudio) { existing.wordAudio = item.wordAudio; existing.wordAudioProvenance = item.wordAudioProvenance; existing.wordAudioStatus = item.wordAudioStatus; }
          if (!existing.wordAudioOriginal && item.wordAudioOriginal) existing.wordAudioOriginal = item.wordAudioOriginal;
          if (!existing.phonemes.length) existing.phonemes = item.phonemes;
          if (!existing.translations.length) existing.translations = item.translations;
          if (!existing.sentenceActivity) existing.sentenceActivity = item.sentenceActivity;
          if (!existing.picture) existing.picture = item.picture;
          return;
        }
        seen.set(identity, item); usedIds.set(id, identity); items.push(item);
      });
      if (items.length > LIMITS.words) throw new Error('Use up to 200 different words in one practice set.');
      const instructionChars = items.reduce((sum, item) => sum + item.definition.length + item.example.length + item.translations.reduce((n, translation) => n + translation.text.length, 0) + (item.sentenceActivity ? item.sentenceActivity.prompt.length : 0), 0);
      if (instructionChars > LIMITS.totalInstructionChars) throw new Error('This practice set has too much instructional text. Use up to 524,288 characters across definitions, examples, translations and sentence prompts, or split it into smaller lists.');
      // Count references, not just unique strings: standalone JSON embeds each
      // referenced clip, even when many words share a phoneme recording.
      let audioChars = 0;
      items.forEach(item => { audioChars += item.wordAudio.length + (item.wordAudioOriginal ? item.wordAudioOriginal.audio.length : 0); item.phonemes.forEach(sound => { audioChars += sound.audio.length + (sound.audioOriginal ? sound.audioOriginal.audio.length : 0); }); });
      if (audioChars > LIMITS.totalAudioChars) throw new Error('This practice set has too much audio. Split it into smaller word lists.');
      // Pictures past the budget are left out (and counted) rather than blocking the set.
      let pictureChars = 0, picturesOmitted = 0;
      items.forEach(item => {
        if (!item.picture || !/^data:/.test(item.picture.src)) return;
        if (pictureChars + item.picture.src.length > LIMITS.totalPictureChars) { item.picture = null; picturesOmitted++; }
        else pictureChars += item.picture.src.length;
      });
      return { version: 1, title: text(input.title, 160) || 'Word Fluency Pop-Up', language, items, options: normalizeOptions(input.options), ...(picturesOmitted ? { picturesOmitted } : {}) };
    }
    function createSequence(pack, value = {}, rng = Math.random) {
      const options = normalizeOptions(value);
      const allItems = Array.isArray(pack && pack.items) ? pack.items : [];
      const items = options.mode === 'sentence' ? allItems.filter(item => item.sentenceActivity) : allItems;
      if (options.mode === 'sentence' && !items.length) throw new Error('Prepare a Finish the Sentence activity in Word Sounds, then open Present & Export from that prepared set.');
      if (items.length > LIMITS.words) throw new Error('Use up to 200 words in one practice set.');
      const randomIndex = length => Math.min(length - 1, Math.max(0, Math.floor((Number(rng()) || 0) * length)));
      const positions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const scales = [0.8, 1, 1.15];
      const sequence = [];
      for (let round = 0; round < options.repetitions; round++) {
        const order = items.map(item => item.id);
        if (options.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        if (order.length > 1 && sequence.length && sequence[sequence.length - 1].itemId === order[0]) {
          const j = 1 + randomIndex(order.length - 1); [order[0], order[j]] = [order[j], order[0]];
        }
        order.forEach(itemId => sequence.push({ itemId, position: options.varyPosition ? positions[randomIndex(positions.length)] : 'center', scale: options.varySize ? scales[randomIndex(scales.length)] : 1 }));
      }
      return sequence;
    }
    function audioCoverage(pack) {
      const result = { words: 0, totalWords: 0, phonemes: 0, totalPhonemes: 0, completePhonemeWords: 0 };
      (pack && pack.items || []).forEach(item => {
        result.totalWords++; if (safeAudio(item.wordAudio)) result.words++;
        const sounds = item.phonemes || []; result.totalPhonemes += sounds.length;
        const ready = sounds.filter(sound => safeAudio(sound.audio)).length;
        result.phonemes += ready;
        if (ready && ready === sounds.length) result.completePhonemeWords++;
      });
      return result;
    }
    // "Start with the meaning" blanks the word (and its simple endings) in its own clue,
    // so the definition or example never gives the answer away.
    function maskWord(value, word) {
      const source = typeof value === 'string' ? value : '', target = text(word, LIMITS.wordLength);
      if (!source || !target) return source;
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      try {
        // Scripts written without spaces have no word boundary to anchor on.
        const pattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(target)
          ? new RegExp(escaped, 'giu')
          : new RegExp('(?<![\\p{L}\\p{N}])' + escaped + "(?:s|es|ed|d|ing|'s)?(?![\\p{L}\\p{N}])", 'giu');
        return source.replace(pattern, '____');
      } catch (_) { return source; }
    }
    // Something to recall the word from; without it a card falls back to word-first.
    function hasMeaning(item, options) {
      return !!(item && (item.definition || item.example || (item.translations && item.translations.length) || (options && options.includePictures && item.picture)));
    }
    function serializePack(pack) { return safeJson(normalizeInput(pack)); }
    return { LIMITS, text, key, languageInfo, languageLabel, audioLanguageKey, fieldLanguage, audioCompatibility, audioIssueCounts, soundKey, soundBankSources, safeAudio, safePicture, maskWord, hasMeaning, escapeHtml, safeJson, parseWords, normalizeInput, normalizeOptions, cardAppearance, createSequence, audioCoverage, serializePack };
  }
  root.AlloWordPracticeCore = createWordPracticeCore();
  // The standalone HTML player embeds this exact factory, keeping its validator
  // and sequence behavior identical to the in-app experience.
  root.AlloWordPracticeCore.createCore = createWordPracticeCore;
})(typeof window !== 'undefined' ? window : globalThis);
