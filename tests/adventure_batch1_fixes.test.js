// Adventure fixes (2026-09-28 audit, batch 1).
//
// - A live student with class voting off saw active choice buttons (and, with
//   written responses, an active Send) that only showed a toast. The choices
//   are disabled with a status saying why, and the written-response box is
//   replaced by the same honest notice the immersive layout already had.
// - "Start over" and "Open new adventure setup" were offered to live students;
//   their restart is overwritten by the teacher's next broadcast.
// - The Storybook lock compared state.xp, which restarts at every level-up,
//   with a setting described as XP earned in the adventure; and two other
//   Storybook buttons (Story summary, Mission Report card) had no lock at all.
// - The Mission Report card's "New Game" set a flag the finished story never
//   reads, so it only closed the card. It now opens the confirmed restart.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let root, host;
const t = (key, params) => (key === 'adventure.storybook_locked' ? 'locked:' + params.needed : key === 'adventure.storybook' ? 'Storybook' : undefined);

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloHooks = { useFocusTrap: () => {} };
  new Function(readFileSync(process.env.ALLO_ADVENTURE_VIEW_CANDIDATE || 'view_adventure_module.js', 'utf8'))();
  new Function(readFileSync(process.env.ALLO_ADVENTURE_MODULE_CANDIDATE || 'adventure_module.js', 'utf8'))();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; });

const scene = (extra = {}) => ({
  currentScene: { text: 'A bridge sways.', options: ['Cross', 'Wait'] }, history: [{ type: 'scene', text: 'A bridge sways.' }], inventory: [], climax: { isActive: false },
  energy: 80, xp: 20, level: 1, xpToNextLevel: 100, gold: 0, turnCount: 3, isLoading: false, isGameOver: false, characters: [],
  stats: { successes: 1, failures: 0, decisions: 3, partials: 0, conceptsFound: [] }, ...extra,
});
async function renderView(extra) {
  const base = {
    t, theme: 'light', adventureState: scene(), isTeacherMode: false, activeSessionCode: '', sessionData: {}, studentProjectSettings: { adventureMinXP: 0 },
    adventureInputMode: 'choice', adventureFreeResponseEnabled: false, splitTextToSentences: (text) => [text], formatInteractiveText: (text) => text,
    playbackState: {}, isPlaying: false, history: [], handleStartAdventure: vi.fn(), handleAdventureChoice: vi.fn(), setAdventureState: vi.fn(),
    setShowStorybookExportModal: vi.fn(), handleSetShowStorybookExportModalToTrue: vi.fn(), adventureEffects: {}, ErrorBoundary: ({ children }) => children, ...extra,
  };
  const props = new Proxy(base, { get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string' && /^[A-Z]/.test(key)) return () => null;
    if (typeof key === 'string' && /^(set|handle|on|toggle|open|close|start|stop|render|get)[A-Z]?/.test(key)) return () => {};
    return undefined;
  } });
  function Harness() { return window.AlloModules.AdventureView(props); }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
  return base;
}
const choiceButtons = () => [...host.querySelectorAll('[data-adventure-choice] button[data-help-key="adventure_choice_btn"]')];

describe('live student, class voting off', () => {
  it('sees disabled choices and a status saying the teacher is choosing', async () => {
    await renderView({ activeSessionCode: 'ABCDE' });
    expect(choiceButtons()).toHaveLength(2);
    expect(choiceButtons().every((b) => b.disabled)).toBe(true);
    expect(host.querySelector('[data-adventure-live-wait]').textContent).toContain('The teacher controls this class adventure.');
  });

  it('can vote once the teacher opens voting', async () => {
    await renderView({ activeSessionCode: 'ABCDE', sessionData: { democracy: { isActive: true, votes: {} } } });
    expect(choiceButtons().some((b) => b.disabled)).toBe(false);
    expect(host.querySelector('[data-adventure-live-wait]')).toBeNull();
  });

  it('gets the waiting notice instead of a written-response box', async () => {
    await renderView({ activeSessionCode: 'ABCDE', adventureFreeResponseEnabled: true });
    expect(host.querySelector('[data-adventure-live-wait]')).not.toBeNull();
    expect(host.querySelector('button[data-help-key="adventure_input_send"]')).toBeNull();
  });

  it('is not offered Start over', async () => {
    await renderView({ activeSessionCode: 'ABCDE' });
    expect(host.querySelector('[data-help-key="adventure_start_btn"]')).toBeNull();
  });

  it('a solo student still has active choices and Start over', async () => {
    await renderView({});
    expect(choiceButtons().every((b) => !b.disabled)).toBe(true);
    expect(host.querySelector('[data-help-key="adventure_start_btn"]')).not.toBeNull();
  });
});

