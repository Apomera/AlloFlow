import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A paused animation used to keep its requestAnimationFrame loop running at the
 * display's full rate and throw every frame away. Measured on 2026-09-21: the
 * generative and spin-art loops each asked for ~60 frames a second for as long
 * as the tab stayed open, whether the student had pressed pause or the browser
 * reported prefers-reduced-motion. Nothing moved on screen — the reduced-motion
 * requirement was already met — but a laptop or tablet paid for it in wake-ups.
 *
 * Both now stop when there is nothing to draw and restart from the render path,
 * the same shape the watercolour tick already used. Verified in a browser:
 * 0 frames per 1.5s while paused, ~90 while playing, and pressing resume brings
 * the loop back.
 *
 * sculpt3d is deliberately NOT in scope: it is a WebGL render loop that must
 * keep drawing for orbit and selection to work, and auto-rotation is a flag
 * inside it rather than the reason it runs.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');

describe('Art Studio paused loops idle', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  it('the generative loop stops while paused and can be restarted', () => {
    // Runtime timing, cancellation, and restore coverage lives in generative_playback.
    expect(source).toContain("!disposed && canvas.isConnected && !document.hidden && !isRestoring && canvas.getAttribute('data-paused') !== '1'");
    expect(source).toContain('canvas._genResume = resume;');
    expect(source).toContain('if (canvas._genSyncPlayback) canvas._genSyncPlayback();');
  });

  it('the spin loop stops while paused, hidden, or empty', () => {
    // Runtime coverage, including frame counts, lives in artstudio_spin_engine.
    expect(source).toContain("!restoring && !document.hidden && canvas.dataset.paused!=='1' && (drips.length>0 || canvas._spinPointerDown)");
    expect(source).toContain('canvas._spinResume=resume;');
  });

  it('neither loop re-arms unconditionally any more', () => {
    // The exact shapes that used to spin forever.
    expect(source).not.toContain("if (!isRestoring && canvas.getAttribute('data-paused') !== '1') stepSimulation();\n                    if (canvas.isConnected) canvas._genAnim = requestAnimationFrame(animate);");
    expect(source).not.toMatch(/if \(!spinRestoring && spinCheckpointPending && !canvas\._spinPointerDown\) persistSpinArtwork\(\);\s*\n\s*\n\s*if \(canvas\.isConnected\) canvas\._spinAnim = requestAnimationFrame\(animate\);/);
  });
});
