import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const rendererSource = readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
function closure(name) {
  const start = source.indexOf('  const ' + name + ' = ');
  if (start < 0) throw new Error('Missing source closure: ' + name);
  const end = source.indexOf('\n  };', start);
  if (end < 0) throw new Error('Missing closure end: ' + name);
  return source.slice(start, end + 5);
}
const stripDataUrls = new Function(closure('_stripDataUrlsForAi') + '\nreturn _stripDataUrlsForAi;')();
const restoreDataUrls = new Function(closure('_restoreDataUrlsForAi') + '\nreturn _restoreDataUrlsForAi;')();
const carryStart = source.indexOf("          let _carriedOut = '';");
const carryEnd = source.indexOf('\n          {\n            const imgInfo = extractedImages[imgIdx]', carryStart);
if (carryStart < 0 || carryEnd < 0) throw new Error('Missing image carry-out boundary');
const carrySourceBlocks = new Function('match', 'warnLog',
  source.slice(carryStart, carryEnd) + '\nreturn _carriedOut;');
const createRenderer = new Function(rendererSource + '\nreturn createDocBuilderRenderer;')();
const noop = () => {};
const render = createRenderer({
  docStyle: {},
  _accessibleHeaderColors: noop, _alloCellRichText: noop, _emitAccessibleTableHtml: noop,
  _pipeLog: noop, _sanitizeRawHtmlBlock: (html) => html, _validateTableGrid: noop,
  renderWordArtHtml: noop, warnLog: noop,
});
const imageBlock = { type: 'image', id: 'letterhead', description:
  'Office of Special Education Programs letterhead, showing the United States Department of Education seal, OSEP, and Office of Special Education Programs.' };

async function captureAuditPrompts(html, expectedCalls) {
  const prompts = [];
  const signal = { aborted: false };
  const deps = {
    _stripDataUrlsForAi: stripDataUrls,
    _pipeLog: noop,
    AUDIT_CHUNK_SIZE: 16000,
    AUDIT_CHUNK_OVERLAP: 800,
    AUDIT_RUBRIC_PROMPT: 'Audit contract',
    _neutralizePromptFence: (value) => value,
    _auditMemoKey: async (prompt) => prompt,
    _auditMemoGet: () => null,
    _auditMemoDelete: noop, _auditMemoPut: noop,
    _auditMemoRunOnce: (_key, _prompt, producer) => producer(),
    _usesLocalTextBackend: () => false,
    _requireStrictOutputAudit: (value) => value,
    parseAuditJson: JSON.parse,
    callGemini: async (prompt) => {
      prompts.push(prompt);
      // Stop after prompt construction; this regression does not invoke providers,
      // score merging, or unrelated asynchronous remediation stages.
      if (prompts.length === expectedCalls) signal.aborted = true;
      return JSON.stringify({ score: 100, summary: 'Fixture', issues: [], passes: ['a', 'b', 'c', 'd'] });
    },
    warnLog: noop,
  };
  const audit = new Function(...Object.keys(deps),
    closure('auditOutputAccessibility') + '\nreturn auditOutputAccessibility;')(...Object.values(deps));
  await audit(html, { signal });
  return prompts;
}

