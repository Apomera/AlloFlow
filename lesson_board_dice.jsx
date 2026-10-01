import * as engine from './lesson_board_engine.js';
import { Amounts } from './lesson_board_play_extras.jsx';
import { tr } from './lesson_board_strings.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
// Same icosahedron geometry as Adventure mode's d20 ([rotateY, rotateX, flip]),
// drawn inside the board because that overlay sits below this dialog's layer.
const FACES = [[0, 52.62, 0], [72, 52.62, 0], [144, 52.62, 0], [216, 52.62, 0], [288, 52.62, 0], [0, 10.81, 180], [72, 10.81, 180], [144, 10.81, 180], [216, 10.81, 180], [288, 10.81, 180], [36, -10.81, 0], [108, -10.81, 0], [180, -10.81, 0], [252, -10.81, 0], [324, -10.81, 0], [36, -52.62, 180], [108, -52.62, 180], [180, -52.62, 180], [252, -52.62, 180], [324, -52.62, 180]];
const settle = value => { const [y, x, z] = FACES[value - 1] || FACES[0]; return `rotateZ(${720 - z}deg) rotateX(${1440 - x}deg) rotateY(${1440 - y}deg)`; };
export const reducedMotion = () => { try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
function randomBelow(count) {
  const api = globalThis.crypto;
  if (typeof api?.getRandomValues !== 'function') return Math.floor(Math.random() * count);
  const buffer = new Uint32Array(1), limit = 4294967296 - 4294967296 % count; do api.getRandomValues(buffer); while (buffer[0] >= limit); return buffer[0] % count;
}
export function DiceStyles() {
  return <style>{`.lb .lb-d20{display:inline-block;width:104px;height:104px;flex-shrink:0}.lb .lb-d20-scale{display:block;width:200px;height:200px;perspective:1200px;pointer-events:none;transform:translate(-48px,-48px) scale(.33);transform-origin:50% 50%}.lb .lb-d20-body{display:block;position:relative;width:200px;height:200px;transform-style:preserve-3d;transition:transform 1.8s cubic-bezier(.15,.9,.35,1)}.lb .lb-d20[data-still=true] .lb-d20-body{transition:none}.lb .lb-d20[data-dim=true]{opacity:.45}.lb .lb-d20-face{position:absolute;left:0;top:-15.5px;width:200px;height:173.2px;clip-path:polygon(50% 0,0 100%,100% 100%);transform-origin:50% 66.66%;display:flex;justify-content:center;align-items:flex-end;padding-bottom:40px;box-sizing:border-box;background:linear-gradient(135deg,#4f46e5,#312e81);color:#fbbf24;font:900 42px 'Arial Black',system-ui,sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.3);backface-visibility:visible}.lb .lb-d20-face[data-top=true]{background:linear-gradient(135deg,#fde68a,#f59e0b);color:#312e81}.lb .lb-fortune{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;margin:14px 0;padding:14px;border:2px solid var(--gold,#80551d);border-radius:14px;background:var(--gold-soft,#fbefd9)}.lb .lb-fortune-dice{display:flex;gap:4px}.lb .lb-fortune h4{margin:0 0 4px}.lb .lb-fortune-headline{font-weight:750;margin:4px 0}.lb .lb-fortune .lb-discovery-card{grid-column:1/-1}.lb .lb-discovery-card{border:2px solid var(--accent);border-radius:12px;background:var(--panel);padding:12px 14px;margin:8px 0}.lb .lb-discovery-card h5{font-size:1.05em;margin:2px 0 6px}.lb .lb-discovery-card[data-fresh=true]{animation:lb-card-in .6s ease-out both}@keyframes lb-card-in{from{transform:perspective(600px) rotateY(80deg);opacity:0}to{transform:none;opacity:1}}.lb .lb-discovery-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:10px}.lb .lb-luck{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:flex-start;margin:10px 0}.lb .lb-luck details{margin-top:0;padding-top:0;border-top:0;flex:1 1 220px}.lb .lb-momentum{display:flex;gap:8px;align-items:center;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--panel)}.lb .lb-momentum small{display:block}.lb .lb-momentum-pips{display:flex;gap:4px}.lb .lb-momentum-pips span{width:14px;height:14px;border-radius:50%;border:2px solid var(--accent)}.lb .lb-momentum-pips span[data-on=true]{background:var(--accent)}.lb .lb-momentum[data-momentum="2"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}.lb .lb-path-roll{margin:10px 0}.lb .lb-path-roll button{display:inline-flex;align-items:center;gap:8px}.lb .lb-die{width:36px;height:36px;flex-shrink:0}.lb .lb-die-body{fill:var(--panel);stroke:var(--accent);stroke-width:5}.lb .lb-die-pip,.lb .lb-die-number{fill:var(--ink)}.lb .lb-die-number{font:800 34px system-ui,sans-serif}.lb .lb-die[data-rolling=true]{animation:lb-die-wobble .3s ease-in-out infinite}@keyframes lb-die-wobble{0%{transform:rotate(-14deg) scale(1.08)}50%{transform:rotate(12deg) scale(1.02)}100%{transform:rotate(-14deg) scale(1.08)}}.lb .lb-highlights{margin:16px 0;padding:14px;border:2px solid var(--accent);border-radius:14px;background:var(--soft)}.lb .lb-highlights h4{margin-top:0}.lb .lb-badges{list-style:none;padding:0;margin:8px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr));gap:8px}.lb .lb-badges li{display:flex;gap:10px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.lb .lb-badges small{display:block}.lb .lb-badge-symbol{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--panel);font-weight:800}.lb .lb-highlight-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr));gap:6px 12px;margin:10px 0 0}.lb .lb-highlight-stats div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--line);padding:4px 0}.lb .lb-highlight-stats dd{margin:0;font-weight:750}.lb .lb-dice-sound{margin:0;font-size:.92em}@media(max-width:560px){.lb .lb-fortune{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.lb .lb-d20-body{transition:none}.lb .lb-discovery-card[data-fresh=true],.lb .lb-die[data-rolling=true]{animation:none}}@media(forced-colors:active){.lb .lb-d20-face{forced-color-adjust:none}.lb .lb-fortune,.lb .lb-discovery-card{border-color:CanvasText}.lb .lb-die-body{stroke:CanvasText}.lb .lb-momentum-pips span{border-color:CanvasText}.lb .lb-momentum-pips span[data-on=true]{background:Highlight}}`}</style>;
}
export function D20({ value, animate, dim = false }) {
  const [transform, setTransform] = useState(() => animate && !reducedMotion() ? `rotateX(${Math.floor(Math.random() * 360)}deg) rotateY(${Math.floor(Math.random() * 360)}deg)` : settle(value));
  useEffect(() => { if (!animate || reducedMotion()) { setTransform(settle(value)); return; } const timer = setTimeout(() => setTransform(settle(value)), 40); return () => clearTimeout(timer); }, [value, animate]);
  return <span className="lb-d20" aria-hidden="true" data-still={!animate} data-dim={dim} data-d20={value}><span className="lb-d20-scale"><span className="lb-d20-body" style={{ transform }}>{FACES.map(([y, x, z], index) => <span key={index} className="lb-d20-face" data-top={index + 1 === value} style={{ transform: `rotateY(${y}deg) rotateX(${x}deg) translateZ(151px)${z ? ' rotateZ(180deg)' : ''}` }}>{index + 1}</span>)}</span></span></span>;
}
export function DiscoveryCard({ card, fresh = false, t }) {
  return <article className="lb-discovery-card" data-discovery-card={card.id} data-fresh={fresh}><p className="lb-eyebrow">{tr(t, 'discovery_card', 'Discovery card')}</p><h5>{card.title}</h5><p>{card.text}</p><blockquote>{card.sourceQuote}</blockquote></article>;
}
// Rolls play once per page visit; later renders show the settled result.
const played = new Set();
export function FortuneRoll({ board, run, t }) {
  const step = engine.stepOf(run), entry = React.useMemo(() => engine.derive(board, run).luck.find(item => item.turn === run.turn), [board, run]);
  const key = entry ? [board.title, run.turn, step.retryRound || 0, entry.dice.join('-')].join(':') : '';
  const [rolling, setRolling] = useState(() => !!key && !played.has(key));
  useEffect(() => { if (!key || played.has(key)) { setRolling(false); return; } setRolling(true); playDiceSound(reducedMotion() ? 0.3 : 1.7); const timer = setTimeout(() => { played.add(key); setRolling(false); }, reducedMotion() ? 250 : 2000); return () => clearTimeout(timer); }, [key]);
  if (!entry) return null;
  const card = entry.cardId ? board.discoveries?.find(item => item.id === entry.cardId) : null, roll = entry.roll, resource = board.resources[entry.gain[0] ? 0 : 1];
  const headline = { steady: tr(t, 'fortune_steady', 'You rolled {roll}. Steady progress: your base reward is safe.', { roll }), single: tr(t, 'fortune_single', 'You rolled {roll}! Bonus: +1 {resource}.', { roll, resource }), double: tr(t, 'fortune_double', 'You rolled {roll}! Bonus: +1 of each resource.', { roll }), discovery: card ? tr(t, 'fortune_discovery', 'You rolled {roll}! You revealed a discovery card.', { roll }) : tr(t, 'fortune_all_found', 'You rolled {roll}! Every discovery card is found, so you earn +1 of each resource.', { roll }), jackpot: card ? tr(t, 'fortune_jackpot', 'Natural 20! A discovery card and +1 of each resource.') : tr(t, 'fortune_jackpot_plain', 'Natural 20! +2 of each resource.') }[entry.outcome];
  return <section className="lb-fortune" data-board-fortune data-outcome={entry.outcome} aria-label={tr(t, 'fortune_title', 'Fortune roll')}><DiceStyles/>
    <div className="lb-fortune-dice" key={key}>{entry.dice.map((value, index) => <D20 key={index} value={value} animate={rolling} dim={entry.dice.length > 1 && index !== entry.dice.indexOf(roll)}/>)}</div>
    <div><h4>{tr(t, 'fortune_title', 'Fortune roll')}</h4>{entry.dice.length > 1 && <p className="lb-muted">{tr(t, 'fortune_advantage', 'Momentum bonus: two dice rolled ({dice}). The higher one counts.', { dice: entry.dice.join(', ') })}</p>}
      {rolling && <p className="lb-muted" aria-hidden="true">{tr(t, 'fortune_rolling', 'Rolling the fortune die\u2026')}</p>}
      <div role="status" data-fortune-result>{!rolling && <><p className="lb-fortune-headline">{headline}</p>{entry.gain.some(value => value > 0) && <Amounts board={board} values={entry.gain} prefix="+"/>}</>}</div>
    </div>
    {!rolling && card && <DiscoveryCard card={card} fresh t={t}/>}
  </section>;
}
export function LuckPanel({ board, run, compact = false, t }) {
  if (board.chance !== true) return null;
  const step = engine.stepOf(run), progress = engine.derive(board, run), streak = engine.momentum(board, run, step.result ? run.turn + 1 : run.turn), ready = streak >= 2, cards = board.discoveries || [], found = cards.filter(card => progress.discovered.includes(card.id));
  return <section className="lb-luck" data-board-luck aria-label={tr(t, 'luck_title', 'Fortune and discoveries')}><DiceStyles/>
    <div className="lb-momentum" data-momentum={Math.min(streak, 2)}><span className="lb-momentum-pips" aria-hidden="true">{[0, 1].map(index => <span key={index} data-on={index < streak}/>)}</span><span><strong>{ready ? tr(t, 'momentum_ready', 'Momentum! The next correct answer rolls two dice.') : tr(t, 'momentum_count', 'Momentum: {count}/2', { count: streak })}</strong>{!ready && !compact && <small>{tr(t, 'momentum_help', 'Two first-try correct answers in a row earn a second fortune die. The higher roll counts.')}</small>}</span></div>
    {cards.length > 0 && <details data-board-discoveries><summary>{tr(t, 'discoveries_found', 'Discovery cards found: {count}/{total}', { count: found.length, total: cards.length })}</summary>{found.length ? <div className="lb-discovery-list">{found.map(card => <DiscoveryCard key={card.id} card={card} t={t}/>)}</div> : <p>{tr(t, 'discoveries_none', 'Roll 17 or higher after a correct answer to reveal a card.')}</p>}</details>}
    {!compact && <DiceSoundToggle t={t}/>}{!compact && <details data-board-fortune-rules><summary>{tr(t, 'fortune_rules', 'How fortune dice work')}</summary><ul><li>{tr(t, 'rule_when', 'After a correct answer at a location, roll one twenty-sided die.')}</li><li>{tr(t, 'rule_steady', '1-5: steady progress. You keep the base reward.')}</li><li>{tr(t, 'rule_single', '6-12: +1 bonus token.')}</li><li>{tr(t, 'rule_double', '13-16: +1 of each resource.')}</li><li>{tr(t, 'rule_discovery', '17-19: reveal a discovery card and its reward.')}</li><li>{tr(t, 'rule_jackpot', '20: a discovery card plus +1 of each resource.')}</li><li>{tr(t, 'rule_safe', 'Dice only add. An incorrect answer never rolls and never loses tokens.')}</li></ul></details>}
  </section>;
}
// Opt-in, per device: a short synthesized clatter, so there is no audio file to load.
const SOUND_KEY = 'allo-board-dice-sound';
export const diceSoundOn = () => { try { return localStorage.getItem(SOUND_KEY) === 'on'; } catch (_) { return false; } };
export const setDiceSound = on => { try { if (on) localStorage.setItem(SOUND_KEY, 'on'); else localStorage.removeItem(SOUND_KEY); } catch (_) {} };
export function playDiceSound(seconds = 1.2) {
  if (!diceSoundOn()) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
    const ctx = playDiceSound.ctx || (playDiceSound.ctx = new Context()); if (ctx.state === 'suspended') ctx.resume?.();
    for (let hit = 0; hit < 9; hit++) {
      const at = ctx.currentTime + seconds * (1 - Math.pow(0.78, hit)) / (1 - Math.pow(0.78, 9)), tone = ctx.createOscillator(), level = ctx.createGain();
      tone.type = 'triangle'; tone.frequency.value = 480 + Math.random() * 520;
      level.gain.setValueAtTime(0.0001, at); level.gain.exponentialRampToValueAtTime(0.1 * (1 - hit / 12), at + 0.004); level.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      tone.connect(level).connect(ctx.destination); tone.start(at); tone.stop(at + 0.06);
    }
  } catch (_) {}
}
export function DiceSoundToggle({ t }) {
  const [on, setOn] = useState(diceSoundOn);
  return <label className="lb-row lb-dice-sound"><input type="checkbox" style={{ width: 'auto' }} data-dice-sound checked={on} onChange={event => { setDiceSound(event.target.checked); setOn(event.target.checked); if (event.target.checked) playDiceSound(0.4); }}/>{tr(t, 'dice_sound', 'Dice sounds on this device')}</label>;
}
const BADGES = {
  natural20: ['20', 'badge_natural20', 'Natural 20', 'badge_natural20_help', 'Rolled the highest fortune roll.'],
  collector: ['\u2756', 'badge_collector', 'Card collector', 'badge_collector_help', 'Found every discovery card.'],
  momentum: ['\u00bb', 'badge_momentum', 'Momentum master', 'badge_momentum_help', 'Three or more first-try answers in a row.'],
  persistent: ['\u21bb', 'badge_persistent', 'Never gave up', 'badge_persistent_help', 'Came back and solved an activity after a retry.'],
  lucky: ['\u2726', 'badge_lucky', 'Fortune favoured you', 'badge_lucky_help', 'Earned five or more bonus tokens from the dice.'],
  explorer: ['\u2316', 'badge_explorer', 'Full explorer', 'badge_explorer_help', 'Explored every location.'],
  builder: ['\u25a5', 'badge_builder', 'Master builder', 'badge_builder_help', 'Built every construction project.']
};
export function AdventureHighlights({ board, run, t }) {
  const stats = React.useMemo(() => engine.highlights(board, run), [board, run]);
  const rows = [...(board.chance === true ? [[tr(t, 'stat_rolls', 'Fortune rolls'), stats.rolls], [tr(t, 'stat_best', 'Best roll'), stats.rolls ? stats.best : '-'], ...(stats.totalCards ? [[tr(t, 'stat_cards', 'Discovery cards'), stats.cards + '/' + stats.totalCards]] : []), [tr(t, 'stat_fortune', 'Bonus tokens from dice'), stats.fortune[0] + stats.fortune[1]]] : []), [tr(t, 'stat_streak', 'Longest first-try streak'), stats.bestStreak], [tr(t, 'stat_comebacks', 'Activities solved after a retry'), stats.comebacks]];
  return <section className="lb-highlights" data-board-highlights aria-label={tr(t, 'highlights_title', 'Adventure highlights')}><DiceStyles/>
    <h4>{tr(t, 'highlights_title', 'Adventure highlights')}</h4>
    {stats.badges.length ? <ul className="lb-badges">{stats.badges.map(id => { const [symbol, key, label, helpKey, help] = BADGES[id]; return <li key={id} data-badge={id}><span className="lb-badge-symbol" aria-hidden="true">{symbol}</span><span><strong>{tr(t, key, label)}</strong><small>{tr(t, helpKey, help)}</small></span></li>; })}</ul> : <p>{tr(t, 'badges_none', 'Badges celebrate streaks, comebacks and lucky rolls. Play again to earn one.')}</p>}
    <dl className="lb-highlight-stats">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] };
