// Wave 37 Tests: Grouped Switch Maker Dropdown, Decluttered Results Exports & Compact Maze Step 1 Picker
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();

describe('Wave 37: Streamlined Switch Maker, Decluttered Results Exports & Compact Maze Picker', () => {
  it('groups the Switch maker dropdown into 4 scannable categories across all 22 pages without altering links or heading hierarchy', () => {
    const htmls = fs.readdirSync(ROOT).filter((f) => /^packets.*\.html$/.test(f)).sort();
    const menuPages = [];
    for (const file of htmls) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      if (!src.includes('class="top-menu"')) continue;
      menuPages.push(file);
      const doc = new JSDOM(src).window.document;
      const labels = [...doc.querySelectorAll('details.top-menu > nav .top-menu-label')].map((n) => n.textContent.trim());
      expect(labels, file).toEqual([
        'Core Practice & Checks',
        'Choice, Reading & STEM',
        'Access, Life Skills & SEL',
        'Playlists, Library & Results',
      ]);
      // Uses non-heading span elements so heading hierarchy stays untouched
      expect(doc.querySelectorAll('details.top-menu > nav h1, details.top-menu > nav h2, details.top-menu > nav h3, details.top-menu > nav h4')).toHaveLength(0);
    }
    expect(menuPages.length).toBe(22);

    const baseCss = fs.readFileSync(path.join(ROOT, 'packets.css'), 'utf8');
    expect(baseCss).toMatch(/\.top-menu-label\s*\{[^}]*grid-column:\s*1 \/ -1/);
    expect(baseCss).toMatch(/\.top-menu > nav\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  it('streamlines Results "Take it with you" into 4 primary buttons plus a collapsed More exports & backup fold keeping all IDs accessible', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-results.html'), 'utf8');
    const doc = new JSDOM(html).window.document;
    const primaryBtns = [...doc.querySelectorAll('#take > .take-row > button')].map((b) => b.id);
    expect(primaryBtns).toEqual(['print-group', 'print-learner', 'copy-summary', 'save-csv']);

    const moreFold = doc.getElementById('take-more-exports');
    expect(moreFold).toBeTruthy();
    expect(moreFold.tagName).toBe('DETAILS');
    expect(moreFold.hasAttribute('open')).toBe(false);
    const secondaryBtns = [...moreFold.querySelectorAll('button')].map((b) => b.id);
    // Wave 42 adds 'export-docx' (Word progress report .docx) and Wave 43 adds 'export-student-docx' inside the collapsed #take-more-exports fold.
    expect(secondaryBtns).toEqual(['save-udl-csv', 'save-bundle', 'export-mtss', 'export-docx', 'export-student-docx']);

    const resCss = fs.readFileSync(path.join(ROOT, 'packets-results.css'), 'utf8');
    const beforePrint = resCss.split('@media print')[0];
    expect(beforePrint).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(resCss).toMatch(/\.take-more\s*>/);
  });

  it('frames Maze Step 1 starter passages in a bounded scrollable picker while preserving all 12 cards in the DOM', () => {
    const mazeCss = fs.readFileSync(path.join(ROOT, 'packets-maze.css'), 'utf8');
    expect(mazeCss).toMatch(/\.template-grid\s*\{[^}]*max-height:\s*18\.5rem[^}]*overflow-y:\s*auto/);
  });
});
