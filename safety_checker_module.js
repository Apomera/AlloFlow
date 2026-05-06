/**
 * AlloFlow — Safety Content Checker Module
 *
 * Inline safety scanner for student input. Two layers:
 *   - regex check (fast, deterministic): self-harm, harm-to-others, bullying,
 *     inappropriate language, concerning content, off-task gaming/social,
 *     gibberish
 *   - aiCheck (Gemini-backed, async): catches contextual concerns the regex
 *     can't, gated by confidence threshold so non-critical false-positives
 *     don't fire
 *
 * Pure: no React state, no DOM. Uses window._isCanvasEnv and
 * window.GEMINI_MODELS at aiCheck time (both registered by AlloFlowANTI.txt
 * inline at file-parse time, lines ~862-864).
 *
 * Loaded by AlloFlowANTI.txt via loadModule('SafetyChecker', ...). The monolith
 * declares a no-op shim at top of file and swaps it via
 * window._upgradeSafetyChecker() on module load. Same shim pattern as
 * firestore_sync_module.js + processGrounding-via-TextPipelineHelpers.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.SafetyChecker) {
    console.log('[CDN] SafetyCheckerModule already loaded, skipping');
    return;
  }

  var SafetyContentChecker = {
    patterns: {
        self_harm: /\b(hurt myself|kill myself|suicide|want to die|end it all|self.?harm|cutting myself|don't want to live)\b/i,
        harm_to_others: /\b(hurt (him|her|them|someone)|kill (him|her|them|someone|you)|bring a (gun|weapon|knife)|shoot|attack|bomb)\b/i,
        bullying: /\b(hate (him|her|them|you)|loser|stupid|ugly|fat|worthless|kill yourself|nobody likes)\b/i,
        inappropriate_language: /\b(fuck|shit|damn|bitch|ass|dick|cock|pussy|slut|whore|n[i1]gg[ae3]r|f[a4]g)\b/i,
        concerning_content: /\b(abuse|molest|rape|touch me|scared of|hit me|hurt me|locked in|won't let me|secret|don't tell)\b/i,
        off_task_gaming: /\b(fortnite|minecraft|roblox|among us|pokemon|call of duty|valorant|apex|gta|fifa|playstation|xbox|nintendo|twitch|discord|tiktok|youtube|instagram|snapchat)\b/i,
        off_task_social: /\b(boyfriend|girlfriend|crush|dating|party|hangout|skip class|skip school|boring|hate school|hate this|so bored|don't care|whatever|this is dumb|this is stupid|waste of time)\b/i,
        gibberish: /^[^a-zA-Z]*$|(.)\1{4,}|^[a-z]{1,2}$|asdf|qwer|zxcv|lol{3,}|haha{4,}|bruh{3,}/i
    },
    check: function (text) {
        if (!text || typeof text !== 'string') return [];
        var flags = [];
        var lowerText = text.toLowerCase();
        for (var category in this.patterns) {
            if (!Object.prototype.hasOwnProperty.call(this.patterns, category)) continue;
            var pattern = this.patterns[category];
            var match = lowerText.match(pattern);
            if (match) {
                flags.push({
                    category: category,
                    match: match[0],
                    severity: this.getSeverity(category),
                    timestamp: new Date().toISOString()
                });
            }
        }
        return flags;
    },
    getSeverity: function (category) {
        var severityMap = {
            self_harm: 'critical',
            harm_to_others: 'critical',
            bullying: 'high',
            inappropriate_language: 'medium',
            concerning_content: 'high',
            off_task_gaming: 'low',
            off_task_social: 'low',
            gibberish: 'low',
            behavioral_rushing: 'medium',
            behavioral_idle: 'low',
            behavioral_repetitive: 'low'
        };
        return severityMap[category] || 'medium';
    },
    getCategoryLabel: function (category, t) {
        var safeT = (typeof t === 'function') ? t : function (k) { return k; };
        var labelMap = {
            self_harm: safeT('class_analytics.flag_self_harm'),
            harm_to_others: safeT('class_analytics.flag_harm_others'),
            bullying: safeT('class_analytics.flag_bullying'),
            inappropriate_language: safeT('class_analytics.flag_inappropriate'),
            concerning_content: safeT('class_analytics.flag_concerning'),
            off_task_gaming: '🎮 Off-Task (Gaming/Media)',
            off_task_social: '💬 Off-Task (Social/Disengaged)',
            gibberish: '🔤 Gibberish Input',
            behavioral_rushing: '⚡ Quiz Rushing',
            behavioral_idle: '💤 Extended Inactivity',
            behavioral_repetitive: '🔁 Repetitive Answers'
        };
        return labelMap[category] || category;
    },
    aiCheck: async function (text, source, apiKey, onFlag) {
        // Read environment + model from window globals (set by monolith at file
        // parse time, ~AlloFlowANTI.txt:862-864). Falls back to false/empty if
        // monolith hasn't initialized yet (shouldn't happen — module loads after
        // the inline script — but the guard avoids hard errors during HMR).
        var _isCanvasEnv = !!(typeof window !== 'undefined' && window._isCanvasEnv);
        var GEMINI_MODELS = (typeof window !== 'undefined' && window.GEMINI_MODELS) || {};
        var safetyModel = GEMINI_MODELS.safety || 'gemini-2.5-flash-lite';
        if (!text || text.length < 5 || (!apiKey && !_isCanvasEnv)) return;
        var regexFlags = this.check(text);
        if (regexFlags.some(function (f) { return f.severity === 'critical'; })) return;
        try {
            var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + safetyModel + ':generateContent' + (apiKey ? ('?key=' + apiKey) : '');
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'You are a K-12 student safety classifier for an educational platform. Analyze this student message and respond with ONLY a JSON object. Be sensitive to context — educational discussions about difficult topics (history, health) are NOT flags.\nStudent message: "' + text.substring(0, 500) + '"\nRespond ONLY with this JSON (no markdown, no explanation):\n{"safe": true/false, "category": "none|self_harm|harm_to_others|bullying|inappropriate|off_task|concerning", "confidence": 0.0-1.0, "reason": "brief explanation"}' }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
                })
            });
            if (!resp.ok) return;
            var data = await resp.json();
            var rawText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
            var jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;
            var result = JSON.parse(jsonMatch[0]);
            var isCriticalCategory = ['self_harm', 'harm_to_others'].indexOf(result.category) !== -1;
            var confidenceThreshold = isCriticalCategory ? 0.5 : 0.6;
            if (!result.safe && result.confidence > confidenceThreshold && result.category !== 'none') {
                var flag = {
                    category: 'ai_' + result.category,
                    match: result.reason || 'AI-detected concern',
                    severity: isCriticalCategory ? 'critical' : 'medium',
                    source: source,
                    context: text.substring(0, 100),
                    timestamp: new Date().toISOString(),
                    aiGenerated: true,
                    confidence: result.confidence
                };
                if (onFlag) onFlag(flag);
            }
        } catch (e) {
            // Silent on network/parse errors — safety check is best-effort,
            // not load-bearing.
        }
    }
  };

  // Mirror to window so monolith's existing shim references can be upgraded.
  window.SafetyContentChecker = SafetyContentChecker;

  // Trigger the monolith's swap-in of the shim reference.
  if (typeof window._upgradeSafetyChecker === 'function') {
    window._upgradeSafetyChecker();
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SafetyChecker = SafetyContentChecker;
  console.log('[CDN] SafetyChecker loaded');
})();
