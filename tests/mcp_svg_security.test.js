import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';
const require = createRequire(import.meta.url);
const native = require('../agent_core_pack_native_module.js');
const service = require('../agent_core_resource_pack_module.js');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const block = sliceBetween(host, '// __ALLO_SANITIZE_HTML_BEGIN__', '// __ALLO_SANITIZE_HTML_END__', { file: 'AlloFlowANTI.txt' });
const browserPolicy = new Function('DOMParser', block + '\nreturn { sanitizeHtml, sanitizeSvgGraph };')(globalThis.DOMParser);
const safe = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" role="img" aria-label="A labelled triangle"><title>Triangle</title><defs><linearGradient id="shade"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#ddd"/></linearGradient></defs><path d="M10 70 L50 10 L90 70 Z" fill="url(#shade)" stroke="black"/><text x="10" y="79" font-size="8">3 &lt; 4</text></svg>';
const malicious = [
  '<svg><a id="audit-link" xlink:href="#safe"><animate attributeName="xlink:href" values="javascript:window.__auditExecuted=true"/><text x="5" y="20">Marker</text></a></svg>',
  '<svg><set attributeName="href" to="javascript:window.__auditExecuted=true"/></svg>',
  '<svg><animateTransform attributeName="transform" type="rotate"/></svg>',
  '<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">foreign content</div></foreignObject></svg>',
  '<svg><image href="https://example.invalid/audit.png"/></svg>',
  '<svg><use href="https://example.invalid/audit.svg#part"/></svg>',
  '<svg><path fill="url(https://example.invalid/audit.svg#paint)"/></svg>',
  '<svg><path fill="u&#114;l(https://example.invalid/audit.svg#paint)"/></svg>',
  '<svg><style>@import "https://example.invalid/audit.css";</style></svg>',
  '<svg><path style="fill:u\\72l(https://example.invalid/audit.svg#paint)"/></svg>',
  '<svg xmlns="http://www.w3.org/1999/xhtml"><script>window.__auditExecuted=true</script></svg>',
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///audit">]><svg><text>&x;</text></svg>',
  '<svg><?xml-stylesheet href="https://example.invalid/audit.css"?></svg>',
  '<svg onload="window.__auditExecuted=true"/>',
  '<svg><circle cx="1" cx="2"/></svg>',
  '<svg><circle cx=1/></svg>',
  '<svg></svg><img src="https://example.invalid/audit.png">',
  '<svg><g></svg>',
  '<svg><g>' + '<g>'.repeat(40) + '</g>'.repeat(40) + '</g></svg>',
  '<svg>' + '<circle/>'.repeat(2048) + '</svg>',
  '<svg><text>' + 'x'.repeat(120000) + '</text></svg>',
];
function pack(graph, nativeShape) {
  return { allopack: { spec: '0.1', title: 'Diagram boundary', language: 'English', gradeLevel: '6', createdAt: '2026-10-23' }, sourceTopic: 'Triangle comparison', history: [{ id: 'math-one', type: 'math', title: 'Compare triangles', meta: '', data: nativeShape ? { problem: '2 + 2', answer: '4', steps: [], graphData: graph } : { problems: [1,2,3].map(i => ({ question: `${i} + 2`, answer: String(i+2), steps: [] })), graphData: graph } }] };
}
describe('MCP and app static SVG boundary', () => {
  it('preserves static accessible shapes, gradients and text exactly', () => {
    expect(native.validateStaticSvg(safe)).toBe(true);
    expect(browserPolicy.sanitizeSvgGraph(safe)).toBe(safe);
    const holder = document.createElement('div'); holder.innerHTML = browserPolicy.sanitizeHtml(safe);
    expect(holder.querySelector('svg path')).not.toBeNull();
    expect(holder.textContent).toContain('3 < 4');
    for (const profile of ['native', 'text', 'illustrated']) expect(service.validatePack(pack(safe, profile === 'native'), { profile }).ok).toBe(true);
  });
  it.each(malicious.map((svg, i) => [i + 1, svg]))('rejects unsupported or active SVG case %s', (_index, svg) => {
    expect(native.validateStaticSvg(svg)).toBe(false);
    expect(browserPolicy.sanitizeSvgGraph(svg)).toBe('');
    const result = service.validatePack(pack(svg, true), { profile: 'native' });
    expect(result.ok).toBe(false);
    if (svg.length <= 120000) expect(result.errors.some(error => error.code === 'unsafe-math-graph')).toBe(true);
  });
  it('covers legacy and nested problem graphs in every profile', () => {
    for (const profile of ['native', 'text', 'illustrated']) {
      const candidate = pack(malicious[0], false);
      expect(service.validatePack(candidate, { profile }).ok).toBe(false);
      candidate.history[0].data.graphData = safe;
      candidate.history[0].data.problems[1].graphData = malicious[4];
      expect(service.validatePack(candidate, { profile }).errors.some(error => error.path.endsWith('.problems[1].graphData'))).toBe(true);
    }
  });
  it('also removes SVG execution and network surfaces from rich-HTML rendering', () => {
    for (const svg of malicious.slice(0, 17)) {
      const holder = document.createElement('div'); holder.innerHTML = browserPolicy.sanitizeHtml(svg);
      expect(holder.querySelector('svg animate,svg set,svg foreignObject,svg image,svg use,svg style,svg [style],svg a')).toBeNull();
      for (const attr of holder.querySelectorAll('svg *')) expect(attr.outerHTML).not.toContain('example.invalid');
    }
  });
  it('keeps the embedded browser policy byte-identical to the MCP policy', () => {
    const begin = '// __ALLO_STATIC_SVG_POLICY_BEGIN__', end = '// __ALLO_STATIC_SVG_POLICY_END__';
    const extract = source => source.slice(source.indexOf(begin), source.indexOf(end)).replace(/\r\n/g, '\n');
    const expected = extract(readFileSync('agent_core_pack_native_module.js', 'utf8'));
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) expect(extract(readFileSync(file,'utf8'))).toBe(expected);
  });
});
