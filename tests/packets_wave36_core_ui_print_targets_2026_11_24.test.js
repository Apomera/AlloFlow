// Wave 36 Tests: Symbol Runner Unbroken Words on Mobile, Read-Along Full-Width Card & Print Sheet,
// Vocabulary & Maze Clean Print Backups, Math Practice Byte Budget, and Teacher Form Touch Targets
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const SR = require(path.join(ROOT, 'packet_symbol_runner_builder.js'));
const RA = require(path.join(ROOT, 'packet_read_along_builder.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const MZ = require(path.join(ROOT, 'packet_maze_builder.js'));

describe('Wave 36: Core Activity Mobile Typography, Print Backups & Teacher Touch Targets', () => {
  it('keeps Symbol Runner multi-letter words whole without mid-word breaks while preserving clamp() sizing', async () => {
    const built = SR.buildSymbolRunnerPacket({
      loader: TH,
      title: 'High-Frequency Words Sprint',
      symbolMode: 'custom',
      packetMode: 'practice',
      items: 'thought\ndifferent\ntogether\nbecause',
    });
    expect((await V.verifyPacket(built.html)).result).toBe('closed');

    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://alloflow.local/sr.html',
      beforeParse(w) {
        Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      },
    });
    const d = dom.window.document;
    const inp = d.getElementById('learner-name');
    if (inp) { inp.value = 'Sam'; inp.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }
    const startBtn = [...d.querySelectorAll('#app button')].find((b) => /start/i.test(b.textContent || ''));
    startBtn.click();
    const sym = d.querySelector('[data-sr-symbol]');
    expect(sym).toBeTruthy();
    const st = sym.getAttribute('style') || '';
    expect(st).toContain('clamp(');
    expect(st).toContain('white-space:nowrap');
    expect(st).not.toContain('overflow-wrap:anywhere');
    dom.window.close();
  });

  it('aligns Read-Along passage full-width, hides digital controls in print across Read-Along/Vocab/Maze, and stays under the 176 KB math packet cap', async () => {
    const raMade = RA.lessonFromReadAlong({
      loader: TH,
      title: 'River Otters',
      sentences: RA.splitPassage('River otters stay active in winter. Their thick fur keeps them warm.'),
    });
    const raBuilt = RA.buildReadAlongPacket({ loader: TH, made: raMade, clips: {} });
    expect((await V.verifyPacket(raBuilt.html)).result).toBe('closed');
    expect(raBuilt.html).not.toContain('[data-read-along-text]{max-width:46rem');
    expect(raBuilt.html).toContain('[data-read-aloud],[data-hear-all]');
    expect(raBuilt.html).toContain('[data-read-along-tools-bar]');
    expect(raBuilt.html).toContain('[data-read-along-done]');

    const mpLesson = MP.lessonFromMathPractice({ loader: TH, title: 'Multiplication', mode: 'ccc', factSet: 'mul-6' });
    const mpBuilt = MP.buildMathPracticePacket({ loader: TH, lesson: mpLesson });
    expect(Buffer.byteLength(mpBuilt.html, 'utf8')).toBeLessThan(176000);
    expect((await V.verifyPacket(mpBuilt.html)).result).toBe('closed');

    const mzPrint = MZ.EXTRA_CSS.slice(MZ.EXTRA_CSS.indexOf('@media print'));
    expect(mzPrint).toContain('.mz-hint,.progress{display:none!important}');
    expect(mzPrint).toContain('.card{border:0;box-shadow:none;padding:0}');
  });

  it('enforces 44px touch targets on QR public-key input and Read-Along/Math preset fields, plus Maze checkbox spacing', () => {
    const qrCss = fs.readFileSync(path.join(ROOT, 'packets-qr.css'), 'utf8');
    expect(qrCss).toMatch(/\.qr-pub-row input\[type="text"\][\s\S]*?min-height:\s*2\.75rem/);

    const raCss = fs.readFileSync(path.join(ROOT, 'packets-read-along.css'), 'utf8');
    expect(raCss).toMatch(/\.ra-preset-row select,\s*\.ra-preset-row input\[type="text"\]\s*\{[^}]*min-height:\s*2\.75rem/);

    const makeCss = fs.readFileSync(path.join(ROOT, 'packets-make.css'), 'utf8');
    expect(makeCss).toMatch(/\.starter-row select,\s*\.starter-row input\[type="text"\]\s*\{[^}]*min-height:\s*2\.75rem/);

    const mazeCss = fs.readFileSync(path.join(ROOT, 'packets-maze.css'), 'utf8');
    expect(mazeCss).toMatch(/\.check-opts \.field-row \+ \.field,\s*\.check-opts \.field \+ \.field\s*\{[^}]*margin-top:\s*0\.75rem/);
  });
});
