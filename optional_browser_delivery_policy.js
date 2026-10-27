// This policy and its fixed vendor records are embedded in the trusted host.
// A response, caller, or downloaded manifest cannot add approved code.
function _alloCreateOptionalBrowserDeliveryPolicy(input, options) {
  'use strict';
  var fail = function (message) { throw new Error('Optional browser delivery: ' + message); };
  var owns = function (value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var object = function (value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') fail('invalid record');
    Object.values(Object.getOwnPropertyDescriptors(value)).forEach(function (descriptor) {
      if (!owns(descriptor, 'value')) fail('accessors are not allowed');
    });
    return value;
  };
  var fields = function (value, expected) {
    object(value);
    if (Object.keys(value).sort().join('|') !== expected.slice().sort().join('|')) fail('invalid record fields');
  };
  var pathSafe = function (value) {
    return typeof value === 'string' && value.length <= 240 && /\.js$/.test(value)
      && value.split('/').every(function (part) { return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part) && !['__proto__', 'constructor', 'prototype'].includes(part); });
  };
  var digestSafe = function (value) { return typeof value === 'string' && /^sha384-[A-Za-z0-9+/]{64}$/.test(value); };
  var sizeSafe = function (value) { return Number.isSafeInteger(value) && value > 0 && value <= 64 * 1024 * 1024; };
  fields(input, ['schemaVersion', 'libraries']);
  if (input.schemaVersion !== 1) fail('unsupported schema');
  object(input.libraries);
  var keys = Object.keys(input.libraries);
  if (!keys.length || keys.length > 100) fail('invalid library count');
  var libraries = Object.create(null), remote = Object.create(null), assets = Object.create(null);
  keys.forEach(function (key) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(key) || ['constructor', 'prototype'].includes(key)) fail('invalid library key');
    var record = input.libraries[key];
    fields(record, ['asset', 'integrity', 'bytes', 'mirrors']);
    if (record.asset === null) {
      if (record.integrity !== null || record.bytes !== null) fail('invalid remote-only record');
    } else {
      if (!pathSafe(record.asset) || !digestSafe(record.integrity) || !sizeSafe(record.bytes) || owns(assets, record.asset)) fail('invalid local record');
      assets[record.asset] = key;
    }
    if (!Array.isArray(record.mirrors) || record.mirrors.length > 8 || (!record.asset && !record.mirrors.length)) fail('invalid mirror count');
    var mirrors = record.mirrors.map(function (mirror) {
      fields(mirror, ['url', 'integrity', 'bytes']);
      if (!digestSafe(mirror.integrity) || !sizeSafe(mirror.bytes) || typeof mirror.url !== 'string'
        || mirror.url.length > 2048 || /[\x00-\x20\x7f\\%?#]/.test(mirror.url)) fail('invalid mirror');
      var url;
      try { url = new URL(mirror.url); } catch (_) { fail('invalid mirror URL'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.href !== mirror.url
        || !/^(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)$/.test(url.hostname)
        || /(?:^|[\/@-])(?:main|master|latest)(?:[\/.@-]|$)/i.test(url.pathname)
        || (!/[0-9]+\.[0-9]+(?:\.[0-9]+)?/.test(url.pathname)
          && mirror.url !== 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
        || owns(remote, mirror.url)) fail('unapproved mirror form');
      var result = Object.freeze({ url: mirror.url, integrity: mirror.integrity, bytes: mirror.bytes });
      remote[mirror.url] = Object.freeze({ key: key, integrity: mirror.integrity, bytes: mirror.bytes });
      return result;
    });
    libraries[key] = Object.freeze({ asset: record.asset, integrity: record.integrity, bytes: record.bytes, mirrors: Object.freeze(mirrors) });
  });
  Object.freeze(libraries); Object.freeze(remote); Object.freeze(assets);
  var settings = options || {}, desktop = settings.isDesktopBundledApp === true, base;
  try { base = new URL('.', settings.baseUrl); } catch (_) { fail('invalid trusted base'); }
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) fail('invalid trusted base');
  if (desktop && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(base.hostname)) fail('Desktop requires loopback');
  var resolve = function (value, expectedKey) {
    if (typeof value !== 'string' || value.length > 4096 || !value || value !== value.trim()
      || /[\x00-\x20\x7f\\%]/.test(value) || value.slice(0, 2) === '//'
      || /(^|\/)\.{1,2}(\/|[?#]|$)/.test(value.slice(0, 2) === './' ? value.slice(2) : value)) fail('invalid script URL');
    var url;
    try { url = new URL(value, base); } catch (_) { fail('invalid script URL'); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.hash) fail('invalid script URL');
    var result, asset, local = url.origin === base.origin && url.pathname.indexOf(base.pathname) === 0;
    if (local) asset = url.pathname.slice(base.pathname.length);
    else if (!desktop && url.origin === base.origin) asset = url.pathname.slice(1);
    else if (!desktop && url.origin === 'https://alloflow-cdn.pages.dev') asset = url.pathname.slice(1);
    if (pathSafe(asset) && owns(assets, asset)) {
      var key = assets[asset], library = libraries[key];
      // Queries are cache hints, never a new approval. Emit the canonical URL
      // so a query cannot bypass the release worker's exact digest keys.
      url.search = '';
      result = { key: key, url: url.href, integrity: library.integrity };
    } else if (!desktop && owns(remote, url.href)) {
      var mirror = remote[url.href];
      result = { key: mirror.key, url: url.href, integrity: mirror.integrity };
    }
    if (!result || (expectedKey !== undefined && result.key !== expectedKey)) fail('script is not approved for this library');
    return result;
  };
  return Object.freeze({
    configureScript: function (script, url, key) {
      var selected = resolve(url, key);
      if (!script || typeof script !== 'object') fail('script element required');
      script.integrity = selected.integrity;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.src = selected.url;
      return script;
    },
    sourcesFor: function (key) {
      if (!owns(libraries, key)) fail('unknown library');
      var library = libraries[key], sources = [];
      if (library.asset) {
        sources.push(new URL(library.asset, base).href);
        if (!desktop) {
          sources.push(new URL('/' + library.asset, base).href);
          sources.push('https://alloflow-cdn.pages.dev/' + library.asset);
        }
      }
      if (!desktop) library.mirrors.forEach(function (mirror) { sources.push(mirror.url); });
      return Object.freeze(Array.from(new Set(sources)));
    },
    isApprovedUrl: function (url) { try { resolve(url); return true; } catch (_) { return false; } }
  });
}

// Gemini Canvas serves the page from a blob: URL; its assets come from the CDN.
function _alloTrustedPageBase(location) {
  var href = String((location && location.href) || '');
  return /^https?:\/\//i.test(href) ? href : 'https://alloflow-cdn.pages.dev/';
}
function _alloOptionalBrowserPolicyForPage() {
  var location = window.location;
  var desktop = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname || '')
    && (location.pathname || '').indexOf('/app/') === 0;
  return _alloCreateOptionalBrowserDeliveryPolicy(_alloOptionalBrowserDeliveryManifest, { baseUrl: _alloTrustedPageBase(location), isDesktopBundledApp: desktop });
}

function _alloConfigureTrustedBrowserScript(script, url, key) {
  if (typeof _alloRuntimeGraphPolicy !== 'undefined' && _alloRuntimeGraphPolicy && _alloRuntimeGraphPolicy.canConfigureScript(url)) {
    return _alloRuntimeGraphPolicy.configureScript(script, url, key);
  }
  var policy = _alloOptionalBrowserPolicyForPage();
  if (key !== undefined || policy.isApprovedUrl(url)) return policy.configureScript(script, url, key);
  return _alloConfigureBrowserDeliveryScript(script, url);
}
