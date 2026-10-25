import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// sanitizeHtml (AlloFlowANTI.txt) feeds dangerouslySetInnerHTML in Directions, Math and the
// visual panel. It was regex-only and let through <svg/onload=...> (no space before "on"),
// href=" javascript:..." (a space after the quote) and entity-encoded schemes. With a DOM it now
// parses the HTML inertly and strips by element and attribute; the regex stays as the fallback.
const ANTI = readFileSync(resolve(process.cwd(), process.env.SANITIZE_ANTI || 'AlloFlowANTI.txt'), 'utf8');
const BLOCK = sliceBetween(ANTI, '// __ALLO_SANITIZE_HTML_BEGIN__', '// __ALLO_SANITIZE_HTML_END__', { file: 'AlloFlowANTI.txt' });
// eslint-disable-next-line no-new-func
const make = (domParser) => new Function('DOMParser', BLOCK + '\nreturn sanitizeHtml;')(domParser);
const sanitizeHtml = make(globalThis.DOMParser);

// Render the output the way the app does (innerHTML) and report anything that could run.
function executable(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const found = [];
  host.querySelectorAll('*').forEach((el) => {
    if (/^(script|iframe|object|embed|form|base|meta|link|frame)$/i.test(el.tagName)) found.push('<' + el.tagName.toLowerCase() + '>');
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/[\x00-\x20]+/g, '').toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') found.push(name);
      else if (/href|src|action|data/.test(name) && /^(javascript|vbscript):/.test(value)) found.push(name + '=' + value.slice(0, 20));
      else if (/href|action/.test(name) && value.startsWith('data:')) found.push(name + '=' + value.slice(0, 20));
    }
  });
  return found;
}

const ATTACKS = [
  '<svg/onload=alert(1)>',
  '<img src=x onerror=alert(1)>',
  '<a href=" javascript:alert(1)">x</a>',
  '<a href="jav&#x61;script:alert(1)">x</a>',
  '<a href="java\tscript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
  '<math><a xlink:href="javascript:alert(1)">x</a></math>',
  '<svg><a xlink:href="javascript:alert(1)"><text y="20">x</text></a></svg>',
  '<form><button formaction="javascript:alert(1)">go</button></form>',
  '<button formaction="javascript:alert(1)">go</button>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<div><scr<script>ipt>alert(1)</script></div>',
  '<details open ontoggle=alert(1)>x</details>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
  '<base href="javascript:alert(1)//">',
];

describe('sanitizeHtml blocks script that the regex version missed', () => {
  for (const attack of ATTACKS) {
    it(attack.slice(0, 60), () => {
      expect(executable(sanitizeHtml(attack)), 'still executable after sanitizing').toEqual([]);
    });
  }
});

describe('sanitizeHtml keeps ordinary content', () => {
  const keep = [
    '<p><strong>Due:</strong> Friday</p>',
    '<ul><li>One</li><li><em>Two</em></li></ul>',
    '<a href="https://example.org/page" target="_blank" rel="noopener">link</a>',
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="chart">',
    '<table><tbody><tr><td>3</td><td>4</td></tr></tbody></table>',
    '<span style="color:#b91c1c">red</span>',
    '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg>',
  ];
  for (const html of keep) {
    it(html.slice(0, 50), () => {
      expect(sanitizeHtml(html)).toBe(html);
    });
  }
  it('keeps a <style> block and the text around a removed handler', () => {
    expect(sanitizeHtml('<style>.x{color:red}</style><p class="x">Hi</p>')).toBe('<style>.x{color:red}</style><p class="x">Hi</p>');
    expect(sanitizeHtml('<p onclick="steal()">Read me</p>')).toBe('<p>Read me</p>');
  });
  it('returns "" for empty or non-string input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(42)).toBe('');
  });
});

describe('without a working DOM it fails closed to literal text', () => {
  const fallback = make(undefined);
  it('does not guess at HTML parsing with regular expressions', () => {
    const value = '<p onclick="x()">a</p><script>alert(1)</script>';
    expect(fallback(value)).toContain('&lt;p');
    expect(executable(fallback(value))).toEqual([]);
    const host = document.createElement('div'); host.innerHTML = fallback(value);
    expect(host.textContent).toBe(value);
    expect(host.querySelectorAll('*')).toHaveLength(0);
  });
});
