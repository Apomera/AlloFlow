import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const source = readFileSync('arcade_mode_modelun.js', 'utf8');

let mode, root, element, ctx, awards, spoken;
const AI_NAMES = ['callGemini', 'callGeminiVision', 'callGeminiAudio', 'callGeminiImageEdit', 'callImagen', 'callTTS'];

function aiSpies({ blocked, gemini }) {
  const fns = {};
  AI_NAMES.forEach((name) => {
    const fn = name === 'callGemini' && gemini ? vi.fn(gemini) : vi.fn(async () => (name === 'callTTS' ? 'blob:voice' : '{}'));
    if (blocked) fn._alloQrBlocked = true;
    fns[name] = fn;
  });
  return fns;
}
const expectNoAiCalls = () => {
  AI_NAMES.forEach((name) => expect(ctx[name], name).not.toHaveBeenCalled());
  expect(window.callGemini).not.toHaveBeenCalled();
};

const text = () => element.textContent;
const buttons = () => [...element.querySelectorAll('button')];
const named = (name) => buttons().find((b) => b.textContent.includes(name));
const click = async (target) => {
  const button = typeof target === 'string' ? named(target) : target;
  expect(button, 'button ' + target).toBeTruthy();
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const type = async (field, value) => {
  expect(field).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
// Words the no-AI session may not show; its notice legitimately says "without AI".
const expectNoAiWording = () => {
  const visible = text().replace(/(without|no) AI/gi, '').replace(/\(no AI\)/gi, '');
  expect(visible.includes('🤖'), 'robot label on screen').toBe(false);
  expect(/\bAI\b/.test(visible), 'AI wording: ' + (visible.match(/.{0,40}\bAI\b.{0,40}/) || [''])[0]).toBe(false);
};

async function mount(extra = {}) {
  awards = [];
  ctx = { React, tokens: 10, minutesPerToken: 5, studentNickname: 'Ada', addToast: vi.fn(), palette: {}, ...extra };
  function Host() {
    const [session, setSession] = React.useState(extra.session || null);
    const [earnings, setEarnings] = React.useState([]);
    return mode.render({
      ...ctx,
      session,
      onLaunch: () => { setSession({ modeId: 'model-un', startedAt: 'launch-1' }); return true; },
      onAwardTokens: (amount, source2, metadata) => {
        awards.push({ amount, source: source2, metadata });
        setEarnings((prev) => prev.concat([{ source: source2, tokens: amount, metadata }]));
      },
      getEarnings: () => earnings
    });
  }
  element = document.createElement('div');
  document.body.appendChild(element);
  root = createRoot(element);
  await act(async () => root.render(React.createElement(Host)));
}

async function seatMe() {
  await click('Crisis Committee');
  await click('Climate Action');
  await click('Continue to Assignment');
  await click('Ada');
  const chip = buttons().find((b) => (b.title || '').startsWith('United Kingdom'));
  await click(chip);
  await click('Lock roster');
}

// Launch -> setup -> seat -> briefing -> paper -> speeches -> draft -> vote -> debrief.
async function runNoAiSession({ chooseNoAi = false } = {}) {
  await click('Solo');
  if (chooseNoAi) {
    const box = element.querySelector('[data-mun-choose-no-ai]');
    expect(box).toBeTruthy();
    await click(box);
  }
  await seatMe();
  expect(element.querySelector('[data-mun-no-ai-notice]')).toBeTruthy();
  expect(text()).toContain('simulated positions');
  expect(text()).toContain('not what any real government would say or do');
  expect(text()).toContain('Simulated delegate');
  expectNoAiWording();

  await click('Open Position Papers');
  expectNoAiWording();
  await click('Begin Opening Speeches');
  expectNoAiWording();

  await click(element.querySelector('[data-mun-hear-delegates]'));
  const { countries, agendas, storedPosition } = mode.helpers;
  const agenda = agendas().find((a) => a.id === 'climate_action');
  ['USA', 'CHN', 'RUS', 'FRA', 'IND', 'TUR', 'ISR'].forEach((iso) => {
    const country = countries().find((c) => c.iso === iso);
    expect(text()).toContain(storedPosition(country, agenda));
  });
  expect(element.querySelector('[data-mun-hear-delegates]')).toBeNull();

  await click(buttons().find((b) => b.textContent.includes('United Kingdom') && b.textContent.includes('Give floor')));
  await type(element.querySelector('textarea[aria-label="Compose your opening speech"]'), 'Madam Chair, the United Kingdom asks this committee to fund climate work in vulnerable states.');
  await click('Deliver speech');
  expect(text()).toContain('your speech');

  // Read-aloud uses the device voice and never the cloud voice path.
  await click(buttons().find((b) => b.getAttribute('aria-label') === 'Read this speech aloud'));
  expect(spoken.length).toBe(1);
  await click(buttons().find((b) => b.getAttribute('aria-label') === 'Stop read-aloud'));

  // Authored crisis, labelled fictional; simulated seats stay silent.
  await click(element.querySelector('[data-mun-add-scenario]'));
  expect(text()).toContain('Fictional practice scenario');
  await click('Crisis Response (90s)');
  expect(text()).toContain('Simulated delegates stay silent');
  await type(element.querySelector('#mun_crisis_response_text'), 'Our delegation offers relief funding and calls for a fast meeting.');
  await click('Submit response');
  expectNoAiWording();
  await click('End early');

  await click('Advance to Resolution Drafting');
  expectNoAiWording();
  expect(text()).toContain('Sample clauses from your briefing');
  expect(named('AI review')).toBeUndefined();
  expect(named('AI starter')).toBeUndefined();
  await type(element.querySelector('#mun_clause_text'), 'Establishes a coordination body for loss and damage funding in vulnerable states;');
  await click('Propose clause');
  await click('Adopt');
  await click('Move to Vote');
  expectNoAiWording();

  // Student's wording ("Establishes") preselects firm; revealing needs the student's own vote.
  expect(element.querySelector('input[value="firm"]').checked).toBe(true);
  expect(named('Reveal tally').disabled).toBe(true);
  expect(named('Cast all')).toBeUndefined();
  await click('✓ YES');
  await click('Reveal tally');
  expect(text()).toContain('a practice result from simulated votes');
  const usa = countries().find((c) => c.iso === 'USA');
  expect(text()).toContain(mode.helpers.simulatedVote(usa, agenda, 'firm').reasoning);
  expectNoAiWording();
  await click('Continue to Debrief');
  expectNoAiWording();
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloHavenArcade = { registerMode: (_id, value) => { mode = value; }, isRegistered: () => false };
  window.__alloHavenModelUNClassMode = null;
  delete window.__alloHavenModelUNSoloClaims;
  delete window.__alloStudentAiDisabled;
  delete window.__alloAiUsable;
  window.callGemini = vi.fn();
  spoken = [];
  window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn((u) => spoken.push(u)) };
  globalThis.SpeechSynthesisUtterance = function Utterance(t) { this.text = t; };
  new Function(source)();
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  element?.remove();
  delete window.callGemini;
  delete window.speechSynthesis;
  delete window.__alloStudentAiDisabled;
  vi.restoreAllMocks();
});

