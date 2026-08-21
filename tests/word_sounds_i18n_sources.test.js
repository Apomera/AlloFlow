// THE TWO ENGLISH SOURCES, AND THEIR TWO PLACEHOLDER CONVENTIONS.
//
// Word Sounds text resolves through getWordSoundsString(t, key, params)
// (AlloFlowANTI.txt): it calls t(key, params) FIRST — that is the language pack
// merged over ui_strings.js — and only if that misses does it fall back to
// WORD_SOUNDS_STRINGS, which comes from allo_data_source.jsx.
//
// The two sources interpolate differently, each matched to its own substituter:
//
//   ui_strings.js   {name}     host t():  result.replace(`{${key}}`, v)
//   allo_data       {{name}}   fallback:  fallback.replace(`{{${k}}}`, v)
//
// Put a {{name}} string in ui_strings and t() emits "Sound {5}" to a child;
// put a {name} string in allo_data and the fallback emits "Sound {n}". The
// module's own tests cannot catch either, because the harness stubs
// getWordSoundsString so the inline English fallbacks always win.
//
// A key must also be present in ui_strings.js to be translatable at all — the
// 63 language packs mirror THAT file. allo_data is the English safety net.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let uiWs, alloWs, moduleKeys;

const AUDIO_RECOVERY_KEYS = [
  'audio_ask_teacher_resend', 'audio_blocked_message', 'audio_check',
  'audio_checking_message', 'audio_checking_title', 'audio_damaged_message',
  'audio_damaged_requested_message', 'audio_damaged_title', 'audio_enable_title',
  'audio_manage_for_student', 'audio_missing_message', 'audio_missing_requested_message',
  'audio_open_resource_missing_toast', 'audio_open_resource_review_toast',
  'audio_preflight_detail', 'audio_preflight_detail_more', 'audio_preflight_message_send',
  'audio_preflight_message_start', 'audio_preflight_review', 'audio_preflight_send_anyway',
  'audio_preflight_start_anyway', 'audio_preflight_title', 'audio_request_sent',
  'audio_resend', 'audio_retry_mailbox_update', 'audio_retry_request_failed',
  'audio_retry_request_sent', 'audio_retry_teacher_needed', 'audio_review',
  'audio_review_repair_aria', 'audio_review_repair_title', 'audio_status_blocked',
  'audio_status_checking', 'audio_status_damaged', 'audio_status_missing',
  'audio_status_no_response', 'audio_status_requested', 'audio_status_resending',
  'audio_status_unsupported', 'audio_teacher_blocked_title', 'audio_teacher_resend_title',
  'audio_teacher_unsupported_title', 'audio_testing_message', 'audio_try_again',
  'audio_unsupported_message', 'audio_unsupported_requested_message',
  'audio_unsupported_title', 'audio_waiting_title',
];

function parseAlloData(src) {
  // const WORD_SOUNDS_STRINGS = { 'word_sounds.x': 'English', ... }
  // Values use EITHER quote style — a string containing an apostrophe is written
  // with double quotes (e.g. audio_unavailable). Matching only single-quoted
  // values silently under-reports and makes this file look incomplete.
  const out = {};
  const re = /'(word_sounds\.[a-z0-9_]+)'\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[2] !== undefined ? m[2].replace(/\\'/g, "'") : m[3].replace(/\\"/g, '"');
    out[m[1].replace('word_sounds.', '')] = raw;
  }
  return out;
}

beforeAll(() => {
  uiWs = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).word_sounds || {};
  alloWs = parseAlloData(readFileSync(resolve(process.cwd(), 'allo_data_source.jsx'), 'utf8'));
  const mod = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
  moduleKeys = [...new Set((mod.match(/ts\("(word_sounds\.[a-z0-9_]+)"/g) || [])
    .map((s) => s.replace(/ts\("|"/g, '').replace('word_sounds.', '')))];
});

const params = (v, re) => [...new Set([...String(v).matchAll(re)].map((m) => m[1]))].sort();

describe('placeholder conventions', () => {
  it('ui_strings word_sounds uses SINGLE braces (what host t() substitutes)', () => {
    const bad = Object.entries(uiWs)
      .filter(([, v]) => typeof v === 'string' && /\{\{[a-zA-Z]+\}\}/.test(v))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    expect(bad, `double-brace placeholders in ui_strings — t() would emit a literal brace:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('allo_data word_sounds uses DOUBLE braces (what the fallback substitutes)', () => {
    const bad = Object.entries(alloWs)
      .filter(([, v]) => /(^|[^{])\{[a-zA-Z]+\}/.test(v))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    expect(bad, `single-brace placeholders in allo_data — the fallback would leave them literal:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('a key parameterised in one source is parameterised the same way in the other', () => {
    const mismatched = [];
    for (const k of Object.keys(uiWs)) {
      if (!(k in alloWs)) continue;
      const a = params(uiWs[k], /\{([a-zA-Z]+)\}/g);
      const b = params(alloWs[k], /\{\{([a-zA-Z]+)\}\}/g);
      if (a.join(',') !== b.join(',')) {
        mismatched.push(`${k}: ui_strings[${a.join('|')}] vs allo_data[${b.join('|')}]`);
      }
    }
    expect(mismatched, `param names diverge between the two sources:\n  ${mismatched.join('\n  ')}`).toEqual([]);
  });
});

describe('translatability', () => {
  it('every key the module calls exists in ui_strings, or it can never be translated', () => {
    const missing = moduleKeys.filter((k) => !(k in uiWs));
    expect(missing, `keys absent from the pack master (63 packs mirror it):\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('every key the module calls has an English fallback in allo_data', () => {
    const missing = moduleKeys.filter((k) => !(k in alloWs));
    expect(missing, `keys with no English safety net:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('registers the complete learner and teacher audio-recovery flow in both English sources', () => {
    expect(AUDIO_RECOVERY_KEYS.filter((key) => !(key in uiWs)), 'missing from ui_strings word_sounds').toEqual([]);
    expect(AUDIO_RECOVERY_KEYS.filter((key) => !(key in alloWs)), 'missing from allo_data word_sounds').toEqual([]);
  });
});