describe('Storybook XP lock', () => {
  it('counts the XP earned across level-ups, not the XP left in the current level', () => {
    const gate = window.AlloModules.AdventureStorybookGate;
    expect(gate.xpEarned({ level: 1, xp: 20 })).toBe(20);
    expect(gate.xpEarned({ level: 3, xp: 20 })).toBe(100 + 150 + 20);
    expect(gate.xpNeeded({ level: 3, xp: 20 }, 250)).toBe(0);
    expect(gate.xpNeeded({ level: 1, xp: 20 }, 250)).toBe(230);
  });

  it('matches the level-up rule in the session handler', () => {
    const handler = readFileSync('adventure_session_handlers_source.jsx', 'utf8');
    expect(handler).toContain('newXpToNext = Math.floor(newXpToNext * 1.5);');
    expect(readFileSync('adventure_handlers_source.jsx', 'utf8')).toContain("const startingXpToNext = isSequel ? Math.max(1, Number(adventureState.xpToNextLevel) || 100) : 100;");
  });

  const storybookButtons = () => [...host.querySelectorAll('button')].filter((b) => b.textContent.includes('Storybook'));
  it('the finished-episode recap unlocks on XP earned across levels', async () => {
    await renderView({ adventureState: scene({ isGameOver: true, level: 3, xp: 20 }), studentProjectSettings: { adventureMinXP: 250 } });
    expect(storybookButtons().length).toBeGreaterThan(0);
    expect(host.textContent).not.toContain('locked:');
  });

  it('the finished-episode recap stays locked below the setting', async () => {
    await renderView({ adventureState: scene({ isGameOver: true, level: 1, xp: 20 }), studentProjectSettings: { adventureMinXP: 250 } });
    expect(host.textContent).toContain('locked:230');
  });

  it('the Story summary Storybook button honours the same lock', async () => {
    await renderView({ showLedger: true, adventureState: scene({ level: 1, xp: 20 }), studentProjectSettings: { adventureMinXP: 250 } });
    expect(host.querySelector('[data-ledger-storybook-locked]').textContent).toContain('locked:230');
    expect(storybookButtons().every((b) => b.disabled)).toBe(true);
    await act(async () => root.unmount()); host.remove(); root = null;
    await renderView({ showLedger: true, adventureState: scene({ level: 3, xp: 20 }), studentProjectSettings: { adventureMinXP: 250 } });
    expect(host.querySelector('[data-ledger-storybook-locked]')).toBeNull();
    expect(storybookButtons().some((b) => !b.disabled)).toBe(true);
  });

  it('the Mission Report card shows the lock instead of the export button, and hides Continue/New Game when not offered', async () => {
    const Card = window.AlloModules.MissionReportCard;
    const onExport = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Card, { adventureState: scene({ isGameOver: true, climax: { masteryScore: 90 } }), globalLevel: 1, onClose: () => {}, onExport, storybookXpNeeded: 40 })));
    expect(host.querySelector('[data-mission-storybook-locked]').textContent).toContain('locked:40');
    expect([...host.querySelectorAll('button')].some((b) => /storybook/i.test(b.textContent))).toBe(false);
    expect([...host.querySelectorAll('button')].map((b) => b.textContent).join('|')).not.toMatch(/New Game|Continue/);
    await act(async () => root.render(React.createElement(Card, { adventureState: scene({ isGameOver: true, climax: { masteryScore: 90 } }), globalLevel: 1, onClose: () => {}, onExport, onContinue: () => {}, storybookXpNeeded: 0 })));
    const labels = [...host.querySelectorAll('button')].map((b) => b.textContent).join('|');
    expect(labels).toMatch(/Continue/);
    expect(labels).not.toMatch(/New Game/);
  });

  it('the Mission Report card New Game calls its handler', async () => {
    const Card = window.AlloModules.MissionReportCard;
    const onNewGame = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Card, { adventureState: scene({ isGameOver: true, climax: { masteryScore: 90 } }), globalLevel: 1, onClose: () => {}, onExport: () => {}, onNewGame, onContinue: () => {}, storybookXpNeeded: 0 })));
    const button = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('New Game'));
    await act(async () => button.click());
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});

describe('host wiring of the Mission Report card', () => {
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s: lock, live-student gating and a working New Game', (file) => {
    const src = readFileSync(file === 'AlloFlowANTI.txt' ? (process.env.ALLO_ANTI_CANDIDATE || file) : file, 'utf8');
    const at = src.indexOf('<MissionReportCard');
    const mount = src.slice(at, src.indexOf('/>', at));
    expect(mount.includes('storybookXpNeeded={window.AlloModules?.AdventureStorybookGate?.xpNeeded?.(adventureState, studentProjectSettings?.adventureMinXP) || 0}')).toBe(true);
    expect(mount.includes('onContinue={!isTeacherMode && activeSessionCode ? undefined : () => {')).toBe(true);
    expect(mount.includes('onNewGame={!isTeacherMode && activeSessionCode ? undefined : () => {')).toBe(true);
    expect(mount.includes('handleStartAdventure();')).toBe(true);
    expect(mount.includes('setShowNewGameSetup(true)')).toBe(false);
  });
});