export function DieFace({ value, sides, rolling = false }) {
  return <svg className="lb-die" data-rolling={rolling} viewBox="0 0 100 100" aria-hidden="true">{sides <= 6 ? <><rect className="lb-die-body" x="6" y="6" width="88" height="88" rx="18"/>{(PIPS[value] || []).map(([cx, cy], index) => <circle key={index} className="lb-die-pip" cx={cx} cy={cy} r="8"/>)}</> : <><polygon className="lb-die-body" points="50,5 92,28 92,72 50,95 8,72 8,28"/><text className="lb-die-number" x="50" y="62" textAnchor="middle">{value}</text></>}</svg>;
}
// A fair roll over the open locations; it only selects, so players still decide.
export function PathRoll({ board, run, onPick, disabled, t }) {
  const options = engine.targets(board, run).filter(item => !item.cost), [roll, setRoll] = useState(null), [face, setFace] = useState(1), timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);
  useEffect(() => { timers.current.forEach(clearInterval); timers.current = []; setRoll(null); }, [run.turn]);
  if (board.chance !== true || options.length < 2) return null;
  const sides = options.length;
  const go = () => {
    const index = randomBelow(sides), pick = options[index], finish = () => { timers.current.forEach(clearInterval); timers.current = []; setFace(index + 1); setRoll({ value: index + 1, name: pick.name, rolling: false }); onPick(pick.id); };
    setRoll({ rolling: true }); playDiceSound(reducedMotion() ? 0.2 : 0.8);
    if (reducedMotion()) { finish(); return; }
    const spin = setInterval(() => setFace(randomBelow(sides) + 1), 90), stop = setTimeout(finish, 900);
    timers.current = [spin, stop];
  };
  return <div className="lb-path-roll" data-board-path-roll><DiceStyles/><button type="button" data-path-roll disabled={disabled || roll?.rolling} onClick={go}><DieFace value={face} sides={sides} rolling={!!roll?.rolling}/><span>{tr(t, 'path_roll', 'Let the dice choose')}</span></button><p className="lb-muted">{tr(t, 'path_roll_help', 'Rolls a {sides}-sided die: {list}.', { sides, list: options.map((item, index) => (index + 1) + ' ' + item.name).join(' \u00b7 ') })}</p><p role="status" data-path-roll-result>{roll && !roll.rolling ? tr(t, 'path_rolled', 'The die shows {value}: {name}. Explore it, or choose another move.', { value: roll.value, name: roll.name }) : ''}</p></div>;
}
