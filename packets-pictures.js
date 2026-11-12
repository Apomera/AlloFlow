// The "Find a picture" page (packets-pictures.html).
// This is the one Packets page that may contact other websites, and it does so only after the teacher
// turns on "Search for pictures online" and presses Search. Nothing is sent when the page opens.
// What is sent: the search word, to the three services below, and then requests for the pictures shown.
// No cookies (every request is made without credentials), no referrer, no account, no key.
// A chosen picture is made small and kept, with its credit, by packets_my_words.js in this browser.
// Everything a service returns is shown as text (textContent). No markup is ever built from it.
//
// The services, their public keyless interfaces, and what was read before this was written:
//   Global Symbols      globalsymbols.com/api/v1/labels/search   "Public endpoints are available without
//                       an API key." Each result names its symbol set and the set's license.
//   Openverse           api.openverse.org/v1/images/             anonymous use: 20 searches a minute and 200 a
//                       day for each network address. Its terms ask a page to say that it uses Openverse
//                       and is not endorsed by it; the page says so beside the results.
//   Wikimedia Commons   commons.wikimedia.org/w/api.php          one request for each search, origin=*.
(function (root) {
  'use strict';

  // The only addresses this page asks for. The page's rule (connect-src, img-src) names the same hosts.
  var GS_SEARCH = 'https://globalsymbols.com/api/v1/labels/search';
  var GS_SET = 'https://globalsymbols.com/symbolsets/';
  var OV_IMAGES = 'https://api.openverse.org/v1/images/';
  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  // Written into a credit as text. Never asked for.
  var CC = 'https://creativecommons.org/';
  var HOSTS = {
    search: ['globalsymbols.com', 'api.openverse.org', 'commons.wikimedia.org'],
    pictures: ['globalsymbols.com', 'api.openverse.org', 'thumb.wikimedia.org', 'upload.wikimedia.org'],
  };
  var SERVICES = [
    { id: 'globalsymbols', name: 'Global Symbols' },
    { id: 'openverse', name: 'Openverse' },
    { id: 'commons', name: 'Wikimedia Commons' },
  ];
  var MOST = 8;                 // pictures shown for each service
  var SEARCH_MS = 25000;
  var COPY_MS = 25000;
  var COPY_MAX = 8388608;       // a picture file larger than this is not copied
  var KEEP_KEY = 'alloflow-packets-pictures/1';
  // The service spells this field the British way.
  var GS_LICENSE = 'licen' + 'ce';

  // Words in a title, a description, a tag or a category that keep a picture off the page. The same list
  // the app uses for its own picture search (alt_text_source.jsx): clear signals only.
  var BLOCK = /\b(nud(e|es|ity|ism|ist|ists)|naked (man|men|woman|women|people|persons?|body|bodies|girls?|boys?|child|children)|erotic\w*|porn\w*|genital\w*|penis(es)?|vagina\w*|vulva\w*|nipples?|topless|bottomless|lingerie|bdsm|fetish\w*|masturbat\w*|sexual (intercourse|activity|acts?)|sex acts?|gore|gory|corpses?|cadavers?|dead bodies|decapitat\w*|beheading\w*|mutilat\w*|lynching\w*|executions?|torture\w*|suicide\w*|self[- ]harm\w*)\b/i;
  // A picture or a symbol set that says a model made it is left out.
  var MADE = /\b(?:a[.]?i[.]?[- ](?:generated|made|created|art|artwork|images?|pictures?)|(?:generated|made|created) (?:by|with|using) (?:an? )?(?:a[.]?i\b|artificial)|artificial intelligence|machine[- ]generated|stable[- ]?diffusion|midjourney|dall[- ]?e\b|generative)/i;
  var MADE_SET = /\bA[.]?I[.]?\b/;

  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function text(value, max) { return (typeof value === 'string' || typeof value === 'number' ? String(value) : '').slice(0, max); }

  // HTML from a service, as one line of plain text: tags out, character references read.
  var NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  function plain(value, max) {
    var out = text(value, 20000).replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (whole, name) {
      var code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : /^#/.test(name) ? parseInt(name.slice(1), 10) : -1;
      if (code >= 0) { try { return String.fromCodePoint(code >= 32 ? code : 32); } catch (_) { return ' '; } }
      return Object.prototype.hasOwnProperty.call(NAMED, name.toLowerCase()) ? NAMED[name.toLowerCase()] : whole;
    });
    return out.replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200);
  }

  // An https address on one of the named hosts, without its query, or ''.
  function httpsOn(address, hosts) {
    var parsed;
    try { parsed = new URL(text(address, 2000)); } catch (_) { return ''; }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || hosts.indexOf(parsed.hostname) < 0) return '';
    return 'https://' + parsed.hostname + parsed.pathname;
  }
  // Any https address, for a credit. It is stored as text and never asked for.
  function httpsAny(address) {
    var parsed;
    try { parsed = new URL(text(address, 500)); } catch (_) { return ''; }
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '';
  }

  // ---------------------------------------------------------------------------------------------------
  // Licenses. Shown: public domain, CC0, CC BY, CC BY-SA. Everything else is left out, and so is a picture
  // with no stated license. Takes a code ("by-sa", "cc-by-sa-4.0", "pdm") or a name ("CC BY-SA 4.0").
  // Returns { label, url } or null.
  // ---------------------------------------------------------------------------------------------------
  function notOpen(value) { return /(^|[^a-z])(nc|nd)([^a-z]|$)|non-?commercial|no-?deriv/i.test(text(value, 200)); }
  function openLicense(code, version, address) {
    var t = text(code, 120).toLowerCase().trim().replace(/creative\s*commons/g, 'cc').replace(/[\s_]+/g, '-').replace(/^cc-(?=by|zero|pd)/, '');
    if (!t || notOpen(t)) return null;
    var given = '';
    try { var parsed = new URL(text(address, 500)); if (parsed.hostname === 'creativecommons.org' && /^https?:$/.test(parsed.protocol)) given = CC + parsed.pathname.replace(/^\/+/, ''); } catch (_) { given = ''; }
    if (/^(cc0|zero)(-|$)/.test(t)) return { label: 'CC0', url: CC + 'publicdomain/zero/1.0/' };
    if (/^(pdm|pd|public-domain|publicdomain)(-|$)/.test(t)) return { label: 'Public domain', url: /publicdomain/.test(given) ? given : '' };
    var found = /^by(-sa)?(?:-(\d(?:\.\d)?))?(?:-([a-z]{2,5}))?$/.exec(t);
    if (!found) return null;
    var kind = found[1] ? 'by-sa' : 'by';
    var number = found[2] || (/^\d(?:\.\d)?$/.test(text(version, 8)) ? text(version, 8) : '');
    var computed = number ? CC + 'licenses/' + kind + '/' + number + '/' + (found[3] ? found[3] + '/' : '') : '';
    return { label: 'CC ' + kind.toUpperCase() + (number ? ' ' + number : '') + (found[3] ? ' ' + found[3] : ''), url: given.indexOf(CC + 'licenses/' + kind + '/') === 0 ? given : computed };
  }

  // ---------------------------------------------------------------------------------------------------
  // What each service returns, as a list of pictures: { key, service, title, author, license,
  // licenseUrl, source, sourceUrl, show }. `show` is the one address the browser asks for: to show the
  // picture, and again to copy it. leftOut counts what was dropped (license, wording, no picture).
  // ---------------------------------------------------------------------------------------------------
  function fromGlobalSymbols(rows, word) {
    var out = [], seen = {}, left = 0;
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var picto = isObject(row) && isObject(row.picto) ? row.picto : null, set = picto && isObject(picto.symbolset) ? picto.symbolset : null;
      var show = picto ? httpsOn(picto.image_url, ['globalsymbols.com']) : '';
      if (!show || seen[show]) return;
      var terms = set && isObject(set[GS_LICENSE]) ? set[GS_LICENSE] : null;
      var license = terms && !notOpen(terms.name) && !notOpen(terms.properties) ? openLicense(terms.properties || terms.name, terms.version, terms.url) : null;
      var title = plain(row.text, 120), setName = set ? plain(set.name, 80) : '';
      if (!license || !title || !setName || MADE_SET.test(setName) || MADE.test(setName) || BLOCK.test(title + ' | ' + plain(row.description, 400))) { left++; return; }
      seen[show] = true;
      out.push({ key: 'globalsymbols:' + text(picto.id, 20), service: 'globalsymbols', title: title, author: plain(set.publisher, 160), license: license.label, licenseUrl: license.url,
        source: setName + ', on Global Symbols', sourceUrl: /^[a-z0-9-]{1,80}$/.test(text(set.slug, 90)) ? GS_SET + set.slug : '', show: show,
        exact: title.toLowerCase() === word });
    });
    // A symbol named exactly as the word comes before "cat bed" and "catch".
    var ordered = out.filter(function (one) { return one.exact; }).concat(out.filter(function (one) { return !one.exact; }));
    // At most three from one symbol set at first, so that one large set does not fill the group.
    var perSet = {}, first = [], rest = [];
    ordered.forEach(function (one) {
      perSet[one.source] = (perSet[one.source] || 0) + 1;
      (perSet[one.source] <= 3 ? first : rest).push(one);
    });
    return { pictures: first.concat(rest).slice(0, MOST).map(function (one) { delete one.exact; return one; }), leftOut: left };
  }

  function fromOpenverse(json) {
    var out = [], left = 0;
    (isObject(json) && Array.isArray(json.results) ? json.results : []).forEach(function (row) {
      if (!isObject(row) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(row.id, 40))) return;
      var license = openLicense(row.license, row.license_version, row.license_url);
      var title = plain(row.title, 120), author = plain(row.creator, 160);
      var tags = (Array.isArray(row.tags) ? row.tags : []).slice(0, 60).map(function (tag) { return isObject(tag) ? plain(tag.name, 60) : ''; }).join(' | ');
      // The strictest setting the service has: only results it marks as not mature, with no sensitivity note at all.
      var calm = row.mature === false && (!Array.isArray(row.unstable__sensitivity) || !row.unstable__sensitivity.length);
      var words = title + ' | ' + author + ' | ' + tags;
      if (!license || !calm || BLOCK.test(words) || MADE.test(words)) { left++; return; }
      out.push({ key: 'openverse:' + row.id, service: 'openverse', title: title, author: author, license: license.label, licenseUrl: license.url,
        source: 'Openverse', sourceUrl: httpsAny(row.foreign_landing_url), show: OV_IMAGES + row.id + '/thumb/' });
    });
    return { pictures: out.slice(0, MOST), leftOut: left };
  }

  function fromCommons(json) {
    var pages = isObject(json) && isObject(json.query) ? json.query.pages : null;
    var list = Array.isArray(pages) ? pages.slice() : isObject(pages) ? Object.keys(pages).map(function (key) { return pages[key]; }) : [];
    list.sort(function (a, b) { return (Number(a && a.index) || 0) - (Number(b && b.index) || 0); });
    var out = [], left = 0;
    list.forEach(function (page) {
      var info = isObject(page) && Array.isArray(page.imageinfo) && isObject(page.imageinfo[0]) ? page.imageinfo[0] : null;
      // Still pictures only.
      if (!info || !/^image\/(jpeg|png|webp)$/i.test(text(info.mime, 40))) return;
      var meta = isObject(info.extmetadata) ? info.extmetadata : {};
      var value = function (key) { return isObject(meta[key]) && meta[key].value != null ? meta[key].value : ''; };
      var short = plain(value('LicenseShortName'), 120), code = plain(value('License'), 60);
      var license = notOpen(short) || notOpen(code) ? null : openLicense(short, '', value('LicenseUrl')) || openLicense(code, '', value('LicenseUrl'));
      var show = httpsOn(info.thumburl, ['thumb.wikimedia.org', 'upload.wikimedia.org']);
      var title = plain(text(page.title, 300).replace(/^File:/i, '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' '), 120);
      var author = plain(value('Attribution'), 160) || plain(value('Artist'), 160);
      var words = title + ' | ' + author + ' | ' + plain(value('ImageDescription'), 600) + ' | ' + plain(value('Categories'), 4000);
      if (!license || !show || !title || BLOCK.test(words) || MADE.test(words)) { left++; return; }
      out.push({ key: 'commons:' + text(page.pageid, 20), service: 'commons', title: title, author: author, license: license.label, licenseUrl: license.url,
        source: 'Wikimedia Commons', sourceUrl: httpsOn(info.descriptionurl, ['commons.wikimedia.org']), show: show });
    });
    return { pictures: out.slice(0, MOST), leftOut: left };
  }

  // The address of one search. The word is letters only (the store's rule), so it is sent as it is.
  function searchAddress(service, word) {
    if (typeof word !== 'string' || !/^[a-z]{2,24}$/.test(word)) return '';
    if (service === 'globalsymbols') return GS_SEARCH + '?query=' + word + '&language=eng&language_iso_format=639-3&limit=100&expand=picto.symbolset';
    if (service === 'openverse') return OV_IMAGES + '?q=' + word + '&license=cc0,pdm,by,by-sa&mature=false&page_size=20';
    if (service === 'commons') return COMMONS_API + '?action=query&format=json&formatversion=2&origin=*&generator=search&gsrsearch=' + word + '%20filetype%3Abitmap&gsrnamespace=6&gsrlimit=20'
      + '&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=330&iiextmetadatafilter=LicenseShortName%7CLicense%7CLicenseUrl%7CArtist%7CAttribution%7CImageDescription%7CCategories';
    return '';
  }
  var READ = { globalsymbols: fromGlobalSymbols, openverse: fromOpenverse, commons: fromCommons };

  var api = { SERVICES: SERVICES, HOSTS: HOSTS, MOST: MOST, KEEP_KEY: KEEP_KEY, openLicense: openLicense, fromGlobalSymbols: fromGlobalSymbols, fromOpenverse: fromOpenverse, fromCommons: fromCommons, searchAddress: searchAddress, plain: plain };
  if (root) root.AlloPacketPictures = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // ---------------------------------------------------------------------------------------------------
  // The page
  // ---------------------------------------------------------------------------------------------------
  var doc = root && root.document;
  if (!doc || !doc.getElementById('word') || !doc.getElementById('online-on')) return;
  var store = root.AlloPacketMyWords;

  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, words) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (words != null) node.textContent = words;
    return node;
  };
  var add = function (parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  };
  var setText = function (id, words) { var node = $(id); if (node) node.textContent = words; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var empty = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  var say = function (words) { setText('said', ''); setText('said', words); };
  var nameOf = function (service) { return SERVICES.filter(function (one) { return one.id === service; })[0].name; };

  var state = { word: '', searched: '', online: false, run: 0, busy: false };

  function storage() { try { return root.localStorage; } catch (_) { return null; } }
  function kept() {
    try { var saved = JSON.parse((storage() && storage().getItem(KEEP_KEY)) || 'null'); return !!(saved && saved.online === true); } catch (_) { return false; }
  }
  function keep(on) {
    try {
      var place = storage();
      if (!place) return false;
      if (on) place.setItem(KEEP_KEY, JSON.stringify({ online: true })); else place.removeItem(KEEP_KEY);
      return true;
    } catch (_) { return false; }
  }

  // The word: from the address (#word=cat) or typed
  function wordFromAddress() {
    var found = /^#word=([^&]*)/.exec(String(root.location && root.location.hash || ''));
    if (!found) return '';
    try { return store.normalizeWord(decodeURIComponent(found[1])); } catch (_) { return ''; }
  }
  function takeWord(value) {
    var word = store.normalizeWord(String(value || ''));
    if (word === state.word) return;
    state.word = word;
    // Pictures found for another word are put away.
    if (state.searched && state.searched !== word) { state.run++; state.searched = ''; state.busy = false; show('results', false); drawSearch(); }
    show('saved', false);
    setText('device-said', '');
    setText('online-said', '');
  }
  function needWord(saidId) {
    if (state.word) return true;
    setText(saidId, 'Type a word first: one word, 2 to 24 letters.');
    say('Type a word first: one word, 2 to 24 letters.');
    $('word').focus();
    return false;
  }

  // After a picture is saved
  function showSaved(word, entry) {
    var picture = entry && entry.picture;
    if (!picture) return;
    $('saved-picture').src = picture.dataUri;
    setText('saved-line', 'Saved for the word ' + word + '. It is on this device only.');
    setText('saved-credit', store.creditLine(picture.credit));
    show('saved', true);
    var title = $('saved-title');
    title.focus();
    if (typeof title.scrollIntoView === 'function') title.scrollIntoView({ block: 'center' });
    drawMine();
  }
  function problemText(error, fallback) {
    return error && typeof error.code === 'string' && error.message ? error.message : fallback;
  }

  // 1. From my device
  function chooseFile() {
    setText('device-said', '');
    if (needWord('device-said')) $('file').click();
  }
  function fileChosen() {
    var input = $('file'), file = input.files && input.files[0], word = state.word;
    if (!file || !word) return;
    setText('device-said', 'Reading the picture.');
    store.resizeToDataUri(file, store.LIMITS.pictureSide).then(function (dataUri) {
      return store.put(word, { picture: { dataUri: dataUri, credit: { own: true } } });
    }).then(function (entry) {
      setText('device-said', '');
      showSaved(word, entry);
    }, function (error) {
      var words = problemText(error, 'That file could not be read as a picture. Choose another file.');
      setText('device-said', words);
      say(words);
    }).then(function () { try { input.value = ''; } catch (_) {} });
  }

  // 2. Search online: off until the teacher turns it on
  function drawSearch() {
    var button = $('search');
    button.textContent = state.busy ? 'Searching' : 'Search';
    if (state.busy) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');
  }
  function drawOnline() {
    $('online-on').checked = state.online;
    show('online-more', state.online);
    drawSearch();
  }
  function ask(address, ms, how) {
    var control = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = root.setTimeout(function () { if (control) control.abort(); }, ms);
    var options = { method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' };
    if (control) options.signal = control.signal;
    var done = function () { root.clearTimeout(timer); };
    return root.fetch(address, options).then(function (response) {
      if (!response || !response.ok) { var refused = new Error('refused'); refused.status = response ? response.status : 0; throw refused; }
      return how === 'file' ? response.blob() : response.json();
    }).then(function (value) { done(); return value; }, function (error) { done(); throw error; });
  }
  function pictureCard(picture) {
    var item = el('li', 'pic');
    var image = el('img');
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 160; image.height = 160;
    // Asked for without cookies and without a referrer, like the search itself.
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    // A picture that does not arrive cannot be looked at, so it is not offered.
    image.addEventListener('error', function () { if (item.parentNode) item.parentNode.removeChild(item); });
    image.src = picture.show;
    var by = picture.author ? 'by ' + picture.author : 'Author not named';
    var button = el('button', 'btn', 'Use this picture');
    button.type = 'button';
    button.setAttribute('aria-label', 'Use this picture: ' + (picture.title || 'no title') + ', ' + by + ', ' + picture.license);
    button.addEventListener('click', function () { usePicture(picture, item, button); });
    return add(item, image, el('p', 'pic-title', picture.title || 'No title'), el('p', 'pic-by', by), el('p', 'pic-license', picture.license), button);
  }
  function searchOne(service, word, run) {
    var said = 'said-' + service, list = $('pics-' + service);
    empty(list);
    setText(said, 'Searching.');
    return ask(searchAddress(service, word), SEARCH_MS, 'json').then(function (json) {
      if (run !== state.run) return null;
      var found = READ[service](json, word);
      found.pictures.forEach(function (picture) { list.appendChild(pictureCard(picture)); });
      setText(said, found.pictures.length ? count(found.pictures.length, 'picture.', 'pictures.') : 'No pictures with an open license were found here for this word.');
      return nameOf(service) + ': ' + (found.pictures.length ? count(found.pictures.length, 'picture', 'pictures') : 'no pictures') + '.';
    }, function (error) {
      if (run !== state.run) return null;
      var busy = error && error.status === 429;
      setText(said, busy ? nameOf(service) + ' has had too many searches from this network for now. Try again later.' : nameOf(service) + ' is not answering right now. Search again in a moment.');
      return nameOf(service) + ': ' + (busy ? 'too many searches for now' : 'not answering') + '.';
    });
  }
  function search() {
    if (state.busy || !state.online) return;
    setText('online-said', '');
    if (!needWord('online-said')) return;
    if (root.navigator && root.navigator.onLine === false) {
      setText('online-said', 'This device is offline. Connect to the internet, then search again.');
      say('This device is offline. Connect to the internet, then search again.');
      return;
    }
    var word = state.word, run = ++state.run;
    state.searched = word;
    state.busy = true;
    drawSearch();
    show('saved', false);
    setText('results-title', 'Pictures for the word ' + word);
    show('results', true);
    $('results-title').focus();
    say('Searching three services for ' + word + '.');
    Promise.all(SERVICES.map(function (service) { return searchOne(service.id, word, run); })).then(function (lines) {
      if (run !== state.run) return;
      state.busy = false;
      drawSearch();
      say(lines.filter(Boolean).join(' '));
    });
  }
  function usePicture(picture, item, button) {
    var word = state.searched, said = 'said-' + picture.service;
    if (!word || button.getAttribute('aria-disabled') === 'true') return;
    button.setAttribute('aria-disabled', 'true');
    item.classList.add('is-busy');
    say('Copying the picture.');
    var free = function () { button.removeAttribute('aria-disabled'); item.classList.remove('is-busy'); };
    ask(picture.show, COPY_MS, 'file').then(function (file) {
      if (!file || !file.size || file.size > COPY_MAX) throw new Error('size');
      return store.resizeToDataUri(file, store.LIMITS.pictureSide);
    }).then(function (dataUri) {
      var credit = { title: picture.title, author: picture.author, license: picture.license, licenseUrl: picture.licenseUrl, source: picture.source, sourceUrl: picture.sourceUrl,
        resized: dataUri.indexOf('data:image/svg') !== 0 };
      return store.put(word, { picture: { dataUri: dataUri, credit: credit } });
    }).then(function (entry) {
      free();
      showSaved(word, entry);
    }, function (error) {
      free();
      var words = problemText(error, 'This picture could not be copied. Choose another one.');
      setText(said, words);
      say(words);
    });
  }

  // My pictures
  function drawMine() {
    return store.list().then(function (rows) {
      var words = rows.filter(function (row) { return row.picture; }).map(function (row) { return row.word; });
      return store.getMany(words).then(function (entries) { return words.filter(function (word) { return entries[word] && entries[word].picture; }).map(function (word) { return entries[word]; }); });
    }).then(function (entries) {
      var list = $('mine-list');
      empty(list);
      entries.forEach(function (entry) {
        var image = el('img');
        image.alt = '';
        image.width = 64; image.height = 64;
        image.src = entry.picture.dataUri;
        var button = el('button', 'btn btn-small', 'Remove');
        button.type = 'button';
        button.setAttribute('aria-label', 'Remove the picture for ' + entry.word);
        button.setAttribute('data-word', entry.word);
        button.addEventListener('click', function () { removeOne(entry.word); });
        list.appendChild(add(el('li'), image, el('p', 'mine-word', entry.word), el('p', 'mine-credit', store.creditLine(entry.picture.credit)), button));
      });
      setText('mine-line', entries.length ? count(entries.length, 'word has a picture.', 'words have a picture.') + ' They are kept in this browser, on this device.' : 'No pictures yet.');
      show('remove-all', entries.length > 1);
      if (entries.length < 2) show('remove-all-ask', false);
      return entries.length;
    });
  }
  function removeOne(word) {
    var buttons = Array.prototype.slice.call($('mine-list').querySelectorAll('button[data-word]'));
    var at = buttons.map(function (button) { return button.getAttribute('data-word'); }).indexOf(word);
    var next = buttons[at + 1] ? buttons[at + 1].getAttribute('data-word') : buttons[at - 1] ? buttons[at - 1].getAttribute('data-word') : '';
    store.put(word, { picture: null }).then(function () {
      if ($('saved-line').textContent.indexOf(' ' + word + '.') >= 0) show('saved', false);
      return drawMine();
    }).then(function () {
      say('Removed the picture for ' + word + '.');
      var target = next ? $('mine-list').querySelector('button[data-word="' + next + '"]') : null;
      (target || $('mine-title')).focus();
    }, function (error) { say(problemText(error, 'The picture could not be removed.')); });
  }
  function removeAll() {
    store.list().then(function (rows) {
      var words = rows.filter(function (row) { return row.picture; }).map(function (row) { return row.word; });
      // One at a time. Only the picture goes: a recording or a split for the same word stays.
      return words.reduce(function (before, word) { return before.then(function () { return store.put(word, { picture: null }); }); }, Promise.resolve()).then(function () { return words.length; });
    }).then(function (n) {
      show('remove-all-ask', false);
      show('saved', false);
      return drawMine().then(function () { say('Removed ' + count(n, 'picture.', 'pictures.')); $('mine-title').focus(); });
    }, function (error) { say(problemText(error, 'The pictures could not be removed.')); });
  }

  function start() {
    var input = $('word');
    state.word = wordFromAddress();
    input.value = state.word;
    input.addEventListener('input', function () { takeWord(input.value); });
    input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && state.online) { event.preventDefault(); search(); } });
    root.addEventListener('hashchange', function () { var word = wordFromAddress(); if (word) { input.value = word; takeWord(word); } });

    $('choose').addEventListener('click', chooseFile);
    $('file').addEventListener('change', fileChosen);

    // The switch is off unless the teacher asked this device to keep it on. Turning it on sends nothing.
    state.online = kept();
    $('online-keep').checked = state.online;
    drawOnline();
    $('online-on').addEventListener('change', function () {
      state.online = $('online-on').checked;
      if (!state.online) {
        state.run++; state.busy = false; state.searched = '';
        show('results', false);
        keep(false);
        $('online-keep').checked = false;
      }
      setText('online-said', '');
      drawOnline();
      say(state.online ? 'On. Nothing is sent until you press Search.' : 'Off. This page sends nothing.');
    });
    $('online-keep').addEventListener('change', function () {
      var want = $('online-keep').checked;
      if (want && !keep(true)) { $('online-keep').checked = false; say('This browser could not keep the setting.'); return; }
      if (!want) keep(false);
      say(want ? 'This device will keep the switch on.' : 'This device will not keep the switch on.');
    });
    $('search').addEventListener('click', search);

    $('remove-all').addEventListener('click', function () {
      setText('remove-all-line', 'Remove every picture from this device? Recordings are not touched.');
      show('remove-all-ask', true);
      $('remove-all-yes').focus();
    });
    $('remove-all-yes').addEventListener('click', removeAll);
    $('remove-all-no').addEventListener('click', function () { show('remove-all-ask', false); $('remove-all').focus(); });

    store.available().then(function (yes) {
      show('not-keeping', !yes);
      show('device', yes);
      show('online', yes);
      show('mine', yes);
      if (yes) drawMine();
    });
    // A picture added or removed in another tab shows here too.
    store.onChange(function (change) { if (!change.here) drawMine(); });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
