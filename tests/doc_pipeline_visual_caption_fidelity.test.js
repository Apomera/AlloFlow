import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;
const model = vi.fn(async () => '{}');
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const image = (caption, extra = {}) => ({ id: 'visual-example', type: 'image', title: 'Compare ideas', data: {
  visualPlan: { title: 'Two possible replies', panels: [{ id: 'panel-one', imageUrl: 'data:image/png;base64,iVBORw0KGgo=', alt: 'A lamp and book.', caption, labels: [] }] }, ...extra,
} });
const captionText = caption => [...caption.children].map(node => node.textContent).join(' ').replace(/\s+/g, ' ').trim();

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: model, callGeminiVision: model, callImagen: model,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource', state: {},
  });
});

describe('visual captions are readable content in printed resources', () => {
  it('normalizes the saved layout wrapper and line breaks before safely formatting Markdown', () => {
    const item = image('<span style="display:block;text-align:left;padding:12px 16px 96px">**Fictional situation:** A lamp helps one position.<br><br>**Ask:** What remains uncertain?\n\nRead [the source](https://example.test/article).</span>');
    const before = JSON.stringify(item), doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: true }));
    const caption = doc.querySelector('[data-vp-caption-format="markdown"]');
    expect(caption).not.toBeNull();
    expect(caption.textContent).toContain('Fictional situation:');
    expect(caption.textContent).toContain('What remains uncertain?');
    expect(caption.textContent).not.toMatch(/<span|<br|\*\*/);
    expect(caption.querySelectorAll('strong')).toHaveLength(2);
    expect(caption.querySelectorAll('p')).toHaveLength(3);
    expect(caption.querySelector('a').getAttribute('href')).toBe('https://example.test/article');
    expect(caption.style.fontStyle).toBe('normal');
    expect(caption.style.textAlign).toBe('start');
    expect(caption.style.padding).toBe('12px');
    expect(doc.querySelector('.vp-grid').getAttribute('data-vp-print-layout')).toBe('reading');
    expect(JSON.stringify(item)).toBe(before);
    expect(model).not.toHaveBeenCalled();
  });

  it('keeps every real Katie caption’s meaning without printing source markup', () => {
    let checked = 0;
    for (const filename of ['academic_discourse_reading_space_grade6', 'reading_decisions_grade6']) {
      const pack = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8'));
      for (const item of pack.history.filter(resource => resource.type === 'image')) {
        const before = JSON.stringify(item), doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: true }));
        const captions = [...doc.querySelectorAll('.vp-caption')];
        expect(captions).toHaveLength(item.data.visualPlan.panels.length);
        for (let i = 0; i < captions.length; i++) {
          const expected = item.data.visualPlan.panels[i].caption.replace(/^\s*<span\s+style="[^"]*">/i, '').replace(/<\/span>\s*$/i, '').replace(/<br\s*\/?>/gi, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
          expect(captionText(captions[i])).toBe(expected);
          expect(captions[i].textContent).not.toMatch(/<span|<br|\*\*/);
          expect(captions[i].getAttribute('data-vp-caption-format')).toBe('markdown');
          checked++;
        }
        expect(JSON.stringify(item)).toBe(before);
      }
    }
    expect(checked).toBe(14);
  });

  it.each([
    '<span style="display:block"><script>alert(1)</script><br>**Read:** <img src=x onerror="alert(2)"></span>',
    '<span style="display:block" onclick="alert(3)">**Read:** <svg onload="alert(4)"></svg></span>',
    '**Read:** [bad](javascript:alert(5)) and [other](data:text/html,bad)',
    '**Read:** [quoted](https://example.test/"onmouseover="alert(6))',
    '**Read:** https://example.test/" onerror="alert(7) <iframe srcdoc="bad"></iframe>',
    '**Read:** &lt;script&gt;alert(8)&lt;/script&gt; and [encoded](java&#x73;cript:bad)',
  ])('does not turn authored HTML or unsafe links into executable caption markup: %s', source => {
    const doc = parse(pipeline.generateResourceHTML(image(source), false, {}, { isWorksheet: true }));
    const caption = doc.querySelector('.vp-caption');
    expect(caption.querySelector('script,img,svg,iframe,object,embed,form,style')).toBeNull();
    for (const node of caption.querySelectorAll('*')) {
      expect([...node.attributes].some(attribute => /^on/i.test(attribute.name))).toBe(false);
    }
    for (const link of caption.querySelectorAll('a')) {
      expect(link.getAttribute('href')).toMatch(/^(?:https?:|mailto:|tel:|resource:|#|\/|\.)/i);
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('retains a short plain caption’s compact presentation and an override’s content', () => {
    const plain = parse(pipeline.generateResourceHTML(image('A lamp beside one book.'), false, {}, { isWorksheet: true }));
    const caption = plain.querySelector('.vp-caption');
    expect(caption.getAttribute('data-vp-caption-format')).toBe('plain');
    expect(caption.textContent).toBe('A lamp beside one book.');
    expect(caption.style.fontStyle).toBe('italic');
    expect(caption.style.textAlign).toBe('center');
    expect(plain.querySelector('.vp-grid').getAttribute('data-vp-print-layout')).toBe('default');
    const override = parse(pipeline.generateResourceHTML(image('Old caption.', { annotations: { captionOverrides: { 0: '**Teacher edit:** Keep this exact meaning.' } } }), false, {}, { isWorksheet: true }));
    expect(override.querySelector('.vp-caption').textContent).toContain('Teacher edit: Keep this exact meaning.');
    expect(override.querySelector('.vp-caption').textContent).not.toContain('Old caption');
  });

  it('scopes the single-column, contained-image layout to print media and structured panels', () => {
    const item = image('**Read:** A fact and a reason.');item.data.visualPlan.panels.push({ ...item.data.visualPlan.panels[0], id: 'panel-two' });
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: false }));
    expect(doc.querySelector('.vp-grid').style.gridTemplateColumns).toBe('repeat(2,minmax(0,1fr))');
    const css = [...doc.querySelectorAll('style')].map(style => style.textContent).join('\n');
    expect(css).toMatch(/@media print\s*\{[\s\S]*data-vp-print-layout="reading"[\s\S]*max-height:180px/);
    expect(css).toContain('object-fit:contain!important');
    expect(css).toContain('line-height:1.4!important; margin-top:0!important; margin-bottom:8px!important');
  });
});

describe('quiz print copies include only authored reflection tasks', () => {
  const quiz = data => ({ id: 'reflection-example', type: 'quiz', title: 'Your reason', data: { questions: [{ type: 'short-answer', question: 'Explain your reason.', expectedAnswer: 'PRIVATE ANSWER' }], ...data } });
  it.each([{ reflections: [] }, {}, { reflections: [{ text: ' ' }] }])('omits empty reflection headings and response areas: %j', data => {
    const doc = parse(pipeline.generateResourceHTML(quiz(data), false, {}, { isWorksheet: true }));
    expect(doc.body.textContent).not.toContain('output.quiz_reflection');
    expect(doc.querySelector('.reflection-block')).toBeNull();
    expect(doc.body.textContent).not.toContain('PRIVATE ANSWER');
  });
  it.each([{ reflections: [{ text: 'What will you try next?' }] }, { reflection: 'What will you try next?' }])('preserves authored current and legacy reflections: %j', data => {
    const doc = parse(pipeline.generateResourceHTML(quiz(data), false, {}, { isWorksheet: true }));
    expect(doc.body.textContent).toContain('output.quiz_reflection');
    expect(doc.body.textContent).toContain('What will you try next?');
    expect(doc.querySelectorAll('.reflection-block')).toHaveLength(1);
  });
});