describe('Model UN solo session with AI off', () => {
  it('runs a full session on blocked AI functions with zero AI calls', async () => {
    window.__alloStudentAiDisabled = true;
    await mount(aiSpies({ blocked: true }));
    expect(named('Solo practice (no AI)')).toBeTruthy();
    await runNoAiSession();
    expectNoAiCalls();

    expect(text()).toContain('Self-Rated Rubric');
    expect(text()).toContain('not a grade');
    expect(text()).not.toContain('Teacher Rubric Grading');
    expect(awards).toEqual([{ amount: 1, source: 'model-un-solo-practice', metadata: { soloKey: 'launch-1' } }]);
    expect(element.querySelector('[data-mun-solo-reward="earned"]')).toBeTruthy();
    expectNoAiCalls();
  });

  it('runs the same session with AI available when the student picks no AI', async () => {
    await mount(aiSpies({ blocked: false }));
    expect(named('Solo: pick committee')).toBeTruthy();
    await runNoAiSession({ chooseNoAi: true });
    expectNoAiCalls();
    expect(awards.length).toBe(1);
  });

  it('runs a moderated caucus from templates and offers stored key questions as topics', async () => {
    window.__alloStudentAiDisabled = true;
    await mount(aiSpies({ blocked: true }));
    await click('Solo practice (no AI)');
    await seatMe();
    await click('Open Position Papers');
    await click('Begin Opening Speeches');
    await click('Motion for Caucus');
    const agenda = mode.helpers.agendas().find((a) => a.id === 'climate_action');
    await click(agenda.keyQuestions[0]);
    await click('Open caucus');
    expect(text()).toContain('MODERATED CAUCUS');
    expect(text()).not.toContain('Private note');
    await click(buttons().find((b) => b.textContent.includes('France')));
    const france = mode.helpers.countries().find((c) => c.iso === 'FRA');
    expect(text()).toContain(mode.helpers.templateSpeech(france, agenda, agenda.keyQuestions[0]));
    expectNoAiWording();
    expectNoAiCalls();
  });

  it('hides badges that need AI unless already earned', async () => {
    window.__alloStudentAiDisabled = true;
    await mount(aiSpies({ blocked: true }));
    await click('Achievements');
    expect(text()).not.toContain('UDL Scaffold User');
    expect(text()).not.toContain('Consistency Master');
    expect(text()).toContain('First Speech');
  });
});

