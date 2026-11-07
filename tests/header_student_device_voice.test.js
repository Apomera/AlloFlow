import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';

// Student AI off (owner decision 2026-11-04): the spoken-output picker offers only
// the device voice to such learners (no Gemini cloud, Edge or Kokoro download).
// Follow-up 2026-11-04: a Kokoro voice ALREADY on the device reads locally, so it
// stays offered; one that would need the download is not.
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const header = readFileSync('view_header_source.jsx', 'utf8');
const elements = [];
function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === 'JSXElement') elements.push(node); for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); } }
walk(parse(header, { sourceType: 'script', plugins: ['jsx'] }));
const select = elements.find(n => n.openingElement.attributes.some(a => a.name?.name === 'id' && a.value?.value === 'header-spoken-output-voice'));
const code = babel.transformSync('(' + header.slice(select.start, select.end) + ')', { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
const flagLine = header.split('\n').find(l => l.includes('const studentDeviceVoiceOnly ='));
const onDeviceLines = header.split('\n').filter(l => /const (studentOnDeviceKokoro|studentVoiceValue) =/.test(l)).map(l => l.trim()).join('\n');

function render(scopeExtra) {
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  const scope = {
    React: { createElement: h, Fragment: 'Fragment' }, selectedVoice: 'Kore', _isCanvasEnv: true, isLocalVoiceMode: false,
    GEMINI_VOICES: [{ id: 'Kore', label: 'Kore' }, { id: 'Puck', label: 'Puck' }], KOKORO_VOICES: [{ id: 'af_heart', label: 'Heart' }],
    EDGE_TTS_VOICES: [{ id: 'en-US-AriaNeural', label: 'Aria' }], _skin: { field: '' }, t: () => null,
    setSelectedVoice: () => {}, startKokoroVoiceDownload: () => {},
    renderKokoroVoiceGroup: () => h('optgroup', {}, h('option', { value: 'af_heart' })),
    renderDeviceVoiceGroup: () => h('optgroup', {}, h('option', { value: 'browser' })),
    renderStudentOnDeviceGroup: () => h('optgroup', {}, h('option', { value: 'af_heart' })),
    studentOnDeviceKokoro: false, studentVoiceValue: 'browser',
    ...scopeExtra,
  };
  const tree = vm.runInNewContext(code, scope);
  const values = [];
  const collect = n => { if (Array.isArray(n)) return n.forEach(collect); if (!n || typeof n !== 'object') return; if (n.type === 'option') values.push(n.props.value); (n.children || []).forEach(collect); };
  collect(tree);
  return { value: tree.props.value, values };
}

describe('header spoken-output voice picker under student AI off', () => {
  it('derives the flag from the host signal for learners only', () => {
    expect(flagLine).toBeTruthy();
    const flag = (isTeacherMode, win) => vm.runInNewContext(flagLine.trim() + '; studentDeviceVoiceOnly', { isTeacherMode, window: win });
    expect(flag(false, { __alloStudentAiDisabled: true })).toBe(true);
    expect(flag(true, { __alloStudentAiDisabled: true })).toBe(false);
    expect(flag(false, {})).toBe(false);
  });
  it.each([true, false])('offers only the device voice to a student-off learner (Canvas=%s)', canvas => {
    const { value, values } = render({ studentDeviceVoiceOnly: true, _isCanvasEnv: canvas });
    expect(values).toEqual(['browser']);
    expect(value).toBe('browser');
  });
  it('keeps cloud and on-device voices for everyone else', () => {
    const { value, values } = render({ studentDeviceVoiceOnly: false });
    expect(values).toEqual(expect.arrayContaining(['Kore', 'Puck', 'af_heart', 'browser']));
    expect(value).toBe('Kore');
  });
  const onDevice = (extra) => vm.runInNewContext(onDeviceLines + '; ({ studentOnDeviceKokoro, studentVoiceValue })', {
    studentDeviceVoiceOnly: true, kokoroCapability: { ok: true }, kokoroSavedOnDevice: null, selectedVoice: 'af_heart',
    KOKORO_VOICES: [{ id: 'af_heart' }], window: {}, ...extra });
  it('offers a Kokoro voice already on the device next to the device voice', () => {
    expect(onDeviceLines.split('\n')).toHaveLength(2);
    const loaded = onDevice({ window: { _kokoroTTS: { ready: true } } });
    expect(loaded).toEqual({ studentOnDeviceKokoro: true, studentVoiceValue: 'af_heart' });
    expect(onDevice({ kokoroSavedOnDevice: true }).studentOnDeviceKokoro).toBe(true);
    const { value, values } = render({ studentDeviceVoiceOnly: true, ...loaded, selectedVoice: 'af_heart' });
    expect(values).toEqual(['af_heart', 'browser']);
    expect(value).toBe('af_heart');
  });
  it('offers no Kokoro voice that would need a download, and a cloud voice name shows the device voice', () => {
    expect(onDevice({})).toEqual({ studentOnDeviceKokoro: false, studentVoiceValue: 'browser' });
    expect(onDevice({ kokoroSavedOnDevice: false }).studentOnDeviceKokoro).toBe(false);
    expect(onDevice({ kokoroCapability: { ok: false }, window: { _kokoroTTS: { ready: true } } }).studentOnDeviceKokoro).toBe(false);
    expect(onDevice({ window: { _kokoroTTS: { ready: true } }, selectedVoice: 'Kore' }).studentVoiceValue).toBe('browser');
    expect(onDevice({ studentDeviceVoiceOnly: false, window: { _kokoroTTS: { ready: true } } }).studentOnDeviceKokoro).toBe(false);
  });
  it('hides the fallback toggle and the Kokoro download for student-off learners', () => {
    expect(header).toContain('const canUseKokoroVoicePicker = kokoroCapability.ok && !studentDeviceVoiceOnly;');
    const fallback = header.indexOf('id="header-browser-voice-fallback"');
    expect(header.lastIndexOf('{!studentDeviceVoiceOnly && <div', fallback)).toBeGreaterThan(fallback - 600);
  });
});
