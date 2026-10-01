import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab explanation practice', () => {
  it('offers one supported explanation and a complete reasoning chain for each topic', () => {
    const { getCoreExplanationPractice: get, getCoreExplanationFeedback: feedback } = window.__FisherLabCore;
    for (const topic of ['navigation','sampling','measurement']) {
      const task = get(topic);
      expect(task.choices.filter(c => c.supported)).toHaveLength(1);
      expect(task.parts.map(p => p.label)).toEqual(['Claim','Evidence','Reasoning','Limit']);
      task.choices.forEach((choice,index) => {
        expect(feedback(topic,index)).toEqual({ supported: choice.supported, feedback: choice.feedback });
        expect(choice.feedback.length).toBeGreaterThan(50);
      });
      expect(task.reflection).toContain('your own');
      expect(task).not.toHaveProperty('score');
    }
    expect(get('unknown')).toBeNull();
    expect(get('__proto__')).toBeNull();
    for(const choice of [null,undefined,-1,2,0.5,'1',NaN,Infinity]) expect(feedback('navigation',choice)).toBeNull();
    expect(feedback('unknown',0)).toBeNull();
  });
  it('keeps example data isolated from callers and returns detached feedback', () => {
    const { getCoreExplanationPractice: get, getCoreExplanationFeedback: feedback } = window.__FisherLabCore;
    const original = get('sampling');
    const copy = get('sampling');
    copy.choices[0].supported = false;
    copy.parts[0].text = 'Replaced';
    copy.parts.push({label:'Score',text:'No'});
    feedback('sampling',0).feedback = 'Replaced';
    expect(get('sampling')).toEqual(original);
    expect(feedback('sampling',0).feedback).toEqual(original.choices[0].feedback);
  });
  it('uses consistent model arithmetic and avoids attributing a measurement discrepancy to an unproven cause', () => {
    const get = window.__FisherLabCore.getCoreExplanationPractice;
    const nav = get('navigation');
    expect(3/6*60).toBe(30); expect(3/3*60).toBe(60);
    expect(nav.parts[1].text).toContain('30 minutes');
    expect(nav.parts[1].text).toContain('60 minutes');
    expect((6+2)/(8+12)*100).toBe(40);
    expect(get('sampling').parts[0].text).toContain('40% of this combined sample');
    expect((14.8+15+15.2)/3-14.5).toBeCloseTo(0.5);
    expect(get('measurement').parts[2].text).toContain('+0.5 units');
    expect(get('measurement').parts[3].text).toContain('do not establish the cause');
  });
});
