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

    /**
     * Get the stored Wolfram API key from localStorage
     */
    function getApiKey() {
        try {
            const config = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
            return config.wolframAppId || '';
        } catch { return ''; }
    }

    /**
     * Check if Wolfram is available (has API key + not in Canvas or Desktop offline)
     */
    function isAvailable() {
        // Canvas, bundled Desktop offline builds, secrets lock, student AI lock, or restrictive managed policy block external APIs
        if (typeof window !== 'undefined' && (
            window._isCanvasEnv || window._isDesktopBundledApp === true || window.__ALLOFLOW_DESKTOP_OFFLINE__ === true ||
            window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true ||
            (window.ALLOFLOW_MANAGED_AI_POLICY != null && (window.ALLOFLOW_MANAGED_AI_POLICY.version !== 1 || window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch !== true))
        )) return false;
        return !!getApiKey();
    }

    async function fetchWolfram(url) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
        try {
            return await fetch(url, {
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                signal: controller ? controller.signal : undefined,
            });
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /**
     * Quick answer query - returns a short text response
     * Example: query("solve 2x + 5 = 13") -> "x = 4"
     */
    async function query(input) {
        if (!isAvailable()) return null;
        const appId = getApiKey();
        try {
            const url = `${SHORT_URL}?appid=${encodeURIComponent(appId)}&i=${encodeURIComponent(input)}`;
            const res = await fetchWolfram(url);
            if (!res.ok) {
                console.warn('[Wolfram] Query failed:', res.status);
                return null;
            }
            return await res.text();
        } catch (e) {
            console.warn('[Wolfram] Query error:', e.message);
            return null;
        }
    }

    /**
     * Full query with pods - returns structured result
     * Useful for step-by-step solutions and detailed answers
     */
    async function fullQuery(input) {
        if (!isAvailable()) return null;
        const appId = getApiKey();
        try {
            const url = `${BASE_URL}/query?appid=${encodeURIComponent(appId)}&input=${encodeURIComponent(input)}&format=plaintext&output=json`;
            const res = await fetchWolfram(url);
            if (!res.ok) return null;
            const data = await res.json();
            return data.queryresult || null;
        } catch (e) {
            console.warn('[Wolfram] Full query error:', e.message);
            return null;
        }
    }

    /**
     * Verify if a math answer is correct
     * Example: verify("2x + 5 = 13", "x = 4") → { correct: true, wolframAnswer: "x = 4" }
     */
    async function verify(problem, studentAnswer) {
        if (!isAvailable()) return { verified: false, reason: 'unavailable' };
        try {
            const wolframAnswer = await query(`solve ${problem}`);
            if (!wolframAnswer) return { verified: false, reason: 'no_response' };

            // Normalize both answers for comparison
            const normalize = (s) => String(s).replace(/\s+/g, '').toLowerCase().replace(/[^0-9a-z.+\-*/=]/g, '');
            const studentNorm = normalize(studentAnswer);
            const wolframNorm = normalize(wolframAnswer);

            // Try numeric comparison first
            const studentNum = parseFloat(String(studentAnswer).replace(/[^0-9.\-]/g, ''));
            const wolframNum = parseFloat(String(wolframAnswer).replace(/[^0-9.\-]/g, ''));

            let correct = false;
            if (!studentNorm) {
                correct = false;
            } else if (!isNaN(studentNum) && !isNaN(wolframNum)) {
                correct = Math.abs(studentNum - wolframNum) < 0.01;
            } else {
                correct = studentNorm === wolframNorm || (wolframNorm.includes('=') && wolframNorm.split('=').pop() === studentNorm);
            }

            return {
                verified: true,
                correct,
                wolframAnswer,
                studentAnswer: String(studentAnswer),
            };
        } catch (e) {
            return { verified: false, reason: e.message };
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
            console.warn('[Wolfram] stepByStep error:', e.message);
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
        if (!getApiKey()) return { success: false, error: 'No API key configured' };
        try {
            const result = await query('2+2');
            if (result === '4' || result === '4\n' || (result && result.trim() === '4')) {
                return { success: true, response: result.trim() };
            }
            return { success: false, error: `Unexpected response: ${result}` };
        } catch (e) {
            return { success: false, error: e.message };
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