describe('image placeholder replacement preserves source blocks without copying editor UI', () => {
  it('does not carry the renderer-owned long-description upload container after a real image', () => {
    const placeholder = render([imageBlock]);
    expect(parse(placeholder).querySelector('[id$="-container"]').textContent.length).toBeGreaterThan(120);
    expect(carrySourceBlocks(placeholder, noop)).toBe('');
  });

  it('preserves genuine source DIV prose both beside and inside the generated container', () => {
    const doc = parse(render([imageBlock]));
    const figure = doc.querySelector('figure');
    const nestedText = 'This source explanation inside the container must remain available. '.repeat(3);
    const siblingText = 'This separate source explanation must also remain in the document. '.repeat(3);
    const nested = doc.createElement('div');
    nested.id = 'nested-source-prose';
    nested.textContent = nestedText;
    figure.querySelector('[id$="-container"]').appendChild(nested);
    const sibling = doc.createElement('div');
    sibling.id = 'sibling-source-prose';
    sibling.textContent = siblingText;
    figure.appendChild(sibling);
    const carried = parse(carrySourceBlocks(figure.outerHTML, noop));
    expect(carried.querySelector('#nested-source-prose').textContent).toBe(nestedText);
    expect(carried.querySelector('#sibling-source-prose').textContent).toBe(siblingText);
    expect(carried.querySelectorAll('input, button, svg')).toHaveLength(0);
    expect(carried.body.textContent).not.toContain('Image placeholder');
  });

  it('preserves short source paragraphs, inline markup, and direct text inside the generated container', () => {
    const doc = parse(render([imageBlock]));
    const container = doc.querySelector('[id$="-container"]');
    container.insertAdjacentHTML('beforeend', '<p>Submit the worksheet tomorrow.</p><span>Keep this short note.</span>');
    container.appendChild(doc.createTextNode(' Direct source text & a < b.'));
    const carried = parse(carrySourceBlocks(doc.querySelector('figure').outerHTML, noop));
    expect(carried.querySelector('p').textContent).toBe('Submit the worksheet tomorrow.');
    expect(carried.querySelector('span').textContent).toBe('Keep this short note.');
    expect(carried.body.textContent).toContain(' Direct source text & a < b.');
    expect(carried.querySelectorAll('input, button, svg')).toHaveLength(0);
    expect(carried.body.textContent).not.toContain('Image placeholder');
  });

  it('does not discard an unrelated source DIV merely because it contains an input', () => {
    const prose = 'This is source form guidance with a meaningful instruction. '.repeat(3);
    const html = '<figure id="source-figure" data-img-placeholder="true"><div id="source-container">'
      + prose + '<input type="file"></div><figcaption>Source content</figcaption></figure>';
    const carried = parse(carrySourceBlocks(html, noop));
    expect(carried.querySelector('#source-container').textContent).toBe(prose);
    expect(carried.querySelector('input')).not.toBeNull();
  });
});

