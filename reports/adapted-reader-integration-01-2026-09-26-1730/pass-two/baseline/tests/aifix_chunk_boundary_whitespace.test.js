import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessSource = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path',
  harnessSource.slice(harnessSource.indexOf('const SRC ='), harnessSource.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const first = '<!DOCTYPE html><html lang="en"><head><style>p{color:#777777}</style></head><body>'
  + '<a class="skip-link" href="#main-content">Skip to main content</a><main id="main-content">'
  + '<p>' + 'Preserve the original source instructions and observations. '.repeat(10) + '</p>';
const last = '<p>[3] Read the original source guidance and retain this footnote.</p>'
  + '<a href="https://school.example/original">Original guidance</a></main></body></html>';
const improve = html => html.replace('color:#777777', 'color:#333333');

describe('chunk reassembly preserves source boundary whitespace', () => {
  it.each(['\n', ' ', '\r\n\t'])('accepts a harmless repair while preserving a %j boundary', async separator => {
    const input = first + separator + last;
    const h = make(improve, first.length);
    expect(h.splitHtmlOnTagBoundary(input, first.length)).toEqual([first, separator + last]);
    expect(await h.run(input)).toBe(improve(input));
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
    expect(h.evidence[0].shippedOriginalChunks).toBe(1);
  });

  it('returns echoed chunks byte-identically without reporting rejected or changed work', async () => {
    const input = first + '\n' + last;
    const h = make(html => '\n' + html + '\n', first.length);
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0]).toMatchObject({ totalChunks: 2, shippedOriginalChunks: 2, candidateRejectionCount: 0 });
  });

  it('still rejects a real destination change after restoring the boundary', async () => {
    const input = first + '\n' + last;
    const h = make(html => improve(html).replace('school.example/original', 'school.example/altered'), first.length);
    const result = await h.run(input);
    expect(result).toContain('href="https://school.example/original"');
    expect(result).not.toContain('school.example/altered');
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'link-destination-changed' }));
  });

  it('preserves boundaries when a truncated large chunk is retried as halves', async () => {
    const left = first.replace('</p>', 'Original source facts and instructions. '.repeat(90) + '</p>');
    const tail = '\n<p></p></main>';
    const part = left + '\n<p>' + 'B'.repeat(left.length - tail.length) + '</p></main>';
    const input = part + '<footer>Keep the original footer instructions.</footer></body></html>';
    const h = make((html, prompt) => {
      if (html.includes('<!DOCTYPE') && prompt.startsWith('Fix these WCAG violations in the HTML fragment below.')) return '<p>Short response.</p>';
      return improve(html);
    }, part.length);
    expect(h.splitHtmlOnTagBoundary(part, part.length / 2)).toEqual([left, part.slice(left.length)]);
    const result = await h.run(input);
    expect(h.calls.some(prompt => prompt.startsWith('Fix these WCAG violations in the HTML fragment.'))).toBe(true);
    expect(result).toBe(improve(input));
    expect(h.evidence[0].candidateRejections.some(item => item.phase === 'half-assembly' || item.phase === 'assembly')).toBe(false);
  });
});
