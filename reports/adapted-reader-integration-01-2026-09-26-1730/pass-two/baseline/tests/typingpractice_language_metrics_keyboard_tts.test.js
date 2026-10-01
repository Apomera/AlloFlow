import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');
const host = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab_module.js'), 'utf8');

function extractFunction(text, name) {
  const start = text.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = text.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

const normalizeText = Function('return (' + extractFunction(source, 'typingPracticeNormalizeText') + ')')();
const normalizeLanguage = Function('return (' + extractFunction(source, 'typingPracticeNormalizeLanguageTag') + ')')();
const metricProfile = Function('return (' + extractFunction(source, 'typingPracticeMetricProfile') + ')')();
const wordCount = Function('typingPracticeNormalizeText', 'return (' + extractFunction(source, 'typingPracticeWordCount') + ')')(normalizeText);
const computeMetric = Function(
  'typingPracticeMetricProfile',
  'typingPracticeWordCount',
  'typingPracticeNormalizeLanguageTag',
  'return (' + extractFunction(source, 'typingPracticeComputeMetric') + ')'
)(metricProfile, wordCount, normalizeLanguage);

describe('Typing Practice language metrics, keyboard profiles, and TTS locale forwarding', () => {
  it('uses WPM for whitespace languages and CPM for no-space scripts', () => {
    expect(metricProfile('en').unit).toBe('WPM');
    expect(metricProfile('zh-Hans').unit).toBe('CPM');
    expect(computeMetric(300, 60000, 'en', 'one two three').value).toBe(60);
    expect(computeMetric(120, 60000, 'zh-Hans', '中文打字练习').value).toBe(120);
  });

  it('counts words with Intl segmentation when spaces are not reliable', () => {
    expect(wordCount('中文打字练习', 'zh-Hans')).toBeGreaterThan(0);
    expect(computeMetric(120, 60000, 'zh-Hans', '中文打字练习').wordCount).toBeGreaterThan(0);
  });

  it('stores language and metric provenance in both warmup and saved summaries', () => {
    expect(source).toContain('metricValue: sessionMetric.value');
    expect(source).toContain('metricUnit: sessionMetric.unit');
    expect(source).toContain('metricLabel: sessionMetric.label');
    expect(source).toContain('language: sessionMetric.language');
    expect(source).toContain('metricValue: wmMetric.value');
    expect(source).toContain("renderMetric(s.metricUnit || 'WPM'");
  });

  it('offers persisted, announced keyboard-layout profiles and applies them to cues', () => {
    expect(source).toContain("keyboardLayout: 'qwerty-us'");
    expect(source).toContain("'qwertz-de'");
    expect(source).toContain("'azerty-fr'");
    expect(source).toContain("'dvorak'");
    expect(source).toContain("'colemak'");
    expect(source).toContain("upd('keyboardLayout', opt.id)");
    expect(source).toContain('typingPracticeKeyboardLayout(keyboardLayoutId).rows');
    expect(source).toContain('findKeyMeta(nextChar, state.keyboardLayout)');
  });

  it('forwards passage language through the host TTS bridge and keeps source/mirror aligned', () => {
    expect(source).toContain('ctx.callTTS(targetStr, null, 1.0, { force: true, language: activeTargetLanguage })');
    expect(host).toContain('return callTTS(text, voice, speed, opts).then(function(url)');
    expect(mirror).toBe(source);
  });
});
