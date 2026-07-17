import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Emotion Regulator accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEmotionRegulator(props) {');
  const end = source.indexOf('  function PersonalEFDashboard(props) {', start);
  const emotionRegulator = source.slice(start, end);

  it('reports missing emotion selection inline and moves focus to the group', () => {
    expect(emotionRegulator).toContain("setEmotionError('Choose the emotion that feels strongest right now.')");
    expect(emotionRegulator).toContain("id: 'learning-lab-emotion-error', role: 'alert'");
    expect(emotionRegulator).toContain("document.getElementById('learning-lab-emotion-sad')");
    expect(emotionRegulator).not.toContain("alert('Pick an emotion first.')");
  });

  it('names emotion choices and exposes their selected state', () => {
    expect(emotionRegulator).toContain("role: 'group', 'aria-labelledby': 'learning-lab-emotion-question'");
    expect(emotionRegulator).toContain("'aria-label': emotion.id, 'aria-pressed': on ? 'true' : 'false'");
    expect(emotionRegulator).toContain("minWidth: 48, minHeight: 48");
  });

  it('labels the intensity slider and exposes an understandable value', () => {
    expect(emotionRegulator).toContain("htmlFor: 'learning-lab-emotion-intensity'");
    expect(emotionRegulator).toContain("id: 'learning-lab-emotion-intensity', type: 'range'");
    expect(emotionRegulator).toContain("'aria-valuetext': form.intensity + ' out of 10'");
    expect(emotionRegulator).toContain("minHeight: 44, accentColor: '#ec4899'");
  });

  it('associates labels with the context and need fields', () => {
    expect(emotionRegulator).toContain("htmlFor: 'learning-lab-emotion-context'");
    expect(emotionRegulator).toContain("id: 'learning-lab-emotion-context', type: 'text'");
    expect(emotionRegulator).toContain("htmlFor: 'learning-lab-emotion-need'");
    expect(emotionRegulator).toContain("id: 'learning-lab-emotion-need', type: 'text'");
  });

  it('announces breathing phases and exposes play or pause state', () => {
    expect(emotionRegulator).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(emotionRegulator).toContain("'aria-pressed': boxPlaying ? 'true' : 'false'");
    expect(emotionRegulator).toContain("boxPlaying ? '⏸ Pause breathing' : '▶ Start breathing'");
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('associates every grounding prompt with its textarea', () => {
    expect(emotionRegulator).toContain("var fieldId = 'learning-lab-grounding-' + f.id");
    expect(emotionRegulator).toContain("hh('label', { htmlFor: fieldId");
    expect(emotionRegulator).toContain("hh('textarea', { id: fieldId");
    expect(emotionRegulator).not.toContain("tkTextarea(ground[f.id]");
  });

  it('provides operable crisis support links', () => {
    expect(emotionRegulator).toContain("hh('aside', { 'aria-label': 'Crisis support'");
    expect(emotionRegulator).toContain("href: 'tel:988'");
    expect(emotionRegulator).toContain("href: 'sms:988'");
    expect(emotionRegulator).toContain("href: 'tel:18885681112'");
  });

  it('uses semantic history and exposes emotion names as text', () => {
    expect(emotionRegulator).toContain("'aria-labelledby': 'learning-lab-emotion-history-heading'");
    expect(emotionRegulator).toContain("id: 'learning-lab-emotion-history-heading'");
    expect(emotionRegulator).toContain("hh('ul', { style: listStyle }");
    expect(emotionRegulator).toContain("textTransform: 'capitalize' } }, c.label");
    expect(emotionRegulator).toContain("'aria-hidden': 'true'");
  });

  it('supports form submission and announces a saved check-in', () => {
    expect(emotionRegulator).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(emotionRegulator).toContain("hh('button', { type: 'submit'");
    expect(emotionRegulator).toContain("llAnnounce('Emotion check-in saved.')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
