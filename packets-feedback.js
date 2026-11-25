// "Send feedback" (packets-feedback.html), 2026-11-23. Reaches only AlloFlow's feedback inbox (the page's connect-src).
// Aaron's rule: no personal information about anyone may reach us. So:
// - the message is cleaned here before it is shown, and what is shown in "What will be sent" is exactly what is sent;
// - there is no name or email box, nothing can be attached, and nothing kept by other Packets pages is read;
// - the inbox refuses a message that still looks personal (catalog/cloudflare-worker/src/index.js, /packetsFeedback).
// clean() is a fixed set of rules (no AI). It errs toward replacing too much: a teacher can rephrase, a name cannot be unsent.
(function (root) {
  'use strict';

  var ENDPOINT = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/packetsFeedback';
  var MAX = 600;
  var PAGES = ['packets', 'packets-make', 'packets-vocab', 'packets-math-practice', 'packets-check', 'packets-symbol-runner', 'packets-read-along', 'packets-voice',
    'packets-choice', 'packets-maze', 'packets-manipulatives', 'packets-stem-lab', 'packets-life-skills', 'packets-aac', 'packets-sel', 'packets-playlist', 'packets-packs', 'packets-compile',
    'packets-pictures', 'packets-present-export', 'packets-qr', 'packets-open', 'packets-try', 'packets-results', 'packets-verify', 'packets-vocab-lookup',
    'packets-about', 'packets-it', 'packets-feedback', 'other'];
  var KINDS = ['broken', 'confusing', 'idea', 'worked'];

  // Capitalized words that are never a person's name here: Packets' own words, devices, browsers, days, months, languages.
  var KEEP = ('I I\'m I\'ve I\'d I\'ll OK ID Mr Mrs Ms Mx Dr Miss AlloFlow Packets Packet Word Words Sounds Sound Symbol Runner Read Along Read-along Vocabulary Math Check Checks Practice ' +
    'Fluency Quantity Discrimination Missing Number Present Print Cards QR Sealed Collect Add Results Open Try Preview Look Inside File Files Pictures Picture Find ' +
    'Recordings Voice Device Teacher Reading Tools Letter Trace Break Down Blend Spelling Bee Rhyme Elkonin Kokoro Gemini Mulberry OpenMoji About IT Guide Save My ' +
    'Chrome Chromebook Chromebooks Safari Edge Firefox Windows Mac MacBook iPad iPads iPhone Android Google Classroom Drive Microsoft Teams Canvas Schoology Seesaw ' +
    'PDF CSV HTML JSON URL USB Wi-Fi WiFi Bluetooth AI English Spanish French Arabic Somali Portuguese Chinese Vietnamese ESL ELL K Kindergarten Pre-K PreK ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December ' +
    'Grade Grades Tier MTSS RTI CBM SLP OT PT UDL ELA CVC CVCe Phonics').split(' ');
  var KEEP_SET = Object.create(null);
  KEEP.forEach(function (w) { KEEP_SET[w.toLowerCase()] = true; });
  // Words that point at a person's condition or plan: replaced, and the inbox refuses them too.
  // Short acronyms that collide with ordinary English words ("odd", "bip") stay case-sensitive; unambiguous diagnoses and plans match any case.
  var CONDITION_UPPER = /\b(?:ASD|ODD|OCD|TBI|SLD|EBD|OHI|BIP|FBA|504)\b/g;
  var CONDITION_ANY = /\b(?:adhd|ptsd|ieps?|504\s+plan|autis(?:m|tic)|dyslexi[ac]|dysgraphi[ac]|dyscalculi[ac])\b/gi;

  // At the start of a sentence a capitalized word is kept only when it is a usual way to begin one, or one of the most
  // frequent English words (zipf 5.3 and up: "The", "Will", but not "Jordan", "Maya" or "Grace", which are frequent as
  // words too). A first name that is also a very common word ("Will") can still pass: the teacher reads the box before sending.
  var STARTERS = ('the a an this that these those it it\'s its we we\'re our my your you they they\'re their he she his her him them when where what which who why how ' +
    'if could can would should will please also but and so then after before during some most all many one two three there here thanks thank great love ' +
    'on in at for from with without by to of or as about around between testing ' +
    'case student students kids children teachers parents is are was were do does did has have had maybe just not no yes only every each any sometimes today yesterday ' +
    'overall however since because while once instead unfortunately hopefully another other using opening clicking pressing making trying nothing everything ' +
    'something none both first next last also overall i\'m i\'ve hi hello dear right wrong good bad nice cool wow oh ok okay sure really very much more less').split(' ');
  var STARTER_SET = Object.create(null);
  STARTERS.forEach(function (w) { STARTER_SET[w] = true; });
  function common(word) {
    var lower = word.toLowerCase();
    if (STARTER_SET[lower]) return true;
    var list = root && root.AlloModules && root.AlloModules.WordSoundsWordlist;
    if (!list || typeof list.get !== 'function') return false;
    var row = list.get(lower);
    return !!row && !row.notInDictionary && row.zipf >= 5.3;
  }

  // The message as it will be sent, and how many of each kind of thing were replaced.
  function clean(input) {
    var counts = {};
    var put = function (kind, mark) { return function () { counts[kind] = (counts[kind] || 0) + 1; return mark; }; };
    var t = String(input == null ? '' : input).normalize ? String(input == null ? '' : input).normalize('NFC') : String(input == null ? '' : input);
    t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    t = t.replace(/\b(?:https?:\/\/|www\.)[^\s<>"]+/gi, put('link', '[link]'));
    t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, put('email', '[email]'));
    t = t.replace(/(^|[^\w@])@[A-Za-z0-9_.]{2,}/g, function (m, lead) { counts.handle = (counts.handle || 0) + 1; return lead + '[handle]'; });
    t = t.replace(/\b(student|district|state|case|medicaid|lunch|locker)(\s*(?:id|number|no\.?|#)?\s*[:#-]?\s*)([A-Z0-9][A-Z0-9\/.-]{2,})/gi, function (m, a, b, c) {
      if (!/\d/.test(c)) return m;
      counts.id = (counts.id || 0) + 1; return a + b + '[id]';
    });
    t = t.replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g, put('date', '[date]'));
    t = t.replace(/\b\d{3}-\d{2}-\d{4}\b/g, put('number', '[number]'));
    t = t.replace(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g, put('phone', '[phone]'));
    t = t.replace(/\d[\d\s.-]{5,}\d/g, function (m) { if (m.replace(/\D/g, '').length < 7) return m; counts.number = (counts.number || 0) + 1; return '[number]'; });
    t = t.replace(/\b\d{1,5}\s+(?:[A-Za-z][A-Za-z0-9'.-]*\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir)\b\.?/gi, put('address', '[address]'));
    t = t.replace(/\b(Mr|Mrs|Ms|Mx|Dr|Miss)\.?\s+[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)?/g, function (m, title) { counts.name = (counts.name || 0) + 1; return title + '. [name]'; });
    t = t.replace(CONDITION_ANY, put('condition', '[condition]'));
    t = t.replace(CONDITION_UPPER, put('condition', '[condition]'));
    // Possible names: a capitalized (or all-capital) word that is not one of Packets' words, unless it starts a sentence and is an
    // ordinary English word. "[name]" once for a run of them ("Jordan Lee" is one name).
    t = t.replace(/\b[A-Z][A-Za-z'-]*(?:[ \t]+[A-Z][A-Za-z'-]*)*/g, function (run, offset, whole) {
      // The start of the message, of a line, or of a sentence (after . ! ? and maybe a closing quote or bracket).
      var atStart = /(?:^|[.!?]["'”’)\]]?\s+|\n\s*)$/.test(whole.slice(0, offset));
      var words = run.split(/[ \t]+/), out = [], masked = false;
      words.forEach(function (w, i) {
        var bare = w.replace(/['’]s$/, '');
        var keep = KEEP_SET[bare.toLowerCase()] || (i === 0 && atStart && common(bare));
        if (keep) { out.push(w); masked = false; return; }
        if (!masked) { out.push('[name]' + (bare !== w ? w.slice(bare.length) : '')); counts.name = (counts.name || 0) + 1; masked = true; }
      });
      return out.join(' ');
    });
    return { text: t, counts: counts };
  }

  var KIND_WORDS = { link: 'web link', email: 'email address', handle: '@ handle', id: 'ID number', date: 'date', number: 'long number', phone: 'phone number', address: 'street address', name: 'possible name', condition: 'diagnosis or plan' };
  function cleanedLine(counts) {
    var ORDER = ['name', 'email', 'phone', 'address', 'id', 'date', 'number', 'link', 'handle', 'condition'];
    var parts = ORDER.filter(function (k) { return counts[k]; }).map(function (k) { return counts[k] + ' ' + (KIND_WORDS[k] || k) + (counts[k] === 1 ? '' : 's'); });
    return parts.length ? 'Replaced before sending: ' + parts.join(', ') + '. If a replaced word was not personal (a book title, say), you can rephrase it.' : '';
  }

  // Two words about the device, worked out here; the browser's own description is never sent.
  function deviceOf(nav) {
    var ua = String(nav && nav.userAgent || '');
    var browser = /Edg\//.test(ua) ? 'edge' : /Firefox\//.test(ua) ? 'firefox' : /(?:Chrome|CriOS)\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
    var tablet = /iPad|Tablet/.test(ua) || (/Macintosh/.test(ua) && Number(nav && nav.maxTouchPoints) > 1) || (/Android/.test(ua) && !/Mobile/.test(ua));
    var device = tablet ? 'tablet' : /Mobi|iPhone|Android/.test(ua) ? 'phone' : ua ? 'computer' : 'unknown';
    return { browser: browser, device: device };
  }

  // The body the inbox receives (the route's contract): nothing else, ever.
  function payload(page, kind, message, dev) {
    return { v: 1, page: PAGES.indexOf(page) >= 0 ? page : 'other', kind: kind, message: message, browser: dev.browser, device: dev.device };
  }

  var api = { ENDPOINT: ENDPOINT, MAX: MAX, PAGES: PAGES, KINDS: KINDS, clean: clean, cleanedLine: cleanedLine, deviceOf: deviceOf, payload: payload };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlloPacketsFeedback = api;

  var doc = root && root.document;
  if (!doc || !doc.getElementById('fb-message')) return;

  function boot() {
    var $ = function (id) { return doc.getElementById(id); };
    var pageSel = $('fb-page'), msg = $('fb-message'), read = $('fb-read'), send = $('fb-send'), said = $('fb-said');
    var dev = deviceOf(root.navigator);
    var BROWSER_WORDS = { chrome: 'Chrome', edge: 'Edge', safari: 'Safari', firefox: 'Firefox', other: 'another browser' };
    var KIND_LABELS = { broken: 'Something is broken', confusing: 'Something is confusing', idea: 'An idea', worked: 'Something worked well' };
    var sending = false, current = { text: '', counts: {} };
    // Opened from a page's footer: that page is chosen (packets-feedback.html#from-packets-make).
    var from = /^#from-([a-z-]+)$/.exec(String(root.location && root.location.hash || ''));
    if (from && PAGES.indexOf(from[1]) >= 0) pageSel.value = from[1];
    var kind = function () { var on = doc.querySelector('input[name="fb-kind"]:checked'); return on ? on.value : ''; };
    var draw = function () {
      current = clean(msg.value);
      var n = current.text.length;
      $('fb-count').textContent = n > MAX ? 'Too long: ' + n + ' of ' + MAX + ' characters after cleaning.' : n + ' of ' + MAX + ' characters.';
      $('fb-sent-page').textContent = pageSel.options[pageSel.selectedIndex].textContent;
      $('fb-sent-kind').textContent = kind() ? KIND_LABELS[kind()] : '(choose one above)';
      $('fb-sent-device').textContent = BROWSER_WORDS[dev.browser] + ', ' + (dev.device === 'unknown' ? 'device not known' : dev.device);
      $('fb-sent-message').textContent = current.text || '(write your message above)';
      var line = cleanedLine(current.counts);
      $('fb-cleaned').hidden = !line;
      $('fb-cleaned').textContent = line;
      // Any change after the box was checked asks for a new look.
      read.checked = false;
      said.textContent = '';
    };
    var KIND_REFUSED = { email: 'an email address', 'phone (US)': 'a phone number', SSN: 'an ID number', 'social URL': 'a social media link', 'street address': 'a street address',
      'titled name': 'a name', 'diagnostic acronym': 'a diagnosis or plan' };
    send.addEventListener('click', function () {
      if (sending) return;
      if (!kind()) { said.textContent = 'Choose what kind of feedback it is.'; return; }
      if (!current.text) { said.textContent = 'Write your message first.'; msg.focus(); return; }
      if (current.text.length > MAX) { said.textContent = 'The message is too long. Shorten it to ' + MAX + ' characters.'; msg.focus(); return; }
      if (!read.checked) { said.textContent = 'Read what will be sent, then check the box above Send.'; read.focus(); return; }
      if (typeof root.fetch !== 'function') { said.textContent = 'This browser cannot send. Nothing was sent.'; return; }
      sending = true;
      send.disabled = true;
      said.textContent = 'Sending.';
      var control = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      var timer = root.setTimeout(function () { if (control) control.abort(); }, 15000);
      var body = JSON.stringify(payload(pageSel.value, kind(), current.text, dev));
      var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors' };
      if (control) opts.signal = control.signal;
      var done = function (text) { root.clearTimeout(timer); sending = false; send.disabled = false; said.textContent = text; };
      root.fetch(ENDPOINT, opts).then(function (reply) {
        return reply.json().then(function (data) { return { status: reply.status, data: data }; }, function () { return { status: reply.status, data: null }; });
      }).then(function (r) {
        if (r.status === 201 && r.data && r.data.ok) {
          msg.value = '';
          draw();
          done('Sent. Thank you. The message will be deleted from the inbox after 30 days.');
          return;
        }
        if (r.status === 422 && r.data && r.data.error === 'personal_info') {
          var what = (r.data.kinds || []).map(function (k) { return KIND_REFUSED[k] || k; });
          done('Not sent: the inbox found what looks like ' + (what.length ? what.join(' and ') : 'personal information') + '. Change that part of your message, then send again.');
          return;
        }
        done('Could not send (the inbox answered ' + r.status + '). Nothing was kept. Please try again later.');
      }, function () {
        done('Could not reach the inbox. Nothing was sent. Check the connection, or try again later.');
      });
    });
    [pageSel, msg].forEach(function (n) { n.addEventListener('input', draw); n.addEventListener('change', draw); });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="fb-kind"]'), function (r) { r.addEventListener('change', draw); });
    read.addEventListener('change', function () { said.textContent = ''; });
    draw();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
