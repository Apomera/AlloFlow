import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Gemini Canvas draws its own "Ask Gemini" pill over the bottom-right corner of
// the app (about 142 x 62 px, 22 px from the edge, measured from a screenshot).
// It hid the Reading tools button and sat on the AI Guide chat box. One CSS
// variable, set only when _isCanvasEnv is true, lifts everything pinned to that
// corner. Outside Canvas the variable is unset and every position is unchanged.
// A real-browser check (Chromium, 2000/1536/1280/390 px wide) found no overlap
// with the variable set and an overlap at every width without it.
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const VAR = 'var(--alloflow-host-corner-clear, 0px)';
const anti = read('AlloFlowANTI.txt');

describe('Canvas bottom-right corner clearance', () => {
  it('sets the variable only inside Canvas', () => {
    expect(anti).toContain("if (_isCanvasEnv && document.documentElement) document.documentElement.style.setProperty('--alloflow-host-corner-clear', '6rem');");
    // A bare setProperty outside the Canvas guard would move the controls everywhere.
    const uses = anti.match(/setProperty\('--alloflow-host-corner-clear'/g) || [];
    expect(uses.length).toBe(1);
  });

  it('lifts the Reading tools stack (desktop, phone and the phone bottom sheet)', () => {
    for (const file of ['view_fab_stack_source.jsx', 'view_fab_stack_module.js', 'desktop/web-app/public/view_fab_stack_module.js', 'desktop/app-build/view_fab_stack_module.js', 'desktop/web-app/build/view_fab_stack_module.js']) {
      const text = read(file);
      expect(text.split(VAR).length - 1, file).toBe(3);
      expect(text, file).toContain(`max(calc(32px + env(safe-area-inset-bottom, 0px)), var(--alloflow-fab-footer-clearance, 0px), ${VAR})`);
      expect(text, file).toContain(`max(calc(14px + env(safe-area-inset-bottom, 0px)), var(--alloflow-fab-footer-clearance, 0px), ${VAR})`);
      expect(text, file).toContain(`padding-bottom: max(env(safe-area-inset-bottom, 0px), ${VAR});`);
    }
  });

  it('lifts the Dynamic Assessment return pill and the PDF remediation shortcut', () => {
    expect(anti).toContain(`style={{ bottom: 'calc(1rem + ${VAR})' }}`);
    expect(anti).not.toContain('className="fixed bottom-4 right-4 z-[1000] bg-violet-600');
    expect(anti).toContain('${(generatedContent && generatedContent.fromDA && !isDynamicAssessmentOpen) ? \'5rem\' : \'1rem\'} + ' + VAR);
    expect(anti).not.toMatch(/fixed \$\{\(generatedContent && generatedContent\.fromDA && !isDynamicAssessmentOpen\) \? 'bottom-20' : 'bottom-4'\}/);
  });

  it('lifts the AI Guide chat box, collapsed and open', () => {
    for (const file of ['view_misc_modals_source.jsx', 'view_misc_modals_module.js', 'desktop/web-app/public/view_misc_modals_module.js', 'desktop/app-build/view_misc_modals_module.js', 'desktop/web-app/build/view_misc_modals_module.js']) {
      const text = read(file);
      expect(text.split(VAR).length - 1, file).toBe(2);
      // The old fixed offset must not creep back in beside the style.
      expect(text, file).not.toMatch(/allo-docsuite fixed z-\[100\] bottom-4 right-4/);
      expect(text, file).not.toContain("'top-24 right-4 bottom-4 w-96'");
    }
  });

  it('keeps the Live Dashboard launcher riding above the stack, wherever the stack ends', () => {
    expect(anti).toContain("bottom:'var(--alloflow-fab-stack-clear, 5.5rem)',visibility:isFabExpanded ? 'hidden' : 'visible'");
  });
});
