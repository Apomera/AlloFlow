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
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  window.StemLab.registerTool('cyberDefense', {
    name: 'Cyber Defense Lab',
    icon: '\uD83D\uDEE1\uFE0F',
    category: 'tech',
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

          // â”€â”€ Cipher output â”€â”€
          var cipherOutput = '';
          if (cipherInput) {
            if (cipherMode === 'caesar') cipherOutput = caesarCipher(cipherInput, caesarShift, cipherEncode);
            else if (cipherMode === 'atbash') cipherOutput = atbashCipher(cipherInput);
            else cipherOutput = cipherEncode ? btoa(xorCipher(cipherInput, 42)) : (function() { try { return xorCipher(atob(cipherInput), 42); } catch(e) { return '[Invalid XOR input]'; } })();
          }
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
              [{ id: 'phish', icon: '\uD83D\uDD75\uFE0F', label: 'Cyber Detective' }, { id: 'password', icon: '\uD83D\uDD10', label: 'Password Forge' }, { id: 'cipher', icon: '\uD83D\uDD11', label: 'Cipher Lab' }, { id: 'network', icon: '\uD83D\uDCE1', label: 'Traffic Analyzer' }, { id: 'social', icon: '\uD83C\uDFAD', label: 'Social Engineering' }].map(function(tab) {
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
                    aiGeneratedEmail && el('span', { style: { padding: '2px 6px', borderRadius: 6, background: 'rgba(168,85,247,0.2)', color: '#c084fc', fontSize: 9, fontWeight: 800, border: '1px solid rgba(168,85,247,0.3)' } }, '\uD83E\uDD16 AI')
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
                          el('span', { style: { color: '#64748b', fontSize: 9, fontWeight: 600 } }, spd.rate.toExponential(0) + ' guesses/sec')
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
                    el('button', { onClick: function() { ctx.awardXP('cyberDefense', 5); upd('pwChallengeDone', true); if (ctx.addToast) ctx.addToast('\uD83D\uDEE1\uFE0F +5 XP! Password Master!', 'success'); },
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
                  el('input', { type: 'range', min: 1, max: 25, value: caesarShift, onChange: function(e) { upd('caesarShift', parseInt(e.target.value)); },
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
                    if (val.trim() === activeChallengeData.answer) { upd('challengeSolved', true); ctx.awardXP('cyberDefense', 5); if (ctx.addToast) ctx.addToast('\uD83D\uDD11 +5 XP! Cipher cracked!', 'success'); }
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
                        netShowAnswer && el('div', { style: { color: pkt.suspicious ? '#fca5a5' : '#6ee7b7', fontSize: 9, marginTop: 2, fontWeight: 600 } }, pkt.reason)
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
              )
            )
          );

  }});
})();
