/**
 * stem_tool_cyberdefense.js - Cyber Defense Lab
 *
 * Phishing detective, password strength forge, cipher playground.
 * Digital citizenship and cybersecurity fundamentals.
 *
 * Registered tool ID: "cyberDefense"
 * Registry: window.StemLab.registerTool()
 */
(function () {
  'use strict';

  // ── Audio (auto-injected) ──
  var _cyberdAC = null;
  function getCyberdAC() { if (!_cyberdAC) { try { _cyberdAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_cyberdAC && _cyberdAC.state === "suspended") { try { _cyberdAC.resume(); } catch(e) {} } return _cyberdAC; }
  function cyberdTone(f,d,tp,v) { var ac = getCyberdAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCyberdClick() { if (window.__cyberWarMuted) return; cyberdTone(600, 0.03, "sine", 0.04); }
  // War Room outcome SFX — distinct tones for each resolution
  function sfxWarMitigated() { if (window.__cyberWarMuted) return; cyberdTone(523, 0.08, "sine", 0.05); setTimeout(function(){ cyberdTone(659, 0.08, "sine", 0.05); }, 80); setTimeout(function(){ cyberdTone(784, 0.14, "sine", 0.05); }, 160); }
  function sfxWarDetected()  { if (window.__cyberWarMuted) return; cyberdTone(440, 0.1, "triangle", 0.05); setTimeout(function(){ cyberdTone(554, 0.12, "triangle", 0.05); }, 110); }
  function sfxWarSucceeded() { if (window.__cyberWarMuted) return; cyberdTone(220, 0.2, "sawtooth", 0.04); setTimeout(function(){ cyberdTone(165, 0.3, "sawtooth", 0.04); }, 180); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-cyberdefense')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-cyberdefense';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Inject War Room keyframe animations + focus-visible a11y styles (respects prefers-reduced-motion)
  (function() {
    if (document.getElementById('allo-cyberd-keyframes')) return;
    var style = document.createElement('style');
    style.id = 'allo-cyberd-keyframes';
    style.textContent = [
      '@keyframes warPulse {',
      '  0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }',
      '  50% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(239,68,68,0); }',
      '}',
      '@keyframes warVictory {',
      '  0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }',
      '  50% { transform: scale(1.25) rotate(8deg); opacity: 1; }',
      '  100% { transform: scale(1) rotate(0); opacity: 1; }',
      '}',
      '@keyframes warShake {',
      '  0%,100% { transform: translateX(0); }',
      '  25% { transform: translateX(-3px); }',
      '  75% { transform: translateX(3px); }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .war-pulse, .war-victory, .war-shake { animation: none !important; }',
      '}',
      // Focus-visible styles — show a clear keyboard-focus outline on any button, input, textarea, or role-switch/radio inside the War Room
      '.allo-warroom-root button:focus-visible,',
      '.allo-warroom-root input:focus-visible,',
      '.allo-warroom-root textarea:focus-visible,',
      '.allo-warroom-root select:focus-visible,',
      '.allo-warroom-root a:focus-visible,',
      '.allo-warroom-root [role="switch"]:focus-visible,',
      '.allo-warroom-root [role="radio"]:focus-visible {',
      '  outline: 2px solid #c7d2fe !important;',
      '  outline-offset: 2px !important;',
      '  box-shadow: 0 0 0 4px rgba(99,102,241,0.25) !important;',
      '}',
      // Skip-to-main link (invisible until focused for keyboard users)
      '.allo-warroom-skip-link {',
      '  position: absolute; top: -40px; left: 10px; z-index: 9999;',
      '  padding: 8px 16px; background: #1e1b4b; color: #c7d2fe; text-decoration: none; border-radius: 6px;',
      '  font-size: 12px; font-weight: 800; border: 2px solid #a5b4fc; transition: top 0.15s ease-in-out;',
      '}',
      '.allo-warroom-skip-link:focus { top: 10px; }',
      // Visually-hidden utility class (for screen-reader-only headings)
      '.allo-sr-only {',
      '  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;',
      '  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  window.StemLab.registerTool('cyberDefense', {
    name: 'Cyber Defense Lab',
    icon: '\uD83D\uDEE1\uFE0F',
    category: 'tech',
    questHooks: [
      { id: 'phish_score_3', label: 'Identify 3 phishing emails correctly', icon: '\uD83C\uDFA3', check: function(d) { return (d.phishScore || 0) >= 3; }, progress: function(d) { return (d.phishScore || 0) + '/3'; } },
      { id: 'phish_score_5', label: 'Identify 5 phishing emails correctly', icon: '\uD83D\uDEE1\uFE0F', check: function(d) { return (d.phishScore || 0) >= 5; }, progress: function(d) { return (d.phishScore || 0) + '/5'; } },
      { id: 'phish_streak_3', label: 'Get a 3-answer phishing streak', icon: '\uD83D\uDD25', check: function(d) { return (d.phishStreak || 0) >= 3; }, progress: function(d) { return (d.phishStreak || 0) + '/3 streak'; } },
      { id: 'test_password', label: 'Test a password in the strength checker', icon: '\uD83D\uDD10', check: function(d) { return !!(d.pwInput && d.pwInput.length > 0); }, progress: function(d) { return d.pwInput ? 'Tested!' : 'Enter a password'; } },
      { id: 'warroom_complete_campaign', label: 'Complete a SOC War Room campaign', icon: '\u2694\uFE0F', check: function(d) { return (d.warRoomCampaignsCompleted || 0) >= 1; }, progress: function(d) { return (d.warRoomCampaignsCompleted || 0) + '/1'; } },
      { id: 'warroom_win_analyst', label: 'Win a campaign on Analyst difficulty', icon: '\uD83C\uDF96\uFE0F', check: function(d) { return !!d.warRoomWonAnalyst; }, progress: function(d) { return d.warRoomWonAnalyst ? 'Achieved!' : 'In progress'; } },
      { id: 'warroom_perfect_defense', label: 'Zero assets lost on Threat Hunter difficulty', icon: '\uD83D\uDEE1\uFE0F', check: function(d) { return !!d.warRoomPerfectDefense; }, progress: function(d) { return d.warRoomPerfectDefense ? 'Achieved!' : 'In progress'; } }
    ],
    render: function (ctx) {
    var React = ctx.React;
    var el = React.createElement;
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;

          // ── State (hook-free: reads from ctx.toolData) ──
          var d = (ctx.toolData && ctx.toolData.cyberDefense) || {};
          var upd = function(key, val) {
            ctx.setToolData(function(prev) {
              return Object.assign({}, prev, {
                cyberDefense: Object.assign({}, (prev && prev.cyberDefense) || {},
                  typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })())
              });
            });
          };

          var cyberTab       = d.cyberTab || 'phish';
          var phishIdx        = d.phishIdx || 0;
          var phishAnswer     = d.phishAnswer || null;
          var phishScore      = d.phishScore || 0;
          var phishStreak     = d.phishStreak || 0;
          var pwInput         = d.pwInput || '';
          var cipherMode      = d.cipherMode || 'caesar';
          var cipherInput     = d.cipherInput || '';
          var caesarShift      = d.caesarShift != null ? d.caesarShift : 3;
          var cipherEncode    = d.cipherEncode != null ? d.cipherEncode : true;
          var cipherChallenge = d.cipherChallenge || '';
          var challengeSolved = d.challengeSolved || false;
          var difficulty      = d.difficulty || 'medium';
          var pwChallengeDone = d.pwChallengeDone || false;
          var phishMode       = d.phishMode || 'investigate';
          var cluesFound      = d.cluesFound || [];
          var casesClosed     = d.casesClosed || 0;
          var triageTimeLeft  = d.triageTimeLeft != null ? d.triageTimeLeft : 15;
          var triageActive    = d.triageActive || false;
          var evidenceExpanded = d.evidenceExpanded || false;
          var aiEmailLoading  = d.aiEmailLoading || false;
          var aiGeneratedEmail = d.aiGeneratedEmail || null;
          var aiEmailHistory  = d.aiEmailHistory || [];
          // Password Forge enhancements
          var pwShowPassword  = d.pwShowPassword || false;
          var pwBruteAnim     = d.pwBruteAnim || null; // { running, attempts, speed, found }
          var pwBreachResult  = d.pwBreachResult || null; // { checked, breached, count }
          var pwGenLength     = d.pwGenLength || 16;
          var pwGenInclude    = d.pwGenInclude || { upper: true, lower: true, digits: true, symbols: true };
          // Network traffic analyzer
          var netPackets      = d.netPackets || [];
          var netFlagged      = d.netFlagged || [];
          var netScore        = d.netScore || 0;
          var netRound        = d.netRound || 0;
          var netShowAnswer   = d.netShowAnswer || false;
          // Social engineering quiz
          var seQuizIdx       = d.seQuizIdx || 0;
          var seQuizAnswer    = d.seQuizAnswer || null;
          var seQuizScore     = d.seQuizScore || 0;
          var seQuizStreak    = d.seQuizStreak || 0;
          // AI threat briefing
          var threatBriefing  = d.threatBriefing || null;
          var threatLoading   = d.threatLoading || false;
          // SOC War Room (red team / blue team simulation)
          var warRoomActive       = d.warRoomActive || false;
          var warRoomRound        = d.warRoomRound || 1;           // 1..6
          var warRoomDifficulty   = d.warRoomDifficulty || 'rookie'; // rookie | analyst | threatHunter
          var warRoomKillChain    = d.warRoomKillChain || [];       // [{stage, red, outcome, assetsLost}]
          var warRoomRedAction    = d.warRoomRedAction || null;     // current round red card
          var warRoomAlerts       = d.warRoomAlerts || [];          // [{id, text, real}]
          var warRoomAlertsSeen   = d.warRoomAlertsSeen || [];      // ids investigated this round
          var warRoomBudget       = d.warRoomBudget != null ? d.warRoomBudget : 12;
          var warRoomAssets       = d.warRoomAssets || { users: 10, servers: 5, data: 100 };
          var warRoomAssetsLost   = d.warRoomAssetsLost || { users: 0, servers: 0, data: 0 };
          var warRoomLog          = d.warRoomLog || [];             // strings
          var warRoomBluePlays    = d.warRoomBluePlays || [];       // blue card ids played this round
          var warRoomVerdict      = d.warRoomVerdict || null;       // 'won' | 'lost' | null
          var warRoomAARLoading   = d.warRoomAARLoading || false;
          var warRoomAAR          = d.warRoomAAR || null;
          var warRoomEscalateUsed = d.warRoomEscalateUsed || false;
          var warRoomCampaignsCompleted = d.warRoomCampaignsCompleted || 0;
          var warRoomDetections   = d.warRoomDetections || 0;       // count of detected attacks
          var warRoomMitigations  = d.warRoomMitigations || 0;      // count of fully mitigated attacks
          var warRoomRoundResolved = d.warRoomRoundResolved || false; // blocks further plays after resolution
          var warRoomLastResolution = d.warRoomLastResolution || null; // {outcome, assetsLost, xpDelta, matchedPlays, idealPlays, lesson}
          var warRoomCampaignTheme = d.warRoomCampaignTheme || 'mixed'; // mixed | ransomware | bec | insider
          var warRoomHintsUsed = d.warRoomHintsUsed || 0;
          var warRoomHintRevealed = d.warRoomHintRevealed || false;
          var warRoomGlossaryOpen = d.warRoomGlossaryOpen || false;
          var warRoomAICardLoading = d.warRoomAICardLoading || false;
          var warRoomFreeUsed = d.warRoomFreeUsed || []; // card ids whose free use is spent this campaign
          var warRoomTimeLeft = d.warRoomTimeLeft != null ? d.warRoomTimeLeft : 90;
          var warRoomAchievements = d.warRoomAchievements || {};
          var warRoomCampaignAchievements = d.warRoomCampaignAchievements || [];
          var warRoomTotalCombos = d.warRoomTotalCombos || 0;
          var warRoomTimedOutAny = d.warRoomTimedOutAny || false;
          var warRoomStoryMode = d.warRoomStoryMode != null ? d.warRoomStoryMode : (warRoomCampaignsCompleted === 0);
          var warRoomCampaignId = d.warRoomCampaignId || null;
          // Hot-seat (classroom pass-and-play) mode
          var warRoomHotSeatEnabled = d.warRoomHotSeatEnabled || false;
          var warRoomHotSeatPlayers = (d.warRoomHotSeatPlayers && d.warRoomHotSeatPlayers.length >= 2) ? d.warRoomHotSeatPlayers : ['Player 1', 'Player 2'];
          var warRoomHotSeatCurrentIdx = d.warRoomHotSeatCurrentIdx || 0;
          var warRoomHotSeatPassScreen = d.warRoomHotSeatPassScreen || false;
          var warRoomHotSeatStats = d.warRoomHotSeatStats || {}; // { playerIdx: { rounds, detections, mitigations, combos } }
          var warRoomPlainLanguage = d.warRoomPlainLanguage || false;
          var warRoomA11y = d.warRoomA11y || { dyslexiaFont: false, largeText: false, highContrast: false, colorBlind: false };
          // Outcome colors — remapped when color-blind mode is active (red/green → orange/blue for deuteranopia)
          var warOutcomeColors = warRoomA11y.colorBlindMode || warRoomA11y.colorBlind
            ? { mitigated: '#3b82f6', mitigatedSoft: '#93c5fd', detected: '#eab308', detectedSoft: '#fde047', succeeded: '#ea580c', succeededSoft: '#fdba74' }
            : { mitigated: '#22c55e', mitigatedSoft: '#86efac', detected: '#3b82f6', detectedSoft: '#93c5fd', succeeded: '#ef4444', succeededSoft: '#fca5a5' };
          var warRoomCampaignHistory = d.warRoomCampaignHistory || [];
          var warRoomTeacherDashOpen = d.warRoomTeacherDashOpen || false;
          // Live session broadcast
          var warRoomLiveMode = d.warRoomLiveMode || 'off'; // 'off' | 'hosting' | 'observing'
          var warRoomLiveHostName = d.warRoomLiveHostName || null;
          var warRoomLiveLastSync = d.warRoomLiveLastSync || 0;
          var warRoomChatDraft = d.warRoomChatDraft || '';
          var warRoomChatMessages = d.warRoomChatMessages || [];
          var warRoomHelpOpen = d.warRoomHelpOpen || false;
          var warRoomWelcomeSeen = d.warRoomWelcomeSeen || false;
          var warRoomSoundMuted = d.warRoomSoundMuted || false;
          var warRoomPlaybookOpen = d.warRoomPlaybookOpen || false;
          var warRoomStatsOpen = d.warRoomStatsOpen || false;
          var warRoomAICoachTip = d.warRoomAICoachTip || null;
          var warRoomAICoachLoading = d.warRoomAICoachLoading || false;
          // Per-play log for Undo: stack of { cardId, costPaid, wasFree, markedEscalate } pushed on each play
          var warRoomPlayLog = d.warRoomPlayLog || [];
          // Snapshot of round-start state for Try Again. Set on round advance / campaign start.
          var warRoomRoundStartSnapshot = d.warRoomRoundStartSnapshot || null;
          var warRoomRetryUsedThisRound = !!d.warRoomRetryUsedThisRound;
          // Focused alert index (for keyboard cycling)
          var warRoomAlertFocusIdx = typeof d.warRoomAlertFocusIdx === 'number' ? d.warRoomAlertFocusIdx : -1;
          var warRoomReflection = d.warRoomReflection || '';
          // Challenge presets / house rules (selected on start, locked for the campaign)
          var warRoomHouseRulesDraft = d.warRoomHouseRulesDraft || { noEscalate: false, tightBudget: false, allStealth: false, noCombos: false };
          var warRoomHouseRulesActive = d.warRoomHouseRulesActive || null; // snapshot of rules applied to the CURRENT campaign
          var warRoomIsBossMode = !!d.warRoomIsBossMode;
          var warRoomFocusMode = !!d.warRoomFocusMode;
          var warRoomScratchpad = d.warRoomScratchpad || '';
          var warRoomScratchOpen = !!d.warRoomScratchOpen;
          // Replay state: { historyIdx: number, stepIdx: number, playing: bool }
          var warRoomReplay = d.warRoomReplay || null;

          // â”€â”€ Phishing Email Data (with investigation clues) â”€â”€
          var phishEmails = [
            // Easy
            { from: 'security@g00gle-support.com', fromDisplay: 'Google Security Team', subject: '\u26A0\uFE0F URGENT: Your account will be suspended!', body: 'Dear user, we detected unusual activity on your account. Click below IMMEDIATELY or your account will be permanently deleted within 24 hours.', link: 'http://g00gle-support.com/verify-now', isPhish: true, difficulty: 'easy',
              flags: ['Misspelled domain (g00gle with zeros)', 'Urgency/fear tactics ("IMMEDIATELY", "permanently deleted")', 'Generic greeting ("Dear user")', 'Suspicious link domain'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'g00gle-support.com uses zeros instead of o\'s \u2014 a classic spoofing trick', suspicious: true },
                { zone: 'subject', icon: '\u26A1', label: 'Urgency Tactic', desc: '"URGENT" and threats of suspension create panic to bypass your judgment', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Generic Greeting', desc: '"Dear user" \u2014 real companies use your actual name', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'HTTP (not HTTPS) link to a fake domain \u2014 never click these!', suspicious: true }
              ] },
            { from: 'noreply@school.edu', fromDisplay: 'School Library', subject: 'Library Book Due Reminder', body: 'Hi! This is a reminder that "Charlotte\'s Web" is due back to the library by Friday. Please return it to the front desk. Thanks!', link: null, isPhish: false, difficulty: 'easy',
              flags: ['Legitimate school domain', 'Specific book title', 'No urgent threats', 'No suspicious links'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'school.edu is a legitimate educational domain', suspicious: false },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Specific Details', desc: 'Mentions a specific book title \u2014 real messages have real details', suspicious: false },
                { zone: 'subject', icon: '\u26A1', label: 'Tone Check', desc: 'Friendly reminder with no threats or urgency', suspicious: false }
              ] },
            { from: 'prizes@win-big-now.net', fromDisplay: 'Prize Award Center', subject: '\uD83C\uDF89 YOU WON $1,000,000!!!', body: 'Congratulations! You have been randomly selected to receive ONE MILLION DOLLARS! Send us your full name, address, and parent\'s credit card number to claim your prize NOW!', link: 'http://win-big-now.net/claim', isPhish: true, difficulty: 'easy',
              flags: ['Too good to be true', 'Asks for personal/financial info', 'Random prize from unknown sender', 'Suspicious domain'],
              clues: [
                { zone: 'subject', icon: '\u26A1', label: 'Too Good To Be True', desc: 'Winning $1M from a random email? That\'s never real', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Asks for Personal Info', desc: 'Requests credit card number \u2014 legitimate prizes NEVER ask for payment info', suspicious: true },
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'win-big-now.net is a sketchy, unfamiliar domain', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'Links to the same suspicious domain \u2014 designed to steal your info', suspicious: true }
              ] },
            // Medium
            { from: 'support@amaz0n-orders.com', fromDisplay: 'Amazon Order Support', subject: 'Problem with your recent order #38291', body: 'We were unable to process payment for your recent order. Please update your payment information within 48 hours to avoid cancellation. Click here to update.', link: 'http://amaz0n-orders.com/update-payment', isPhish: true, difficulty: 'medium',
              flags: ['Misspelled domain (amaz0n with zero)', 'Creates urgency (48 hours)', 'Vague order reference', 'Link to suspicious domain'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'amaz0n-orders.com \u2014 note the zero! Real Amazon uses amazon.com', suspicious: true },
                { zone: 'subject', icon: '\u26A1', label: 'Vague Reference', desc: 'Generic order number \u2014 phishers use random numbers hoping you recently ordered something', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Urgency Pressure', desc: '"48 hours" deadline creates pressure to act without thinking', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'Links to amaz0n-orders.com, not amazon.com', suspicious: true }
              ] },
            { from: 'teacher@myschool.edu', fromDisplay: 'Mrs. Johnson', subject: 'Science Fair Project Update', body: 'Hi! Just a reminder that science fair projects are due next Tuesday. Please bring your display board and any materials. Let me know if you need extra time. - Mrs. Johnson', link: null, isPhish: false, difficulty: 'medium',
              flags: ['Legitimate school domain', 'Specific teacher name', 'Normal classroom request', 'No links or downloads'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'myschool.edu \u2014 legitimate school domain', suspicious: false },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Personal Tone', desc: 'Signed by a specific teacher, offers extra time \u2014 normal teacher behavior', suspicious: false },
                { zone: 'subject', icon: '\u26A1', label: 'Normal Request', desc: 'A reminder about a real assignment with a reasonable deadline', suspicious: false }
              ] },
            { from: 'help@paypa1-secure.com', fromDisplay: 'PayPal Security', subject: 'Unusual login from new device', body: 'We noticed a login to your account from a new device in Russia. If this wasn\'t you, secure your account immediately by verifying your identity below.', link: 'http://paypa1-secure.com/verify', isPhish: true, difficulty: 'medium',
              flags: ['Misspelled domain (paypa1 with number 1)', 'Fear of unauthorized access', 'Link to fake domain', 'Real PayPal would say paypal.com'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'paypa1-secure.com uses the number 1 instead of lowercase L \u2014 very sneaky!', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Fear Tactic', desc: '"login from Russia" creates fear of being hacked', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'Real PayPal links go to paypal.com, not paypa1-secure.com', suspicious: true }
              ] },
            { from: 'newsletter@nationalgeographic.com', fromDisplay: 'National Geographic Kids', subject: 'This Week: Amazing Ocean Creatures!', body: 'Dive into this week\'s feature about bioluminescent sea creatures! Watch videos, play games, and learn about the deep ocean. New content every Wednesday.', link: 'https://kids.nationalgeographic.com/ocean', isPhish: false, difficulty: 'medium',
              flags: ['Legitimate domain', 'Educational content', 'No personal info requested', 'HTTPS link to real site'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'nationalgeographic.com \u2014 a well-known, legitimate organization', suspicious: false },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'HTTPS link to kids.nationalgeographic.com \u2014 real subdomain of real site', suspicious: false },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Content Check', desc: 'Educational content, no personal info requested, no urgency', suspicious: false }
              ] },
            // Hard
            { from: 'it-dept@yourschool.edu.support-portal.com', fromDisplay: 'School IT Department', subject: 'Password Reset Required - Network Maintenance', body: 'Due to scheduled network maintenance this weekend, all students must reset their passwords. Please use the secure portal below to create a new password. This must be completed before Friday.', link: 'https://yourschool.edu.support-portal.com/reset', isPhish: true, difficulty: 'hard',
              flags: ['Subdomain trick (school name in a different domain)', 'Actual domain is support-portal.com, not yourschool.edu', 'Mass password reset is unusual', 'Real IT would use the actual school domain'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'yourschool.edu.support-portal.com \u2014 the REAL domain is support-portal.com! The school name is just a subdomain trick', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Mass Action Request', desc: '"All students must reset" \u2014 real IT departments don\'t require mass password resets via email', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'Link domain also uses the subdomain trick \u2014 it\'s NOT a school website', suspicious: true },
                { zone: 'subject', icon: '\u26A1', label: 'Urgency Tactic', desc: '"Must be completed before Friday" \u2014 creates a false deadline', suspicious: true }
              ] },
            { from: 'admin@clever.com', fromDisplay: 'Clever Portal', subject: 'New app added to your Clever dashboard', body: 'Your teacher has added "Khan Academy" to your Clever dashboard. Log in to Clever to access it. If you have questions, ask your teacher.', link: 'https://clever.com/login', isPhish: false, difficulty: 'hard',
              flags: ['Legitimate Clever domain', 'Specific app mentioned', 'Directs to official login', 'References teacher'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Domain', desc: 'clever.com \u2014 the real Clever platform used by many schools', suspicious: false },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Link Analysis', desc: 'HTTPS link to clever.com/login \u2014 the official Clever login page', suspicious: false },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Specific Details', desc: 'Names a specific app (Khan Academy) and references your teacher', suspicious: false }
              ] },
            { from: 'friend.sarah@gmail.com', fromDisplay: 'Sarah M.', subject: 'Check out this funny video of you!!', body: 'OMG I found this hilarious video of you from the school assembly!! You HAVE to see it lol. Click here before they take it down!', link: 'http://bit.ly/3xFk2z9', isPhish: true, difficulty: 'hard',
              flags: ['Shortened/obscured URL (bit.ly)', 'Emotional manipulation ("funny video of you")', 'Urgency ("before they take it down")', 'Even real friends\' accounts can be hacked'],
              clues: [
                { zone: 'sender', icon: '\uD83D\uDCE7', label: 'Sender Identity', desc: 'Even gmail.com accounts can be hacked \u2014 the sender could be compromised', suspicious: true },
                { zone: 'body', icon: '\uD83D\uDCDD', label: 'Emotional Bait', desc: '"Funny video of you" targets curiosity and social anxiety', suspicious: true },
                { zone: 'link', icon: '\uD83D\uDD17', label: 'Shortened URL', desc: 'bit.ly hides the real destination \u2014 never click shortened links from unexpected messages', suspicious: true },
                { zone: 'subject', icon: '\u26A1', label: 'Urgency Tactic', desc: '"Before they take it down" creates FOMO to make you click without thinking', suspicious: true }
              ] }
          ];

          var difficultyFilter = difficulty === 'easy' ? 'easy' : difficulty === 'medium' ? 'medium' : 'hard';
          var filteredEmails = phishEmails.filter(function(e) {
            if (difficulty === 'easy') return e.difficulty === 'easy';
            if (difficulty === 'medium') return e.difficulty === 'easy' || e.difficulty === 'medium';
            return true; // hard = all
          });
          var currentEmail = filteredEmails[phishIdx % filteredEmails.length];

          // â”€â”€ Detective Rank System â”€â”€
          var detectiveRanks = [
            { min: 0, rank: 'Rookie Analyst', icon: '\uD83D\uDD30', color: '#64748b' },
            { min: 3, rank: 'Junior Detective', icon: '\uD83D\uDD0D', color: '#22c55e' },
            { min: 6, rank: 'Cyber Detective', icon: '\uD83D\uDD75\uFE0F', color: '#3b82f6' },
            { min: 10, rank: 'Senior Agent', icon: '\u2B50', color: '#f59e0b' },
            { min: 15, rank: 'Chief Investigator', icon: '\uD83D\uDEE1\uFE0F', color: '#a855f7' }
          ];
          var currentRank = detectiveRanks[0];
          for (var ri = detectiveRanks.length - 1; ri >= 0; ri--) {
            if (casesClosed >= detectiveRanks[ri].min) { currentRank = detectiveRanks[ri]; break; }
          }
          var nextRank = null;
          for (var ni = 0; ni < detectiveRanks.length; ni++) {
            if (detectiveRanks[ni].min > casesClosed) { nextRank = detectiveRanks[ni]; break; }
          }

          // ── Triage Timer (hook-free: state-driven setTimeout) ──
          if (window._cyberTriageTimer) { clearTimeout(window._cyberTriageTimer); window._cyberTriageTimer = null; }
          if (phishMode === 'triage' && triageActive && !phishAnswer && triageTimeLeft > 0) {
            window._cyberTriageTimer = setTimeout(function() {
              upd('triageTimeLeft', triageTimeLeft - 1);
            }, 1000);
          } else if (phishMode === 'triage' && triageActive && !phishAnswer && triageTimeLeft <= 0) {
            upd({ phishAnswer: 'timeout', phishStreak: 0 });
          }

          // ── War Room Timer (Threat Hunter difficulty only; auto-resolves when time hits 0 if plays exist) ──
          if (window._cyberWarRoomTimer) { clearTimeout(window._cyberWarRoomTimer); window._cyberWarRoomTimer = null; }
          var warTimerActive = cyberTab === 'warroom' && d.warRoomActive && d.warRoomDifficulty === 'threatHunter' && !d.warRoomRoundResolved && !d.warRoomVerdict && !d.warRoomHotSeatPassScreen;
          if (warTimerActive && warRoomTimeLeft > 0) {
            window._cyberWarRoomTimer = setTimeout(function() {
              var nextTime = warRoomTimeLeft - 1;
              // Announce key thresholds to screen reader users (30s, 10s warnings)
              if (nextTime === 30 && ctx.announceToSR) ctx.announceToSR('30 seconds remaining in this round.');
              else if (nextTime === 10 && ctx.announceToSR) ctx.announceToSR('10 seconds remaining \u2014 decide now.');
              if (nextTime <= 0 && warRoomBluePlays.length > 0) {
                if (ctx.addToast) ctx.addToast('\u23F0 Time up \u2014 resolving round', 'info');
                upd('warRoomTimeLeft', 0);
                resolveCurrentRound();
              } else {
                upd('warRoomTimeLeft', Math.max(0, nextTime));
              }
            }, 1000);
          }

          // ── Replay auto-advance timer ──
          if (window._cyberWarReplayTimer) { clearTimeout(window._cyberWarReplayTimer); window._cyberWarReplayTimer = null; }
          if (cyberTab === 'warroom' && warRoomReplay && warRoomReplay.playing) {
            var replayHist = (warRoomCampaignHistory || [])[warRoomReplay.historyIdx];
            var replayChain = (replayHist && replayHist.chain) || [];
            if (warRoomReplay.stepIdx < replayChain.length - 1) {
              window._cyberWarReplayTimer = setTimeout(function() {
                upd('warRoomReplay', Object.assign({}, warRoomReplay, { stepIdx: warRoomReplay.stepIdx + 1 }));
              }, 2600);
            } else {
              // Finished auto-advancing — pause at last step
              upd('warRoomReplay', Object.assign({}, warRoomReplay, { playing: false }));
            }
          }

          // ── War Room keyboard shortcuts (reattaches each render; latest closure wins) ──
          if (window._cyberWarRoomKeydown) {
            try { window.removeEventListener('keydown', window._cyberWarRoomKeydown); } catch(e) {}
            window._cyberWarRoomKeydown = null;
          }
          if (cyberTab === 'warroom') {
            window._cyberWarRoomKeydown = function(e) {
              // Ignore if user is typing in a form field or modifier keys are held
              var tag = (e.target && e.target.tagName) || '';
              if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
              var key = e.key;
              // Help toggle — always available
              if (key === '?' || (key === '/' && e.shiftKey)) { e.preventDefault(); upd('warRoomHelpOpen', !warRoomHelpOpen); return; }
              if (key === 'Escape') {
                if (warRoomHelpOpen) { e.preventDefault(); upd('warRoomHelpOpen', false); return; }
                if (warRoomPlaybookOpen) { e.preventDefault(); upd('warRoomPlaybookOpen', false); return; }
                if (warRoomStatsOpen) { e.preventDefault(); upd('warRoomStatsOpen', false); return; }
                if (warRoomGlossaryOpen) { e.preventDefault(); upd('warRoomGlossaryOpen', false); return; }
                if (warRoomTeacherDashOpen) { e.preventDefault(); upd('warRoomTeacherDashOpen', false); return; }
                return;
              }
              // Game shortcuts — only when campaign is active, not observing, not on pass screen
              if (!warRoomActive || warLiveIsObserving) return;
              if (warRoomHotSeatEnabled && warRoomHotSeatPassScreen) return;
              if (warRoomVerdict) return;
              if (warRoomRoundResolved) {
                // Advance shortcut on debrief
                if (key === 'Enter' || key === 'a' || key === 'A') { e.preventDefault(); advanceFromDebrief(); }
                return;
              }
              // Numeric shortcuts: 1..9 play the corresponding blue card
              var num = parseInt(key, 10);
              if (num >= 1 && num <= blueTeamCards.length) {
                e.preventDefault();
                playBlueCard(blueTeamCards[num - 1].id);
                return;
              }
              // Letter shortcuts (case-insensitive)
              var k = key.toLowerCase();
              // Arrow keys cycle focused alert; Enter on a focused unseen alert triggers review
              if (key === 'ArrowDown' || key === 'ArrowUp') {
                if (warRoomAlerts && warRoomAlerts.length > 0) {
                  e.preventDefault();
                  var dir = key === 'ArrowDown' ? 1 : -1;
                  var next = (warRoomAlertFocusIdx < 0 ? 0 : warRoomAlertFocusIdx + dir);
                  if (next < 0) next = warRoomAlerts.length - 1;
                  if (next >= warRoomAlerts.length) next = 0;
                  upd('warRoomAlertFocusIdx', next);
                }
                return;
              }
              if (key === 'Enter' && warRoomAlertFocusIdx >= 0 && warRoomAlertFocusIdx < (warRoomAlerts || []).length && warRoomBluePlays.indexOf('investigate') !== -1) {
                // Review the focused alert if Investigate has been played
                var a = warRoomAlerts[warRoomAlertFocusIdx];
                if (a && warRoomAlertsSeen.indexOf(a.id) === -1) {
                  e.preventDefault();
                  upd('warRoomAlertsSeen', warRoomAlertsSeen.concat([a.id]));
                  sfxCyberdClick();
                  return;
                }
              }
              if (k === 'r' || key === 'Enter') {
                if (warRoomBluePlays.length > 0) { e.preventDefault(); resolveCurrentRound(); }
              } else if (k === 'h') {
                e.preventDefault(); requestHint();
              } else if (k === 'u') {
                if (warRoomPlayLog.length > 0) { e.preventDefault(); undoLastPlay(); }
              }
            };
            try { window.addEventListener('keydown', window._cyberWarRoomKeydown); } catch(e) {}
          }

          // â”€â”€ Clue discovery helper â”€â”€
          function handleClueClick(clueIdx) {
            if (cluesFound.indexOf(clueIdx) === -1) {
              upd('cluesFound', cluesFound.concat([clueIdx]));
            }
          }

          // â”€â”€ Handle Verdict â”€â”€
          function handleVerdict(isSafe) {
            var isCorrect = isSafe ? !activeEmail.isPhish : activeEmail.isPhish;
            var baseXP = 2;
            var evidenceBonus = cluesFound.length >= (activeEmail.clues || []).length ? 2 : (cluesFound.length >= 2 ? 1 : 0);
            var streakBonus = phishStreak >= 2 ? 1 : 0;
            var speedBonus = (phishMode === 'triage' && triageTimeLeft >= 10) ? 2 : 0;
            upd('phishAnswer', isCorrect ? 'correct' : 'wrong');
            if (isCorrect) {
              upd('phishScore', phishScore + 1);
              upd('phishStreak', phishStreak + 1);
              ctx.awardXP('cyberDefense', baseXP + evidenceBonus + streakBonus + speedBonus);
            } else {
              upd('phishStreak', 0);
            }
            upd('casesClosed', casesClosed + 1);
          }

          // â”€â”€ Advance to Next Case â”€â”€
          function advanceCase() {
            upd('phishIdx', phishIdx + 1);
            upd('phishAnswer', null);
            upd('cluesFound', []);
            upd('triageTimeLeft', 15);
            upd('aiGeneratedEmail', null); // clear AI email so next defaults to static pool
            if (phishMode === 'triage') upd('triageActive', true);
          }

          // â”€â”€ AI Email Generator (Gemini-powered with static fallback) â”€â”€
          function generateAIEmail() {
            if (aiEmailLoading) return;
            if (!ctx.callGemini) {
              // No Gemini available â€” silently use next static email
              if (ctx.addToast) ctx.addToast('AI unavailable â€” using practice email', 'info');
              upd('aiGeneratedEmail', null);
              upd('phishIdx', phishIdx + 1);
              upd('phishAnswer', null);
              upd('cluesFound', []);
              return;
            }
            upd('aiEmailLoading', true);
            var diffLabel = difficulty === 'easy' ? 'Easy (obvious red flags)' : difficulty === 'medium' ? 'Medium (subtle cues)' : 'Hard (very realistic, tricky)';
            var avoidList = aiEmailHistory.length > 0 ? '\nAvoid repeating these scenarios: ' + aiEmailHistory.slice(-8).join(', ') + '.' : '';
            var prompt = 'You are a cybersecurity educator generating a realistic email scenario for students to analyze. ' +
              'Difficulty: ' + diffLabel + '.\n' +
              'Randomly decide whether this email is phishing or safe (aim for roughly 50/50 over time).' + avoidList + '\n\n' +
              'Return ONLY valid JSON with this exact structure:\n' +
              '{"from":"<sender email address>","fromDisplay":"<sender display name>","subject":"<email subject line>",' +
              '"body":"<email body text, 2-4 sentences>","link":"<suspicious or legitimate URL, or null if no link>",' +
              '"isPhish":<true or false>,"difficulty":"' + difficulty + '",' +
              '"flags":["<explanation 1>","<explanation 2>","<explanation 3>"],' +
              '"clues":[' +
              '{"zone":"sender","icon":"<emoji>","label":"<short label>","desc":"<what the student discovers>","suspicious":<true/false>},' +
              '{"zone":"subject","icon":"<emoji>","label":"<short label>","desc":"<observation>","suspicious":<true/false>},' +
              '{"zone":"body","icon":"<emoji>","label":"<short label>","desc":"<observation>","suspicious":<true/false>},' +
              '{"zone":"link","icon":"<emoji>","label":"<short label>","desc":"<observation about the URL>","suspicious":<true/false>}' +
              ']}\n\n' +
              'Rules:\n' +
              '- For phishing: use realistic but flawed sender domains, urgency tactics, suspicious links, etc.\n' +
              '- For safe emails: use legitimate-looking domains, professional tone, real company patterns.\n' +
              '- flags: 3-4 educational explanations of why it is phishing or safe.\n' +
              '- clues: exactly 4 clues, one per zone (sender/subject/body/link). If no link, make the link clue about the absence of suspicious URLs.\n' +
              '- suspicious field in clues should be true for red flags, false for legitimate signs.\n' +
              '- Make scenarios diverse: banks, schools, social media, delivery, tech companies, government, healthcare, etc.';

            ctx.callGemini(prompt, true, false, 0.9).then(function(response) {
              try {
                var parsed = typeof response === 'string' ? JSON.parse(response) : response;
                if (parsed && parsed.from && parsed.subject && parsed.body && parsed.flags && parsed.clues && parsed.clues.length >= 3) {
                  // Ensure isPhish is boolean
                  parsed.isPhish = !!parsed.isPhish;
                  parsed.difficulty = parsed.difficulty || difficulty;
                  parsed._aiGenerated = true;
                  upd('aiGeneratedEmail', parsed);
                  upd('phishAnswer', null);
                  upd('cluesFound', []);
                  upd('triageTimeLeft', 15);
                  if (phishMode === 'triage') upd('triageActive', true);
                  upd('aiEmailHistory', aiEmailHistory.concat([parsed.subject.substring(0, 40)]));
                  upd('aiEmailLoading', false);
                  return;
                }
              } catch (e) { /* fall through to fallback */ }
              // Fallback: use next static email
              upd('aiGeneratedEmail', null);
              upd('phishIdx', phishIdx + 1);
              upd('phishAnswer', null);
              upd('cluesFound', []);
              upd('aiEmailLoading', false);
              if (ctx.addToast) ctx.addToast('AI generation failed â€” here\'s a practice email instead', 'info');
            }).catch(function() {
              upd('aiGeneratedEmail', null);
              upd('phishIdx', phishIdx + 1);
              upd('phishAnswer', null);
              upd('cluesFound', []);
              upd('aiEmailLoading', false);
              if (ctx.addToast) ctx.addToast('AI generation failed â€” here\'s a practice email instead', 'info');
            });
          }

          // â”€â”€ Active Email (AI-generated overrides static pool) â”€â”€
          var activeEmail = aiGeneratedEmail || currentEmail;

          // â”€â”€ Password Strength Calculator â”€â”€
          function calcPasswordStrength(pw) {
            if (!pw) return { score: 0, label: 'Empty', color: '#475569', entropy: 0, crackTime: 'N/A', checks: {} };
            var len = pw.length;
            var hasLower = /[a-z]/.test(pw);
            var hasUpper = /[A-Z]/.test(pw);
            var hasDigit = /\d/.test(pw);
            var hasSymbol = /[^a-zA-Z0-9]/.test(pw);
            var poolSize = 0;
            if (hasLower) poolSize += 26;
            if (hasUpper) poolSize += 26;
            if (hasDigit) poolSize += 10;
            if (hasSymbol) poolSize += 33;
            var entropy = poolSize > 0 ? len * Math.log2(poolSize) : 0;
            var commonPasswords = ['password','123456','12345678','qwerty','abc123','monkey','letmein','dragon','111111','baseball','iloveyou','trustno1','sunshine','master','welcome','shadow','ashley','football','jesus','michael','ninja','mustang','password1','password123','admin','login','hello','charlie','donald','batman'];
            var isCommon = commonPasswords.indexOf(pw.toLowerCase()) !== -1;
            var crackSeconds = Math.pow(2, entropy) / 1e10;
            var crackTime;
            if (isCommon) { crackTime = 'Instantly (common password!)'; }
            else if (crackSeconds < 1) crackTime = 'Less than 1 second';
            else if (crackSeconds < 60) crackTime = Math.round(crackSeconds) + ' seconds';
            else if (crackSeconds < 3600) crackTime = Math.round(crackSeconds / 60) + ' minutes';
            else if (crackSeconds < 86400) crackTime = Math.round(crackSeconds / 3600) + ' hours';
            else if (crackSeconds < 86400 * 365) crackTime = Math.round(crackSeconds / 86400) + ' days';
            else if (crackSeconds < 86400 * 365 * 1000) crackTime = Math.round(crackSeconds / (86400 * 365)) + ' years';
            else if (crackSeconds < 86400 * 365 * 1e6) crackTime = Math.round(crackSeconds / (86400 * 365 * 1000)) + ' thousand years';
            else if (crackSeconds < 86400 * 365 * 1e9) crackTime = Math.round(crackSeconds / (86400 * 365 * 1e6)) + ' million years';
            else crackTime = Math.round(crackSeconds / (86400 * 365 * 1e9)) + ' billion years';
            var score = 0;
            if (len >= 8) score += 1;
            if (len >= 12) score += 1;
            if (len >= 16) score += 1;
            if (hasLower && hasUpper) score += 1;
            if (hasDigit) score += 1;
            if (hasSymbol) score += 1;
            if (!isCommon) score += 1;
            if (entropy > 60) score += 1;
            score = Math.min(score, 5);
            if (isCommon) score = 0;
            var labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
            var colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
            return { score: score, label: labels[score], color: colors[score], entropy: Math.round(entropy), crackTime: crackTime, checks: { length: len, hasLower: hasLower, hasUpper: hasUpper, hasDigit: hasDigit, hasSymbol: hasSymbol, isCommon: isCommon, poolSize: poolSize } };
          }

          // â”€â”€ Cipher Functions â”€â”€
          function caesarCipher(text, shift, encode) {
            var s = encode ? shift : (26 - shift) % 26;
            return text.split('').map(function(ch) {
              var c = ch.charCodeAt(0);
              if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + s) % 26) + 65);
              if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + s) % 26) + 97);
              return ch;
            }).join('');
          }
          function atbashCipher(text) {
            return text.split('').map(function(ch) {
              var c = ch.charCodeAt(0);
              if (c >= 65 && c <= 90) return String.fromCharCode(90 - (c - 65));
              if (c >= 97 && c <= 122) return String.fromCharCode(122 - (c - 97));
              return ch;
            }).join('');
          }
          function xorCipher(text, key) {
            var k = key || 42;
            return text.split('').map(function(ch) {
              return String.fromCharCode(ch.charCodeAt(0) ^ k);
            }).join('');
          }

          // Cipher challenges
          var cipherChallenges = [
            { type: 'caesar', shift: 3, encoded: 'FRPSXWHU VFLHQFH LV IXQ', answer: 'COMPUTER SCIENCE IS FUN', hint: 'Shift of 3 (classic Caesar)' },
            { type: 'caesar', shift: 7, encoded: 'JVILY KLMLUZL', answer: 'CYBER DEFENSE', hint: 'Shift of 7' },
            { type: 'atbash', shift: 0, encoded: 'KZHHDLIW HZUVGB', answer: 'PASSWORD SAFETY', hint: 'A=Z, B=Y, C=X...' },
            { type: 'caesar', shift: 13, encoded: 'QRIRE FGNGR LBHE CNFFJBEQ', answer: 'NEVER STATE YOUR PASSWORD', hint: 'ROT13 - shift of 13' },
            { type: 'atbash', shift: 0, encoded: 'GSRMP YVULIV BLF XORXP', answer: 'THINK BEFORE YOU CLICK', hint: 'Reverse the alphabet' }
          ];

          var activeChallengeData = cipherChallenges[Math.abs(phishScore + caesarShift) % cipherChallenges.length];

          var pwStrength = calcPasswordStrength(pwInput);

          // ── Password Generator ──
          function generatePassword(len, include) {
            var chars = '';
            if (include.lower) chars += 'abcdefghijkmnopqrstuvwxyz';
            if (include.upper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            if (include.digits) chars += '23456789';
            if (include.symbols) chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
            if (!chars) chars = 'abcdefghijkmnopqrstuvwxyz';
            var pw = '';
            for (var i = 0; i < len; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
            return pw;
          }

          // ── Brute Force Simulator ──
          function startBruteForce() {
            var target = pwInput;
            if (!target || target.length < 1) return;
            var strength = calcPasswordStrength(target);
            var totalGuesses = Math.pow(2, strength.entropy);
            var speeds = [
              { label: 'Old laptop', rate: 1e4, icon: '\uD83D\uDCBB' },
              { label: 'Gaming PC', rate: 1e8, icon: '\uD83D\uDDA5\uFE0F' },
              { label: 'Cloud cluster', rate: 1e10, icon: '\u2601\uFE0F' },
              { label: 'Nation-state', rate: 1e14, icon: '\uD83C\uDFDB\uFE0F' }
            ];
            var charSets = [];
            if (/[a-z]/.test(target)) charSets.push('a-z');
            if (/[A-Z]/.test(target)) charSets.push('A-Z');
            if (/\d/.test(target)) charSets.push('0-9');
            if (/[^a-zA-Z0-9]/.test(target)) charSets.push('symbols');
            upd('pwBruteAnim', { running: true, target: target, entropy: strength.entropy, totalGuesses: totalGuesses, speeds: speeds, charSets: charSets, crackTime: strength.crackTime });
          }

          // ── Simulated Breach Database ──
          var breachedPasswords = ['password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'letmein', 'dragon', 'shadow', 'master', 'welcome', 'football', 'iloveyou', 'trustno1', 'sunshine', 'password1', 'password123', 'admin', 'login', 'batman', 'ninja', 'mustang', 'charlie', 'donald', 'princess', 'summer', 'flower', 'cheese', 'cookie', 'soccer', 'hockey', 'winter2024', 'Spring2025!', 'P@ssw0rd', 'Passw0rd!', 'Welcome1', 'Hello123', 'Test1234'];
          function checkBreach(pw) {
            if (!pw) return null;
            var lower = pw.toLowerCase();
            var found = breachedPasswords.some(function(b) { return b.toLowerCase() === lower; });
            var count = found ? (Math.floor(Math.random() * 500000) + 10000) : 0;
            return { checked: true, breached: found, count: count, password: pw };
          }

          function formatSeconds(sec) {
            if (sec < 1) return '< 1 second';
            if (sec < 60) return Math.round(sec) + 's';
            if (sec < 3600) return Math.round(sec / 60) + ' min';
            if (sec < 86400) return Math.round(sec / 3600) + ' hrs';
            if (sec < 86400 * 365) return Math.round(sec / 86400) + ' days';
            if (sec < 86400 * 365 * 1000) return Math.round(sec / (86400 * 365)) + ' yrs';
            if (sec < 86400 * 365 * 1e6) return Math.round(sec / (86400 * 365 * 1000)) + 'K yrs';
            if (sec < 86400 * 365 * 1e9) return Math.round(sec / (86400 * 365 * 1e6)) + 'M yrs';
            return Math.round(sec / (86400 * 365 * 1e9)) + 'B yrs';
          }

          // ── Network Traffic Data ──
          var packetTemplates = {
            safe: [
              { proto: 'HTTPS', src: '192.168.1.42', dst: '142.250.80.46', port: 443, payload: 'TLS 1.3 Encrypted Application Data', size: 1420, suspicious: false, reason: 'Normal encrypted web traffic to Google' },
              { proto: 'HTTPS', src: '192.168.1.42', dst: '151.101.1.69', port: 443, payload: 'TLS 1.3 Handshake ClientHello', size: 517, suspicious: false, reason: 'Encrypted connection to Reddit CDN' },
              { proto: 'DNS', src: '192.168.1.42', dst: '8.8.8.8', port: 53, payload: 'Query: A docs.google.com', size: 64, suspicious: false, reason: 'Standard DNS lookup to Google DNS' },
              { proto: 'HTTPS', src: '192.168.1.42', dst: '13.107.42.14', port: 443, payload: 'TLS 1.3 Application Data [Teams]', size: 890, suspicious: false, reason: 'Encrypted Microsoft Teams traffic' },
              { proto: 'NTP', src: '192.168.1.1', dst: '129.6.15.28', port: 123, payload: 'NTP v4 Client Request', size: 76, suspicious: false, reason: 'Normal time sync from router' },
              { proto: 'HTTPS', src: '192.168.1.42', dst: '104.16.249.249', port: 443, payload: 'TLS 1.3 Application Data [Cloudflare]', size: 1100, suspicious: false, reason: 'Encrypted Cloudflare CDN traffic' }
            ],
            bad: [
              { proto: 'HTTP', src: '192.168.1.42', dst: '45.33.32.156', port: 80, payload: 'POST /login.php username=admin&password=hunter2', size: 256, suspicious: true, reason: 'Unencrypted HTTP sending login credentials in plaintext!' },
              { proto: 'DNS', src: '192.168.1.105', dst: '185.243.115.8', port: 53, payload: 'Query: TXT aGVsbG8gd29ybGQ.evil-c2.ru', size: 128, suspicious: true, reason: 'DNS tunneling! Base64 data hidden in DNS queries to a suspicious domain' },
              { proto: 'TCP', src: '192.168.1.42', dst: '103.224.182.250', port: 4444, payload: 'BINARY [reverse shell payload detected]', size: 2048, suspicious: true, reason: 'Port 4444 is commonly used by Metasploit. This looks like a reverse shell!' },
              { proto: 'SMTP', src: '192.168.1.200', dst: '91.134.128.50', port: 25, payload: 'MAIL FROM: <ceo@company.com> Subject: Wire Transfer Urgent', size: 4096, suspicious: true, reason: 'Email spoofing CEO address about wire transfer (Business Email Compromise attack)' },
              { proto: 'HTTP', src: '10.0.0.55', dst: '192.168.1.42', port: 80, payload: 'GET /../../etc/passwd HTTP/1.1', size: 180, suspicious: true, reason: 'Path traversal attack! Attempting to read system password file' },
              { proto: 'TCP', src: '192.168.1.42', dst: '198.51.100.7', port: 6667, payload: 'JOIN #botnet-c2 PRIVMSG: DDOS 203.0.113.5', size: 320, suspicious: true, reason: 'IRC botnet C2! Machine receiving DDoS commands' },
              { proto: 'ICMP', src: '10.0.0.1', dst: '192.168.1.255', port: 0, payload: 'Echo Request (oversized: 65535 bytes)', size: 65535, suspicious: true, reason: 'Ping of Death! Oversized ICMP packet targeting broadcast address' },
              { proto: 'HTTP', src: '192.168.1.42', dst: '172.67.182.31', port: 80, payload: 'GET /search?q=' + String.fromCharCode(60) + 'script' + String.fromCharCode(62) + 'document.cookie' + String.fromCharCode(60) + '/script' + String.fromCharCode(62), size: 210, suspicious: true, reason: 'Cross-Site Scripting (XSS) attempt! Injected script to steal cookies' },
              { proto: 'FTP', src: '192.168.1.42', dst: '45.77.65.211', port: 21, payload: 'STOR confidential_financials_2026.xlsx', size: 15200, suspicious: true, reason: 'Data exfiltration via unencrypted FTP to external server!' }
            ]
          };
          function generateNetRound() {
            var safe = packetTemplates.safe.slice();
            var bad = packetTemplates.bad.slice();
            var shuffled = [];
            var badCount = 2 + Math.floor(Math.random() * 2);
            for (var i = 0; i < badCount; i++) shuffled.push(bad.splice(Math.floor(Math.random() * bad.length), 1)[0]);
            for (var j = 0; j < 6 - badCount; j++) shuffled.push(safe[Math.floor(Math.random() * safe.length)]);
            for (var k = shuffled.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)); var tmp = shuffled[k]; shuffled[k] = shuffled[r]; shuffled[r] = tmp; }
            return shuffled.map(function(p, idx) { return Object.assign({}, p, { id: idx }); });
          }

          // ── Social Engineering Scenarios ──
          var seScenarios = [
            { scenario: 'You get a phone call from someone claiming to be IT support. They say your computer has a virus and need your password to fix it.', correct: 'refuse', options: [
              { id: 'comply', label: 'Give them your password so they can help', feedback: 'Never share passwords over the phone! Real IT can reset your password without knowing it.' },
              { id: 'refuse', label: 'Hang up and call IT directly using the official number', feedback: 'Correct! Always verify by calling the official number. This is a classic vishing (voice phishing) attack.' },
              { id: 'partial', label: 'Give them your old password instead', feedback: 'Sharing any password is risky. Old passwords reveal your pattern to attackers.' }
            ], type: 'Vishing', lesson: 'Legitimate IT departments never ask for your password. They can reset it from their admin console.' },
            { scenario: 'You find a USB drive in the parking lot labeled “Final Exam Answers 2026”.', correct: 'report', options: [
              { id: 'plug', label: 'Plug it into your computer to check', feedback: 'USB baiting attack! Malicious USB drives can auto-run malware the moment they\'re plugged in.' },
              { id: 'report', label: 'Turn it in to security without plugging it in', feedback: 'Correct! The Stuxnet worm that damaged Iran\'s nuclear program spread via USB drives.' },
              { id: 'friend', label: 'Give it to a friend to try', feedback: 'This just puts your friend at risk. Never plug in unknown USB devices.' }
            ], type: 'USB Baiting', lesson: 'In a study, 48% of USB drives dropped on a university campus were plugged in by finders.' },
            { scenario: 'Someone in a delivery uniform asks you to hold the secure office door open because their hands are full.', correct: 'verify', options: [
              { id: 'hold', label: 'Hold the door \u2014 they look legitimate', feedback: 'Tailgating! Attackers dress as delivery workers or employees to gain physical access.' },
              { id: 'verify', label: 'Ask them to badge in or contact reception', feedback: 'Correct! Everyone must authenticate individually. Physical security matters!' },
              { id: 'ignore', label: 'Walk away without saying anything', feedback: 'Better than letting them in, but alerting security is the best practice.' }
            ], type: 'Tailgating', lesson: 'Physical access is game over. Once inside, an attacker can install keyloggers or access unlocked computers.' },
            { scenario: 'Your “boss” texts from an unknown number, urgently asking you to buy gift cards and send the codes.', correct: 'verify', options: [
              { id: 'buy', label: 'Rush to buy the gift cards', feedback: 'Gift card scam! No legitimate boss asks for gift card codes via text.' },
              { id: 'verify', label: 'Contact your boss through usual channels to verify', feedback: 'Correct! Always verify unusual requests through established channels.' },
              { id: 'reply', label: 'Ask the texter for proof they are your boss', feedback: 'Attackers can fake proof. Only trust communication through verified channels.' }
            ], type: 'Pretexting', lesson: 'The FBI reported $241 million lost to gift card scams in 2023. Urgency + authority = red flags.' },
            { scenario: 'You get an email saying you won a $500 Amazon gift card. Just fill out a survey with your credit card for “shipping.”', correct: 'delete', options: [
              { id: 'fill', label: 'Fill out the survey to claim your prize', feedback: 'Phishing scam. Legitimate prizes never require credit card info for shipping.' },
              { id: 'delete', label: 'Delete it \u2014 you never entered a contest', feedback: 'Correct! If you didn\'t enter, you can\'t win. This harvests personal and financial data.' },
              { id: 'forward', label: 'Forward it to friends', feedback: 'Forwarding phishing spreads the attack. You\'d help the scammer reach more victims.' }
            ], type: 'Phishing/Baiting', lesson: '”You\'ve won!” emails are almost always scams. Real companies don\'t require credit cards for prizes.' },
            { scenario: 'A friendly “journalist” at a coffee shop asks detailed questions about your school\'s network, software, and server room.', correct: 'decline', options: [
              { id: 'help', label: 'Answer their questions \u2014 they seem nice', feedback: 'Reconnaissance! Attackers gather info through casual conversation before launching attacks.' },
              { id: 'decline', label: 'Suggest they contact the school\'s press office', feedback: 'Correct! Redirect info requests to official channels that can verify the person.' },
              { id: 'some', label: 'Answer some but not technical questions', feedback: 'Even non-technical details help build spear-phishing profiles. Names, schedules, software \u2014 all valuable.' }
            ], type: 'Reconnaissance', lesson: 'Information is the currency of social engineering. Every detail shared helps craft a more convincing attack.' },
            { scenario: 'A pop-up screams “YOUR COMPUTER IS INFECTED! Call Microsoft Support at 1-800-555-0199 immediately!”', correct: 'close', options: [
              { id: 'call', label: 'Call the number for help', feedback: 'Tech support scam! Microsoft never shows phone numbers in pop-ups. The “technicians” install remote access malware.' },
              { id: 'close', label: 'Close the tab and run your actual antivirus', feedback: 'Correct! These are fake warnings. Real security alerts come from your installed antivirus, not browser pop-ups.' },
              { id: 'pay', label: 'Pay for their removal service', feedback: 'You\'d be paying scammers who may install more malware.' }
            ], type: 'Tech Support Scam', lesson: 'Over 100,000 tech support scam reports in 2023. Real warnings come from YOUR installed software.' },
            { scenario: 'A classmate borrows your phone “for a second” and walks around a corner with it.', correct: 'watch', options: [
              { id: 'let', label: 'Let them go \u2014 they\'ll be right back', feedback: 'A few seconds with your unlocked phone = access to all accounts, messages, and payment apps.' },
              { id: 'watch', label: 'Stay with them and watch', feedback: 'Correct! Never let unlocked devices out of sight. Seconds of access can install spyware.' },
              { id: 'lock', label: 'Lock it first then hand over', feedback: 'Better, but they could shoulder-surf your PIN next time. Look things up for them yourself.' }
            ], type: 'Physical Access', lesson: 'The “evil maid” attack: brief physical access to a device can compromise all data on it.' }
          ];
          var activeSeScenario = seScenarios[seQuizIdx % seScenarios.length];

          // ── Cipher output ──
          var cipherOutput = '';
          if (cipherInput) {
            if (cipherMode === 'caesar') cipherOutput = caesarCipher(cipherInput, caesarShift, cipherEncode);
            else if (cipherMode === 'atbash') cipherOutput = atbashCipher(cipherInput);
            else cipherOutput = cipherEncode ? btoa(xorCipher(cipherInput, 42)) : (function() { try { return xorCipher(atob(cipherInput), 42); } catch(e) { return '[Invalid XOR input]'; } })();
          }

          // ══════════════════════════════════════════════════════════════
          // SOC WAR ROOM — Red Team / Blue Team Simulation
          // ══════════════════════════════════════════════════════════════

          // ── Glossary of cybersecurity terms used in the War Room ──
          var warGlossary = [
            { term: 'SOC', defn: 'Security Operations Center \u2014 the team (or single analyst) watching security alerts and responding to incidents.' },
            { term: 'IOC', defn: 'Indicator of Compromise \u2014 a piece of forensic evidence (a hash, IP, filename, behavior) that points to an intrusion.' },
            { term: 'TTP', defn: 'Tactics, Techniques, and Procedures \u2014 how an adversary operates. Defenders study TTPs to anticipate the next move.' },
            { term: 'C2', defn: 'Command and Control \u2014 the channel a compromised host uses to receive instructions from the attacker.' },
            { term: 'EDR', defn: 'Endpoint Detection and Response \u2014 security software on laptops/servers that spots and stops suspicious behavior.' },
            { term: 'CVE', defn: 'Common Vulnerabilities and Exposures \u2014 the catalog of publicly known software flaws. Each has a CVE-YYYY-NNNNN ID.' },
            { term: 'MFA', defn: 'Multi-Factor Authentication \u2014 logging in with something you know (password) plus something you have (phone code, security key).' },
            { term: 'SSO', defn: 'Single Sign-On \u2014 one login that works across many apps. Convenient but a juicy target if stolen.' },
            { term: 'BEC', defn: 'Business Email Compromise \u2014 attackers impersonate an executive to trick staff into wiring money or sharing data.' },
            { term: 'OAuth', defn: 'A protocol that lets one app get permission to use another on your behalf (e.g., "sign in with Google"). Abused via rogue consent apps.' },
            { term: 'OSINT', defn: 'Open-Source Intelligence \u2014 information gathered from public sources like LinkedIn, news, social media.' },
            { term: 'DNS Tunneling', defn: 'Smuggling data inside DNS queries. Looks like normal name lookups but carries commands or exfiltrated data.' },
            { term: 'Spear Phish', defn: 'A phishing email personalized to a specific target \u2014 uses their name, role, or recent activity to feel legitimate.' },
            { term: 'Smishing', defn: 'Phishing via SMS text messages.' },
            { term: 'Vishing', defn: 'Phishing via voice calls (voice + phishing).' },
            { term: 'Kill Chain', defn: 'A model of the stages an intrusion passes through: recon, delivery, exploit, persist, C2, objectives. Stopping it at any stage breaks the attack.' },
            { term: 'Macro', defn: 'Code embedded in an Office document (Word, Excel). Malicious macros run on open to drop malware.' },
            { term: 'Scheduled Task', defn: 'A Windows feature that runs a program on a schedule. Attackers abuse it to re-launch malware after reboots.' },
            { term: 'Typo-Squat', defn: 'Registering a look-alike domain (e.g. rnicrosoft.com) to trick users into thinking it\'s the real site.' },
            { term: 'Living Off The Land', defn: 'Using built-in OS tools (PowerShell, schtasks, certutil) to avoid dropping detectable malware.' }
          ];

          // ── Achievement badges catalog ──
          var warAchievements = [
            { id: 'first_blood', icon: '\uD83C\uDFAF', label: 'First Blood', desc: 'Mitigate the Reconnaissance attack.' },
            { id: 'no_phish', icon: '\uD83D\uDEE1\uFE0F', label: 'No Phish Shall Pass', desc: 'Stop the Delivery stage (mitigate or detect).' },
            { id: 'patchwork', icon: '\uD83E\uDDF0', label: 'Patchwork', desc: 'Play Emergency Patch in 3+ rounds of one campaign.' },
            { id: 'zero_tolerance', icon: '\uD83C\uDF96\uFE0F', label: 'Zero Tolerance', desc: 'Win without using Escalate to CISO.' },
            { id: 'combo_artist', icon: '\u2728', label: 'Combo Artist', desc: 'Trigger 3+ combos in one campaign.' },
            { id: 'budget_master', icon: '\uD83D\uDCB5', label: 'Budget Master', desc: 'Win with 3+ budget remaining.' },
            { id: 'hunter', icon: '\uD83E\uDDEC', label: 'Apex Hunter', desc: 'Play Hunt for IOCs in 4+ rounds of one campaign.' },
            { id: 'perfect_run', icon: '\uD83C\uDFC6', label: 'Flawless Defense', desc: 'Achieve 6/6 full mitigations in one campaign.' },
            { id: 'data_guardian', icon: '\uD83D\uDDC4\uFE0F', label: 'Data Guardian', desc: 'Finish a campaign with 100/100 data intact.' },
            { id: 'speedrun', icon: '\u26A1', label: 'Lightning Reflexes', desc: 'Win a Threat Hunter campaign without the clock running out on any round.' },
            { id: 'boss_slayer', icon: '\uD83D\uDC79', label: 'Boss Slayer', desc: 'Win a Boss Mode campaign.' }
          ];

          // ── Best-progress helpers for unearned achievements (read from history) ──
          function achievementProgress(achId) {
            var h = d.warRoomCampaignHistory || [];
            var maxOf = function(field) {
              return h.reduce(function(best, row) {
                var v = row[field]; return (v != null && v > best) ? v : best;
              }, 0);
            };
            switch (achId) {
              case 'patchwork':     return { cur: maxOf('patchesPlayed'), goal: 3, label: 'Best patch count' };
              case 'combo_artist':  return { cur: maxOf('combos'), goal: 3, label: 'Best combo count' };
              case 'hunter':        return { cur: maxOf('huntsPlayed'), goal: 4, label: 'Best hunt count' };
              case 'perfect_run':   return { cur: maxOf('mitigations'), goal: 6, label: 'Best mitigations' };
              case 'data_guardian': return { cur: maxOf('dataRemaining'), goal: 100, label: 'Best data remaining' };
              case 'budget_master': {
                var best = h.reduce(function(b, row) { return (row.verdict === 'won' && row.budgetRemaining != null && row.budgetRemaining > b) ? row.budgetRemaining : b; }, 0);
                return { cur: best, goal: 3, label: 'Best leftover budget on a win' };
              }
              default: return null;
            }
          }

          // ── Evaluate which achievements were earned this campaign ──
          function evaluateCampaignAchievements(chain, finalState) {
            var earned = [];
            var won = finalState.verdict === 'won';
            var boss = !!finalState.isBossMode;
            // First Blood — only in normal mode (requires recon as round 1)
            if (!boss && chain[0] && chain[0].outcome === 'mitigated' && chain[0].stage === 'recon') earned.push('first_blood');
            // No Phish Shall Pass — only in normal mode (requires delivery as round 2)
            if (!boss && chain[1] && chain[1].outcome !== 'succeeded' && chain[1].stage === 'delivery') earned.push('no_phish');
            // Patchwork (not meaningful in 3-round boss)
            if (!boss) {
              var patchCount = chain.filter(function(r) { return r.bluePlays.indexOf('patch') !== -1; }).length;
              if (patchCount >= 3) earned.push('patchwork');
            }
            // Zero Tolerance — won without escalate
            var escalateUsed = chain.some(function(r) { return r.bluePlays.indexOf('escalate') !== -1; });
            if (won && !escalateUsed) earned.push('zero_tolerance');
            // Combo Artist
            if (finalState.totalCombos >= 3) earned.push('combo_artist');
            // Budget Master
            if (won && finalState.remainingBudget >= 3) earned.push('budget_master');
            // Hunter (not meaningful in 3-round boss)
            if (!boss) {
              var huntCount = chain.filter(function(r) { return r.bluePlays.indexOf('hunt_iocs') !== -1; }).length;
              if (huntCount >= 4) earned.push('hunter');
            }
            // Perfect Run — all rounds mitigated (6 normal / 3 boss)
            var mitigated = chain.filter(function(r) { return r.outcome === 'mitigated'; }).length;
            if (mitigated === chain.length && chain.length > 0) earned.push('perfect_run');
            // Data Guardian
            if (finalState.dataRemaining >= 100) earned.push('data_guardian');
            // Speedrun (Threat Hunter, won, no time-outs)
            if (won && finalState.difficulty === 'threatHunter' && !finalState.timedOut) earned.push('speedrun');
            // Boss Slayer
            if (boss && won) earned.push('boss_slayer');
            return earned;
          }

          var warStages = [
            { num: 1, id: 'recon',       name: 'Reconnaissance',         icon: '\uD83D\uDD0D', color: '#64748b' },
            { num: 2, id: 'delivery',    name: 'Weaponization/Delivery', icon: '\uD83D\uDCE8', color: '#f59e0b' },
            { num: 3, id: 'exploit',     name: 'Exploitation',            icon: '\uD83D\uDCA5', color: '#ef4444' },
            { num: 4, id: 'persist',     name: 'Installation/Persistence', icon: '\uD83D\uDD27', color: '#a855f7' },
            { num: 5, id: 'c2',          name: 'Command & Control',       icon: '\uD83D\uDCE1', color: '#ec4899' },
            { num: 6, id: 'actions',     name: 'Actions on Objectives',   icon: '\uD83C\uDFAF', color: '#dc2626' }
          ];

          // ── Red Team card library (abstracted — no payload details) ──
          var redTeamCards = [
            // Stage 1: Reconnaissance
            { id: 'r_linkedin', stage: 'recon', title: 'LinkedIn scrape of Finance dept', description: 'Adversary harvests names, roles, and reporting structure of Finance staff from public profiles.', indicators: ['Unusual LinkedIn profile views from a single IP', 'Pattern of views clustered around Finance team'], noiseIndicators: ['Routine recruiter activity'], mitigations: { hunt_iocs: 1.0, awareness_blast: 0.6, investigate: 0.3 }, impact: { users: 1 } },
            { id: 'r_dnsenum', stage: 'recon', title: 'DNS enumeration of public assets', description: 'Attacker fingerprints subdomains and exposed services.', indicators: ['Burst of DNS TXT/AXFR queries from one ASN', 'Scans of staging.* subdomains'], noiseIndicators: ['Search engine crawler traffic'], mitigations: { hunt_iocs: 1.0, block_ip: 0.8, investigate: 0.4 }, impact: { servers: 1 } },
            { id: 'r_s3scan', stage: 'recon', title: 'Public S3 bucket scan', description: 'Automated scanner searches for misconfigured cloud storage.', indicators: ['S3 list-bucket attempts on unfamiliar names', '403 spike on staging buckets'], noiseIndicators: ['Legitimate vendor health check'], mitigations: { patch: 1.0, hunt_iocs: 0.7, block_ip: 0.5 }, impact: { data: 5 } },
            { id: 'r_osint', stage: 'recon', title: 'OSINT on IT admins', description: 'Attacker maps IT staff schedules and toolchain via social media.', indicators: ['Screenshots of helpdesk tickets appearing on paste sites'], noiseIndicators: ['Conference talk references'], mitigations: { awareness_blast: 1.0, hunt_iocs: 0.6 }, impact: { users: 1 } },

            // Stage 2: Delivery
            { id: 'd_spearcfo', stage: 'delivery', title: 'Spear phish CFO with invoice.docx', description: 'Targeted email with a look-alike domain and a macro-laden attachment arrives in the CFO\'s inbox.', indicators: ['Look-alike sender domain (single-char swap)', 'Attachment with embedded macros', 'Urgent wire-transfer language'], noiseIndicators: ['Legitimate AP invoice from a known vendor'], mitigations: { block_ip: 0.9, awareness_blast: 1.0, reset_credential: 0.4, investigate: 0.5 }, impact: { users: 2 } },
            { id: 'd_usb', stage: 'delivery', title: 'USB drops in parking lot', description: 'Adversary scatters branded USB drives near employee entrance.', indicators: ['Unknown USB device inserts reported by EDR', 'Auto-run attempts on Finance workstations'], noiseIndicators: ['Vendor-provided conference USBs'], mitigations: { deploy_edr: 1.0, awareness_blast: 0.8, isolate_host: 0.6 }, impact: { users: 1, servers: 1 } },
            { id: 'd_typosquat', stage: 'delivery', title: 'Typo-squatted vendor domain', description: 'Fake vendor portal collects employee credentials.', indicators: ['Outbound DNS to newly-registered look-alike domain', 'Credential-form POST to unusual host'], noiseIndicators: ['New SaaS pilot the team just approved'], mitigations: { block_ip: 1.0, awareness_blast: 0.7, hunt_iocs: 0.5 }, impact: { users: 2 } },
            { id: 'd_sms', stage: 'delivery', title: 'Smishing wave to staff', description: 'Bulk SMS claiming to be IT asks users to re-verify SSO from a personal device.', indicators: ['Cluster of help-desk calls about an "IT text"'], noiseIndicators: ['Legitimate SMS MFA prompts'], mitigations: { awareness_blast: 1.0, reset_credential: 0.5 }, impact: { users: 2 } },

            // Stage 3: Exploitation
            { id: 'e_macro', stage: 'exploit', title: 'Macro executes loader in-memory', description: 'User enabled macros; a living-off-the-land loader runs.', indicators: ['powershell.exe spawned by WINWORD.EXE', 'Encoded command-line parameters'], noiseIndicators: ['IT automation script'], mitigations: { deploy_edr: 1.0, isolate_host: 0.9, investigate: 0.6 }, impact: { servers: 1, users: 1 } },
            { id: 'e_cve', stage: 'exploit', title: 'Unpatched VPN CVE exploited', description: 'A known, patched-since-January CVE is still open on the edge device.', indicators: ['Exploit signatures on perimeter IDS', 'Anomalous VPN auth success from new geography'], noiseIndicators: ['Scheduled vulnerability scan'], mitigations: { patch: 1.0, isolate_host: 0.7, block_ip: 0.6 }, impact: { servers: 2, data: 10 } },
            { id: 'e_credstuff', stage: 'exploit', title: 'Credential stuffing vs SSO', description: 'Breached-password list replayed against the login portal.', indicators: ['High-volume login failures from rotating IPs', 'MFA fatigue pushes to same user'], noiseIndicators: ['QA automation account'], mitigations: { reset_credential: 1.0, block_ip: 0.7, awareness_blast: 0.4 }, impact: { users: 3 } },
            { id: 'e_watering', stage: 'exploit', title: 'Watering-hole on industry forum', description: 'Trusted industry site compromised to deliver a drive-by to visitors.', indicators: ['JS redirects to an uncategorized CDN', 'Browser exploit signatures'], noiseIndicators: ['Standard ad-network noise'], mitigations: { patch: 1.0, block_ip: 0.6, deploy_edr: 0.7 }, impact: { users: 1, servers: 1 } },

            // Stage 4: Persistence
            { id: 'p_schedtask', stage: 'persist', title: 'Scheduled task persistence', description: 'Adversary creates a hidden scheduled task that re-launches the implant nightly.', indicators: ['schtasks.exe with /create from a user context', 'Unsigned binary path in task action'], noiseIndicators: ['New backup job scheduled'], mitigations: { deploy_edr: 1.0, hunt_iocs: 0.8, isolate_host: 0.7 }, impact: { servers: 1 } },
            { id: 'p_runkey', stage: 'persist', title: 'Registry Run key implant', description: 'HKCU Run key added to relaunch on login.', indicators: ['New HKCU\\Run value pointing to user temp dir'], noiseIndicators: ['Legitimate app auto-update registered'], mitigations: { deploy_edr: 1.0, hunt_iocs: 0.9, reset_credential: 0.4 }, impact: { users: 1, servers: 1 } },
            { id: 'p_service', stage: 'persist', title: 'Malicious Windows service installed', description: 'Attacker installs a service that survives reboots.', indicators: ['New auto-start service with random display name', 'Service runs as SYSTEM from %ProgramData%'], noiseIndicators: ['Vendor management agent install'], mitigations: { isolate_host: 1.0, deploy_edr: 0.9, patch: 0.5 }, impact: { servers: 2 } },
            { id: 'p_oauthapp', stage: 'persist', title: 'Rogue OAuth app granted consent', description: 'User consented to a third-party OAuth app requesting mailbox access.', indicators: ['New enterprise app with mail.read and offline_access scopes'], noiseIndicators: ['Legitimate productivity integration'], mitigations: { reset_credential: 1.0, awareness_blast: 0.7, investigate: 0.6 }, impact: { users: 2, data: 10 } },

            // Stage 5: Command & Control
            { id: 'c_dnstun', stage: 'c2', title: 'DNS tunneling beacon', description: 'Implant beacons via encoded DNS TXT queries.', indicators: ['Long-subdomain DNS queries to a single parent domain', 'Periodic timing pattern (60s jitter)'], noiseIndicators: ['Cloud-based email security scan'], mitigations: { block_ip: 1.0, hunt_iocs: 0.9, isolate_host: 0.7 }, impact: { data: 15 } },
            { id: 'c_httpscdn', stage: 'c2', title: 'HTTPS C2 hidden behind CDN', description: 'Beacon blends into legitimate CDN traffic.', indicators: ['JA3 fingerprint mismatch for a known CDN tenant', 'User-agent inconsistent with browser'], noiseIndicators: ['Normal video-streaming traffic'], mitigations: { deploy_edr: 1.0, hunt_iocs: 0.8, isolate_host: 0.7, block_ip: 0.5 }, impact: { data: 10, servers: 1 } },
            { id: 'c_slackhook', stage: 'c2', title: 'Slack webhook exfil channel', description: 'Adversary abuses an incoming webhook as a low-noise C2.', indicators: ['Outbound POSTs to hooks.slack.com from a server that never used Slack'], noiseIndicators: ['Monitoring integration alerts'], mitigations: { block_ip: 1.0, hunt_iocs: 0.8, investigate: 0.5 }, impact: { data: 10 } },
            { id: 'c_icmp', stage: 'c2', title: 'ICMP covert channel', description: 'Implant tunnels commands inside ICMP echo payloads.', indicators: ['Unusually large ICMP packets', 'Sustained ICMP to a single external host'], noiseIndicators: ['Network monitoring pings'], mitigations: { block_ip: 1.0, isolate_host: 0.8, deploy_edr: 0.6 }, impact: { servers: 1, data: 5 } },

            // Stage 6: Actions on Objectives
            { id: 'a_piiexfil', stage: 'actions', title: 'Customer PII exfiltration', description: 'Adversary packages a customer database for exfiltration.', indicators: ['Large archive creation on DB server', 'Sudden egress spike at 3am'], noiseIndicators: ['Scheduled nightly backup job'], mitigations: { isolate_host: 1.0, block_ip: 0.8, escalate: 1.0, hunt_iocs: 0.5 }, impact: { data: 60 } },
            { id: 'a_ransom', stage: 'actions', title: 'Ransomware detonation', description: 'Attacker pushes a ransomware payload across domain-joined hosts.', indicators: ['Mass file renames with unusual extension', 'Shadow-copy deletion commands'], noiseIndicators: ['Large file-migration project'], mitigations: { isolate_host: 1.0, escalate: 1.0, deploy_edr: 0.8, patch: 0.3 }, impact: { servers: 5, data: 40 } },
            { id: 'a_wirefraud', stage: 'actions', title: 'Wire-transfer fraud (BEC)', description: 'Finance receives a forwarded email chain authorizing a $380k wire.', indicators: ['Mailbox forwarding rule created in last 48h', 'Reply-to domain differs from display'], noiseIndicators: ['Routine vendor onboarding'], mitigations: { escalate: 1.0, reset_credential: 0.9, awareness_blast: 0.8, investigate: 0.7 }, impact: { data: 50 } },
            { id: 'a_sabotage', stage: 'actions', title: 'Destructive wiper on build server', description: 'Attacker wipes CI/CD infrastructure to disrupt operations.', indicators: ['Disk write patterns consistent with wiping', 'Admin tool invoked outside change window'], noiseIndicators: ['Planned infrastructure decommission'], mitigations: { isolate_host: 1.0, escalate: 1.0, deploy_edr: 0.7 }, impact: { servers: 4, data: 20 } },

            // ── Nation-State APT cards (unlocked via Trophy Room) ──
            { id: 'r_supplychain', stage: 'recon', title: 'Supply-chain vendor mapping', description: 'State-sponsored actor profiles your software vendors to find a soft entry point upstream.', indicators: ['Your IT partner appears in breach-forum chatter', 'WHOIS lookups of your vendors from uncategorized ASNs'], noiseIndicators: ['Journalist researching industry'], mitigations: { hunt_iocs: 1.0, escalate: 0.5 }, impact: { data: 5 }, apt: true },
            { id: 'd_signed_driver', stage: 'delivery', title: 'Malicious update via signed driver', description: 'Compromised code-signing certificate lets the adversary push a "trusted" update.', indicators: ['Legitimate vendor certificate used on unfamiliar binary', 'Update server redirected through unknown CDN'], noiseIndicators: ['Scheduled maintenance window'], mitigations: { hunt_iocs: 1.0, deploy_edr: 0.7, block_ip: 0.4 }, impact: { servers: 2, users: 2 }, apt: true },
            { id: 'e_zeroday', stage: 'exploit', title: 'Zero-day kernel exploit', description: 'No patch exists \u2014 the vendor doesn\'t know about this bug yet.', indicators: ['Kernel crash dumps with unusual call stacks', 'BSoD events clustered by time'], noiseIndicators: ['Aging hardware'], mitigations: { isolate_host: 1.0, deploy_edr: 0.7, hunt_iocs: 0.5 }, impact: { servers: 3, data: 15 }, apt: true },
            { id: 'p_firmware', stage: 'persist', title: 'Firmware-level implant', description: 'Adversary embeds persistence below the OS \u2014 survives re-imaging.', indicators: ['BIOS/UEFI integrity checks fail', 'Implant resurrects after full disk wipe'], noiseIndicators: ['Legitimate firmware update'], mitigations: { isolate_host: 1.0, escalate: 0.8, deploy_edr: 0.4 }, impact: { servers: 3 }, apt: true },
            { id: 'c_slow_dns', stage: 'c2', title: 'Low-and-slow DNS C2 (1 query/hr)', description: 'Extremely low-volume beaconing designed to evade threshold-based detection.', indicators: ['Single anomalous DNS query per hour to same parent domain', 'Timing variance < 2%'], noiseIndicators: ['Cloud service keepalive'], mitigations: { hunt_iocs: 1.0, block_ip: 0.6, isolate_host: 0.7 }, impact: { data: 20 }, apt: true },
            { id: 'a_longexfil', stage: 'actions', title: 'Multi-week intellectual property exfiltration', description: 'Classified designs siphoned in small chunks over 6 weeks to avoid egress alarms.', indicators: ['Cumulative egress to research domain exceeds baseline', 'Encrypted archives created on file server'], noiseIndicators: ['Legitimate research collaboration'], mitigations: { escalate: 1.0, isolate_host: 0.9, hunt_iocs: 0.7 }, impact: { data: 80 }, apt: true }
          ];

          // ── Combo bonuses: playing these pairs/triples together unlocks bonus effects ──
          var blueCombos = [
            { id: 'full_containment', ids: ['isolate_host', 'deploy_edr'], label: 'Full Containment', effect: 'effectBoost', value: 0.3, description: 'Isolate + EDR together prevent lateral spread and catch payloads mid-flight.' },
            { id: 'identity_hardening', ids: ['reset_credential', 'awareness_blast'], label: 'Identity Hardening', effect: 'effectBoost', value: 0.25, description: 'Reset creds AND warn users before they reuse old ones elsewhere.' },
            { id: 'perimeter_hunt', ids: ['block_ip', 'hunt_iocs'], label: 'Perimeter + Hunt', effect: 'bonusXP', value: 2, description: 'Block known-bad AND hunt for unknown-bad. Full surface coverage.' },
            { id: 'deep_analysis', ids: ['investigate', 'hunt_iocs'], label: 'Deep Analysis', effect: 'bonusXP', value: 2, description: 'Surface-level and deep-level investigation \u2014 nothing slips through.' },
            { id: 'defense_in_depth', ids: ['patch', 'deploy_edr'], label: 'Defense in Depth', effect: 'minEffect', value: 0.6, description: 'Patch the known hole AND watch for zero-days \u2014 layered defense.' },
            { id: 'crisis_response', ids: ['escalate', 'isolate_host'], label: 'Crisis Response', effect: 'effectBoost', value: 0.4, description: 'Emergency containment + executive authorization. Overwhelming late-stage response.' }
          ];

          // ── Detect which combos are active in the current blue plays ──
          function detectActiveCombos(playIds) {
            return blueCombos.filter(function(combo) {
              return combo.ids.every(function(id) { return playIds.indexOf(id) !== -1; });
            });
          }

          // ── Blue Team card library ──
          var blueTeamCards = [
            { id: 'investigate',      label: 'Investigate Alert',   icon: '\uD83D\uDD0E', cost: 1, category: 'Analysis',              description: 'Read deeper into an alert. Reveals whether a signal is real or noise, and highlights the active attack step.' },
            { id: 'block_ip',         label: 'Block Sender/IP',     icon: '\uD83D\uDEAB', cost: 1, category: 'Perimeter',             description: 'Block a sender domain or IP at the perimeter. Strong vs delivery and C2 traffic.' },
            { id: 'reset_credential', label: 'Reset Credential',    icon: '\uD83D\uDD10', cost: 1, category: 'Identity',              description: 'Force password reset and kill active sessions. Neutralizes credential theft and rogue app tokens.' },
            { id: 'patch',            label: 'Emergency Patch',     icon: '\uD83E\uDDF0', cost: 2, category: 'Vulnerability mgmt',    description: 'Apply a known security update. Prevents exploitation of unpatched systems.' },
            { id: 'isolate_host',     label: 'Isolate Endpoint',    icon: '\uD83E\uDDF1', cost: 2, category: 'Containment',           description: 'Network-quarantine a suspicious host. Strong vs lateral movement, persistence, and C2.' },
            { id: 'awareness_blast',  label: 'User Awareness Blast',icon: '\uD83D\uDCE3', cost: 1, category: 'Human layer',           description: 'Urgent notice to staff about an active campaign. Reduces human-factor attack success.' },
            { id: 'deploy_edr',       label: 'Deploy EDR Rule',     icon: '\uD83D\uDEE1\uFE0F', cost: 2, category: 'Endpoint',         description: 'Push a detection rule to endpoints. Excellent against execution and persistence.' },
            { id: 'hunt_iocs',        label: 'Hunt for IOCs',       icon: '\uD83E\uDDEC', cost: 2, category: 'Threat hunting',        description: 'Proactive threat hunt across logs. Surfaces indicators early — especially strong in recon and C2.' },
            { id: 'escalate',         label: 'Escalate to CISO',    icon: '\uD83D\uDEA8', cost: 3, category: 'Crisis management',     description: 'Pull the emergency brake. Once per campaign. Major impact on late-stage attacks.' }
          ];

          // ── Campaign themes — bias the red team's card pool ──
          var campaignThemes = {
            mixed: {
              id: 'mixed', label: 'Mixed Threat Landscape', icon: '\uD83C\uDFAF',
              desc: 'A random adversary drawing from the full playbook. Best for your first run.',
              preferred: null
            },
            ransomware: {
              id: 'ransomware', label: 'Ransomware Crew', icon: '\uD83D\uDD12',
              desc: 'A financially-motivated crew aiming to encrypt your environment for ransom. Expect loud, destructive finales.',
              preferred: {
                recon: ['r_dnsenum', 'r_s3scan'],
                delivery: ['d_spearcfo', 'd_typosquat'],
                exploit: ['e_cve', 'e_credstuff'],
                persist: ['p_service', 'p_schedtask'],
                c2: ['c_httpscdn', 'c_dnstun'],
                actions: ['a_ransom', 'a_sabotage']
              }
            },
            bec: {
              id: 'bec', label: 'BEC Fraud Ring', icon: '\uD83D\uDCB0',
              desc: 'Business Email Compromise specialists after wire-transfer fraud. Patient, social-engineering-heavy, low-noise.',
              preferred: {
                recon: ['r_linkedin', 'r_osint'],
                delivery: ['d_spearcfo', 'd_sms'],
                exploit: ['e_credstuff'],
                persist: ['p_oauthapp', 'p_runkey'],
                c2: ['c_slackhook', 'c_httpscdn'],
                actions: ['a_wirefraud', 'a_piiexfil']
              }
            },
            insider: {
              id: 'insider', label: 'Insider Threat', icon: '\uD83C\uDFAD',
              desc: 'A trusted employee abusing legitimate access. Few external IOCs \u2014 hunt behaviorally, not by signature.',
              preferred: {
                recon: ['r_osint'],
                delivery: ['d_usb'],
                exploit: ['e_credstuff'],
                persist: ['p_oauthapp', 'p_runkey'],
                c2: ['c_slackhook'],
                actions: ['a_piiexfil', 'a_sabotage']
              }
            },
            apt: {
              id: 'apt', label: 'Nation-State APT', icon: '\uD83C\uDF10',
              desc: 'A patient, well-funded adversary using zero-days, signed binaries, and firmware persistence. Only patching and scanning won\'t save you.',
              preferred: {
                recon: ['r_supplychain', 'r_dnsenum'],
                delivery: ['d_signed_driver', 'd_spearcfo'],
                exploit: ['e_zeroday', 'e_cve'],
                persist: ['p_firmware', 'p_service'],
                c2: ['c_slow_dns', 'c_httpscdn'],
                actions: ['a_longexfil', 'a_piiexfil']
              },
              locked: true,
              unlockCondition: function(dd) {
                return Object.keys(dd.warRoomAchievements || {}).length >= 6;
              },
              unlockHint: 'Earn 6 Trophy Room achievements to unlock.'
            }
          };

          // ── Cross-mode rewards: mastery of other Cyber Defense modes grants War Room perks ──
          function computeCrossModeBonuses(dd) {
            var b = { budgetBonus: 0, freeFirstUse: [], earned: [] };
            if ((dd.phishScore || 0) >= 5) {
              b.budgetBonus += 3;
              b.earned.push({ id: 'phishing_master', icon: '\uD83C\uDFA3', label: 'Phishing Master', perk: '+3 starting budget', source: 'Cyber Detective: 5+ correct IDs' });
            }
            if ((dd.casesClosed || 0) >= 10) {
              if (b.freeFirstUse.indexOf('awareness_blast') === -1) b.freeFirstUse.push('awareness_blast');
              b.earned.push({ id: 'seasoned_detective', icon: '\uD83D\uDD75\uFE0F', label: 'Seasoned Detective', perk: 'First Awareness Blast is free', source: 'Cyber Detective: 10+ cases closed' });
            }
            if (dd.pwInput && dd.pwInput.length >= 12) {
              if (b.freeFirstUse.indexOf('reset_credential') === -1) b.freeFirstUse.push('reset_credential');
              b.earned.push({ id: 'password_pro', icon: '\uD83D\uDD10', label: 'Password Pro', perk: 'First Reset Credential is free', source: 'Password Forge: tested a 12+ char password' });
            }
            if ((dd.seQuizScore || 0) >= 5) {
              if (b.freeFirstUse.indexOf('investigate') === -1) b.freeFirstUse.push('investigate');
              b.earned.push({ id: 'social_shield', icon: '\uD83C\uDFAD', label: 'Social Shield', perk: 'First Investigate is free', source: 'Social Engineering: 5+ correct' });
            }
            if ((dd.netScore || 0) >= 5) {
              if (b.freeFirstUse.indexOf('hunt_iocs') === -1) b.freeFirstUse.push('hunt_iocs');
              b.earned.push({ id: 'traffic_analyst', icon: '\uD83D\uDCE1', label: 'Traffic Analyst', perk: 'First Hunt for IOCs is free', source: 'Traffic Analyzer: 5+ correct flags' });
            }
            return b;
          }
          var warCrossBonuses = computeCrossModeBonuses(d);

          // ── prefers-reduced-motion detection (cached per render) ──
          var reducedMotion = false;
          try { reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch(e) {}
          // Sync sound-muted flag for sfx helpers (defined at file load, read window flag)
          try { window.__cyberWarMuted = !!warRoomSoundMuted; } catch(e) {}

          // ── Live Session Broadcast (best-effort; silently disabled if Firebase unavailable) ──
          var warLive = (function() {
            var fb = (typeof window !== 'undefined' && window.__alloFirebase) || null;
            var shared = (typeof window !== 'undefined' && window.__alloShared) || null;
            var sessionCode = ctx.activeSessionCode || null;
            var db = shared && shared.db;
            var available = !!(fb && fb.doc && fb.setDoc && fb.onSnapshot && db && sessionCode);
            return { fb: fb, db: db, sessionCode: sessionCode, available: available };
          })();
          function warLiveDocRef() {
            if (!warLive.available) return null;
            try {
              // Firestore v9 modular API: doc(db, path...)
              return warLive.fb.doc(warLive.db, 'sessions', warLive.sessionCode, 'tools', 'warroom');
            } catch(e) { return null; }
          }
          // Serialize from FRESH toolData (avoids stale-closure issue when called via setTimeout)
          function warLiveSerializeFromFresh() {
            var fresh = (ctx.toolData && ctx.toolData.cyberDefense) || {};
            return {
              v: 1,
              hostName: ctx.studentNickname || 'Host',
              active: !!fresh.warRoomActive,
              round: fresh.warRoomRound || 1,
              difficulty: fresh.warRoomDifficulty || 'rookie',
              theme: fresh.warRoomCampaignTheme || 'mixed',
              campaignId: fresh.warRoomCampaignId || null,
              redAction: fresh.warRoomRedAction || null,
              alerts: fresh.warRoomAlerts || [],
              alertsSeen: fresh.warRoomAlertsSeen || [],
              bluePlays: fresh.warRoomBluePlays || [],
              budget: fresh.warRoomBudget != null ? fresh.warRoomBudget : 0,
              assets: fresh.warRoomAssets || { users: 10, servers: 5, data: 100 },
              assetsLost: fresh.warRoomAssetsLost || { users: 0, servers: 0, data: 0 },
              killChain: fresh.warRoomKillChain || [],
              verdict: fresh.warRoomVerdict || null,
              roundResolved: !!fresh.warRoomRoundResolved,
              lastResolution: fresh.warRoomLastResolution || null,
              log: (fresh.warRoomLog || []).slice(-12),
              detections: fresh.warRoomDetections || 0,
              mitigations: fresh.warRoomMitigations || 0,
              hotSeatEnabled: !!fresh.warRoomHotSeatEnabled,
              hotSeatPlayers: fresh.warRoomHotSeatPlayers || [],
              hotSeatCurrentIdx: fresh.warRoomHotSeatCurrentIdx || 0,
              ts: Date.now()
            };
          }
          function warLivePush() {
            // Read mode from fresh state too — user may have ended broadcast since closure was captured
            var fresh = (ctx.toolData && ctx.toolData.cyberDefense) || {};
            if (fresh.warRoomLiveMode !== 'hosting') return;
            var ref = warLiveDocRef();
            if (!ref) return;
            try { warLive.fb.setDoc(ref, warLiveSerializeFromFresh()); } catch(e) { /* silent */ }
          }
          function warLiveStartHosting() {
            if (!warLive.available) { if (ctx.addToast) ctx.addToast('Live broadcast unavailable \u2014 check session code', 'info'); return; }
            upd({ warRoomLiveMode: 'hosting', warRoomLiveHostName: ctx.studentNickname || 'Host' });
            setTimeout(warLivePush, 100); // next render cycle sees hosting=true
            if (ctx.addToast) ctx.addToast('\uD83D\uDD34 Now broadcasting to session ' + warLive.sessionCode, 'success');
          }
          function warLiveStartObserving() {
            if (!warLive.available) { if (ctx.addToast) ctx.addToast('Live observe unavailable \u2014 check session code', 'info'); return; }
            // Warn if observing will overwrite an active local campaign
            if (warRoomActive && !warRoomVerdict) {
              var ok = confirm('Observing will replace your active campaign with the host\'s view. Your local progress will be lost. Continue?');
              if (!ok) return;
            }
            upd({ warRoomLiveMode: 'observing', warRoomLiveLastSync: 0 }); // reset sync ts so next snapshot always applies
            if (ctx.addToast) ctx.addToast('\uD83D\uDC41\uFE0F Observing session ' + warLive.sessionCode, 'info');
          }
          function warLiveStop() {
            if (window._cyberWarRoomLiveUnsub) { try { window._cyberWarRoomLiveUnsub(); } catch(e){} window._cyberWarRoomLiveUnsub = null; }
            upd({ warRoomLiveMode: 'off', warRoomLiveHostName: null });
            if (ctx.addToast) ctx.addToast('Live session ended', 'info');
          }
          // Observer subscription: sync local warRoom* state from the host's broadcast
          if (cyberTab === 'warroom' && warRoomLiveMode === 'observing' && warLive.available) {
            // Only (re)subscribe if no active listener
            if (!window._cyberWarRoomLiveUnsub) {
              try {
                var ref = warLiveDocRef();
                if (ref) {
                  window._cyberWarRoomLiveUnsub = warLive.fb.onSnapshot(ref, function(snap) {
                    try {
                      var data = snap && snap.data && snap.data();
                      if (!data) return;
                      // Shallow-mirror host state into local storage keys. Only update if timestamp is newer.
                      if (data.ts && data.ts <= (d.warRoomLiveLastSync || 0)) return;
                      upd({
                        warRoomActive: !!data.active,
                        warRoomRound: data.round || 1,
                        warRoomDifficulty: data.difficulty || 'rookie',
                        warRoomCampaignTheme: data.theme || 'mixed',
                        warRoomCampaignId: data.campaignId || null,
                        warRoomRedAction: data.redAction || null,
                        warRoomAlerts: data.alerts || [],
                        warRoomAlertsSeen: data.alertsSeen || [],
                        warRoomBluePlays: data.bluePlays || [],
                        warRoomBudget: data.budget != null ? data.budget : 0,
                        warRoomAssets: data.assets || { users: 10, servers: 5, data: 100 },
                        warRoomAssetsLost: data.assetsLost || { users: 0, servers: 0, data: 0 },
                        warRoomKillChain: data.killChain || [],
                        warRoomVerdict: data.verdict || null,
                        warRoomRoundResolved: !!data.roundResolved,
                        warRoomLastResolution: data.lastResolution || null,
                        warRoomLog: data.log || [],
                        warRoomDetections: data.detections || 0,
                        warRoomMitigations: data.mitigations || 0,
                        warRoomHotSeatEnabled: !!data.hotSeatEnabled,
                        warRoomHotSeatPlayers: data.hotSeatPlayers || [],
                        warRoomHotSeatCurrentIdx: data.hotSeatCurrentIdx || 0,
                        warRoomLiveHostName: data.hostName || 'Host',
                        warRoomLiveLastSync: data.ts || Date.now()
                      });
                    } catch(e) { /* silent */ }
                  });
                }
              } catch(e) { /* silent */ }
            }
          } else {
            // Tear down listener if we're no longer observing
            if (window._cyberWarRoomLiveUnsub) { try { window._cyberWarRoomLiveUnsub(); } catch(e){} window._cyberWarRoomLiveUnsub = null; }
          }
          var warLiveIsObserving = warRoomLiveMode === 'observing';
          var warLiveIsHosting   = warRoomLiveMode === 'hosting';

          // ── Observer suggestion chat (one-way: observers → host) ──
          function warLiveChatDocRef() {
            if (!warLive.available) return null;
            try { return warLive.fb.doc(warLive.db, 'sessions', warLive.sessionCode, 'tools', 'warroom_chat'); } catch(e) { return null; }
          }
          function warLiveSendSuggestion(text) {
            var clean = String(text || '').trim().slice(0, 140);
            if (!clean) return;
            var ref = warLiveChatDocRef();
            if (!ref) return;
            try {
              // Read current messages from render-time state (best-effort; race tolerant)
              var existing = (warRoomChatMessages || []).slice();
              var entry = { text: clean, from: ctx.studentNickname || 'Observer', at: Date.now() };
              existing.push(entry);
              var trimmed = existing.slice(-10); // keep last 10 only
              warLive.fb.setDoc(ref, { messages: trimmed });
              upd('warRoomChatDraft', '');
              if (ctx.addToast) ctx.addToast('\uD83D\uDCAC Suggestion sent to host', 'info');
              if (ctx.announceToSR) ctx.announceToSR('Suggestion sent.');
            } catch(e) { if (ctx.addToast) ctx.addToast('Send failed', 'info'); }
          }
          // Subscribe to chat doc when hosting or observing a live session
          if (window._cyberWarRoomChatUnsub) { try { window._cyberWarRoomChatUnsub(); } catch(e){} window._cyberWarRoomChatUnsub = null; }
          if (cyberTab === 'warroom' && (warLiveIsHosting || warLiveIsObserving) && warLive.available) {
            try {
              var chatRef = warLiveChatDocRef();
              if (chatRef) {
                window._cyberWarRoomChatUnsub = warLive.fb.onSnapshot(chatRef, function(snap) {
                  try {
                    var data = snap && snap.data && snap.data();
                    var msgs = (data && data.messages) || [];
                    upd('warRoomChatMessages', msgs.slice(-10));
                  } catch(e) { /* silent */ }
                });
              }
            } catch(e) { /* silent */ }
          }

          // ── Daily Challenge: deterministic seed + difficulty + theme rotation by UTC date ──
          function dailyChallenge() {
            var today = new Date();
            var pad2 = function(n) { return (n < 10 ? '0' : '') + n; };
            var dateStr = today.getUTCFullYear() + '-' + pad2(today.getUTCMonth() + 1) + '-' + pad2(today.getUTCDate());
            // Hash the date string into a 4-char campaign ID
            var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            var h = 2166136261;
            for (var i = 0; i < dateStr.length; i++) { h ^= dateStr.charCodeAt(i); h = Math.imul(h, 16777619); }
            var x = h >>> 0;
            var id = '';
            for (var k = 0; k < 4; k++) { id += chars[x % chars.length]; x = Math.floor(x / chars.length); }
            // Rotate theme + difficulty based on day-of-year so it varies
            var themeRotation = ['mixed', 'ransomware', 'bec', 'insider'];
            var diffRotation = ['rookie', 'analyst', 'analyst', 'analyst', 'threatHunter']; // weighted toward analyst
            var dayNum = Math.floor((today - new Date(Date.UTC(today.getUTCFullYear(), 0, 0))) / 86400000);
            return {
              id: id,
              dateStr: dateStr,
              theme: themeRotation[dayNum % themeRotation.length],
              difficulty: diffRotation[dayNum % diffRotation.length]
            };
          }
          // ── Weekly Challenge: one campaign seed per UTC-week, themed tougher than daily ──
          function weeklyChallenge() {
            var today = new Date();
            var pad2 = function(n) { return (n < 10 ? '0' : '') + n; };
            // Compute Monday (start of week) in UTC
            var utc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            var dow = utc.getUTCDay(); // 0=Sun..6=Sat
            var daysToMon = (dow + 6) % 7;
            utc.setUTCDate(utc.getUTCDate() - daysToMon);
            var weekKey = utc.getUTCFullYear() + '-W-' + pad2(Math.floor(((utc - Date.UTC(utc.getUTCFullYear(), 0, 0)) / 86400000 - 1) / 7) + 1);
            // Hash weekKey into a 4-char id
            var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            var h = 2166136261;
            for (var i = 0; i < weekKey.length; i++) { h ^= weekKey.charCodeAt(i); h = Math.imul(h, 16777619); }
            var x = h >>> 0;
            var id = '';
            for (var k = 0; k < 4; k++) { id += chars[x % chars.length]; x = Math.floor(x / chars.length); }
            // Rotate theme by week index
            var themeRotation = ['ransomware', 'bec', 'insider', 'mixed'];
            var weekIdx = Math.floor((utc - Date.UTC(utc.getUTCFullYear(), 0, 0)) / (86400000 * 7));
            return {
              id: id,
              weekKey: weekKey,
              theme: themeRotation[weekIdx % themeRotation.length],
              difficulty: 'threatHunter'
            };
          }
          var thisWeeksChallenge = weeklyChallenge();
          var weeklyCompletions = d.warRoomWeeklyCompletions || {};
          var weekCompletion = weeklyCompletions[thisWeeksChallenge.weekKey] || null;

          var todaysChallenge = dailyChallenge();
          var dailyCompletions = d.warRoomDailyCompletions || {};
          var todayCompletion = dailyCompletions[todaysChallenge.dateStr] || null;
          // Compute current daily streak (consecutive days ending on or before today with a completion)
          var dailyStreak = (function() {
            var streak = 0;
            var cursor = new Date();
            var pad2 = function(n) { return (n < 10 ? '0' : '') + n; };
            for (var i = 0; i < 365; i++) {
              var key = cursor.getUTCFullYear() + '-' + pad2(cursor.getUTCMonth() + 1) + '-' + pad2(cursor.getUTCDate());
              if (dailyCompletions[key]) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
              else break;
            }
            return streak;
          })();

          // ── Seeded PRNG: xorshift32 variant. Reproducible campaigns from a 4-char ID. ──
          function seedFromId(id) {
            if (!id) return (Math.random() * 0xffffffff) >>> 0;
            var h = 2166136261;
            for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
            return (h >>> 0) || 1;
          }
          // Closure-local RNG state. Mutable via assignments in startCampaign/advanceFromDebrief so
          // deterministic RNG "takes hold" mid-render when a campaign ID is just being assigned.
          // Callers that trigger RNG MUST include `warRoomRngStep: localRngStep` in their final
          // upd() payload so the sequence persists across renders.
          var rngActiveId = warRoomCampaignId;
          var localRngStep = d.warRoomRngStep || 0;
          function warRng() {
            if (!rngActiveId) return Math.random();
            var s = (seedFromId(rngActiveId) ^ Math.imul(localRngStep + 1, 2654435761)) >>> 0;
            s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
            localRngStep += 1;
            return ((s >>> 0) / 4294967296);
          }

          // ── Pick a red card for a given stage & difficulty, avoiding repeats ──
          function rollRedAction(stage, diff, history, themeId) {
            var pool = redTeamCards.filter(function(c) { return c.stage === stage; });
            var usedIds = (history || []).map(function(h) { return h.red && h.red.id; });
            var fresh = pool.filter(function(c) { return usedIds.indexOf(c.id) === -1; });
            if (fresh.length === 0) fresh = pool;

            // Theme bias: prefer cards the campaign theme targets
            var theme = campaignThemes[themeId || 'mixed'];
            if (theme && theme.preferred && theme.preferred[stage]) {
              var themed = fresh.filter(function(c) { return theme.preferred[stage].indexOf(c.id) !== -1; });
              if (themed.length > 0) fresh = themed;
            }

            // Threat Hunter difficulty: prefer a card that escalates prior success
            if (diff === 'threatHunter' && history && history.length > 0) {
              var lastSuccess = null;
              for (var h = history.length - 1; h >= 0; h--) {
                if (history[h].outcome === 'succeeded') { lastSuccess = history[h]; break; }
              }
              if (lastSuccess) {
                return fresh[fresh.length - 1];
              }
            }
            return fresh[Math.floor(warRng() * fresh.length)];
          }

          // ── Generate alerts (mix of real IOCs and noise; harder = more noise) ──
          function generateAlerts(redCard, diff) {
            var real = (redCard.indicators || []).slice();
            var noise = (redCard.noiseIndicators || []).slice();
            var out = [];
            var stealth = warRoomHouseRulesActive && warRoomHouseRulesActive.allStealth;
            var realCount = diff === 'rookie' ? real.length : (diff === 'analyst' ? Math.max(1, real.length - 1) : Math.max(1, real.length - 1));
            if (stealth) realCount = Math.max(1, realCount - 1);
            var noiseCount = diff === 'rookie' ? 0 : (diff === 'analyst' ? 1 : 2);
            for (var i = 0; i < realCount && real.length > 0; i++) {
              out.push({ id: 'a_real_' + i, text: real.shift(), real: true });
            }
            for (var j = 0; j < noiseCount && noise.length > 0; j++) {
              out.push({ id: 'a_noise_' + j, text: noise.shift(), real: false });
            }
            // shuffle
            for (var s = out.length - 1; s > 0; s--) {
              var r = Math.floor(warRng() * (s + 1));
              var t = out[s]; out[s] = out[r]; out[r] = t;
            }
            return out;
          }

          // ── Resolve current round based on defensive cards played ──
          function resolveRound(redCard, bluePlayIds) {
            var bestEffect = 0;
            var matchedPlays = [];
            bluePlayIds.forEach(function(cid) {
              var eff = (redCard.mitigations && redCard.mitigations[cid]) || 0;
              if (eff > 0) matchedPlays.push({ id: cid, eff: eff });
              if (eff > bestEffect) bestEffect = eff;
            });

            // Apply combos (suppressed by the 'noCombos' house rule)
            var suppressCombos = warRoomHouseRulesActive && warRoomHouseRulesActive.noCombos;
            var activeCombos = suppressCombos ? [] : detectActiveCombos(bluePlayIds);
            var bonusXP = 0;
            activeCombos.forEach(function(combo) {
              if (combo.effect === 'effectBoost') {
                bestEffect = Math.min(1.0, bestEffect + combo.value);
              } else if (combo.effect === 'minEffect') {
                bestEffect = Math.max(bestEffect, combo.value);
              } else if (combo.effect === 'bonusXP') {
                bonusXP += combo.value;
              }
            });

            var outcome, xpDelta, assetsLost = { users: 0, servers: 0, data: 0 };
            if (bestEffect >= 1.0) {
              outcome = 'mitigated';
              xpDelta = 6 + bonusXP;
            } else if (bestEffect >= 0.5) {
              outcome = 'detected';
              xpDelta = 4 + bonusXP;
              ['users', 'servers', 'data'].forEach(function(k) {
                if (redCard.impact && redCard.impact[k]) assetsLost[k] = Math.ceil(redCard.impact[k] * (1 - bestEffect));
              });
            } else {
              outcome = 'succeeded';
              xpDelta = 1 + bonusXP;
              ['users', 'servers', 'data'].forEach(function(k) {
                if (redCard.impact && redCard.impact[k]) assetsLost[k] = redCard.impact[k];
              });
            }
            return { outcome: outcome, xpDelta: xpDelta, assetsLost: assetsLost, matchedPlays: matchedPlays, activeCombos: activeCombos, bestEffect: bestEffect };
          }

          // ── Start a new campaign ──
          function startCampaign(diff, themeId, seedId, opts) {
            var theme = campaignThemes[themeId] ? themeId : 'mixed';
            var isBoss = !!(opts && opts.bossMode);
            // Lock the house rules draft for this campaign (can't change mid-run)
            var activeRules = Object.assign({ noEscalate: false, tightBudget: false, allStealth: false, noCombos: false }, warRoomHouseRulesDraft || {});
            var baseBudget = diff === 'rookie' ? 18 : (diff === 'analyst' ? 14 : 10);
            var bossBudgetCap = isBoss ? Math.min(baseBudget, 10) : baseBudget; // boss mode caps starting budget
            var budget = bossBudgetCap + (warCrossBonuses.budgetBonus || 0) + (activeRules.tightBudget ? -3 : 0);
            // Campaign ID: either player-supplied (shared seed) or freshly generated. Seeds the PRNG.
            var campaignId;
            if (seedId && /^[A-HJ-NP-Z2-9]{4}$/.test(seedId.toUpperCase())) {
              campaignId = seedId.toUpperCase();
            } else {
              var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
              campaignId = '';
              for (var k = 0; k < 4; k++) campaignId += chars[Math.floor(Math.random() * chars.length)];
            }
            // Activate deterministic RNG with this ID for the remaining setup calls
            rngActiveId = campaignId;
            localRngStep = 0;
            var firstStageId = isBoss ? 'exploit' : 'recon';
            var firstRed = rollRedAction(firstStageId, diff, [], theme);
            var firstAlerts = generateAlerts(firstRed, diff);
            var openingLine = campaignThemes[theme].label !== 'Mixed Threat Landscape'
              ? 'Campaign begins. Threat intel flags this as a ' + campaignThemes[theme].label + ' operation. Stay sharp.'
              : 'Campaign begins. Threat intel team is tracking adversary activity. Stay sharp.';
            upd({
              warRoomActive: true,
              warRoomRound: 1,
              warRoomDifficulty: diff,
              warRoomCampaignTheme: theme,
              warRoomKillChain: [],
              warRoomRedAction: firstRed,
              warRoomAlerts: firstAlerts,
              warRoomAlertsSeen: [],
              warRoomBudget: budget,
              warRoomAssets: { users: 10, servers: 5, data: 100 },
              warRoomAssetsLost: { users: 0, servers: 0, data: 0 },
              warRoomLog: [openingLine],
              warRoomBluePlays: [],
              warRoomVerdict: null,
              warRoomAAR: null,
              warRoomEscalateUsed: false,
              warRoomDetections: 0,
              warRoomMitigations: 0,
              warRoomRoundResolved: false,
              warRoomLastResolution: null,
              warRoomHintsUsed: 0,
              warRoomHintRevealed: false,
              warRoomFreeUsed: [],
              warRoomTimeLeft: 90,
              warRoomTotalCombos: 0,
              warRoomTimedOutAny: false,
              warRoomCampaignAchievements: [],
              warRoomCampaignId: campaignId,
              warRoomHotSeatCurrentIdx: 0,
              warRoomHotSeatStats: {},
              warRoomHotSeatPassScreen: warRoomHotSeatEnabled && warRoomHotSeatPlayers.length > 1,
              warRoomRngStep: localRngStep,
              warRoomPlayLog: [],
              warRoomReflection: '',
              warRoomAlertFocusIdx: -1,
              warRoomHouseRulesActive: activeRules,
              warRoomIsBossMode: isBoss,
              warRoomScratchpad: '',
              warRoomRoundStartSnapshot: {
                budget: budget,
                assets: { users: 10, servers: 5, data: 100 },
                assetsLost: { users: 0, servers: 0, data: 0 },
                killChainLength: 0,
                detections: 0,
                mitigations: 0,
                totalCombos: 0,
                escalateUsed: false,
                freeUsed: []
              },
              warRoomRetryUsedThisRound: false
            });
            if (ctx.announceToSR) ctx.announceToSR('War Room campaign started on ' + diff + ' difficulty, ' + campaignThemes[theme].label + '. Round 1, Reconnaissance. ' + firstRed.title);
            sfxCyberdClick();
            if (warLiveIsHosting) setTimeout(warLivePush, 100);
          }

          // ── Play a blue card this round ──
          function playBlueCard(cardId) {
            if (warLiveIsObserving) return; // observers can't act
            if (warRoomRoundResolved) return;
            var card = blueTeamCards.filter(function(c) { return c.id === cardId; })[0];
            if (!card) return;
            if (warRoomBluePlays.indexOf(cardId) !== -1) return; // no double-play
            if (card.id === 'escalate' && warRoomEscalateUsed) return;
            // Cross-mode free first use
            var isFree = warCrossBonuses.freeFirstUse.indexOf(cardId) !== -1 && warRoomFreeUsed.indexOf(cardId) === -1;
            var effectiveCost = isFree ? 0 : card.cost;
            if (effectiveCost > warRoomBudget) {
              if (ctx.addToast) ctx.addToast('Not enough budget for ' + card.label, 'info');
              return;
            }
            var newPlays = warRoomBluePlays.concat([cardId]);
            var logEntry = { cardId: cardId, costPaid: effectiveCost, wasFree: isFree, markedEscalate: card.id === 'escalate' };
            var updates = {
              warRoomBluePlays: newPlays,
              warRoomBudget: warRoomBudget - effectiveCost,
              warRoomPlayLog: warRoomPlayLog.concat([logEntry])
            };
            if (card.id === 'escalate') updates.warRoomEscalateUsed = true;
            if (isFree) updates.warRoomFreeUsed = warRoomFreeUsed.concat([cardId]);
            upd(updates);
            sfxCyberdClick();
            if (ctx.announceToSR) ctx.announceToSR('Played ' + card.label + (isFree ? ' (free use)' : '') + '. Budget: ' + (warRoomBudget - effectiveCost) + '.');
          }

          // ── Undo the most recent blue card play this round (before resolve) ──
          function undoLastPlay() {
            if (warLiveIsObserving) return;
            if (warRoomRoundResolved) return;
            if (!warRoomPlayLog || warRoomPlayLog.length === 0) return;
            var last = warRoomPlayLog[warRoomPlayLog.length - 1];
            var newPlays = warRoomBluePlays.slice();
            var idx = newPlays.lastIndexOf(last.cardId);
            if (idx !== -1) newPlays.splice(idx, 1);
            var newLog = warRoomPlayLog.slice(0, -1);
            var updates = {
              warRoomBluePlays: newPlays,
              warRoomBudget: warRoomBudget + (last.costPaid || 0),
              warRoomPlayLog: newLog
            };
            if (last.markedEscalate) updates.warRoomEscalateUsed = false;
            if (last.wasFree) {
              var nf = warRoomFreeUsed.slice();
              var fidx = nf.lastIndexOf(last.cardId);
              if (fidx !== -1) nf.splice(fidx, 1);
              updates.warRoomFreeUsed = nf;
            }
            upd(updates);
            sfxCyberdClick();
            var card = blueTeamCards.filter(function(c) { return c.id === last.cardId; })[0];
            if (ctx.announceToSR) ctx.announceToSR('Undid ' + (card ? card.label : last.cardId) + '. Budget restored.');
          }

          // ── Request a hint (costs 1 budget, reveals the ideal play's CATEGORY without naming the card) ──
          function requestHint() {
            if (warLiveIsObserving) return;
            if (warRoomHintRevealed || warRoomRoundResolved) return;
            if (warRoomBudget < 1) { if (ctx.addToast) ctx.addToast('Not enough budget for a hint', 'info'); return; }
            upd({
              warRoomHintRevealed: true,
              warRoomHintsUsed: warRoomHintsUsed + 1,
              warRoomBudget: warRoomBudget - 1
            });
            sfxCyberdClick();
            if (ctx.announceToSR) ctx.announceToSR('Hint revealed.');
          }

          // ── Generate a fresh red team card for the current stage using Gemini ──
          function generateAIRedCard() {
            if (warLiveIsObserving) return;
            if (warRoomAICardLoading || warRoomRoundResolved || warRoomBluePlays.length > 0) return;
            if (!ctx.callGemini) {
              if (ctx.addToast) ctx.addToast('AI unavailable \u2014 keeping current scenario', 'info');
              return;
            }
            upd('warRoomAICardLoading', true);
            var stageObj = warRoomCurrentStage || warStages[warRoomRound - 1];
            var blueIds = blueTeamCards.map(function(c) { return c.id; });
            var themeLabel = campaignThemes[warRoomCampaignTheme] ? campaignThemes[warRoomCampaignTheme].label : 'Mixed';
            var prompt = 'You are designing a Red Team card for a SOC training simulation. Generate a realistic but abstracted attack scenario. ' +
              'Stage: ' + stageObj.name + ' (' + stageObj.id + '). Campaign theme: ' + themeLabel + '. Difficulty: ' + warRoomDifficulty + '.\n\n' +
              'Valid blue team card IDs (pick 1-3 for the mitigations map): ' + blueIds.join(', ') + '.\n' +
              'Categorize each by how well it would stop this attack: 1.0 = fully mitigates, 0.6 = partial (detect/degrade), 0.3 = minor help.\n\n' +
              'Return ONLY valid JSON with this exact structure:\n' +
              '{"id":"ai_<short_unique>","stage":"' + stageObj.id + '","title":"<10-word attack name>","description":"<1-2 sentence plain-English description>",' +
              '"indicators":["<real IOC 1>","<real IOC 2>"],"noiseIndicators":["<red-herring signal 1>"],' +
              '"mitigations":{"<blue_id>":1.0,"<blue_id>":0.6},"impact":{"users":<0-3>,"servers":<0-3>,"data":<0-30>}}\n\n' +
              'Rules:\n' +
              '- Title: punchy, concrete. E.g. "Spear phish Legal with fake subpoena PDF".\n' +
              '- description: plain, no jargon overload. Suitable for a K-12 student analyst.\n' +
              '- 1-3 real indicators, 0-2 noise indicators.\n' +
              '- Mitigations keys MUST be from the valid ID list above.\n' +
              '- impact.data cap at 30 unless actions stage.\n' +
              '- Avoid reusing these titles: ' + (warRoomKillChain.map(function(h) { return h.red.title; }).join('; ') || 'none') + '.';

            ctx.callGemini(prompt, true, false, 0.85).then(function(response) {
              try {
                var parsed = typeof response === 'string' ? JSON.parse(response) : response;
                // Validate
                if (parsed && parsed.title && parsed.description && parsed.mitigations && typeof parsed.mitigations === 'object') {
                  // Sanitize mitigations: drop any keys not in blueIds
                  var cleanMit = {};
                  Object.keys(parsed.mitigations).forEach(function(k) {
                    if (blueIds.indexOf(k) !== -1) cleanMit[k] = Math.max(0, Math.min(1, Number(parsed.mitigations[k]) || 0));
                  });
                  if (Object.keys(cleanMit).length === 0) throw new Error('no valid mitigations');
                  parsed.mitigations = cleanMit;
                  parsed.stage = stageObj.id;
                  parsed.id = parsed.id || ('ai_' + Date.now());
                  parsed.indicators = Array.isArray(parsed.indicators) ? parsed.indicators : [];
                  parsed.noiseIndicators = Array.isArray(parsed.noiseIndicators) ? parsed.noiseIndicators : [];
                  parsed.impact = parsed.impact || {};
                  parsed._aiGenerated = true;
                  var newAlerts = generateAlerts(parsed, warRoomDifficulty);
                  upd({
                    warRoomRedAction: parsed,
                    warRoomAlerts: newAlerts,
                    warRoomAlertsSeen: [],
                    warRoomAICardLoading: false,
                    warRoomHintRevealed: false,
                    warRoomRngStep: localRngStep
                  });
                  if (ctx.addToast) ctx.addToast('\uD83E\uDD16 New AI scenario generated', 'info');
                  if (ctx.announceToSR) ctx.announceToSR('AI generated a new red team card: ' + parsed.title);
                  if (warLiveIsHosting) setTimeout(warLivePush, 100);
                  return;
                }
              } catch (e) { /* fall through */ }
              upd('warRoomAICardLoading', false);
              if (ctx.addToast) ctx.addToast('AI generation failed \u2014 keeping current scenario', 'info');
            }).catch(function() {
              upd('warRoomAICardLoading', false);
              if (ctx.addToast) ctx.addToast('AI generation failed \u2014 keeping current scenario', 'info');
            });
          }

          // ── Find the "ideal plays" for a red card (cards with mitigation >= 1.0) ──
          function idealPlaysFor(redCard) {
            if (!redCard || !redCard.mitigations) return [];
            var out = [];
            Object.keys(redCard.mitigations).forEach(function(cid) {
              if (redCard.mitigations[cid] >= 1.0) {
                var c = blueTeamCards.filter(function(b) { return b.id === cid; })[0];
                if (c) out.push(c);
              }
            });
            return out;
          }

          // ── MITRE ATT&CK technique tags per red card (for credibility + advanced learners) ──
          var mitreTechniques = {
            r_linkedin:     { id: 'T1589.002', name: 'Gather Victim Identity: Email Addresses' },
            r_dnsenum:      { id: 'T1590.002', name: 'Gather Victim Network: DNS' },
            r_s3scan:       { id: 'T1595.002', name: 'Active Scanning: Vulnerability Scanning' },
            r_osint:        { id: 'T1591',     name: 'Gather Victim Org Information' },
            d_spearcfo:     { id: 'T1566.001', name: 'Phishing: Spearphishing Attachment' },
            d_usb:          { id: 'T1091',     name: 'Replication Through Removable Media' },
            d_typosquat:    { id: 'T1583.001', name: 'Acquire Infrastructure: Domains' },
            d_sms:          { id: 'T1566.003', name: 'Phishing: Spearphishing via Service' },
            e_macro:        { id: 'T1204.002', name: 'User Execution: Malicious File' },
            e_cve:          { id: 'T1190',     name: 'Exploit Public-Facing Application' },
            e_credstuff:    { id: 'T1110.004', name: 'Brute Force: Credential Stuffing' },
            e_watering:     { id: 'T1189',     name: 'Drive-by Compromise' },
            p_schedtask:    { id: 'T1053.005', name: 'Scheduled Task/Job: Scheduled Task' },
            p_runkey:       { id: 'T1547.001', name: 'Registry Run Keys / Startup Folder' },
            p_service:      { id: 'T1543.003', name: 'Create/Modify System Process: Service' },
            p_oauthapp:     { id: 'T1550.001', name: 'Application Access Token' },
            c_dnstun:       { id: 'T1071.004', name: 'Application Layer Protocol: DNS' },
            c_httpscdn:     { id: 'T1071.001', name: 'Application Layer Protocol: Web' },
            c_slackhook:    { id: 'T1567.002', name: 'Exfiltration to Cloud Storage' },
            c_icmp:         { id: 'T1095',     name: 'Non-Application Layer Protocol' },
            a_piiexfil:     { id: 'T1041',     name: 'Exfiltration Over C2 Channel' },
            a_ransom:       { id: 'T1486',     name: 'Data Encrypted for Impact' },
            a_wirefraud:    { id: 'T1534',     name: 'Internal Spearphishing (BEC)' },
            a_sabotage:     { id: 'T1485',     name: 'Data Destruction' },
            r_supplychain:  { id: 'T1195.002', name: 'Supply Chain Compromise: Software' },
            d_signed_driver:{ id: 'T1553.002', name: 'Subvert Trust Controls: Code Signing' },
            e_zeroday:      { id: 'T1068',     name: 'Exploitation for Privilege Escalation' },
            p_firmware:     { id: 'T1542.001', name: 'Pre-OS Boot: System Firmware' },
            c_slow_dns:     { id: 'T1071.004', name: 'Application Layer Protocol: DNS (low-and-slow)' },
            a_longexfil:    { id: 'T1030',     name: 'Data Transfer Size Limits' }
          };

          // ── Plain Language rewrites: simpler words for the same concepts (UDL toggle) ──
          var plainStageCoachTips = {
            recon: 'COACH: The attacker is just looking around. They want to learn about your school, your staff, your computers. You won\'t see any viruses yet. Try **Hunt for IOCs** (search your logs) or **User Awareness Blast** (tell everyone to be careful).',
            delivery: 'COACH: The attacker is trying to make first contact \u2014 usually through an email, a text, or a USB stick. Look at who sent it. Fake senders often have tiny spelling tricks in their name. **Block Sender/IP** stops bad senders.',
            exploit: 'COACH: Something bad is trying to run on one of your computers. If you don\'t act, the attacker gets in. **Deploy EDR Rule** and **Isolate Endpoint** can catch or stop it. **Patch** fixes the hole they used.',
            persist: 'COACH: The attacker is trying to stay on your system \u2014 even if you turn the computer off and back on. **Deploy EDR Rule** is great here because it watches for sneaky "startup" tricks.',
            c2: 'COACH: A computer in your school is secretly calling the attacker\'s server to get instructions. Cut the call! **Block Sender/IP** stops the traffic. **Isolate Endpoint** cuts off the whole computer.',
            actions: 'COACH: This is what the attacker wanted all along \u2014 stealing data, asking for money, or breaking things. Move fast. **Escalate to CISO** (if you haven\'t yet) gives you extra help. **Isolate Endpoint** limits the damage.'
          };
          var plainStageLessons = {
            recon: 'When someone is planning an attack, they start by gathering information. Every fact they learn makes the next step easier for them. Spot them early \u2014 it saves you a lot of trouble later.',
            delivery: 'Delivery is when the attack tries to reach you \u2014 like a phishing email landing in an inbox. If you block the message from ever arriving, the rest of the attack never happens.',
            exploit: 'Exploitation means the attacker found a way to run their code on your computer. Keeping your software updated (patching) closes many of these doors before they can be used.',
            persist: 'After the attacker gets in, they usually set up ways to come back even after you clean up. If you only delete the virus but miss the "comeback ticket," they return.',
            c2: 'Once installed, the attacker needs to send commands and get data. Think of it like a walkie-talkie. If you break the walkie-talkie, they can\'t control the computer anymore.',
            actions: 'This is the final stage \u2014 the goal of the whole attack. Stealing files, locking your data for ransom, or scamming you for money. At this point, fast response matters more than detection.'
          };
          var plainBlueDescriptions = {
            investigate: 'Take a closer look at an alert. Sees if it\'s a real attack or just noise, and points you at the active move the attacker is making.',
            block_ip: 'Stop messages or traffic from a specific bad sender or address. Very good against phishing and attacker control channels.',
            reset_credential: 'Force a password change and log out all their sessions. Shuts down stolen logins and sneaky app permissions.',
            patch: 'Install a security fix for a known problem. Stops the attacker from using an old, already-fixed flaw.',
            isolate_host: 'Cut off a suspicious computer from the network. Stops the attack from spreading. Great for control channels too.',
            awareness_blast: 'Send a quick warning to everyone: "Watch out for this scam today." Helps people avoid falling for tricks.',
            deploy_edr: 'Push a new rule to every computer\'s security software. Great at catching viruses and sneaky comeback tricks.',
            hunt_iocs: 'Go searching through your logs for signs of an attacker. Finds hidden problems \u2014 especially in the scouting and control stages.',
            escalate: 'Call in your head of security for emergency help. You only get to do this once per campaign, so save it for when things are bad.'
          };
          var plainRedDescriptions = {
            r_linkedin: 'Attacker looks up your finance staff on LinkedIn to learn who works where and who reports to whom.',
            r_dnsenum: 'Attacker scans the internet for all your website addresses, including hidden test pages.',
            r_s3scan: 'Attacker looks for cloud storage boxes that were left open by accident.',
            r_osint: 'Attacker studies your IT team online \u2014 when they work, what tools they use \u2014 to plan the attack.',
            d_spearcfo: 'A fake email goes to the school\'s finance chief. It looks real, but it\'s from a look-alike address and has a dangerous attachment.',
            d_usb: 'Attacker drops branded USB sticks in the parking lot, hoping someone plugs one in.',
            d_typosquat: 'Attacker makes a fake website that looks like a real vendor\'s \u2014 same logo, but the web address has a tiny typo.',
            d_sms: 'Fake "IT department" text messages ask people to log in from their phones.',
            e_macro: 'The Word attachment someone opened runs hidden code that opens a door to the attacker.',
            e_cve: 'Attacker uses a known flaw that should have been patched months ago.',
            e_credstuff: 'Attacker tries thousands of stolen passwords from past breaches to find one that still works.',
            e_watering: 'A trusted industry website is hacked, and now visitors accidentally download a virus.',
            p_schedtask: 'Attacker sets up a secret scheduled task so their virus restarts every night.',
            p_runkey: 'Attacker hides a startup shortcut so their virus runs every time someone logs in.',
            p_service: 'Attacker installs a fake "service" that runs in the background and survives restarts.',
            p_oauthapp: 'A user accidentally gives a sketchy app permission to read their email.',
            c_dnstun: 'The attacker\'s virus talks to its home base by hiding messages inside normal internet lookups.',
            c_httpscdn: 'The attacker\'s control messages blend in with normal encrypted web traffic.',
            c_slackhook: 'Attacker abuses a Slack chat webhook to quietly send stolen data out.',
            c_icmp: 'The virus hides its messages inside ordinary "ping" packets.',
            a_piiexfil: 'Attacker copies a customer database and sends it out over the internet.',
            a_ransom: 'Attacker encrypts files on many computers and demands money to unlock them.',
            a_wirefraud: 'Finance gets a fake email from "the boss" asking them to wire $380,000 to an attacker-controlled bank.',
            a_sabotage: 'Attacker wipes important servers to slow down the school.',
            r_supplychain: 'A well-funded attacker studies your software vendors to find a way in through them.',
            d_signed_driver: 'Attacker uses a stolen digital signature to make malware look like a trusted update.',
            e_zeroday: 'Attacker uses a brand-new flaw that nobody has a fix for yet.',
            p_firmware: 'Attacker hides deep inside the computer\'s chips \u2014 deeper than the operating system.',
            c_slow_dns: 'Attacker sends one tiny message per hour to stay under the radar.',
            a_longexfil: 'Attacker steals research files little-by-little over many weeks, staying below alarm levels.'
          };

          // ── Story Mode coach tips (shown in-round when Story Mode is on) ──
          var stageCoachTips = {
            recon: 'COACH: The attacker is just scouting right now \u2014 collecting info from public sources. You won\'t see malware yet. Watch for unusual scan patterns or clusters of profile views. Try **Hunt for IOCs** or **User Awareness Blast**.',
            delivery: 'COACH: This is first contact. An email, text, or USB is arriving. Look at the sender carefully \u2014 real senders don\'t typo their own domain. **Block Sender/IP** is usually your best tool here.',
            exploit: 'COACH: Code is running where it shouldn\'t. The attacker has a foothold if you do nothing. **Deploy EDR Rule** or **Isolate Endpoint** to catch or contain the execution. **Patch** works if the attack used a known CVE.',
            persist: 'COACH: The adversary is setting up camp \u2014 installing ways to survive a reboot. **Deploy EDR Rule** excels here: it watches for the telltale patterns of persistence (scheduled tasks, registry keys, services).',
            c2: 'COACH: The compromised host is phoning home. Cut the beacon! **Block Sender/IP** stops the traffic at the perimeter. **Isolate Endpoint** severs everything. **Hunt for IOCs** finds hidden C2 channels.',
            actions: 'COACH: This is it \u2014 the payoff stage. Data exfil, ransomware, or fraud. **Escalate to CISO** is powerful here (if you haven\'t used it). **Isolate Endpoint** contains the damage. Move fast.'
          };

          // ── Stage strategy tips (shown in Playbook; the "how" complement to the "why" lessons) ──
          var stageStrategyTips = {
            recon: 'You can\'t stop every lookup, but you CAN detect sweeps. Reserve budget for Hunt for IOCs, and use Awareness Blasts against social reconnaissance.',
            delivery: 'This is your best chokepoint. Block the sender or warn users \u2014 these often fully stop the attack before exploit.',
            exploit: 'Patching is strongest against known flaws. For zero-days, rely on EDR behavioral detection and fast Isolation.',
            persist: 'Persistence tricks (scheduled tasks, registry keys, rogue services) are exactly what EDR rules are built to catch.',
            c2: 'If exploit landed, cut the beacon: block the IP, isolate the host, or hunt for the hidden channel.',
            actions: 'Time matters most. Escalate early \u2014 the CISO plus containment is the strongest late-game play.'
          };

          // ── Compute the strongest defenses for a stage by scanning red-card mitigation matrices ──
          function playbookDefensesForStage(stageId) {
            var cardsInStage = redTeamCards.filter(function(c) { return c.stage === stageId; });
            var fullMitCount = {}; // blueId -> how many red cards it fully mitigates
            var partialMitCount = {};
            cardsInStage.forEach(function(rc) {
              Object.keys(rc.mitigations || {}).forEach(function(bid) {
                var eff = rc.mitigations[bid];
                if (eff >= 1.0) fullMitCount[bid] = (fullMitCount[bid] || 0) + 1;
                else if (eff >= 0.5) partialMitCount[bid] = (partialMitCount[bid] || 0) + 1;
              });
            });
            var combined = {};
            Object.keys(fullMitCount).forEach(function(bid) { combined[bid] = (combined[bid] || 0) + fullMitCount[bid] * 2; });
            Object.keys(partialMitCount).forEach(function(bid) { combined[bid] = (combined[bid] || 0) + partialMitCount[bid]; });
            var ranked = Object.keys(combined).sort(function(a, b) { return combined[b] - combined[a]; });
            return ranked.slice(0, 3).map(function(bid) {
              var card = blueTeamCards.filter(function(b) { return b.id === bid; })[0];
              return { card: card, fullMit: fullMitCount[bid] || 0, partialMit: partialMitCount[bid] || 0, total: cardsInStage.length };
            }).filter(function(r) { return !!r.card; });
          }

          // ── Compute combos relevant to a stage ──
          function playbookCombosForStage(stageId) {
            var cardsInStage = redTeamCards.filter(function(c) { return c.stage === stageId; });
            return blueCombos.filter(function(combo) {
              return combo.ids.some(function(bid) {
                return cardsInStage.some(function(rc) { return (rc.mitigations && (rc.mitigations[bid] || 0) >= 0.5); });
              });
            });
          }

          // ── Stage-level lesson templates (the "why" of each stage) ──
          var stageLessons = {
            recon: 'Reconnaissance is silent but foundational — every piece of info the adversary collects makes later stages cheaper and more convincing. Early detection here (hunt, awareness) pays compounding dividends.',
            delivery: 'Delivery is the moment attack becomes contact: a phishing email, a malicious USB, a look-alike domain. Block the channel and the entire kill chain stalls before exploitation.',
            exploit: 'Exploitation converts access into code execution. Patching and EDR are the heavyweight defenses here — once code runs, the attacker gets a foothold.',
            persist: 'Persistence is how attackers survive reboots and IR cleanups. If you only remove the payload without finding the persistence, they come back — often within minutes.',
            c2: 'Command & Control is the attacker\'s lifeline. Cut the beacon (block the domain, isolate the host) and the implant goes dark even if it\'s still installed.',
            actions: 'Actions on Objectives is what they came for: data exfil, ransomware, fraud. By this stage escalation and containment matter more than detection — the attack is already happening.'
          };

          // ── Resolve the current round (does NOT advance — shows debrief screen) ──
          function resolveCurrentRound() {
            if (warLiveIsObserving) return;
            if (warRoomRoundResolved) return;
            var result = resolveRound(warRoomRedAction, warRoomBluePlays);
            var newAssets = {
              users: Math.max(0, warRoomAssets.users - result.assetsLost.users),
              servers: Math.max(0, warRoomAssets.servers - result.assetsLost.servers),
              data: Math.max(0, warRoomAssets.data - result.assetsLost.data)
            };
            var newLost = {
              users: warRoomAssetsLost.users + result.assetsLost.users,
              servers: warRoomAssetsLost.servers + result.assetsLost.servers,
              data: warRoomAssetsLost.data + result.assetsLost.data
            };
            var outcomeLabel = result.outcome === 'mitigated' ? 'MITIGATED' : (result.outcome === 'detected' ? 'DETECTED' : 'SUCCEEDED');
            var stageObj = warRoomCurrentStage || warStages[warRoomRound - 1];
            var logLine = 'Round ' + warRoomRound + ' (' + stageObj.name + '): ' + warRoomRedAction.title + ' — ' + outcomeLabel +
              (result.assetsLost.users || result.assetsLost.servers || result.assetsLost.data ?
                ' (lost: ' + result.assetsLost.users + 'u/' + result.assetsLost.servers + 's/' + result.assetsLost.data + 'd)' : '');
            var newChain = warRoomKillChain.concat([{
              stage: stageObj.id, round: warRoomRound, red: warRoomRedAction,
              outcome: result.outcome, assetsLost: result.assetsLost, bluePlays: warRoomBluePlays.slice()
            }]);
            var detections = warRoomDetections + (result.outcome !== 'succeeded' ? 1 : 0);
            var mitigations = warRoomMitigations + (result.outcome === 'mitigated' ? 1 : 0);
            var ideals = idealPlaysFor(warRoomRedAction);
            var lesson = stageLessons[stageObj.id] || '';

            ctx.awardXP('cyberDefense', result.xpDelta);
            var combosThisRound = (result.activeCombos || []).length;
            var timedOutThisRound = warRoomDifficulty === 'threatHunter' && warRoomTimeLeft <= 0;
            // Per-player stats (hot-seat mode)
            var newHotSeatStats = Object.assign({}, warRoomHotSeatStats);
            if (warRoomHotSeatEnabled) {
              var key = String(warRoomHotSeatCurrentIdx);
              var prev = newHotSeatStats[key] || { rounds: 0, detections: 0, mitigations: 0, combos: 0 };
              newHotSeatStats[key] = {
                rounds: prev.rounds + 1,
                detections: prev.detections + (result.outcome !== 'succeeded' ? 1 : 0),
                mitigations: prev.mitigations + (result.outcome === 'mitigated' ? 1 : 0),
                combos: prev.combos + combosThisRound
              };
            }
            upd({
              warRoomKillChain: newChain,
              warRoomAssets: newAssets,
              warRoomAssetsLost: newLost,
              warRoomLog: warRoomLog.concat([logLine]),
              warRoomDetections: detections,
              warRoomMitigations: mitigations,
              warRoomRoundResolved: true,
              warRoomTotalCombos: warRoomTotalCombos + combosThisRound,
              warRoomTimedOutAny: warRoomTimedOutAny || timedOutThisRound,
              warRoomHotSeatStats: newHotSeatStats,
              warRoomLastResolution: {
                outcome: result.outcome,
                outcomeLabel: outcomeLabel,
                assetsLost: result.assetsLost,
                xpDelta: result.xpDelta,
                matchedPlays: result.matchedPlays,
                idealPlayIds: ideals.map(function(c) { return c.id; }),
                stageLesson: lesson,
                redTitle: warRoomRedAction.title,
                redDescription: warRoomRedAction.description,
                activeCombos: result.activeCombos || []
              }
            });
            if (ctx.announceToSR) ctx.announceToSR('Round ' + warRoomRound + ' resolved: ' + outcomeLabel + '. Review the debrief and advance when ready.');
            // Outcome-specific audio feedback
            if (result.outcome === 'mitigated') sfxWarMitigated();
            else if (result.outcome === 'detected') sfxWarDetected();
            else sfxWarSucceeded();
            if (warLiveIsHosting) setTimeout(warLivePush, 100);
            // Kick off an AI coaching tip on failed rounds (best-effort; falls back to templated tip)
            if (result.outcome === 'succeeded') {
              setTimeout(function() { requestAICoachTip(warRoomRedAction, warRoomBluePlays, ideals, warRoomCurrentStage); }, 50);
            }
          }

          // ── Try Again: revert the current round's resolve and let the player retry ──
          function tryAgainRound() {
            if (warLiveIsObserving) return;
            if (!warRoomRoundResolved) return;
            if (warRoomRetryUsedThisRound) return;
            var snap = warRoomRoundStartSnapshot;
            if (!snap) { if (ctx.addToast) ctx.addToast('No snapshot available to retry', 'info'); return; }
            // Revert to round-start state; keep the red card + alerts + seed position so the scenario is identical
            upd({
              warRoomBudget: snap.budget,
              warRoomAssets: snap.assets,
              warRoomAssetsLost: snap.assetsLost,
              warRoomKillChain: warRoomKillChain.slice(0, snap.killChainLength),
              warRoomDetections: snap.detections,
              warRoomMitigations: snap.mitigations,
              warRoomTotalCombos: snap.totalCombos,
              warRoomEscalateUsed: snap.escalateUsed,
              warRoomFreeUsed: snap.freeUsed || [],
              warRoomBluePlays: [],
              warRoomAlertsSeen: [],
              warRoomHintRevealed: false,
              warRoomRoundResolved: false,
              warRoomLastResolution: null,
              warRoomAICoachTip: null,
              warRoomAICoachLoading: false,
              warRoomPlayLog: [],
              warRoomTimeLeft: 90,
              warRoomRetryUsedThisRound: true
            });
            sfxCyberdClick();
            if (ctx.announceToSR) ctx.announceToSR('Round reverted. Try again.');
            if (warLiveIsHosting) setTimeout(warLivePush, 100);
          }

          // ── Request a plain-English coaching tip for a lost round ──
          function requestAICoachTip(redCard, playsThisRound, idealCards, stageObj) {
            if (!redCard || !stageObj) return;
            // Sanitize: strip quote/newline characters that could break prompt formatting (AI cards are user-ish input)
            var clean = function(s) { return String(s == null ? '' : s).replace(/["`\r\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 240).trim(); };
            var idealList = (idealCards || []).map(function(c) { return clean(c.label); }).join(', ');
            var playedList = (playsThisRound || []).map(function(pid) { var c = blueTeamCards.filter(function(b) { return b.id === pid; })[0]; return clean(c ? c.label : pid); }).join(', ') || 'nothing';
            var safeTitle = clean(redCard.title);
            var safeDesc = clean(redCard.description);
            var safeStage = clean(stageObj.name);
            // Template fallback (used if aiChat missing or fails)
            var templated = 'Coaching: The ideal play for ' + safeStage + ' was ' + (idealList || 'a strong containment move') + '. You played ' + playedList + '. Try those defenses next time for a full mitigation.';
            if (!ctx.aiChat) { upd({ warRoomAICoachTip: templated, warRoomAICoachLoading: false }); return; }
            upd({ warRoomAICoachLoading: true, warRoomAICoachTip: null });
            var prompt = 'You are a supportive SOC instructor giving one short coaching tip to a student whose defense just failed. ' +
              'Tone: encouraging, specific, under 60 words. Use plain English (K-12 friendly).\n\n' +
              'STAGE: ' + safeStage + '\nRED TEAM MOVE: ' + safeTitle + ' \u2014 ' + safeDesc + '\n' +
              'STUDENT PLAYED: ' + playedList + '\nIDEAL PLAY: ' + (idealList || 'a strong containment move') + '\n\n' +
              'Write 2 short sentences: (1) name the key signal the student could have acted on, (2) say which defense would have stopped it and why.';
            try {
              ctx.aiChat(prompt, function(resp) {
                try {
                  upd({ warRoomAICoachTip: (resp && String(resp).trim()) || templated, warRoomAICoachLoading: false });
                } catch(e2) { /* tool may have unmounted; swallow */ }
              });
            } catch(e) {
              upd({ warRoomAICoachTip: templated, warRoomAICoachLoading: false });
            }
          }

          // ── Advance from debrief to next round or final verdict ──
          function advanceFromDebrief() {
            if (warLiveIsObserving) return;
            if (!warRoomRoundResolved) return;
            // End-of-campaign check
            if (warRoomRound >= warRoomRoundsTotal) {
              // Boss mode: 2/3 detections + 40+ data. Normal: 4/6 detections + 50+ data.
              var won = warRoomIsBossMode
                ? (warRoomDetections >= 2 && warRoomAssets.data >= 40)
                : (warRoomDetections >= 4 && warRoomAssets.data >= 50);
              var completed = warRoomCampaignsCompleted + 1;
              var perfectHard = warRoomDifficulty === 'threatHunter' && warRoomAssetsLost.users === 0 && warRoomAssetsLost.servers === 0 && warRoomAssetsLost.data === 0;
              var wonAnalyst = (won && warRoomDifficulty === 'analyst') || d.warRoomWonAnalyst;
              // Achievements
              var earnedIds = evaluateCampaignAchievements(warRoomKillChain, {
                verdict: won ? 'won' : 'lost',
                totalCombos: warRoomTotalCombos,
                remainingBudget: warRoomBudget,
                dataRemaining: warRoomAssets.data,
                difficulty: warRoomDifficulty,
                timedOut: warRoomTimedOutAny,
                isBossMode: warRoomIsBossMode
              });
              // Merge new achievements into persistent collection
              var mergedAchievements = Object.assign({}, warRoomAchievements);
              var newlyEarned = [];
              earnedIds.forEach(function(aid) {
                if (!mergedAchievements[aid]) {
                  mergedAchievements[aid] = { earnedAt: Date.now() };
                  newlyEarned.push(aid);
                }
              });
              // Append to campaign history (cap at 20 most recent)
              var priorHistory = d.warRoomCampaignHistory || [];
              var patchesPlayed = warRoomKillChain.filter(function(r) { return r.bluePlays.indexOf('patch') !== -1; }).length;
              var huntsPlayed = warRoomKillChain.filter(function(r) { return r.bluePlays.indexOf('hunt_iocs') !== -1; }).length;
              var bluePlaysCounts = {};
              warRoomKillChain.forEach(function(r) {
                (r.bluePlays || []).forEach(function(id) { bluePlaysCounts[id] = (bluePlaysCounts[id] || 0) + 1; });
              });
              // Infer campaign mode from context
              var campaignMode = 'normal';
              if (warRoomIsBossMode) campaignMode = 'boss';
              else if (todayInfo && warRoomCampaignId === todayInfo.id && warRoomCampaignTheme === todayInfo.theme && warRoomDifficulty === todayInfo.difficulty) campaignMode = 'daily';
              else if (weekInfo && warRoomCampaignId === weekInfo.id && warRoomCampaignTheme === weekInfo.theme && warRoomDifficulty === weekInfo.difficulty) campaignMode = 'weekly';
              // Condensed chain for Replay (drops noise fields; keeps just what playback needs)
              var condensedChain = warRoomKillChain.map(function(r) {
                return {
                  stage: r.stage,
                  round: r.round,
                  red: { id: r.red && r.red.id, title: r.red && r.red.title, description: r.red && r.red.description },
                  outcome: r.outcome,
                  assetsLost: r.assetsLost,
                  bluePlays: (r.bluePlays || []).slice()
                };
              });
              var historyEntry = {
                id: warRoomCampaignId,
                at: Date.now(),
                theme: warRoomCampaignTheme,
                difficulty: warRoomDifficulty,
                verdict: won ? 'won' : 'lost',
                detections: warRoomDetections,
                mitigations: warRoomMitigations,
                dataRemaining: warRoomAssets.data,
                combos: warRoomTotalCombos,
                patchesPlayed: patchesPlayed,
                huntsPlayed: huntsPlayed,
                bluePlaysCounts: bluePlaysCounts,
                budgetRemaining: warRoomBudget,
                achievementsEarned: earnedIds.length,
                rank: warRoomRank.label,
                hotSeat: warRoomHotSeatEnabled,
                players: warRoomHotSeatEnabled ? warRoomHotSeatPlayers.slice() : null,
                bossMode: warRoomIsBossMode,
                mode: campaignMode,
                chain: condensedChain
              };
              var newHistory = [historyEntry].concat(priorHistory).slice(0, 20);
              // Mark today's Daily Challenge as completed if this campaign's ID matches
              var todayInfo = dailyChallenge();
              var nextDailyCompletions = Object.assign({}, dailyCompletions);
              if (warRoomCampaignId === todayInfo.id &&
                  warRoomCampaignTheme === todayInfo.theme &&
                  warRoomDifficulty === todayInfo.difficulty) {
                var existing = nextDailyCompletions[todayInfo.dateStr];
                // Keep the best result if replayed (won > lost, higher detections break ties)
                var shouldReplace = !existing ||
                  (won && existing.verdict !== 'won') ||
                  (won === (existing.verdict === 'won') && warRoomDetections > (existing.detections || 0));
                if (shouldReplace) {
                  nextDailyCompletions[todayInfo.dateStr] = {
                    id: todayInfo.id,
                    verdict: won ? 'won' : 'lost',
                    detections: warRoomDetections,
                    mitigations: warRoomMitigations,
                    at: Date.now()
                  };
                }
              }
              // Mark this week's Weekly Challenge as completed if this campaign matches
              var weekInfo = weeklyChallenge();
              var nextWeeklyCompletions = Object.assign({}, weeklyCompletions);
              if (warRoomCampaignId === weekInfo.id &&
                  warRoomCampaignTheme === weekInfo.theme &&
                  warRoomDifficulty === weekInfo.difficulty) {
                var existingW = nextWeeklyCompletions[weekInfo.weekKey];
                var shouldReplaceW = !existingW ||
                  (won && existingW.verdict !== 'won') ||
                  (won === (existingW.verdict === 'won') && warRoomDetections > (existingW.detections || 0));
                if (shouldReplaceW) {
                  nextWeeklyCompletions[weekInfo.weekKey] = {
                    id: weekInfo.id,
                    verdict: won ? 'won' : 'lost',
                    detections: warRoomDetections,
                    mitigations: warRoomMitigations,
                    at: Date.now()
                  };
                }
              }
              upd({
                warRoomLog: warRoomLog.concat([won ? '\uD83C\uDFC6 Campaign won. Environment held.' : '\u26A0\uFE0F Campaign ended. Review the after-action report.']),
                warRoomVerdict: won ? 'won' : 'lost',
                warRoomCampaignsCompleted: completed,
                warRoomPerfectDefense: perfectHard || d.warRoomPerfectDefense,
                warRoomWonAnalyst: wonAnalyst,
                warRoomLastResolution: null,
                warRoomAchievements: mergedAchievements,
                warRoomCampaignAchievements: earnedIds,
                warRoomCampaignHistory: newHistory,
                warRoomDailyCompletions: nextDailyCompletions,
                warRoomWeeklyCompletions: nextWeeklyCompletions,
                // Pre-fill reflection from scratchpad if student took notes during play
                warRoomReflection: warRoomScratchpad ? ('Notes from play:\n' + warRoomScratchpad + '\n\nReflection:\n') : ''
              });
              if (newlyEarned.length > 0) {
                if (ctx.addToast) ctx.addToast('\uD83C\uDFC5 ' + newlyEarned.length + ' new achievement' + (newlyEarned.length > 1 ? 's' : '') + ' unlocked!', 'success');
                if (ctx.announceToSR) {
                  var names = newlyEarned.map(function(aid) {
                    var a = warAchievements.filter(function(x) { return x.id === aid; })[0];
                    return a ? a.label : aid;
                  }).join(', ');
                  ctx.announceToSR('New achievement' + (newlyEarned.length > 1 ? 's' : '') + ' unlocked: ' + names + '.');
                }
              }
              if (ctx.announceToSR) ctx.announceToSR('Campaign complete. Verdict: ' + (won ? 'victory' : 'defeat') + '. ' + warRoomDetections + ' of 6 attacks detected.');
              if (ctx.addToast) ctx.addToast(won ? 'Campaign won!' : 'Campaign lost \u2014 review the debrief', won ? 'success' : 'info');
            } else {
              var nextStageObj = warRoomActiveStages[warRoomRound] || warStages[warRoomRound];
              var nextStage = nextStageObj.id;
              var nextRed = rollRedAction(nextStage, warRoomDifficulty, warRoomKillChain, warRoomCampaignTheme);
              var nextAlerts = generateAlerts(nextRed, warRoomDifficulty);
              var nextPlayerIdx = warRoomHotSeatEnabled && warRoomHotSeatPlayers.length > 0
                ? (warRoomHotSeatCurrentIdx + 1) % warRoomHotSeatPlayers.length
                : warRoomHotSeatCurrentIdx;
              upd({
                warRoomRound: warRoomRound + 1,
                warRoomRedAction: nextRed,
                warRoomAlerts: nextAlerts,
                warRoomAlertsSeen: [],
                warRoomBluePlays: [],
                warRoomRoundResolved: false,
                warRoomLastResolution: null,
                warRoomHintRevealed: false,
                warRoomTimeLeft: 90,
                warRoomHotSeatCurrentIdx: nextPlayerIdx,
                warRoomHotSeatPassScreen: warRoomHotSeatEnabled && warRoomHotSeatPlayers.length > 1,
                warRoomRngStep: localRngStep,
                warRoomAICoachTip: null,
                warRoomAICoachLoading: false,
                warRoomPlayLog: [],
                warRoomRetryUsedThisRound: false,
                warRoomAlertFocusIdx: -1,
                // Snapshot CURRENT state (post-resolve of just-completed round) as the next round's start
                warRoomRoundStartSnapshot: {
                  budget: warRoomBudget,
                  assets: warRoomAssets,
                  assetsLost: warRoomAssetsLost,
                  killChainLength: warRoomKillChain.length,
                  detections: warRoomDetections,
                  mitigations: warRoomMitigations,
                  totalCombos: warRoomTotalCombos,
                  escalateUsed: warRoomEscalateUsed,
                  freeUsed: warRoomFreeUsed.slice()
                }
              });
              if (ctx.announceToSR) ctx.announceToSR('Advancing to round ' + (warRoomRound + 1) + ': ' + nextStageObj.name + '. Red team: ' + nextRed.title);
            }
            sfxCyberdClick();
            if (warLiveIsHosting) setTimeout(warLivePush, 100);
          }

          // ── Request AI after-action report (falls back to templated summary) ──
          function requestAAR() {
            if (warRoomAARLoading || warRoomAAR) return;
            var summary = warRoomKillChain.map(function(r, i) {
              return 'Round ' + (i + 1) + ' (' + r.stage + '): ' + r.red.title + ' — ' + r.outcome + '. Defenses: ' + (r.bluePlays.join(', ') || 'none');
            }).join('\n');
            var stats = 'Detections: ' + warRoomDetections + '/' + warRoomRoundsTotal + '. Mitigations: ' + warRoomMitigations + '/' + warRoomRoundsTotal + '. Assets lost: ' +
              warRoomAssetsLost.users + ' users, ' + warRoomAssetsLost.servers + ' servers, ' + warRoomAssetsLost.data + ' data units.';

            if (!ctx.aiChat) {
              var fallback = 'AFTER-ACTION REPORT\n\n' + stats + '\n\n' +
                (warRoomVerdict === 'won' ? 'The environment held. Detection coverage was strong across the kill chain.' :
                  'The adversary advanced. Focus next campaign on the stages where defenses missed.') +
                '\n\nTip: Early-stage detection (recon and delivery) compounds — stop the attack there and later stages cost less budget.';
              upd('warRoomAAR', fallback);
              if (ctx.addToast) ctx.addToast('AI unavailable \u2014 using debrief template', 'info');
              return;
            }
            upd('warRoomAARLoading', true);
            var prompt = 'You are a senior SOC instructor writing a concise after-action report for a student who just completed a cyber defense simulation. ' +
              'Tone: serious but encouraging, educational. Length: 120-180 words. Use short paragraphs.\n\n' +
              'CAMPAIGN DATA:\n' + summary + '\n\nSTATS:\n' + stats + '\n\nVERDICT: ' + (warRoomVerdict === 'won' ? 'Victory' : 'Defeat') + '.\n\n' +
              'STRUCTURE:\n1) One-sentence overall assessment.\n2) What worked well (1-2 specific decisions).\n3) Biggest miss or lesson (1-2 specific decisions).\n4) One actionable tip for the next campaign.\n\n' +
              'Avoid jargon the student would not know. Reference stages by name (Reconnaissance, Delivery, etc.).';
            ctx.aiChat(prompt, function(resp) {
              upd({ warRoomAAR: resp, warRoomAARLoading: false });
            });
          }

          // ── War Room derived values ──
          // Active stages: normal campaigns use all 6; Boss Mode uses only the 3 late stages.
          var warBossStageIds = ['exploit', 'c2', 'actions'];
          var warRoomActiveStages = warRoomIsBossMode
            ? warStages.filter(function(s) { return warBossStageIds.indexOf(s.id) !== -1; })
            : warStages;
          var warRoomRoundsTotal = warRoomActiveStages.length;
          var warRoomCurrentStage = warRoomActiveStages[Math.min(warRoomRound - 1, warRoomRoundsTotal - 1)];
          var warRoomPlayedCost = warRoomBluePlays.reduce(function(sum, id) {
            var c = blueTeamCards.filter(function(b) { return b.id === id; })[0];
            return sum + (c ? c.cost : 0);
          }, 0);
          var warRoomRank = (function() {
            var det = warRoomDetections;
            if (warRoomVerdict !== 'won') return { label: 'SOC Trainee', icon: '\uD83D\uDD30', color: '#64748b' };
            if (det >= 6) return { label: 'CISO', icon: '\uD83C\uDFC6', color: '#f59e0b' };
            if (det >= 5) return { label: 'Incident Commander', icon: '\u2B50', color: '#a855f7' };
            if (det >= 4) return { label: 'Incident Responder', icon: '\uD83D\uDEE1\uFE0F', color: '#3b82f6' };
            return { label: 'Junior Analyst', icon: '\uD83D\uDD0D', color: '#22c55e' };
          })();

          return el('div', { className: 'animate-in fade-in duration-300', style: { background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', borderRadius: 16, minHeight: '70vh', padding: 0, boxShadow: '0 0 40px rgba(99,102,241,0.15)' } },
            // Header
            el('div', { style: { padding: '20px 24px 16px', borderBottom: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 12 } },
              el('button', { onClick: function() { ctx.setStemLabTool(null); }, style: { background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 16 } }, '\u2190'),
              el('div', { style: { fontSize: 28, filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.6))' } }, '\uD83D\uDEE1\uFE0F'),
              el('div', null,
                el('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, background: 'linear-gradient(90deg, #f43f5e, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Cyber Defense Lab'),
                el('p', { style: { margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 } }, 'Digital Citizenship \u2022 Cybersecurity Fundamentals')
              ),
              el('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 } },
                el('span', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' } }, 'Level:'),
                ['easy', 'medium', 'hard'].map(function(dl) {
                  return el('button', { key: dl, onClick: function() { upd({ difficulty: dl, phishIdx: 0, phishAnswer: null }); },
                    style: { padding: '4px 10px', borderRadius: 6, border: difficulty === dl ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', background: difficulty === dl ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: difficulty === dl ? '#a5b4fc' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' } }, dl);
                }),
                el('div', { style: { marginLeft: 12, padding: '4px 12px', borderRadius: 20, background: 'linear-gradient(135deg, #f59e0b, #eab308)', fontSize: 11, fontWeight: 900, color: '#1e293b' } }, '\u2B50 ' + ctx.getXP('cyberDefense') + ' XP')
              )
            ),

            // Tab Bar
            el('div', { style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', padding: '0 24px' } },
              [{ id: 'phish', icon: '\uD83D\uDD75\uFE0F', label: 'Cyber Detective' }, { id: 'password', icon: '\uD83D\uDD10', label: 'Password Forge' }, { id: 'cipher', icon: '\uD83D\uDD11', label: 'Cipher Lab' }, { id: 'network', icon: '\uD83D\uDCE1', label: 'Traffic Analyzer' }, { id: 'social', icon: '\uD83C\uDFAD', label: 'Social Engineering' }, { id: 'warroom', icon: '\u2694\uFE0F', label: 'SOC War Room' }].map(function(tab) {
                var isActive = cyberTab === tab.id;
                return el('button', { key: tab.id, onClick: function() { upd('cyberTab', tab.id); },
                  style: { padding: '12px 20px', border: 'none', borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent', background: 'none', color: isActive ? '#a5b4fc' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' } },
                  el('span', null, tab.icon), tab.label);
              })
            ),

            // Content Area
            el('div', { style: { padding: 24 } },

              // â•â•â•â•â•â•â• CYBER DETECTIVE â•â•â•â•â•â•â•
              cyberTab === 'phish' && el('div', { style: { maxWidth: 680, margin: '0 auto' } },

                // Detective Header Bar
                el('div', { style: { marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  // Rank badge
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    el('span', { style: { fontSize: 22, filter: 'drop-shadow(0 0 6px ' + currentRank.color + ')' } }, currentRank.icon),
                    el('div', null,
                      el('div', { style: { color: currentRank.color, fontSize: 13, fontWeight: 900 } }, currentRank.rank),
                      el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 600 } }, casesClosed + ' case' + (casesClosed !== 1 ? 's' : '') + ' closed' + (nextRank ? ' \u2022 ' + (nextRank.min - casesClosed) + ' to ' + nextRank.rank : ' \u2022 MAX RANK!'))
                    )
                  ),
                  // Stats
                  el('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    el('span', { style: { padding: '3px 10px', borderRadius: 12, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: 11, fontWeight: 700 } }, '\u2714 ' + phishScore + ' correct'),
                    phishStreak >= 3 && el('span', { style: { padding: '3px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 11, fontWeight: 700, animation: 'pulse 1s ease-in-out infinite' } }, '\uD83D\uDD25 ' + phishStreak + ' streak!')
                  )
                ),

                // Mode Toggle
                el('div', { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' } },
                  el('button', { onClick: function() { upd({ phishMode: 'investigate', triageActive: false, cluesFound: [], phishAnswer: null }); upd('cluesFound', []); upd('phishAnswer', null); },
                    style: { flex: 1, minWidth: 130, padding: '10px 16px', borderRadius: 10, border: phishMode === 'investigate' ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)', background: phishMode === 'investigate' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: phishMode === 'investigate' ? '#a5b4fc' : '#64748b', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' } },
                    el('span', null, '\uD83D\uDD0D'), 'Investigation Mode'),
                  el('button', { onClick: function() { setPhishMode('triage'); upd('cluesFound', []); upd('phishAnswer', null); upd('triageTimeLeft', 15); setTriageActive(true); },
                    style: { flex: 1, minWidth: 130, padding: '10px 16px', borderRadius: 10, border: phishMode === 'triage' ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.1)', background: phishMode === 'triage' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: phishMode === 'triage' ? '#fbbf24' : '#64748b', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' } },
                    el('span', null, '\u23F1\uFE0F'), 'Inbox Triage'),
                  // AI Case Generator Button
                  el('button', { onClick: generateAIEmail, disabled: aiEmailLoading,
                    style: { flex: 1, minWidth: 130, padding: '10px 16px', borderRadius: 10, border: aiGeneratedEmail ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)', background: aiGeneratedEmail ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.08))', color: aiGeneratedEmail ? '#c084fc' : '#a78bfa', fontSize: 12, fontWeight: 800, cursor: aiEmailLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s', opacity: aiEmailLoading ? 0.6 : 1, animation: aiEmailLoading ? 'pulse 1.5s ease-in-out infinite' : 'none' } },
                    el('span', null, aiEmailLoading ? '\u23F3' : '\uD83E\uDD16'), aiEmailLoading ? 'Generating...' : (aiGeneratedEmail ? '\uD83E\uDD16 New AI Case' : '\uD83E\uDD16 AI Case'))
                ),

                // Case Counter
                el('div', { style: { marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  el('span', { style: { color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 } },
                    '\uD83D\uDCC1 Case #' + (casesClosed + 1) + (aiGeneratedEmail ? '' : ' \u2022 Email ' + ((phishIdx % filteredEmails.length) + 1) + '/' + filteredEmails.length),
                    aiGeneratedEmail && el('span', { style: { padding: '2px 6px', borderRadius: 6, background: 'rgba(168,85,247,0.2)', color: '#c084fc', fontSize: 11, fontWeight: 800, border: '1px solid rgba(168,85,247,0.3)' } }, '\uD83E\uDD16 AI')
                  ),
                  phishMode === 'triage' && !phishAnswer && triageActive && el('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    el('div', { style: { width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' } },
                      el('div', { style: { width: (triageTimeLeft / 15 * 100) + '%', height: '100%', borderRadius: 3, background: triageTimeLeft > 10 ? '#22c55e' : triageTimeLeft > 5 ? '#f59e0b' : '#ef4444', transition: 'width 1s linear, background 0.5s' } })
                    ),
                    el('span', { style: { color: triageTimeLeft > 5 ? '#94a3b8' : '#ef4444', fontSize: 12, fontWeight: 900, fontFamily: 'monospace', minWidth: 24, textAlign: 'right' } }, triageTimeLeft + 's')
                  )
                ),

                // Email Card (with investigation clue icons)
                el('div', { style: { background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', position: 'relative' } },
                  // Email header with clue buttons
                  el('div', { style: { padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 } },
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      el('div', { style: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #475569, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white' } }, activeEmail.fromDisplay[0]),
                      el('div', { style: { flex: 1 } },
                        el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 } },
                          activeEmail.fromDisplay,
                          // Sender clue button (investigation mode)
                          phishMode === 'investigate' && !phishAnswer && (activeEmail.clues || []).map(function(clue, ci) {
                            if (clue.zone !== 'sender') return null;
                            var found = cluesFound.indexOf(ci) !== -1;
                            return el('button', { key: 'clue-s-' + ci, onClick: function() { handleClueClick(ci); },
                              title: 'Investigate sender',
                              style: { background: found ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', border: found ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', fontSize: 10, color: found ? '#a5b4fc' : '#64748b', transition: 'all 0.3s', animation: found ? 'none' : 'pulse 2s ease-in-out infinite' } },
                              '\uD83D\uDD0D');
                          })
                        ),
                        el('div', { style: { color: '#64748b', fontSize: 11, fontFamily: 'monospace' } }, '<' + activeEmail.from + '>')
                      )
                    ),
                    el('div', { style: { color: '#cbd5e1', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 } },
                      activeEmail.subject,
                      // Subject clue button
                      phishMode === 'investigate' && !phishAnswer && (activeEmail.clues || []).map(function(clue, ci) {
                        if (clue.zone !== 'subject') return null;
                        var found = cluesFound.indexOf(ci) !== -1;
                        return el('button', { key: 'clue-sub-' + ci, onClick: function() { handleClueClick(ci); },
                          title: 'Investigate subject',
                          style: { background: found ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', border: found ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', fontSize: 10, color: found ? '#a5b4fc' : '#64748b', flexShrink: 0, transition: 'all 0.3s', animation: found ? 'none' : 'pulse 2s ease-in-out infinite' } },
                          '\uD83D\uDD0D');
                      })
                    )
                  ),
                  // Email body with clue buttons
                  el('div', { style: { padding: '16px 18px', color: '#94a3b8', fontSize: 13, lineHeight: 1.6, position: 'relative' } },
                    el('span', null, activeEmail.body),
                    // Body clue button
                    phishMode === 'investigate' && !phishAnswer && (activeEmail.clues || []).map(function(clue, ci) {
                      if (clue.zone !== 'body') return null;
                      var found = cluesFound.indexOf(ci) !== -1;
                      return el('button', { key: 'clue-b-' + ci, onClick: function() { handleClueClick(ci); },
                        title: 'Investigate this',
                        style: { marginLeft: 6, background: found ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', border: found ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', fontSize: 10, color: found ? '#a5b4fc' : '#64748b', transition: 'all 0.3s', animation: found ? 'none' : 'pulse 2s ease-in-out infinite', verticalAlign: 'middle' } },
                        '\uD83D\uDD0D');
                    }),
                    activeEmail.link && el('div', { style: { marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontFamily: 'monospace', fontSize: 11, color: '#818cf8', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 6 } },
                      '\uD83D\uDD17 ' + activeEmail.link,
                      // Link clue button
                      phishMode === 'investigate' && !phishAnswer && (activeEmail.clues || []).map(function(clue, ci) {
                        if (clue.zone !== 'link') return null;
                        var found = cluesFound.indexOf(ci) !== -1;
                        return el('button', { key: 'clue-l-' + ci, onClick: function() { handleClueClick(ci); },
                          title: 'Investigate link',
                          style: { marginLeft: 'auto', flexShrink: 0, background: found ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', border: found ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', fontSize: 10, color: found ? '#a5b4fc' : '#64748b', transition: 'all 0.3s', animation: found ? 'none' : 'pulse 2s ease-in-out infinite' } },
                          '\uD83D\uDD0D');
                      })
                    )
                  )
                ),

                // Evidence Board (investigation mode only, shows when clues found)
                phishMode === 'investigate' && cluesFound.length > 0 && !phishAnswer && el('div', { style: { margin: '12px 0', padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 } },
                      '\uD83D\uDCCB Evidence Board',
                      el('span', { style: { padding: '1px 6px', borderRadius: 8, background: 'rgba(99,102,241,0.3)', fontSize: 10, fontWeight: 700 } }, cluesFound.length + '/' + (activeEmail.clues || []).length)
                    ),
                    cluesFound.length >= (activeEmail.clues || []).length && el('span', { style: { padding: '2px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 10, fontWeight: 800, animation: 'pulse 1.5s ease-in-out infinite' } }, '\u2B50 Perfect Investigation!')
                  ),
                  // Clue cards
                  el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                    cluesFound.map(function(ci) {
                      var clue = (activeEmail.clues || [])[ci];
                      if (!clue) return null;
                      return el('div', { key: 'ev-' + ci, style: { padding: '6px 10px', borderRadius: 8, background: clue.suspicious ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', border: '1px solid ' + (clue.suspicious ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'), maxWidth: 220, animation: 'animate-in fade-in duration-200' } },
                        el('div', { style: { fontSize: 11, fontWeight: 800, color: clue.suspicious ? '#fb7185' : '#4ade80', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 } }, clue.icon + ' ' + clue.label),
                        el('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.4 } }, clue.desc)
                      );
                    })
                  )
                ),

                // Verdict Buttons
                !phishAnswer && (phishMode === 'triage' || cluesFound.length >= 2) && el('div', { style: { display: 'flex', gap: 12, marginTop: 12 } },
                  el('button', { onClick: function() { handleVerdict(true); },
                    style: { flex: 1, padding: '14px', borderRadius: 10, border: '2px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
                    '\u2705', ' Safe Email'),
                  el('button', { onClick: function() { handleVerdict(false); },
                    style: { flex: 1, padding: '14px', borderRadius: 10, border: '2px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)', color: '#fb7185', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
                    '\uD83D\uDEA8', ' Phishing!')
                ),

                // Investigation hint (need more clues)
                !phishAnswer && phishMode === 'investigate' && cluesFound.length < 2 && el('div', { style: { marginTop: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(99,102,241,0.3)', textAlign: 'center' } },
                  el('span', { style: { color: '#64748b', fontSize: 12, fontWeight: 600 } },
                    '\uD83D\uDD0D Click the magnifying glasses to investigate \u2022 Find at least 2 clues to unlock your verdict')
                ),

                // Case File Recap (replaces old result reveal)
                phishAnswer && el('div', { style: { marginTop: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid ' + (phishAnswer === 'correct' ? 'rgba(34,197,94,0.3)' : phishAnswer === 'timeout' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'), boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } },
                  // Case File Header
                  el('div', { style: { padding: '14px 18px', background: phishAnswer === 'correct' ? 'rgba(34,197,94,0.12)' : phishAnswer === 'timeout' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' } },
                    el('div', null,
                      el('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\uD83D\uDCC1 Case File #' + casesClosed),
                      el('div', { style: { fontSize: 16, fontWeight: 900, color: phishAnswer === 'correct' ? '#4ade80' : phishAnswer === 'timeout' ? '#fbbf24' : '#f87171' } },
                        phishAnswer === 'correct' ? '\u2705 Verdict: CORRECT' : phishAnswer === 'timeout' ? '\u23F0 Time Expired' : '\u274C Verdict: INCORRECT')
                    ),
                    el('div', { style: { padding: '6px 12px', borderRadius: 8, background: activeEmail.isPhish ? 'rgba(244,63,94,0.2)' : 'rgba(34,197,94,0.2)', color: activeEmail.isPhish ? '#fb7185' : '#4ade80', fontSize: 11, fontWeight: 800, border: '1px solid ' + (activeEmail.isPhish ? 'rgba(244,63,94,0.3)' : 'rgba(34,197,94,0.3)') } },
                      activeEmail.isPhish ? '\uD83D\uDEA8 PHISHING' : '\u2705 SAFE')
                  ),
                  // Agent Notes
                  el('div', { style: { padding: '14px 18px' } },
                    el('div', { style: { color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 } }, '\uD83D\uDD75\uFE0F Agent Notes:'),
                    activeEmail.flags.map(function(flag, fi) {
                      return el('div', { key: fi, style: { color: '#94a3b8', fontSize: 12, padding: '3px 0', display: 'flex', alignItems: 'flex-start', gap: 6 } },
                        el('span', { style: { color: activeEmail.isPhish ? '#f87171' : '#4ade80', fontSize: 10, marginTop: 2 } }, activeEmail.isPhish ? '\u26A0' : '\u2714'),
                        flag);
                    }),
                    // XP Breakdown
                    phishAnswer === 'correct' && el('div', { style: { marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' } },
                      el('div', { style: { color: '#fbbf24', fontSize: 11, fontWeight: 800, marginBottom: 4 } }, '\u2B50 XP Earned:'),
                      el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                        el('span', { style: { padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: 10, fontWeight: 700 } }, '+2 Base'),
                        cluesFound.length >= (activeEmail.clues || []).length && el('span', { style: { padding: '2px 8px', borderRadius: 6, background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontSize: 10, fontWeight: 700 } }, '+2 Perfect Investigation'),
                        cluesFound.length >= 2 && cluesFound.length < (activeEmail.clues || []).length && el('span', { style: { padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, fontWeight: 700 } }, '+1 Evidence Bonus'),
                        phishStreak >= 3 && el('span', { style: { padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, fontWeight: 700 } }, '+1 Streak Bonus'),
                        phishMode === 'triage' && triageTimeLeft >= 10 && el('span', { style: { padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: 10, fontWeight: 700 } }, '+2 Speed Bonus')
                      )
                    ),
                    // Evidence collected
                    phishMode === 'investigate' && el('div', { style: { marginTop: 8, color: '#64748b', fontSize: 11 } },
                      '\uD83D\uDCCB Evidence collected: ' + cluesFound.length + '/' + (activeEmail.clues || []).length + ' clues'),
                    // Next case button
                    el('button', { onClick: advanceCase,
                      style: { marginTop: 14, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                      '\uD83D\uDD75\uFE0F Next Case \u2192')
                  )
                )
              ),

              // ======= PASSWORD FORGE =======
              cyberTab === 'password' && el('div', { style: { maxWidth: 640, margin: '0 auto' } },
                  // Password input + controls
                  el('div', { style: { marginBottom: 16 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800, marginBottom: 8 } }, '\uD83D\uDD10 Enter a Password to Test'),
                    el('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                      el('div', { style: { flex: 1, position: 'relative' } },
                        el('input', { value: pwInput, type: pwShowPassword ? 'text' : 'password',
                          onChange: function(e) { upd({ pwInput: e.target.value, pwBruteAnim: null, pwBreachResult: null }); },
                          placeholder: 'Type a password to analyze...',
                          'aria-label': 'Password to analyze',
                          style: { width: '100%', padding: '12px 40px 12px 14px', borderRadius: 10, border: '2px solid ' + (pwInput ? pwStrength.color : 'rgba(255,255,255,0.1)'), background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 600, boxSizing: 'border-box', fontFamily: pwShowPassword ? 'monospace' : 'inherit' }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                        el('button', { onClick: function() { upd('pwShowPassword', !pwShowPassword); },
                          'aria-label': pwShowPassword ? 'Hide password' : 'Show password',
                          style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 4 } },
                          pwShowPassword ? '\uD83D\uDC41\uFE0F' : '\uD83D\uDEE1\uFE0F')
                      ),
                      el('button', { onClick: function() { var gp = generatePassword(pwGenLength, pwGenInclude); upd({ pwInput: gp, pwShowPassword: true, pwBruteAnim: null, pwBreachResult: null }); },
                        style: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' } },
                        '\uD83C\uDFB2 Generate')
                    ),
                    // Generator config
                    el('div', { style: { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' } },
                      el('span', { style: { color: '#64748b', fontSize: 10, fontWeight: 700 } }, 'LENGTH:'),
                      [8, 12, 16, 20, 24].map(function(len) {
                        return el('button', { key: len, onClick: function() { upd('pwGenLength', len); },
                          style: { padding: '3px 8px', borderRadius: 6, border: pwGenLength === len ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)', background: pwGenLength === len ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: pwGenLength === len ? '#a5b4fc' : '#64748b', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, String(len));
                      }),
                      el('span', { style: { color: '#475569', margin: '0 4px' } }, '|'),
                      ['upper', 'lower', 'digits', 'symbols'].map(function(cat) {
                        var labels = { upper: 'A-Z', lower: 'a-z', digits: '0-9', symbols: '!@#' };
                        var on = pwGenInclude[cat];
                        return el('button', { key: cat, onClick: function() { var ni = Object.assign({}, pwGenInclude); ni[cat] = !ni[cat]; upd('pwGenInclude', ni); },
                          style: { padding: '3px 8px', borderRadius: 6, border: on ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.08)', background: on ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', color: on ? '#4ade80' : '#64748b', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, labels[cat]);
                      })
                    )
                  ),
                  // Strength display
                  pwInput && el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    el('span', { style: { fontSize: 16, fontWeight: 900, color: pwStrength.color } }, pwStrength.label),
                    el('span', { style: { color: '#64748b', fontSize: 11, fontWeight: 600 } }, pwStrength.entropy + ' bits entropy'),
                    el('span', { style: { color: '#64748b', fontSize: 11 } }, '\u2022 Pool: ' + (pwStrength.checks.poolSize || 0) + ' chars')
                  ),
                  // Strength bar
                  el('div', { style: { width: '100%', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                    el('div', { style: { width: (pwStrength.score / 5 * 100) + '%', height: '100%', borderRadius: 5, background: pwStrength.color, transition: 'all 0.5s ease-out', boxShadow: '0 0 10px ' + pwStrength.color + '60' } })
                  ),
                  // Crack time
                  el('div', { style: { marginTop: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } },
                    el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, '\u231B Time to crack (10B guesses/sec):'),
                    el('div', { style: { color: pwStrength.color, fontSize: 18, fontWeight: 900 } }, pwStrength.crackTime)
                  ),
                  // Checklist
                  el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 } },
                    [
                      { label: '8+ characters', ok: pwStrength.checks.length >= 8 },
                      { label: '12+ characters', ok: pwStrength.checks.length >= 12 },
                      { label: 'Uppercase letters', ok: pwStrength.checks.hasUpper },
                      { label: 'Lowercase letters', ok: pwStrength.checks.hasLower },
                      { label: 'Numbers', ok: pwStrength.checks.hasDigit },
                      { label: 'Symbols (!@#$)', ok: pwStrength.checks.hasSymbol },
                      { label: 'Not a common password', ok: !pwStrength.checks.isCommon && pwInput.length > 0 }
                    ].map(function(check, ci) {
                      return el('div', { key: ci, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: check.ok ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (check.ok ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)') } },
                        el('span', { style: { fontSize: 12, color: check.ok ? '#4ade80' : '#475569' } }, check.ok ? '\u2714' : '\u25CB'),
                        el('span', { style: { fontSize: 11, fontWeight: 600, color: check.ok ? '#86efac' : '#64748b' } }, check.label));
                    })
                  ),
                  // Action buttons
                  pwInput && el('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
                    el('button', { onClick: startBruteForce,
                      style: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)', color: '#fb7185', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
                      '\u26A1 Brute Force Sim'),
                    el('button', { onClick: function() { upd('pwBreachResult', checkBreach(pwInput)); },
                      style: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: '#c084fc', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
                      '\uD83D\uDD0D Breach Check')
                  ),
                  // Brute Force Visualization
                  pwBruteAnim && el('div', { style: { marginTop: 14, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(239,68,68,0.05))', border: '1px solid rgba(244,63,94,0.2)' } },
                    el('div', { style: { color: '#fb7185', fontSize: 13, fontWeight: 900, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } }, '\u26A1 Brute Force Attack Simulation'),
                    el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 8 } },
                      pwBruteAnim.entropy + ' bits entropy \u2022 Character sets: ' + pwBruteAnim.charSets.join(', ')),
                    el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 } }, 'Attack Speed Comparison:'),
                    pwBruteAnim.speeds.map(function(spd, si) {
                      var secs = pwBruteAnim.totalGuesses / spd.rate;
                      var timeStr = formatSeconds(secs);
                      var barPct = Math.min(100, Math.max(2, (1 - Math.min(1, Math.log10(secs + 1) / 20)) * 100));
                      var barColor = secs < 60 ? '#ef4444' : secs < 3600 ? '#f97316' : secs < 86400 * 365 ? '#eab308' : '#22c55e';
                      return el('div', { key: si, style: { marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' } },
                        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                          el('span', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 700 } }, spd.icon + ' ' + spd.label),
                          el('span', { style: { color: '#64748b', fontSize: 11, fontWeight: 600 } }, spd.rate.toExponential(0) + ' guesses/sec')
                        ),
                        el('div', { style: { width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                          el('div', { style: { width: barPct + '%', height: '100%', borderRadius: 3, background: barColor, transition: 'width 0.8s ease-out' } })
                        ),
                        el('div', { style: { color: barColor, fontSize: 12, fontWeight: 900, marginTop: 3 } }, timeStr)
                      );
                    }),
                    el('div', { style: { marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: 11, fontWeight: 600 } },
                      '\uD83D\uDCA1 Every additional character multiplies crack time exponentially!')
                  ),
                  // Breach Check Results
                  pwBreachResult && el('div', { style: { marginTop: 14, padding: 16, borderRadius: 12, background: pwBreachResult.breached ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))' : 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(22,163,74,0.05))', border: '1px solid ' + (pwBreachResult.breached ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)') } },
                    el('div', { style: { fontSize: 28, textAlign: 'center', marginBottom: 6 } }, pwBreachResult.breached ? '\uD83D\uDEA8' : '\u2705'),
                    el('div', { style: { textAlign: 'center', color: pwBreachResult.breached ? '#fca5a5' : '#86efac', fontSize: 15, fontWeight: 900, marginBottom: 4 } },
                      pwBreachResult.breached ? 'PASSWORD FOUND IN BREACH DATABASE!' : 'Not Found in Known Breaches'),
                    pwBreachResult.breached && el('div', { style: { textAlign: 'center', color: '#f87171', fontSize: 12, marginBottom: 8 } },
                      'This password appeared in ' + pwBreachResult.count.toLocaleString() + ' breaches! Do NOT use it.'),
                    !pwBreachResult.breached && el('div', { style: { textAlign: 'center', color: '#6ee7b7', fontSize: 12, marginBottom: 8 } },
                      'Not found in our simulated breach database. Always use unique passwords per site.'),
                    el('div', { style: { padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: '#94a3b8', fontSize: 10, lineHeight: 1.6 } },
                      '\uD83D\uDD12 Real services like "Have I Been Pwned" use k-anonymity to check passwords against billions of breached credentials without seeing your full password.')
                  ),
                  // Challenge
                  !pwChallengeDone && pwStrength.entropy > 60 && el('div', { style: { marginTop: 16, padding: 14, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.1))', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' } },
                    el('div', { style: { fontSize: 14, fontWeight: 900, color: '#fbbf24', marginBottom: 4 } }, '\uD83C\uDFC6 Challenge Complete!'),
                    el('div', { style: { fontSize: 12, color: '#fcd34d' } }, 'Your password would take ' + pwStrength.crackTime + ' to crack!'),
                    el('button', { onClick: function() { ctx.awardXP('cyberDefense', 5); upd('pwChallengeDone', true); if (ctx.addToast) ctx.addToast('\uD83D\uDEE1\uFE0F +5 XP! Password Master!', 'success'); if (announceToSR) announceToSR('Password challenge complete! Plus 5 XP.'); },
                      style: { marginTop: 10, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#1e293b', fontSize: 12, fontWeight: 800, cursor: 'pointer' } }, 'Claim +5 XP \u2B50')
                  ),
                  // Tips
                  el('div', { style: { marginTop: 16, padding: 16, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' } },
                    el('div', { style: { color: '#818cf8', fontSize: 12, fontWeight: 800, marginBottom: 8 } }, '\uD83D\uDCA1 Password Tips'),
                    ['Use a passphrase: combine 4+ random words (e.g., "correct-horse-battery-staple")',
                     'Never reuse passwords across different sites',
                     'Add symbols and numbers between words, not just at the end',
                     'Longer is always stronger \u2014 aim for 16+ characters',
                     'Consider using a password manager to generate and store strong passwords'
                    ].map(function(tip, ti) {
                      return el('div', { key: ti, style: { color: '#94a3b8', fontSize: 11, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'flex-start' } },
                        el('span', { style: { color: '#6366f1', fontSize: 8, marginTop: 4 } }, '\u25C6'), tip);
                    })
                  )
              ),
              // â•â•â•â•â•â•â• CIPHER PLAYGROUND â•â•â•â•â•â•â•
              cyberTab === 'cipher' && el('div', { style: { maxWidth: 640, margin: '0 auto' } },
                // Cipher type selector
                el('div', { style: { display: 'flex', gap: 8, marginBottom: 20 } },
                  [{ id: 'caesar', label: 'Caesar Cipher', icon: '\uD83D\uDD04' }, { id: 'atbash', label: 'Atbash Cipher', icon: '\uD83D\uDD00' }, { id: 'xor', label: 'XOR Cipher', icon: '\u2295' }].map(function(c) {
                    return el('button', { key: c.id, onClick: function() { upd('cipherMode', c.id); },
                      style: { flex: 1, padding: '10px 14px', borderRadius: 10, border: cipherMode === c.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', background: cipherMode === c.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: cipherMode === c.id ? '#a5b4fc' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
                      el('span', null, c.icon), c.label);
                  })
                ),
                // Encode/Decode toggle
                el('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 16 } },
                  el('div', { style: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' } },
                    el('button', { onClick: function() { upd('cipherEncode', true); }, style: { padding: '6px 18px', border: 'none', background: cipherEncode ? '#6366f1' : 'rgba(255,255,255,0.04)', color: cipherEncode ? 'white' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDD12 Encode'),
                    el('button', { onClick: function() { upd('cipherEncode', false); }, style: { padding: '6px 18px', border: 'none', background: !cipherEncode ? '#6366f1' : 'rgba(255,255,255,0.04)', color: !cipherEncode ? 'white' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDD13 Decode')
                  )
                ),
                // Caesar shift control
                cipherMode === 'caesar' && el('div', { style: { marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 } },
                  el('span', { style: { color: '#94a3b8', fontSize: 12, fontWeight: 600 } }, 'Shift:'),
                  el('input', { type: 'range', 'aria-label': 'caesar shift', min: 1, max: 25, value: caesarShift, onChange: function(e) { upd('caesarShift', parseInt(e.target.value)); },
                    style: { width: 180, accentColor: '#6366f1' } }),
                  el('span', { style: { color: '#a5b4fc', fontSize: 16, fontWeight: 900, fontFamily: 'monospace', minWidth: 28, textAlign: 'center' } }, caesarShift)
                ),
                // Letter mapping visualization
                cipherMode !== 'xor' && el('div', { style: { marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' } },
                  el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 } }, 'Letter Mapping'),
                  el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' } },
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function(letter, li) {
                      var mapped;
                      if (cipherMode === 'caesar') mapped = String.fromCharCode(((li + caesarShift) % 26) + 65);
                      else mapped = String.fromCharCode(90 - li);
                      return el('div', { key: li, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22 } },
                        el('span', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' } }, letter),
                        el('span', { style: { fontSize: 8, color: '#475569' } }, '\u2193'),
                        el('span', { style: { fontSize: 10, fontWeight: 900, color: '#818cf8', fontFamily: 'monospace' } }, mapped)
                      );
                    })
                  )
                ),
                // Input/Output
                el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
                  el('div', null,
                    el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, cipherEncode ? 'Plain Text' : 'Encoded Text'),
                    el('textarea', { value: cipherInput, onChange: function(e) { upd('cipherInput', e.target.value.toUpperCase()); }, placeholder: cipherEncode ? 'Type your message...' : 'Paste encoded text...', 'aria-label': cipherEncode ? 'Plain text to encode' : 'Encoded text to decode',
                      style: { width: '100%', height: 100, padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, resize: 'none', boxSizing: 'border-box' }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' })
                  ),
                  el('div', null,
                    el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, cipherEncode ? 'Encoded Output' : 'Decoded Output'),
                    el('div', { style: { width: '100%', height: 100, padding: 12, borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, overflowY: 'auto', boxSizing: 'border-box', wordBreak: 'break-all' } },
                      cipherOutput || el('span', { style: { color: '#475569', fontStyle: 'italic', fontWeight: 400 } }, 'Output will appear here...'))
                  )
                ),
                // Explanation
                el('div', { style: { marginBottom: 20, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } },
                  el('div', { style: { color: '#818cf8', fontSize: 12, fontWeight: 800, marginBottom: 6 } },
                    cipherMode === 'caesar' ? '\uD83D\uDD04 How Caesar Cipher Works' : cipherMode === 'atbash' ? '\uD83D\uDD00 How Atbash Cipher Works' : '\u2295 How XOR Cipher Works'),
                  el('div', { style: { color: '#94a3b8', fontSize: 11, lineHeight: 1.6 } },
                    cipherMode === 'caesar' ? 'Each letter is shifted forward in the alphabet by the shift amount. Julius Caesar used a shift of 3 to encrypt military messages. With 26 possible shifts, this is one of the simplest ciphers to break \u2014 but a great introduction to cryptography!' :
                    cipherMode === 'atbash' ? 'The alphabet is simply reversed: A\u2192Z, B\u2192Y, C\u2192X, and so on. Originally used for Hebrew text, Atbash is a "mirror cipher." It\'s its own inverse \u2014 encoding and decoding use the same operation!' :
                    'XOR (exclusive or) compares the binary digits of each character with a key number. If the bits match, the result is 0; if they differ, the result is 1. XOR is used in real-world encryption because it\'s fast, reversible, and forms the basis of modern stream ciphers.')
                ),
                // Challenge Mode
                el('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.08))', border: '1px solid rgba(245,158,11,0.2)' } },
                  el('div', { style: { color: '#fbbf24', fontSize: 14, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 } }, '\uD83C\uDFC6 Decode Challenge'),
                  el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 6 } }, 'Cipher: ' + (activeChallengeData.type === 'caesar' ? 'Caesar (shift ' + activeChallengeData.shift + ')' : 'Atbash') + ' \u2022 Hint: ' + activeChallengeData.hint),
                  el('div', { style: { padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#fbbf24', letterSpacing: 2, marginBottom: 10 } }, activeChallengeData.encoded),
                  el('input', { value: cipherChallenge, onChange: function(e) {
                    var val = e.target.value.toUpperCase();
                    upd('cipherChallenge', val);
                    if (val.trim() === activeChallengeData.answer) { upd('challengeSolved', true); ctx.awardXP('cyberDefense', 5); if (ctx.addToast) ctx.addToast('\uD83D\uDD11 +5 XP! Cipher cracked!', 'success'); if (announceToSR) announceToSR('Cipher cracked! Plus 5 XP.'); }
                    else { upd('challengeSolved', false); }
                  }, placeholder: 'Type the decoded message...', 'aria-label': 'Cipher challenge answer', disabled: challengeSolved,
                    style: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid ' + (challengeSolved ? '#22c55e' : 'rgba(255,255,255,0.1)'), background: challengeSolved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)', color: challengeSolved ? '#4ade80' : '#e2e8f0', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, boxSizing: 'border-box' }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                  challengeSolved && el('div', { style: { marginTop: 8, color: '#4ade80', fontSize: 13, fontWeight: 800, textAlign: 'center' } }, '\u2705 Decoded! The message is: "' + activeChallengeData.answer + '"')
                )
              ),

              // ======= NETWORK TRAFFIC ANALYZER =======
              cyberTab === 'network' && el('div', { style: { maxWidth: 700, margin: '0 auto' } },
                el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
                  el('div', null,
                    el('div', { style: { color: '#a5b4fc', fontSize: 14, fontWeight: 900 } }, '\uD83D\uDCE1 Network Traffic Analyzer'),
                    el('div', { style: { color: '#64748b', fontSize: 11, marginTop: 2 } }, 'Inspect packets and flag suspicious traffic')
                  ),
                  el('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    el('div', { style: { padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', fontSize: 11, fontWeight: 700 } }, '\u2705 ' + netScore + ' correct'),
                    el('button', { onClick: function() { var pkts = generateNetRound(); upd({ netPackets: pkts, netFlagged: [], netShowAnswer: false, netRound: netRound + 1 }); },
                      style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                      netPackets.length === 0 ? '\uD83D\uDCE1 Start Capture' : '\uD83D\uDD04 New Capture')
                  )
                ),
                // Packet list
                netPackets.length > 0 && el('div', { style: { borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.15)' } },
                  // Header
                  el('div', { style: { display: 'grid', gridTemplateColumns: '70px 120px 120px 50px 1fr', gap: 0, background: 'rgba(99,102,241,0.1)', padding: '8px 12px' } },
                    el('span', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800 } }, 'PROTO'),
                    el('span', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800 } }, 'SOURCE'),
                    el('span', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800 } }, 'DESTINATION'),
                    el('span', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800 } }, 'PORT'),
                    el('span', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800 } }, 'PAYLOAD')
                  ),
                  // Packet rows
                  netPackets.map(function(pkt, pi) {
                    var isFlagged = netFlagged.indexOf(pkt.id) !== -1;
                    var protoColors = { HTTPS: '#22c55e', HTTP: '#f97316', DNS: '#60a5fa', TCP: '#a78bfa', SMTP: '#f472b6', FTP: '#fbbf24', ICMP: '#94a3b8', NTP: '#64748b' };
                    var pColor = protoColors[pkt.proto] || '#94a3b8';
                    return el('div', { key: pi, onClick: function() {
                        if (netShowAnswer) return;
                        var newFlagged = isFlagged ? netFlagged.filter(function(f) { return f !== pkt.id; }) : netFlagged.concat([pkt.id]);
                        upd('netFlagged', newFlagged);
                      },
                      style: { display: 'grid', gridTemplateColumns: '70px 120px 120px 50px 1fr', gap: 0, padding: '8px 12px', cursor: netShowAnswer ? 'default' : 'pointer', background: netShowAnswer ? (pkt.suspicious ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.03)') : isFlagged ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                        isFlagged && el('span', { style: { color: '#f43f5e', fontSize: 10 } }, '\u26A0\uFE0F'),
                        netShowAnswer && pkt.suspicious && el('span', { style: { color: '#ef4444', fontSize: 10 } }, '\uD83D\uDEA8'),
                        netShowAnswer && !pkt.suspicious && el('span', { style: { color: '#22c55e', fontSize: 10 } }, '\u2705'),
                        el('span', { style: { color: pColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' } }, pkt.proto)
                      ),
                      el('span', { style: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } }, pkt.src),
                      el('span', { style: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } }, pkt.dst),
                      el('span', { style: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' } }, String(pkt.port)),
                      el('div', null,
                        el('div', { style: { color: '#cbd5e1', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pkt.payload),
                        netShowAnswer && el('div', { style: { color: pkt.suspicious ? '#fca5a5' : '#6ee7b7', fontSize: 11, marginTop: 2, fontWeight: 600 } }, pkt.reason)
                      )
                    );
                  })
                ),
                // Submit / Results
                netPackets.length > 0 && !netShowAnswer && el('div', { style: { marginTop: 14, textAlign: 'center' } },
                  el('div', { style: { color: '#64748b', fontSize: 11, marginBottom: 8 } }, 'Click packets you think are suspicious, then submit your analysis'),
                  el('button', { onClick: function() {
                      var correct = 0;
                      netPackets.forEach(function(pkt) {
                        var flagged = netFlagged.indexOf(pkt.id) !== -1;
                        if (flagged === pkt.suspicious) correct++;
                      });
                      var xp = Math.round(correct / netPackets.length * 10);
                      ctx.awardXP('cyberDefense', xp);
                      if (ctx.addToast) ctx.addToast('\uD83D\uDCE1 +' + xp + ' XP! ' + correct + '/' + netPackets.length + ' correct', 'success');
                      upd({ netShowAnswer: true, netScore: netScore + correct });
                    },
                    style: { padding: '10px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
                    '\uD83D\uDD0D Submit Analysis (' + netFlagged.length + ' flagged)')
                ),
                netShowAnswer && el('div', { style: { marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' } },
                  el('div', { style: { color: '#818cf8', fontSize: 12, fontWeight: 800, marginBottom: 8 } }, '\uD83D\uDCA1 Network Security Tips'),
                  ['HTTPS (port 443) encrypts data in transit \u2014 HTTP (port 80) sends everything in plaintext',
                   'Unusual ports (4444, 6667) often indicate malware or botnet activity',
                   'DNS tunneling hides data inside DNS queries to bypass firewalls',
                   'Always verify email sender domains \u2014 spoofed emails enable BEC attacks',
                   'FTP sends files unencrypted \u2014 use SFTP or SCP for sensitive data'
                  ].map(function(tip, ti) {
                    return el('div', { key: ti, style: { color: '#94a3b8', fontSize: 11, padding: '3px 0', display: 'flex', gap: 6 } },
                      el('span', { style: { color: '#6366f1', fontSize: 8, marginTop: 4 } }, '\u25C6'), tip);
                  })
                ),
                // Empty state
                netPackets.length === 0 && el('div', { style: { textAlign: 'center', padding: '40px 20px' } },
                  el('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDCE1'),
                  el('div', { style: { color: '#64748b', fontSize: 13, fontWeight: 600 } }, 'Click "Start Capture" to intercept network packets'),
                  el('div', { style: { color: '#475569', fontSize: 11, marginTop: 4 } }, 'Analyze traffic and identify threats like a SOC analyst')
                )
              ),

              // ======= SOCIAL ENGINEERING QUIZ =======
              cyberTab === 'social' && el('div', { style: { maxWidth: 640, margin: '0 auto' } },
                el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
                  el('div', null,
                    el('div', { style: { color: '#a5b4fc', fontSize: 14, fontWeight: 900 } }, '\uD83C\uDFAD Social Engineering Defense'),
                    el('div', { style: { color: '#64748b', fontSize: 11, marginTop: 2 } }, 'Scenario ' + (seQuizIdx + 1) + ' of ' + seScenarios.length)
                  ),
                  el('div', { style: { display: 'flex', gap: 8 } },
                    el('div', { style: { padding: '4px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDD25 Streak: ' + seQuizStreak),
                    el('div', { style: { padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', fontSize: 11, fontWeight: 700 } }, '\u2705 ' + seQuizScore + '/' + seScenarios.length)
                  )
                ),
                // Attack type badge
                el('div', { style: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185', fontSize: 11, fontWeight: 700, marginBottom: 12 } },
                  '\uD83C\uDFAF Attack Type: ' + (seQuizAnswer ? activeSeScenario.type : '???')),
                // Scenario
                el('div', { style: { padding: 20, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 } },
                  el('div', { style: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, lineHeight: 1.7 } }, activeSeScenario.scenario)
                ),
                // Options
                activeSeScenario.options.map(function(opt, oi) {
                  var isSelected = seQuizAnswer === opt.id;
                  var isCorrect = opt.id === activeSeScenario.correct;
                  var showResult = seQuizAnswer !== null;
                  var borderColor = showResult ? (isCorrect ? 'rgba(34,197,94,0.5)' : isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)') : isSelected ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)';
                  var bgColor = showResult ? (isCorrect ? 'rgba(34,197,94,0.08)' : isSelected ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)') : 'rgba(255,255,255,0.04)';
                  return el('div', { key: oi, style: { marginBottom: 10 } },
                    el('button', { onClick: function() {
                        if (seQuizAnswer) return;
                        var correct = opt.id === activeSeScenario.correct;
                        var xp = correct ? 8 : 2;
                        var newStreak = correct ? seQuizStreak + 1 : 0;
                        if (newStreak >= 3) xp += 3;
                        ctx.awardXP('cyberDefense', xp);
                        if (ctx.addToast) ctx.addToast(correct ? '\u2705 +' + xp + ' XP! Correct!' : '\u274C +2 XP \u2014 Study the feedback', correct ? 'success' : 'error');
                        upd({ seQuizAnswer: opt.id, seQuizScore: seQuizScore + (correct ? 1 : 0), seQuizStreak: newStreak });
                      },
                      disabled: seQuizAnswer !== null,
                      style: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid ' + borderColor, background: bgColor, color: showResult && isCorrect ? '#4ade80' : showResult && isSelected ? '#fca5a5' : '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: seQuizAnswer ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 } },
                      showResult && isCorrect && el('span', null, '\u2705'),
                      showResult && isSelected && !isCorrect && el('span', null, '\u274C'),
                      opt.label
                    ),
                    showResult && (isSelected || isCorrect) && el('div', { style: { padding: '8px 14px', marginTop: 4, borderRadius: 8, background: isCorrect ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', color: isCorrect ? '#86efac' : '#fca5a5', fontSize: 11, fontWeight: 600, lineHeight: 1.5 } },
                      opt.feedback)
                  );
                }),
                // Lesson + Next
                seQuizAnswer && el('div', { style: { marginTop: 16 } },
                  el('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.2)' } },
                    el('div', { style: { color: '#fbbf24', fontSize: 12, fontWeight: 800, marginBottom: 4 } }, '\uD83D\uDCDA Did You Know?'),
                    el('div', { style: { color: '#fcd34d', fontSize: 12, lineHeight: 1.6 } }, activeSeScenario.lesson)
                  ),
                  el('button', { onClick: function() { upd({ seQuizAnswer: null, seQuizIdx: seQuizIdx + 1 }); },
                    style: { marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                    '\uD83C\uDFAD Next Scenario \u2192')
                ),
                // AI Threat Briefing
                el('div', { style: { marginTop: 20, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(99,102,241,0.15)' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800 } }, '\uD83E\uDD16 AI Threat Briefing'),
                    el('button', { onClick: function() {
                        if (threatLoading || !ctx.aiChat) return;
                        upd('threatLoading', true);
                        ctx.aiChat('You are a cybersecurity educator. Generate a brief, engaging "Daily Threat Briefing" for a student. Include: 1) A real-world attack type (name it), 2) How it works in 2-3 sentences, 3) One defense tip. Keep it under 120 words. Use a serious but approachable tone. Format with line breaks.', function(resp) {
                          upd({ threatBriefing: resp, threatLoading: false });
                          ctx.awardXP('cyberDefense', 3);
                          if (ctx.addToast) ctx.addToast('\uD83E\uDD16 +3 XP! Threat briefing received', 'info');
                        });
                      },
                      style: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: threatLoading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: threatLoading ? 'wait' : 'pointer' } },
                      threatLoading ? '\u23F3 Generating...' : '\uD83D\uDCE1 Get Briefing')
                  ),
                  threatBriefing ? el('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-line' } }, threatBriefing)
                    : el('div', { style: { color: '#475569', fontSize: 11, fontStyle: 'italic' } }, 'Click "Get Briefing" for an AI-generated cybersecurity threat report')
                )
              ),

              // ======= SOC WAR ROOM (red team / blue team simulation) =======
              cyberTab === 'warroom' && el('div', { className: 'allo-warroom-root', style: Object.assign({
                maxWidth: 960, margin: '0 auto', position: 'relative',
                fontFamily: warRoomA11y.dyslexiaFont ? '"OpenDyslexic","Comic Sans MS","Atkinson Hyperlegible",sans-serif' : undefined,
                fontSize: warRoomA11y.largeText ? '1.18em' : undefined,
                filter: warRoomA11y.highContrast ? 'contrast(1.2) saturate(1.15)' : undefined
              }, warRoomA11y.highContrast ? { background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 8 } : {}) },
                // Screen-reader-only section heading for proper document outline
                el('h2', { className: 'allo-sr-only' }, 'SOC War Room'),
                // Skip-to-main-action link for keyboard users (visible only on focus)
                warRoomActive && !warRoomVerdict && el('a', {
                  href: '#warroom-main-action', className: 'allo-warroom-skip-link',
                  onClick: function(ev) {
                    ev.preventDefault();
                    var target = document.getElementById('warroom-main-action');
                    if (target) { target.focus(); target.scrollIntoView({ block: 'center' }); }
                  }
                }, 'Skip to defensive actions'),

                // Replay overlay (step-by-step playback of a past campaign)
                warRoomReplay && (function() {
                  var hist = (warRoomCampaignHistory || [])[warRoomReplay.historyIdx];
                  if (!hist || !hist.chain || hist.chain.length === 0) return null;
                  var chain = hist.chain;
                  var idx = Math.max(0, Math.min(chain.length - 1, warRoomReplay.stepIdx || 0));
                  var step = chain[idx];
                  var stage = warStages.filter(function(s) { return s.id === step.stage; })[0] || { name: step.stage, icon: '\u2694\uFE0F', color: '#94a3b8' };
                  var mitre = step.red && mitreTechniques[step.red.id];
                  var oc = step.outcome === 'mitigated' ? { c: '#22c55e', label: 'MITIGATED' }
                         : step.outcome === 'detected' ? { c: '#3b82f6', label: 'DETECTED' }
                         : { c: '#ef4444', label: 'SUCCEEDED' };
                  var goStep = function(n) { upd('warRoomReplay', Object.assign({}, warRoomReplay, { stepIdx: n, playing: false })); };
                  return el('div', { role: 'dialog', 'aria-label': 'Campaign replay',
                    style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.06))', border: '2px solid rgba(236,72,153,0.4)', marginBottom: 14 } },
                    // Header row
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
                      el('span', { style: { fontSize: 18 } }, '\uD83D\uDCFD\uFE0F'),
                      el('div', { style: { flex: 1 } },
                        el('div', { style: { fontSize: 11, color: '#f9a8d4', fontWeight: 800, letterSpacing: 0.5 } }, 'REPLAY \u2022 Campaign #' + (hist.id || '????') + ' \u2022 ' + ((campaignThemes[hist.theme] && campaignThemes[hist.theme].label) || hist.theme) + ' \u2022 ' + hist.difficulty),
                        el('div', { style: { fontSize: 15, fontWeight: 900, color: stage.color } }, 'Round ' + (idx + 1) + ' / ' + chain.length + ' \u2014 ' + stage.icon + ' ' + stage.name)
                      ),
                      el('button', {
                        onClick: function() { upd('warRoomReplay', null); sfxCyberdClick(); },
                        'aria-label': 'Close replay',
                        style: { padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(30,41,59,0.6)', color: '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\u2715 Close')
                    ),
                    // Red card
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', marginBottom: 8 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                        el('span', { style: { fontSize: 10, fontWeight: 900, color: '#fca5a5', background: 'rgba(244,63,94,0.2)', padding: '2px 7px', borderRadius: 3 } }, 'RED TEAM'),
                        mitre && el('span', { title: mitre.name, style: { fontSize: 9, fontWeight: 800, color: '#fcd34d', background: 'rgba(234,179,8,0.12)', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' } }, mitre.id)
                      ),
                      el('div', { style: { fontSize: 13, fontWeight: 800, color: '#fecaca', marginBottom: 4 } }, (step.red && step.red.title) || ''),
                      el('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 } }, (step.red && step.red.description) || '')
                    ),
                    // Plays + outcome
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 8 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } },
                        el('span', { style: { fontSize: 10, fontWeight: 900, color: '#93c5fd', background: 'rgba(59,130,246,0.15)', padding: '2px 7px', borderRadius: 3 } }, 'BLUE TEAM'),
                        el('span', { style: { fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 3, background: oc.c + '22', color: oc.c } }, oc.label)
                      ),
                      el('div', { style: { fontSize: 11.5, color: '#e2e8f0', marginBottom: 3 } },
                        el('strong', { style: { color: '#86efac' } }, 'Plays: '),
                        (step.bluePlays && step.bluePlays.length > 0
                          ? step.bluePlays.map(function(pid) { var c = blueTeamCards.filter(function(b) { return b.id === pid; })[0]; return c ? (c.icon + ' ' + c.label) : pid; }).join(', ')
                          : 'none')),
                      (step.assetsLost && (step.assetsLost.users || step.assetsLost.servers || step.assetsLost.data)) &&
                        el('div', { style: { fontSize: 11, color: '#fca5a5' } }, 'Lost: ' + step.assetsLost.users + ' users, ' + step.assetsLost.servers + ' servers, ' + step.assetsLost.data + ' data')
                    ),
                    // Transport controls
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      el('button', { onClick: function() { if (idx > 0) goStep(idx - 1); }, disabled: idx === 0, 'aria-label': 'Previous round',
                        style: { padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(148,163,184,0.3)', background: idx === 0 ? 'rgba(30,41,59,0.3)' : 'rgba(30,41,59,0.6)', color: idx === 0 ? '#475569' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: idx === 0 ? 'not-allowed' : 'pointer' } }, '\u23EE Prev'),
                      el('button', {
                        onClick: function() { upd('warRoomReplay', Object.assign({}, warRoomReplay, { playing: !warRoomReplay.playing })); sfxCyberdClick(); },
                        'aria-label': warRoomReplay.playing ? 'Pause auto-advance' : 'Play auto-advance',
                        style: { padding: '6px 14px', borderRadius: 5, border: '1px solid rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.15)', color: '#f9a8d4', fontSize: 12, fontWeight: 800, cursor: 'pointer', minWidth: 80 } },
                        warRoomReplay.playing ? '\u23F8 Pause' : '\u25B6 Play'),
                      el('button', { onClick: function() { if (idx < chain.length - 1) goStep(idx + 1); }, disabled: idx >= chain.length - 1, 'aria-label': 'Next round',
                        style: { padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(148,163,184,0.3)', background: idx >= chain.length - 1 ? 'rgba(30,41,59,0.3)' : 'rgba(30,41,59,0.6)', color: idx >= chain.length - 1 ? '#475569' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: idx >= chain.length - 1 ? 'not-allowed' : 'pointer' } }, 'Next \u23ED'),
                      el('div', { style: { flex: 1, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right', letterSpacing: 0.5 } }, warRoomReplay.playing ? 'Auto-playing \u2014 2.6s per round' : 'Paused')
                    )
                  );
                })(),

                // First-run welcome overlay (dismissible, shown once)
                !warRoomWelcomeSeen && !warRoomActive && el('div', { role: 'dialog', 'aria-labelledby': 'warroom-welcome-title',
                  style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(244,63,94,0.08))', border: '2px solid rgba(99,102,241,0.4)', marginBottom: 14 } },
                  el('div', { 'aria-hidden': 'true', style: { fontSize: 44, textAlign: 'center', marginBottom: 8 } }, '\u2694\uFE0F'),
                  el('h3', { id: 'warroom-welcome-title', style: { margin: 0, textAlign: 'center', color: '#c7d2fe', fontSize: 20, fontWeight: 900 } }, 'Welcome to the SOC War Room'),
                  el('p', { style: { margin: '10px auto 14px', textAlign: 'center', color: '#cbd5e1', fontSize: 13, lineHeight: 1.55, maxWidth: 580 } },
                    'You\'re the on-call ',
                    el('strong', { style: { color: '#93c5fd' } }, 'Security Operations Center (SOC) analyst'),
                    '. A cyber adversary is running a six-stage attack campaign against your network. Each round, they make a move. You read the alerts, spend your defensive budget wisely, and try to detect or stop the attack before assets are lost.'
                  ),
                  el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14, fontSize: 12, color: '#cbd5e1' } },
                    [
                      { icon: '\uD83C\uDFAC', title: 'New here?', body: 'Turn on Story Mode below for per-round coaching tips.' },
                      { icon: '\u267F', title: 'Need support?', body: 'Use the UDL options for plain language, larger text, or a dyslexia-friendly font.' },
                      { icon: '\uD83E\uDD1D', title: 'With classmates?', body: 'Hot Seat rotates 2\u20136 players on one device each round.' },
                      { icon: '\uD83C\uDFAF', title: 'Daily Challenge', body: 'Play the same scenario as every other student today and compare scores.' }
                    ].map(function(tip, i) {
                      return el('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.2)' } },
                        el('div', { style: { fontSize: 18, marginBottom: 3 } }, tip.icon),
                        el('div', { style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 2 } }, tip.title),
                        el('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } }, tip.body)
                      );
                    })
                  ),
                  el('div', { style: { textAlign: 'center' } },
                    el('button', { onClick: function() { upd('warRoomWelcomeSeen', true); sfxCyberdClick(); },
                      'aria-label': 'Dismiss welcome and continue',
                      style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                      'Let\'s Begin \u2192')
                  )
                ),
                // Floating toolbar (glossary + teacher dashboard + help) — hidden during active Focus Mode
                !(warRoomFocusMode && warRoomActive && !warRoomVerdict) && el('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 } },
                  warRoomCampaignHistory.length > 0 && el('button', { onClick: function() { upd({ warRoomTeacherDashOpen: !warRoomTeacherDashOpen, warRoomGlossaryOpen: false, warRoomHelpOpen: false, warRoomPlaybookOpen: false, warRoomStatsOpen: false }); sfxCyberdClick(); },
                    'aria-expanded': warRoomTeacherDashOpen, 'aria-controls': 'warroom-teacher-dash',
                    style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: warRoomTeacherDashOpen ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.12)', color: '#86efac', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    (warRoomTeacherDashOpen ? '\u2715 Close' : '\uD83D\uDCCA Open') + ' Teacher Dashboard'),
                  warRoomCampaignHistory.length > 0 && el('button', { onClick: function() { upd({ warRoomStatsOpen: !warRoomStatsOpen, warRoomGlossaryOpen: false, warRoomHelpOpen: false, warRoomPlaybookOpen: false, warRoomTeacherDashOpen: false }); sfxCyberdClick(); },
                    'aria-expanded': warRoomStatsOpen, 'aria-controls': 'warroom-stats-panel',
                    title: 'Your personal performance stats',
                    style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: warRoomStatsOpen ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    (warRoomStatsOpen ? '\u2715 Close' : '\uD83D\uDCC8 My') + ' Stats'),
                  el('button', { onClick: function() { upd({ warRoomGlossaryOpen: !warRoomGlossaryOpen, warRoomTeacherDashOpen: false, warRoomHelpOpen: false, warRoomPlaybookOpen: false, warRoomStatsOpen: false }); sfxCyberdClick(); },
                    'aria-expanded': warRoomGlossaryOpen, 'aria-controls': 'warroom-glossary-panel',
                    style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: warRoomGlossaryOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    (warRoomGlossaryOpen ? '\u2715 Close' : '\uD83D\uDCD6 Open') + ' Glossary'),
                  el('button', { onClick: function() { upd({ warRoomPlaybookOpen: !warRoomPlaybookOpen, warRoomGlossaryOpen: false, warRoomTeacherDashOpen: false, warRoomHelpOpen: false, warRoomStatsOpen: false }); sfxCyberdClick(); },
                    'aria-expanded': warRoomPlaybookOpen, 'aria-controls': 'warroom-playbook-panel',
                    title: 'Strategy guide — which defenses work against which stages',
                    style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(236,72,153,0.3)', background: warRoomPlaybookOpen ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.12)', color: '#f9a8d4', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    (warRoomPlaybookOpen ? '\u2715 Close' : '\uD83D\uDCD2 Open') + ' Playbook'),
                  el('button', { onClick: function() { upd({ warRoomHelpOpen: !warRoomHelpOpen, warRoomGlossaryOpen: false, warRoomTeacherDashOpen: false, warRoomPlaybookOpen: false, warRoomStatsOpen: false }); sfxCyberdClick(); },
                    'aria-expanded': warRoomHelpOpen, 'aria-controls': 'warroom-help-panel',
                    title: 'Keyboard shortcuts (shortcut: ?)',
                    style: { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: warRoomHelpOpen ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)', color: '#fcd34d', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    warRoomHelpOpen ? '\u2715' : '? Help')
                ),
                // Playbook panel
                warRoomPlaybookOpen && el('div', { id: 'warroom-playbook-panel', role: 'region', 'aria-label': 'Strategy playbook',
                  style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(236,72,153,0.3)', marginBottom: 14, maxHeight: 520, overflowY: 'auto' } },
                  el('div', { style: { color: '#f9a8d4', fontSize: 12, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, '\uD83D\uDCD2 STRATEGY PLAYBOOK'),
                  el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 } }, 'Which defenses work best at each kill-chain stage. These rankings are computed from every red team card in the catalog \u2014 the more cards a defense fully mitigates, the higher it ranks.'),
                  warStages.map(function(stage) {
                    var defenses = playbookDefensesForStage(stage.id);
                    var combos = playbookCombosForStage(stage.id);
                    var tip = (warRoomPlainLanguage && plainStageLessons[stage.id]) ? null : stageStrategyTips[stage.id];
                    var plainTip = warRoomPlainLanguage ? 'Tip: Use the top defenses listed first. Combos multiply effectiveness when timing is right.' : null;
                    return el('div', { key: stage.id, style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid ' + stage.color + '35', marginBottom: 8 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                        el('span', { style: { fontSize: 18 } }, stage.icon),
                        el('span', { style: { fontSize: 13, fontWeight: 900, color: stage.color } }, stage.num + '. ' + stage.name)
                      ),
                      el('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6, fontStyle: 'italic' } }, plainTip || tip),
                      defenses.length > 0 && el('div', { style: { marginBottom: 6 } },
                        el('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Strongest defenses here'),
                        defenses.map(function(d2, i) {
                          return el('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 11.5, color: '#e2e8f0' } },
                            el('span', { style: { fontSize: 14 } }, d2.card.icon),
                            el('span', { style: { fontWeight: 700, flex: 1 } }, d2.card.label),
                            el('span', { style: { fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.15)', color: '#86efac' } }, d2.fullMit + ' full'),
                            d2.partialMit > 0 && el('span', { style: { fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', color: '#93c5fd' } }, d2.partialMit + ' partial')
                          );
                        })
                      ),
                      combos.length > 0 && el('div', null,
                        el('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Combos worth setting up'),
                        combos.map(function(c, i) {
                          return el('div', { key: i, style: { padding: '3px 0', fontSize: 11, color: '#fde68a' } },
                            el('span', { style: { fontWeight: 800 } }, '\u2728 ' + c.label),
                            el('span', { style: { color: '#94a3b8', fontWeight: 600 } }, ' \u2014 ' + c.ids.map(function(bid) { var bc = blueTeamCards.filter(function(b) { return b.id === bid; })[0]; return bc ? bc.label : bid; }).join(' + '))
                          );
                        })
                      )
                    );
                  })
                ),
                // Help / shortcuts overlay
                warRoomHelpOpen && el('div', { id: 'warroom-help-panel', role: 'region', 'aria-label': 'Keyboard shortcuts and help',
                  style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 14 } },
                  el('div', { style: { color: '#fcd34d', fontSize: 12, fontWeight: 800, marginBottom: 10, letterSpacing: 0.5 } }, '\u2328\uFE0F KEYBOARD SHORTCUTS'),
                  el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12, color: '#cbd5e1' } },
                    [
                      { k: '1 \u2013 9',       t: 'Play the 1st through 9th blue card' },
                      { k: '\u2191 / \u2193', t: 'Navigate the alert list' },
                      { k: 'Enter',            t: 'Review focused alert (after Investigate)' },
                      { k: 'R',                t: 'Resolve round (once at least one card is played)' },
                      { k: 'U',                t: 'Undo your last play' },
                      { k: 'H',                t: 'Request a hint (costs 1 budget)' },
                      { k: 'Enter',            t: 'Resolve round \u2022 Advance from debrief' },
                      { k: 'A',                t: 'Advance from debrief to next round' },
                      { k: 'Esc',              t: 'Close glossary / dashboard / help overlay' },
                      { k: '?',                t: 'Toggle this help panel' }
                    ].map(function(row, i) {
                      return el('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8 } },
                        el('kbd', { style: { padding: '3px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fde68a', fontFamily: 'monospace', fontSize: 11, fontWeight: 800, minWidth: 48, textAlign: 'center' } }, row.k),
                        el('span', { style: { flex: 1 } }, row.t)
                      );
                    })
                  ),
                  el('div', { style: { marginTop: 10, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'Shortcuts are disabled while typing in text fields or in Observer mode.')
                ),
                // Personal Stats panel
                warRoomStatsOpen && el('div', { id: 'warroom-stats-panel', role: 'region', 'aria-label': 'Your personal stats',
                  style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.3)', marginBottom: 14 } },
                  el('div', { style: { color: '#93c5fd', fontSize: 12, fontWeight: 800, marginBottom: 10, letterSpacing: 0.5 } }, '\uD83D\uDCC8 YOUR STATS'),
                  (function() {
                    var h = warRoomCampaignHistory;
                    if (h.length === 0) return el('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'Play a campaign to start tracking stats.');
                    var wins = h.filter(function(r) { return r.verdict === 'won'; }).length;
                    var winPct = Math.round(wins / h.length * 100);
                    var avgDet = (h.reduce(function(a, r){return a + (r.detections||0);}, 0) / h.length).toFixed(1);
                    var avgMit = (h.reduce(function(a, r){return a + (r.mitigations||0);}, 0) / h.length).toFixed(1);
                    var avgData = Math.round(h.reduce(function(a, r){return a + (r.dataRemaining||0);}, 0) / h.length);
                    // Longest win streak (from newest history, which is h.slice().reverse())
                    var chron = h.slice().reverse();
                    var longestStreak = 0, curStreak = 0;
                    chron.forEach(function(r) {
                      if (r.verdict === 'won') { curStreak += 1; if (curStreak > longestStreak) longestStreak = curStreak; }
                      else curStreak = 0;
                    });
                    var currentStreak = 0;
                    for (var si = chron.length - 1; si >= 0; si--) {
                      if (chron[si].verdict === 'won') currentStreak += 1; else break;
                    }
                    // Per-difficulty breakdown
                    var byDiff = { rookie: { c: 0, w: 0 }, analyst: { c: 0, w: 0 }, threatHunter: { c: 0, w: 0 } };
                    h.forEach(function(r) { if (byDiff[r.difficulty]) { byDiff[r.difficulty].c++; if (r.verdict === 'won') byDiff[r.difficulty].w++; } });
                    // Per-theme breakdown
                    var byTheme = {};
                    h.forEach(function(r) {
                      var tid = r.theme || 'mixed';
                      if (!byTheme[tid]) byTheme[tid] = { c: 0, w: 0 };
                      byTheme[tid].c++;
                      if (r.verdict === 'won') byTheme[tid].w++;
                    });
                    // Data-preserved sparkline (last 10 campaigns, newest first in history, reversed for chronological)
                    var sparkData = h.slice(0, 10).reverse().map(function(r) { return r.dataRemaining != null ? r.dataRemaining : 0; });
                    var maxBar = 100;
                    return el('div', null,
                      // Top stats row
                      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 14 } },
                        [
                          { label: 'Campaigns', val: String(h.length), color: '#cbd5e1' },
                          { label: 'Wins', val: wins + ' (' + winPct + '%)', color: '#86efac' },
                          { label: 'Avg Detections', val: avgDet + '/6', color: '#93c5fd' },
                          { label: 'Avg Data Saved', val: avgData + '/100', color: '#fcd34d' },
                          { label: 'Longest Streak', val: longestStreak + ' win' + (longestStreak === 1 ? '' : 's'), color: '#a855f7' },
                          { label: 'Current Streak', val: currentStreak + ' win' + (currentStreak === 1 ? '' : 's'), color: '#f472b6' }
                        ].map(function(s, i) {
                          return el('div', { key: i, style: { padding: 8, borderRadius: 6, background: 'rgba(30,41,59,0.6)' } },
                            el('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                            el('div', { style: { fontSize: 15, color: s.color, fontWeight: 900, marginTop: 2 } }, s.val)
                          );
                        })
                      ),
                      // Data-preserved bar chart (last 10 campaigns)
                      sparkData.length > 0 && el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 12 } },
                        el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Data Preserved \u2014 last ' + sparkData.length + ' campaign' + (sparkData.length === 1 ? '' : 's') + ' (newest \u2192)'),
                        el('div', { role: 'img', 'aria-label': 'Bar chart showing data preserved across recent campaigns',
                          style: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 70 } },
                          sparkData.map(function(v, i) {
                            var pct = Math.max(2, (v / maxBar) * 100);
                            var color = v >= 70 ? '#22c55e' : (v >= 40 ? '#f59e0b' : '#ef4444');
                            return el('div', { key: i, title: 'Campaign ' + (i + 1) + ': ' + v + '/100 data saved',
                              style: { flex: 1, height: pct + '%', background: color, borderRadius: '3px 3px 0 0', minHeight: 3, transition: 'height 0.3s' } });
                          })
                        )
                      ),
                      // By difficulty + by theme side by side
                      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                        el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)' } },
                          el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'By Difficulty'),
                          ['rookie','analyst','threatHunter'].map(function(did) {
                            var s = byDiff[did]; var pct = s.c > 0 ? Math.round(s.w / s.c * 100) : 0;
                            var labelMap = { rookie: 'Rookie', analyst: 'Analyst', threatHunter: 'Threat Hunter' };
                            return el('div', { key: did, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4, color: '#cbd5e1' } },
                              el('span', { style: { minWidth: 80, fontWeight: 700 } }, labelMap[did]),
                              el('span', { style: { flex: 1 } }, s.c + ' played'),
                              el('span', { style: { color: s.w > 0 ? '#86efac' : '#64748b', fontWeight: 800 } }, s.w + ' won (' + pct + '%)')
                            );
                          })
                        ),
                        el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)' } },
                          el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'By Adversary'),
                          Object.keys(byTheme).sort(function(a, b) { return byTheme[b].c - byTheme[a].c; }).map(function(tid) {
                            var s = byTheme[tid]; var label = (campaignThemes[tid] && campaignThemes[tid].label) || tid;
                            return el('div', { key: tid, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4, color: '#cbd5e1' } },
                              el('span', { style: { flex: 1, fontWeight: 700 } }, label),
                              el('span', { style: { color: '#94a3b8' } }, s.c + ' played'),
                              el('span', { style: { color: s.w > 0 ? '#86efac' : '#64748b', fontWeight: 800, minWidth: 50, textAlign: 'right' } }, s.w + ' won')
                            );
                          })
                        )
                      ),
                      // Defensive loadout analysis — aggregate across all campaigns
                      (function() {
                        var totals = {};
                        h.forEach(function(r) {
                          if (r.bluePlaysCounts) {
                            Object.keys(r.bluePlaysCounts).forEach(function(id) { totals[id] = (totals[id] || 0) + r.bluePlaysCounts[id]; });
                          }
                        });
                        var entries = Object.keys(totals).map(function(id) {
                          var card = blueTeamCards.filter(function(b) { return b.id === id; })[0];
                          return { id: id, card: card, count: totals[id] };
                        }).filter(function(e) { return !!e.card; }).sort(function(a, b) { return b.count - a.count; });
                        if (entries.length === 0) return null;
                        var maxCount = entries[0].count || 1;
                        return el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)' } },
                          el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Your Defensive Loadout \u2014 card usage across campaigns'),
                          entries.map(function(e, i) {
                            var pct = Math.round(e.count / maxCount * 100);
                            return el('div', { key: e.id, style: { marginBottom: 4 } },
                              el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1', marginBottom: 2 } },
                                el('span', { style: { fontSize: 13 } }, e.card.icon),
                                el('span', { style: { flex: 1, fontWeight: 700 } }, e.card.label),
                                el('span', { style: { color: '#94a3b8', fontWeight: 800 } }, e.count + ' play' + (e.count === 1 ? '' : 's'))
                              ),
                              el('div', { 'aria-hidden': 'true', style: { height: 3, borderRadius: 1.5, background: 'rgba(30,41,59,0.8)', overflow: 'hidden' } },
                                el('div', { style: { height: '100%', width: pct + '%', background: (i === 0 ? '#f59e0b' : '#6366f1'), transition: 'width 0.3s' } })
                              )
                            );
                          }),
                          entries.length > 0 && el('div', { style: { marginTop: 6, fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' } },
                            'Top card: ', el('strong', { style: { color: '#fde68a' } }, entries[0].card.label),
                            entries.length >= 2 ? ', then ' + entries[1].card.label : '',
                            '. Try varying your loadout to unlock underused cards.')
                        );
                      })(),
                      // Per-card effectiveness (only uses history entries with full chain data)
                      (function() {
                        var effective = {};
                        h.forEach(function(hist) {
                          (hist.chain || []).forEach(function(r) {
                            (r.bluePlays || []).forEach(function(cid) {
                              if (!effective[cid]) effective[cid] = { played: 0, mitigated: 0, detected: 0 };
                              effective[cid].played++;
                              if (r.outcome === 'mitigated') effective[cid].mitigated++;
                              else if (r.outcome === 'detected') effective[cid].detected++;
                            });
                          });
                        });
                        var keys = Object.keys(effective);
                        if (keys.length === 0) return null;
                        var rows = keys.map(function(cid) {
                          var card = blueTeamCards.filter(function(b) { return b.id === cid; })[0];
                          if (!card) return null;
                          var s = effective[cid];
                          var mitPct = s.played > 0 ? Math.round(s.mitigated / s.played * 100) : 0;
                          var anyPct = s.played > 0 ? Math.round((s.mitigated + s.detected) / s.played * 100) : 0;
                          return { card: card, stats: s, mitPct: mitPct, anyPct: anyPct };
                        }).filter(Boolean).sort(function(a, b) { return b.anyPct - a.anyPct; });
                        return el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)' } },
                          el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Card Effectiveness \u2014 how each card performs for you'),
                          rows.map(function(r) {
                            return el('div', { key: r.card.id, style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#cbd5e1', marginBottom: 4 } },
                              el('span', { style: { fontSize: 13 } }, r.card.icon),
                              el('span', { style: { fontWeight: 700, flex: 1 } }, r.card.label),
                              el('span', { style: { fontSize: 10, color: '#94a3b8' } }, r.stats.played + ' play' + (r.stats.played === 1 ? '' : 's')),
                              el('span', { style: { fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.15)', color: '#86efac', minWidth: 70, textAlign: 'center' } }, r.mitPct + '% fully'),
                              el('span', { style: { fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', minWidth: 70, textAlign: 'center' } }, r.anyPct + '% any')
                            );
                          }),
                          el('div', { style: { marginTop: 6, fontSize: 10, color: '#64748b', fontStyle: 'italic' } }, '"% fully" = rounds where this card led to a full mitigation. "% any" = detected or mitigated.')
                        );
                      })()
                    );
                  })()
                ),
                // Teacher Dashboard panel
                warRoomTeacherDashOpen && el('div', { id: 'warroom-teacher-dash', role: 'region', 'aria-label': 'Teacher dashboard',
                  style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 14 } },
                  el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
                    el('div', { style: { color: '#86efac', fontSize: 12, fontWeight: 800, letterSpacing: 0.5 } }, '\uD83D\uDCCA TEACHER DASHBOARD \u2014 CAMPAIGN HISTORY (' + warRoomCampaignHistory.length + ' of last 20)'),
                    el('div', { style: { display: 'flex', gap: 6 } },
                      el('button', {
                        onClick: function() {
                          var header = ['timestamp','campaign_id','mode','theme','difficulty','verdict','detections','mitigations','data_remaining','combos','achievements','rank','hot_seat','players','reflection'];
                          var rows = warRoomCampaignHistory.map(function(h) {
                            return [
                              new Date(h.at).toISOString(),
                              h.id || '',
                              h.mode || 'normal',
                              h.theme || '',
                              h.difficulty || '',
                              h.verdict || '',
                              h.detections != null ? h.detections : '',
                              h.mitigations != null ? h.mitigations : '',
                              h.dataRemaining != null ? h.dataRemaining : '',
                              h.combos != null ? h.combos : '',
                              h.achievementsEarned != null ? h.achievementsEarned : '',
                              h.rank || '',
                              h.hotSeat ? 'yes' : 'no',
                              (h.players || []).join('; '),
                              h.reflection || ''
                            ].map(function(v) { var s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
                          });
                          var csv = header.join(',') + '\n' + rows.join('\n');
                          try {
                            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = 'war-room-history-' + new Date().toISOString().slice(0,10) + '.csv';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
                            if (ctx.addToast) ctx.addToast('\uD83D\uDCC4 CSV downloaded', 'success');
                          } catch(e) { if (ctx.addToast) ctx.addToast('Download failed', 'info'); }
                        },
                        style: { padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.15)', color: '#86efac', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDCC4 Export CSV'),
                      // Export all War Room data as JSON backup
                      el('button', {
                        onClick: function() {
                          try {
                            var payload = {
                              _version: 1,
                              _exportedAt: new Date().toISOString(),
                              _tool: 'cyberDefense/warRoom',
                              campaignHistory: warRoomCampaignHistory || [],
                              achievements: d.warRoomAchievements || {},
                              dailyCompletions: d.warRoomDailyCompletions || {},
                              weeklyCompletions: d.warRoomWeeklyCompletions || {},
                              campaignsCompleted: d.warRoomCampaignsCompleted || 0,
                              perfectDefense: !!d.warRoomPerfectDefense,
                              wonAnalyst: !!d.warRoomWonAnalyst,
                              settings: { plainLanguage: !!d.warRoomPlainLanguage, a11y: d.warRoomA11y || null, soundMuted: !!d.warRoomSoundMuted, storyMode: !!d.warRoomStoryMode, focusMode: !!d.warRoomFocusMode }
                            };
                            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = 'war-room-data-' + new Date().toISOString().slice(0, 10) + '.json';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
                            if (ctx.addToast) ctx.addToast('\uD83D\uDCBE Full backup downloaded', 'success');
                          } catch(e) { if (ctx.addToast) ctx.addToast('Backup failed', 'info'); }
                        },
                        'aria-label': 'Export all War Room data as JSON',
                        title: 'Full backup of history, achievements, daily/weekly challenges, and settings.',
                        style: { padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDCBE Backup'),
                      // Import JSON backup — merges with current data
                      el('label', {
                        'aria-label': 'Import JSON backup',
                        title: 'Restore from a .json backup. Merges with existing data (duplicates kept by most-recent).',
                        style: { padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.15)', color: '#d8b4fe', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 } },
                        '\uD83D\uDCE5 Restore',
                        el('input', { type: 'file', accept: '.json,application/json',
                          style: { display: 'none' },
                          onChange: function(ev) {
                            var file = ev.target.files && ev.target.files[0];
                            if (!file) return;
                            var reader = new FileReader();
                            reader.onload = function(e2) {
                              try {
                                var parsed = JSON.parse(e2.target.result);
                                if (!parsed || parsed._tool !== 'cyberDefense/warRoom') {
                                  if (ctx.addToast) ctx.addToast('Not a War Room backup file', 'info'); return;
                                }
                                if (!confirm('Restore War Room data? This MERGES the backup into your current data (existing history entries with the same campaign id are kept).')) return;
                                // Merge history: dedupe by id + at timestamp, cap at 20
                                var existing = warRoomCampaignHistory || [];
                                var incoming = parsed.campaignHistory || [];
                                var seen = {}; existing.forEach(function(h) { seen[(h.id || '') + '|' + (h.at || 0)] = true; });
                                var merged = existing.slice();
                                incoming.forEach(function(h) { var k = (h.id || '') + '|' + (h.at || 0); if (!seen[k]) { merged.push(h); seen[k] = true; } });
                                merged.sort(function(a, b) { return (b.at || 0) - (a.at || 0); });
                                var mergedAch = Object.assign({}, d.warRoomAchievements || {}, parsed.achievements || {});
                                upd({
                                  warRoomCampaignHistory: merged.slice(0, 20),
                                  warRoomAchievements: mergedAch,
                                  warRoomDailyCompletions: Object.assign({}, d.warRoomDailyCompletions || {}, parsed.dailyCompletions || {}),
                                  warRoomWeeklyCompletions: Object.assign({}, d.warRoomWeeklyCompletions || {}, parsed.weeklyCompletions || {})
                                });
                                if (ctx.addToast) ctx.addToast('\uD83D\uDCE5 Backup restored \u2014 ' + incoming.length + ' campaign(s) merged', 'success');
                              } catch(err) {
                                if (ctx.addToast) ctx.addToast('Restore failed \u2014 file may be corrupt', 'info');
                              }
                              ev.target.value = ''; // allow re-selecting the same file
                            };
                            reader.readAsText(file);
                          }
                        })
                      ),
                      el('button', {
                        onClick: function() {
                          if (confirm('Clear campaign history? This cannot be undone. (Achievements are kept.)')) {
                            upd('warRoomCampaignHistory', []);
                            if (ctx.addToast) ctx.addToast('History cleared', 'info');
                          }
                        },
                        style: { padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDDD1\uFE0F Clear')
                    )
                  ),
                  // Summary stats
                  (function() {
                    var total = warRoomCampaignHistory.length;
                    var wins = warRoomCampaignHistory.filter(function(h) { return h.verdict === 'won'; }).length;
                    var byDiff = { rookie: 0, analyst: 0, threatHunter: 0 };
                    warRoomCampaignHistory.forEach(function(h) { if (byDiff[h.difficulty] != null) byDiff[h.difficulty]++; });
                    var avgDet = total > 0 ? (warRoomCampaignHistory.reduce(function(a,h){return a+(h.detections||0);},0) / total).toFixed(1) : '0';
                    return el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginBottom: 10, fontSize: 11 } },
                      el('div', { style: { padding: 6, background: 'rgba(30,41,59,0.6)', borderRadius: 4 } },
                        el('div', { style: { color: '#94a3b8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' } }, 'Win rate'),
                        el('div', { style: { color: '#86efac', fontSize: 15, fontWeight: 900 } }, total > 0 ? Math.round(wins / total * 100) + '%' : '\u2014'),
                        el('div', { style: { color: '#64748b', fontSize: 10 } }, wins + ' / ' + total)
                      ),
                      el('div', { style: { padding: 6, background: 'rgba(30,41,59,0.6)', borderRadius: 4 } },
                        el('div', { style: { color: '#94a3b8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' } }, 'Avg detections'),
                        el('div', { style: { color: '#93c5fd', fontSize: 15, fontWeight: 900 } }, avgDet),
                        el('div', { style: { color: '#64748b', fontSize: 10 } }, 'per campaign')
                      ),
                      el('div', { style: { padding: 6, background: 'rgba(30,41,59,0.6)', borderRadius: 4 } },
                        el('div', { style: { color: '#94a3b8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' } }, 'Rookie / Analyst / Hunter'),
                        el('div', { style: { color: '#fcd34d', fontSize: 14, fontWeight: 900 } }, byDiff.rookie + ' / ' + byDiff.analyst + ' / ' + byDiff.threatHunter)
                      )
                    );
                  })(),
                  // History table
                  el('div', { style: { maxHeight: 280, overflowY: 'auto' } },
                    el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#cbd5e1' } },
                      el('thead', null,
                        el('tr', { style: { borderBottom: '1px solid rgba(148,163,184,0.2)' } },
                          ['When','ID','Theme','Diff','Verdict','Det','Mit','Data','Players','Replay'].map(function(h, i) {
                            return el('th', { key: i, style: { padding: '4px 6px', textAlign: 'left', fontSize: 9, color: '#86efac', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, h);
                          })
                        )
                      ),
                      el('tbody', null,
                        warRoomCampaignHistory.map(function(h, i) {
                          var when = new Date(h.at);
                          var dateStr = (when.getMonth() + 1) + '/' + when.getDate() + ' ' + (when.getHours() < 10 ? '0' : '') + when.getHours() + ':' + (when.getMinutes() < 10 ? '0' : '') + when.getMinutes();
                          var canReplay = !!(h.id && h.theme && h.difficulty && campaignThemes[h.theme]);
                          return el('tr', { key: i, style: { borderBottom: '1px solid rgba(148,163,184,0.08)' } },
                            el('td', { style: { padding: '4px 6px' } }, dateStr),
                            el('td', { style: { padding: '4px 6px', fontFamily: 'monospace', color: '#fcd34d' } },
                              '#' + (h.id || '????'),
                              h.mode && h.mode !== 'normal' && el('span', { title: 'Mode: ' + h.mode,
                                style: { marginLeft: 4, padding: '1px 4px', borderRadius: 2, fontSize: 8, fontWeight: 800, fontFamily: 'sans-serif',
                                  background: h.mode === 'boss' ? 'rgba(244,63,94,0.2)' : (h.mode === 'weekly' ? 'rgba(168,85,247,0.2)' : 'rgba(245,158,11,0.2)'),
                                  color: h.mode === 'boss' ? '#fca5a5' : (h.mode === 'weekly' ? '#d8b4fe' : '#fcd34d') } },
                                h.mode === 'boss' ? '\uD83D\uDC79' : (h.mode === 'weekly' ? '\uD83D\uDDD3\uFE0F' : '\uD83C\uDFAF'))),
                            el('td', { style: { padding: '4px 6px' } }, (campaignThemes[h.theme] && campaignThemes[h.theme].label) || h.theme),
                            el('td', { style: { padding: '4px 6px' } }, h.difficulty),
                            el('td', { style: { padding: '4px 6px', color: h.verdict === 'won' ? '#86efac' : '#fca5a5', fontWeight: 700 } }, h.verdict === 'won' ? 'WON' : 'LOST'),
                            el('td', { style: { padding: '4px 6px', color: '#93c5fd' } }, (h.detections != null ? h.detections : '?') + '/6'),
                            el('td', { style: { padding: '4px 6px', color: '#86efac' } }, (h.mitigations != null ? h.mitigations : '?') + '/6'),
                            el('td', { style: { padding: '4px 6px' } }, (h.dataRemaining != null ? h.dataRemaining : '?') + '/100'),
                            el('td', { style: { padding: '4px 6px', color: '#d8b4fe' } }, h.hotSeat && h.players ? h.players.join(', ') : '\u2014'),
                            el('td', { style: { padding: '4px 6px' } },
                              el('div', { style: { display: 'flex', gap: 4 } },
                                h.chain && h.chain.length > 0 && el('button', {
                                  onClick: function() {
                                    upd({ warRoomTeacherDashOpen: false, warRoomReplay: { historyIdx: i, stepIdx: 0, playing: true } });
                                    sfxCyberdClick();
                                  },
                                  'aria-label': 'Watch replay of campaign #' + h.id,
                                  title: 'Watch a step-by-step playback of this campaign',
                                  style: { padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.15)', color: '#f9a8d4', fontSize: 10, fontWeight: 800, cursor: 'pointer' } }, '\uD83D\uDCFD\uFE0F'),
                                canReplay && el('button', {
                                  onClick: function() {
                                    if (warRoomActive && !warRoomVerdict && !confirm('Start this campaign? Your current in-progress campaign will be reset.')) return;
                                    upd({ warRoomTeacherDashOpen: false });
                                    startCampaign(h.difficulty, h.theme, h.id);
                                  },
                                  'aria-label': 'Replay campaign #' + h.id,
                                  title: 'Replay this exact campaign from scratch',
                                  style: { padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, fontWeight: 800, cursor: 'pointer' } }, '\u25B6')
                              )
                            )
                          );
                        })
                      )
                    )
                  )
                ),
                warRoomGlossaryOpen && el('div', { id: 'warroom-glossary-panel', role: 'region', 'aria-label': 'Cybersecurity glossary',
                  style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 14, maxHeight: 280, overflowY: 'auto' } },
                  el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83D\uDCD6 GLOSSARY'),
                  warGlossary.map(function(g) {
                    return el('div', { key: g.term, style: { padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' } },
                      el('span', { style: { color: '#fca5a5', fontSize: 12, fontWeight: 800, marginRight: 8 } }, g.term),
                      el('span', { style: { color: '#cbd5e1', fontSize: 11.5, lineHeight: 1.5 } }, g.defn)
                    );
                  })
                ),

                // Start screen — no active campaign
                !warRoomActive && el('div', { style: { padding: '20px 8px' } },
                  el('div', { style: { textAlign: 'center', marginBottom: 20 } },
                    el('div', { style: { fontSize: 44, marginBottom: 8 } }, '\u2694\uFE0F'),
                    el('h3', { style: { margin: 0, color: '#fca5a5', fontSize: 22, fontWeight: 900, letterSpacing: 0.3 } }, 'SOC War Room'),
                    el('p', { style: { margin: '6px 0 0', color: '#94a3b8', fontSize: 13 } }, 'Red team. Blue team. Six rounds. One network to defend.')
                  ),
                  el('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(244,63,94,0.2)', marginBottom: 16 } },
                    el('div', { style: { color: '#fda4af', fontSize: 12, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, 'MISSION BRIEFING'),
                    el('div', { style: { color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.6 } },
                      'You are the on-call SOC analyst. An adversary is running a multi-stage intrusion campaign through the ',
                      el('strong', null, 'Cyber Kill Chain'),
                      ': reconnaissance, delivery, exploitation, persistence, command-and-control, and actions on objectives. Each round, the Red Team plays a move; you read the alerts, spend defensive budget wisely, and try to detect or mitigate before assets are lost.'
                    )
                  ),
                  // Story Mode toggle
                  el('div', { style: { padding: 10, borderRadius: 8, background: warRoomStoryMode ? 'rgba(34,197,94,0.08)' : 'rgba(15,23,42,0.4)', border: '1px solid ' + (warRoomStoryMode ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.15)'), marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 } },
                    el('button', { onClick: function() { upd('warRoomStoryMode', !warRoomStoryMode); sfxCyberdClick(); },
                      role: 'switch', 'aria-checked': warRoomStoryMode, 'aria-label': 'Toggle Story Mode',
                      style: { padding: '4px 10px', borderRadius: 20, border: 'none', background: warRoomStoryMode ? '#22c55e' : '#475569', color: 'white', fontSize: 11, fontWeight: 800, cursor: 'pointer', minWidth: 50 } },
                      warRoomStoryMode ? 'ON' : 'OFF'),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { fontSize: 12, fontWeight: 800, color: warRoomStoryMode ? '#86efac' : '#cbd5e1' } }, '\uD83C\uDFAC Story Mode \u2014 Guided Coaching'),
                      el('div', { style: { fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 } }, 'Each round shows a "Coach" tip explaining what the attacker is doing and which defenses to consider. Recommended for your first few campaigns.')
                    )
                  ),
                  // Plain Language + Accessibility toggles (UDL options)
                  el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 10 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, '\u267F UDL \u2022 ACCESS OPTIONS'),
                    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 } },
                      [
                        { id: 'warRoomPlainLanguage', label: '\uD83D\uDCDD Plain Language', desc: 'Simpler words for attacks and defenses.', val: warRoomPlainLanguage },
                        { id: 'a_dyslexiaFont',       label: '\uD83D\uDD24 Dyslexia-friendly Font', desc: 'Switch to an easier-to-read font.', val: warRoomA11y.dyslexiaFont },
                        { id: 'a_largeText',          label: '\uD83D\uDD0D Larger Text', desc: 'Increase font size across the tool.', val: warRoomA11y.largeText },
                        { id: 'a_highContrast',       label: '\u25D1 High Contrast', desc: 'Stronger color contrast for clarity.', val: warRoomA11y.highContrast },
                        { id: 'a_colorBlind',         label: '\uD83C\uDFA8 Color-Blind Friendly', desc: 'Orange / yellow / blue outcomes (no red-green).', val: warRoomA11y.colorBlind },
                        { id: 'warRoomSoundMuted',    label: '\uD83D\uDD07 Mute War Room Sounds', desc: 'Silence the click / outcome tones.', val: warRoomSoundMuted }
                      ].map(function(opt) {
                        var isOn = !!opt.val;
                        return el('button', { key: opt.id, role: 'switch', 'aria-checked': isOn, 'aria-label': opt.label + (isOn ? ', on' : ', off'),
                          onClick: function() {
                            if (opt.id === 'warRoomPlainLanguage') { upd('warRoomPlainLanguage', !isOn); }
                            else if (opt.id === 'warRoomSoundMuted') { upd('warRoomSoundMuted', !isOn); }
                            else {
                              var k = opt.id.slice(2); // strip "a_"
                              var next = Object.assign({}, warRoomA11y); next[k] = !isOn;
                              upd('warRoomA11y', next);
                            }
                            sfxCyberdClick();
                          },
                          style: { display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6, border: '1px solid ' + (isOn ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.2)'), background: isOn ? 'rgba(34,197,94,0.08)' : 'rgba(30,41,59,0.6)', color: isOn ? '#86efac' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' } },
                          el('span', { style: { fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 3, background: isOn ? '#22c55e' : '#475569', color: 'white', minWidth: 28, textAlign: 'center' } }, isOn ? 'ON' : 'OFF'),
                          el('div', { style: { flex: 1 } },
                            el('div', { style: { fontSize: 11.5, fontWeight: 700 } }, opt.label),
                            el('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.3 } }, opt.desc)
                          )
                        );
                      })
                    )
                  ),
                  // Live Session broadcast (only shown when Firebase + session code available)
                  warLive.available && el('div', { style: { padding: 10, borderRadius: 8, background: warRoomLiveMode !== 'off' ? 'rgba(239,68,68,0.08)' : 'rgba(15,23,42,0.4)', border: '1px solid ' + (warRoomLiveMode !== 'off' ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.15)'), marginBottom: 10 } },
                    el('div', { style: { color: warRoomLiveMode !== 'off' ? '#fca5a5' : '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, '\uD83D\uDCE1 LIVE SESSION \u2014 session ' + warLive.sessionCode + (warRoomLiveMode === 'hosting' ? ' \u2022 YOU ARE BROADCASTING' : warRoomLiveMode === 'observing' ? ' \u2022 YOU ARE OBSERVING' : '')),
                    el('div', { style: { fontSize: 10.5, color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 } }, 'Broadcast your live campaign to every student in this session. Observers see the action in real time but can\'t play. Only one broadcaster per session.'),
                    el('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                      warRoomLiveMode === 'off' && el('button', { onClick: warLiveStartHosting,
                        style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                        '\uD83D\uDD34 Start Broadcasting'),
                      warRoomLiveMode === 'off' && el('button', { onClick: warLiveStartObserving,
                        style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                        '\uD83D\uDC41\uFE0F Observe This Session'),
                      warRoomLiveMode !== 'off' && el('button', { onClick: warLiveStop,
                        style: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                        '\u23F9\uFE0F End Live Session')
                    )
                  ),
                  // Hot Seat (classroom pass-and-play)
                  el('div', { style: { padding: 10, borderRadius: 8, background: warRoomHotSeatEnabled ? 'rgba(168,85,247,0.08)' : 'rgba(15,23,42,0.4)', border: '1px solid ' + (warRoomHotSeatEnabled ? 'rgba(168,85,247,0.3)' : 'rgba(148,163,184,0.15)'), marginBottom: 16 } },
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: warRoomHotSeatEnabled ? 10 : 0 } },
                      el('button', { onClick: function() { upd('warRoomHotSeatEnabled', !warRoomHotSeatEnabled); sfxCyberdClick(); },
                        role: 'switch', 'aria-checked': warRoomHotSeatEnabled, 'aria-label': 'Toggle Hot Seat classroom mode',
                        style: { padding: '4px 10px', borderRadius: 20, border: 'none', background: warRoomHotSeatEnabled ? '#a855f7' : '#475569', color: 'white', fontSize: 11, fontWeight: 800, cursor: 'pointer', minWidth: 50 } },
                        warRoomHotSeatEnabled ? 'ON' : 'OFF'),
                      el('div', { style: { flex: 1 } },
                        el('div', { style: { fontSize: 12, fontWeight: 800, color: warRoomHotSeatEnabled ? '#d8b4fe' : '#cbd5e1' } }, '\uD83E\uDD1D Hot Seat \u2014 Classroom Pass-and-Play'),
                        el('div', { style: { fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 } }, 'Rotate through 2\u20136 students on one device. Each player takes a round, pass screen hides intel until they\'re ready.')
                      )
                    ),
                    warRoomHotSeatEnabled && el('div', null,
                      el('div', { style: { color: '#d8b4fe', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 } }, 'PLAYERS (' + warRoomHotSeatPlayers.length + ')'),
                      el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                        warRoomHotSeatPlayers.map(function(name, idx) {
                          return el('div', { key: idx, style: { display: 'flex', alignItems: 'center', gap: 6 } },
                            el('span', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 800, minWidth: 20 } }, (idx + 1) + '.'),
                            el('input', { type: 'text', value: name, maxLength: 20,
                              'aria-label': 'Player ' + (idx + 1) + ' name',
                              onChange: function(ev) {
                                var newList = warRoomHotSeatPlayers.slice();
                                newList[idx] = ev.target.value.slice(0, 20) || ('Player ' + (idx + 1));
                                upd('warRoomHotSeatPlayers', newList);
                              },
                              style: { flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', fontSize: 12 } }),
                            warRoomHotSeatPlayers.length > 2 && el('button', {
                              onClick: function() {
                                if (warRoomHotSeatPlayers.length <= 2) return; // never drop below 2
                                var newList = warRoomHotSeatPlayers.slice();
                                newList.splice(idx, 1);
                                upd('warRoomHotSeatPlayers', newList);
                                sfxCyberdClick();
                              },
                              'aria-label': 'Remove ' + name,
                              title: 'Remove player (minimum 2 required)',
                              style: { padding: '2px 8px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\u2715')
                          );
                        })
                      ),
                      warRoomHotSeatPlayers.length < 6 && el('button', {
                        onClick: function() {
                          var newList = warRoomHotSeatPlayers.concat(['Player ' + (warRoomHotSeatPlayers.length + 1)]);
                          upd('warRoomHotSeatPlayers', newList);
                          sfxCyberdClick();
                        },
                        style: { marginTop: 6, padding: '4px 12px', borderRadius: 4, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.12)', color: '#d8b4fe', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '+ Add Player'),
                      el('div', { style: { marginTop: 8, fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.4 } }, 'Rounds assigned round-robin. With ' + warRoomHotSeatPlayers.length + ' players, each plays ' + (warRoomHotSeatPlayers.length === 6 ? '1 round' : (warRoomHotSeatPlayers.length === 3 ? '2 rounds' : (warRoomHotSeatPlayers.length === 2 ? '3 rounds' : '~' + Math.ceil(6 / warRoomHotSeatPlayers.length) + ' rounds'))) + '.')
                    )
                  ),
                  // Cross-mode bonuses earned from other Cyber Defense modes
                  warCrossBonuses.earned.length > 0 && el('div', { style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.04))', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 16 } },
                    el('div', { style: { color: '#86efac', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83C\uDF96\uFE0F EARNED PERKS (from other Cyber Defense modes)'),
                    warCrossBonuses.earned.map(function(perk) {
                      return el('div', { key: perk.id, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', fontSize: 11.5 } },
                        el('span', { style: { fontSize: 15 } }, perk.icon),
                        el('div', { style: { flex: 1 } },
                          el('div', { style: { color: '#d9f99d', fontWeight: 800 } }, perk.label, el('span', { style: { color: '#86efac', fontWeight: 600, marginLeft: 6 } }, perk.perk)),
                          el('div', { style: { color: '#64748b', fontSize: 10, fontStyle: 'italic' } }, perk.source)
                        )
                      );
                    })
                  ),
                  // Daily Challenge banner (one seeded campaign per day, shared globally)
                  el('div', { style: { padding: 12, borderRadius: 10, background: todayCompletion ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.05))' : 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(244,63,94,0.06))', border: '1px solid ' + (todayCompletion ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.4)'), marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                    el('div', { style: { fontSize: 28 } }, '\uD83C\uDFAF'),
                    el('div', { style: { flex: '1 1 200px' } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 } },
                        el('span', { style: { fontSize: 11, color: todayCompletion ? '#86efac' : '#fbbf24', fontWeight: 800, letterSpacing: 0.5 } }, todayCompletion ? 'TODAY\'S CHALLENGE \u2022 COMPLETED \u2713' : 'TODAY\'S CHALLENGE'),
                        dailyStreak >= 2 && el('span', { 'aria-label': dailyStreak + ' day streak', style: { padding: '1px 6px', borderRadius: 3, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.35)', color: '#fca5a5', fontSize: 10, fontWeight: 800 } }, '\uD83D\uDD25 ' + dailyStreak + '-day streak')
                      ),
                      el('div', { style: { fontSize: 13, color: '#e2e8f0', fontWeight: 700 } }, 'Campaign #' + todaysChallenge.id + ' \u2022 ' + (campaignThemes[todaysChallenge.theme] ? campaignThemes[todaysChallenge.theme].label : todaysChallenge.theme) + ' \u2022 ' + todaysChallenge.difficulty),
                      todayCompletion
                        ? el('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 3 } }, 'Result: ' + (todayCompletion.verdict === 'won' ? '\uD83C\uDFC6 WON' : '\u26A0\uFE0F LOST') + ' \u2022 ' + todayCompletion.detections + '/6 detections \u2022 Every student who plays today gets the SAME scenario. Play again to improve your score.')
                        : el('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 3 } }, 'A new challenge drops every day (UTC). Every student gets the exact same scenario \u2014 compare scores with classmates!')
                    ),
                    el('button', { onClick: function() { startCampaign(todaysChallenge.difficulty, todaysChallenge.theme, todaysChallenge.id); },
                      'aria-label': 'Start today\'s challenge',
                      style: { padding: '10px 18px', borderRadius: 8, border: 'none', background: todayCompletion ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #f59e0b, #f43f5e)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                      todayCompletion ? '\uD83D\uDD04 Replay' : '\u25B6 Play')
                  ),
                  // Weekly Challenge banner
                  el('div', { style: { padding: 12, borderRadius: 10, background: weekCompletion ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.04))' : 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.06))', border: '1px solid ' + (weekCompletion ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.35)'), marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                    el('div', { style: { fontSize: 28 } }, '\uD83D\uDDD3\uFE0F'),
                    el('div', { style: { flex: '1 1 200px' } },
                      el('div', { style: { fontSize: 11, color: weekCompletion ? '#86efac' : '#d8b4fe', fontWeight: 800, letterSpacing: 0.5, marginBottom: 2 } }, weekCompletion ? 'THIS WEEK\'S CHALLENGE \u2022 COMPLETED \u2713' : 'THIS WEEK\'S CHALLENGE'),
                      el('div', { style: { fontSize: 13, color: '#e2e8f0', fontWeight: 700 } }, 'Campaign #' + thisWeeksChallenge.id + ' \u2022 ' + (campaignThemes[thisWeeksChallenge.theme] ? campaignThemes[thisWeeksChallenge.theme].label : thisWeeksChallenge.theme) + ' \u2022 Threat Hunter'),
                      weekCompletion
                        ? el('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 3 } }, 'Result: ' + (weekCompletion.verdict === 'won' ? '\uD83C\uDFC6 WON' : '\u26A0\uFE0F LOST') + ' \u2022 ' + weekCompletion.detections + ' detections \u2022 Runs all week \u2014 replay for a better score.')
                        : el('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 3 } }, 'Toughest challenge of the week (Threat Hunter). Same seed every day until Sunday.')
                    ),
                    el('button', { onClick: function() { startCampaign(thisWeeksChallenge.difficulty, thisWeeksChallenge.theme, thisWeeksChallenge.id); },
                      'aria-label': 'Start this week\'s challenge',
                      style: { padding: '10px 18px', borderRadius: 8, border: 'none', background: weekCompletion ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                      weekCompletion ? '\uD83D\uDD04 Replay' : '\u25B6 Play')
                  ),
                  // Theme picker
                  el('div', { style: { marginBottom: 14 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '1. PICK YOUR ADVERSARY'),
                    el('div', { role: 'radiogroup', 'aria-label': 'Adversary theme', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 } },
                      Object.keys(campaignThemes).map(function(tid) {
                        var t = campaignThemes[tid];
                        var isLocked = t.locked && !(t.unlockCondition && t.unlockCondition(d));
                        var selected = warRoomCampaignTheme === tid && !isLocked;
                        return el('button', { key: tid, role: 'radio', 'aria-checked': selected, disabled: isLocked,
                          'aria-label': t.label + (isLocked ? ' (locked — ' + (t.unlockHint || 'keep playing to unlock') + ')' : ''),
                          onClick: function() { if (!isLocked) { upd('warRoomCampaignTheme', tid); sfxCyberdClick(); } },
                          style: { padding: '10px 12px', borderRadius: 8, border: '1px solid ' + (selected ? 'rgba(99,102,241,0.6)' : 'rgba(148,163,184,0.2)'), background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.45)', color: selected ? '#a5b4fc' : (isLocked ? '#64748b' : '#cbd5e1'), cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: isLocked ? 0.55 : 1 } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                            el('span', { style: { fontSize: 16, filter: isLocked ? 'grayscale(1)' : 'none' } }, isLocked ? '\uD83D\uDD12' : t.icon),
                            el('span', { style: { fontSize: 13, fontWeight: 800 } }, t.label)
                          ),
                          el('div', { style: { fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 } }, isLocked ? (t.unlockHint || 'Locked') : t.desc)
                        );
                      })
                    )
                  ),
                  // Difficulty picker
                  el('div', { style: { marginBottom: 12 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '2. CHOOSE DIFFICULTY & BEGIN'),
                    // Adaptive suggestion based on recent streak
                    (function() {
                      var recent = (warRoomCampaignHistory || []).slice(0, 3);
                      if (recent.length < 3) return null;
                      var allLost = recent.every(function(r) { return r.verdict === 'lost'; });
                      var allWon  = recent.every(function(r) { return r.verdict === 'won'; });
                      var allSameDiff = recent.every(function(r) { return r.difficulty === recent[0].difficulty; });
                      if (!allSameDiff) return null;
                      var d0 = recent[0].difficulty;
                      if (allLost && (d0 === 'analyst' || d0 === 'threatHunter')) {
                        var easier = d0 === 'threatHunter' ? 'analyst' : 'rookie';
                        return el('div', { role: 'note', style: { padding: 8, borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', marginBottom: 10, fontSize: 11, color: '#93c5fd' } },
                          el('strong', null, '\uD83D\uDCA1 Suggestion: '),
                          'Three losses in a row at ', el('strong', null, d0 + ' difficulty'),
                          '. Try ', el('strong', null, easier),
                          ' first to sharpen your fundamentals, then climb back up.');
                      }
                      if (allWon && (d0 === 'rookie' || d0 === 'analyst')) {
                        var harder = d0 === 'rookie' ? 'analyst' : 'threatHunter';
                        return el('div', { role: 'note', style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 10, fontSize: 11, color: '#86efac' } },
                          el('strong', null, '\uD83C\uDFC6 Nice streak! '),
                          'You\'ve won three straight on ', el('strong', null, d0),
                          '. Ready to step up to ', el('strong', null, harder), '?');
                      }
                      return null;
                    })(),
                    el('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                      [
                        { id: 'rookie',       label: 'Rookie',        sub: 'Clear IOCs \u2022 18 budget', color: '#22c55e' },
                        { id: 'analyst',      label: 'Analyst',       sub: 'Some noise \u2022 14 budget', color: '#3b82f6' },
                        { id: 'threatHunter', label: 'Threat Hunter', sub: 'Adaptive red team \u2022 10 budget \u2022 90s/round', color: '#f43f5e' }
                      ].map(function(tier) {
                        return el('button', { key: tier.id, onClick: function() { startCampaign(tier.id, warRoomCampaignTheme); },
                          'aria-label': 'Start ' + tier.label + ' campaign against ' + campaignThemes[warRoomCampaignTheme].label,
                          style: { flex: '1 1 200px', padding: '14px 16px', borderRadius: 10, border: '1px solid ' + tier.color + '55', background: 'linear-gradient(135deg, ' + tier.color + '1a, ' + tier.color + '05)', color: tier.color, cursor: 'pointer', textAlign: 'left' } },
                          el('div', { style: { fontSize: 14, fontWeight: 900, marginBottom: 4 } }, tier.label),
                          el('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, tier.sub)
                        );
                      })
                    )
                  ),
                  // House Rules / Challenge Presets (optional, for replayability)
                  el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 10 } },
                    el('div', { style: { color: '#fda4af', fontSize: 11, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, '\u2696\uFE0F HOUSE RULES (OPTIONAL \u2014 MAKE IT HARDER)'),
                    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 } },
                      [
                        { id: 'noEscalate', label: 'No Escalate', desc: 'The Escalate to CISO card is disabled.' },
                        { id: 'tightBudget', label: 'Tight Budget', desc: 'Start with 3 fewer budget points.' },
                        { id: 'allStealth', label: 'All Stealth', desc: 'One fewer real IOC per alert panel.' },
                        { id: 'noCombos', label: 'No Combos', desc: 'Combo bonuses are suppressed.' }
                      ].map(function(opt) {
                        var isOn = !!(warRoomHouseRulesDraft && warRoomHouseRulesDraft[opt.id]);
                        return el('button', { key: opt.id, role: 'switch', 'aria-checked': isOn, 'aria-label': opt.label + (isOn ? ', on' : ', off'),
                          onClick: function() {
                            var next = Object.assign({}, warRoomHouseRulesDraft || {});
                            next[opt.id] = !isOn;
                            upd('warRoomHouseRulesDraft', next);
                            sfxCyberdClick();
                          },
                          style: { display: 'flex', alignItems: 'center', gap: 6, padding: 7, borderRadius: 6, border: '1px solid ' + (isOn ? 'rgba(244,63,94,0.4)' : 'rgba(148,163,184,0.2)'), background: isOn ? 'rgba(244,63,94,0.08)' : 'rgba(30,41,59,0.6)', color: isOn ? '#fda4af' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' } },
                          el('span', { style: { fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 3, background: isOn ? '#f43f5e' : '#475569', color: 'white', minWidth: 24, textAlign: 'center' } }, isOn ? 'ON' : 'OFF'),
                          el('div', { style: { flex: 1 } },
                            el('div', { style: { fontSize: 11.5, fontWeight: 700 } }, opt.label),
                            el('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.3 } }, opt.desc)
                          )
                        );
                      })
                    )
                  ),
                  // Boss Mode + Quick Match launchers
                  el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
                    el('button', {
                      onClick: function() {
                        // Quick Match: random theme (unlocked), random difficulty, fresh seed
                        var unlockedThemes = Object.keys(campaignThemes).filter(function(tid) {
                          var t = campaignThemes[tid]; return !(t.locked && !(t.unlockCondition && t.unlockCondition(d)));
                        });
                        var randTheme = unlockedThemes[Math.floor(Math.random() * unlockedThemes.length)] || 'mixed';
                        var diffs = ['rookie', 'analyst', 'threatHunter'];
                        var randDiff = diffs[Math.floor(Math.random() * diffs.length)];
                        startCampaign(randDiff, randTheme);
                      },
                      'aria-label': 'Start a random campaign',
                      style: { padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.35)', background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.06))', color: '#93c5fd', fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'left' } },
                      el('div', { style: { fontSize: 15, marginBottom: 3 } }, '\uD83C\uDFB2 Quick Match'),
                      el('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600, lineHeight: 1.35 } }, 'One-click random theme + difficulty. Great for warmup.')
                    ),
                    el('button', {
                      onClick: function() {
                        if (confirm('Boss Mode: 3 rounds (Exploitation \u2192 C2 \u2192 Actions), tight 10-budget cap, APT adversary. Tougher scoring. Ready?')) {
                          startCampaign('threatHunter', 'apt', null, { bossMode: true });
                        }
                      },
                      'aria-label': 'Start Boss Mode campaign',
                      style: { padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(244,63,94,0.4)', background: 'linear-gradient(135deg, rgba(244,63,94,0.14), rgba(234,179,8,0.06))', color: '#fca5a5', fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'left' } },
                      el('div', { style: { fontSize: 15, marginBottom: 3 } }, '\uD83D\uDC79 Boss Mode'),
                      el('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600, lineHeight: 1.35 } }, '3 rounds, toughest adversary, 10 budget. Win to unlock the Boss Slayer badge.')
                    )
                  ),
                  // Shared seed input (reproduces a specific campaign for classmates / teachers)
                  el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px dashed rgba(234,179,8,0.3)', marginBottom: 18 } },
                    el('div', { style: { color: '#fcd34d', fontSize: 11, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 } }, '\uD83D\uDD11 PLAY A SHARED CAMPAIGN (OPTIONAL)'),
                    el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.4 } }, 'Enter a 4-character Campaign ID your teacher or classmate shared. Same ID + same theme + same difficulty = same exact scenarios.'),
                    el('div', { style: { display: 'flex', gap: 8 } },
                      el('input', { type: 'text', maxLength: 4, placeholder: 'ABCD',
                        value: d.warRoomSeedInput || '',
                        'aria-label': 'Campaign ID to play',
                        onChange: function(ev) {
                          var v = (ev.target.value || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 4);
                          upd('warRoomSeedInput', v);
                        },
                        style: { flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(15,23,42,0.7)', color: '#fcd34d', fontSize: 15, fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace', textAlign: 'center' } }),
                      el('button', {
                        onClick: function() {
                          var seed = (d.warRoomSeedInput || '').toUpperCase();
                          if (seed.length !== 4) { if (ctx.addToast) ctx.addToast('Enter a 4-character Campaign ID', 'info'); return; }
                          // Use current theme + default difficulty 'rookie' unless explicitly chosen
                          startCampaign(warRoomDifficulty || 'rookie', warRoomCampaignTheme, seed);
                          upd('warRoomSeedInput', '');
                        },
                        style: { padding: '8px 16px', borderRadius: 6, border: 'none', background: 'rgba(234,179,8,0.25)', color: '#fde68a', fontSize: 12, fontWeight: 800, cursor: 'pointer' } },
                        'Play Seed \u2192')
                    )
                  ),
                  el('div', { style: { color: '#64748b', fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginBottom: 14 } },
                    warRoomCampaignsCompleted > 0 ? ('Campaigns completed: ' + warRoomCampaignsCompleted + (d.warRoomWonAnalyst ? ' \u2022 Analyst victory \uD83C\uDF96\uFE0F' : '') + (d.warRoomPerfectDefense ? ' \u2022 Perfect defense \uD83D\uDEE1\uFE0F' : '')) : 'Your first campaign awaits.'
                  ),
                  // Onboarding checklist (hidden once all 5 milestones are complete)
                  (function() {
                    var h = warRoomCampaignHistory || [];
                    var uniqueThemes = {}; h.forEach(function(r) { if (r.theme) uniqueThemes[r.theme] = true; });
                    var items = [
                      { id: 'first_campaign', label: 'Play your first campaign',     icon: '\uD83D\uDD75\uFE0F', done: warRoomCampaignsCompleted >= 1 },
                      { id: 'first_achievement', label: 'Earn your first achievement', icon: '\uD83C\uDFC5', done: Object.keys(warRoomAchievements).length >= 1 },
                      { id: 'first_combo', label: 'Trigger a combo',                  icon: '\u2728', done: h.some(function(r) { return (r.combos || 0) > 0; }) },
                      { id: 'two_themes', label: 'Try 2 different adversaries',       icon: '\uD83C\uDFAD', done: Object.keys(uniqueThemes).length >= 2 },
                      { id: 'daily', label: 'Play the Daily Challenge',               icon: '\uD83C\uDFAF', done: Object.keys(d.warRoomDailyCompletions || {}).length >= 1 }
                    ];
                    var doneCount = items.filter(function(i) { return i.done; }).length;
                    if (doneCount === items.length) return null; // hide when complete
                    var pct = Math.round(doneCount / items.length * 100);
                    return el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(99,102,241,0.3)', marginBottom: 14 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
                        el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 } }, '\uD83C\uDF93 GETTING STARTED (' + doneCount + '/' + items.length + ')'),
                        el('div', { style: { color: '#94a3b8', fontSize: 10 } }, pct + '% complete')
                      ),
                      el('div', { 'aria-hidden': 'true', style: { height: 4, borderRadius: 2, background: 'rgba(30,41,59,0.8)', overflow: 'hidden', marginBottom: 8 } },
                        el('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', transition: 'width 0.3s' } })
                      ),
                      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 } },
                        items.map(function(it) {
                          return el('div', { key: it.id, style: { display: 'flex', alignItems: 'center', gap: 5, padding: 6, borderRadius: 5, background: it.done ? 'rgba(34,197,94,0.08)' : 'rgba(30,41,59,0.5)', opacity: it.done ? 1 : 0.75, fontSize: 11 } },
                            el('span', { style: { fontSize: 13 } }, it.done ? '\u2705' : '\u2B1C'),
                            el('span', { style: { color: it.done ? '#86efac' : '#cbd5e1', fontWeight: 600, flex: 1, textDecoration: it.done ? 'line-through' : 'none' } }, it.label)
                          );
                        })
                      )
                    );
                  })(),
                  // Trophy room — all-time achievement collection
                  el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(99,102,241,0.2)' } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83C\uDFC6 TROPHY ROOM (' + Object.keys(warRoomAchievements).length + ' / ' + warAchievements.length + ')'),
                    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 } },
                      warAchievements.map(function(a) {
                        var earned = !!warRoomAchievements[a.id];
                        var prog = !earned ? achievementProgress(a.id) : null;
                        var pct = prog && prog.goal > 0 ? Math.min(100, Math.round((prog.cur / prog.goal) * 100)) : 0;
                        return el('div', { key: a.id, title: a.desc,
                          style: { padding: 8, borderRadius: 8, background: earned ? 'rgba(245,158,11,0.08)' : 'rgba(15,23,42,0.6)', border: '1px solid ' + (earned ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.15)'), opacity: earned ? 1 : 0.65 } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 } },
                            el('span', { style: { fontSize: 15, filter: earned ? 'none' : 'grayscale(1)' } }, a.icon),
                            el('span', { style: { fontSize: 11, fontWeight: 800, color: earned ? '#fde68a' : '#64748b', flex: 1 } }, a.label)
                          ),
                          el('div', { style: { fontSize: 10, color: earned ? '#94a3b8' : '#475569', lineHeight: 1.3 } }, a.desc),
                          !earned && prog && el('div', { style: { marginTop: 5 } },
                            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } },
                              el('span', null, prog.label),
                              el('span', null, prog.cur + ' / ' + prog.goal)
                            ),
                            el('div', { 'aria-hidden': 'true', style: { height: 4, borderRadius: 2, background: 'rgba(30,41,59,0.8)', overflow: 'hidden' } },
                              el('div', { style: { height: '100%', width: pct + '%', background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s' } })
                            )
                          )
                        );
                      })
                    )
                  )
                ),

                // End-of-campaign scorecard
                warRoomActive && warRoomVerdict && (function() {
                  // Compute a weighted score + letter grade for the scorecard.
                  // Boss mode has 3 rounds (half the normal), so detection/mitigation weights are doubled so both modes can reach A+.
                  var roundsScale = 6 / Math.max(1, warRoomRoundsTotal);
                  var raw = 0;
                  raw += warRoomDetections * 8 * roundsScale;
                  raw += warRoomMitigations * 5 * roundsScale;
                  raw += (warRoomAssets.data / 100) * 15;
                  raw += Math.min(10, warRoomTotalCombos * 2);
                  raw += Math.min(10, (warRoomCampaignAchievements || []).length * 2);
                  raw -= (warRoomAssetsLost.users * 1 + warRoomAssetsLost.servers * 2);
                  var score = Math.max(0, Math.min(100, Math.round(raw)));
                  var grade;
                  if (score >= 95)      grade = { letter: 'A+', color: '#22c55e', desc: 'Outstanding' };
                  else if (score >= 88) grade = { letter: 'A',  color: '#22c55e', desc: 'Excellent' };
                  else if (score >= 80) grade = { letter: 'B',  color: '#3b82f6', desc: 'Strong' };
                  else if (score >= 70) grade = { letter: 'C',  color: '#f59e0b', desc: 'Fair' };
                  else if (score >= 60) grade = { letter: 'D',  color: '#f97316', desc: 'Needs work' };
                  else                  grade = { letter: 'F',  color: '#ef4444', desc: 'Try again' };
                  return el('div', { style: { padding: '8px 8px' } },
                  el('div', { style: { textAlign: 'center', marginBottom: 16 } },
                    el('div', { 'aria-hidden': 'true', className: warRoomVerdict === 'won' ? 'war-victory' : 'war-shake',
                      style: { fontSize: 44, marginBottom: 4, display: 'inline-block', animation: reducedMotion ? 'none' : (warRoomVerdict === 'won' ? 'warVictory 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28) both' : 'warShake 0.4s ease-in-out') } }, warRoomVerdict === 'won' ? '\uD83C\uDFC6' : '\u26A0\uFE0F'),
                    el('div', { style: { fontSize: 20, fontWeight: 900, color: warRoomVerdict === 'won' ? '#86efac' : '#fca5a5' } }, warRoomVerdict === 'won' ? 'Environment Held' : 'Adversary Advanced'),
                    el('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginTop: 4 } }, warRoomRank.icon + ' Rank: ' + warRoomRank.label),
                    // Letter grade badge
                    el('div', { 'aria-label': 'Grade: ' + grade.letter + '. Score: ' + score + ' out of 100.',
                      style: { marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 12, background: grade.color + '1a', border: '2px solid ' + grade.color + '66' } },
                      el('div', { style: { fontSize: 36, fontWeight: 900, color: grade.color, lineHeight: 1, fontFamily: 'Georgia, serif' } }, grade.letter),
                      el('div', { style: { textAlign: 'left' } },
                        el('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Score'),
                        el('div', { style: { fontSize: 16, color: grade.color, fontWeight: 900 } }, score + ' / 100'),
                        el('div', { style: { fontSize: 10, color: '#cbd5e1', fontStyle: 'italic' } }, grade.desc)
                      )
                    ),
                    warRoomCampaignId && el('div', { style: { marginTop: 8, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } }, 'Campaign #' + warRoomCampaignId)
                  ),
                  el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 } },
                    [
                      { label: 'Attacks Detected', val: warRoomDetections + '/' + warRoomRoundsTotal, color: '#3b82f6' },
                      { label: 'Fully Mitigated', val: warRoomMitigations + '/' + warRoomRoundsTotal, color: '#22c55e' },
                      { label: 'Users Lost', val: warRoomAssetsLost.users, color: '#f59e0b' },
                      { label: 'Servers Lost', val: warRoomAssetsLost.servers, color: '#ef4444' },
                      { label: 'Data Lost', val: warRoomAssetsLost.data, color: '#a855f7' }
                    ].map(function(stat, i) {
                      return el('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid ' + stat.color + '44', textAlign: 'center' } },
                        el('div', { style: { fontSize: 18, fontWeight: 900, color: stat.color } }, stat.val),
                        el('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 } }, stat.label)
                      );
                    })
                  ),
                  // Achievement unlock celebration (shown when any NEW achievements this campaign)
                  (function() {
                    var newOnes = (warRoomCampaignAchievements || []).filter(function(aid) {
                      return !(d.warRoomAchievements && d.warRoomAchievements[aid] && d.warRoomAchievements[aid].earnedAt < Date.now() - 60000);
                    });
                    if (newOnes.length === 0) return null;
                    return el('div', { role: 'status', 'aria-live': 'polite',
                      style: { padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(244,63,94,0.15))', border: '2px solid rgba(245,158,11,0.5)', marginBottom: 14, textAlign: 'center', animation: reducedMotion ? 'none' : 'warVictory 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28) both' } },
                      el('div', { style: { fontSize: 26, marginBottom: 4 } }, '\uD83C\uDF89 \uD83C\uDFC5 \uD83C\uDF89'),
                      el('div', { style: { fontSize: 15, fontWeight: 900, color: '#fde68a' } },
                        newOnes.length + ' NEW ACHIEVEMENT' + (newOnes.length === 1 ? '' : 'S') + ' UNLOCKED!'),
                      el('div', { style: { fontSize: 12, color: '#fbbf24', marginTop: 3 } },
                        newOnes.map(function(aid) {
                          var a = warAchievements.filter(function(x) { return x.id === aid; })[0];
                          return a ? (a.icon + ' ' + a.label) : aid;
                        }).join(' \u2022 '))
                    );
                  })(),
                  // Achievements earned this campaign
                  warRoomCampaignAchievements && warRoomCampaignAchievements.length > 0 && el('div', { style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.04))', border: '1px solid rgba(245,158,11,0.35)', marginBottom: 14 } },
                    el('div', { style: { color: '#fbbf24', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83C\uDFC5 ACHIEVEMENTS EARNED THIS CAMPAIGN'),
                    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                      warRoomCampaignAchievements.map(function(aid) {
                        var a = warAchievements.filter(function(x) { return x.id === aid; })[0];
                        if (!a) return null;
                        var isNew = !(d.warRoomAchievements && d.warRoomAchievements[aid] && d.warRoomAchievements[aid].earnedAt < Date.now() - 60000);
                        return el('div', { key: aid, style: { padding: 8, borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(245,158,11,0.25)' } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                            el('span', { style: { fontSize: 16 } }, a.icon),
                            el('span', { style: { fontSize: 12, fontWeight: 800, color: '#fde68a', flex: 1 } }, a.label),
                            isNew && el('span', { style: { fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: 'rgba(34,197,94,0.25)', color: '#86efac' } }, 'NEW')
                          ),
                          el('div', { style: { fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 } }, a.desc)
                        );
                      })
                    )
                  ),
                  // Hot-seat per-player scoreboard + MVP (only when hot-seat was enabled)
                  warRoomHotSeatEnabled && Object.keys(warRoomHotSeatStats).length > 0 && (function() {
                    var rows = warRoomHotSeatPlayers.map(function(name, idx) {
                      var s = warRoomHotSeatStats[String(idx)] || { rounds: 0, detections: 0, mitigations: 0, combos: 0 };
                      var score = s.mitigations * 3 + s.detections + s.combos * 2; // weighted
                      return { idx: idx, name: name, stats: s, score: score };
                    });
                    var maxScore = Math.max.apply(null, rows.map(function(r) { return r.score; }));
                    var mvpIdx = maxScore > 0 ? rows.filter(function(r) { return r.score === maxScore; })[0].idx : -1;
                    return el('div', { style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.04))', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 14 } },
                      el('div', { style: { color: '#d8b4fe', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83E\uDD1D TEAM SCOREBOARD'),
                      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                        rows.map(function(r) {
                          var isMvp = r.idx === mvpIdx;
                          return el('div', { key: r.idx, style: { padding: 10, borderRadius: 8, background: isMvp ? 'rgba(245,158,11,0.1)' : 'rgba(15,23,42,0.5)', border: '1px solid ' + (isMvp ? 'rgba(245,158,11,0.35)' : 'rgba(148,163,184,0.15)') } },
                            el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                              isMvp && el('span', { style: { fontSize: 14 } }, '\uD83C\uDF96\uFE0F'),
                              el('span', { style: { fontSize: 13, fontWeight: 800, color: isMvp ? '#fde68a' : '#e2e8f0', flex: 1 } }, r.name),
                              isMvp && el('span', { style: { fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.25)', color: '#fbbf24', letterSpacing: 0.3 } }, 'MVP')
                            ),
                            el('div', { style: { fontSize: 10.5, color: '#94a3b8', lineHeight: 1.55 } },
                              r.stats.rounds + ' round' + (r.stats.rounds === 1 ? '' : 's') + ' \u2022 ',
                              el('span', { style: { color: '#86efac', fontWeight: 700 } }, r.stats.mitigations + ' mitigated'), ' \u2022 ',
                              el('span', { style: { color: '#93c5fd', fontWeight: 700 } }, r.stats.detections + ' detected'),
                              r.stats.combos > 0 && el('span', null, ' \u2022 ', el('span', { style: { color: '#fbbf24', fontWeight: 700 } }, r.stats.combos + ' combo' + (r.stats.combos === 1 ? '' : 's')))
                            )
                          );
                        })
                      )
                    );
                  })(),
                  // Kill chain recap (expandable)
                  el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 14 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, 'KILL CHAIN RECAP (click a round to expand)'),
                    warRoomKillChain.map(function(r, i) {
                      var oc = r.outcome === 'mitigated' ? { c: '#22c55e', label: 'MITIGATED' } : (r.outcome === 'detected' ? { c: '#3b82f6', label: 'DETECTED' } : { c: '#ef4444', label: 'SUCCEEDED' });
                      var expandedKey = 'expand_r' + i;
                      var isExpanded = d[expandedKey];
                      var ideals = idealPlaysFor(r.red);
                      return el('div', { key: i, style: { borderBottom: i < warRoomKillChain.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' } },
                        el('button', { onClick: function() { var o = {}; o[expandedKey] = !isExpanded; upd(o); sfxCyberdClick(); },
                          'aria-expanded': !!isExpanded, 'aria-controls': 'round-detail-' + i,
                          style: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' } },
                          el('span', { style: { fontSize: 10, color: '#64748b', fontWeight: 700 } }, isExpanded ? '\u25BC' : '\u25B6'),
                          el('span', { style: { fontSize: 11, color: '#64748b', fontWeight: 700, minWidth: 28 } }, 'R' + (i + 1)),
                          el('span', { style: { fontSize: 12, color: '#cbd5e1', flex: 1 } }, r.red.title),
                          el('span', { style: { fontSize: 10, fontWeight: 800, color: oc.c, background: oc.c + '22', padding: '2px 8px', borderRadius: 4 } }, oc.label)
                        ),
                        isExpanded && el('div', { id: 'round-detail-' + i, style: { padding: '4px 0 10px 26px', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 } },
                          el('div', { style: { marginBottom: 4 } }, el('strong', { style: { color: '#fca5a5' } }, 'Attack: '), r.red.description),
                          el('div', { style: { marginBottom: 4 } },
                            el('strong', { style: { color: '#86efac' } }, 'Your plays: '),
                            r.bluePlays.length > 0 ? r.bluePlays.map(function(pid) {
                              var c = blueTeamCards.filter(function(b) { return b.id === pid; })[0];
                              return c ? c.label : pid;
                            }).join(', ') : 'none'
                          ),
                          ideals.length > 0 && el('div', null,
                            el('strong', { style: { color: '#a5b4fc' } }, 'Ideal plays: '),
                            ideals.map(function(c) { return c.label; }).join(' or ')
                          ),
                          (r.assetsLost.users || r.assetsLost.servers || r.assetsLost.data) && el('div', { style: { marginTop: 4, color: '#fca5a5' } },
                            'Lost: ' + r.assetsLost.users + ' users, ' + r.assetsLost.servers + ' servers, ' + r.assetsLost.data + ' data'
                          )
                        )
                      );
                    })
                  ),
                  // Session reflection notes — auto-saved to the most recent history entry
                  el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.2)', marginBottom: 14 } },
                    el('label', { htmlFor: 'warroom-reflection-input', style: { color: '#cbd5e1', fontSize: 11, fontWeight: 800, marginBottom: 6, display: 'block', letterSpacing: 0.5 } },
                      '\uD83D\uDCDD REFLECTION \u2014 OPTIONAL (saved with this campaign)'),
                    el('textarea', {
                      id: 'warroom-reflection-input',
                      placeholder: 'What did you learn? What would you play differently?',
                      maxLength: 1000,
                      value: warRoomReflection,
                      onChange: function(ev) {
                        var text = (ev.target.value || '').slice(0, 1000);
                        var newHistory = (warRoomCampaignHistory || []).slice();
                        if (newHistory.length > 0) {
                          newHistory[0] = Object.assign({}, newHistory[0], { reflection: text });
                        }
                        upd({ warRoomReflection: text, warRoomCampaignHistory: newHistory });
                      },
                      style: { width: '100%', minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', fontSize: 12, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                    el('div', { style: { marginTop: 4, fontSize: 10, color: '#64748b', textAlign: 'right' } }, warRoomReflection.length + ' / 1000')
                  ),
                  // After-action report
                  el('div', { style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 14 } },
                    el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
                      el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800 } }, '\uD83D\uDCCB After-Action Report'),
                      !warRoomAAR && el('button', { onClick: requestAAR, disabled: warRoomAARLoading,
                        style: { padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: warRoomAARLoading ? 'wait' : 'pointer' } },
                        warRoomAARLoading ? '\u23F3 Generating...' : '\uD83E\uDD16 Generate Debrief')
                    ),
                    warRoomAAR ? el('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-line' } }, warRoomAAR)
                      : el('div', { style: { color: '#475569', fontSize: 11, fontStyle: 'italic' } }, 'Generate an AI debrief or start a new campaign.')
                  ),
                  // Share summary + new campaign buttons
                  el('div', { style: { display: 'flex', gap: 10 } },
                    el('button', {
                      onClick: function() {
                        var hotSeatLine = '';
                        if (warRoomHotSeatEnabled) {
                          var hsRows = warRoomHotSeatPlayers.map(function(name, idx) {
                            var s = warRoomHotSeatStats[String(idx)] || { rounds: 0, mitigations: 0, detections: 0 };
                            return { name: name, score: s.mitigations * 3 + s.detections };
                          });
                          var hsMax = Math.max.apply(null, hsRows.map(function(r) { return r.score; }));
                          var mvp = hsMax > 0 ? hsRows.filter(function(r) { return r.score === hsMax; })[0] : null;
                          hotSeatLine = 'Team: ' + warRoomHotSeatPlayers.join(', ') + (mvp ? ' | MVP: ' + mvp.name : '') + '\n';
                        }
                        var summary = 'SOC War Room \u2014 Campaign #' + (warRoomCampaignId || '????') + '\n' +
                          (campaignThemes[warRoomCampaignTheme] ? campaignThemes[warRoomCampaignTheme].label : 'Mixed') + ' \u2022 ' + warRoomDifficulty + '\n' +
                          'Verdict: ' + (warRoomVerdict === 'won' ? 'WON \uD83C\uDFC6' : 'LOST \u26A0\uFE0F') + '\n' +
                          'Detections: ' + warRoomDetections + '/' + warRoomRoundsTotal + ' | Mitigations: ' + warRoomMitigations + '/' + warRoomRoundsTotal + '\n' +
                          'Assets preserved: ' + warRoomAssets.users + '/10 users, ' + warRoomAssets.servers + '/5 servers, ' + warRoomAssets.data + '/100 data\n' +
                          'Combos: ' + warRoomTotalCombos + ' | Rank: ' + warRoomRank.label + '\n' +
                          hotSeatLine +
                          (warRoomCampaignAchievements.length > 0 ? 'Achievements: ' + warRoomCampaignAchievements.length + ' earned\n' : '') +
                          'AlloFlow \u2022 Cyber Defense Lab';
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(summary).then(function() {
                              if (ctx.addToast) ctx.addToast('\uD83D\uDCCB Summary copied to clipboard', 'success');
                            }, function() {
                              if (ctx.addToast) ctx.addToast('Copy failed \u2014 check your browser permissions', 'info');
                            });
                          } else if (ctx.addToast) {
                            ctx.addToast('Clipboard unavailable in this browser', 'info');
                          }
                        } catch(e) { if (ctx.addToast) ctx.addToast('Copy failed', 'info'); }
                      },
                      'aria-label': 'Copy campaign summary to clipboard',
                      style: { flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                      '\uD83D\uDCCB Copy Summary'),
                    el('button', {
                      onClick: function() { startCampaign(warRoomDifficulty, warRoomCampaignTheme); },
                      'aria-label': 'Replay the same setup with a fresh roll of cards',
                      style: { flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.15)', color: '#fcd34d', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                      '\uD83D\uDD04 Replay Same Setup'),
                    el('button', {
                      onClick: function() {
                        try {
                          var w = window.open('', '_blank', 'width=720,height=900');
                          if (!w) { if (ctx.addToast) ctx.addToast('Pop-up blocked \u2014 allow pop-ups to print', 'info'); return; }
                          // HTML-escape helper — safeguards against AI-generated content or player names with special chars
                          var esc = function(s) {
                            if (s == null) return '';
                            return String(s)
                              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                          };
                          var rows = warRoomKillChain.map(function(r, i) {
                            var m = mitreTechniques[r.red.id];
                            var stageName = (warStages.filter(function(s){return s.id===r.stage;})[0] || {}).name || '';
                            var plays = (r.bluePlays.map(function(id){ var c = blueTeamCards.filter(function(b){return b.id===id;})[0]; return c ? c.label : id; }).join(', ') || '\u2014');
                            return '<tr><td>R' + (i + 1) + '</td><td>' + esc(stageName) + '</td><td>' + esc(r.red.title) + (m ? ' <span class="mitre">' + esc(m.id) + '</span>' : '') + '</td><td class="outcome-' + esc(r.outcome) + '">' + esc(r.outcome.toUpperCase()) + '</td><td>' + esc(plays) + '</td></tr>';
                          }).join('');
                          var achievementRows = (warRoomCampaignAchievements || []).map(function(aid) {
                            var a = warAchievements.filter(function(x) { return x.id === aid; })[0];
                            return a ? '<li>' + esc(a.icon) + ' <strong>' + esc(a.label) + '</strong> \u2014 ' + esc(a.desc) + '</li>' : '';
                          }).join('');
                          var teamRows = warRoomHotSeatEnabled ? warRoomHotSeatPlayers.map(function(name, idx) {
                            var s = warRoomHotSeatStats[String(idx)] || { rounds: 0, mitigations: 0, detections: 0 };
                            return '<tr><td>' + esc(name) + '</td><td>' + s.rounds + '</td><td>' + s.mitigations + '</td><td>' + s.detections + '</td></tr>';
                          }).join('') : '';
                          var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>SOC War Room \u2014 Campaign #' + esc(warRoomCampaignId || '') + '</title>' +
                            '<style>' +
                            'body{font-family:Georgia,serif;max-width:680px;margin:30px auto;padding:20px;color:#1e293b;}' +
                            'h1{margin:0;font-size:22px;}h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-top:22px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;}' +
                            '.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:18px;}' +
                            '.meta{font-size:11px;color:#64748b;}.verdict{font-size:28px;font-weight:900;}' +
                            '.won{color:#15803d;}.lost{color:#b91c1c;}' +
                            'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;}' +
                            'th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top;}' +
                            'th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;}' +
                            '.mitre{font-family:monospace;font-size:10px;color:#b45309;background:#fef3c7;padding:1px 4px;border-radius:2px;}' +
                            '.outcome-mitigated{color:#15803d;font-weight:700;}.outcome-detected{color:#1d4ed8;font-weight:700;}.outcome-succeeded{color:#b91c1c;font-weight:700;}' +
                            '.stats{display:flex;gap:16px;font-size:12px;color:#334155;margin:8px 0;}' +
                            '.stat{background:#f1f5f9;padding:6px 10px;border-radius:4px;}.stat b{display:block;font-size:16px;}' +
                            'ul{margin:6px 0;padding-left:22px;font-size:12px;}li{margin-bottom:3px;}' +
                            '.sign{margin-top:30px;padding-top:10px;border-top:1px dashed #94a3b8;display:flex;gap:40px;font-size:11px;}' +
                            '.sign div{flex:1;border-bottom:1px solid #1e293b;padding-bottom:2px;}' +
                            '@media print{body{margin:15mm;}}' +
                            '</style></head><body>' +
                            '<div class="head">' +
                              '<div><h1>SOC War Room \u2014 Mission Report</h1>' +
                                '<div class="meta">Campaign <strong>#' + esc(warRoomCampaignId || '????') + '</strong> \u2022 ' +
                                esc(campaignThemes[warRoomCampaignTheme] ? campaignThemes[warRoomCampaignTheme].label : 'Mixed') + ' \u2022 ' + esc(warRoomDifficulty) + '</div>' +
                              '</div>' +
                              '<div class="verdict ' + (warRoomVerdict === 'won' ? 'won' : 'lost') + '">' + (warRoomVerdict === 'won' ? 'VICTORY' : 'DEFEAT') + '</div>' +
                            '</div>' +
                            '<div class="stats">' +
                              '<div class="stat"><b>' + (warRoomDetections | 0) + '/' + warRoomRoundsTotal + '</b>Detections</div>' +
                              '<div class="stat"><b>' + (warRoomMitigations | 0) + '/' + warRoomRoundsTotal + '</b>Mitigations</div>' +
                              '<div class="stat"><b>' + (warRoomAssets.data | 0) + '/100</b>Data preserved</div>' +
                              '<div class="stat"><b>' + (warRoomTotalCombos | 0) + '</b>Combos</div>' +
                              '<div class="stat"><b>' + esc(warRoomRank.label) + '</b>Rank</div>' +
                            '</div>' +
                            '<h2>Kill Chain</h2>' +
                            '<table><thead><tr><th>Rd</th><th>Stage</th><th>Red Team Move</th><th>Outcome</th><th>Defenses Played</th></tr></thead><tbody>' + rows + '</tbody></table>' +
                            (achievementRows ? '<h2>Achievements Earned</h2><ul>' + achievementRows + '</ul>' : '') +
                            (teamRows ? '<h2>Team Scoreboard</h2><table><thead><tr><th>Player</th><th>Rounds</th><th>Mitigated</th><th>Detected</th></tr></thead><tbody>' + teamRows + '</tbody></table>' : '') +
                            '<h2>Reflection Questions</h2>' +
                            '<ol style="font-size:12px;line-height:1.6;">' +
                              '<li>Which kill-chain stage was hardest to defend, and why?</li>' +
                              '<li>Pick one round where you lost assets. What would you play differently?</li>' +
                              '<li>What does this campaign teach about the importance of early-stage defense?</li>' +
                            '</ol>' +
                            '<div class="sign"><div>Student signature</div><div>Teacher initial</div><div>Date</div></div>' +
                            '<div style="margin-top:14px;font-size:10px;color:#94a3b8;text-align:center;">AlloFlow \u2022 Cyber Defense Lab \u2022 SOC War Room</div>' +
                            '<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>' +
                            '</body></html>';
                          w.document.open(); w.document.write(html); w.document.close();
                        } catch(e) { if (ctx.addToast) ctx.addToast('Print failed \u2014 ' + (e.message || 'unknown error'), 'info'); }
                      },
                      'aria-label': 'Print campaign report',
                      style: { flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                      '\uD83D\uDDA8\uFE0F Print Report'),
                    el('button', {
                      onClick: function() {
                        try {
                          var lines = [];
                          lines.push('SOC WAR ROOM \u2014 Campaign Transcript');
                          lines.push('=' .repeat(48));
                          lines.push('Campaign: #' + (warRoomCampaignId || '????'));
                          lines.push('Theme: ' + ((campaignThemes[warRoomCampaignTheme] && campaignThemes[warRoomCampaignTheme].label) || warRoomCampaignTheme));
                          lines.push('Difficulty: ' + warRoomDifficulty + (warRoomIsBossMode ? ' (Boss Mode)' : ''));
                          lines.push('Verdict: ' + (warRoomVerdict === 'won' ? 'VICTORY' : 'DEFEAT'));
                          lines.push('Rank: ' + warRoomRank.label);
                          lines.push('Stats: ' + warRoomDetections + '/' + warRoomRoundsTotal + ' detected, ' + warRoomMitigations + '/' + warRoomRoundsTotal + ' mitigated, ' + warRoomAssets.data + '/100 data preserved, ' + warRoomTotalCombos + ' combos');
                          if (warRoomHotSeatEnabled) lines.push('Team: ' + warRoomHotSeatPlayers.join(', '));
                          if (warRoomHouseRulesActive) {
                            var rules = [];
                            if (warRoomHouseRulesActive.noEscalate) rules.push('No Escalate');
                            if (warRoomHouseRulesActive.tightBudget) rules.push('Tight Budget');
                            if (warRoomHouseRulesActive.allStealth) rules.push('All Stealth');
                            if (warRoomHouseRulesActive.noCombos) rules.push('No Combos');
                            if (rules.length > 0) lines.push('House Rules: ' + rules.join(', '));
                          }
                          lines.push('');
                          lines.push('ROUND-BY-ROUND');
                          lines.push('-'.repeat(48));
                          warRoomKillChain.forEach(function(r, i) {
                            var stageName = ((warStages.filter(function(s){return s.id===r.stage;})[0] || {}).name) || r.stage;
                            var outcome = r.outcome.toUpperCase();
                            var mitre = mitreTechniques[r.red.id];
                            lines.push('Round ' + (i + 1) + ' \u2014 ' + stageName + (mitre ? ' [' + mitre.id + ']' : ''));
                            lines.push('  Red: ' + r.red.title);
                            var plays = (r.bluePlays || []).map(function(pid) {
                              var c = blueTeamCards.filter(function(b) { return b.id === pid; })[0];
                              return c ? c.label : pid;
                            }).join(', ') || 'none';
                            lines.push('  Defenses: ' + plays);
                            lines.push('  Outcome: ' + outcome + (r.assetsLost.users || r.assetsLost.servers || r.assetsLost.data ?
                              ' (lost ' + r.assetsLost.users + 'u/' + r.assetsLost.servers + 's/' + r.assetsLost.data + 'd)' : ''));
                            lines.push('');
                          });
                          if (warRoomCampaignAchievements && warRoomCampaignAchievements.length > 0) {
                            lines.push('ACHIEVEMENTS EARNED');
                            lines.push('-'.repeat(48));
                            warRoomCampaignAchievements.forEach(function(aid) {
                              var a = warAchievements.filter(function(x) { return x.id === aid; })[0];
                              if (a) lines.push('  ' + a.icon + ' ' + a.label + ' \u2014 ' + a.desc);
                            });
                            lines.push('');
                          }
                          if (warRoomHotSeatEnabled) {
                            lines.push('TEAM SCOREBOARD');
                            lines.push('-'.repeat(48));
                            warRoomHotSeatPlayers.forEach(function(name, idx) {
                              var s = warRoomHotSeatStats[String(idx)] || { rounds: 0, mitigations: 0, detections: 0, combos: 0 };
                              lines.push('  ' + name + ': ' + s.rounds + ' round(s), ' + s.mitigations + ' mitigated, ' + s.detections + ' detected, ' + s.combos + ' combo(s)');
                            });
                            lines.push('');
                          }
                          if (warRoomScratchpad) {
                            lines.push('SCRATCHPAD NOTES');
                            lines.push('-'.repeat(48));
                            lines.push(warRoomScratchpad);
                            lines.push('');
                          }
                          if (warRoomReflection) {
                            lines.push('REFLECTION');
                            lines.push('-'.repeat(48));
                            lines.push(warRoomReflection);
                            lines.push('');
                          }
                          lines.push('=' .repeat(48));
                          lines.push('Exported ' + new Date().toLocaleString() + ' \u2014 AlloFlow Cyber Defense Lab');
                          var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
                          var url = URL.createObjectURL(blob);
                          var a = document.createElement('a');
                          a.href = url; a.download = 'warroom-' + (warRoomCampaignId || 'campaign') + '-' + new Date().toISOString().slice(0,10) + '.txt';
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
                          if (ctx.addToast) ctx.addToast('\uD83D\uDCDD Transcript downloaded', 'success');
                        } catch(e) { if (ctx.addToast) ctx.addToast('Transcript export failed', 'info'); }
                      },
                      'aria-label': 'Download plain-text transcript of this campaign',
                      title: 'Download .txt transcript \u2014 easy to share or paste into a gradebook',
                      style: { flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.12)', color: '#d8b4fe', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                      '\uD83D\uDCDD Transcript'),
                    el('button', { onClick: function() { upd({ warRoomActive: false, warRoomVerdict: null, warRoomAAR: null, warRoomCampaignId: null }); sfxCyberdClick(); },
                      style: { flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                      '\u2694\uFE0F New Campaign')
                  )
                );
                })(),

                // Hot-seat "pass the device" screen (blocks view until current player taps)
                warRoomActive && !warRoomVerdict && warRoomHotSeatEnabled && warRoomHotSeatPassScreen && el('div', { style: { padding: '40px 20px', textAlign: 'center', borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.04))', border: '2px solid rgba(168,85,247,0.35)' } },
                  el('div', { 'aria-hidden': 'true', style: { fontSize: 60, marginBottom: 12, animation: reducedMotion ? 'none' : 'warVictory 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28) both' } }, '\uD83E\uDD1D'),
                  el('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 } }, 'PASS THE DEVICE'),
                  el('div', { style: { fontSize: 24, fontWeight: 900, color: '#d8b4fe', marginBottom: 8 } }, warRoomHotSeatPlayers[warRoomHotSeatCurrentIdx] || ('Player ' + (warRoomHotSeatCurrentIdx + 1))),
                  el('div', { style: { fontSize: 14, color: '#cbd5e1', marginBottom: 4 } }, 'Your turn \u2014 Round ' + warRoomRound + ' of 6'),
                  el('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 20 } }, warRoomCurrentStage.icon + ' ' + warRoomCurrentStage.name),
                  el('button', { onClick: function() { upd('warRoomHotSeatPassScreen', false); sfxCyberdClick(); if (ctx.announceToSR) ctx.announceToSR(warRoomHotSeatPlayers[warRoomHotSeatCurrentIdx] + ' is now playing. Round ' + warRoomRound + '.'); },
                    'aria-label': 'Ready to play, ' + warRoomHotSeatPlayers[warRoomHotSeatCurrentIdx],
                    style: { padding: '14px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' } },
                    '\uD83D\uDC4A I\'m Ready'),
                  el('div', { style: { marginTop: 16, fontSize: 10.5, color: '#64748b', fontStyle: 'italic' } }, 'Other players: look away until the active player confirms.')
                ),

                // Active campaign (not ended, and past the pass screen)
                warRoomActive && !warRoomVerdict && !(warRoomHotSeatEnabled && warRoomHotSeatPassScreen) && el('div', null,

                  // Live session banner
                  (warLiveIsHosting || warLiveIsObserving) && el('div', { role: 'status', 'aria-live': 'polite',
                    style: { padding: 8, borderRadius: 8, marginBottom: 10, background: warLiveIsHosting ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', border: '1px solid ' + (warLiveIsHosting ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)'), display: 'flex', alignItems: 'center', gap: 8 } },
                    el('span', { className: warLiveIsHosting ? 'war-pulse' : '', style: { fontSize: 14, animation: (warLiveIsHosting && !reducedMotion) ? 'warPulse 1.2s ease-in-out infinite' : 'none' } }, warLiveIsHosting ? '\uD83D\uDD34' : '\uD83D\uDC41\uFE0F'),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { fontSize: 12, fontWeight: 800, color: warLiveIsHosting ? '#fca5a5' : '#a5b4fc' } }, warLiveIsHosting ? 'BROADCASTING LIVE' : 'OBSERVING LIVE — ' + (warRoomLiveHostName || 'Host')),
                      el('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Session ' + warLive.sessionCode + (warLiveIsObserving ? ' • Buttons disabled in observer mode.' : ''))
                    ),
                    el('button', { onClick: warLiveStop, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.5)', color: '#cbd5e1', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, 'End')
                  ),

                  // Observer suggestion compose (only when observing)
                  warLiveIsObserving && el('div', { role: 'region', 'aria-label': 'Send a suggestion to the host',
                    style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 10 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 6 } }, '\uD83D\uDCAC SUGGEST A MOVE TO THE HOST'),
                    el('div', { style: { display: 'flex', gap: 6 } },
                      el('input', { type: 'text', maxLength: 140,
                        value: warRoomChatDraft, placeholder: 'e.g., "Try Isolate + EDR this round"',
                        'aria-label': 'Your suggestion (max 140 characters)',
                        onChange: function(ev) { upd('warRoomChatDraft', (ev.target.value || '').slice(0, 140)); },
                        onKeyDown: function(ev) { if (ev.key === 'Enter') { ev.preventDefault(); warLiveSendSuggestion(warRoomChatDraft); } },
                        style: { flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' } }),
                      el('button', { onClick: function() { warLiveSendSuggestion(warRoomChatDraft); },
                        disabled: !warRoomChatDraft.trim(),
                        'aria-label': 'Send suggestion',
                        style: { padding: '6px 14px', borderRadius: 5, border: 'none', background: warRoomChatDraft.trim() ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(100,116,139,0.3)', color: 'white', fontSize: 12, fontWeight: 800, cursor: warRoomChatDraft.trim() ? 'pointer' : 'not-allowed' } },
                        'Send')
                    ),
                    el('div', { style: { marginTop: 4, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, 'Only the host sees this. Your name: ' + (ctx.studentNickname || 'Observer'))
                  ),

                  // Host-side suggestions feed (visible when hosting and there are messages)
                  warLiveIsHosting && warRoomChatMessages.length > 0 && el('div', { role: 'region', 'aria-label': 'Suggestions from observers',
                    style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 10, maxHeight: 160, overflowY: 'auto' } },
                    el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#d8b4fe', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 6 } },
                      el('span', null, '\uD83D\uDCAC OBSERVER SUGGESTIONS (' + warRoomChatMessages.length + ')'),
                      el('button', { onClick: function() {
                          var ref = warLiveChatDocRef();
                          if (!ref) return;
                          try { warLive.fb.setDoc(ref, { messages: [] }); upd('warRoomChatMessages', []); } catch(e) {}
                        },
                        'aria-label': 'Clear observer suggestions',
                        style: { padding: '2px 8px', borderRadius: 3, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(30,41,59,0.6)', color: '#cbd5e1', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, 'Clear')
                    ),
                    warRoomChatMessages.slice().reverse().map(function(m, i) {
                      var when = m.at ? new Date(m.at) : null;
                      var t = when ? ((when.getHours() < 10 ? '0' : '') + when.getHours() + ':' + (when.getMinutes() < 10 ? '0' : '') + when.getMinutes()) : '';
                      return el('div', { key: (m.at || 0) + '-' + i, style: { padding: '4px 0', borderBottom: i < warRoomChatMessages.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none', fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.4 } },
                        el('span', { style: { color: '#d8b4fe', fontWeight: 700, marginRight: 6 } }, (m.from || 'Observer') + ':'),
                        el('span', null, m.text),
                        t && el('span', { style: { marginLeft: 6, fontSize: 9, color: '#64748b' } }, t)
                      );
                    })
                  ),

                  // Header strip
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(244,63,94,0.2)', marginBottom: 12, flexWrap: 'wrap' } },
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      el('span', { style: { fontSize: 20 } }, warRoomCurrentStage.icon),
                      el('div', null,
                        el('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' } }, 'Round ' + warRoomRound + ' / ' + warRoomRoundsTotal + ' \u2022 ' + (warRoomIsBossMode ? '\uD83D\uDC79 BOSS ' : '') + (campaignThemes[warRoomCampaignTheme] ? campaignThemes[warRoomCampaignTheme].icon + ' ' + campaignThemes[warRoomCampaignTheme].label : '') + (warRoomCampaignId ? ' \u2022 #' + warRoomCampaignId : '')),
                        el('div', { style: { fontSize: 13, color: warRoomCurrentStage.color, fontWeight: 900 } }, warRoomCurrentStage.name),
                        warRoomHotSeatEnabled && el('div', { style: { fontSize: 10, color: '#d8b4fe', fontWeight: 800, marginTop: 1 } }, '\uD83E\uDD1D ' + (warRoomHotSeatPlayers[warRoomHotSeatCurrentIdx] || ('Player ' + (warRoomHotSeatCurrentIdx + 1))) + '\'s turn'),
                        warRoomHouseRulesActive && (function() {
                          var labels = [];
                          if (warRoomHouseRulesActive.noEscalate) labels.push('No Escalate');
                          if (warRoomHouseRulesActive.tightBudget) labels.push('Tight Budget');
                          if (warRoomHouseRulesActive.allStealth) labels.push('All Stealth');
                          if (warRoomHouseRulesActive.noCombos) labels.push('No Combos');
                          return labels.length > 0 ? el('div', { style: { fontSize: 10, color: '#fca5a5', fontWeight: 700, marginTop: 1 } }, '\u2696\uFE0F ' + labels.join(' \u2022 ')) : null;
                        })()
                      )
                    ),
                    // Kill chain progress bar
                    el('div', { role: 'progressbar', 'aria-valuenow': warRoomRound, 'aria-valuemin': 1, 'aria-valuemax': warRoomRoundsTotal, 'aria-label': 'Kill chain progress',
                      style: { flex: 1, display: 'flex', gap: 4, minWidth: 240 } },
                      warRoomActiveStages.map(function(st, i) {
                        var done = warRoomKillChain[i];
                        var bg = '#1e293b';
                        if (done) bg = done.outcome === 'mitigated' ? warOutcomeColors.mitigated : (done.outcome === 'detected' ? warOutcomeColors.detected : warOutcomeColors.succeeded);
                        else if (i === warRoomRound - 1) bg = st.color;
                        return el('div', { key: st.id, title: st.name + (done ? ' — ' + done.outcome : ''),
                          style: { flex: 1, height: 8, borderRadius: 4, background: bg, opacity: done || i === warRoomRound - 1 ? 1 : 0.35 } });
                      })
                    ),
                    // Timer (Threat Hunter only)
                    warRoomDifficulty === 'threatHunter' && el('div', { 'aria-live': 'off',
                      className: warRoomTimeLeft <= 15 && warRoomTimeLeft > 0 ? 'war-pulse' : '',
                      style: { padding: '4px 10px', borderRadius: 6, background: warRoomTimeLeft <= 15 ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.15)', border: '1px solid ' + (warRoomTimeLeft <= 15 ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)'), animation: (warRoomTimeLeft <= 15 && warRoomTimeLeft > 0 && !reducedMotion) ? 'warPulse 1s ease-in-out infinite' : 'none' } },
                      el('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Clock'),
                      el('div', { style: { fontSize: 14, color: warRoomTimeLeft <= 15 ? '#fca5a5' : '#fcd34d', fontWeight: 900 } },
                        (Math.floor(warRoomTimeLeft / 60)) + ':' + (warRoomTimeLeft % 60 < 10 ? '0' : '') + (warRoomTimeLeft % 60))
                    ),
                    // Budget
                    el('div', { style: { padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' } },
                      el('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Budget'),
                      el('div', { style: { fontSize: 14, color: '#a5b4fc', fontWeight: 900 } }, warRoomBudget)
                    ),
                    // Assets
                    el('div', { style: { padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' } },
                      el('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Assets'),
                      el('div', { style: { fontSize: 11, color: '#86efac', fontWeight: 800 } },
                        warRoomAssets.users + 'u \u2022 ' + warRoomAssets.servers + 's \u2022 ' + warRoomAssets.data + 'd')
                    ),
                    // Focus Mode toggle
                    el('button', {
                      onClick: function() { upd('warRoomFocusMode', !warRoomFocusMode); sfxCyberdClick(); },
                      'aria-pressed': warRoomFocusMode, 'aria-label': warRoomFocusMode ? 'Exit focus mode' : 'Enter focus mode (hide panels and decorations)',
                      title: warRoomFocusMode ? 'Exit focus mode' : 'Focus mode \u2014 hide extras, keep the game',
                      style: { padding: '4px 8px', borderRadius: 6, border: '1px solid ' + (warRoomFocusMode ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.25)'), background: warRoomFocusMode ? 'rgba(34,197,94,0.12)' : 'rgba(30,41,59,0.5)', color: warRoomFocusMode ? '#86efac' : '#94a3b8', fontSize: 14, fontWeight: 700, cursor: 'pointer' } },
                      warRoomFocusMode ? '\u26F6' : '\u26F6')
                  ),

                  // Network diagram — visual asset map (hidden in Focus Mode)
                  !warRoomFocusMode && el('div', { role: 'img', 'aria-label': 'Network status: ' + warRoomAssets.users + ' of 10 users safe, ' + warRoomAssets.servers + ' of 5 servers safe, ' + warRoomAssets.data + ' of 100 data units preserved',
                    style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 12 } },
                    el('div', { style: { color: '#a5b4fc', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 } }, '\uD83C\uDF10 YOUR NETWORK'),
                    // Users row
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      el('div', { style: { width: 70, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Users'),
                      el('div', { style: { display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' } },
                        Array.from({length: 10}, function(_, i) { return i; }).map(function(i) {
                          var compromised = i < warRoomAssetsLost.users;
                          return el('span', { key: i, title: compromised ? 'User account compromised' : 'User account safe',
                            style: { fontSize: 18, filter: compromised ? 'grayscale(1) opacity(0.3)' : 'none', transition: 'filter 0.3s' } },
                            compromised ? '\uD83D\uDC64' : '\uD83D\uDC68\u200D\uD83D\uDCBB');
                        })
                      ),
                      el('span', { style: { fontSize: 11, color: '#86efac', fontWeight: 800 } }, warRoomAssets.users + '/10')
                    ),
                    // Servers row
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      el('div', { style: { width: 70, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Servers'),
                      el('div', { style: { display: 'flex', gap: 6, flex: 1 } },
                        Array.from({length: 5}, function(_, i) { return i; }).map(function(i) {
                          var compromised = i < warRoomAssetsLost.servers;
                          return el('span', { key: i, title: compromised ? 'Server compromised' : 'Server healthy',
                            style: { fontSize: 18, filter: compromised ? 'grayscale(1) opacity(0.3)' : 'none', transition: 'filter 0.3s' } },
                            compromised ? '\uD83D\uDCBF' : '\uD83D\uDDA5\uFE0F');
                        })
                      ),
                      el('span', { style: { fontSize: 11, color: '#86efac', fontWeight: 800 } }, warRoomAssets.servers + '/5')
                    ),
                    // Data bar
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                      el('div', { style: { width: 70, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, 'Data'),
                      el('div', { style: { flex: 1, height: 12, borderRadius: 6, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.2)', overflow: 'hidden', position: 'relative' } },
                        el('div', { style: { height: '100%', width: Math.max(0, Math.min(100, warRoomAssets.data)) + '%', background: warRoomAssets.data >= 70 ? 'linear-gradient(90deg, #22c55e, #86efac)' : (warRoomAssets.data >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #fca5a5)'), transition: 'width 0.4s ease' } })
                      ),
                      el('span', { style: { fontSize: 11, color: '#86efac', fontWeight: 800 } }, warRoomAssets.data + '/100')
                    )
                  ),

                  // Round debrief (shown after Resolve, before advancing to next round)
                  warRoomRoundResolved && warRoomLastResolution && (function() {
                    var res = warRoomLastResolution;
                    var oc = res.outcome === 'mitigated' ? { c: warOutcomeColors.mitigated, bg: warOutcomeColors.mitigated + '1a', bd: warOutcomeColors.mitigated + '59', title: 'Attack Mitigated', icon: '\u2705' }
                           : res.outcome === 'detected' ? { c: warOutcomeColors.detected, bg: warOutcomeColors.detected + '1a', bd: warOutcomeColors.detected + '59', title: 'Attack Detected \u2014 Partial', icon: '\uD83D\uDD35' }
                           : { c: warOutcomeColors.succeeded, bg: warOutcomeColors.succeeded + '1a', bd: warOutcomeColors.succeeded + '59', title: 'Attack Succeeded', icon: '\u26A0\uFE0F' };
                    var playedIds = warRoomBluePlays;
                    var idealIds = res.idealPlayIds || [];
                    var ideals = idealIds.map(function(id) { return blueTeamCards.filter(function(b) { return b.id === id; })[0]; }).filter(Boolean);
                    var missedIdeals = ideals.filter(function(c) { return playedIds.indexOf(c.id) === -1; });
                    return el('div', { style: { padding: 16, borderRadius: 12, background: oc.bg, border: '2px solid ' + oc.bd } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                        el('div', { style: { fontSize: 28 } }, oc.icon),
                        el('div', { style: { flex: 1 } },
                          el('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Round ' + warRoomRound + ' \u2022 Debrief'),
                          el('div', { style: { fontSize: 17, fontWeight: 900, color: oc.c } }, oc.title)
                        ),
                        el('div', { style: { padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.35)', fontSize: 12, fontWeight: 800, color: '#fbbf24' } }, '+' + res.xpDelta + ' XP')
                      ),
                      // What happened
                      el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.45)', marginBottom: 10 } },
                        el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                          el('span', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 800 } }, 'WHAT HAPPENED'),
                          warRoomRedAction && mitreTechniques[warRoomRedAction.id] && el('span', {
                            title: 'MITRE ATT&CK: ' + mitreTechniques[warRoomRedAction.id].name,
                            style: { fontSize: 9, fontWeight: 800, color: '#fcd34d', background: 'rgba(234,179,8,0.12)', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3, fontFamily: 'monospace' } },
                            mitreTechniques[warRoomRedAction.id].id + ' \u2022 ' + mitreTechniques[warRoomRedAction.id].name)
                        ),
                        el('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 } },
                          el('strong', { style: { color: '#fecaca' } }, 'Red Team: '), res.redTitle, '. ',
                          res.outcome === 'mitigated' ? 'Your defensive play fully shut this down before impact.' :
                          res.outcome === 'detected' ? 'You partially blunted the attack \u2014 some impact got through.' :
                          'The attack landed. Assets were compromised.')
                      ),
                      // Ideal plays
                      ideals.length > 0 && el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.45)', marginBottom: 10 } },
                        el('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 800, marginBottom: 6 } }, 'IDEAL DEFENSIVE PLAYS'),
                        ideals.map(function(c, i) {
                          var used = playedIds.indexOf(c.id) !== -1;
                          return el('div', { key: c.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: used ? '#86efac' : '#94a3b8' } },
                            el('span', { style: { fontSize: 14 } }, c.icon),
                            el('span', { style: { flex: 1, fontWeight: 700 } }, c.label),
                            el('span', { style: { fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: used ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)', color: used ? '#86efac' : '#94a3b8' } }, used ? 'YOU PLAYED THIS' : 'NOT PLAYED')
                          );
                        }),
                        missedIdeals.length > 0 && el('div', { style: { marginTop: 6, fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'Next time, try one of the plays above for a full mitigation.')
                      ),
                      // AI coaching tip (only on lost rounds)
                      res.outcome === 'succeeded' && el('div', { role: 'status', 'aria-live': 'polite',
                        style: { padding: 10, borderRadius: 8, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.05))', border: '1px solid rgba(59,130,246,0.35)', marginBottom: 10 } },
                        el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                          el('span', { style: { fontSize: 14 } }, '\uD83E\uDD16'),
                          el('span', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', letterSpacing: 0.5 } }, 'AI COACH TIP'),
                          warRoomAICoachLoading && el('span', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '\u23F3 analyzing\u2026')
                        ),
                        warRoomAICoachTip
                          ? el('div', { style: { fontSize: 12, color: '#dbeafe', lineHeight: 1.55 } }, warRoomAICoachTip)
                          : !warRoomAICoachLoading && el('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'Analyzing your play\u2026 will appear here in a moment.')
                      ),
                      // Combo callout
                      res.activeCombos && res.activeCombos.length > 0 && el('div', { style: { padding: 10, borderRadius: 8, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.35)', marginBottom: 10 } },
                        el('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 800, marginBottom: 6 } }, '\u2728 COMBO' + (res.activeCombos.length > 1 ? 'S (' + res.activeCombos.length + ')' : '') + ' TRIGGERED'),
                        res.activeCombos.map(function(combo) {
                          return el('div', { key: combo.id, style: { padding: '4px 0', fontSize: 12, color: '#fde68a' } },
                            el('div', { style: { fontWeight: 800, marginBottom: 2 } }, '\u2728 ' + combo.label),
                            el('div', { style: { fontSize: 11, color: '#fde68a', lineHeight: 1.4 } }, combo.description)
                          );
                        })
                      ),
                      // Stage lesson
                      res.stageLesson && el('div', { style: { padding: 10, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 10 } },
                        el('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 800, marginBottom: 4 } }, '\uD83D\uDCDA STAGE LESSON \u2014 ' + warRoomCurrentStage.name),
                        el('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
                          (warRoomPlainLanguage && plainStageLessons[warRoomCurrentStage.id]) || res.stageLesson)
                      ),
                      // Try Again (only on lost rounds, once per round, unless observing or final campaign verdict)
                      res.outcome === 'succeeded' && !warRoomRetryUsedThisRound && !warLiveIsObserving && el('button', {
                        onClick: tryAgainRound, 'aria-label': 'Try this round again with the same scenario',
                        title: 'Revert this round and replay it from scratch (once per round).',
                        style: { width: '100%', marginBottom: 8, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.15)', color: '#fcd34d', fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                        '\uD83D\uDD04 Try This Round Again'),
                      res.outcome === 'succeeded' && warRoomRetryUsedThisRound && !warLiveIsObserving && el('div', {
                        style: { marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontSize: 11, fontStyle: 'italic', textAlign: 'center' } },
                        'Retry used this round \u2014 one try per round.'),
                      // What's Next — preview of the upcoming stage (only if not the last round)
                      warRoomRound < warRoomRoundsTotal && warRoomActiveStages[warRoomRound] && (function() {
                        var next = warRoomActiveStages[warRoomRound];
                        var nextTip = (warRoomPlainLanguage && plainStageCoachTips[next.id]) || stageStrategyTips[next.id] || '';
                        // Strip bold markers from plain coach tip for inline display
                        var cleanTip = nextTip.replace(/\*\*/g, '').replace(/^COACH:\s*/, '');
                        return el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.45)', border: '1px dashed rgba(148,163,184,0.25)', marginBottom: 10 } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                            el('span', { style: { fontSize: 12 } }, '\u23ED\uFE0F'),
                            el('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 800, letterSpacing: 0.5 } }, 'UP NEXT'),
                            el('span', { style: { fontSize: 12, color: next.color, fontWeight: 800, marginLeft: 4 } }, next.icon + ' Round ' + (warRoomRound + 1) + ' \u2014 ' + next.name)
                          ),
                          cleanTip && el('div', { style: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5 } }, cleanTip)
                        );
                      })(),
                      // Advance button (observers see it but can't act)
                      el('button', { onClick: advanceFromDebrief, disabled: warLiveIsObserving,
                        'aria-label': warRoomRound >= warRoomRoundsTotal ? 'View final report' : 'Advance to next round',
                        style: { width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', background: warLiveIsObserving ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg, ' + oc.c + ', #6366f1)', color: 'white', fontSize: 13, fontWeight: 800, cursor: warLiveIsObserving ? 'not-allowed' : 'pointer' } },
                        warLiveIsObserving ? '\u231B Waiting for host\u2026' : (warRoomRound >= warRoomRoundsTotal ? '\uD83C\uDFC1 View Final Report \u2192' : '\u25B6 Advance to Round ' + (warRoomRound + 1) + ' (' + ((warRoomActiveStages[warRoomRound] && warRoomActiveStages[warRoomRound].name) || '') + ')'))
                    );
                  })(),

                  // Main two-column layout (hidden when round is resolved)
                  !warRoomRoundResolved && el('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 12 } },

                    // LEFT: red team action + alerts
                    el('div', null,
                      // Coach tip (Story Mode only)
                      warRoomStoryMode && stageCoachTips[warRoomCurrentStage.id] && (function() {
                        var tip = (warRoomPlainLanguage && plainStageCoachTips[warRoomCurrentStage.id]) || stageCoachTips[warRoomCurrentStage.id];
                        // Convert **bold** markers to strong tags
                        var parts = tip.split(/\*\*/);
                        return el('div', { role: 'note', style: { padding: 10, borderRadius: 10, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.04))', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 10 } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                            el('span', { style: { fontSize: 16 } }, '\uD83C\uDFAC'),
                            el('span', { style: { fontSize: 11, fontWeight: 900, color: '#86efac', letterSpacing: 0.5 } }, 'STORY MODE \u2014 COACH TIP')
                          ),
                          el('div', { style: { fontSize: 12, color: '#d9f99d', lineHeight: 1.55 } },
                            parts.map(function(p, i) {
                              return i % 2 === 1 ? el('strong', { key: i, style: { color: '#bbf7d0' } }, p) : p;
                            })
                          )
                        );
                      })(),
                      // Red team action card
                      el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(220,38,38,0.04))', border: '1px solid rgba(244,63,94,0.3)', marginBottom: 10 } },
                        el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' } },
                          el('span', { style: { fontSize: 11, fontWeight: 900, color: '#fca5a5', background: 'rgba(244,63,94,0.2)', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 } }, 'RED TEAM'),
                          el('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700 } }, warRoomCurrentStage.name),
                          warRoomRedAction && mitreTechniques[warRoomRedAction.id] && el('span', {
                            title: 'MITRE ATT&CK: ' + mitreTechniques[warRoomRedAction.id].name,
                            style: { fontSize: 9, fontWeight: 800, color: '#fcd34d', background: 'rgba(234,179,8,0.12)', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3, fontFamily: 'monospace' } },
                            mitreTechniques[warRoomRedAction.id].id),
                          warRoomRedAction && warRoomRedAction._aiGenerated && el('span', { style: { fontSize: 9, fontWeight: 800, color: '#a5b4fc', background: 'rgba(99,102,241,0.2)', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3 } }, '\uD83E\uDD16 AI'),
                          ctx.callGemini && !warLiveIsObserving && !warRoomRoundResolved && warRoomBluePlays.length === 0 && el('button', {
                            onClick: generateAIRedCard, disabled: warRoomAICardLoading,
                            'aria-label': 'Generate a new AI red team scenario',
                            title: 'Ask the AI to generate a fresh scenario for this stage. Only available before playing any defenses.',
                            style: { marginLeft: 'auto', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)', background: warRoomAICardLoading ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, fontWeight: 700, cursor: warRoomAICardLoading ? 'wait' : 'pointer' } },
                            warRoomAICardLoading ? '\u23F3' : '\uD83E\uDD16 Replace')
                        ),
                        el('div', { style: { fontSize: 15, fontWeight: 800, color: '#fecaca', marginBottom: 6 } }, warRoomRedAction && warRoomRedAction.title),
                        el('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 } },
                          warRoomRedAction && ((warRoomPlainLanguage && plainRedDescriptions[warRoomRedAction.id]) || warRoomRedAction.description))
                      ),
                      // Alerts panel
                      el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 10 } },
                        el('div', { style: { color: '#a5b4fc', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 } }, '\uD83D\uDEA8 ALERT INTEL (' + warRoomAlerts.length + ')'),
                        warRoomAlerts.length === 0 && el('div', { style: { color: '#64748b', fontSize: 12, fontStyle: 'italic' } }, 'No alerts received this round.'),
                        warRoomAlerts.map(function(a, i) {
                          var seen = warRoomAlertsSeen.indexOf(a.id) !== -1;
                          var investigated = seen && warRoomBluePlays.indexOf('investigate') !== -1;
                          var focused = i === warRoomAlertFocusIdx;
                          return el('div', { key: a.id,
                            style: { padding: '8px 10px', borderRadius: 6, background: seen ? (a.real ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)') : 'rgba(30,41,59,0.6)', border: '1px solid ' + (focused ? '#a5b4fc' : (seen ? (a.real ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.3)') : 'rgba(148,163,184,0.15)')), outline: focused ? '2px solid rgba(165,180,252,0.4)' : 'none', outlineOffset: 2, marginBottom: 6, fontSize: 12, color: '#cbd5e1' } },
                            el('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                              el('span', null, seen ? (a.real ? '\uD83D\uDD34' : '\u26AA') : '\u2754'),
                              el('span', { style: { flex: 1 } }, seen ? a.text : 'Unreviewed signal #' + (i + 1)),
                              !seen && el('button', { onClick: function() {
                                  if (!investigated && warRoomBluePlays.indexOf('investigate') === -1) {
                                    if (ctx.addToast) ctx.addToast('Play Investigate Alert to review signals', 'info');
                                    return;
                                  }
                                  upd('warRoomAlertsSeen', warRoomAlertsSeen.concat([a.id]));
                                  sfxCyberdClick();
                                },
                                style: { padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                                'Review')
                            ),
                            seen && el('div', { style: { fontSize: 10, color: a.real ? '#fca5a5' : '#94a3b8', fontWeight: 700, marginTop: 3 } }, a.real ? 'REAL INDICATOR' : 'NOISE')
                          );
                        })
                      ),
                      // Campaign log
                      el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.15)', maxHeight: 140, overflowY: 'auto', marginBottom: 8 } },
                        el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 } }, 'Campaign Log'),
                        warRoomLog.map(function(line, i) {
                          return el('div', { key: i, style: { fontSize: 11, color: '#94a3b8', padding: '2px 0', lineHeight: 1.5 } }, '\u203A ' + line);
                        })
                      ),
                      // Scratchpad — jot notes during play; carries into the reflection at end
                      el('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px dashed rgba(234,179,8,0.25)' } },
                        el('button', {
                          onClick: function() { upd('warRoomScratchOpen', !warRoomScratchOpen); sfxCyberdClick(); },
                          'aria-expanded': warRoomScratchOpen, 'aria-controls': 'warroom-scratchpad-input',
                          style: { width: '100%', textAlign: 'left', padding: '4px 6px', borderRadius: 4, border: 'none', background: 'transparent', color: '#fcd34d', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.4 } },
                          (warRoomScratchOpen ? '\u25BC' : '\u25B6') + ' \uD83D\uDCDD SCRATCHPAD' + (warRoomScratchpad.length > 0 ? ' (' + warRoomScratchpad.length + ' chars)' : '')),
                        warRoomScratchOpen && el('div', null,
                          el('textarea', {
                            id: 'warroom-scratchpad-input',
                            'aria-label': 'Scratchpad notes for this campaign',
                            placeholder: 'Jot anything here \u2014 what you spotted, what to try next round. Saved for your reflection at campaign\'s end.',
                            maxLength: 2000,
                            value: warRoomScratchpad,
                            onChange: function(ev) {
                              upd('warRoomScratchpad', (ev.target.value || '').slice(0, 2000));
                            },
                            style: { width: '100%', marginTop: 6, minHeight: 70, padding: 8, borderRadius: 6, border: '1px solid rgba(234,179,8,0.25)', background: 'rgba(15,23,42,0.7)', color: '#fde68a', fontSize: 11.5, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                          el('div', { style: { marginTop: 3, fontSize: 9, color: '#64748b', textAlign: 'right' } }, warRoomScratchpad.length + ' / 2000')
                        )
                      )
                    ),

                    // RIGHT: blue team action menu
                    el('div', null,
                      el('div', { id: 'warroom-main-action', tabIndex: -1, style: { padding: 10, borderRadius: 10, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.04))', border: '1px solid rgba(59,130,246,0.3)', marginBottom: 10 } },
                        el('h3', { className: 'allo-sr-only' }, 'Blue Team defensive actions'),
                        el('div', { style: { fontSize: 11, fontWeight: 900, color: '#93c5fd', letterSpacing: 0.5, marginBottom: 6 } }, '\uD83D\uDEE1\uFE0F BLUE TEAM \u2014 CHOOSE YOUR MOVES'),
                        el('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, 'Spend budget on defensive actions. The right play can fully mitigate, partial plays reduce damage, wrong plays let the attack through.')
                      ),
                      blueTeamCards.map(function(card, cardIdx) {
                        var played = warRoomBluePlays.indexOf(card.id) !== -1;
                        var isFreeAvail = warCrossBonuses.freeFirstUse.indexOf(card.id) !== -1 && warRoomFreeUsed.indexOf(card.id) === -1;
                        var effectiveCost = isFreeAvail ? 0 : card.cost;
                        var ruleBlocked = card.id === 'escalate' && warRoomHouseRulesActive && warRoomHouseRulesActive.noEscalate;
                        var disabled = ruleBlocked || warLiveIsObserving || warRoomRoundResolved || played || effectiveCost > warRoomBudget || (card.id === 'escalate' && warRoomEscalateUsed);
                        var hint = ruleBlocked ? '(house rule: no escalate)' : (card.id === 'escalate' && warRoomEscalateUsed ? '(already used)' : (played ? '(played)' : ''));
                        return el('button', { key: card.id, onClick: function() { if (!disabled) playBlueCard(card.id); },
                          disabled: disabled, 'aria-pressed': played, 'aria-keyshortcuts': String(cardIdx + 1),
                          'aria-label': card.label + ', shortcut ' + (cardIdx + 1) + ', cost ' + effectiveCost + ' budget' + (isFreeAvail ? ' (free first use)' : '') + '. ' + card.description,
                          style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + (played ? 'rgba(34,197,94,0.4)' : (isFreeAvail ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.2)')), background: played ? 'rgba(34,197,94,0.1)' : (disabled ? 'rgba(30,41,59,0.4)' : 'rgba(30,41,59,0.7)'), color: played ? '#86efac' : (disabled ? '#475569' : '#cbd5e1'), cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', marginBottom: 6, opacity: disabled && !played ? 0.55 : 1 } },
                          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                            el('span', { style: { fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3, background: 'rgba(148,163,184,0.18)', color: '#94a3b8', fontFamily: 'monospace', minWidth: 16, textAlign: 'center' } }, String(cardIdx + 1)),
                            el('span', { style: { fontSize: 14 } }, card.icon),
                            el('span', { style: { fontSize: 12.5, fontWeight: 800, flex: 1 } }, card.label),
                            isFreeAvail && !played && el('span', { style: { fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.25)', color: '#86efac', letterSpacing: 0.3 } }, 'FREE'),
                            el('span', { style: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', textDecoration: isFreeAvail && !played ? 'line-through' : 'none' } }, card.cost + ' \u26A1'),
                            hint && el('span', { style: { fontSize: 9, color: '#64748b', fontStyle: 'italic' } }, hint)
                          ),
                          el('div', { style: { fontSize: 10.5, color: played ? '#86efac' : '#94a3b8', lineHeight: 1.4 } },
                            (warRoomPlainLanguage && plainBlueDescriptions[card.id]) || card.description)
                        );
                      }),
                      // Live combo preview (shows any combos staged by current plays)
                      (function() {
                        var staged = detectActiveCombos(warRoomBluePlays);
                        if (staged.length === 0) return null;
                        return el('div', { 'aria-live': 'polite', style: { marginTop: 6, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' } },
                          el('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 800, marginBottom: 3 } }, '\u2728 COMBO STAGED'),
                          staged.map(function(c) {
                            return el('div', { key: c.id, style: { fontSize: 11, color: '#fde68a', lineHeight: 1.4 } }, c.label + ' \u2014 ' + c.description);
                          })
                        );
                      })(),
                      // Undo Last Play (only when at least one play exists and round not resolved)
                      warRoomPlayLog.length > 0 && !warRoomRoundResolved && !warLiveIsObserving && el('button', {
                        onClick: undoLastPlay, 'aria-label': 'Undo the last defense you played',
                        style: { width: '100%', marginTop: 6, padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                        '\u21A9\uFE0F Undo Last Play (' + (function() { var last = warRoomPlayLog[warRoomPlayLog.length - 1]; var c = blueTeamCards.filter(function(b){return b.id===last.cardId;})[0]; return c ? c.label : last.cardId; })() + ')'),
                      // Hint button (costs 1 budget, once per round, reveals category of ideal play)
                      el('div', { style: { marginTop: 6, padding: 8, borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px dashed rgba(234,179,8,0.3)' } },
                        !warRoomHintRevealed && el('button', { onClick: requestHint, disabled: warLiveIsObserving || warRoomRoundResolved || warRoomBudget < 1,
                          'aria-label': 'Request a hint for 1 budget',
                          style: { width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none', background: 'rgba(234,179,8,0.18)', color: '#fbbf24', fontSize: 11, fontWeight: 700, cursor: (warLiveIsObserving || warRoomBudget < 1) ? 'not-allowed' : 'pointer', opacity: (warLiveIsObserving || warRoomBudget < 1) ? 0.55 : 1 } },
                          '\uD83D\uDCA1 Request Hint (\u2212 1 budget)'),
                        warRoomHintRevealed && (function() {
                          var ideals = idealPlaysFor(warRoomRedAction);
                          if (ideals.length === 0) return el('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'No ideal play this round \u2014 any detection helps.');
                          var cats = {};
                          ideals.forEach(function(c) { cats[c.category] = true; });
                          var catList = Object.keys(cats).join(' or ');
                          return el('div', null,
                            el('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 800, marginBottom: 3 } }, '\uD83D\uDCA1 HINT'),
                            el('div', { style: { fontSize: 11.5, color: '#fde68a', lineHeight: 1.5 } }, 'The ideal defense this round falls in the ', el('strong', null, catList), ' category.')
                          );
                        })()
                      ),
                      // Resolve button
                      (function() {
                        var resolveDisabled = warLiveIsObserving || warRoomRoundResolved || warRoomBluePlays.length === 0;
                        return el('button', { onClick: resolveCurrentRound, disabled: resolveDisabled,
                          'aria-label': 'Resolve round ' + warRoomRound,
                          style: { width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: resolveDisabled ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg, #f43f5e, #a855f7)', color: 'white', fontSize: 13, fontWeight: 800, cursor: resolveDisabled ? 'not-allowed' : 'pointer', marginTop: 8 } },
                          warLiveIsObserving ? '\uD83D\uDC41\uFE0F Observer Mode' : (warRoomBluePlays.length === 0 ? '\u2026 Play at least one defense' : '\u25B6 Resolve Round ' + warRoomRound));
                      })(),
                      // Quit Campaign (abandon mid-run; confirms first)
                      !warLiveIsObserving && el('button', {
                        onClick: function() {
                          if (confirm('Quit this campaign? Your progress this run will be lost and it will NOT appear in your history.')) {
                            upd({ warRoomActive: false, warRoomVerdict: null, warRoomAAR: null, warRoomCampaignId: null, warRoomRoundResolved: false, warRoomLastResolution: null, warRoomHouseRulesActive: null });
                            sfxCyberdClick();
                            if (ctx.announceToSR) ctx.announceToSR('Campaign abandoned.');
                          }
                        },
                        'aria-label': 'Quit this campaign',
                        style: { width: '100%', marginTop: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#64748b', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                        'Quit Campaign')
                    )
                  )
                )
              )
            )
          );

  }});
})();
