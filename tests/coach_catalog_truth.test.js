// D7: the coach's AI catalogs must match what the code really has.
// Facts are derived from the real sources (the repo files), and the
// prompts come from the real onboarding_helpers_module.js with callGemini stubbed.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = process.cwd().replace(/\\/g, '/');
const read = (rel) => readFileSync(`${ROOT}/${rel}`, 'utf8').replace(/\r\n/g, '\n');

function load() {
  delete window.AlloOnboarding;
  new Function(read('onboarding_helpers_module.js'))();
  return window.AlloOnboarding;
}
let answerText = 'ok';
async function ask(layout) {
  const ao = load();
  ao.recordCoachConsent();
  let prompt = '';
  window.callGemini = vi.fn((p) => { prompt = p; return Promise.resolve(JSON.stringify({ answer: answerText, actions: [], blocked: false, blockedReason: null })); });
  const res = await ao.askCoach({ question: 'What can I do here?', layout });
  return { prompt, res };
}
const section = (prompt, heading) => {
  const at = prompt.indexOf(heading);
  if (at < 0) return '';
  const next = prompt.indexOf('\n## ', at + heading.length);
  const end = prompt.indexOf('=== END CATALOG', at);
  return prompt.slice(at, Math.min(next < 0 ? Infinity : next, end < 0 ? Infinity : end));
};

let facts;
beforeAll(() => {
  // 1. Command palette shortcut: evaluate the real key test from allo_commands_source.jsx.
  const cmd = read('allo_commands_source.jsx');
  const keyLine = cmd.split('\n').find((l) => l.includes("k === 'k'") && l.includes('ctrlKey'));
  const cond = keyLine.slice(keyLine.indexOf('if (') + 4, keyLine.lastIndexOf(') {'));
  const opens = (e) => new Function('e', 'k', 'return (' + cond + ');')({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...e }, e.key);
  const paletteZ = Number(/AlloCommandPalette[\s\S]*?className="fixed inset-0 z-\[(\d+)\]/.exec(cmd)[1]);
  const lp = read('view_launch_pad_source.jsx');
  const launchPadZ = Number(/position: 'fixed', inset: 0, zIndex: (\d+)/.exec(lp)[1]);
  // 2. Help menu: the real labels and audience from view_header_source.jsx.
  const hdr = read('view_header_source.jsx');
  const menu = hdr.slice(hdr.indexOf('const helpMenu = (showHelpMenu'), hdr.indexOf(') : null;', hdr.indexOf('const helpMenu = (showHelpMenu')));
  const label = (key) => new RegExp("homeToolsText\\('" + key.replace('.', '\\.') + "', '([^']+)'\\)").exec(menu)[1];
  const helpAudience = /const helpMenuAvailable = (.+);/.exec(hdr)[1].trim();
  // 3. Launch Pad extras.
  const lpCopy = (key) => new RegExp("copy\\('" + key.replace('.', '\\.') + "', '([^']+)'\\)").exec(lp)[1];
  // 4. AI Guide panel title.
  const misc = read('view_misc_modals_source.jsx');
  const aiGuide = /tx\('chat_guide\.header', '([^']+)'\)/.exec(misc)[1];
  // 5. The coach's open_link chip handler.
  const coach = read('onboarding_coach_source.jsx');
  const linkAt = coach.indexOf("if (chip.kind === 'open_link') {");
  const linkBody = coach.slice(linkAt + "if (chip.kind === 'open_link') {".length, coach.indexOf('return;', linkAt)).replace(/\/\/[^\n]*/g, '');
  facts = {
    shortcuts: { ctrlK: opens({ ctrlKey: true, key: 'k' }), cmdK: opens({ metaKey: true, key: 'k' }), ctrlShiftP: opens({ ctrlKey: true, shiftKey: true, key: 'p' }), plainK: opens({ key: 'k' }) },
    paletteHiddenOnLaunchPad: paletteZ < launchPadZ,
    help: [label('help_menu.explain'), label('toolbar.tour_take'), label('help_menu.tips')],
    helpAudience,
    extras: [lpCopy('launch_pad.voice_device_title'), lpCopy('launch_pad.report_problem'), 'AI Backend Settings'],
    aiGuide,
    openLinkCalls: linkBody.match(/\b[A-Za-z_]\w*\(/g),
  };
});
beforeEach(() => { localStorage.clear(); delete window.__alloAiUsable; answerText = 'ok'; });

describe.each([['roles'], [undefined]])('catalog for layout %s matches the code', (layout) => {
  it('names the real palette shortcut and Help menu, inside the workspace, and drops the false denials', async () => {
    expect(facts.shortcuts).toEqual({ ctrlK: true, cmdK: true, ctrlShiftP: true, plainK: false });
    expect(facts.help).toEqual(['What does this do?', 'Take the app tour', 'Past tips and messages']);
    expect(facts.helpAudience).toBe('!!isTeacherMode');
    expect(facts.aiGuide).toBe('AI Guide & Assistant');
    expect(facts.openLinkCalls).toEqual(['setIsOpen(']);
    const { prompt } = await ask(layout);
    expect(prompt).not.toMatch(/No keyboard shortcuts/i);
    expect(prompt).not.toMatch(/"Help menu" dropdown/);
    expect(prompt).not.toMatch(/"AI assistant button"/);
    expect(prompt).not.toMatch(/No mobile app — web only/);
    expect(prompt).not.toMatch(/there is no menu/i);
    const inside = section(prompt, '## Only inside the workspace');
    expect(inside, 'workspace-only section').not.toBe('');
    // The palette opens BEHIND the Launch Pad, so it must be listed as workspace-only.
    expect(facts.paletteHiddenOnLaunchPad).toBe(true);
    for (const s of ['Ctrl+K', 'Cmd+K', 'Ctrl+Shift+P', 'Help menu', facts.aiGuide, ...facts.help]) expect(inside, s).toContain(s);
    const denials = section(prompt, '## What AlloFlow DOES NOT have');
    for (const s of ['Ctrl+K', 'Help menu', 'AI assistant', facts.aiGuide]) expect(denials, s).not.toContain(s);
    const here = section(prompt, '## Also on this screen');
    for (const s of facts.extras) expect(here, s).toContain(s);
    // The open_link chip only closes the panel; the catalog must not promise it opens settings.
    expect(prompt).toMatch(/open_link[^\n]*closes this panel/);
    expect(prompt).toMatch(/only inside the workspace, say so/i);
  });
});

describe('validator', () => {
  const real = [
    'Inside the workspace, press Ctrl+K to open the command palette.',
    'On a Mac it is Cmd+K.',
    'After you pick Teacher, the ? button opens the Help menu.',
    'In the workspace you can set up a sign up sheet for families.',
    'Download Whisper on this screen, then pick a door to enter the app.',
    'You can download the AlloFlow Desktop app for Windows from the AlloFlow website.',
  ];
  const fake = [
    'Open SuperTutor from the sidebar.', 'Download our mobile app.', 'Get the iPhone app from the App Store.',
    'Sign up for an account first.', 'Paste your API key here.', 'Switch to Beginner mode.', 'Type the /help command.',
  ];
  it('keeps answers about features that exist, and still replaces invented ones', async () => {
    for (const a of real) { answerText = a; const { res } = await ask('roles'); expect(res.meta.validatorReplaced, a).not.toBe(true); expect(res.answer, a).toBe(a); }
    for (const a of fake) { answerText = a; const { res } = await ask('roles'); expect(res.meta.validatorReplaced, a).toBe(true); }
  });
});
