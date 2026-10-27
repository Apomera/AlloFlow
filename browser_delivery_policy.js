// Embedded in the trusted host by build_browser_delivery_manifest.cjs. This file
// is not downloaded to establish trust: the browser enforces these hashes before
// any first-party module executes, including retries and immutable fallbacks.
function _alloCreateBrowserDeliveryPolicy(inputManifest, options) {
  'use strict';
  var MAX_ASSETS = 10000;
  var MAX_ASSET_BYTES = 64 * 1024 * 1024;
  var owns = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var fail = function (message) { throw new Error('Browser delivery policy: ' + message); };
  var record = function (value, label) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') fail(label + ' must be an object');
    var descriptors = Object.getOwnPropertyDescriptors(value);
    Object.keys(descriptors).forEach(function (key) {
      if (!owns(descriptors[key], 'value')) fail(label + ' must not contain accessors');
    });
    return value;
  };
  var exactKeys = function (object, expected, label) {
    var actual = Object.keys(object).sort();
    if (actual.length !== expected.length || actual.some(function (key, index) { return key !== expected[index]; })) fail('invalid ' + label + ' fields');
  };
  var validAsset = function (name) {
    return typeof name === 'string' && name.length <= 240 && /\.js$/.test(name)
      && name.split('/').every(function (segment) {
        return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(segment)
          && segment !== '__proto__' && segment !== 'constructor' && segment !== 'prototype';
      });
  };

  record(inputManifest, 'manifest');
  exactKeys(inputManifest, ['allowDesktopRemoteFallback', 'assets', 'fallbackCommit', 'releaseId', 'schemaVersion'], 'manifest');
  if (inputManifest.schemaVersion !== 1 || typeof inputManifest.releaseId !== 'string' || !/^[a-f0-9]{64}$/.test(inputManifest.releaseId)) fail('unsupported or missing manifest');
  if (inputManifest.allowDesktopRemoteFallback !== false) fail('desktop remote fallback must be disabled');
  var commit = inputManifest.fallbackCommit;
  if (commit !== null && (typeof commit !== 'string' || !/^[a-f0-9]{40}$/.test(commit))) fail('fallback requires a full immutable commit');
  var inputAssets = record(inputManifest.assets, 'assets');
  var names = Object.keys(inputAssets);
  if (!names.length || names.length > MAX_ASSETS) fail('invalid asset count');
  var assets = Object.create(null);
  names.forEach(function (name) {
    if (!validAsset(name)) fail('invalid asset path');
    var entry = record(inputAssets[name], 'asset');
    exactKeys(entry, ['bytes', 'integrity'], 'asset');
    if (typeof entry.integrity !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(entry.integrity)) fail('invalid asset digest');
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > MAX_ASSET_BYTES) fail('invalid asset size');
    assets[name] = Object.freeze({ integrity: entry.integrity, bytes: entry.bytes });
  });
  Object.freeze(assets);

  var settings = options || {};
  var desktop = settings.isDesktopBundledApp === true;
  // Snapshot the base and booleans. Later option/localStorage changes cannot
  // relax an already-created policy.
  var usesLocal = settings.usesLocalModuleAssets === true;
  var baseValue = settings.baseUrl;
  if (typeof baseValue !== 'string' || !baseValue) fail('an explicit trusted base URL is required');
  var base;
  try { base = new URL('.', new URL(baseValue)); } catch (_) { fail('invalid base URL'); }
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) fail('invalid base URL');
  if (desktop && (!usesLocal || !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(base.hostname))) fail('desktop requires a local bundled base');
  var localOrigin = base.origin;
  var localPath = base.pathname;
  var fallbackBase = commit ? 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@' + commit + '/' : null;

  var resolveAsset = function (value) {
    if (typeof value !== 'string' || !value || value.length > 4096 || value !== value.trim()
      || /[\x00-\x20\x7f\\%]/.test(value) || value.slice(0, 2) === '//') fail('invalid script URL');
    // Reject traversal before URL() can normalize it away. A single leading ./
    // is the documented desktop/dev form.
    var pathInput = value.slice(0, 2) === './' ? value.slice(2) : value;
    if (/(^|\/)\.{1,2}(\/|[?#]|$)/.test(pathInput)) fail('noncanonical script URL');
    var url;
    try { url = new URL(value, base); } catch (_) { fail('invalid script URL'); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.hash) fail('invalid script URL');
    var asset = null;
    var isLocal = url.origin === localOrigin && url.pathname.indexOf(localPath) === 0;
    // CDN/GitHub bases are never a way to reclassify mutable main/latest URLs
    // as local relative assets.
    if (url.origin === 'https://raw.githubusercontent.com') {
      if (commit && url.pathname.indexOf('/Apomera/AlloFlow/' + commit + '/') === 0) asset = url.pathname.slice(('/Apomera/AlloFlow/' + commit + '/').length);
    } else if (url.origin === 'https://cdn.jsdelivr.net') {
      if (commit && url.pathname.indexOf('/gh/Apomera/AlloFlow@' + commit + '/') === 0) asset = url.pathname.slice(('/gh/Apomera/AlloFlow@' + commit + '/').length);
    } else if (isLocal) asset = url.pathname.slice(localPath.length);
    else if (url.origin === 'https://alloflow-cdn.pages.dev') asset = url.pathname.slice(1);
    if (desktop && !isLocal) fail('desktop remote scripts are disabled');
    if (!validAsset(asset) || !owns(assets, asset)) fail('script is not in the reviewed manifest');
    return { asset: asset, url: url.href };
  };

  return Object.freeze({
    configureScript: function (script, url) {
      var resolved = resolveAsset(url);
      if (!script || typeof script !== 'object') fail('a script element is required');
      // Set integrity before src: setting src can immediately begin a fetch on
      // an already-connected element. Callers append only after this succeeds.
      script.integrity = assets[resolved.asset].integrity;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.src = resolved.url;
      return script;
    },
    fallbackUrl: function (url) {
      if (!fallbackBase || desktop) return null;
      try {
        var resolved = resolveAsset(url);
        var fallback = fallbackBase + resolved.asset;
        return resolved.url === fallback ? null : fallback;
      } catch (_) { return null; }
    }
  });
}

// Global helpers run outside the deferred module-loader closure. They use the
// same lexical manifest, including on Canvas and the bundled Desktop shell.
function _alloConfigureBrowserDeliveryScript(script, url) {
  'use strict';
  var location = window.location;
  var href = String(location.href || '');
  var baseUrl = /^https?:\/\//i.test(href) ? href : 'https://alloflow-cdn.pages.dev/';
  var loopback = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname || '');
  var desktop = loopback && (location.pathname || '').indexOf('/app/') === 0;
  var usesLocal = desktop || (loopback && location.port === '3000');
  var candidate = usesLocal && typeof url === 'string'
    ? url.replace(/^https:\/\/alloflow-cdn\.pages\.dev\//, './') : url;
  return _alloCreateBrowserDeliveryPolicy(_alloBrowserDeliveryManifest, {
    baseUrl: baseUrl,
    isDesktopBundledApp: desktop,
    usesLocalModuleAssets: usesLocal
  }).configureScript(script, candidate);
}
