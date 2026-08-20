import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_cyberdefense.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_cyberdefense.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Cyber Defense deep-dive hardening', () => {
  it('keeps password samples out of persisted tool data and labels the classroom boundary', () => {
    expect(source).toContain("var _cyberPasswordSample = '';");
    expect(source).toContain('var pwInput         = _cyberPasswordSample;');
    expect(source).toContain('The sample stays out of saved progress');
    expect(source).toContain('Never type a password you actually use');
    expect(source).not.toContain('pwInput: e.target.value');
    expect(source).not.toContain('target: target, entropy:');
    expect(source).not.toContain('password: pw');
  });

  it('uses cryptographic randomness and does not fabricate breach counts', () => {
    expect(source).toContain("typeof cryptoApi.getRandomValues !== 'function'");
    expect(source).toContain('cryptoApi.getRandomValues(sample)');
    expect(source).toContain('Demo Blocklist Check');
    expect(source).toContain('small built-in teaching list');
    expect(source).not.toContain('Math.floor(Math.random() * 500000)');
    expect(source).not.toContain('appeared in \' + pwBreachResult.count');
  });

  it('keeps secure random indices inside the requested range', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const randomIndex = window.__cyberDefensePure.secureRandomIndex;
    expect(randomIndex(0)).toBeNull();
    for (let i = 0; i < 64; i++) {
      const value = randomIndex(17);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(17);
    }
  });

  it('round-trips UTF-8 XOR demonstrations without presenting them as secure encryption', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const pure = window.__cyberDefensePure;
    const encoded = pure.xorEncodeBase64('Hello, 世界 👋', 42);
    expect(pure.xorDecodeBase64(encoded, 42)).toBe('Hello, 世界 👋');
    expect(source).toContain('Learning transformations, not secure encryption');
    expect(source).toContain('Base64 in the output is encoding, not encryption');
    expect(source).toContain('reviewed cryptographic libraries and authenticated encryption');
  });

  it('teaches the current length and blocklist model without mandatory composition rules', () => {
    expect(source).toContain('NIST SP 800-63B-4 centers length and blocklists');
    expect(source).toContain('15+ characters (single factor)');
    expect(source).toContain('forced symbol and number rules are not a substitute for length');
    expect(source).toContain('Uniform-random search-space estimate');
  });

  it('renders a labelled tab interface and accessible strength meter', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'password' } });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-describedby="cyberd-learning-brief-title cyberd-learning-brief-start cyberd-learning-brief-decision"');
    expect(html).toContain('role="meter"');
    expect(html).toContain('id="cyber-password-safety-note"');
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
  });

  it('includes narrow-screen overflow and focus-visible protections', () => {
    expect(source).toContain('@media (max-width: 800px)');
    expect(source).toContain('.cyberd-tabs { overflow-x: auto');
    expect(source).toContain('#cyber-defense-region button:focus-visible');
    expect(source).toContain('#cyber-defense-region select:focus-visible');
    expect(source).toContain('#cyber-defense-region a:focus-visible');
  });

  it('makes packet triage keyboard-operable and teaches uncertainty', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'network',
      netPackets: [{ id: 0, proto: 'HTTPS', src: '10.0.0.2', dst: '198.51.100.4', port: 443, payload: 'TLS data', suspicious: false, reason: 'Expected for this scenario' }],
      netFlagged: []
    } });
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('with a keyboard, use Tab and then Enter or Space');
    expect(source).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source).toContain('Ports are clues, not verdicts');
    expect(source).toContain('false alert');
    expect(source).toContain('missed threat');
  });

  it('uses a transparent weakest-link defense model and renders logged evidence', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'defenseHunt',
      defenseHunt: { detection: 80, response: 80, training: 20, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [{ d: 80, r: 80, t: 20, st: 'lost' }] }
    } });
    expect(html).toContain('weakest capability sets the outcome band');
    expect(html).toContain('Observation log (1/8)');
    expect(html).toContain('Compromise (data lost)');
    expect(source).toContain('Math.min(iq.detection, iq.response, iq.training)');
    expect(source).not.toContain('iq.detection * 0.4 + iq.response * 0.35 + iq.training * 0.25');
  });

  it('teaches a reusable social-engineering response without unstable statistics', () => {
    expect(source).toContain("'Pause \\u2192 Verify \\u2192 Report. '");
    expect(source).toContain('verify through a known official channel');
    expect(source).toContain('report the attempt so others can be protected');
    expect(source).not.toContain('FBI reported $241 million');
    expect(source).not.toContain('Over 100,000 tech support scam reports');
    expect(source).not.toContain('48% of USB drives');
  });

  it('strictly validates AI-generated phishing cases before using them', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const sanitize = window.__cyberDefensePure.sanitizeGeneratedPhishEmail;
    const raw = {
      from: 'alerts@example.test', fromDisplay: 'Example Alerts', subject: 'Review\u0000 this alert',
      body: 'Open the official app to review this event.', link: 'https://example.test/review', isPhish: false,
      flags: ['Known domain', 'No forced action'],
      clues: [
        { zone: 'sender', icon: 'S', label: 'Sender', desc: 'Known domain', suspicious: false },
        { zone: 'subject', icon: 'Q', label: 'Subject', desc: 'Neutral wording', suspicious: false },
        { zone: 'body', icon: 'B', label: 'Body', desc: 'No credential request', suspicious: false }
      ]
    };
    const clean = sanitize(raw, 'hard');
    expect(clean.isPhish).toBe(false);
    expect(clean.subject).toBe('Review this alert');
    expect(clean.difficulty).toBe('hard');
    expect(sanitize({ ...raw, isPhish: 'false' }, 'hard')).toBeNull();
    expect(sanitize({ ...raw, clues: [{ zone: 'script', label: 'Bad', desc: 'Bad', suspicious: true }] }, 'hard')).toBeNull();
  });

  it('scopes timed triage to the active phishing tab and exposes its time accessibly', () => {
    expect(source).toContain("cyberTab === 'phish' && phishMode === 'triage'");
    expect(source).toContain("phishTab.getAttribute('aria-selected') !== 'true'");
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'phish', phishMode: 'triage', triageActive: true, triageTimeLeft: 8
    } });
    clearTimeout(window._cyberTriageTimer);
    expect(html).toContain('role="timer"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="8"');
    expect(html).toContain('8 seconds remaining');
  });

  it('makes investigation controls stateful and teaches post-verdict response', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const investigation = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'phish', phishMode: 'investigate' } });
    expect(investigation).toContain('aria-pressed="false"');
    expect(investigation).toContain('aria-expanded="false"');
    expect(investigation).toContain('aria-controls="cyber-email-headers"');
    const recap = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'phish', phishMode: 'investigate', phishAnswer: 'wrong', casesClosed: 1
    } });
    expect(recap).toContain('Respond safely');
    expect(recap).toContain('official phishing-report process');
    expect(recap).toContain('Already interacted?');
    expect(recap).toContain('sign out other sessions');
  });

  it('guards verdicts against repeat submission and updates case state atomically', () => {
    expect(source).toContain('if (phishAnswer || !activeEmail) return;');
    expect(source).toContain("phishScore: phishScore + (isCorrect ? 1 : 0)");
    expect(source).toContain('triageActive: false');
    expect(source).not.toContain("upd('phishAnswer', isCorrect ? 'correct' : 'wrong')");
  });

  it('shows phishing difficulty only where it has an effect and avoids duplicate AI icon text', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const phishing = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'phish' } });
    expect(phishing).toContain('aria-label="Phishing case difficulty"');
    expect(phishing).toContain('Email level:');
    expect(phishing).toContain('AI Case');
    expect(phishing).not.toContain('🤖 🤖 AI Case');
    const password = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'password' } });
    expect(password).not.toContain('Phishing case difficulty');
    expect(password).not.toContain('Email level:');
    expect(password).toContain('Cyber Defense experience points');
  });

  it('uses mode-specific decision guidance and keeps mobile verdict actions reachable', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const network = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'network' } });
    expect(network).toContain('1. Observe');
    expect(network).toContain('2. Correlate');
    expect(network).toContain('3. Escalate');
    expect(network).not.toContain('Resist urgency and do not share, pay, click, or connect');
    const social = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'social' } });
    expect(social).toContain('Pause → Verify → Report');
    expect(social).toContain('verify through a known official channel');
    const phishing = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'phish', phishMode: 'investigate', cluesFound: [0, 1]
    } });
    expect(phishing).toContain('cyberd-verdict-actions');
    expect(phishing).toContain('aria-label="Choose your email verdict"');
    expect(source).toContain('.cyberd-verdict-actions { position: sticky');
  });

  it('improves compact mobile wayfinding and uses inclusive control instructions', () => {
    expect(source).toContain('cyberd-header-controls--compact');
    expect(source).toContain('.cyberd-header-icon { display: none');
    expect(source).toContain("inline: 'center'");
    expect(source).toContain('window._cyberCenteredLearningTab');
    expect(source).toContain('Select the investigation buttons around the message');
    expect(source).not.toContain('Click the magnifying glasses to investigate');
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const password = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'password' } });
    expect(password).toContain('aria-label="Show password"');
    expect(password).toContain('>Show</button>');
    const network = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'network',
      netPackets: [{ id: 1, proto: 'HTTPS', src: '10.0.0.2', dst: '198.51.100.4', port: 443, payload: 'TLS data', suspicious: false, reason: 'Expected traffic' }]
    } });
    expect(network).toContain('id="cyber-packet-table-help"');
    expect(network).toContain('aria-describedby="cyber-packet-table-help"');
    expect(network).toContain('Scroll sideways to inspect every field');
    expect(network).toContain('When your evidence review is complete');
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides mode-aware visual hierarchy with reduced-motion safeguards', () => {
    expect(source).toContain("'data-cyber-mode': cyberTab");
    expect(source).toContain('#cyber-defense-region[data-cyber-mode="password"]');
    expect(source).toContain('#cyber-defense-region[data-cyber-mode="network"]');
    expect(source).toContain('.cyberd-tab[aria-selected="true"]');
    expect(source).toContain("className: 'cyberd-tab-icon', 'aria-hidden': true");
    expect(source).toContain('@keyframes cyberdPanelReveal');
    expect(source).toContain('.cyberd-content, .cyberd-status-dot { animation: none !important; }');
    expect(source).toContain('.cyberd-readiness');
    expect(source).toContain("'data-progress': progressState");
  });

  it('surfaces cross-module readiness without requiring a perfect score', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'network',
      casesClosed: 1,
      pwSampleTested: true,
      solvedCiphers: { demo: true },
      netRound: 1
    } });
    expect(html).toContain('3/7 ready');
    expect(html).toContain('data-progress="complete"');
    expect(html).toContain('aria-label="3 of 7 Cyber Defense modules ready"');
  });

  it('adds reflection and transfer guidance after a completed activity', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const phishing = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'phish', phishAnswer: 'correct' } });
    expect(phishing).toContain('Reflect &amp; transfer');
    expect(phishing).toContain('Next in real life:');
    const network = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'network', netShowAnswer: true } });
    expect(network).toContain('Make the lesson portable');
  });

  it('turns readiness into an actionable learning path', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const start = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'network' } });
    expect(start).toContain('Start here');
    expect(start).toContain('Start capture, then read each packet as a bundle of signals.');
    const afterPhishing = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'phish', casesClosed: 1 } });
    expect(afterPhishing).toContain('Continue: Password Forge');
    expect(afterPhishing).toContain('aria-label="Continue learning with Password Forge"');
  });

  it('makes the reusable decision lens explicit in every mission brief', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    ['phish', 'password', 'cipher', 'network', 'social', 'warroom', 'defenseHunt'].forEach((tab) => {
      const html = renderTool('cyberDefense', { cyberDefense: { cyberTab: tab } });
      expect(html).toContain('Decision lens');
      expect(html).toContain('aria-label="Decision lens"');
    });
    const network = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'network' } });
    expect(network).toContain('investigate before you contain');
  });

  it('counts an answered social scenario as completed even when the learner misses it', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const social = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'social', seQuizAnswer: 'wrong', seQuizIdx: 0, seQuizScore: 0
    } });
    expect(social).toContain('1/7 ready');
    expect(social).toContain('data-progress="complete"');
    expect(social).toContain('role="group" aria-label="1 of 7 Cyber Defense modules ready"');
  });

  it('announces each learning mode progress state in its tab name', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const html = renderTool('cyberDefense', { cyberDefense: {
      cyberTab: 'network', casesClosed: 1, pwSampleTested: true, netRound: 1
    } });
    expect(html).toContain('aria-label="Cyber Detective, module ready"');
    expect(html).toContain('aria-label="Password Forge, module ready"');
    expect(html).toContain('aria-label="Traffic Analyzer, module in progress"');
    expect(html).toContain('aria-label="Cipher Lab, module not started"');
    expect(source).toContain("announceToSR(nextTabMeta.label + '. ' + nextBrief.title + '. Start here: ' + nextBrief.firstMove)");
  });

  it('announces the next module objective when a tab is activated', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const announcements = [];
    const store = newStore({ cyberDefense: { cyberTab: 'phish' } });
    const ctx = makeCtx({ announceToSR: (message) => announcements.push(message) }, store);
    const tree = cfg.render(ctx);
    let target = null;
    const visit = (node) => {
      if (!node || target) return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (typeof node !== 'object') return;
      if (node.props?.id === 'cyber-tab-network') { target = node; return; }
      visit(node.props?.children);
    };
    visit(tree);
    expect(target).toBeTruthy();
    target.props.onClick();
    expect(announcements).toContain('Traffic Analyzer. Correlate signals before escalating. Start here: Start capture, then read each packet as a bundle of signals.');
  });

  it('opens every learning mode with a transfer-oriented mission brief', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    ['phish', 'password', 'cipher', 'network', 'social', 'warroom', 'defenseHunt'].forEach((tab) => {
      const html = renderTool('cyberDefense', { cyberDefense: { cyberTab: tab } });
      expect(html).toContain('Mission brief');
      expect(html).toContain('Look for:');
      expect(html).toContain('Take away:');
      expect(html).toContain('Module ');
    });
  });

  it('adds an accessible 2D reasoning chain to every mission brief', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
    const network = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'network' } });
    expect(network).toContain('cyberd-learning-brief__flow-grid');
    expect(network).toContain('Reasoning chain');
    expect(network).toContain('role="img"');
    expect(network).toContain('Signal: multiple indicators + baseline. Decision: investigate before you contain. Action: investigate, then contain.');
    expect(network).toContain('Trace the evidence before you act.');
    const cipher = renderTool('cyberDefense', { cyberDefense: { cyberTab: 'cipher' } });
    expect(cipher).toContain('Signal: operation + key + threat model.');
    expect(cipher).toContain('Action: never invent crypto.');
  });
});
