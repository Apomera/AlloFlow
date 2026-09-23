#!/usr/bin/env node
// embed_school_rewards_qr.cjs
//
// Embeds the QR encoder the School Rewards portal uses to print claim coupons.
//
// Why it is embedded rather than loaded: the portal runs as the signed-in user,
// and administrators and staff can award points from it. Loading qrcode.js as
// a <script> from the CDN would let whoever controls that CDN run code with
// their permissions. Embedding also means coupons never depend on the network.
//
// Source: the repository's own qrcode.js (Kazuhiko Arase, MIT), the same
// encoder AlloFlow uses everywhere else, minus its UMD footer. It is minified
// with esbuild, written between the SR_QR markers in Portal.html, and the file
// is then copied to its public mirror. tests/school_rewards_claim_portal.test.js checks that the
// embedded encoder draws exactly what qrcode.js draws, so a stale embed fails
// there rather than silently printing a different code.
//
// Run from the repository root: node dev-tools/embed_school_rewards_qr.cjs
// (then rebuild the practice pages: node dev-tools/rebuild_school_rewards_practice.cjs)

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'qrcode.js');
const PORTAL = path.join(ROOT, 'apps_script', 'school_rewards', 'Portal.html');
const PUBLIC_PORTAL = path.join(ROOT, 'desktop', 'web-app', 'public', 'apps_script', 'school_rewards', 'Portal.html');
const START = '/* SR_QR_START */';
const END = '/* SR_QR_END */';

function buildEmbed() {
  const source = fs.readFileSync(SOURCE, 'utf8');
  const footer = source.indexOf('(function (factory)');
  if (footer < 0) throw new Error('qrcode.js: UMD footer not found; the source layout changed');
  const core = source.slice(0, footer);
  const minified = esbuild.transformSync(core, { minify: true, target: 'es5', legalComments: 'none' }).code.trim();
  if (/<\/script/i.test(minified)) throw new Error('minified encoder contains a closing script tag');
  // Local to the portal script: no window.qrcode global for anything else to replace.
  return 'var srQrcode=(function(){' + minified + (minified.endsWith(';') ? '' : ';') + 'return qrcode})();';
}

function embed(file, block) {
  const html = fs.readFileSync(file, 'utf8');
  const from = html.indexOf(START), to = html.indexOf(END);
  if (from < 0 || to < 0 || to < from) throw new Error(path.relative(ROOT, file) + ' is missing the SR_QR markers');
  const next = html.slice(0, from + START.length) + block + html.slice(to);
  fs.writeFileSync(file, next);
  return next.length;
}

if (require.main === module) {
  const block = buildEmbed();
  console.log('embedded', block.length, 'bytes in', path.relative(ROOT, PORTAL), '->', embed(PORTAL, block), 'bytes');
  // The CDN mirror is a byte copy of the package file (tests/school_rewards_panel.test.js pins that).
  fs.copyFileSync(PORTAL, PUBLIC_PORTAL);
  console.log('mirrored to', path.relative(ROOT, PUBLIC_PORTAL));
}

module.exports = { buildEmbed, START, END };
