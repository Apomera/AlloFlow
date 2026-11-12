// The preview page (packets-try.html). Either maker (practice files, math checks) opens it with the address of the
// file it built after the #. That address is a blob: address of this same site, held in the maker tab's memory: it
// is read here, never sent. The file is shown in a sandboxed frame, so it runs as it will for a learner and cannot
// touch this site's storage.
(function () {
  'use strict';
  var doc = document;
  var fail = function () {
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-problem').hidden = false;
  };
  var address = String(window.location.hash || '').slice(1);
  var mine = 'blob:' + window.location.origin + '/';
  if (address.indexOf(mine) !== 0 || typeof window.fetch !== 'function') { fail(); return; }
  window.fetch(address).then(function (reply) {
    if (!reply.ok) throw new Error('gone');
    return reply.text();
  }).then(function (html) {
    if (!/^<!doctype html>/i.test(html) || html.indexOf('id="packet-manifest"') < 0) throw new Error('not a file from a maker');
    var frame = doc.createElement('iframe');
    frame.className = 'try-frame';
    frame.title = 'The file a student gets';
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    frame.src = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-main').appendChild(frame);
  }).catch(fail);
})();
