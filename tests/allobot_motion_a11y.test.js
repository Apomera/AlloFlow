import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('allobot_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('allobot_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/allobot_module.js', 'utf8');

describe('AlloBot reduced-motion accessibility', () => {
  it('honors both the operating-system preference and the app motion setting', () => {
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('const motionDisabled = useAlloMotionDisabled(disableAnimations);');
    expect(source).toContain('allobot-motion-disabled');
    expect(source).toContain('pauseAnimations');
  });

  it('provides local reduced-motion fallbacks for utility animations', () => {
    expect(source.match(/(?<![\w-])animate-pulse(?![\w-])/g)).toHaveLength(11);
    expect(source.match(/animate-pulse motion-reduce:animate-none/g)).toHaveLength(11);
    expect(source.match(/(?<![\w-])animate-bounce(?![\w-])/g)).toHaveLength(1);
    expect(source.match(/animate-bounce motion-reduce:animate-none/g)).toHaveLength(1);
  });

  it('provides local reduced-motion fallbacks for broad transitions', () => {
    expect(source.match(/(?<![\w-])transition-all(?![\w-])/g)).toHaveLength(7);
    expect(source.match(/transition-all motion-reduce:transition-none/g)).toHaveLength(7);
    expect(source.match(/(?<![\w-])transition-transform(?![\w-])/g)).toHaveLength(2);
    expect(source.match(/transition-transform motion-reduce:transition-none/g)).toHaveLength(2);
  });

  it('uses explicit non-submit types for every native button', () => {
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toContain('type="button"');
  });

  it('keeps generated copies synchronized with the accessible source', () => {
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('motion-reduce:transition-none');
    expect(publicModule).toBe(moduleSource);
  });
});
