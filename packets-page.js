// Shared by the Packets pages. Three small jobs, no network, nothing stored:
// 1. The product name is written once on each page (in #product-name); it is put in front of the page title.
// 2. The page's own Content-Security-Policy is shown, word for word, wherever [data-show-rule] asks for it.
// 3. The Open page's address is filled in where a page names it (below).
(function () {
  'use strict';
  var name = document.getElementById('product-name');
  var text = name ? String(name.textContent || '').trim() : '';
  if (text && document.title.indexOf(text) !== 0) document.title = text + ': ' + document.title;
  var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  var rule = meta ? meta.getAttribute('content') : '';
  if (rule) Array.prototype.forEach.call(document.querySelectorAll('[data-show-rule]'), function (node) { node.textContent = rule; });
  // 3. The Open page's address, where a page names it ([data-open-address]): this site's own, when the page is served from a real
  //    site (not a test or local address). The same rule as the files the makers make (word_sounds_take_home_loader.js, openAddress).
  var at = window.location, host = String(at && at.hostname || '');
  if (at && /^https?:$/.test(at.protocol) && !/(?:^|\.)(?:test|localhost)$|^127\.|^\[?::1\]?$/.test(host)) {
    var open = at.host + at.pathname.replace(/[^/]*$/, '') + 'packets-open.html';
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-address]'), function (node) { node.textContent = open; });
  }
})();
