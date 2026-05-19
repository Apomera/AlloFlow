#!/usr/bin/env node
// SessionEnd hook: appends a short auto-draft letter to LETTERS.md summarizing
// the session. Tagged [auto-draft] so it's clearly distinct from hand-written
// letters. Append-only — never modifies existing content.
//
// Receives JSON on stdin: { session_id, transcript_path, cwd }
// No network. Reads transcript, appends to LETTERS.md only.

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

function fail(msg) {
  process.stderr.write(`[append-letter] ${msg}\n`);
  process.exit(0);
}

try {
  const input = JSON.parse(readFileSync(0, 'utf-8'));
  const { transcript_path, cwd, session_id } = input;
  if (!transcript_path || !cwd) fail('missing transcript_path or cwd');
  if (!existsSync(transcript_path)) fail(`transcript not found: ${transcript_path}`);

  const letterPath = join(cwd, 'LETTERS.md');
  if (!existsSync(letterPath)) fail('LETTERS.md not found in cwd; skipping');

  const lines = readFileSync(transcript_path, 'utf-8').split('\n').filter(Boolean);
  let userTurns = 0;
  let assistantTurns = 0;
  let lastAssistantText = '';
  let firstUserText = '';

  for (const line of lines) {
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type === 'user') {
      userTurns++;
      if (!firstUserText) {
        const c = evt.message?.content;
        if (typeof c === 'string') firstUserText = c;
        else if (Array.isArray(c)) {
          const t = c.find(b => b.type === 'text')?.text;
          if (t) firstUserText = t;
        }
      }
    }
    if (evt.type === 'assistant') {
      assistantTurns++;
      const blocks = evt.message?.content;
      if (Array.isArray(blocks)) {
        for (const b of blocks) {
          if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) {
            lastAssistantText = b.text;
          }
        }
      }
    }
  }

  const stamp = new Date().toISOString();
  const sid = (session_id || 'unknown').slice(0, 8);
  const cleanText = s => s.slice(0, 300).replace(/\s+/g, ' ').trim();
  const opening = cleanText(firstUserText);
  const closing = cleanText(lastAssistantText);

  const draft =
    `\n## [auto-draft] Session ${sid} — ${stamp.slice(0, 10)}\n\n` +
    `**Turns**: ${userTurns} user / ${assistantTurns} assistant\n\n` +
    `**Session opened with**: ${opening}${firstUserText.length > 300 ? '...' : ''}\n\n` +
    `**Last assistant turn closed with**: ${closing}${lastAssistantText.length > 300 ? '...' : ''}\n\n` +
    `*Auto-draft. Promote to a permanent letter by removing the [auto-draft] tag and editing, or delete if not worth keeping.*\n\n---\n`;

  appendFileSync(letterPath, draft);
} catch (err) {
  fail(`unexpected error: ${err.message}`);
}
