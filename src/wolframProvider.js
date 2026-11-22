/**
 * AlloFlow Wolfram Alpha Provider
 * 
 * Provides math computation verification, step-by-step solutions,
 * and natural language math queries via the Wolfram Alpha API.
 * 
 * Complements (does NOT replace) the existing:
 *   - evaluateMathExpression() — local arithmetic checker
 *   - verifyMathProblems() — auto-corrects AI answers
 *   - math.js — function evaluation in Graphing Calculator
 * 
 * Wolfram adds: symbolic algebra, step-by-step, word problems, plotting
 * 
 * IMPORTANT: Gated behind !_isCanvasEnv (external API blocked in Canvas)
 */

const WolframProvider = (() => {
    const BASE_URL = 'https://api.wolframalpha.com/v2';
    const SHORT_URL = 'https://api.wolframalpha.com/v1/result';

    const MAX_RESPONSE_BYTES = 1024 * 1024;

    function _redactSecrets(msg) {
        return String(msg == null ? '' : msg).replace(/appid=[^&\s]+/gi, 'appid=[REDACTED]');
    }

    function _isBlockedByPolicy() {
        return typeof window !== 'undefined' && (
            window._isCanvasEnv || window._isDesktopBundledApp === true || window.__ALLOFLOW_DESKTOP_OFFLINE__ === true ||
            window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true ||
            (window.ALLOFLOW_MANAGED_AI_POLICY != null && (window.ALLOFLOW_MANAGED_AI_POLICY.version !== 1 || window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch !== true))
        );
    }

    /**
     * Get the stored Wolfram API key from localStorage
     */
    function getApiKey() {
        if (_isBlockedByPolicy()) return '';
        try {
            const config = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
            return typeof config.wolframAppId === 'string' ? config.wolframAppId.trim() : '';
        } catch { return ''; }
    }

    /**
     * Check if Wolfram is available (has API key + not in Canvas or Desktop offline)
     */
    function isAvailable() {
        // Canvas, bundled Desktop offline builds, secrets lock, student AI lock, or restrictive managed policy block external APIs
        if (_isBlockedByPolicy()) return false;
        return !!getApiKey();
    }

    function _bytesToAsciiFallback(bytes) {
        const parts = [];
        for (let i = 0; i < bytes.length; i += 8192) {
            parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
        }
        return parts.join('');
    }

    async function _readBoundedText(res, maxBytes) {
        if (!res.body || typeof res.body.getReader !== 'function') {
            const text = await res.text();
            if (text.length > maxBytes) throw new Error('Response exceeded size limit');
            return text;
        }
        const reader = res.body.getReader();
        const chunks = [];
        let total = 0;
        const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
                total += bytes.byteLength;
                if (total > maxBytes) {
                    try { await reader.cancel(); } catch (_) {}
                    throw new Error('Response exceeded size limit');
                }
                chunks.push(decoder ? decoder.decode(bytes, { stream: true }) : _bytesToAsciiFallback(bytes));
            }
            if (decoder) chunks.push(decoder.decode());
            return chunks.join('');
        } finally {
            try { reader.releaseLock(); } catch (_) {}
        }
    }

    async function fetchWolframBody(url, asJson) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
        try {
            const res = await fetch(url, {
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                signal: controller ? controller.signal : undefined,
            });
            if (!res.ok) {
                try { await res.body?.cancel?.(); } catch (_) {}
                return { ok: false, status: res.status, value: null };
            }
            if (asJson) {
                if ((!res.body || typeof res.body.getReader !== 'function') && typeof res.text !== 'function') {
                    return { ok: true, status: res.status, value: await res.json() };
                }
                const text = await _readBoundedText(res, MAX_RESPONSE_BYTES);
                return { ok: true, status: res.status, value: JSON.parse(text) };
            }
            const text = await _readBoundedText(res, MAX_RESPONSE_BYTES);
            return { ok: true, status: res.status, value: text };
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    function _parseStrictNumber(raw) {
        const trimmed = String(raw == null ? '' : raw).trim().replace(/^[a-z]\s*=\s*/i, '').trim();
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
            const n = Number(trimmed);
            return Number.isFinite(n) ? n : NaN;
        }
        const frac = trimmed.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
        if (frac) {
            const denom = Number(frac[2]);
            if (denom !== 0 && Number.isFinite(denom)) {
                const n = Number(frac[1]) / denom;
                return Number.isFinite(n) ? n : NaN;
            }
        }
        return NaN;
    }

    /**
     * Quick answer query - returns a short text response
     * Example: query("solve 2x + 5 = 13") -> "x = 4"
     */
    async function query(input) {
        if (!isAvailable()) return null;
        if (typeof input !== 'string') return null;
        const cleanInput = input.trim();
        if (!cleanInput || cleanInput.length > 500) return null;
        const appId = getApiKey();
        try {
            const url = `${SHORT_URL}?appid=${encodeURIComponent(appId)}&i=${encodeURIComponent(cleanInput)}`;
            const res = await fetchWolframBody(url, false);
            if (!res.ok) {
                console.warn('[Wolfram] Query failed:', res.status);
                return null;
            }
            return res.value;
        } catch (e) {
            console.warn('[Wolfram] Query error:', _redactSecrets(e && e.message));
            return null;
        }
    }

    /**
     * Full query with pods - returns structured result
     * Useful for step-by-step solutions and detailed answers
     */
    async function fullQuery(input) {
        if (!isAvailable()) return null;
        if (typeof input !== 'string') return null;
        const cleanInput = input.trim();
        if (!cleanInput || cleanInput.length > 500) return null;
        const appId = getApiKey();
        try {
            const url = `${BASE_URL}/query?appid=${encodeURIComponent(appId)}&input=${encodeURIComponent(cleanInput)}&format=plaintext&output=json`;
            const res = await fetchWolframBody(url, true);
            if (!res.ok || !res.value || typeof res.value !== 'object') return null;
            return res.value.queryresult || null;
        } catch (e) {
            console.warn('[Wolfram] Full query error:', _redactSecrets(e && e.message));
            return null;
        }
    }

    /**
     * Verify if a math answer is correct
     * Example: verify("2x + 5 = 13", "x = 4") → { correct: true, wolframAnswer: "x = 4" }
     */
    async function verify(problem, studentAnswer) {
        if (!isAvailable()) return { verified: false, reason: 'unavailable' };
        if (studentAnswer === null || studentAnswer === undefined || typeof studentAnswer === 'object') {
            return { verified: true, correct: false, wolframAnswer: null, studentAnswer: '' };
        }
        try {
            const wolframAnswer = await query(`solve ${problem}`);
            if (!wolframAnswer) return { verified: false, reason: 'no_response' };

            // Normalize both answers for comparison (preserving exponent ^)
            const normalize = (s) => String(s).replace(/\s+/g, '').toLowerCase().replace(/[^0-9a-z.+\-*/=^]/g, '');
            const studentNorm = normalize(studentAnswer);
            const wolframNorm = normalize(wolframAnswer);

            // Only compare numerically when both sides strictly parse as a plain number or simple fraction
            const studentNum = _parseStrictNumber(studentAnswer);
            const wolframNum = _parseStrictNumber(wolframAnswer);

            let correct = false;
            if (!studentNorm) {
                correct = false;
            } else if (Number.isFinite(studentNum) && Number.isFinite(wolframNum)) {
                correct = Math.abs(studentNum - wolframNum) < 0.01;
            } else {
                const eqParts = wolframNorm.split('=');
                correct = studentNorm === wolframNorm || (eqParts.length === 2 && eqParts[1] === studentNorm);
            }

            return {
                verified: true,
                correct,
                wolframAnswer,
                studentAnswer: String(studentAnswer),
            };
        } catch (e) {
            return { verified: false, reason: _redactSecrets(e && e.message) };
        }
    }

    /**
     * Get step-by-step solution for a math problem
     * Returns an array of steps with explanations
     */
    async function stepByStep(problem) {
        if (!isAvailable()) return null;
        try {
            const result = await fullQuery(problem);
            if (!result || !result.pods) return null;

            const steps = [];

            // Extract from known pod titles
            for (const pod of result.pods) {
                const title = pod.title || '';
                if (['Result', 'Solution', 'Solutions', 'Derivative', 'Integral',
                    'Step-by-step solution', 'Possible intermediate steps'].includes(title) ||
                    title.toLowerCase().includes('step') ||
                    title.toLowerCase().includes('solution')) {
                    for (const sub of (pod.subpods || [])) {
                        if (sub.plaintext) {
                            steps.push({
                                title: title,
                                content: sub.plaintext,
                            });
                        }
                    }
                }
            }

            // If we found steps, add the input interpretation too
            if (steps.length > 0) {
                const inputPod = result.pods.find(p => p.title === 'Input' || p.title === 'Input interpretation');
                if (inputPod && inputPod.subpods && inputPod.subpods[0]) {
                    steps.unshift({
                        title: 'Interpretation',
                        content: inputPod.subpods[0].plaintext || problem,
                    });
                }
            }

            return steps.length > 0 ? steps : null;
        } catch (e) {
            console.warn('[Wolfram] stepByStep error:', _redactSecrets(e && e.message));
            return null;
        }
    }

    /**
     * Compute a mathematical expression
     * Example: compute("integrate x^2 dx") → "x^3/3 + C"
     */
    async function compute(expression) {
        return query(expression);
    }

    /**
     * Test the connection with a simple query
     */
    async function testConnection() {
        if (!isAvailable()) return { success: false, error: 'Wolfram unavailable or blocked by policy' };
        try {
            const result = await query('2+2');
            if (result === '4' || result === '4\n' || (result && result.trim() === '4')) {
                return { success: true, response: result.trim() };
            }
            return { success: false, error: _redactSecrets(`Unexpected response: ${result}`) };
        } catch (e) {
            return { success: false, error: _redactSecrets(e && e.message) };
        }
    }

    // Public API
    return {
        isAvailable,
        query,
        fullQuery,
        verify,
        stepByStep,
        compute,
        testConnection,
        getApiKey,
    };
})();

// Export for module environments, attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WolframProvider;
}
if (typeof window !== 'undefined') {
    window.WolframProvider = WolframProvider;
}
