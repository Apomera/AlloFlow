/**
 * AlloFlow Web Search Provider
 * 
 * Provides web search for non-Gemini AI backends (Ollama, LocalAI, etc.)
 * 
 * Search chain:
 *   1. SearXNG (self-hosted, full SERP, ~85% Google parity) — default at localhost:8888
 *   2. DuckDuckGo Instant Answers (free, no key) — fallback if SearXNG unavailable
 *   3. Offline graceful degradation — returns empty results
 * 
 * Returns Gemini-compatible groundingMetadata so existing citation rendering works unchanged.
 */

const WebSearchProvider = {

    // Configuration
    searxngUrl: 'http://localhost:8888',
    _searxngAvailable: null, // cached availability check
    _lastCheckTime: 0,

    /**
     * Search the web and return results with Gemini-compatible grounding metadata.
     */
    async search(query, maxResults = 5) {
        if (!query || query.trim().length < 3) {
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }

        // Offline check
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log('[WebSearch] Device is offline — skipping web search');
            return { results: [], contextPrompt: '', groundingMetadata: null, offline: true };
        }

        try {
            const searchQuery = this._extractSearchQuery(query);
            console.log(`[WebSearch] Searching for: "${searchQuery}"`);

            // Try SearXNG first, then DuckDuckGo fallback
            let results = [];
            let source = 'none';

            if (await this._isSearXNGAvailable()) {
                try {
                    results = await this._fetchSearXNG(searchQuery, maxResults);
                    source = 'SearXNG';
                } catch (err) {
                    console.warn('[WebSearch] SearXNG failed, trying DuckDuckGo fallback:', err.message);
                }
            }

            if (results.length === 0) {
                try {
                    results = await this._fetchDuckDuckGo(searchQuery, maxResults);
                    source = 'DuckDuckGo';
                } catch (err) {
                    console.warn('[WebSearch] DuckDuckGo also failed:', err.message);
                }
            }

            if (results.length === 0) {
                console.log('[WebSearch] No results from any source');
                return { results: [], contextPrompt: '', groundingMetadata: null };
            }

            console.log(`[WebSearch] Found ${results.length} results via ${source}`);

            const contextPrompt = this._buildContextPrompt(results);
            const groundingMetadata = this._buildGroundingMetadata(results);

            return { results, contextPrompt, groundingMetadata, source };

        } catch (err) {
            console.warn('[WebSearch] Search failed:', err.message);
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }
    },

    /**
     * Check if SearXNG is available (cached for 60 seconds).
     */
    async _isSearXNGAvailable() {
        const now = Date.now();
        if (this._searxngAvailable !== null && (now - this._lastCheckTime) < 60000) {
            return this._searxngAvailable;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const resp = await fetch(`${this.searxngUrl}/search?q=test&format=json`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            this._searxngAvailable = resp.ok;
        } catch {
            this._searxngAvailable = false;
        }
        this._lastCheckTime = now;
        console.log(`[WebSearch] SearXNG available: ${this._searxngAvailable}`);
        return this._searxngAvailable;
    },

    /**
     * Extract a focused search query from a long prompt.
     */
    _extractSearchQuery(prompt) {
        if (prompt.length <= 100) return prompt;

        const patterns = [
            /(?:about|regarding|topic[:\s]+|subject[:\s]+|research[:\s]+)\s*[""]?([^"".\n]{10,80})/i,
            /(?:write|generate|create|explain|describe)\s+(?:a\s+)?(?:lesson|text|content|article|report)?\s*(?:about|on|for)\s+[""]?([^"".\n]{10,80})/i,
        ];

        for (const pattern of patterns) {
            const match = prompt.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        const firstSentence = prompt.split(/[.!?\n]/).filter(s => s.trim().length > 10)[0] || '';
        return firstSentence.trim().slice(0, 100);
    },

    // ─── SearXNG (Primary) ──────────────────────────────────────────────

    /**
     * Fetch search results from SearXNG (self-hosted metasearch engine).
     * Returns full SERP results — titles, URLs, snippets, engines used.
     */
    async _fetchSearXNG(query, maxResults) {
        const url = `${this.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`SearXNG returned ${response.status}`);
        }

        const data = await response.json();
        const results = [];

        if (data.results && Array.isArray(data.results)) {
            for (const r of data.results) {
                if (results.length >= maxResults) break;
                if (r.url && (r.title || r.content)) {
                    results.push({
                        title: r.title || query,
                        url: r.url,
                        snippet: r.content || r.title || '',
                        source: r.engine || 'SearXNG',
                        engines: r.engines || [],
                    });
                }
            }
        }

        return results;
    },

    // ─── DuckDuckGo (Fallback) ──────────────────────────────────────────

    /**
     * Fetch search results from DuckDuckGo Instant Answers API.
     * Free, no API key required. Returns topic summaries.
     */
    async _fetchDuckDuckGo(query, maxResults) {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo API returned ${response.status}`);
        }

        const data = await response.json();
        const results = [];

        if (data.Abstract && data.AbstractURL) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL,
                snippet: data.Abstract,
                source: data.AbstractSource || 'DuckDuckGo',
            });
        }

        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (const topic of data.RelatedTopics) {
                if (results.length >= maxResults) break;
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        source: 'DuckDuckGo',
                    });
                }
                if (topic.Topics && Array.isArray(topic.Topics)) {
                    for (const sub of topic.Topics) {
                        if (results.length >= maxResults) break;
                        if (sub.Text && sub.FirstURL) {
                            results.push({
                                title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 60),
                                url: sub.FirstURL,
                                snippet: sub.Text,
                                source: 'DuckDuckGo',
                            });
                        }
                    }
                }
            }
        }

        if (data.Results && Array.isArray(data.Results)) {
            for (const r of data.Results) {
                if (results.length >= maxResults) break;
                if (r.Text && r.FirstURL) {
                    results.push({
                        title: r.Text.split(' - ')[0] || r.Text.slice(0, 60),
                        url: r.FirstURL,
                        snippet: r.Text,
                        source: 'DuckDuckGo',
                    });
                }
            }
        }

        if (data.Answer && results.length === 0) {
            results.push({
                title: query,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: data.Answer,
                source: 'DuckDuckGo',
            });
        }

        return results;
    },

    // ─── Grounding Metadata Builder ─────────────────────────────────────

    /**
     * Build context prompt to inject search results into the LLM prompt.
     */
    _buildContextPrompt(results) {
        if (!results.length) return '';

        const sources = results.map((r, i) =>
            `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
        ).join('\n\n');

        return `The following web search results provide context for your response. Use them to provide accurate, well-sourced information. Reference specific sources when possible using [Source N] notation.\n\n--- WEB SEARCH RESULTS ---\n${sources}\n--- END SEARCH RESULTS ---\n\n`;
    },

    /**
     * Build Gemini-compatible groundingMetadata from search results.
     */
    _buildGroundingMetadata(results) {
        if (!results.length) return null;

        const groundingChunks = results.map(r => ({
            web: {
                uri: r.url,
                title: r.title,
            },
        }));

        const groundingSupports = results.map((r, i) => ({
            groundingChunkIndices: [i],
            segment: {
                startIndex: 0,
                endIndex: 0,
                text: r.snippet.slice(0, 100),
            },
        }));

        return {
            groundingChunks,
            groundingSupports,
            searchEntryPoint: {
                renderedContent: `<a href="${this.searxngUrl || 'https://duckduckgo.com'}/?q=${encodeURIComponent(results[0]?.title || '')}" target="_blank">Search results</a>`,
            },
        };
    },

    /**
     * Check if web search is available (for UI — gray out if offline).
     */
    isAvailable() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        return true;
    },

    /**
     * Test connectivity to search backends.
     */
    async testConnection() {
        const searxng = await this._isSearXNGAvailable();
        let ddg = false;
        try {
            const { results } = await this._fetchDuckDuckGo('test', 1);
            ddg = results.length > 0;
        } catch { /* ignore */ }

        return {
            online: typeof navigator !== 'undefined' ? navigator.onLine : true,
            searxng,
            duckduckgo: ddg,
        };
    },
};

// Export for use in AIProvider
if (typeof window !== 'undefined') {
    window.WebSearchProvider = WebSearchProvider;
}
