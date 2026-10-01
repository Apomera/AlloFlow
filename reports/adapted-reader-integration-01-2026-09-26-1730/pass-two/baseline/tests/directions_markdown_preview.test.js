import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const helper = host.slice(host.indexOf('function _alloParsePreviewMarkdown('), host.indexOf('function _alloBuildDirectionsResultAdapter('));
const binding = host.match(/const parseMarkdownToHTML = [^;]+;/)[0];
const parser = pipeline => new Function('_docPipeline', helper + '\n' + binding + '\nreturn parseMarkdownToHTML;')(pipeline);
const render = text => {
    const element = document.createElement('div');
    element.innerHTML = parser(null)(text);
    return element;
};

describe('directions Markdown before the document pipeline loads', () => {
    it('renders the reported due date and resource titles as bold text', () => {
        const result = render('**Due:** (your teacher will tell you)\n\n1. Read **Journey of a Raindrop** first.\n2. Open the **Glossary** and play the **Crossword** and the **Word Scramble**.');
        expect([...result.querySelectorAll('strong')].map(node => node.textContent)).toEqual(['Due:', 'Journey of a Raindrop', 'Glossary', 'Crossword', 'Word Scramble']);
        expect(result.textContent).not.toContain('**');
        expect(result.querySelectorAll('ol > li')).toHaveLength(2);
        expect(result.querySelector('p').textContent).toBe('Due: (your teacher will tell you)');
    });
    it('keeps the due date, introduction, individual steps, and closer in separate blocks', () => {
        const result = render([
            '**Due:** (your teacher will tell you)',
            '',
            'Water has been recycling itself on Earth for about four billion years. Tonight you become a water-cycle expert.',
            '',
            '1. Read **Journey of a Raindrop** first. Read it out loud if you can.',
            '2. Open the **Glossary** and play the **Crossword** and the **Word Scramble**.',
            '3. Keep **The Four Moves of Water** chart open while you work.',
            '',
            'You are ready to explain the water cycle!',
        ].join('\n'));
        expect([...result.children].map(node => node.tagName)).toEqual(['P', 'P', 'OL', 'P']);
        expect(result.children[0].textContent).toBe('Due: (your teacher will tell you)');
        expect(result.children[1].textContent).toContain('Water has been recycling');
        const steps = [...result.querySelectorAll('ol > li')];
        expect(steps).toHaveLength(3);
        expect(steps.map(node => node.textContent.split(' ')[0])).toEqual(['Read', 'Open', 'Keep']);
        expect(result.querySelector('ol').style.listStyleType).toBe('decimal');
        expect(result.lastElementChild.textContent).toBe('You are ready to explain the water cycle!');
    });

    it('preserves headings, paragraphs, bullet lists, and literal newline escapes', () => {
        const result = render('## Directions\\n\\nRead *carefully*.\\n- First\\n- Second\\n\\nDone.');
        expect(result.querySelector('h2').textContent).toBe('Directions');
        expect(result.querySelector('em').textContent).toBe('carefully');
        expect(result.querySelectorAll('ul > li')).toHaveLength(2);
        expect(result.lastChild.textContent).toBe('Done.');
    });
    it('keeps literal text safe while formatting emphasis', () => {
        const result = render('**2 < 3 & 4 > 1** <img src=x onerror=alert(1)>');
        expect(result.querySelector('strong').textContent).toBe('2 < 3 & 4 > 1');
        expect(result.querySelector('img')).toBeNull();
        expect(result.textContent).toContain('<img src=x onerror=alert(1)>');
    });
    it('preserves multiplication, code, and explicitly escaped stars', () => {
        const result = render('2 * 3 * 4; `**literal**`; \\*\\*also literal\\*\\*');
        expect(result.querySelector('em')).toBeNull();
        expect(result.querySelector('strong')).toBeNull();
        expect(result.querySelector('code').textContent).toBe('**literal**');
        expect(result.textContent).toContain('**also literal**');
    });
    it('keeps safe links and rejects executable schemes', () => {
        const result = render('[**Reading**](resource:abc123) [Unsafe](javascript:evil) [Website](https://example.com/?a=1&b=2)');
        const links = result.querySelectorAll('a');
        expect(links[0].getAttribute('href')).toBe('resource:abc123');
        expect(links[0].querySelector('strong').textContent).toBe('Reading');
        expect(links[1].getAttribute('href')).toBe('#');
        expect(links[2].getAttribute('href')).toBe('https://example.com/?a=1&b=2');
    });
    it('still uses the full document formatter once loaded and handles empty directions', () => {
        const fullParser = () => '<p>Full parser</p>';
        expect(parser({ parseMarkdownToHTML: fullParser })).toBe(fullParser);
        expect(parser(null)('')).toBe('');
        expect(parser(null)(null)).toBe('');
    });
    it('ships the fallback in both generated app sources', () => {
        for (const file of ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
            const source = readFileSync(file, 'utf8');
            expect(source).toContain(helper);
            expect(source).toContain(binding);
        }
    });
});
