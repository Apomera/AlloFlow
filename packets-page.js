// Shared by the Packets pages. Five small jobs, no network, nothing stored:
// 1. The product name is written once on each page (in #product-name); it is put in front of the page title.
// 2. The page's own Content-Security-Policy is shown, word for word, wherever [data-show-rule] asks for it.
// 3. The Open page's address is filled in where a page names it (below).
// 4. A closed fold that asks for it ([data-open-by-address]) is opened when the address names it, as packets.html#check does.
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
  // 4. On arrival and when a link on the page goes to the fold. Without this script the link still lands on the fold's summary.
  var openNamed = function () {
    var named = at && at.hash && at.hash.length > 1 ? document.getElementById(at.hash.slice(1)) : null;
    if (!named || named.tagName !== 'DETAILS' || !named.hasAttribute('data-open-by-address')) return;
    named.open = true;
    if (named.scrollIntoView) named.scrollIntoView();
  };
  openNamed();
  if (window.addEventListener) window.addEventListener('hashchange', openNamed);
  // 5. The "Switch maker" menu (details.top-menu) closes on Escape and on a press outside it (2026-11-23). Focus goes
  //    back to its button when it was inside the menu.
  if (document.addEventListener) {
    var openMenus = function () { return Array.prototype.slice.call(document.querySelectorAll('details.top-menu[open]')); };
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      openMenus().forEach(function (menu) {
        var button = menu.querySelector('summary');
        var inside = menu.contains(document.activeElement);
        menu.open = false;
        if (inside && button && button.focus) button.focus();
      });
    });
    document.addEventListener('click', function (event) {
      openMenus().forEach(function (menu) { if (!menu.contains(event.target)) menu.open = false; });
    });
    document.addEventListener('focusin', function (event) {
      openMenus().forEach(function (menu) { if (!menu.contains(event.target)) menu.open = false; });
    });
  }
})();