describe('Simulated votes', () => {
  const stances = ['firm', 'voluntary', 'limits'];

  it('gives every country, agenda and resolution stance a vote and a one-line reason', () => {
    const { countries, agendas, simulatedVote, resolutionStances } = mode.helpers;
    expect(resolutionStances().map((r) => r.id)).toEqual(stances);
    expect(countries().length * agendas().length).toBe(360);
    countries().forEach((country) => agendas().forEach((agenda) => stances.forEach((res) => {
      const first = simulatedVote(country, agenda, res);
      expect(['Y', 'N', 'A']).toContain(first.vote);
      expect(first.reasoning).toMatch(/^(Voted for|Voted against|Abstained) because /);
      expect(first.reasoning.split('. ').length).toBe(1);
      expect(simulatedVote(country, agenda, res)).toEqual(first);
    })));
  });

  it('follows stored stance against resolution stance', () => {
    const { countries, agendas, simulatedVote, storedStance } = mode.helpers;
    const expected = {
      backs: { firm: 'Y', voluntary: 'Y', limits: 'N' },
      mixed: { firm: 'A', voluntary: 'Y', limits: 'A' },
      resists: { firm: 'N', voluntary: 'A', limits: 'Y' }
    };
    const seen = {};
    countries().forEach((country) => agendas().forEach((agenda) => {
      const stance = storedStance(country, agenda);
      seen[stance] = true;
      stances.forEach((res) => expect(simulatedVote(country, agenda, res).vote).toBe(expected[stance][res]));
    }));
    expect(Object.keys(seen).sort()).toEqual(['backs', 'mixed', 'resists']);
  });

  it('codes stance from what the stored note says', () => {
    const { countries, agendas, storedStance, storedPosition } = mode.helpers;
    const gcm = agendas().find((a) => a.id === 'migration_compact');
    countries().forEach((country) => {
      const note = storedPosition(country, gcm);
      if (/^Voted against the compact/.test(note)) expect(storedStance(country, gcm), country.iso).toBe('resists');
      if (/^Voted for the compact/.test(note)) expect(storedStance(country, gcm), country.iso).not.toBe('resists');
    });
    countries().forEach((country) => agendas().forEach((agenda) => {
      const note = storedPosition(country, agenda);
      if (/\b(resists? (Western|global|external)|rejects? (UNCLOS|international|refugee)|opposes (restrictive|binding|Western|making))/.test(note)) {
        expect(storedStance(country, agenda), country.iso + ' ' + agenda.id).toBe('resists');
      }
      if (/\b(champion|strong NPT supporter|Strong WHO partner|supports? NPT)\b/.test(note) && !/modernizing/.test(note)) {
        expect(storedStance(country, agenda), country.iso + ' ' + agenda.id).not.toBe('resists');
      }
    }));
  });

  it('reads the resolution stance guess from operative wording only', () => {
    const { defaultResolutionStance } = mode.helpers;
    expect(defaultResolutionStance([{ type: 'operative', text: 'Establishes a fund;' }])).toBe('firm');
    expect(defaultResolutionStance([{ type: 'operative', text: 'Encourages banks to share data;' }])).toBe('voluntary');
    expect(defaultResolutionStance([{ type: 'preamble', text: 'Recalling the binding treaty,' }])).toBe('voluntary');
    expect(defaultResolutionStance([])).toBe('voluntary');
  });
});

