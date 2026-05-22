#!/usr/bin/env node
// SessionEnd hook: scans the session transcript for <note>...</note> and
// <question>...</question> markers in assistant messages, appends new ones
// to the pending-review sections of SELF_NOTES.md and OPEN_QUESTIONS.md.
//
// Receives JSON on stdin: { session_id, transcript_path, cwd }
// No network. Only reads transcript + writes to two project files.
// Atomic writes (write-to-temp + rename) to prevent partial-write corruption.

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = '<!-- AUTO-EXTRACTED ENTRIES BELOW -->';
const NOTE_RE = /<note>([\s\S]*?)<\/note>/g;
const Q_RE = /<question>([\s\S]*?)<\/question>/g;

function fail(msg) {
  process.stderr.write(`[extract-signals] ${msg}\n`);
  process.exit(0); // exit 0 so we never block Claude Code's shutdown
}

function atomicWrite(path, content) {
  const tmp = path + '.tmp';
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
}

function append(cwd, filename, items, sessionId) {
  if (!items.length) return;
  const path = join(cwd, filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf-8');
  const idx = content.indexOf(MARKER);
  if (idx === -1) {
    process.stderr.write(`[extract-signals] marker not found in ${filename}; skipping\n`);
    return;
  }
  const after = content.slice(idx + MARKER.length);
  const dedup = items.filter(it => !after.includes(it));
  if (!dedup.length) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const sid = (sessionId || 'unknown').slice(0, 8);
  const block =
    `\n\n### Auto-extracted ${stamp} (session ${sid})\n\n` +
    dedup.map(it => `- ${it}`).join('\n');
  const updated =
    content.slice(0, idx + MARKER.length) + block + content.slice(idx + MARKER.length);
  atomicWrite(path, updated);
}

try {
  const input = JSON.parse(readFileSync(0, 'utf-8'));
  const { transcript_path, cwd, session_id } = input;
  if (!transcript_path || !cwd) fail('missing transcript_path or cwd');
  if (!existsSync(transcript_path)) fail(`transcript not found: ${transcript_path}`);

  const lines = readFileSync(transcript_path, 'utf-8').split('\n').filter(Boolean);
  const notes = [];
  const questions = [];
  for (const line of lines) {
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== 'assistant') continue;
    const blocks = evt.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type !== 'text' || typeof b.text !== 'string') continue;
      for (const m of b.text.matchAll(NOTE_RE)) notes.push(m[1].trim());
      for (const m of b.text.matchAll(Q_RE)) questions.push(m[1].trim());
    }
  }

  append(cwd, 'SELF_NOTES.md', notes, session_id);
  append(cwd, 'OPEN_QUESTIONS.md', questions, session_id);
} catch (err) {
  fail(`unexpected error: ${err.message}`);
}
