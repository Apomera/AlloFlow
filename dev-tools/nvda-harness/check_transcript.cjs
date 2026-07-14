#!/usr/bin/env node
/**
 * check_transcript.cjs — CLI: verify an NVDA speech log against a remediated document.
 *
 *   node dev-tools/nvda-harness/check_transcript.cjs <document.html> <nvda_speech.log> [out.txt]
 *
 * Exit codes: 0 = all expectations spoken in order, no decorative leaks;
 *             2 = findings (missing / out-of-order / decorative announced);
 *             1 = usage or IO error.
 * The heavy lifting is in the pure, unit-tested modules next to this file.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { deriveExpected, deriveMustNotAnnounce } = require('./expected_announcements.cjs');
const { parseSpeechLog, diffTranscript, formatReport } = require('./diff_transcript.cjs');

const [, , htmlFile, logFile, outFile] = process.argv;
if (!htmlFile || !logFile) {
  console.error('Usage: node check_transcript.cjs <document.html> <nvda_speech.log> [report.txt]');
  process.exit(1);
}
let html, log;
try { html = fs.readFileSync(htmlFile, 'utf8'); } catch (e) { console.error('Cannot read ' + htmlFile + ': ' + e.message); process.exit(1); }
try { log = fs.readFileSync(logFile, 'utf8'); } catch (e) { console.error('Cannot read ' + logFile + ': ' + e.message); process.exit(1); }

const expected = deriveExpected(html);
const mustNot = deriveMustNotAnnounce(html);
const utterances = parseSpeechLog(log);
if (utterances.length === 0) {
  console.error('Speech log is empty — did the Speech Logger add-on write to ' + logFile + '?');
  process.exit(1);
}
const diff = diffTranscript(expected, utterances, mustNot);
const report = formatReport(diff, { file: path.basename(htmlFile), log: path.basename(logFile), when: new Date().toISOString() });
console.log(report);
if (outFile) { fs.writeFileSync(outFile, report); console.log('\nReport written: ' + outFile); }
const s = diff.summary;
process.exit((s.missing || s.outOfOrder || s.decorativeAnnounced) ? 2 : 0);
