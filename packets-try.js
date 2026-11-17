// The preview page (packets-try.html). Makers open it with the blob: address of the built file after #.
// That address is held in the maker tab's memory: read here, never sent. The file runs in a sandboxed frame.
// Teacher tools connect to the open maker tab over BroadcastChannel on this origin.
(function () {
  'use strict';
  var doc = document;
  var CHANNEL = 'alloflow-packets-preview';
  var STORE_KIND = 'alloflow-packet-store';
  var fail = function () {
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-problem').hidden = false;
  };
  var address = String(window.location.hash || '').slice(1);
  var mine = 'blob:' + window.location.origin + '/';
  if (address.indexOf(mine) !== 0 || typeof window.fetch !== 'function') { fail(); return; }

  var barHost = doc.getElementById('try-edit');
  var frame = null;
  var blobUrl = '';
  var createdDynamic = false;
  var snapItems = {};
  var channel = null;
  var pendingFocus = '';
  var busyBar = false;

  function withSnapshot(html, items) {
    var clean = String(html || '').replace(/<script\b[^>]*id="packet-store-snapshot"[^>]*>[\s\S]*?<\/script>/i, '');
    var json = JSON.stringify({ kind: STORE_KIND, items: items || {} }).replace(/</g, '\\u003c');
    var block = '<script type="application/json" id="packet-store-snapshot">' + json + '</script>';
    // In the head, BEFORE the file's own script: the player reads the block once, while it starts. Put before
    // </body> (as it was until 2026-11-16) it came after the script, the player found nothing, said "This browser
    // cannot keep your work" on every screen and never told this page which question was showing, so the teacher
    // bar stayed on question 1 and "Remove question" removed question 1. packets-open.js has always done it this way.
    var at = clean.search(/<\/head\s*>/i);
    return at >= 0 ? clean.slice(0, at) + block + clean.slice(at) : block + clean;
  }

  function showHtml(html) {
    if (!frame) return;
    if (createdDynamic && blobUrl && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    }
    createdDynamic = !!blobUrl;
    blobUrl = URL.createObjectURL(new Blob([withSnapshot(html, snapItems)], { type: 'text/html' }));
    frame.src = blobUrl;
  }

  function renderBar(bar) {
    if (!barHost) return;
    barHost.textContent = '';
    if (!bar || bar.hidden) { barHost.hidden = true; return; }
    busyBar = !!bar.busy;
    if (bar.where) {
      var where = doc.createElement('span');
      where.className = 'try-edit-where';
      where.textContent = String(bar.where);
      barHost.appendChild(where);
    }
    var list = Array.isArray(bar.buttons) ? bar.buttons : [];
    if (list.length) {
      var group = doc.createElement('div');
      group.className = 'try-edit-actions';
      list.forEach(function (spec) {
        if (!spec || !spec.action) return;
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-small';
        btn.setAttribute('data-preview-act', String(spec.action));
        btn.disabled = !!(busyBar || spec.disabled);
        btn.textContent = String(spec.label || spec.action);
        btn.addEventListener('click', function () {
          if (!channel || busyBar || btn.disabled) return;
          pendingFocus = String(spec.action);
          busyBar = true;
          Array.prototype.forEach.call(barHost.querySelectorAll('button'), function (b) { b.disabled = true; });
          channel.postMessage({ type: 'preview-act', id: address, action: String(spec.action) });
        });
        group.appendChild(btn);
      });
      barHost.appendChild(group);
    }
    if (bar.said) {
      var said = doc.createElement('span');
      said.className = 'try-edit-said';
      said.setAttribute('role', 'status');
      said.textContent = String(bar.said);
      barHost.appendChild(said);
    }
    barHost.hidden = false;
    if (!busyBar && pendingFocus) {
      var target = barHost.querySelector('[data-preview-act="' + pendingFocus + '"]');
      pendingFocus = '';
      if (target && !target.disabled) target.focus();
      else {
        var first = barHost.querySelector('button:not(:disabled)');
        if (first) first.focus();
      }
    }
  }

  function wireChannel() {
    if (typeof window.BroadcastChannel !== 'function') return;
    try { channel = new window.BroadcastChannel(CHANNEL); } catch (_) { channel = null; }
    if (!channel) return;
    if (typeof channel.unref === 'function') channel.unref();
    channel.onmessage = function (event) {
      var msg = event && event.data;
      if (!msg || typeof msg !== 'object' || msg.id !== address) return;
      if (msg.type === 'preview-bar') { renderBar(msg.bar || msg); return; }
      if (msg.type === 'preview-reload') {
        if (typeof msg.html !== 'string' || !/^<!doctype html>/i.test(msg.html) || msg.html.indexOf('id="packet-manifest"') < 0) return;
        if (msg.snapshot && typeof msg.snapshot === 'object') snapItems = msg.snapshot;
        showHtml(msg.html);
        if (msg.bar) renderBar(msg.bar);
        return;
      }
      if (msg.type === 'preview-stop') { renderBar({ hidden: true }); }
    };
    window.addEventListener('message', function (event) {
      if (!frame || event.source !== frame.contentWindow) return;
      var d = event.data;
      if (!d || typeof d !== 'object' || d.kind !== STORE_KIND || typeof d.key !== 'string') return;
      if (d.value == null) delete snapItems[d.key];
      else snapItems[d.key] = String(d.value);
      channel.postMessage({ type: 'preview-store', id: address, key: d.key, value: d.value == null ? null : String(d.value) });
    });
    channel.postMessage({ type: 'preview-hello', id: address });
  }

  window.fetch(address).then(function (reply) {
    if (!reply.ok) throw new Error('gone');
    return reply.text();
  }).then(function (html) {
    if (!/^<!doctype html>/i.test(html) || html.indexOf('id="packet-manifest"') < 0) throw new Error('not a file from a maker');
    frame = doc.createElement('iframe');
    frame.className = 'try-frame';
    frame.title = 'The file a student gets';
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    showHtml(html);
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-main').appendChild(frame);
    wireChannel();
  }).catch(fail);
})();