describe('Stored notes match the public record', () => {
  const note = (iso, agendaId) => {
    const { countries, agendas, storedPosition } = mode.helpers;
    return storedPosition(countries().find((c) => c.iso === iso), agendas().find((a) => a.id === agendaId));
  };
  const allIsos = () => mode.helpers.countries().map((c) => c.iso);

  it('states the recorded General Assembly vote on the migration compact (A/RES/73/195)', () => {
    const record = {
      against: ['USA', 'ISR', 'POL'],
      abstained: ['AUS', 'CHE'],
      absent: ['UKR']
    };
    const named = [...record.against, ...record.abstained, ...record.absent];
    allIsos().forEach((iso) => {
      const text = note(iso, 'migration_compact');
      if (record.against.includes(iso)) expect(text, iso).toMatch(/^Voted against the compact \(2018\)/);
      else if (record.abstained.includes(iso)) expect(text, iso).toMatch(/^Abstained on the compact \(2018\)/);
      else if (record.absent.includes(iso)) expect(text, iso).toMatch(/^Did not vote on the compact \(2018\)/);
      else expect(text, iso).toMatch(/^Voted for the compact \(2018\)/);
      expect(/\bGCM\b|\bsigned\b/i.test(text), iso + ': ' + text).toBe(false);
    });
    expect(named.length).toBe(6);
    expect(note('BRA', 'migration_compact')).toContain('left it in 2019, returned in 2023');
  });

  it('states the recorded vote on UNDRIP where the note gives one (A/RES/61/295)', () => {
    ['RUS', 'NGA', 'KEN', 'UKR'].forEach((iso) => expect(note(iso, 'indigenous_rights'), iso).toMatch(/^Abstained on UNDRIP/));
    ['USA', 'CAN', 'AUS', 'NZL'].forEach((iso) => expect(note(iso, 'indigenous_rights'), iso).toMatch(/^Voted against UNDRIP/));
    expect(note('ISR', 'indigenous_rights')).toMatch(/^Did not vote on UNDRIP/);
    expect(note('SAU', 'indigenous_rights')).toMatch(/^Voted for UNDRIP/);
    allIsos().forEach((iso) => expect(/per UN definition/.test(note(iso, 'indigenous_rights')), iso).toBe(false));
  });

  it('gives no invented Antarctic position to a state outside the treaty', () => {
    ['NGA', 'KEN', 'EGY', 'IRN', 'ISR', 'MEX', 'IDN', 'VNM', 'PHL'].forEach((iso) => {
      expect(note(iso, 'antarctic_minerals'), iso).toMatch(/^Not an Antarctic Treaty Party/);
      expect(mode.helpers.storedStance(mode.helpers.countries().find((c) => c.iso === iso), mode.helpers.agendas().find((a) => a.id === 'antarctic_minerals')), iso).toBe('mixed');
    });
    expect(note('SAU', 'antarctic_minerals')).toContain('2024');
    expect(note('TUR', 'antarctic_minerals')).toContain('1996');
  });

  it('keeps corrected errors and loaded phrasing out of every note', () => {
    const { countries, agendas } = mode.helpers;
    const banned = [/weaponiz/i, /Bolsonaro\/Venezuelan/, /4x global/, /smallest declared arsenal/, /Iron Dome/, /CoE host/, /Geneva HQ for WFP/, /GovWare ban/, /African Union migration coordinator/, /USAID and WFP/, /Re-engaged in global climate/, /2030 fossil-car ban/, /AIDA legislation/];
    countries().forEach((c) => Object.values(c.defaultPositions).concat(c.currentEvents).forEach((text) => {
      banned.forEach((re) => expect(re.test(text), c.iso + ': ' + text).toBe(false));
    }));
    expect(countries().length * agendas().length).toBe(360);
  });

  it('labels the note as background, never as the delegation speaking', () => {
    const { countries, agendas, templateSpeech, storedPosition } = mode.helpers;
    const russia = countries().find((c) => c.iso === 'RUS');
    const food = agendas().find((a) => a.id === 'food_security');
    const framed = 'Background note on Russia (not its delegation\'s words): "' + storedPosition(russia, food) + '"';
    expect(templateSpeech(russia, food)).toContain(framed);
    expect(templateSpeech(russia, food, 'Funding')).toContain(framed);
    expect(templateSpeech(russia, food)).not.toContain('Stored position note');
  });

  it('corrects the agenda text on the Madrid Protocol, and the bloc lists', () => {
    const antarctic = mode.helpers.agendas().find((a) => a.id === 'antarctic_minerals');
    expect(antarctic.background).toContain('no end date');
    expect(antarctic.background.includes('50-year prohibition')).toBe(false);
    expect(source.includes("name: 'European Union',                   color: '#fbbf24', members: ['FRA','DEU','POL'] }")).toBe(true);
  });
});

