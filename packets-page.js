// Shared by the Packets pages. Two small jobs, no network, nothing stored:
// 1. The product name is written once on each page (in #product-name); it is put in front of the page title.
// 2. The page's own Content-Security-Policy is shown, word for word, wherever [data-show-rule] asks for it.
(function () {
  'use strict';
  var name = document.getElementById('product-name');
  var text = name ? String(name.textContent || '').trim() : '';
  if (text && document.title.indexOf(text) !== 0) document.title = text + ': ' + document.title;
  var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  var rule = meta ? meta.getAttribute('content') : '';
  if (rule) Array.prototype.forEach.call(document.querySelectorAll('[data-show-rule]'), function (node) { node.textContent = rule; });
})();
