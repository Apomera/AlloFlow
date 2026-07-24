import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
describe('Learning Lab Emotion + Grounding accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEmotionRegulator(props) {');
  const end = source.indexOf('  function PersonalEFDashboard(props) {', start);
  const emotion = source.slice(start, end);
  it('uses native single-choice emotion controls and inline validation', () => {
    expect(emotion).toContain("hh('fieldset'");
    expect(emotion).toContain("hh('legend'");
    expect(emotion).toContain("type: 'radio', name: 'learning-lab-emotion'");
    expect(emotion).toContain("id: 'learning-lab-emotion-error', role: 'alert'");
    expect(emotion).toContain("focusId('learning-lab-emotion-sad')");
    expect(emotion).not.toContain("'aria-pressed': on ? 'true' : 'false'");
  });
  it('labels and bounds sensitive check-in fields with privacy guidance', () => {
    expect(emotion).toContain("id: 'learning-lab-emotion-privacy'");
    expect(emotion).toContain("maxLength: 240, 'aria-describedby': 'learning-lab-emotion-privacy'");
    expect(emotion).toContain("'aria-valuetext': form.intensity + ' out of 10, where 1 is low and 10 is very high'");
    expect(emotion).toContain('not an assessment or treatment');
  });
  it('provides current, named, contextual crisis options and non-monitoring disclosure', () => {
    expect(emotion).toContain("'aria-labelledby': 'learning-lab-emotion-safety-heading'");
    expect(emotion).toContain('does not monitor your entries, assess risk, contact anyone, or provide crisis care');
    expect(emotion).toContain("href: 'tel:988'");
    expect(emotion).toContain("href: 'sms:988'");
    expect(emotion).toContain("href: 'https://988lifeline.org/chat/'");
    expect(emotion).toContain("rel: 'noopener noreferrer'");
    expect(emotion).toContain("href: 'tel:18885681112'");
    expect(emotion).toContain('Maine Relay 711');
  });
  it('uses a pausable text breathing guide without interaction-triggered scaling motion or efficacy claims', () => {
    expect(emotion).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(emotion).not.toContain("'aria-pressed'");
    expect(emotion).toContain("boxPlaying ? 'Pause breathing guide' : 'Start breathing guide'");
    expect(emotion).toContain('You may pause or stop at any time.');
    expect(emotion).not.toContain("transition: 'transform");
    expect(emotion).not.toContain("transform: boxPlaying");
    expect(emotion).not.toContain('Settles the nervous system');
  });
  it('makes grounding optional, adaptable, bounded, temporary, and skippable', () => {
    expect(emotion).toContain('Skip any sense or prompt that is unavailable, inaccessible, uncomfortable, or unsafe.');
    expect(emotion).toContain('imagine smelling');
    expect(emotion).toContain('imagine tasting');
    expect(emotion).toContain("rows: 2, maxLength: 1000");
    expect(emotion).toContain("'aria-describedby': 'learning-lab-grounding-guidance'");
    expect(emotion).toContain('are cleared when you leave this exercise');
    expect(emotion).not.toContain('Even partial completion helps');
  });
  it('preserves sibling state and allows every saved check-in to be deleted', () => {
    expect(emotion.match(/setData\(Object\.assign\(\{\}, data,/g)).toHaveLength(2);
    expect(emotion).toContain("title: 'Delete this emotion check-in?', confirmText: 'Delete check-in'");
    expect(emotion).toContain("checks.map(function(check)");
    expect(emotion).not.toContain('checks.slice(0, 8)');
  });
  it('uses semantic history, robust dates, focus restoration, and announcements', () => {
    expect(emotion).toContain("hh('article', { 'aria-label': emotion.name + ' check-in");
    expect(emotion).toContain("hh('time', { dateTime: checkDate.toISOString()");
    expect(emotion).toContain("var dateKnown = !isNaN(checkDate.getTime());");
    expect(emotion).toContain("dateKnown ? hh('time', { dateTime: checkDate.toISOString() }, checkDate.toLocaleString()) : 'Date not recorded'");
    expect(emotion).toContain("focusId('learning-lab-emotion-history-heading')");
    expect(emotion).toContain("llAnnounce('Emotion check-in deleted.')");
  });
  it('handles malformed legacy check-in data without crashing', () => {
    expect(emotion).toContain('var rawChecks = Array.isArray(data.checks) ? data.checks : [];');
    expect(emotion).toContain('var checks = rawChecks.filter(isRecord);');
    expect(emotion).toContain("var intensityOf = function(value) { return Math.max(1, Math.min(10, Number(value) || 5)); };");
    expect(source).toContain("stat: (Array.isArray((data.mytkEmotion || {}).checks) ? (data.mytkEmotion || {}).checks.length : 0) + ' check-ins'");
  });

  it('updates discovery copy and keeps the deployed mirror identical', () => {
    expect(source).toContain("desc: 'Private check-in + optional adaptable grounding tools'");
    expect(source).toContain('Private emotion check-in with optional paced breathing and adaptable grounding prompts.');
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