describe('Template speeches do not invent positions', () => {
  it('uses only the stored note for each seat', () => {
    const { countries, agendas, templateSpeech, storedPosition } = mode.helpers;
    countries().forEach((country) => agendas().forEach((agenda) => {
      const speech = templateSpeech(country, agenda);
      const note = storedPosition(country, agenda);
      expect(speech).toContain(note);
      expect(speech.length).toBeLessThan(600);
      expect(speech).toContain('In this simulation');
      const rest = speech.replace(note, '');
      countries().filter((other) => other.iso !== country.iso).forEach((other) => {
        expect(rest.includes(other.name), other.name + ' in ' + rest).toBe(false);
      });
      expect(rest.includes(country.currentEvents)).toBe(false);
    }));
  });

  it('falls back to a procedural statement when a country has no stored position', () => {
    const { agendas, templateSpeech, simulatedVote, storedStance } = mode.helpers;
    const refugees = agendas().find((a) => a.id === 'refugee_crisis');
    // Listed in the stance codes, but no note: the code must not stand in for a position.
    const fixture = { iso: 'DEU', name: 'Testland', currentEvents: 'SECRET EVENT', defaultPositions: { climate_action: 'OTHER AGENDA NOTE' } };
    expect(storedStance(fixture, refugees)).toBe('none');
    [templateSpeech(fixture, refugees), templateSpeech(fixture, refugees, 'Funding')].forEach((speech) => {
      expect(speech).toContain('no position stored');
      expect(speech).not.toContain('OTHER AGENDA NOTE');
      expect(speech).not.toContain('SECRET EVENT');
      expect(speech).not.toContain('In this simulation, this seat favors');
    });
    ['firm', 'voluntary', 'limits'].forEach((res) => {
      const vote = simulatedVote(fixture, refugees, res);
      expect(vote.vote).toBe('A');
      expect(vote.reasoning).toContain('no position is stored');
    });
    const blank = { iso: 'USA', name: 'Blankland', defaultPositions: { refugee_crisis: '   ' } };
    expect(storedStance(blank, refugees)).toBe('none');
    expect(storedStance({ iso: 'USA', name: 'Nothing' }, refugees)).toBe('none');
  });

  it('authors one fictional crisis per agenda that names no real country, and none for unknown agendas', () => {
    const { countries, agendas, practiceScenario } = mode.helpers;
    agendas().forEach((agenda) => {
      const news = practiceScenario(agenda);
      expect(news.simulated).toBe(true);
      expect(news.body).toMatch(/fictional/i);
      expect(news.affectedIsos).toEqual([]);
      countries().forEach((country) => expect(news.body.includes(country.name)).toBe(false));
    });
    expect(practiceScenario({ id: 'custom_agenda', title: 'Custom' })).toBeNull();
  });
});

