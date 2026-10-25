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
      // Redact a complete email before names: replacing "Jordan" first in
      // jordan@school.example would otherwise leave [Student]@school.example.
      out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');

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
  // A final outbound COPY, never a mutation of the clinical record. Explicit
  // removal targets are user-selected: common-word names are still left alone
  // by the automatic scrubber so clinical prose is not silently corrupted.
  const prepareSensitivePrompt = (text, options) => {
      if (typeof text !== 'string') throw new TypeError('AI review requires text.');
      const opts = options || {};
      const tokens = Array.from(new Set(['[Student]', '[NAME]', '[EMAIL]', '[SSN]', '[PHONE]', '[IDENTIFIER]', '[ADDRESS]', '[DATE]', '[REMOVED]'].concat(redactionEntries(opts).map(entry => entry.token))));
      const tokenPattern = new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'g');
      const targets = Array.isArray(opts.identifiers) ? opts.identifiers : [];
      // Existing placeholders are opaque, including when a known person's
      // literal name is "Student". Repeated review must not nest [Student].
      const out = text.split(tokenPattern).map(part => {
          if (tokens.includes(part)) return part;
          const value = scrubIdentifiers(part, opts).split(tokenPattern).map(chunk => {
              if (tokens.includes(chunk)) return chunk;
              let cleaned = chunk;
              targets.map(item => String(item || '').trim()).filter(Boolean)
                  .sort((a, b) => b.length - a.length).forEach(item => {
                      const pattern = item.split(/\s+/).map(escapeRegExp).join('\\s+');
                      cleaned = cleaned.replace(new RegExp(pattern, 'gi'), '[REMOVED]');
                  });
              return cleaned;
          }).join('');
          // Preserve relative timing, scores, citation IDs, and grade levels.
          return value.replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, '[DATE]');
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
          return entry ? {
              id: entry.id, prompt: entry.prompt, searchQuery: entry.searchQuery,
              analysis: entry.analysis, label: entry.options.label || '',
              media: entry.options.media || null
          } : null;
      };
      const notify = () => onChange(currentReview());
      const remove = (entry, value, error, shouldNotify = true) => {
          const wasCurrent = queue[0] === entry;
          const index = queue.indexOf(entry);
          if (index < 0) return;
          queue.splice(index, 1);
          if (entry.options.signal && entry.abortListener) entry.options.signal.removeEventListener('abort', entry.abortListener);
          if (error) entry.reject(error); else entry.resolve(value);
          if (wasCurrent && shouldNotify) notify();
      };
      return {
          request(prompt, options) {
              const input = options || {};
              const opts = {
                  ...input,
                  studentName: String(input.studentName || ''),
                  people: (Array.isArray(input.people) ? input.people : []).map(person => ({ name: String(person && person.name || ''), role: String(person && person.role || 'Name') })),
                  identifiers: (Array.isArray(input.identifiers) ? input.identifiers : []).map(String)
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
              const opts = { ...entry.options, identifiers: entry.options.identifiers.concat(Array.isArray(value.identifiers) ? value.identifiers : []) };
              const prepared = prepareSensitivePrompt(value.prompt, opts);
              const query = entry.searchQuery === undefined ? undefined : prepareSensitivePrompt(typeof value.searchQuery === 'string' ? value.searchQuery : '', opts).text;
              // If an edit introduced identifiers, show the newly scrubbed copy
              // and require a fresh click, so the sent text is the reviewed text.
              if (prepared.text !== value.prompt || query !== (entry.searchQuery === undefined ? undefined : value.searchQuery)) {
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
                  if (sibling !== branch && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
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
              if (opener && opener.isConnected) opener.focus();
          };
      }, []);
      React.useEffect(() => {
          dialogRef.current?.querySelector('[data-sensitive-review-initial]')?.focus();
      }, [review.id]);
      const cancel = () => props.onCancel(review.id);
      const targets = () => identifiers.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
      const accept = () => {
          const outcome = props.onAccept(review.id, { prompt, searchQuery: query, identifiers: targets() });
          if (outcome && outcome.changed) {
              setConfirmed(false);
              setNotice('More identifiers were removed. Review the updated text before sending.');
          }
      };
      const keyDown = event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); return; }
          if (event.key !== 'Tab') return;
          event.stopPropagation();
          const items = Array.from(dialogRef.current?.querySelectorAll('button:not([disabled]), textarea, input, [tabindex="0"]') || []).filter(node => !node.hidden);
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      };
      const field = { width: '100%', boxSizing: 'border-box', color: '#0f172a', background: '#fff', border: '1px solid #64748b', borderRadius: 6, padding: 10, font: 'inherit' };
      const analysis = review.analysis || {};
      return h('div', { role: 'presentation', style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }, onClick: event => { event.stopPropagation(); if (event.target === event.currentTarget) cancel(); } },
          h('section', { ref: dialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Review what AI receives', onKeyDown: keyDown, style: { width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', background: '#fff', color: '#0f172a', borderRadius: 12, padding: 20, boxSizing: 'border-box', textAlign: 'left' } },
              h('h2', { style: { fontSize: 22, margin: '0 0 12px' } }, 'Review what AI receives'),
              review.label && h('p', null, review.label),
              h('p', null, 'This is the outgoing copy. Your original notes stay unchanged. Common identifiers were removed automatically, but other names, school details, and identifying context may remain. Only send information your organization permits to the configured AI provider.'),
              analysis.riskyNameParts?.length > 0 && h('p', { role: 'status' }, 'Some entered names are also ordinary words. Check them in the text below and remove identifying uses.'),
              h('label', { style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, 'Text to send', h('textarea', { 'aria-label': 'Text to send', 'data-sensitive-review-initial': true, rows: 12, value: prompt, onChange: event => { setPrompt(event.target.value); setConfirmed(false); }, style: field })),
              review.searchQuery !== undefined && h('label', { style: { display: 'block', fontWeight: 700, marginTop: 12 } }, 'Search query to send', h('input', { 'aria-label': 'Search query to send', value: query, onChange: event => { setQuery(event.target.value); setConfirmed(false); }, style: field })),
              h('label', { style: { display: 'block', fontWeight: 700, marginTop: 12 } }, 'Additional names or details to remove', h('input', { 'aria-label': 'Additional names or details to remove', value: identifiers, onChange: event => { setIdentifiers(event.target.value); setConfirmed(false); }, placeholder: 'Separate each name or detail with a comma', style: field })),
              h('button', { type: 'button', disabled: !identifiers.trim(), onClick: () => {
                  const opts = { identifiers: targets() };
                  setPrompt(prepareSensitivePrompt(prompt, opts).text);
                  if (review.searchQuery !== undefined) setQuery(prepareSensitivePrompt(query, opts).text);
                  setConfirmed(false);
                  setNotice('Listed details removed from this copy. Review the text again.');
              }, style: { marginTop: 8, padding: 10, minHeight: 44 } }, 'Remove listed details'),
              review.media && h('p', { role: 'note', style: { padding: 12, background: '#fff7ed', color: '#7c2d12' } }, 'A recording or image is also attached (' + String(review.media.mime || 'media') + '). Text removal does not anonymize faces, voices, images, or video. Continue only if your organization permits sending this attachment to the configured provider.'),
              notice && h('p', { role: 'status' }, notice),
              h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0' } }, h('input', { type: 'checkbox', checked: confirmed, onChange: event => setConfirmed(event.target.checked) }), 'I reviewed this outgoing text' + (review.media ? ' and the attached media' : '') + ' and am permitted to send it.'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 } },
                  h('button', { type: 'button', onClick: cancel, style: { padding: '10px 16px', minHeight: 44 } }, 'Cancel'),
                  h('button', { type: 'button', disabled: !confirmed || !prompt.trim(), onClick: accept, style: { padding: '10px 16px', minHeight: 44, background: !confirmed || !prompt.trim() ? '#e2e8f0' : '#075985', color: !confirmed || !prompt.trim() ? '#475569' : '#fff', border: '1px solid #64748b', borderRadius: 6 } }, 'Send reviewed copy')
              )
          )
      );
  };

  var API = {
    VERSION: VERSION,
    scrubIdentifiers: scrubIdentifiers,
    nameRedactionParts: nameRedactionParts,
    analyzeRedaction: analyzeRedaction,
    prepareSensitivePrompt: prepareSensitivePrompt,
    createSensitivePromptGate: createSensitivePromptGate,
    SensitivePromptReview: SensitivePromptReview
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.IdentifierRedaction = API;
  }
})();
