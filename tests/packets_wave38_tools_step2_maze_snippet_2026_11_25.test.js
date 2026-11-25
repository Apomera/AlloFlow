// Wave 38 Tests: Shared Step 2-3 Checkbox Touch Targets, Clean Reading Tools Active Pills,
// Compact Concept Sort Feedback Badges & Word-Boundary Maze Blank Context Snippets
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const MZ = require(path.join(ROOT, 'packet_maze_builder.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));

describe('Wave 38: Step 2-3 Touch Targets, Reading Tools Active Pill Polish, Concept Sort Badges & Maze Word-Boundary Snippets', () => {
  it('enforces 44px touch targets for shared .qr-check-opt and .choice-check across maker pages with zero raw hex before print', () => {
    const makeCss = fs.readFileSync(path.join(ROOT, 'packets-make.css'), 'utf8');
    expect(makeCss).toMatch(/\.qr-check-opt\s*\{[^}]*min-height:\s*2\.75rem/);
    expect(makeCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);

    const choiceCss = fs.readFileSync(path.join(ROOT, 'packets-choice.css'), 'utf8');
    expect(choiceCss).toMatch(/\.choice-check\s*\{[^}]*min-height:\s*2\.75rem/);
    expect(choiceCss.split('@media print')[0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('removes redundant double-outline on non-focused Reading Tools active pills while keeping forced-colors and math packet cap intact', async () => {
    const mpLesson = MP.lessonFromMathPractice({ loader: TH, title: 'Multiplication', mode: 'ccc', factSet: 'mul-6' });
    const mpBuilt = MP.buildMathPracticePacket({ loader: TH, lesson: mpLesson });
    expect(mpBuilt.html).toContain('.lt-panel [aria-pressed=true]:not(:focus-visible){outline:none}');
    expect(mpBuilt.html).toContain('@media (forced-colors:active){[data-tool-group=colors]{display:none!important}.lt-line,.lt-panel [aria-pressed=true]{outline:3px solid Highlight}');
    expect(Buffer.byteLength(mpBuilt.html, 'utf8')).toBeLessThan(176000);
    expect((await V.verifyPacket(mpBuilt.html)).result).toBe('closed');
  });

  it('sizes Concept Sort feedback badges cleanly to their text without full-width stretching', () => {
    expect(SW.EXTRA_CSS).toContain('.sw-badge{display:inline-block;align-self:flex-start;width:fit-content;');
    expect(SW.EXTRA_CSS).toContain('.cs-card>.sw-badge{margin-inline-start:0}');
  });

  it('snaps Step 2 Maze blank context snippets to whole-word boundaries instead of slicing words mid-letter', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-maze.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://packets.test/packets-maze.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    const d = w.document;
    w.AlloPacketMaze = MZ;
    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketVerify = V;
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-maze.js'), 'utf8'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));
    d.getElementById('next-1').click();

    const firstHead = d.querySelector('.maze-target-row .maze-target-head');
    expect(firstHead).toBeTruthy();
    const txt = firstHead.textContent.replace(/\s+/g, ' ').trim();
    expect(txt).not.toContain('Blank #1: y morning');
    expect(txt).toContain('[___]');
    expect(txt).toMatch(/^Blank #1: (\u2026 )?[A-Za-z]{2,}/);
    w.close();
  });
});