describe('Solo reward', () => {
  const finished = (extra = {}) => ({
    assignedCountries: { me: 'GBR', ai_USA: 'USA' },
    speeches: { a: { uid: 'me', iso: 'GBR' } },
    clauses: { c: { iso: 'GBR', isAi: false } },
    finalVotes: { GBR: { vote: 'Y', isAi: false } },
    voteRevealed: true,
    startedAt: 'state-start',
    ...extra
  });
  const rewardCtx = (over = {}) => mode.helpers.noAiCtx({ session: { startedAt: 'k1' }, onAwardTokens: vi.fn(), getEarnings: () => [], ...over });

  it('takes no score: self-ratings in state cannot change the amount', () => {
    expect(mode.helpers.claimSoloReward.length).toBe(2);
    const amounts = [0, 1, 4].map((rating, i) => {
      const c = rewardCtx({ session: { startedAt: 'rated-' + i } });
      mode.helpers.claimSoloReward(c, finished({ rubric: { preparation: rating }, selfRating: rating, grades: { me: { overall: { score: rating } } } }));
      return c.onAwardTokens.mock.calls[0][0];
    });
    expect(amounts).toEqual([1, 1, 1]);
  });

  it('pays once per launch across re-renders, re-mounts and a logged earning', () => {
    const c = rewardCtx();
    expect(mode.helpers.claimSoloReward(c, finished())).toBe('awarded');
    expect(mode.helpers.claimSoloReward(c, finished())).toBe('already');
    expect(c.onAwardTokens).toHaveBeenCalledTimes(1);
    delete window.__alloHavenModelUNSoloClaims;
    const reloaded = rewardCtx({ getEarnings: () => [{ source: 'model-un-solo-practice', metadata: { soloKey: 'k1' } }] });
    expect(mode.helpers.claimSoloReward(reloaded, finished())).toBe('already');
    expect(reloaded.onAwardTokens).not.toHaveBeenCalled();
  });

  it('needs a speech, a clause and a revealed vote of the student\'s own', () => {
    const c = rewardCtx();
    [
      finished({ speeches: { a: { uid: 'ai_USA' } } }),
      finished({ clauses: { c: { iso: 'USA', isAi: true } } }),
      finished({ finalVotes: {} }),
      finished({ voteRevealed: false })
    ].forEach((state) => expect(mode.helpers.claimSoloReward(c, state)).toBe('incomplete'));
    expect(c.onAwardTokens).not.toHaveBeenCalled();
  });

  it('does not pay in the AI path', () => {
    const onAwardTokens = vi.fn();
    expect(mode.helpers.claimSoloReward({ session: { startedAt: 'k2' }, onAwardTokens }, finished())).toBe('off');
    expect(onAwardTokens).not.toHaveBeenCalled();
  });

  it('pays the same whatever the student rates themselves in the panel', async () => {
    window.__alloStudentAiDisabled = true;
    await mount(aiSpies({ blocked: true }));
    await runNoAiSession();
    expect(awards.length).toBe(1);
    await click('Rate myself');
    await click(buttons().find((b) => b.getAttribute('aria-label') === 'Set Preparation to Beginning'));
    await click(buttons().find((b) => b.getAttribute('aria-label') === 'Set Preparation to Advanced'));
    expect(text()).toContain('They are self-rated, not a grade, and they do not change any reward.');
    expect(awards.length).toBe(1);
    expect(awards[0].amount).toBe(1);
  });
});