describe('output audits mask restored image payloads before choosing and splitting chunks', () => {
  it('avoids existing placeholder collisions and restores quoted data values exactly', () => {
    const html = '<p>__ALLOFLOW_DATAURL_0__ __ALLOFLOW_DATAURL_1__</p>'
      + '<img src="data:image/png;base64,AAAA" alt="First image">'
      + "<img src='data:image/jpeg;base64,BBBB' alt='Second image'>"
      + '<source srcset="data:image/png;base64,CCCC 1x, data:image/png;base64,DDDD 2x">';
    const masked = stripDataUrls(html);
    expect(Object.keys(masked.map)).toEqual([
      '__ALLOFLOW_DATAURL_2__', '__ALLOFLOW_DATAURL_3__', '__ALLOFLOW_DATAURL_4__',
    ]);
    expect(masked.html).not.toContain('base64,');
    expect(restoreDataUrls(masked.html, masked.map)).toBe(html);
    const unquoted = stripDataUrls('<img src=data:image/png;base64,EEEE alt="Third image">');
    expect(parse(restoreDataUrls(unquoted.html, unquoted.map)).querySelector('img').getAttribute('src'))
      .toBe('data:image/png;base64,EEEE');
  });

  it('preserves visible examples, escaped code, comments, and strings inside other attributes or raw-text elements', () => {
    const visible = '<p>Example: src="data:text/plain,Read this instruction"</p>';
    const code = '<pre><code>&lt;img src="data:image/png;base64,IN_CODE"&gt;</code></pre>';
    const script = "<script>const example = '<img src=\"data:image/png;base64,IN_SCRIPT\">';</script>";
    const style = "<style>.sample::after{content:'src=\"data:text/plain,CSS example\"'}</style>";
    const comment = '<!-- <img src="data:image/png;base64,IN_COMMENT"> -->';
    const textarea = '<textarea><img src="data:image/png;base64,IN_TEXTAREA"></textarea>';
    const alt = "alt='Example src=\"data:text/plain,Alt instructions\"'";
    const handler = "onclick=\"show('src=data:text/plain,Handler example')\"";
    const html = visible + code + script + style + comment + textarea
      + '<img src="data:image/png;base64,ACTUAL_IMAGE" ' + alt + '>'
      + "<a href='data:text/plain,ACTUAL_DOWNLOAD' " + handler + '>Read</a>';
    const masked = stripDataUrls(html);
    expect(Object.values(masked.map)).toEqual([
      'data:image/png;base64,ACTUAL_IMAGE', 'data:text/plain,ACTUAL_DOWNLOAD',
    ]);
    for (const preserved of [visible, code, script, style, comment, textarea, alt, handler]) {
      expect(masked.html).toContain(preserved);
    }
    expect(restoreDataUrls(masked.html, masked.map)).toBe(html);
  });

  it('keeps HTTPS src and href URLs containing a data: example visible to the auditor', () => {
    const href = 'https://school.example/?example=data:text/plain,Read';
    const src = 'https://school.example/image?example=data:image/png;base64,Reference';
    const html = '<a href="' + href + '">Source example</a><img src="' + src + '" alt="Example">'
      + '<img src=" data:image/png;base64,ACTUAL_IMAGE" alt="Actual">';
    const masked = stripDataUrls(html);
    expect(masked.html).toContain('href="' + href + '"');
    expect(masked.html).toContain('src="' + src + '"');
    expect(Object.values(masked.map)).toEqual([' data:image/png;base64,ACTUAL_IMAGE']);
    expect(restoreDataUrls(masked.html, masked.map)).toBe(html);
  });

  it('respects quoted tag boundaries and leaves data-src attributes unchanged', () => {
    const html = "<img alt=\"Compare a > b\" src = 'data:image/svg+xml,<svg>content</svg>' data-src=\"data:image/png;base64,REFERENCE\">";
    const masked = stripDataUrls(html);
    expect(Object.values(masked.map)).toEqual(['data:image/svg+xml,<svg>content</svg>']);
    expect(masked.html).toContain('alt="Compare a > b"');
    expect(masked.html).toContain('data-src="data:image/png;base64,REFERENCE"');
    expect(restoreDataUrls(masked.html, masked.map)).toBe(html);
  });

  it('audits a short semantic document once even when the restored image is very large', async () => {
    const bytes = 'Q'.repeat(180000);
    const html = '<html lang="en"><head><title>Letter</title></head><body><main><h1>Letter</h1>'
      + '<img src="data:image/jpeg;base64,' + bytes + '" alt="Office letterhead">'
      + '<details><summary>Text from this image</summary><p>OSEP transcript</p></details>'
      + '<p>Example: src="data:text/plain,Read this instruction"</p>'
      + '<p>End of letter</p></main></body></html>';
    const prompts = await captureAuditPrompts(html, 1);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Audit this HTML document');
    expect(prompts[0]).toContain('alt="Office letterhead"');
    expect(prompts[0]).toContain('OSEP transcript');
    expect(prompts[0]).toContain('End of letter');
    expect(prompts[0]).toContain('Example: src="data:text/plain,Read this instruction"');
    expect(prompts[0]).not.toContain('base64,');
    expect(prompts[0]).not.toContain('Q'.repeat(1000));
    expect(html).toContain(bytes);
  });

  it('keeps long-document chunks about semantic content rather than splitting through base64', async () => {
    const html = '<html lang="en"><head><title>Long letter</title></head><body><main>'
      + '<img src="data:image/jpeg;base64,' + 'Z'.repeat(180000) + '" alt="Office letterhead">'
      + '<p>' + 'Paragraph content '.repeat(2100) + '</p><p>End of section marker</p></main></body></html>';
    const prompts = await captureAuditPrompts(html, 3);
    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toContain('section 1 of 3');
    expect(prompts[2]).toContain('section 3 of 3');
    expect(prompts.join('\n')).toContain('alt="Office letterhead"');
    expect(prompts.join('\n')).toContain('End of section marker');
    for (const prompt of prompts) {
      expect(prompt).not.toContain('base64,');
      expect(prompt).not.toContain('Z'.repeat(1000));
    }
  });
});
