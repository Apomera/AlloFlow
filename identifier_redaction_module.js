/**
 * AlloFlow identifier redaction.
 *
 * A common-identifier safeguard for clinician-authored text sent to an AI
 * provider. This is not a de-identification or authorization guarantee.
 * Extracted from report_writer_module.js so Report Writer and Dynamic
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

  function __alloT(key, fallback) {
    try {
      var host = typeof window !== 'undefined' ? window : globalThis;
      var value = typeof host.__alloT === 'function' ? host.__alloT(key) : null;
      if (typeof value === 'string' && value !== '' && value !== key) return value;
    } catch (_) {}
    return fallback == null ? key : fallback;
  }

  var VERSION = 'identifier-redaction/v2';

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
  // Generic codenames such as "Student A" must not rewrite every occurrence of
  // "student" in clinical instructions. The complete entered name still matches.
  ['student', 'learner', 'teacher', 'parent', 'mother', 'father', 'caregiver', 'guardian', 'observer', 'participant', 'child', 'adult', 'sibling', 'family', 'peer', 'clinician', 'evaluator'].forEach(word => COMMON_WORD_NAMES.add(word));

  const safeStr = (value) => {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'symbol') return '';
      try { return String(value); } catch (_) { return ''; }
  };
  const escapeRegExp = (value) => safeStr(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const WB_START = '(?<![\\p{L}\\p{N}_])';
  const WB_END = '(?![\\p{L}\\p{N}_])';

  // Split a name into { safe, risky } parts. `safe` can be redacted without
  // touching ordinary prose; `risky` collides with common English and is left
  // alone so the narrative survives intact.
  const nameRedactionParts = (fullName) => {
      const raw = safeStr(fullName).trim();
      if (!raw) return { safe: [], risky: [] };
      const parts = raw.split(/[\s,]+/)
          .map(p => p.replace(/^['"(\[]+|['").\]]+$/g, '').trim())
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

  const MAX_PEOPLE_ENTRIES = 100;
  const MAX_TARGET_ITEMS = 100;
  const MAX_NAME_LEN = 160;
  const MAX_PENDING_REVIEWS = 50;

  // Collect { name, token } for the student plus every other person the clinician
  // named. `people`: [{ name, role }] where role is a label like 'Mother'.
  const redactionEntries = (opts) => {
      const o = opts || {};
      const entries = [];
      const primary = safeStr(o.studentName).trim().slice(0, MAX_NAME_LEN);
      if (primary) entries.push({ name: primary, token: '[Student]' });
      (Array.isArray(o.people) ? o.people.slice(0, MAX_PEOPLE_ENTRIES) : []).forEach(entry => {
          if (!entry || typeof entry !== 'object') return;
          const nm = safeStr(entry.name).trim().slice(0, MAX_NAME_LEN);
          if (!nm) return;
          const role = safeStr(entry.role || 'Name').replace(/[\[\]\u0000-\u001f\u007f]/g, '').trim().slice(0, 48) || 'Name';
          entries.push({ name: nm, token: '[' + role + ']' });
      });
      return entries;
  };

  const scrubIdentifiers = (text, options) => {
      if (!text) return text;
      const opts = options || {};
      let out = safeStr(text);
      const entries = redactionEntries(opts);
      const protectedTokens = Array.from(new Set([
          '[Student]', '[NAME]', '[EMAIL]', '[SSN]', '[PHONE]', '[IDENTIFIER]', '[ADDRESS]', '[DATE]', '[REMOVED]'
      ].concat(entries.map(e => e.token))));
      const protectedTokenSet = new Set(protectedTokens);
      const protectedTokenRe = new RegExp('(' + protectedTokens.map(escapeRegExp).join('|') + ')', 'g');
      const replaceOutsideTokens = (str, re, replacer) => str.split(protectedTokenRe).map(seg => {
          if (protectedTokenSet.has(seg)) return seg;
          return seg.replace(re, replacer);
      }).join('');

      // Redact a complete email before names: replacing "Jordan" first in
      // jordan@school.example would otherwise leave [Student]@school.example.
      out = out.replace(/\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,24}\b/gi, '[EMAIL]');

      // Pass 1: every FULL multi-word name, longest first. This must complete
      // before any single-part pass, or a shared family surname gets claimed by
      // whoever ran first and the other person's full name is then half-redacted
      // ("[Student] [Mother]").
      entries.slice()
          .sort((a, b) => b.name.length - a.name.length)
          .forEach(function (item) {
              const cleanToken = (t) => t.replace(/^['"(\[]+|['").\]]+$/g, '').trim();
              const hasComma = item.name.indexOf(',') !== -1;
              let firstLastSeq;
              let surnameFirstPattern = null;
              if (hasComma) {
                  const commaParts = item.name.split(',');
                  const surParts = commaParts[0].split(/\s+/).map(cleanToken).filter(Boolean).slice(0, 4);
                  const givenParts = commaParts.slice(1).join(' ').split(/\s+/).map(cleanToken).filter(Boolean).slice(0, 4);
                  if (surParts.length && givenParts.length) {
                      firstLastSeq = givenParts.concat(surParts).map(escapeRegExp);
                      surnameFirstPattern = surParts.map(escapeRegExp).join('[\\s\\n]+') + ',[\\s\\n]+' + givenParts.map(escapeRegExp).join('[\\s\\n]+');
                  }
              }
              const rawSeq = item.name.split(/[\s,]+/).map(cleanToken).filter(Boolean).slice(0, 8).map(escapeRegExp);
              const seq = firstLastSeq || rawSeq;
              if (seq.length < 2) return;
              // Use a replacer function so custom roles containing "$" (e.g. "$&")
              // can never be interpreted as RegExp replacement patterns.
              const replacer = () => item.token;
              // Whitespace-tolerant Unicode word boundaries so accented & non-Latin
              // names (José, Álvarez, Arabic/CJK/Cyrillic) are redacted reliably.
              out = replaceOutsideTokens(out, new RegExp(WB_START + seq.join('[\\s\\n]+') + WB_END, 'giu'), replacer);
              // "Surname, First [Middle]" as rosters and protocols print it.
              const surnameFirst = surnameFirstPattern || (seq[seq.length - 1] + ',[\\s\\n]+' + seq.slice(0, -1).join('[\\s\\n]+'));
              out = replaceOutsideTokens(out, new RegExp(WB_START + surnameFirst + WB_END, 'giu'), replacer);
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
              out = replaceOutsideTokens(out, new RegExp(WB_START + escapeRegExp(rec.part) + WB_END, 'giu'), () => token);
          });

      // Structured identifiers. Order matters: SSN before the generic phone
      // pattern, which would otherwise consume a 9-digit run.
      out = out.replace(/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g, '[SSN]');
      out = out.replace(/(?<![\dA-Za-z])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]');
      out = out.replace(/\b(?:student\s*id|district\s*id|medicaid(?:\s*id)?|case\s*(?:no\.?|number)|dob|date\s+of\s+birth|birth\s*date)\s*(?:[:#.-]\s*){0,2}(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s*\d{2,4}|[A-Z0-9][A-Z0-9/.-]*)\b/gi, '[IDENTIFIER]');
      out = out.replace(/\b\d{1,5}\s+(?:[A-Z][A-Za-z0-9'.-]*\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl|Terrace|Ter|STREET|ST|AVENUE|AVE|ROAD|RD|DRIVE|DR|LANE|LN|BOULEVARD|BLVD|COURT|CT|WAY|PLACE|PL|TERRACE|TER)\b\.?/g, '[ADDRESS]');
      // Calendar dates ONLY. Ages, durations and grade levels are clinical data.
      out = out.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
      out = out.replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, '[DATE]');
      out = out.replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sept?\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{1,2},?\s*\d{2,4}\b/gi, '[DATE]');
      return out;
  };

  // What redaction will and will not cover for this text. Drives the pre-send
  // disclosure: no regex catches every identifier, so the clinician is shown what
  // survives and decides. This is the honest half of the feature.
  const analyzeRedaction = (text, options) => {
      const opts = options || {};
      const src = safeStr(text);
      const hasName = !!safeStr(opts.studentName).trim();
      const present = (word) => new RegExp(WB_START + escapeRegExp(word) + WB_END, 'iu').test(src);
      const risky = [];
      const seenRisky = new Set();
      redactionEntries(opts).forEach(function (item) {
          nameRedactionParts(item.name).risky.forEach(function (p) {
              const lower = p.toLowerCase();
              if (present(p) && !seenRisky.has(lower)) {
                  seenRisky.add(lower);
                  risky.push(p);
              }
          });
      });
      // Titled people the clinician never entered -- a grandmother, a classmate's
      // parent, a consulting specialist -- so unlisted names still get flagged.
      const titled = [];
      const titleRe = /\b(?:[Mm][Rr]|[Mm][Rr][Ss]|[Mm][Ss]|[Mm][Xx]|[Mm][Ii][Ss][Ss]|[Dd][Rr]|[Pp][Rr][Oo][Ff]|[Cc][Oo][Aa][Cc][Hh]|[Pp][Rr][Ii][Nn][Cc][Ii][Pp][Aa][Ll]|[Nn][Uu][Rr][Ss][Ee])\.?\s+([\p{Lu}][\p{L}'-]{1,})(?![\p{L}\p{N}_])/gu;
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
  // A final outbound COPY, never a mutation of the clinical record. Explicit
  // removal targets are user-selected: common-word names are still left alone
  // by the automatic scrubber so clinical prose is not silently corrupted.
  const prepareSensitivePrompt = (text, options) => {
      if (typeof text !== 'string') throw new TypeError('AI review requires text.');
      const opts = options || {};
      const extraRoleTokens = Array.isArray(opts.roleTokens)
          ? opts.roleTokens.filter(tok => typeof tok === 'string' && /^\[[^\[\]\u0000-\u001f\u007f]{1,48}\]$/.test(tok)).slice(0, MAX_PEOPLE_ENTRIES)
          : [];
      const tokens = Array.from(new Set(['[Student]', '[NAME]', '[EMAIL]', '[SSN]', '[PHONE]', '[IDENTIFIER]', '[ADDRESS]', '[DATE]', '[REMOVED]'].concat(redactionEntries(opts).map(entry => entry.token), extraRoleTokens)));
      const tokenPattern = new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'g');
      const targets = Array.isArray(opts.identifiers) ? opts.identifiers.slice(0, MAX_TARGET_ITEMS) : [];
      const targetPatterns = targets
          .map(item => safeStr(item).trim().slice(0, MAX_NAME_LEN))
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)
          .map(item => {
              const core = item.split(/\s+/).slice(0, 12).map(escapeRegExp).join('\\s+');
              const startBound = /^[\p{L}\p{N}_]/u.test(item) ? WB_START : '';
              const endBound = /[\p{L}\p{N}_]$/u.test(item) ? WB_END : '';
              return startBound + core + endBound;
          });
      const combinedTargetRe = targetPatterns.length ? new RegExp(targetPatterns.join('|'), 'giu') : null;
      // Existing placeholders are opaque, including when a known person's
      // literal name is "Student". Repeated review must not nest [Student].
      const out = text.split(tokenPattern).map(part => {
          if (tokens.includes(part)) return part;
          return scrubIdentifiers(part, opts).split(tokenPattern).map(chunk => {
              if (tokens.includes(chunk)) return chunk;
              return combinedTargetRe ? chunk.replace(combinedTargetRe, () => '[REMOVED]') : chunk;
          }).join('');
      }).join('');
      return { text: out, analysis: analyzeRedaction(out, opts) };
  };

  const sensitiveReviewAbort = () => {
      const error = new Error('AI request cancelled before sending.');
      error.name = 'AbortError';
      error.code = 'ALLOFLOW_AI_REVIEW_CANCELLED';
      return error;
  };

  // No network, storage, telemetry, or automatic acceptance. All queued requests
  // must be reviewed separately; accepting one never authorizes a later payload.
  const createSensitivePromptGate = (config) => {
      const onChange = config && typeof config.onChange === 'function' ? config.onChange : () => {};
      let sequence = 0;
      let queue = [];
      const currentReview = () => {
          const entry = queue[0];
          if (!entry) return null;
          const analysis = entry.analysis ? {
              hasStudentName: !!entry.analysis.hasStudentName,
              riskyNameParts: Array.isArray(entry.analysis.riskyNameParts) ? entry.analysis.riskyNameParts.slice() : [],
              unlistedTitledNames: Array.isArray(entry.analysis.unlistedTitledNames) ? entry.analysis.unlistedTitledNames.slice() : [],
              needsAttention: !!entry.analysis.needsAttention
          } : null;
          const media = entry.options.media && typeof entry.options.media === 'object'
              ? Object.assign({}, entry.options.media)
              : (entry.options.media || null);
          return {
              id: entry.id, prompt: entry.prompt, searchQuery: entry.searchQuery,
              analysis: analysis, label: entry.options.label || '',
              media: media,
              roleTokens: Array.from(new Set(redactionEntries(entry.options).map(item => item.token)))
          };
      };
      const notify = () => { try { onChange(currentReview()); } catch (_) {} };
      const remove = (entry, value, error, shouldNotify = true) => {
          const wasCurrent = queue[0] === entry;
          const index = queue.indexOf(entry);
          if (index < 0) return;
          queue.splice(index, 1);
          try {
              if (entry.options.signal && entry.abortListener) entry.options.signal.removeEventListener('abort', entry.abortListener);
          } catch (_) {}
          if (error) entry.reject(error); else entry.resolve(value);
          if (wasCurrent && shouldNotify) notify();
      };
      return {
          request(prompt, options) {
              if (queue.length >= MAX_PENDING_REVIEWS) {
                  return Promise.reject(new Error('Too many pending AI review requests.'));
              }
              const input = options || {};
              const opts = {
                  ...input,
                  studentName: safeStr(input.studentName).slice(0, MAX_NAME_LEN),
                  people: (Array.isArray(input.people) ? input.people.slice(0, MAX_PEOPLE_ENTRIES) : []).map(person => ({
                      name: safeStr(person && person.name).slice(0, MAX_NAME_LEN),
                      role: safeStr(person && person.role || 'Name').slice(0, 48)
                  })),
                  identifiers: (Array.isArray(input.identifiers) ? input.identifiers.slice(0, MAX_TARGET_ITEMS) : []).map(item => safeStr(item).slice(0, MAX_NAME_LEN)).filter(Boolean),
                  roleTokens: Array.isArray(input.roleTokens) ? input.roleTokens.slice(0, MAX_PEOPLE_ENTRIES) : undefined,
                  media: input.media && typeof input.media === 'object' ? Object.assign({}, input.media) : input.media
              };
              if (opts.signal && opts.signal.aborted) return Promise.reject(sensitiveReviewAbort());
              let prepared, query;
              try {
                  prepared = prepareSensitivePrompt(prompt, opts);
                  query = typeof input.searchQuery === 'string' ? prepareSensitivePrompt(input.searchQuery, opts).text : undefined;
              } catch (error) { return Promise.reject(error); }
              return new Promise((resolve, reject) => {
                  const entry = { id: ++sequence, prompt: prepared.text, analysis: prepared.analysis, searchQuery: query, options: opts, resolve, reject };
                  if (opts.signal && typeof opts.signal.addEventListener === 'function') {
                      entry.abortListener = () => remove(entry, null, sensitiveReviewAbort());
                      opts.signal.addEventListener('abort', entry.abortListener, { once: true });
                  }
                  queue.push(entry);
                  if (queue.length === 1) notify();
              });
          },
          accept(id, edited) {
              const entry = queue[0];
              if (!entry || entry.id !== id) return { sent: false, changed: false };
              if (entry.options.signal && entry.options.signal.aborted) {
                  remove(entry, null, sensitiveReviewAbort());
                  return { sent: false, changed: false };
              }
              const value = edited || {};
              if (typeof value.prompt !== 'string' || !value.prompt.trim()) return { sent: false, changed: false };
              const addedTargets = Array.isArray(value.identifiers)
                  ? value.identifiers.slice(0, MAX_TARGET_ITEMS).map(item => safeStr(item).trim().slice(0, MAX_NAME_LEN)).filter(Boolean)
                  : [];
              const mergedTargets = Array.from(new Set(addedTargets.concat(entry.options.identifiers))).slice(0, MAX_TARGET_ITEMS);
              const opts = { ...entry.options, identifiers: mergedTargets };
              const prepared = prepareSensitivePrompt(value.prompt, opts);
              const expectedQuery = entry.searchQuery === undefined ? undefined
                  : (typeof value.searchQuery === 'string' ? value.searchQuery : entry.searchQuery);
              const query = expectedQuery === undefined ? undefined : prepareSensitivePrompt(expectedQuery, opts).text;
              // If an edit introduced identifiers, show the newly scrubbed copy
              // and require a fresh click, so the sent text is the reviewed text.
              if (prepared.text !== value.prompt || query !== expectedQuery) {
                  entry.prompt = prepared.text;
                  entry.searchQuery = query;
                  entry.analysis = prepared.analysis;
                  entry.options = opts;
                  notify();
                  return { sent: false, changed: true };
              }
              remove(entry, { prompt: prepared.text, searchQuery: query }, null);
              return { sent: true, changed: false };
          },
          cancel(id) {
              const entry = queue.find(item => item.id === id);
              if (entry) remove(entry, null, sensitiveReviewAbort());
          },
          cancelAll(options) {
              const pending = queue.slice();
              pending.forEach(entry => remove(entry, null, sensitiveReviewAbort(), false));
              if (!options || options.notify !== false) notify();
          },
          getCurrent: currentReview
      };
  };

  // React is passed by the host; importing this module remains safe for pure
  // Node consumers and does not create another React instance.
  const SensitivePromptReview = (props) => {
      const React = props.React;
      const h = React.createElement;
      const review = props.review;
      const [prompt, setPrompt] = React.useState(review.prompt);
      const [query, setQuery] = React.useState(review.searchQuery || '');
      const [identifiers, setIdentifiers] = React.useState('');
      const [confirmed, setConfirmed] = React.useState(false);
      const [notice, setNotice] = React.useState('');
      const dialogRef = React.useRef(null);
      const openerRef = React.useRef(null);
      const backdropDownRef = React.useRef(null);
      React.useEffect(() => {
          setPrompt(review.prompt);
          setQuery(review.searchQuery || '');
          setConfirmed(false);
      }, [review.id, review.prompt, review.searchQuery]);
      React.useEffect(() => {
          setIdentifiers('');
          setNotice('');
      }, [review.id]);
      React.useEffect(() => {
          openerRef.current = document.activeElement;
          const background = [];
          let branch = dialogRef.current?.parentElement;
          while (branch && branch.parentElement && branch.parentElement !== document.documentElement) {
              Array.from(branch.parentElement.children).forEach(sibling => {
                  if (sibling !== branch && !['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE'].includes(sibling.tagName)
                      && !(typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))) {
                      background.push({ node: sibling, inert: sibling.hasAttribute('inert') });
                      sibling.setAttribute('inert', '');
                  }
              });
              branch = branch.parentElement;
          }
          dialogRef.current?.querySelector('[data-sensitive-review-initial]')?.focus();
          return () => {
              background.forEach(({ node, inert }) => { if (!inert) node.removeAttribute('inert'); });
              const opener = openerRef.current;
              if (opener && opener !== document.body && opener !== document.documentElement && opener.isConnected && typeof opener.focus === 'function') opener.focus();
          };
      }, []);
      React.useEffect(() => {
          dialogRef.current?.querySelector('[data-sensitive-review-initial]')?.focus();
      }, [review.id]);
      const cancel = () => { if (typeof props.onCancel === 'function') props.onCancel(review.id); };
      const targets = () => identifiers.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
      const accept = () => {
          if (typeof props.onAccept !== 'function') return;
          const outcome = props.onAccept(review.id, { prompt, searchQuery: query, identifiers: targets() });
          if (outcome && outcome.changed) {
              setConfirmed(false);
              setNotice('More identifiers were removed. Review the updated text before sending.');
          }
      };
      const keyDown = event => {
          if (event.key === 'Escape') {
              if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
              event.preventDefault(); event.stopPropagation(); cancel(); return;
          }
          if (event.key !== 'Tab') return;
          event.stopPropagation();
          const items = Array.from(dialogRef.current?.querySelectorAll('a[href], summary, button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])
              .filter(node => !node.hidden && !node.closest('[hidden], [inert]'));
          if (!items.length) return;
          const first = items[0], last = items[items.length - 1];
          const active = typeof document !== 'undefined' ? document.activeElement : null;
          const idx = items.indexOf(active);
          if (idx === -1) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
          else if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
      };
      const field = { width: '100%', boxSizing: 'border-box', color: '#0f172a', background: '#fff', border: '1px solid #64748b', borderRadius: 6, padding: 10, font: 'inherit' };
      const secondaryBtn = { padding: '10px 16px', minHeight: 44, color: '#0f172a', background: '#f8fafc', border: '1px solid #475569', borderRadius: 6, fontWeight: 600, cursor: 'pointer' };
      const analysis = review.analysis || {};
      return h('div', {
          role: 'presentation',
          style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 },
          onMouseDown: event => { backdropDownRef.current = event.target === event.currentTarget; },
          onClick: event => {
              event.stopPropagation();
              const shouldCancel = event.target === event.currentTarget && backdropDownRef.current !== false;
              backdropDownRef.current = null;
              if (shouldCancel) cancel();
          }
      },
          h('section', { ref: dialogRef, tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-label': __alloT("identifier_redaction.a11y_review_what_ai_receives", 'Review what AI receives'), onKeyDown: keyDown, style: { width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', background: '#fff', color: '#0f172a', borderRadius: 12, padding: 20, boxSizing: 'border-box', textAlign: 'left' } },
              h('h2', { style: { fontSize: 22, margin: '0 0 12px' } }, __alloT("identifier_redaction.a11y_review_what_ai_receives", 'Review what AI receives')),
              review.label && h('p', null, review.label),
              h('p', null, 'This is the outgoing copy. Your original notes stay unchanged. Common identifiers were removed automatically, but other names, school details, and identifying context may remain. Only send information your organization permits to the configured AI provider.'),
              analysis.riskyNameParts?.length > 0 && h('p', { role: 'status', style: { padding: 10, background: '#fefce8', color: '#713f12', border: '1px solid #a16207', borderRadius: 6 } }, 'Some entered names are also ordinary words (' + analysis.riskyNameParts.join(', ') + '). Check them in the text below and remove identifying uses.'),
              analysis.unlistedTitledNames?.length > 0 && h('p', { role: 'status', style: { padding: 10, background: '#fff7ed', color: '#7c2d12', border: '1px solid #c2410c', borderRadius: 6 } }, 'Possible unlisted titled names found (' + analysis.unlistedTitledNames.join(', ') + '). Review or add them below before sending.'),
              h('label', { style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, __alloT("identifier_redaction.a11y_text_to_send", 'Text to send'), h('textarea', { 'aria-label': __alloT("identifier_redaction.a11y_text_to_send", 'Text to send'), 'data-sensitive-review-initial': true, rows: 12, value: prompt, onChange: event => { setPrompt(event.target.value); setConfirmed(false); }, style: field })),
              review.searchQuery !== undefined && h('label', { style: { display: 'block', fontWeight: 700, marginTop: 12 } }, __alloT("identifier_redaction.a11y_search_query_to_send", 'Search query to send'), h('input', { 'aria-label': __alloT("identifier_redaction.a11y_search_query_to_send", 'Search query to send'), value: query, onChange: event => { setQuery(event.target.value); setConfirmed(false); }, style: field })),
              h('label', { style: { display: 'block', fontWeight: 700, marginTop: 12 } }, __alloT("identifier_redaction.a11y_additional_names_or_details_to_remove", 'Additional names or details to remove'), h('input', { 'aria-label': __alloT("identifier_redaction.a11y_additional_names_or_details_to_remove", 'Additional names or details to remove'), value: identifiers, onChange: event => { setIdentifiers(event.target.value); setConfirmed(false); }, placeholder: __alloT("identifier_redaction.a11y_separate_each_name_or_detail_with_a_comma", 'Separate each name or detail with a comma'), style: field })),
              h('button', { type: 'button', disabled: !identifiers.trim(), onClick: () => {
                  const opts = { identifiers: targets(), roleTokens: Array.isArray(review.roleTokens) ? review.roleTokens : [] };
                  setPrompt(prepareSensitivePrompt(prompt, opts).text);
                  if (review.searchQuery !== undefined) setQuery(prepareSensitivePrompt(query, opts).text);
                  setConfirmed(false);
                  setNotice('Listed details removed from this copy. Review the text again.');
              }, style: Object.assign({}, secondaryBtn, { marginTop: 8, padding: '10px 14px', opacity: !identifiers.trim() ? 0.55 : 1 }) }, 'Remove listed details'),
              review.media && h('p', { role: 'note', style: { padding: 12, background: '#fff7ed', color: '#7c2d12' } }, 'A recording or image is also attached (' + String(review.media.mime || 'media') + '). Text removal does not anonymize faces, voices, images, or video. Continue only if your organization permits sending this attachment to the configured provider.'),
              notice && h('p', { role: 'status' }, notice),
              h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0' } }, h('input', { type: 'checkbox', checked: confirmed, onChange: event => setConfirmed(event.target.checked) }), 'I reviewed this outgoing text' + (review.media ? ' and the attached media' : '') + ' and am permitted to send it.'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 } },
                  h('button', { type: 'button', onClick: cancel, style: secondaryBtn }, 'Cancel'),
                  h('button', { type: 'button', disabled: !confirmed || !prompt.trim(), onClick: accept, style: { padding: '10px 16px', minHeight: 44, background: !confirmed || !prompt.trim() ? '#e2e8f0' : '#075985', color: !confirmed || !prompt.trim() ? '#475569' : '#fff', border: '1px solid #64748b', borderRadius: 6 } }, 'Send reviewed copy')
              )
          )
      );
  };

  var API = Object.freeze({
    VERSION: VERSION,
    scrubIdentifiers: scrubIdentifiers,
    nameRedactionParts: nameRedactionParts,
    analyzeRedaction: analyzeRedaction,
    prepareSensitivePrompt: prepareSensitivePrompt,
    createSensitivePromptGate: createSensitivePromptGate,
    SensitivePromptReview: SensitivePromptReview
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window === 'object' && window) {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.IdentifierRedaction = API;
  }
})();