describe('Model UN with AI available is unchanged', () => {
  const geminiReply = async () => JSON.stringify({ speech: 'We speak.', text: 'We speak with care about the climate.', keyPoints: ['Point'], vote: 'Y', reasoning: 'We agree.' });

  it('keeps AI delegates, labels, buttons and calls in the default path', async () => {
    await mount(aiSpies({ blocked: false, gemini: geminiReply }));
    expect(text()).toContain('AI fills any seats');
    await click('Solo: pick committee');
    expect(text()).toContain('AI plays the rest');
    expect(element.querySelector('[data-mun-choose-no-ai]').checked).toBe(false);
    await seatMe();
    expect(element.querySelector('[data-mun-no-ai-notice]')).toBeNull();
    expect(text()).toContain('🤖 AI delegate');
    await click('Open Position Papers');
    expect(named('AI starter draft')).toBeTruthy();
    await click('Begin Opening Speeches');
    expect(element.querySelector('[data-mun-hear-delegates]')).toBeNull();
    expect(element.querySelector('[data-mun-add-scenario]')).toBeNull();
    expect(named('Inject breaking news')).toBeTruthy();

    await click(buttons().find((b) => b.textContent.includes('France')));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(ctx.callGemini).toHaveBeenCalledTimes(1);
    expect(ctx.callGemini.mock.calls[0][0]).toContain('France');

    await click(buttons().find((b) => b.getAttribute('aria-label') === 'Read this speech aloud') || 'France');
    expect(ctx.callTTS).toHaveBeenCalled();
    expect(spoken.length).toBe(0);
  });

  it('keeps AI drafting, voting and the teacher rubric, with no reward', async () => {
    await mount(aiSpies({ blocked: false, gemini: geminiReply }));
    await click('Solo: pick committee');
    await seatMe();
    await click('Open Position Papers');
    await click('Begin Opening Speeches');
    window.AlloFlowUX = { confirm: async () => true };
    await click('Skip to Drafting');
    expect(named('AI starter')).toBeTruthy();
    expect(named('AI review')).toBeTruthy();
    expect(text()).toContain('Have an AI delegate propose');
    await type(element.querySelector('#mun_clause_text'), 'Establishes a coordination body for loss and damage funding;');
    await click('Propose clause');
    await click('Adopt');
    await click('Move to Vote');
    delete window.AlloFlowUX;
    expect(element.querySelector('input[name="mun_resolution_stance"]')).toBeNull();
    expect(named('Cast all AI votes')).toBeTruthy();
    await click('Cast all AI votes');
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(ctx.callGemini.mock.calls.some((c) => /voting on a Model UN resolution/.test(c[0]))).toBe(true);
    await click('✓ YES');
    await click('Reveal tally');
    await click('Continue to Debrief');
    expect(text()).toContain('Teacher Rubric Grading');
    expect(named('AI-grade all')).toBeTruthy();
    expect(named('Get AI coach feedback')).toBeTruthy();
    expect(awards).toEqual([]);
    expect(element.querySelector('[data-mun-solo-reward]')).toBeNull();
  });

  // Replies finish out of order on purpose: each one used to overwrite the others from a stale copy of the votes.
  const staggeredVoteReply = () => {
    let n = 0;
    return async () => {
      await new Promise((r) => setTimeout(r, (n++ % 3) * 2));
      return JSON.stringify({ vote: 'Y', reasoning: 'We agree.' });
    };
  };
  const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 40)); }); };

  it('keeps every AI vote from a single "Cast all AI votes" click in solo', async () => {
    await mount(aiSpies({ blocked: false, gemini: staggeredVoteReply() }));
    await click('Solo: pick committee');
    await seatMe();
    await click('Open Position Papers');
    await click('Begin Opening Speeches');
    window.AlloFlowUX = { confirm: async () => true };
    await click('Skip to Drafting');
    await type(element.querySelector('#mun_clause_text'), 'Encourages states to share climate data;');
    await click('Propose clause');
    await click('Adopt');
    await click('Move to Vote');
    delete window.AlloFlowUX;
    expect(named('Cast all AI votes').textContent).toContain('(7)');
    await click('Cast all AI votes');
    await settle();
    expect(named('Cast all AI votes').textContent).toContain('(0)');
    expect(ctx.callGemini.mock.calls.filter((c) => /voting on a Model UN resolution/.test(c[0])).length).toBe(7);
    // The student's own vote joins the AI votes rather than replacing them.
    await click('✓ YES');
    await click('Reveal tally');
    expect(text()).toContain('8 yes · 0 no · 0 abstain');
    expect(element.querySelector('[data-mun-no-ai-notice]')).toBeNull();
  });

  it('sends every AI vote in class mode even before the session echoes the last write', async () => {
    window.__alloHavenModelUNClassMode = { role: 'host', hostNickname: 'Chair', startedAt: 'class-2' };
    const state = { modelUn: { status: 'open', phase: 'vote', committeeId: 'crisis_committee', agendaId: 'climate_action', assignedCountries: { ai_USA: 'USA', ai_FRA: 'FRA', ai_RUS: 'RUS' }, clauses: {}, finalVotes: {} } };
    const sessionUpdate = vi.fn();
    await mount({ ...aiSpies({ blocked: false, gemini: staggeredVoteReply() }), session: { modeId: 'model-un', startedAt: 'class-2' }, sessionCode: 'ABC', sessionUpdate, sessionSubscribe: (cb) => { cb(state); return () => {}; } });
    await click('Cast all AI votes');
    await settle();
    const last = sessionUpdate.mock.calls[sessionUpdate.mock.calls.length - 1][0];
    expect(Object.keys(last.modelUn.finalVotes).sort()).toEqual(['FRA', 'RUS', 'USA']);
  });

  it('leaves class mode out of the no-AI practice even when this device has no AI', async () => {
    window.__alloStudentAiDisabled = true;
    window.__alloHavenModelUNClassMode = { role: 'host', hostNickname: 'Chair', startedAt: 'class-1' };
    const state = { modelUn: { status: 'open', phase: 'briefing', committeeId: 'crisis_committee', agendaId: 'climate_action', assignedCountries: { ai_USA: 'USA' } } };
    await mount({ ...aiSpies({ blocked: true }), session: { modeId: 'model-un', startedAt: 'class-1' }, sessionCode: 'ABC', sessionUpdate: vi.fn(), sessionSubscribe: (cb) => { cb(state); return () => {}; } });
    expect(element.querySelector('[data-mun-no-ai-notice]')).toBeNull();
    expect(text()).toContain('🤖 AI delegate');
  });
});

describe('Roster clearing', () => {
  it('clears a solo roster so a second simulation does not keep the old seats', async () => {
    window.__alloStudentAiDisabled = true;
    await mount(aiSpies({ blocked: true }));
    await runNoAiSession();
    await click('Run another simulation');
    await click('Crisis Committee');
    await click('Climate Action');
    await click('Continue to Assignment');
    expect(text()).toContain('Unassigned');
    await click('Lock roster');
    expect(ctx.addToast).toHaveBeenCalledWith('Pick your country first.');
  });
});
