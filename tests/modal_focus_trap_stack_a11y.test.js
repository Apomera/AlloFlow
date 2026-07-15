import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const hookStart = anti.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
const hookEnd = anti.indexOf('window.__alloHooks = { useFocusTrap };', hookStart);
const hook = anti.slice(hookStart, hookEnd);

describe('shared modal focus trap accessibility contract', () => {
  it('keeps only the topmost nested dialog active', () => {
    expect(hook).toContain('window.__alloFocusTrapStack');
    expect(hook).toContain('const isTopTrap = () =>');
    expect(hook).toContain('if (!isTopTrap()) return;');
    expect(hook).toContain('trapStack.splice(trapIndex, 1)');
  });

  it('excludes unavailable controls from the Tab order', () => {
    expect(hook).toContain('button:not([disabled])');
    expect(hook).toContain('input:not([disabled])');
    expect(hook).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(hook).toContain("style.visibility !== 'hidden'");
  });

  it('recovers escaped focus and contains empty dialogs', () => {
    expect(hook).toContain('if (!root.contains(document.activeElement))');
    expect(hook).toContain('(e.shiftKey ? lastElement : firstElement).focus()');
    expect(hook).toContain('try { root.focus(); }');
  });

  it('uses the latest Escape callback and restores only a connected trigger', () => {
    expect(hook).toContain('onEscapeRef.current = onEscape');
    expect(hook).toContain('onEscapeRef.current()');
    expect(hook).toContain('previouslyFocused.isConnected');
    expect(hook).toContain('previouslyFocused !== document.body');
  });
});
