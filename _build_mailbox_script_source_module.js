#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { gzipSync } = require('zlib');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs');
const OUTPUT = path.join(ROOT, 'mailbox_script_source_module.js');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public', 'mailbox_script_source_module.js');

function buildMailboxScriptSourceModule(source) {
    source = String(source || '');
    const versionMatch = source.match(/var VERSION = (\d+);/);
    const version = versionMatch ? Number(versionMatch[1]) : 0;
    const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');
    if (!source || !version) {
        throw new Error('Mailbox script source is empty or missing VERSION');
    }
    return [
        '(function() {',
        "'use strict';",
        'window.AlloModules = window.AlloModules || {};',
        'var previous = window.AlloModules.MailboxScriptSource;',
        'if (previous && previous.version === ' + version + ' && previous.sha256 === ' + JSON.stringify(sha256) + ') { console.log("[CDN] MailboxScriptSource already loaded, skipping"); return; }',
        'window.AlloModules.MailboxScriptSource = Object.freeze({',
        '  source: ' + JSON.stringify(source) + ',',
        '  version: ' + version + ',',
        '  sha256: ' + JSON.stringify(sha256),
        '});',
        "console.log('[CDN] MailboxScriptSource loaded');",
        '})();',
        '',
    ].join('\n');
}

function buildMailboxScriptInlineFallback(source) {
    return gzipSync(Buffer.from(String(source || ''), 'utf8'), { level: 9, mtime: 0 }).toString('base64');
}

module.exports = { buildMailboxScriptSourceModule, buildMailboxScriptInlineFallback };

if (require.main === module) {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source not found:', SOURCE);
        process.exit(1);
    }
    const output = buildMailboxScriptSourceModule(fs.readFileSync(SOURCE, 'utf8'));
    fs.writeFileSync(OUTPUT, output, 'utf8');
    fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
    fs.writeFileSync(PUBLIC, output, 'utf8');
    console.log('Built mailbox_script_source_module.js and public mirror (' + Buffer.byteLength(output) + ' bytes)');
}
