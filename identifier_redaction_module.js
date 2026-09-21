/**
 * AlloFlow identifier redaction.
 *
 * The FERPA boundary for every tool that sends clinician-authored text to an AI
 * provider. Extracted from report_writer_module.js so Report Writer and Dynamic
 * Assessment share ONE implementation -- a copied scrubber is how
 * tests/extracted_logic/clinical_logic.js came to assert the old, leaky
 * behaviour while the real one had already been fixed.
 *
 * DESIGN CONSTRAINT: never damage clinical meaning. Redaction is one safeguard
 * among several, so a miss is recoverable while a silent corruption is not --
 * the scrub runs on the way OUT, and nobody ever sees the mangled text the
 * model actually reasoned over. See scrubIdentifiers for what that rules out.
 */
(function () {
  'use strict';

  var VERSION = 'identifier-redaction/v1';

  // Redact student-identifying text before it leaves the browser for an AI
  // provider. 18 call sites route prompt text through this.
  //
  // DESIGN CONSTRAINT: never damage clinical meaning. This is ONE safeguard among
  // several, not the only one, so a miss is recoverable while a silent corruption
  // is not -- the scrub happens on the way OUT, so the clinician never sees the
  // mangled text the model actually reasoned over.
  //
  // Consequences:
  //   1. A name part that is also an ordinary English word is NOT redacted.
  //      Students are named Mark, Grace, Hope, Will, Hall, Berry. Redacting those
  //      would turn "will mark the answer" into "[Student] [Student] the answer".
  //      Such parts are REPORTED instead (analyzeRedaction) so the clinician can
  //      decide.
  //   2. Role is preserved: [Student] / [Mother] / [Teacher], never a flat [NAME].
  //      "mother reports X, teacher reports Y" is the informant distinction a
  //      psychoeducational report is built on.
  //   3. Age-relative timing ("at 18 months", "2nd grade level", "15 minutes") is
  //      KEPT. Only full calendar dates are redacted: regression at 18 months is a
  //      clinical fact, the date it was recorded is not.
  const NAME_PARTICLES = new Set(['de', 'del', 'della', 'der', 'di', 'du', 'la', 'le', 'van', 'von', 'bin', 'al', 'st', 'mc', 'mac', 'jr', 'sr', 'ii', 'iii', 'iv']);

  // Name parts that are also common English words. Redacting these corrupts
  // ordinary clinical prose, so they are surfaced to the clinician instead.
  const COMMON_WORD_NAMES = new Set(['mark', 'grace', 'hope', 'will', 'faith', 'joy', 'rose', 'daisy', 'lily', 'violet', 'summer', 'autumn', 'april', 'may', 'june', 'august', 'hall', 'berry', 'reed', 'bell', 'storm', 'justice', 'chase', 'brook', 'brooke', 'dean', 'earl', 'king', 'price', 'rich', 'young', 'long', 'short', 'small', 'white', 'black', 'brown', 'green', 'gray', 'grey', 'stone', 'wood', 'woods', 'field', 'fields', 'rivers', 'banks', 'bridge', 'cross', 'drew', 'frank', 'gene', 'art', 'bill', 'don', 'jack', 'rob', 'sue', 'pat', 'max', 'ray', 'dawn', 'holly', 'ivy', 'pearl', 'ruby', 'sunny', 'angel', 'baker', 'carter', 'cook', 'fisher', 'hunter', 'miller', 'parker', 'porter', 'potter', 'taylor', 'turner', 'walker', 'ward', 'wright']);

  const escapeRegExp = (value) => String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Split a name into { safe, risky } parts. `safe` can be redacted without
  // touching ordinary prose; `risky` collides with common English and is left
  // alone so the narrative survives intact.
  const nameRedactionParts = (fullName) => {
      const raw = String(fullName == null ? '' : fullName).trim();
      if (!raw) return { safe: [], risky: [] };
      const parts = raw.split(/[\s,]+/)
          .map(p => p.replace(/[.'"]+$/, '').trim())
          .filter(p => p.length > 1 && !NAME_PARTICLES.has(p.toLowerCase()));
      const safe = [];
      const risky = [];
      parts.forEach(p => {
          if (COMMON_WORD_NAMES.has(p.toLowerCase())) risky.push(p);
          else safe.push(p);
      });
      safe.sort((a, b) => b.length - a.length);
      return { safe: safe, risky: risky };
  };

  // Collect { name, token } for the student plus every other person the clinician
  // named. `people`: [{ name, role }] where role is a label like 'Mother'.
  const redactionEntries = (opts) => {
      const o = opts || {};
      const entries = [];
      const primary = String(o.studentName == null ? '' : o.studentName).trim();
      if (primary) entries.push({ name: primary, token: '[Student]' });
      (Array.isArray(o.people) ? o.people : []).forEach(entry => {
          if (!entry) return;
          const nm = String(entry.name == null ? '' : entry.name).trim();
          if (!nm) return;
          const role = String(entry.role || 'Name').trim() || 'Name';
          entries.push({ name: nm, token: '[' + role + ']' });
      });
      return entries;
  };

  const scrubIdentifiers = (text, options) => {
      if (!text) return text;
      const opts = options || {};
      let out = String(text);
      const entries = redactionEntries(opts);

      // Pass 1: every FULL multi-word name, longest first. This must complete
      // before any single-part pass, or a shared family surname gets claimed by
      // whoever ran first and the other person's full name is then half-redacted
      // ("[Student] [Mother]").
      entries.slice()
          .sort((a, b) => b.name.length - a.name.length)
          .forEach(function (item) {
              const seq = item.name.split(/\s+/).filter(Boolean).map(escapeRegExp);
              if (seq.length < 2) return;
              // Whitespace-tolerant so double spaces and line wraps still match.
              out = out.replace(new RegExp('\\b' + seq.join('[\\s\\n]+') + '\\b', 'gi'), item.token);
              // "Surname, First" as rosters and protocols print it.
              out = out.replace(new RegExp('\\b' + seq.slice().reverse().join(',[\\s\\n]+') + '\\b', 'gi'), item.token);
          });

      // Pass 2: single name parts. A part shared by more than one person is
      // ambiguous alone -- "Rivera attended" could be either -- so it becomes a
      // neutral [NAME] rather than guessing a role.
      const partOwners = new Map();
      entries.forEach(function (item) {
          nameRedactionParts(item.name).safe.forEach(function (part) {
              const key = part.toLowerCase();
              if (!partOwners.has(key)) partOwners.set(key, { part: part, tokens: [] });
              const rec = partOwners.get(key);
              if (rec.tokens.indexOf(item.token) === -1) rec.tokens.push(item.token);
          });
      });
      Array.from(partOwners.values())
          .sort((a, b) => b.part.length - a.part.length)
          .forEach(function (rec) {
              const token = rec.tokens.length === 1 ? rec.tokens[0] : '[NAME]';
              out = out.replace(new RegExp('\\b' + escapeRegExp(rec.part) + '\\b', 'gi'), token);
          });

      // Structured identifiers. Order matters: SSN before the generic phone
      // pattern, which would otherwise consume a 9-digit run.
      out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
      out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
      out = out.replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]');
      out = out.replace(/\b(?:student\s*id|district\s*id|medicaid|case\s*(?:no|number)|dob)\s*[:#-]?\s*[A-Z0-9/-]+\b/gi, '[IDENTIFIER]');
      out = out.replace(/\b\d{1,5}\s+[A-Z][A-Za-z]*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl|Terrace|Ter)\b\.?/gi, '[ADDRESS]');
      // Calendar dates ONLY. Ages, durations and grade levels are clinical data.
      out = out.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
      out = out.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4}\b/gi, '[DATE]');
      return out;
  };

  // What redaction will and will not cover for this text. Drives the pre-send
  // disclosure: no regex catches every identifier, so the clinician is shown what
  // survives and decides. This is the honest half of the feature.
  const analyzeRedaction = (text, options) => {
      const opts = options || {};
      const src = String(text == null ? '' : text);
      const hasName = !!String(opts.studentName == null ? '' : opts.studentName).trim();
      const present = (word) => new RegExp('\\b' + escapeRegExp(word) + '\\b', 'i').test(src);
      const risky = [];
      redactionEntries(opts).forEach(function (item) {
          nameRedactionParts(item.name).risky.forEach(function (p) {
              if (present(p) && risky.indexOf(p) === -1) risky.push(p);
          });
      });
      // Titled people the clinician never entered -- a grandmother, a classmate's
      // parent, a consulting specialist -- so unlisted names still get flagged.
      const titled = [];
      const titleRe = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Coach|Principal|Nurse)\.?\s+([A-Z][a-z]{2,})\b/g;
      let m;
      while ((m = titleRe.exec(src)) !== null) {
          if (titled.indexOf(m[1]) === -1) titled.push(m[1]);
      }
      return {
          hasStudentName: hasName,
          riskyNameParts: risky,
          unlistedTitledNames: titled,
          needsAttention: !hasName || risky.length > 0 || titled.length > 0
      };
  };
  var API = {
    VERSION: VERSION,
    scrubIdentifiers: scrubIdentifiers,
    nameRedactionParts: nameRedactionParts,
    analyzeRedaction: analyzeRedaction
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.IdentifierRedaction = API;
  }
})();
