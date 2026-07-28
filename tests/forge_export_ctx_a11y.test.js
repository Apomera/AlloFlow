// Forge's standalone EXPORT builds its own ctx (__makeCtx in the generated HTML).
// A tool that is accessible inside the app must not become keyboard-inert once
// exported, so the exported ctx has to match the host's on the accessibility
// helpers — not just have them present.
//
// This caught a real one: the generated a11yClick was
//   {onClick:hh, role:"button", tabIndex:0}
// with NO onKeyDown. role + tabIndex make a screen reader announce an operable
// control and let the element take focus, but only a NATIVE <button> converts
// Enter/Space into a click — a div or <g> does not. Every a11yClick control in an
// exported tool was announced and dead, and it passes a casual audit precisely
// because the ARIA is there.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FORGE = 'stem_lab/stem_tool_forge.js';

let generated;
beforeAll(() => {
  const src = readFileSync(FORGE, 'utf8');
  const line = src.split('\n').find((l) => l.includes('a11yClick:function(hh)'));
  if (!line) throw new Error('Forge no longer emits an a11yClick line — update this test');
  // The generator holds its output as single-quoted JS source lines.
  const inner = line.trim().replace(/^'/, '').replace(/',$/, '').replace(/,$/, '');
  generated = vm.runInNewContext('({' + inner + '})');
});

describe('Forge-exported ctx.a11yClick', () => {
  it('supplies the full control contract, onKeyDown included', () => {
    const props = generated.a11yClick(() => {});
    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
    expect(typeof props.onClick).toBe('function');
    // The one that was missing. Without it the other three are actively misleading.
    expect(typeof props.onKeyDown).toBe('function');
  });

  it('activates on Enter and Space and ignores other keys', () => {
    let fired = 0;
    let prevented = 0;
    const props = generated.a11yClick(() => { fired += 1; });
    const ev = (key) => ({ key, preventDefault: () => { prevented += 1; } });

    props.onKeyDown(ev('Enter'));
    expect(fired).toBe(1);
    props.onKeyDown(ev(' '));
    expect(fired).toBe(2);

    // Typing must not fire the control.
    props.onKeyDown(ev('a'));
    props.onKeyDown(ev('Tab'));
    props.onKeyDown(ev('Escape'));
    expect(fired).toBe(2);

    // Only the activating keys should have their default suppressed — swallowing
    // Tab here would trap focus, and swallowing Escape would break dialogs.
    expect(prevented).toBe(2);
  });

  it('still routes clicks to the same handler', () => {
    let clicks = 0;
    const props = generated.a11yClick(() => { clicks += 1; });
    props.onClick();
    expect(clicks).toBe(1);
  });

  it('matches the host implementation it stands in for', () => {
    // stem_lab_module.js is what the tool sees when running inside the app. If the
    // two drift, a tool behaves differently exported than it does in place.
    const host = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const hostLine = host.split('\n').find((l) => l.includes('a11yClick: function(handler)'));
    expect(hostLine, 'host a11yClick not found').toBeTruthy();

    const normalise = (s) => s.replace(/\s+/g, '').replace(/"/g, "'").replace(/hh|handler/g, 'H').replace(/\(e\)|\(ev\)/g, '(E)');
    const hostBody = normalise(hostLine.slice(hostLine.indexOf('a11yClick')));
    const genBody = normalise(
      readFileSync(FORGE, 'utf8').split('\n')
        .find((l) => l.includes('a11yClick:function(hh)'))
        .trim().replace(/^'/, '').replace(/',$/, '')
    );

    // Same set of keys, same activation keys.
    ['role:\'button\'', 'tabIndex:0', 'onKeyDown', 'preventDefault', 'Enter'].forEach((frag) => {
      expect(hostBody, 'host missing ' + frag).toContain(frag);
      expect(genBody, 'forge export missing ' + frag).toContain(frag);
    });
  });
});
